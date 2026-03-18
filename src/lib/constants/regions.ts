/**
 * 시도교육청 코드 및 이름 매핑
 *
 * 전국 17개 시도교육청 (세종 포함)
 * NEIS ATPT_OFCDC_SC_CODE 기준
 */

export const REGIONS = [
  { code: "B10", name: "서울" },
  { code: "C10", name: "부산" },
  { code: "D10", name: "대구" },
  { code: "E10", name: "인천" },
  { code: "F10", name: "광주" },
  { code: "G10", name: "대전" },
  { code: "H10", name: "울산" },
  { code: "I10", name: "세종" },
  { code: "J10", name: "경기" },
  { code: "K10", name: "강원" },
  { code: "M10", name: "충북" },
  { code: "N10", name: "충남" },
  { code: "P10", name: "전북" },
  { code: "Q10", name: "전남" },
  { code: "R10", name: "경북" },
  { code: "S10", name: "경남" },
  { code: "T10", name: "제주" },
] as const;

/** 코드 → 이름 매핑 (API 라우트에서 사용) */
export const REGION_NAMES: Record<string, string> = Object.fromEntries(
  REGIONS.map((r) => [r.code, r.name])
);

/** 이름으로 코드 찾기 */
export function regionCodeByName(name: string): string | undefined {
  return REGIONS.find((r) => r.name === name)?.code;
}
