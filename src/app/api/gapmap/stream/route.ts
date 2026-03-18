import { getSchoolDetails } from "@/lib/services/school-data";
import { analyzeGaps } from "@/lib/analysis/gapmap";
import { generateWithClaude } from "@/lib/ai/gemini";
import { buildGapSuggestionPrompt, buildGapSchoolContext } from "@/lib/ai/prompts-gemini";
import { createSSEStream } from "@/lib/sse";

/**
 * GET /api/gapmap/stream?schoolCode=XXX
 * SSE 스트림으로 GapMap AI 개선 제안 생성 진행도 전송
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolCode = searchParams.get("schoolCode") ?? undefined;

  if (!schoolCode) {
    return new Response("schoolCode is required", { status: 400 });
  }

  const sse = createSSEStream();

  (async () => {
    try {
      sse.progress(10, "학교 상세 데이터를 조회하고 있습니다...");

      const { data: schools } = await getSchoolDetails({ schoolCode });
      if (schools.length === 0) {
        sse.error("학교를 찾을 수 없습니다.");
        return;
      }

      sse.progress(25, "방과후 프로그램 현황을 분석하고 있습니다...");

      const result = analyzeGaps(schools[0]);

      sse.progress(40, `공백 ${result.totalGaps}건 발견 — AI 개선 방안을 준비하고 있습니다...`);

      let aiSuggestion = "";
      if (result.totalGaps > 0) {
        sse.progress(50, "Claude AI가 맞춤형 개선 방안을 생성하고 있습니다...");

        try {
          const context = buildGapSchoolContext(result);
          const aiResult = await generateWithClaude({
            prompt: buildGapSuggestionPrompt(context),
            cacheKey: { reportType: "gap-suggestion", schoolCode },
          });
          aiSuggestion = aiResult.text;

          if (aiResult.cached) {
            sse.progress(95, "캐시된 AI 제안을 불러왔습니다...");
          } else {
            sse.progress(90, "AI 개선 제안 생성 완료...");
          }
        } catch {
          sse.progress(90, "AI 제안 생성에 실패했습니다 — 기본 분석 결과를 반환합니다...");
        }
      } else {
        sse.progress(90, "공백이 없어 AI 제안을 건너뜁니다...");
      }

      sse.complete({
        data: [result],
        aiSuggestion,
      });
    } catch (error) {
      console.error("[gapmap/stream] 에러:", error);
      sse.error("공백 분석 중 오류가 발생했습니다.");
    }
  })();

  return sse.toResponse();
}
