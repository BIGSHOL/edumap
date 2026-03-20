/**
 * 학구도 실제 데이터 동기화 스크립트
 *
 * 공공데이터포털 학구도 API에서 실제 데이터를 가져와 DB에 저장
 * 일일 API 한도 1,000건이므로 시도별로 나눠서 실행
 *
 * Usage:
 *   npx tsx scripts/sync-zones.ts                    # 전체 현황 확인
 *   npx tsx scripts/sync-zones.ts seoul              # 서울만 동기화
 *   npx tsx scripts/sync-zones.ts busan              # 부산만 동기화
 *   npx tsx scripts/sync-zones.ts daegu incheon      # 대구+인천
 *   npx tsx scripts/sync-zones.ts --limit 500        # API 호출 500건까지만
 */

import { PrismaClient } from "@prisma/client";
import http from "http";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

const API_KEY = process.env.DISTRICT_ZONE_API_KEY;
const BASE_URL =
  "http://api.data.go.kr/openapi/tn_pubr_public_schul_atndskl_zn_drw_lnkinfo_api";

/** 시도 정보 */
const REGIONS: Record<string, { cddcCode: string; name: string }> = {
  seoul: { cddcCode: "7010000", name: "서울특별시교육청" },
  busan: { cddcCode: "7150000", name: "부산광역시교육청" },
  daegu: { cddcCode: "7240000", name: "대구광역시교육청" },
  incheon: { cddcCode: "7310000", name: "인천광역시교육청" },
  gwangju: { cddcCode: "7380000", name: "광주광역시교육청" },
  daejeon: { cddcCode: "7430000", name: "대전광역시교육청" },
  ulsan: { cddcCode: "7480000", name: "울산광역시교육청" },
  gyeonggi: { cddcCode: "7530000", name: "경기도교육청" },
  gangwon: { cddcCode: "7801000", name: "강원특별자치도교육청" },
  chungbuk: { cddcCode: "8000000", name: "충청북도교육청" },
  chungnam: { cddcCode: "8140000", name: "충청남도교육청" },
  jeonbuk: { cddcCode: "8321000", name: "전북특별자치도교육청" },
  jeonnam: { cddcCode: "8490000", name: "전라남도교육청" },
  gyeongbuk: { cddcCode: "8750000", name: "경상북도교육청" },
  gyeongnam: { cddcCode: "9010000", name: "경상남도교육청" },
  jeju: { cddcCode: "9290000", name: "제주특별자치도교육청" },
};

/** NEIS ATPT 코드 매핑 (cddcCode → ATPT) */
const CDDC_TO_ATPT: Record<string, string> = {
  "7010000": "B10", "7150000": "C10", "7240000": "D10",
  "7310000": "E10", "7380000": "F10", "7430000": "G10",
  "7480000": "H10", "7530000": "J10", "7801000": "K10",
  "8000000": "M10", "8140000": "N10", "8321000": "P10",
  "8490000": "Q10", "8750000": "R10", "9010000": "S10",
  "9290000": "T10",
};

interface ApiRow {
  atndsklId: string;
  schoolId: string;
  schulNm: string;
  enfsType: string;
  cddcCode: string;
  cddcNm: string;
  edcSport: string;
  edcSportNm: string;
  referenceDate?: string;
  insttCode?: string;
  insttNm?: string;
}

/** HTTP GET JSON 요청 */
function fetchJson(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    http
      .get(url, { timeout: 15000 }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`JSON 파싱 실패: ${data.substring(0, 100)}`));
          }
        });
      })
      .on("error", reject)
      .on("timeout", function (this: http.ClientRequest) {
        this.destroy();
        reject(new Error("타임아웃"));
      });
  });
}

/** 1페이지 조회 */
async function fetchPage(
  cddcCode: string,
  pageNo: number,
  numOfRows: number = 100
): Promise<{ rows: ApiRow[]; totalCount: number }> {
  const url = `${BASE_URL}?serviceKey=${API_KEY}&type=json&numOfRows=${numOfRows}&pageNo=${pageNo}&cddcCode=${cddcCode}`;

  const body = (await fetchJson(url)) as {
    response: {
      header: { resultCode: string; resultMsg: string };
      body?: { items: ApiRow[]; totalCount: string | number };
    };
  };

  if (body.response.header.resultCode !== "00") {
    throw new Error(
      `API 오류 ${body.response.header.resultCode}: ${body.response.header.resultMsg}`
    );
  }

  const items = body.response.body?.items ?? [];
  const totalCount = Number(body.response.body?.totalCount ?? 0);
  return { rows: items, totalCount };
}

/** 한 시도 전체 동기화 */
async function syncRegion(
  regionKey: string,
  apiCallBudget: { remaining: number }
): Promise<number> {
  const region = REGIONS[regionKey];
  if (!region) {
    console.error(`  알 수 없는 시도: ${regionKey}`);
    return 0;
  }

  const atptCode = CDDC_TO_ATPT[region.cddcCode] ?? region.cddcCode;

  // 기존 시드 데이터 삭제 (해당 시도)
  const deleted = await prisma.districtZone.deleteMany({
    where: { sidoEduCode: atptCode },
  });
  if (deleted.count > 0) {
    console.log(`  기존 데이터 ${deleted.count}건 삭제`);
  }

  let pageNo = 1;
  let totalSaved = 0;
  let totalCount = 0;
  const NUM_OF_ROWS = 100;

  while (apiCallBudget.remaining > 0) {
    const { rows, totalCount: tc } = await fetchPage(
      region.cddcCode,
      pageNo,
      NUM_OF_ROWS
    );
    totalCount = tc;
    apiCallBudget.remaining--;

    if (rows.length === 0) break;

    // DB 저장 (batch upsert)
    for (const row of rows) {
      await prisma.districtZone.upsert({
        where: {
          idx_zone_school: {
            zoneId: row.atndsklId,
            schoolId: row.schoolId,
          },
        },
        update: {
          schoolName: row.schulNm,
          schoolLevel: row.enfsType,
          sidoEduCode: atptCode,
          sidoEduName: row.cddcNm,
          eduSupportCode: row.edcSport,
          eduSupportName: row.edcSportNm,
          referenceDate: row.referenceDate ?? null,
        },
        create: {
          zoneId: row.atndsklId,
          schoolId: row.schoolId,
          schoolName: row.schulNm,
          schoolLevel: row.enfsType,
          sidoEduCode: atptCode,
          sidoEduName: row.cddcNm,
          eduSupportCode: row.edcSport,
          eduSupportName: row.edcSportNm,
          referenceDate: row.referenceDate ?? null,
        },
      });
    }

    totalSaved += rows.length;
    process.stdout.write(
      `\r  p${pageNo}: ${totalSaved}/${totalCount} 저장 (API 잔여: ${apiCallBudget.remaining})`
    );

    if (totalSaved >= totalCount || rows.length < NUM_OF_ROWS) break;

    pageNo++;
    // 공공 API 부하 방지 딜레이
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(); // 줄바꿈
  return totalSaved;
}

async function showStatus() {
  console.log("\n=== 학구도 DB 현황 ===\n");

  for (const [key, region] of Object.entries(REGIONS)) {
    const atptCode = CDDC_TO_ATPT[region.cddcCode] ?? region.cddcCode;
    const count = await prisma.districtZone.count({
      where: { sidoEduCode: atptCode },
    });
    const zoneCount = await prisma.districtZone.groupBy({
      by: ["zoneId"],
      where: { sidoEduCode: atptCode },
    });
    console.log(
      `  ${key.padEnd(10)} ${region.name.padEnd(14)} ${count}건 (${zoneCount.length}개 학구)`
    );
  }

  const total = await prisma.districtZone.count();
  console.log(`\n  합계: ${total}건`);
}

async function main() {
  if (!API_KEY) {
    console.error("DISTRICT_ZONE_API_KEY가 .env.local에 설정되어 있지 않습니다.");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  // --limit 파라미터 처리
  let limit = 900; // 기본 900건 (여유분 100건 남김)
  const limitIdx = args.indexOf("--limit");
  if (limitIdx >= 0 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1]);
    args.splice(limitIdx, 2);
  }

  // 동기화 대상 시도 결정
  const targetRegions = args.filter((a) => !a.startsWith("--"));

  if (targetRegions.length === 0) {
    // 인자 없으면 현황만 표시
    await showStatus();
    console.log("\n사용법: npx tsx scripts/sync-zones.ts [시도...] [--limit N]");
    console.log("  시도: seoul, busan, daegu, incheon, gyeonggi");
    console.log("  예시: npx tsx scripts/sync-zones.ts seoul --limit 500");
    return;
  }

  const apiCallBudget = { remaining: limit };

  console.log(
    `\n=== 학구도 동기화 시작 (API 한도: ${limit}건) ===\n`
  );

  let grandTotal = 0;

  for (const regionKey of targetRegions) {
    if (apiCallBudget.remaining <= 0) {
      console.log(`\n  API 한도 도달! 나머지 시도는 내일 실행하세요.`);
      break;
    }

    console.log(`[${regionKey}] ${REGIONS[regionKey]?.name ?? "?"} 동기화...`);
    const saved = await syncRegion(regionKey, apiCallBudget);
    grandTotal += saved;
  }

  console.log(
    `\n=== 완료: ${grandTotal}건 저장, API ${limit - apiCallBudget.remaining}건 사용 ===`
  );

  await showStatus();
}

main()
  .catch((e) => {
    console.error("오류:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
