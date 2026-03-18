import { getSchoolRiskData } from "@/lib/services/school-data";
import { REGION_NAMES } from "@/lib/constants/regions";
import { generateWithClaude } from "@/lib/ai/gemini";
import { buildPolicyPriorityPrompt, buildSchoolRiskContext } from "@/lib/ai/prompts-gemini";
import { calculateRiskScoreFromRaw } from "@/lib/analysis/early-alert";
import { createSSEStream } from "@/lib/sse";

/**
 * GET /api/ai-insight/stream?type=policy-priority&region=B10
 * SSE 스트림으로 정책 개입 우선순위 생성 진행도 전송
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region") ?? "B10";

  const sse = createSSEStream();

  (async () => {
    try {
      sse.progress(5, "지역 학교 데이터를 조회하고 있습니다...");

      const { data: schools } = await getSchoolRiskData({ region: regionCode });
      const allScores = schools
        .map((school) => ({
          ...calculateRiskScoreFromRaw(school),
          schoolName: school.schoolName,
        }))
        .sort((a, b) => b.score - a.score);

      sse.progress(20, `${schools.length}개 학교의 위험도를 분석했습니다...`);

      const topRisk = allScores
        .filter((s) => s.level === "danger" || s.level === "warning")
        .slice(0, 15);

      if (topRisk.length === 0) {
        sse.complete({ data: "이 지역에 경고 이상 학교가 없어 정책 개입 우선순위를 생성할 수 없습니다." });
        return;
      }

      sse.progress(35, `위험/경고 학교 ${topRisk.length}개 — 정책 분석 프롬프트를 준비하고 있습니다...`);

      const regionName = REGION_NAMES[regionCode] ?? "전체";
      const contexts = topRisk.map((s) =>
        buildSchoolRiskContext({
          schoolCode: s.schoolCode,
          schoolName: s.schoolName,
          score: s.score,
          level: s.level,
          factors: [],
        })
      );

      sse.progress(45, "Claude AI가 정책 개입 우선순위를 분석하고 있습니다...");

      const result = await generateWithClaude({
        prompt: buildPolicyPriorityPrompt(regionName, contexts),
        cacheKey: { reportType: "policy-priority", regionCode },
      });

      if (result.cached) {
        sse.progress(95, "캐시된 분석 결과를 불러왔습니다...");
      } else {
        sse.progress(90, "AI 분석 완료 — 결과를 정리하고 있습니다...");
      }

      sse.complete({ data: result.text, cached: result.cached });
    } catch (error) {
      console.error("[ai-insight/stream] 에러:", error);
      sse.error("정책 분석 중 오류가 발생했습니다.");
    }
  })();

  return sse.toResponse();
}
