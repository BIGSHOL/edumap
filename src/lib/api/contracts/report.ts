import { z } from "zod/v4";

/** 리포트 생성 요청 */
export const ReportRequestSchema = z.object({
  schoolCode: z.string().optional(),
  regionCode: z.string().optional(),
  reportType: z.enum(["policy", "teacher", "parent"]),
});

export type ReportRequestBody = z.infer<typeof ReportRequestSchema>;

/** 리포트 응답 */
export const ReportResponseSchema = z.object({
  id: z.string(),
  reportType: z.enum(["policy", "teacher", "parent"]),
  reportContent: z.string(),
  modelUsed: z.string(),
  generatedAt: z.string(),
  source: z.string(),
  cached: z.boolean(),
});

export type ReportResponseBody = z.infer<typeof ReportResponseSchema>;
