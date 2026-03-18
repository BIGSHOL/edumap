/** 리포트 대상 유형 */
export type ReportType = "policy" | "teacher" | "parent";

/** 리포트 생성 요청 */
export interface ReportRequest {
  schoolCode?: string; // 학교코드 (지역 리포트 시 생략)
  regionCode?: string; // 지역코드 (학교 리포트 시 생략)
  reportType: ReportType; // 리포트 유형
}

/** 리포트 응답 */
export interface ReportResponse {
  id: string;
  reportType: ReportType;
  reportContent: string; // AI 생성 리포트 본문
  modelUsed: string; // 사용된 AI 모델
  generatedAt: string; // ISO 날짜
  source: string; // 데이터 출처
  cached: boolean; // 캐시 히트 여부
}

/** 위험도 스코어 */
export interface RiskScoreInfo {
  schoolCode: string;
  year: number;
  score: number; // 0~100
  level: RiskLevel;
  contributingFactors: ContributingFactor[];
}

/** 위험도 수준 */
export type RiskLevel = "safe" | "caution" | "warning" | "danger";

/** 기여 요인 */
export interface ContributingFactor {
  factor: string; // 요인명
  weight: number; // 가중치
  value: number; // 값
  description: string; // 설명
}
