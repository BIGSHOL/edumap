/**
 * 전국학교학구도연계정보 API 클라이언트
 *
 * 엔드포인트: https://api.data.go.kr/openapi/tn_pubr_public_schul_atndskl_zn_drw_lnkinfo_api
 * 인증: serviceKey 파라미터
 * 일일 트래픽: 1,000건
 *
 * 출처: 공공데이터포털 전국학교학구도연계정보표준데이터
 * 라이선스: 저작자표시
 */

import { getCached, setCache } from "@/lib/services/api-cache";

const BASE_URL =
  "https://api.data.go.kr/openapi/tn_pubr_public_schul_atndskl_zn_drw_lnkinfo_api";

/** API 응답 행 (학구-학교 연계 1건) */
export interface DistrictZoneRow {
  atndsklId: string; // 학구ID
  schoolId: string; // 학교ID
  schulNm: string; // 학교명
  enfsType: string; // 학교급구분 (초등학교/중학교/고등학교)
  cddcCode: string; // 시도교육청코드
  cddcNm: string; // 시도교육청명
  edcSport: string; // 교육지원청코드
  edcSportNm: string; // 교육지원청명
  referenceDate?: string; // 데이터기준일자
  insttCode?: string; // 제공기관코드
  insttNm?: string; // 제공기관명
}

/** 공공데이터포털 표준 응답 구조 */
interface DataGoKrResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body?: {
      items: DistrictZoneRow[];
      totalCount: number;
      numOfRows: number;
      pageNo: number;
    };
  };
}

interface FetchParams {
  cddcCode?: string; // 시도교육청코드
  edcSport?: string; // 교육지원청코드
  schulNm?: string; // 학교명
  pageNo?: number;
  numOfRows?: number;
}

/**
 * 학구도 API 1페이지 호출 (ApiCache 적용)
 */
export async function fetchDistrictZonePage(
  params: FetchParams
): Promise<{ rows: DistrictZoneRow[]; totalCount: number }> {
  const pageNo = params.pageNo ?? 1;
  const numOfRows = params.numOfRows ?? 100;

  // ApiCache 조회
  const cacheKey = `${params.cddcCode ?? "all"}:${params.edcSport ?? "all"}:${params.schulNm ?? ""}:${pageNo}:${numOfRows}`;
  const cached = await getCached<{ rows: DistrictZoneRow[]; totalCount: number }>(
    "district-zone",
    cacheKey
  );
  if (cached) return cached;

  const apiKey = process.env.DISTRICT_ZONE_API_KEY;
  if (!apiKey) {
    console.warn("[district-zone] DISTRICT_ZONE_API_KEY 미설정");
    return { rows: [], totalCount: 0 };
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("type", "json");
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));

  if (params.cddcCode) url.searchParams.set("cddcCode", params.cddcCode);
  if (params.edcSport) url.searchParams.set("edcSport", params.edcSport);
  if (params.schulNm) url.searchParams.set("schulNm", params.schulNm);

  try {
    const res = await fetch(url.toString());
    const body: DataGoKrResponse = await res.json();

    if (body.response.header.resultCode !== "00") {
      console.warn(
        `[district-zone] API 오류: ${body.response.header.resultCode} ${body.response.header.resultMsg}`
      );
      return { rows: [], totalCount: 0 };
    }

    const items = body.response.body?.items ?? [];
    const totalCount = body.response.body?.totalCount ?? 0;
    const result = { rows: items, totalCount };

    // 성공한 응답만 캐싱 (TTL 24시간)
    if (items.length > 0) {
      setCache("district-zone", cacheKey, result, 24).catch(() => {});
    }

    return result;
  } catch (error) {
    console.error("[district-zone] API 호출 실패:", error);
    return { rows: [], totalCount: 0 };
  }
}

/**
 * 학구도 API 전체 페이지 수집 (페이지네이션)
 * - 공공 API 부하 방지 300ms 딜레이
 */
export async function fetchAllDistrictZones(
  params: Omit<FetchParams, "pageNo">,
  delayMs: number = 300
): Promise<DistrictZoneRow[]> {
  const numOfRows = params.numOfRows ?? 100;
  const allRows: DistrictZoneRow[] = [];
  let pageNo = 1;

  while (true) {
    const { rows, totalCount } = await fetchDistrictZonePage({
      ...params,
      pageNo,
      numOfRows,
    });

    if (rows.length === 0) break;
    allRows.push(...rows);

    if (allRows.length >= totalCount || rows.length < numOfRows) break;

    pageNo++;
    // 공공 API 부하 방지 딜레이
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return allRows;
}

/**
 * 시도교육청코드로 학구도 전체 조회
 * 주요 5개 시도: 서울(B10), 부산(C10), 대구(D10), 인천(E10), 경기(J10)
 */
export async function getDistrictZonesByRegion(
  cddcCode: string
): Promise<DistrictZoneRow[]> {
  return fetchAllDistrictZones({ cddcCode });
}

/**
 * 교육지원청코드로 학구도 조회
 */
export async function getDistrictZonesByEduSupport(
  edcSport: string
): Promise<DistrictZoneRow[]> {
  return fetchAllDistrictZones({ edcSport });
}

/**
 * 학교명으로 학구 검색
 */
export async function searchDistrictZonesBySchool(
  schulNm: string
): Promise<DistrictZoneRow[]> {
  const { rows } = await fetchDistrictZonePage({ schulNm, numOfRows: 50 });
  return rows;
}
