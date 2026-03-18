import { z } from "zod/v4";

/** 위험도 조회 요청 */
export const EarlyAlertQuerySchema = z.object({
  schoolCode: z.string().optional(),
  regionCode: z.string().optional(),
  year: z.coerce.number().int().optional(),
});

export type EarlyAlertQuery = z.infer<typeof EarlyAlertQuerySchema>;

/** 위험도 스코어 응답 아이템 */
export const RiskScoreItemSchema = z.object({
  schoolCode: z.string(),
  schoolName: z.string(),
  year: z.number(),
  score: z.number().min(0).max(100),
  level: z.enum(["safe", "caution", "warning", "danger"]),
  contributingFactors: z.array(
    z.object({
      factor: z.string(),
      weight: z.number(),
      value: z.number(),
      description: z.string(),
    })
  ),
});

export type RiskScoreItem = z.infer<typeof RiskScoreItemSchema>;
