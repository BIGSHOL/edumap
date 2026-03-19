import { z } from "zod/v4";

/** 시군구별 학원 통계 스키마 */
export const AcademyStatsSchema = z.object({
  regionCode: z.string(),
  district: z.string(),
  year: z.number(),
  totalAcademies: z.number(),
  totalCapacity: z.number().nullable(),
  academyByRealm: z.record(z.string(), z.number()),
});

export type AcademyStatsResponse = z.infer<typeof AcademyStatsSchema>;

/** 학원 통계 조회 쿼리 스키마 */
export const AcademyStatsQuerySchema = z.object({
  region: z.string().default("B10"),
  district: z.string().optional(),
});
