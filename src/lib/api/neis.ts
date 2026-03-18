/**
 * 나이스 교육정보 개방 포털 API 클라이언트
 *
 * 엔드포인트: https://open.neis.go.kr/hub/{서비스명}
 * 인증: KEY 파라미터
 *
 * 에듀맵 사용 서비스:
 *   schoolInfo — 학교 기본정보 (학교명, 주소, 학교코드)
 */

import { getCached, setCache } from "@/lib/services/api-cache";

const BASE_URL = "https://open.neis.go.kr/hub";

/** 학교기본정보 응답 필드 */
export interface NeisSchoolRow {
  ATPT_OFCDC_SC_CODE: string; // 시도교육청코드
  ATPT_OFCDC_SC_NM: string; // 시도교육청명
  SD_SCHUL_CODE: string; // 표준학교코드
  SCHUL_NM: string; // 학교명
  ENG_SCHUL_NM: string; // 영문학교명
  SCHUL_KND_SC_NM: string; // 학교종류명 (초등학교/중학교/고등학교)
  LCTN_SC_NM: string; // 소재지명
  JU_ORG_NM: string; // 관할조직명
  FOND_SC_NM: string; // 설립명
  ORG_RDNZC: string; // 도로명우편번호
  ORG_RDNMA: string; // 도로명주소
  ORG_RDNDA: string; // 도로명상세주소
  ORG_TELNO: string; // 전화번호
  HMPG_ADRES: string; // 홈페이지주소
  COEDU_SC_NM: string; // 남녀공학구분명
  ORG_FAXNO: string; // 팩스번호
  HS_SC_NM: string; // 고등학교구분명
  INDST_SPECL_CCCCL_EXST_YN: string; // 산업체특별학급존재여부
  HS_GNRL_BUSNS_SC_NM: string; // 고등학교일반전문구분명
  SPCLY_PURPS_HS_ORD_NM: string; // 특수목적고등학교계열명
  ENE_BFE_SEHF_SC_NM: string; // 입시전후기구분명
  DGHT_SC_NM: string; // 주야구분명
  FOND_YMD: string; // 설립일자
  FOAS_MEMRD: string; // 개교기념일
  LOAD_DTM: string; // 수정일
}

/** 나이스 API 1페이지 호출 결과 */
interface NeisPageResult<T> {
  rows: T[];
  totalCount: number;
}

/**
 * 나이스 API 1페이지 호출 (ApiCache 적용)
 */
async function fetchNeisPage<T>(
  service: string,
  params: Record<string, string>
): Promise<NeisPageResult<T>> {
  // ApiCache 조회
  const cacheKey = `${service}:${JSON.stringify(params)}`;
  const cached = await getCached<NeisPageResult<T>>("neis", cacheKey);
  if (cached) return cached;

  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) {
    console.warn("[neis] NEIS_API_KEY 미설정");
    return { rows: [], totalCount: 0 };
  }

  const url = new URL(`${BASE_URL}/${service}`);
  url.searchParams.set("KEY", apiKey);
  url.searchParams.set("Type", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString());
    const body = await res.json();

    const serviceData = body[service];
    if (!serviceData || !Array.isArray(serviceData)) {
      console.warn(`[neis] ${service}: 응답 없음`);
      return { rows: [], totalCount: 0 };
    }

    const head = serviceData[0]?.head;
    if (head) {
      const result = head[1]?.RESULT;
      if (result?.CODE !== "INFO-000") {
        console.warn(`[neis] ${service}: ${result?.MESSAGE}`);
        return { rows: [], totalCount: 0 };
      }
    }

    const totalCount = head?.[0]?.list_total_count ?? 0;
    const rows = serviceData[1]?.row ?? [];
    const pageResult = { rows, totalCount };

    // 성공한 응답만 캐싱 (TTL 24시간)
    if (rows.length > 0) {
      setCache("neis", cacheKey, pageResult, 24).catch(() => {});
    }

    return pageResult;
  } catch (error) {
    console.error("[neis] API 호출 실패:", error);
    return { rows: [], totalCount: 0 };
  }
}

/**
 * 나이스 API 전체 페이지 수집 (페이지네이션)
 */
export async function fetchAllNeisPages<T>(
  service: string,
  params: Record<string, string>,
  pSize: number = 100,
  delayMs: number = 300
): Promise<T[]> {
  const allRows: T[] = [];
  let pIndex = 1;

  while (true) {
    const { rows, totalCount } = await fetchNeisPage<T>(service, {
      ...params,
      pIndex: String(pIndex),
      pSize: String(pSize),
    });

    if (rows.length === 0) break;
    allRows.push(...rows);

    if (allRows.length >= totalCount || rows.length < pSize) break;

    pIndex++;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return allRows;
}

/**
 * 나이스 API 호출 (하위 호환, 1페이지만)
 */
async function fetchNeis<T>(
  service: string,
  params: Record<string, string>
): Promise<T[]> {
  const { rows } = await fetchNeisPage<T>(service, params);
  return rows;
}

/**
 * 학교 기본정보 검색
 */
export async function searchSchools(params: {
  ATPT_OFCDC_SC_CODE?: string; // 시도교육청코드 (예: B10)
  SCHUL_NM?: string; // 학교명 검색
  SCHUL_KND_SC_NM?: string; // 학교종류 (초등학교/중학교/고등학교)
  pIndex?: number;
  pSize?: number;
}): Promise<NeisSchoolRow[]> {
  const queryParams: Record<string, string> = {
    pIndex: String(params.pIndex ?? 1),
    pSize: String(params.pSize ?? 100),
  };

  if (params.ATPT_OFCDC_SC_CODE) {
    queryParams.ATPT_OFCDC_SC_CODE = params.ATPT_OFCDC_SC_CODE;
  }
  if (params.SCHUL_NM) {
    queryParams.SCHUL_NM = params.SCHUL_NM;
  }
  if (params.SCHUL_KND_SC_NM) {
    queryParams.SCHUL_KND_SC_NM = params.SCHUL_KND_SC_NM;
  }

  return fetchNeis<NeisSchoolRow>("schoolInfo", queryParams);
}

/**
 * 학교코드로 학교 기본정보 조회
 */
export async function getSchoolByCode(
  atptCode: string,
  schoolCode: string
): Promise<NeisSchoolRow | null> {
  const rows = await fetchNeis<NeisSchoolRow>("schoolInfo", {
    ATPT_OFCDC_SC_CODE: atptCode,
    SD_SCHUL_CODE: schoolCode,
    pIndex: "1",
    pSize: "1",
  });
  return rows[0] ?? null;
}

/** 학교종류명 → schoolType 변환 */
export function toSchoolType(schulKndScNm: string): "elementary" | "middle" | "high" {
  if (schulKndScNm.includes("초등")) return "elementary";
  if (schulKndScNm.includes("중학")) return "middle";
  return "high";
}
