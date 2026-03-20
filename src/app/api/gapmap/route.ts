import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getSchoolDetails } from "@/lib/services/school-data";
import { analyzeGaps } from "@/lib/analysis/gapmap";
import { sourceLabel } from "@/lib/services/utils";
import { generateWithClaude } from "@/lib/ai/gemini";
import { buildGapSuggestionPrompt, buildGapSchoolContext } from "@/lib/ai/prompts-gemini";
import { getAcademyStats } from "@/lib/services/academy-data";

/** GET 파라미터 검증 스키마 */
const GapMapQuerySchema = z.object({
  schoolCode: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(200),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = GapMapQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: parsed.error.issues.map((i) => i.message).join(", ") } },
      { status: 400 }
    );
  }

  const schoolCode = parsed.data.schoolCode;
  const regionCode = parsed.data.region;
  const district = parsed.data.district;
  const limit = parsed.data.limit;

  // 학교 데이터 + 학원 통계 병렬 조회
  const [{ data: schools, source }, { data: academyData }] = await Promise.all([
    getSchoolDetails({ schoolCode, region: regionCode, district }),
    getAcademyStats({ regionCode: regionCode ?? "B10", district }),
  ]);

  // 시군구별 학원 통계 맵
  const academyMap = new Map(academyData.map((a) => [a.district, a]));

  const results = schools
    .map((school) => analyzeGaps(school, academyMap.get(school.district)))
    .sort((a, b) => b.totalGaps - a.totalGaps)
    .slice(0, limit);

  // 개별 학교 조회 시 AI 개선 제안 포함
  let aiSuggestion = "";
  if (schoolCode && results.length === 1 && results[0].totalGaps > 0) {
    try {
      const context = buildGapSchoolContext(results[0]);
      const result = await generateWithClaude({
        prompt: buildGapSuggestionPrompt(context),
        cacheKey: { reportType: "gap-suggestion", schoolCode },
      });
      aiSuggestion = result.text;
    } catch {
      // AI 실패해도 기본 데이터는 반환
    }
  }

  const response = NextResponse.json({
    data: results,
    aiSuggestion,
    meta: { source: sourceLabel(source, "공백 분석"), total: schools.length },
  });
  response.headers.set("Cache-Control", "public, max-age=300");
  return response;
}
