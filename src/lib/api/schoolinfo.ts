/**
 * 학교알리미 Open API 클라이언트
 *
 * 엔드포인트: https://www.schoolinfo.go.kr/openApi.do
 * 필수 파라미터: apiKey, apiType, schulKndCode
 * 2026.01.01 이후: sidoCode, sggCode 필수
 *
 * 에듀맵 필요 apiType:
 *   09 — 학교현황(학생·교원): 학교명, 교원수, 학생수, 교원1인당학생수
 *   17 — 직위별 교원현황: 기간제교원 수 산출
 *   59 — 방과후학교 운영: 프로그램 수, 참여학생수
 */

const BASE_URL = "https://www.schoolinfo.go.kr/openApi.do";

/** 학교급 코드 매핑 */
const SCHUL_KND_MAP: Record<string, string> = {
  elementary: "02", // 초등학교
  middle: "03", // 중학교
  high: "04", // 고등학교
};

/** 공통 API 응답 구조 */
interface SchoolInfoApiResult<T> {
  resultCode: string;
  resultMsg: string;
  list?: T[];
  totalCount?: number;
}

/** apiType=09 학교현황(학생·교원) 응답 필드 */
export interface SchoolOverviewRow {
  SCHUL_CODE: string; // 학교코드
  SCHUL_NM: string; // 학교명
  SCHUL_KND_SC_CODE: string; // 학교급코드
  FOND_SC_CODE: string; // 설립구분 (국립/공립/사립)
  ATPT_OFCDC_ORG_NM: string; // 시도교육청명
  ADRCD_NM: string; // 시군구명
  ADRCD_CD: string; // 시군구코드
  TEACH_CNT: number; // 교원수
  COL_S_SUM: number; // 전체학생수
  COL_C_SUM: number; // 학급수
  COL_SUM: number; // 교원1인당학생수
  TEACH_CAL: number; // 교원1인당학생수 (대체필드)
  PBAN_EXCP_YN: string; // 공시제외여부
}

/** apiType=17 직위별 교원현황 응답 필드 */
export interface TeacherPositionRow {
  SCHUL_CODE: string;
  SCHUL_NM: string;
  ADRCD_NM: string;
  COL_1: number; // 교장+교감+수석교사+교사 합계 (정규)
  COL_11: number; // 기간제교사
  COL_14: number; // 강사
  FML_TOI_FGR: number; // 여교원수
  ML_TOI_FGR: number; // 남교원수
  CURR_CCCLA_FGR: number; // 현재 학급수
  COM_CCCLA_FGR: number; // 인가 학급수
}

/** apiType=59 방과후학교 운영 응답 필드 */
export interface AfterSchoolRow {
  SCHUL_CODE: string;
  SCHUL_NM: string;
  ADRCD_NM: string;
  SUM_ASL_PGM_FGR: number; // 전체 방과후 프로그램 수
  ASL_CURR_PGM_FGR: number; // 교과 프로그램 수
  ASL_SPABL_APTD_PGM_FGR: number; // 특기적성 프로그램 수
  ASL_PTPT_STDNT_FGR: number; // 방과후 참여 학생 수
  ASL_CURR_REG_STDNT_FGR: number; // 교과 수강 학생 수
  ASL_SPABL_APTD_REG_STDNT_FGR: number; // 특기적성 수강 학생 수
  SUM_ASL_REG_STDNT_FGR: number; // 수강 연인원
}

interface FetchParams {
  apiType: string;
  schulKndCode: string; // 02:초, 03:중, 04:고
  sidoCode: string;
  sggCode: string;
  pbanYr?: string; // 기본 2024
  pIndex?: number;
  pSize?: number;
}

/**
 * 학교알리미 API 단건 호출 (1페이지)
 */
export async function fetchSchoolInfo<T>(params: FetchParams): Promise<SchoolInfoApiResult<T>> {
  const apiKey = process.env.SCHOOLINFO_API_KEY;
  if (!apiKey) {
    console.warn("[schoolinfo] SCHOOLINFO_API_KEY 미설정");
    return { resultCode: "fail", resultMsg: "API 키 미설정" };
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("apiType", params.apiType);
  url.searchParams.set("schulKndCode", params.schulKndCode);
  url.searchParams.set("sidoCode", params.sidoCode);
  url.searchParams.set("sggCode", params.sggCode);
  url.searchParams.set("pbanYr", params.pbanYr ?? "2024");
  url.searchParams.set("pIndex", String(params.pIndex ?? 1));
  url.searchParams.set("pSize", String(params.pSize ?? 100));

  try {
    const res = await fetch(url.toString());
    const body: SchoolInfoApiResult<T> = await res.json();
    return body;
  } catch (error) {
    console.error("[schoolinfo] API 호출 실패:", error);
    return { resultCode: "fail", resultMsg: String(error) };
  }
}

/**
 * 학교알리미 API 전체 페이지 수집 (페이지네이션)
 * - pSize 단위로 순차 호출, 모든 데이터를 모아서 반환
 * - delayMs: 호출 간 딜레이 (기본 300ms, 공공 API 부하 방지)
 */
export async function fetchAllPages<T>(
  params: Omit<FetchParams, "pIndex">,
  delayMs: number = 300
): Promise<T[]> {
  const pSize = params.pSize ?? 100;
  const allRows: T[] = [];
  let pIndex = 1;

  while (true) {
    const result = await fetchSchoolInfo<T>({ ...params, pIndex, pSize });

    if (result.resultCode !== "success" || !result.list || result.list.length === 0) {
      break;
    }

    allRows.push(...result.list);

    // 마지막 페이지 판단: 받은 건수 < pSize이면 종료
    if (result.list.length < pSize) break;

    // totalCount 기반 종료 판단
    if (result.totalCount && allRows.length >= result.totalCount) break;

    pIndex++;
    // 공공 API 부하 방지 딜레이
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return allRows;
}

/**
 * 학교 현황 (apiType=09) 전체 수집
 * 학교명, 교원수, 학생수, 교원1인당학생수
 */
export async function getSchoolOverview(
  sidoCode: string,
  sggCode: string,
  schulKndCode: string = "02",
  pbanYr: string = "2024"
): Promise<SchoolOverviewRow[]> {
  return fetchAllPages<SchoolOverviewRow>({
    apiType: "09",
    schulKndCode,
    sidoCode,
    sggCode,
    pbanYr,
  });
}

/**
 * 직위별 교원 현황 (apiType=17) 전체 수집
 * 기간제교원비율 산출에 사용
 */
export async function getTeacherPositions(
  sidoCode: string,
  sggCode: string,
  schulKndCode: string = "02",
  pbanYr: string = "2024"
): Promise<TeacherPositionRow[]> {
  return fetchAllPages<TeacherPositionRow>({
    apiType: "17",
    schulKndCode,
    sidoCode,
    sggCode,
    pbanYr,
  });
}

/**
 * 방과후학교 운영 현황 (apiType=59) 전체 수집
 * 프로그램 수, 참여 학생수
 */
export async function getAfterSchoolPrograms(
  sidoCode: string,
  sggCode: string,
  schulKndCode: string = "02",
  pbanYr: string = "2024"
): Promise<AfterSchoolRow[]> {
  return fetchAllPages<AfterSchoolRow>({
    apiType: "59",
    schulKndCode,
    sidoCode,
    sggCode,
    pbanYr,
  });
}

/** schoolType → schulKndCode 변환 */
export function toSchulKndCode(schoolType: string): string {
  return SCHUL_KND_MAP[schoolType] ?? "02";
}
