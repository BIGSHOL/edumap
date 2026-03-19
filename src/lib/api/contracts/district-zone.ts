import { z } from "zod/v4";

/** 학구도 분석 조회 요청 */
export const ZoneAnalysisQuerySchema = z.object({
  region: z.string().optional(), // NEIS 시도교육청코드 (B10 등)
  eduSupportCode: z.string().optional(), // 교육지원청코드
  zoneId: z.string().optional(), // 특정 학구ID
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ZoneAnalysisQuery = z.infer<typeof ZoneAnalysisQuerySchema>;

/** 학구 내 학교 요약 */
export const ZoneSchoolSummarySchema = z.object({
  schoolCode: z.string(),
  schoolName: z.string(),
  schoolType: z.enum(["elementary", "middle", "high"]),
  riskScore: z.number(),
  riskLevel: z.enum(["safe", "caution", "warning", "danger"]),
  coverageRate: z.number(),
  gapCount: z.number(),
});

export type ZoneSchoolSummary = z.infer<typeof ZoneSchoolSummarySchema>;

/** 학구 분석 결과 */
export const ZoneAnalysisResultSchema = z.object({
  zoneId: z.string(),
  zoneName: z.string(), // 한글 학구명 (예: "종로구 서울대부설초 학구")
  schoolCount: z.number(),
  schools: z.array(ZoneSchoolSummarySchema),
  // 학구 평균 지표
  avgRiskScore: z.number(),
  avgCoverageRate: z.number(),
  avgStudentsPerTeacher: z.number().nullable(),
  avgBudgetPerStudent: z.number().nullable(),
  worstFactor: z.string().nullable(), // 가장 빈번한 위험 요인
  overallLevel: z.enum(["safe", "caution", "warning", "danger"]),
  // 학구 내 편차
  riskScoreVariance: z.number(), // 높을수록 학교 간 격차 큼
  // 교육지원청 정보
  eduSupportCode: z.string().nullable(),
  eduSupportName: z.string().nullable(),
});

export type ZoneAnalysisResult = z.infer<typeof ZoneAnalysisResultSchema>;

/** 교육지원청 목록 항목 */
export const EduSupportOfficeSchema = z.object({
  code: z.string(),
  name: z.string(),
  zoneCount: z.number(),
});

export type EduSupportOffice = z.infer<typeof EduSupportOfficeSchema>;
