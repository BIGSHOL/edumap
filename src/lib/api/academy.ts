/**
 * 나이스 학원교습소정보 API 클라이언트
 *
 * 엔드포인트: https://open.neis.go.kr/hub/acaInsTiInfo
 * 인증: NEIS_API_KEY (학교기본정보와 동일)
 *
 * 에듀맵 사용: 지역별 학원 밀도 분석 → EarlyAlert, GapMap 보완
 */

import { getCached, setCache } from "@/lib/services/api-cache";

const BASE_URL = "https://open.neis.go.kr/hub";
const SERVICE = "acaInsTiInfo";

/** 학원교습소정보 응답 필드 */
export interface AcademyRow {
  ATPT_OFCDC_SC_CODE: string; // 시도교육청코드 (B10)
  ATPT_OFCDC_SC_NM: string; // 시도교육청명
  ADMST_ZONE_NM: string; // 행정구역명 (강남구)
  ACA_INSTI_SC_NM: string; // 기관유형 (학원/교습소/개인과외교습자)
  ACA_ASNUM: string; // 학원지정번호
  ACA_NM: string; // 학원명
  ESTBL_YMD: string; // 설립일자
  REG_YMD: string; // 등록일자
  REG_STTUS_NM: string; // 등록상태 (개원/폐원/휴원)
  TOFOR_SMTOT: string; // 정원합계 (문자열)
  DTM_RCPTN_ABLTY_NMPR_SMTOT: string; // 정시수용능력인원합계 (문자열)
  REALM_SC_NM: string; // 교습영역 (입시.검정 및 보습, 예능(음악) 등)
  LE_ORD_NM: string; // 교습계열
  LE_CRSE_NM: string; // 교습과정
  PSNBY_THCC_CNTNT: string; // 수강료 정보
  FA_RDNMA: string; // 도로명주소
  FA_TELNO: string; // 전화번호
}

/** 나이스 API 1페이지 호출 결과 */
interface NeisPageResult<T> {
  rows: T[];
  totalCount: number;
}

/**
 * 학원교습소 API 1페이지 호출 (ApiCache 적용)
 */
async function fetchAcademyPage(
  params: Record<string, string>
): Promise<NeisPageResult<AcademyRow>> {
  const cacheKey = `${SERVICE}:${JSON.stringify(params)}`;
  const cached = await getCached<NeisPageResult<AcademyRow>>(
    "neis-academy",
    cacheKey
  );
  if (cached) return cached;

  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) {
    console.warn("[academy] NEIS_API_KEY 미설정");
    return { rows: [], totalCount: 0 };
  }

  const url = new URL(`${BASE_URL}/${SERVICE}`);
  url.searchParams.set("KEY", apiKey);
  url.searchParams.set("Type", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString());
    const body = await res.json();

    const serviceData = body[SERVICE];
    if (!serviceData || !Array.isArray(serviceData)) {
      console.warn(`[academy] ${SERVICE}: 응답 없음`);
      return { rows: [], totalCount: 0 };
    }

    const head = serviceData[0]?.head;
    if (head) {
      const result = head[1]?.RESULT;
      if (result?.CODE !== "INFO-000") {
        console.warn(`[academy] ${SERVICE}: ${result?.MESSAGE}`);
        return { rows: [], totalCount: 0 };
      }
    }

    const totalCount = head?.[0]?.list_total_count ?? 0;
    const rows: AcademyRow[] = serviceData[1]?.row ?? [];
    const pageResult = { rows, totalCount };

    if (rows.length > 0) {
      setCache("neis-academy", cacheKey, pageResult, 24).catch(() => {});
    }

    return pageResult;
  } catch (error) {
    console.error("[academy] API 호출 실패:", error);
    return { rows: [], totalCount: 0 };
  }
}

/**
 * 학원교습소 전체 페이지 수집 (페이지네이션)
 * pSize=1000 (학원 데이터 대량)
 */
export async function fetchAllAcademyPages(
  params: Record<string, string>,
  pSize: number = 1000,
  delayMs: number = 100
): Promise<AcademyRow[]> {
  const allRows: AcademyRow[] = [];
  let pIndex = 1;

  while (true) {
    const { rows, totalCount } = await fetchAcademyPage({
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
 * 지역별 학원 목록 조회 (개원 상태만 필터)
 * @param atptCode 시도교육청코드 (B10 형식)
 */
export async function getAcademiesByRegion(
  atptCode: string
): Promise<AcademyRow[]> {
  const rows = await fetchAllAcademyPages({
    ATPT_OFCDC_SC_CODE: atptCode,
  });

  // 개원 상태만 필터링 (API에 등록상태 필터 없음)
  return rows.filter((r) => r.REG_STTUS_NM === "개원");
}
