/**
 * 공공 API → DB 동기화 스크립트
 *
 * 사용법: npx tsx scripts/sync-data.ts [--region B10] [--year 2024]
 *
 * 1) 나이스 API → 학교 기본정보 (School 테이블)
 * 2) 학교알리미 apiType=09 → 교원현황 (TeacherStats)
 * 3) 학교알리미 apiType=17 → 기간제교원비율 (TeacherStats 업데이트)
 * 4) 학교알리미 apiType=59 → 방과후프로그램 (AfterSchoolProgram)
 *
 * ※ 재정 데이터(apiType 39/40)는 API 미제공 → seed 데이터 유지
 */

import { PrismaClient } from "@prisma/client";
import { fetchAllNeisPages } from "../src/lib/api/neis";
import type { NeisSchoolRow } from "../src/lib/api/neis";
import {
  fetchAllPages,
  type SchoolOverviewRow,
  type TeacherPositionRow,
  type AfterSchoolRow,
} from "../src/lib/api/schoolinfo";

const prisma = new PrismaClient();

/** 시도교육청 코드 → sidoCode (학교알리미용) */
const REGION_SIDO_MAP: Record<string, string> = {
  B10: "11", // 서울
  C10: "21", // 부산
  D10: "22", // 대구
  E10: "23", // 인천
  F10: "24", // 광주
  G10: "25", // 대전
  H10: "26", // 울산
  I10: "29", // 세종
  J10: "31", // 경기
  K10: "32", // 강원
  M10: "33", // 충북
  N10: "34", // 충남
  P10: "35", // 전북
  Q10: "36", // 전남
  R10: "37", // 경북
  S10: "38", // 경남
  T10: "39", // 제주
};

/** 학교종류명 → schoolType */
function toSchoolType(nm: string): "elementary" | "middle" | "high" {
  if (nm?.includes("초등")) return "elementary";
  if (nm?.includes("중학")) return "middle";
  return "high";
}

/** 학교급 → schulKndCode */
function toSchulKndCode(schoolType: string): string {
  const map: Record<string, string> = { elementary: "02", middle: "03", high: "04" };
  return map[schoolType] ?? "02";
}

/** 도로명주소 → 시군구 추출 */
function extractDistrict(address: string | null): string {
  if (!address) return "";
  return address.split(" ")[1] ?? "";
}

/** 시도명 축약 */
function toShortRegion(nm: string): string {
  const map: Record<string, string> = {
    서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구",
    인천광역시: "인천", 광주광역시: "광주", 대전광역시: "대전",
    울산광역시: "울산", 세종특별자치시: "세종", 경기도: "경기",
    강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남",
    전북특별자치도: "전북", 전라남도: "전남", 경상북도: "경북",
    경상남도: "경남", 제주특별자치도: "제주",
  };
  return map[nm] ?? nm;
}

// ─── CLI 인자 파싱 ───
const args = process.argv.slice(2);
const regionArg = args.indexOf("--region") >= 0 ? args[args.indexOf("--region") + 1] : undefined;
const yearArg = args.indexOf("--year") >= 0 ? args[args.indexOf("--year") + 1] : "2024";

async function main() {
  const targetRegions = regionArg ? [regionArg] : Object.keys(REGION_SIDO_MAP);
  const year = parseInt(yearArg!, 10);

  console.log(`\n📡 공공 API 동기화 시작 (연도: ${year}, 지역: ${regionArg ?? "전체"})\n`);

  for (const atptCode of targetRegions) {
    const sidoCode = REGION_SIDO_MAP[atptCode];
    if (!sidoCode) {
      console.warn(`  ⚠️  알 수 없는 교육청 코드: ${atptCode}`);
      continue;
    }

    console.log(`\n━━━ ${atptCode} (sidoCode=${sidoCode}) ━━━`);

    // ─── Step 1: 나이스 → 학교 기본정보 ───
    console.log("  [1/4] 나이스 학교 기본정보 수집...");
    const neisSchools = await fetchAllNeisPages<NeisSchoolRow>("schoolInfo", {
      ATPT_OFCDC_SC_CODE: atptCode,
    });
    console.log(`         → ${neisSchools.length}개교 수신`);

    // Region upsert
    if (neisSchools.length > 0) {
      const first = neisSchools[0];
      await prisma.region.upsert({
        where: { regionCode: atptCode },
        update: { regionName: first.ATPT_OFCDC_SC_NM },
        create: { regionCode: atptCode, regionName: first.ATPT_OFCDC_SC_NM },
      });
    }

    // School upsert (배치)
    let schoolCount = 0;
    for (const s of neisSchools) {
      const schoolType = toSchoolType(s.SCHUL_KND_SC_NM);
      // 초·중·고만 (유치원, 특수학교 등 제외)
      if (!["elementary", "middle", "high"].includes(schoolType)) continue;

      await prisma.school.upsert({
        where: { schoolCode: s.SD_SCHUL_CODE },
        update: {
          schoolName: s.SCHUL_NM,
          schoolType,
          district: extractDistrict(s.ORG_RDNMA),
          address: `${s.ORG_RDNMA ?? ""} ${s.ORG_RDNDA ?? ""}`.trim(),
          dataUpdatedAt: new Date(),
        },
        create: {
          schoolCode: s.SD_SCHUL_CODE,
          schoolName: s.SCHUL_NM,
          schoolType,
          regionCode: atptCode,
          district: extractDistrict(s.ORG_RDNMA),
          address: `${s.ORG_RDNMA ?? ""} ${s.ORG_RDNDA ?? ""}`.trim(),
          dataUpdatedAt: new Date(),
        },
      });
      schoolCount++;
    }
    console.log(`         → ${schoolCount}개교 DB 저장`);

    // ─── Step 2: 학교알리미 apiType=09 → 교원현황 ───
    console.log("  [2/4] 학교알리미 교원현황(09) 수집...");
    for (const schulKnd of ["02", "03", "04"]) {
      // 학교알리미는 sggCode가 필수이므로, DB에 저장된 학교의 district로 조회
      // → 대신 전체 시도 단위로 조회 (sggCode 빈 값은 불가하므로 시군구별로 분할)
      const sggCodes = await getDistinctSggCodes(atptCode, sidoCode, schulKnd);

      for (const sggCode of sggCodes) {
        const overviews = await fetchAllPages<SchoolOverviewRow>({
          apiType: "09",
          schulKndCode: schulKnd,
          sidoCode,
          sggCode,
          pbanYr: String(year),
        });

        for (const o of overviews) {
          if (o.PBAN_EXCP_YN === "Y") continue; // 공시제외 학교 스킵

          await prisma.teacherStats.upsert({
            where: { idx_teacher_school_year: { schoolCode: o.SCHUL_CODE, year } },
            update: {
              studentsPerTeacher: o.COL_SUM || o.TEACH_CAL || null,
              totalTeachers: o.TEACH_CNT || null,
              totalStudents: o.COL_S_SUM || null,
            },
            create: {
              schoolCode: o.SCHUL_CODE,
              year,
              studentsPerTeacher: o.COL_SUM || o.TEACH_CAL || null,
              totalTeachers: o.TEACH_CNT || null,
              totalStudents: o.COL_S_SUM || null,
              source: "schoolinfo",
            },
          }).catch(() => {
            // 해당 학교코드가 School 테이블에 없으면 스킵 (FK 제약)
          });
        }
        console.log(`         → apiType=09 schulKnd=${schulKnd} sgg=${sggCode}: ${overviews.length}건`);
      }
    }

    // ─── Step 3: 학교알리미 apiType=17 → 기간제교원비율 ───
    console.log("  [3/4] 학교알리미 교원직위(17) 수집...");
    for (const schulKnd of ["02", "03", "04"]) {
      const sggCodes = await getDistinctSggCodes(atptCode, sidoCode, schulKnd);

      for (const sggCode of sggCodes) {
        const positions = await fetchAllPages<TeacherPositionRow>({
          apiType: "17",
          schulKndCode: schulKnd,
          sidoCode,
          sggCode,
          pbanYr: String(year),
        });

        for (const p of positions) {
          const totalRegular = p.COL_1 || 0;
          const tempTeachers = p.COL_11 || 0;
          const total = totalRegular + tempTeachers;
          const tempRatio = total > 0 ? tempTeachers / total : null;

          await prisma.teacherStats.upsert({
            where: { idx_teacher_school_year: { schoolCode: p.SCHUL_CODE, year } },
            update: { tempTeacherRatio: tempRatio },
            create: {
              schoolCode: p.SCHUL_CODE,
              year,
              tempTeacherRatio: tempRatio,
              source: "schoolinfo",
            },
          }).catch(() => {});
        }
        console.log(`         → apiType=17 schulKnd=${schulKnd} sgg=${sggCode}: ${positions.length}건`);
      }
    }

    // ─── Step 4: 학교알리미 apiType=59 → 방과후프로그램 ───
    console.log("  [4/4] 학교알리미 방과후(59) 수집...");
    for (const schulKnd of ["02", "03", "04"]) {
      const sggCodes = await getDistinctSggCodes(atptCode, sidoCode, schulKnd);

      for (const sggCode of sggCodes) {
        const programs = await fetchAllPages<AfterSchoolRow>({
          apiType: "59",
          schulKndCode: schulKnd,
          sidoCode,
          sggCode,
          pbanYr: String(year),
        });

        for (const a of programs) {
          // 방과후 프로그램은 집계 데이터 (개별 프로그램 목록이 아님)
          // 총 프로그램 수를 기반으로 요약 레코드 저장
          if (a.SUM_ASL_PGM_FGR > 0) {
            // 기존 데이터 삭제 후 새로 삽입
            await prisma.afterSchoolProgram.deleteMany({
              where: { schoolCode: a.SCHUL_CODE, year },
            }).catch(() => {});

            // 교과 프로그램
            if (a.ASL_CURR_PGM_FGR > 0) {
              await prisma.afterSchoolProgram.create({
                data: {
                  schoolCode: a.SCHUL_CODE,
                  year,
                  subject: `교과프로그램 (${a.ASL_CURR_PGM_FGR}개)`,
                  enrollment: a.ASL_CURR_REG_STDNT_FGR || null,
                  category: "academic",
                  source: "schoolinfo",
                },
              }).catch(() => {});
            }

            // 특기적성 프로그램
            if (a.ASL_SPABL_APTD_PGM_FGR > 0) {
              await prisma.afterSchoolProgram.create({
                data: {
                  schoolCode: a.SCHUL_CODE,
                  year,
                  subject: `특기적성프로그램 (${a.ASL_SPABL_APTD_PGM_FGR}개)`,
                  enrollment: a.ASL_SPABL_APTD_REG_STDNT_FGR || null,
                  category: "enrichment",
                  source: "schoolinfo",
                },
              }).catch(() => {});
            }
          }
        }
        console.log(`         → apiType=59 schulKnd=${schulKnd} sgg=${sggCode}: ${programs.length}건`);
      }
    }
  }

  console.log("\n✅ 동기화 완료!\n");
}

/**
 * 학교알리미 API 호출을 위한 시군구코드 목록 조회
 * 학교알리미는 sggCode가 필수이므로, 나이스에서 가져온 학교의 주소로부터 추출
 *
 * 참고: 학교알리미 sggCode = 행정동코드 앞 5자리 (예: 11680 = 서울 강남구)
 * 여기서는 대표 시군구코드 하드코딩 대신, API를 통해 확인
 */
async function getDistinctSggCodes(
  atptCode: string,
  _sidoCode: string,
  _schulKnd: string
): Promise<string[]> {
  // DB에 저장된 학교 주소로부터 시군구를 그룹핑
  const schools = await prisma.school.findMany({
    where: { regionCode: atptCode },
    select: { district: true },
    distinct: ["district"],
  });

  // district → 시군구 행정코드 매핑 (주요 시군구만)
  // TODO: 전체 행정코드 매핑 테이블 구축
  const districtToSgg = getDistrictSggMap(_sidoCode);

  const sggCodes: string[] = [];
  for (const s of schools) {
    const code = districtToSgg[s.district];
    if (code && !sggCodes.includes(code)) {
      sggCodes.push(code);
    }
  }

  // DB에 학교가 없으면 시도 전체 대표 코드 반환
  if (sggCodes.length === 0) {
    const defaultSgg = getDefaultSgg(_sidoCode);
    if (defaultSgg) sggCodes.push(defaultSgg);
  }

  return sggCodes;
}

/** 시도별 시군구 → 행정코드 매핑 (주요 지역) */
function getDistrictSggMap(sidoCode: string): Record<string, string> {
  const maps: Record<string, Record<string, string>> = {
    "11": { // 서울
      종로구: "11010", 중구: "11020", 용산구: "11030", 성동구: "11040",
      광진구: "11050", 동대문구: "11060", 중랑구: "11070", 성북구: "11080",
      강북구: "11090", 도봉구: "11100", 노원구: "11110", 은평구: "11120",
      서대문구: "11130", 마포구: "11140", 양천구: "11150", 강서구: "11160",
      구로구: "11170", 금천구: "11180", 영등포구: "11190", 동작구: "11200",
      관악구: "11210", 서초구: "11220", 강남구: "11230", 송파구: "11240",
      강동구: "11250",
    },
    "21": { // 부산
      중구: "21010", 서구: "21020", 동구: "21030", 영도구: "21040",
      부산진구: "21050", 동래구: "21060", 남구: "21070", 북구: "21080",
      해운대구: "21090", 사하구: "21100", 금정구: "21110", 강서구: "21120",
      연제구: "21130", 수영구: "21140", 사상구: "21150", 기장군: "21310",
    },
    "22": { // 대구
      중구: "22010", 동구: "22020", 서구: "22030", 남구: "22040",
      북구: "22050", 수성구: "22060", 달서구: "22070", 달성군: "22310",
    },
    "23": { // 인천
      중구: "23010", 동구: "23020", 미추홀구: "23040", 연수구: "23050",
      남동구: "23060", 부평구: "23070", 계양구: "23080", 서구: "23090",
      강화군: "23310",
    },
    "31": { // 경기
      수원시: "31010", 성남시: "31020", 의정부시: "31030", 안양시: "31040",
      부천시: "31050", 광명시: "31060", 평택시: "31070", 동두천시: "31080",
      안산시: "31090", 고양시: "31100", 과천시: "31110", 구리시: "31120",
      남양주시: "31130", 오산시: "31140", 시흥시: "31150", 군포시: "31160",
      의왕시: "31170", 하남시: "31180", 용인시: "31190", 파주시: "31200",
      이천시: "31210", 안성시: "31220", 김포시: "31230", 화성시: "31240",
      광주시: "31250", 양주시: "31260", 포천시: "31270", 여주시: "31280",
    },
  };

  return maps[sidoCode] ?? {};
}

/** 시도별 대표 시군구코드 */
function getDefaultSgg(sidoCode: string): string | null {
  const defaults: Record<string, string> = {
    "11": "11010", "21": "21050", "22": "22050", "23": "23060",
    "24": "24010", "25": "25010", "26": "26010", "29": "29010",
    "31": "31010", "32": "32010", "33": "33010", "34": "34010",
    "35": "35010", "36": "36010", "37": "37010", "38": "38010",
    "39": "39010",
  };
  return defaults[sidoCode] ?? null;
}

main()
  .catch((e) => {
    console.error("❌ 동기화 실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
