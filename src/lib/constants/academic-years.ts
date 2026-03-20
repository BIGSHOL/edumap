/**
 * 학년도 상수 — 중앙 관리
 *
 * 환경변수 CURRENT_ACADEMIC_YEAR가 설정되어 있으면 우선 사용합니다.
 * 미설정 시 기본값 "2024" (학교알리미 공시 기준연도)
 */
export const CURRENT_ACADEMIC_YEAR: string =
  process.env.CURRENT_ACADEMIC_YEAR ?? "2024";

/** 숫자형 학년도 (Prisma where 절 등에서 사용) */
export const CURRENT_ACADEMIC_YEAR_NUM: number =
  Number(CURRENT_ACADEMIC_YEAR);
