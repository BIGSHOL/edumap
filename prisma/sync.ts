/**
 * 전국 학교 데이터 DB 동기화 스크립트
 *
 * 공공 API(NEIS + 학교알리미)에서 전국 학교 데이터를 수집하여 Supabase DB에 적재
 * 한 번 실행하면 이후 API 라우트에서 DB만 사용 가능
 *
 * 사용법: npx tsx prisma/sync.ts [--region B10] [--type elementary]
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// ─── 설정 ───

const NEIS_BASE = "https://open.neis.go.kr/hub";
const SCHOOLINFO_BASE = "https://www.schoolinfo.go.kr/openApi.do";
const CURRENT_YEAR = "2024";

/** NEIS 시도교육청코드 → 학교알리미 sidoCode */
const ATPT_TO_SIDO: Record<string, string> = {
  B10: "11", C10: "26", D10: "27", E10: "28",
  F10: "29", G10: "30", H10: "31", I10: "36",
  J10: "41", K10: "51", M10: "43", N10: "44",
  P10: "52", Q10: "46", R10: "47", S10: "48",
  T10: "50",
};

const ATPT_NAMES: Record<string, string> = {
  B10: "서울", C10: "부산", D10: "대구", E10: "인천",
  F10: "광주", G10: "대전", H10: "울산", I10: "세종",
  J10: "경기", K10: "강원", M10: "충북", N10: "충남",
  P10: "전북", Q10: "전남", R10: "경북", S10: "경남",
  T10: "제주",
};

const SCHOOL_TYPES = [
  { code: "02", name: "초등학교", type: "elementary" },
  { code: "03", name: "중학교", type: "middle" },
  { code: "04", name: "고등학교", type: "high" },
] as const;

// ─── API 호출 헬퍼 ───

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** NEIS API 전체 페이지 수집 */
async function fetchNeisAll(params: Record<string, string>): Promise<NeisSchoolRow[]> {
  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) throw new Error("NEIS_API_KEY 미설정");

  const allRows: NeisSchoolRow[] = [];
  let pIndex = 1;
  const pSize = 100;

  while (true) {
    const url = new URL(`${NEIS_BASE}/schoolInfo`);
    url.searchParams.set("KEY", apiKey);
    url.searchParams.set("Type", "json");
    url.searchParams.set("pIndex", String(pIndex));
    url.searchParams.set("pSize", String(pSize));
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString());
    const body = await res.json();

    const serviceData = body["schoolInfo"];
    if (!serviceData || !Array.isArray(serviceData)) break;

    const head = serviceData[0]?.head;
    if (head?.[1]?.RESULT?.CODE !== "INFO-000") break;

    const totalCount = head?.[0]?.list_total_count ?? 0;
    const rows: NeisSchoolRow[] = serviceData[1]?.row ?? [];
    if (rows.length === 0) break;

    allRows.push(...rows);
    if (allRows.length >= totalCount || rows.length < pSize) break;

    pIndex++;
    await sleep(200);
  }

  return allRows;
}

interface NeisSchoolRow {
  ATPT_OFCDC_SC_CODE: string;
  ATPT_OFCDC_SC_NM: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  SCHUL_KND_SC_NM: string;
  LCTN_SC_NM: string;
  ORG_RDNMA: string;
  ORG_RDNDA: string;
}

/** 학교알리미 API 전체 페이지 수집 */
async function fetchSchoolInfoAll<T>(params: {
  apiType: string;
  schulKndCode: string;
  sidoCode: string;
  sggCode: string;
}): Promise<T[]> {
  const apiKey = process.env.SCHOOLINFO_API_KEY;
  if (!apiKey) {
    console.warn("  SCHOOLINFO_API_KEY 미설정 — 학교알리미 데이터 건너뜀");
    return [];
  }

  const allRows: T[] = [];
  let pIndex = 1;
  const pSize = 500;

  while (true) {
    const url = new URL(SCHOOLINFO_BASE);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("apiType", params.apiType);
    url.searchParams.set("schulKndCode", params.schulKndCode);
    url.searchParams.set("sidoCode", params.sidoCode);
    url.searchParams.set("sggCode", params.sggCode);
    url.searchParams.set("pbanYr", CURRENT_YEAR);
    url.searchParams.set("pIndex", String(pIndex));
    url.searchParams.set("pSize", String(pSize));

    try {
      const res = await fetch(url.toString());
      const body = await res.json();

      if (body.resultCode !== "success" || !body.list || body.list.length === 0) break;

      allRows.push(...body.list);
      if (body.totalCount && allRows.length >= body.totalCount) break;
      if (!body.totalCount && body.list.length < pSize) break;

      pIndex++;
      await sleep(300);
    } catch (err) {
      console.warn(`  학교알리미 API 오류 (apiType=${params.apiType}):`, err);
      break;
    }
  }

  return allRows;
}

interface SchoolOverviewRow {
  SCHUL_CODE: string;
  SCHUL_NM: string;
  SCHUL_KND_SC_CODE: string;
  ADRCD_NM: string;
  TEACH_CNT: number;
  COL_S_SUM: number;
  COL_SUM: number;
  TEACH_CAL: number;
}

interface TeacherPositionRow {
  SCHUL_CODE: string;
  SCHUL_NM: string;
  ADRCD_NM: string;
  COL_1: number;
  COL_11: number;
}

interface AfterSchoolRow {
  SCHUL_CODE: string;
  SCHUL_NM: string;
  ADRCD_NM: string;
  SUM_ASL_PGM_FGR: number;
  ASL_CURR_PGM_FGR: number;
  ASL_SPABL_APTD_PGM_FGR: number;
  ASL_PTPT_STDNT_FGR: number;
}

// ─── DB 적재 ───

async function upsertRegion(atptCode: string, atptName: string) {
  await prisma.region.upsert({
    where: { regionCode: atptCode },
    update: { regionName: atptName },
    create: { regionCode: atptCode, regionName: atptName },
  });
}

async function upsertSchool(row: NeisSchoolRow, schoolType: string) {
  const district = row.LCTN_SC_NM || extractDistrict(row.ORG_RDNMA);
  await prisma.school.upsert({
    where: { schoolCode: row.SD_SCHUL_CODE },
    update: {
      schoolName: row.SCHUL_NM,
      address: row.ORG_RDNMA || null,
      district,
    },
    create: {
      schoolCode: row.SD_SCHUL_CODE,
      schoolName: row.SCHUL_NM,
      schoolType,
      regionCode: row.ATPT_OFCDC_SC_CODE,
      district,
      address: row.ORG_RDNMA || null,
      dataUpdatedAt: new Date(),
    },
  });
}

async function upsertTeacherStats(
  schoolCode: string,
  overview: SchoolOverviewRow,
  positions: TeacherPositionRow | undefined
) {
  const studentsPerTeacher = overview.COL_SUM ?? overview.TEACH_CAL ?? null;
  let tempTeacherRatio: number | null = null;
  if (positions) {
    const regular = positions.COL_1 ?? 0;
    const temp = positions.COL_11 ?? 0;
    const total = regular + temp;
    tempTeacherRatio = total > 0 ? temp / total : 0;
  }

  const year = Number(CURRENT_YEAR);
  await prisma.teacherStats.upsert({
    where: { idx_teacher_school_year: { schoolCode, year } },
    update: {
      studentsPerTeacher,
      tempTeacherRatio,
      totalTeachers: overview.TEACH_CNT,
      totalStudents: overview.COL_S_SUM,
    },
    create: {
      schoolCode,
      year,
      studentsPerTeacher,
      tempTeacherRatio,
      totalTeachers: overview.TEACH_CNT,
      totalStudents: overview.COL_S_SUM,
      source: "schoolinfo",
    },
  });
}

async function upsertAfterSchoolPrograms(
  schoolCode: string,
  afs: AfterSchoolRow
) {
  const year = Number(CURRENT_YEAR);

  // 기존 프로그램 삭제 후 재생성
  await prisma.afterSchoolProgram.deleteMany({
    where: { schoolCode, year },
  });

  const programs: Array<{
    schoolCode: string;
    year: number;
    subject: string;
    enrollment: number | null;
    category: string;
    source: string;
  }> = [];

  if (afs.ASL_CURR_PGM_FGR > 0) {
    programs.push({
      schoolCode,
      year,
      subject: `교과 프로그램 (${afs.ASL_CURR_PGM_FGR}개)`,
      enrollment: null,
      category: "academic",
      source: "schoolinfo",
    });
  }

  if (afs.ASL_SPABL_APTD_PGM_FGR > 0) {
    programs.push({
      schoolCode,
      year,
      subject: `특기적성 프로그램 (${afs.ASL_SPABL_APTD_PGM_FGR}개)`,
      enrollment: null,
      category: "extracurricular",
      source: "schoolinfo",
    });
  }

  if (programs.length === 0 && afs.SUM_ASL_PGM_FGR > 0) {
    programs.push({
      schoolCode,
      year,
      subject: `방과후 프로그램 (${afs.SUM_ASL_PGM_FGR}개)`,
      enrollment: afs.ASL_PTPT_STDNT_FGR > 0 ? afs.ASL_PTPT_STDNT_FGR : null,
      category: "academic",
      source: "schoolinfo",
    });
  }

  if (programs.length > 0) {
    await prisma.afterSchoolProgram.createMany({ data: programs });
  }
}

function extractDistrict(address: string): string {
  if (!address) return "";
  const parts = address.split(" ");
  return parts[1] ?? parts[0] ?? "";
}

// ─── 메인 동기화 ───

async function syncRegion(atptCode: string, schoolTypeFilter?: string) {
  const regionName = ATPT_NAMES[atptCode] ?? atptCode;
  console.log(`\n=== ${regionName} (${atptCode}) ===`);

  // Region upsert
  await upsertRegion(atptCode, `${regionName}교육청`);

  const sidoCode = ATPT_TO_SIDO[atptCode];
  const sggCode = sidoCode + "000";

  const typesToSync = schoolTypeFilter
    ? SCHOOL_TYPES.filter((t) => t.type === schoolTypeFilter)
    : SCHOOL_TYPES;

  for (const st of typesToSync) {
    console.log(`\n  [${st.name}] NEIS 학교 목록 수집...`);

    // 1. NEIS에서 학교 기본정보 수집
    const neisRows = await fetchNeisAll({
      ATPT_OFCDC_SC_CODE: atptCode,
      SCHUL_KND_SC_NM: st.name,
    });
    console.log(`  [${st.name}] NEIS: ${neisRows.length}개 학교`);

    // DB에 학교 기본정보 적재
    let schoolCount = 0;
    for (const row of neisRows) {
      try {
        await upsertSchool(row, st.type);
        schoolCount++;
      } catch {
        // 중복 등 무시
      }
    }
    console.log(`  [${st.name}] DB 적재: ${schoolCount}개 학교`);

    // 2. 학교알리미에서 교원/방과후 정보 수집
    console.log(`  [${st.name}] 학교알리미 수집 중...`);

    const [overviews, positions, afterSchools] = await Promise.all([
      fetchSchoolInfoAll<SchoolOverviewRow>({
        apiType: "09",
        schulKndCode: st.code,
        sidoCode,
        sggCode,
      }),
      fetchSchoolInfoAll<TeacherPositionRow>({
        apiType: "17",
        schulKndCode: st.code,
        sidoCode,
        sggCode,
      }),
      fetchSchoolInfoAll<AfterSchoolRow>({
        apiType: "59",
        schulKndCode: st.code,
        sidoCode,
        sggCode,
      }),
    ]);

    console.log(`  [${st.name}] 학교알리미: 현황 ${overviews.length}, 교원 ${positions.length}, 방과후 ${afterSchools.length}`);

    // 학교명 기반 매핑 (학교알리미 SCHUL_CODE ≠ NEIS SD_SCHUL_CODE)
    const positionsMap = new Map(positions.map((r) => [r.SCHUL_NM, r]));
    const afterSchoolMap = new Map(afterSchools.map((r) => [r.SCHUL_NM, r]));

    // NEIS 학교 목록 기반으로 학교알리미 데이터 매칭 & DB 적재
    let teacherCount = 0;
    let afterSchoolCount = 0;

    for (const ov of overviews) {
      // NEIS 코드 찾기 (학교명 매칭)
      const neisRow = neisRows.find((r) => r.SCHUL_NM === ov.SCHUL_NM);
      const schoolCode = neisRow?.SD_SCHUL_CODE ?? ov.SCHUL_CODE;

      // 학교가 DB에 없으면 학교알리미 코드로 생성
      if (!neisRow) {
        try {
          await prisma.school.upsert({
            where: { schoolCode: ov.SCHUL_CODE },
            update: {},
            create: {
              schoolCode: ov.SCHUL_CODE,
              schoolName: ov.SCHUL_NM,
              schoolType: st.type,
              regionCode: atptCode,
              district: ov.ADRCD_NM ?? "",
              dataUpdatedAt: new Date(),
            },
          });
        } catch {
          continue;
        }
      }

      const finalCode = neisRow ? schoolCode : ov.SCHUL_CODE;

      // TeacherStats 적재
      try {
        const pos = positionsMap.get(ov.SCHUL_NM);
        await upsertTeacherStats(finalCode, ov, pos);
        teacherCount++;
      } catch {
        // 무시
      }

      // AfterSchoolProgram 적재
      const afs = afterSchoolMap.get(ov.SCHUL_NM);
      if (afs) {
        try {
          await upsertAfterSchoolPrograms(finalCode, afs);
          afterSchoolCount++;
        } catch {
          // 무시
        }
      }
    }

    console.log(`  [${st.name}] DB 적재: 교원현황 ${teacherCount}, 방과후 ${afterSchoolCount}`);
  }
}

async function main() {
  console.log("========================================");
  console.log(" 전국 학교 데이터 DB 동기화");
  console.log("========================================");
  console.log(`기준연도: ${CURRENT_YEAR}`);

  // CLI 인자 파싱
  const args = process.argv.slice(2);
  let regionFilter: string | undefined;
  let typeFilter: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--region" && args[i + 1]) regionFilter = args[i + 1];
    if (args[i] === "--type" && args[i + 1]) typeFilter = args[i + 1];
  }

  // 환경변수 확인
  if (!process.env.NEIS_API_KEY) {
    console.error("NEIS_API_KEY가 설정되지 않았습니다. .env 또는 .env.local에 추가하세요.");
    process.exit(1);
  }
  if (!process.env.SCHOOLINFO_API_KEY) {
    console.warn("SCHOOLINFO_API_KEY 미설정 — 교원/방과후 데이터 없이 학교 기본정보만 동기화");
  }

  const regions = regionFilter
    ? [regionFilter]
    : Object.keys(ATPT_TO_SIDO);

  console.log(`동기화 대상: ${regions.length}개 시도${typeFilter ? ` (${typeFilter})` : ""}`);
  console.log("========================================\n");

  const startTime = Date.now();
  let totalSchools = 0;

  for (const atptCode of regions) {
    try {
      await syncRegion(atptCode, typeFilter);
    } catch (err) {
      console.error(`${ATPT_NAMES[atptCode]} 동기화 실패:`, err);
    }

    // 지역 간 딜레이
    await sleep(500);
  }

  // 최종 통계
  totalSchools = await prisma.school.count();
  const totalTeacher = await prisma.teacherStats.count();
  const totalAfterSchool = await prisma.afterSchoolProgram.count();

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log("\n========================================");
  console.log(" 동기화 완료!");
  console.log("========================================");
  console.log(`총 학교: ${totalSchools}개`);
  console.log(`교원 현황: ${totalTeacher}개`);
  console.log(`방과후 프로그램: ${totalAfterSchool}개`);
  console.log(`소요 시간: ${elapsed}초`);
  console.log("========================================");
}

main()
  .catch((e) => {
    console.error("동기화 실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
