/** 공통 API 성공 응답 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    source: string; // 데이터 출처 (학교알리미, 나이스 등)
    updatedAt?: string; // 데이터 갱신일
    page?: number;
    total?: number;
  };
}

/** 공통 API 에러 응답 */
export interface ApiErrorResponse {
  error: {
    code: string; // 에러 코드 (API_UNAVAILABLE, VALIDATION_ERROR 등)
    message: string; // 사용자 표시 메시지
    fallback?: boolean; // fallback 데이터 사용 여부
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

/**
 * 학교알리미 API 원본 응답 타입
 * 한글 필드명 원본을 주석으로 병기합니다.
 */
export interface SchoolInfoApiResponse {
  SCHUL_NM: string; // 학교명
  SD_SCHUL_CODE: string; // 표준학교코드
  ATPT_OFCDC_SC_CODE: string; // 시도교육청코드
  ORG_RDNMA: string; // 도로명주소
  SCHUL_KND_SC_NM: string; // 학교종류명 (초등학교/중학교/고등학교)
  LCTN_SC_NM: string; // 소재지명
  COEDU_SC_NM: string; // 남녀공학구분명
}

/**
 * 나이스 API 원본 응답 타입
 */
export interface NeisApiResponse {
  ATPT_OFCDC_SC_CODE: string; // 시도교육청코드
  ATPT_OFCDC_SC_NM: string; // 시도교육청명
  SD_SCHUL_CODE: string; // 표준학교코드
  SCHUL_NM: string; // 학교명
  ORG_RDNMA: string; // 도로명주소
  SCHUL_KND_SC_NM: string; // 학교종류명
}
