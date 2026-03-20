/**
 * 시도교육청 코드 매핑
 *
 * NEIS ATPT_OFCDC_SC_CODE → 학교알리미 sidoCode (행정구역코드 앞 2자리)
 * 학교알리미 API는 sidoCode(2자리) + sggCode(5자리) 형식 사용
 */

/** NEIS 시도교육청코드 → 학교알리미 sidoCode */
export const ATPT_TO_SIDO: Record<string, string> = {
  B10: "11", // 서울특별시교육청
  C10: "26", // 부산광역시교육청
  D10: "27", // 대구광역시교육청
  E10: "28", // 인천광역시교육청
  F10: "29", // 광주광역시교육청
  G10: "30", // 대전광역시교육청
  H10: "31", // 울산광역시교육청
  I10: "36", // 세종특별자치시교육청
  J10: "41", // 경기도교육청
  K10: "51", // 강원특별자치도교육청
  M10: "43", // 충청북도교육청
  N10: "44", // 충청남도교육청
  P10: "52", // 전북특별자치도교육청
  Q10: "46", // 전라남도교육청
  R10: "47", // 경상북도교육청
  S10: "48", // 경상남도교육청
  T10: "50", // 제주특별자치도교육청
};

/** 시도별 전체 조회용 sggCode (시도코드 + "000") */
export function getSggCodeAll(sidoCode: string): string {
  return sidoCode + "000";
}

/** NEIS ATPT코드 → 학교알리미 sidoCode 변환 */
export function atptToSidoCode(atptCode: string): string {
  return ATPT_TO_SIDO[atptCode] ?? "11"; // 기본값: 서울
}

/**
 * NEIS ATPT코드 추정 (학교코드 앞글자 기반)
 * NEIS SD_SCHUL_CODE는 숫자 7자리이므로 이 함수는
 * 우리 mock 데이터의 schoolCode(B100000465 형태)에서만 사용
 */
export function guessAtptCode(schoolCode: string): string {
  const prefix = schoolCode.charAt(0).toUpperCase();
  const map: Record<string, string> = {
    B: "B10", C: "C10", D: "D10", E: "E10", F: "F10",
    G: "G10", H: "H10", I: "I10", J: "J10", K: "K10",
    M: "M10", N: "N10", P: "P10", Q: "Q10", R: "R10",
    S: "S10", T: "T10",
  };
  return map[prefix] ?? "B10";
}

/** NEIS 학교종류명 → schoolType 변환 */
export function toSchoolType(schulKndScNm: string): "elementary" | "middle" | "high" {
  if (schulKndScNm.includes("초등")) return "elementary";
  if (schulKndScNm.includes("중학")) return "middle";
  return "high";
}

/** schoolType → 학교알리미 schulKndCode 변환 */
export function toSchulKndCode(schoolType: string): string {
  const map: Record<string, string> = {
    elementary: "02",
    middle: "03",
    high: "04",
  };
  return map[schoolType] ?? "02";
}

/** 주요 5개 시도 (대회 데모 범위) */
export const DEMO_REGIONS = ["B10", "C10", "D10", "E10", "J10"] as const;

/**
 * 학구도 API cddcCode (7자리)
 *
 * 학구도 API는 NEIS ATPT코드가 아닌 별도 7자리 코드 사용
 * 출처: 전국학교학구도연계정보 API 샘플데이터
 */
const ATPT_TO_CDDC: Record<string, string> = {
  B10: "7010000", // 서울특별시교육청
  C10: "7150000", // 부산광역시교육청
  D10: "7240000", // 대구광역시교육청
  E10: "7310000", // 인천광역시교육청
  F10: "7380000", // 광주광역시교육청
  G10: "7430000", // 대전광역시교육청
  H10: "7480000", // 울산광역시교육청
  // I10: 세종 — 학구도 데이터 없음
  J10: "7530000", // 경기도교육청
  K10: "7801000", // 강원특별자치도교육청
  M10: "8000000", // 충청북도교육청
  N10: "8140000", // 충청남도교육청
  P10: "8321000", // 전북특별자치도교육청
  Q10: "8490000", // 전라남도교육청
  R10: "8750000", // 경상북도교육청
  S10: "9010000", // 경상남도교육청
  T10: "9290000", // 제주특별자치도교육청
};

/** NEIS ATPT코드 → 학구도 API cddcCode 변환 */
export function atptToCddcCode(atptCode: string): string {
  return ATPT_TO_CDDC[atptCode] ?? atptCode;
}

/** 학구도 enfsType → schoolType 변환 */
export function enfsTypeToSchoolType(
  enfsType: string
): "elementary" | "middle" | "high" {
  if (enfsType.includes("초등")) return "elementary";
  if (enfsType.includes("중학")) return "middle";
  return "high";
}
