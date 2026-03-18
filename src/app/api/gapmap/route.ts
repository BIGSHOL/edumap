import { NextResponse } from "next/server";
import { getSchoolDetails } from "@/lib/services/school-data";
import { analyzeGaps } from "@/lib/analysis/gapmap";
import { sourceLabel } from "@/lib/services/utils";
import { generateWithClaude } from "@/lib/ai/gemini";
import { buildGapSuggestionPrompt, buildGapSchoolContext } from "@/lib/ai/prompts-gemini";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolCode = searchParams.get("schoolCode") ?? undefined;
  const regionCode = searchParams.get("region") ?? undefined;
  const district = searchParams.get("district") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 200)));

  const { data: schools, source } = await getSchoolDetails({
    schoolCode,
    region: regionCode,
    district,
  });

  const results = schools
    .map((school) => analyzeGaps(school))
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
