import { getSchoolRiskData } from "@/lib/services/school-data";
import { calculateRiskScoreFromRaw, type FactorBreakdown } from "@/lib/analysis/early-alert";
import { REGION_NAMES } from "@/lib/constants/regions";
import { batchGenerateWithGemini, generateWithGemini } from "@/lib/ai/gemini";
import {
  buildBatchRiskNarrativePrompt,
  buildSchoolRiskContext,
  buildRegionSummaryPrompt,
} from "@/lib/ai/prompts-gemini";
import { createSSEStream } from "@/lib/sse";

/**
 * GET /api/early-alert/stream?region=B10&district=...
 * SSE 스트림으로 실시간 진행도 전송
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region") ?? undefined;
  const district = searchParams.get("district") ?? undefined;

  const sse = createSSEStream();

  // 비동기로 처리 시작
  (async () => {
    try {
      // 1단계: 학교 데이터 조회
      sse.progress(5, "학교 데이터를 조회하고 있습니다...");
      const { data: schools, source } = await getSchoolRiskData({ region: regionCode, district });

      // 2단계: 위험도 계산
      sse.progress(20, `${schools.length}개 학교의 위험도를 계산하고 있습니다...`);
      const allScores = schools.map((school) => ({
        ...calculateRiskScoreFromRaw(school),
        schoolName: school.schoolName,
        nearbyAcademyCount: school.nearbyAcademyCount ?? null,
      }));

      // 집계
      const counts = { safe: 0, caution: 0, warning: 0, danger: 0 };
      let totalScore = 0;
      for (const s of allScores) {
        counts[s.level]++;
        totalScore += s.score;
      }
      const avgScore = allScores.length > 0 ? Math.round(totalScore / allScores.length) : 0;

      const topRisk = allScores
        .filter((s) => s.level === "danger" || s.level === "warning")
        .sort((a, b) => b.score - a.score)
        .slice(0, 30)
        .map((s) => ({
          schoolCode: s.schoolCode,
          schoolName: s.schoolName,
          score: s.score,
          level: s.level,
          factors: s.factors,
          nearbyAcademyCount: s.nearbyAcademyCount,
        }));

      sse.progress(35, `위험도 계산 완료 — 위험/경고 ${topRisk.length}개교 발견`);

      // 3단계: AI 해설 생성
      let narratives: Record<string, string> = {};
      let regionSummary = "";

      if (topRisk.length > 0) {
        sse.progress(40, `AI가 ${topRisk.length}개 학교의 위험 요인을 분석하고 있습니다...`);

        try {
          const narrativeMap = await batchGenerateWithGemini({
            items: topRisk.map((s) => ({
              key: s.schoolCode,
              context: buildSchoolRiskContext({
                schoolCode: s.schoolCode,
                schoolName: s.schoolName,
                score: s.score,
                level: s.level,
                factors: s.factors?.map((f: FactorBreakdown) => ({
                  factor: f.factor ?? "",
                  value: typeof f.value === "number" ? f.value : parseFloat(f.value) || 0,
                  description: f.description ?? f.value ?? "",
                  weight: f.weight ?? 0,
                })) ?? [],
                nearbyAcademyCount: s.nearbyAcademyCount,
              }),
            })),
            reportType: "risk-narrative",
            promptBuilder: buildBatchRiskNarrativePrompt,
            model: "flash",
          });
          narratives = Object.fromEntries(narrativeMap);

          sse.progress(70, "학교별 AI 해설 생성 완료 — 지역 패턴을 분석하고 있습니다...");

          // 4단계: 지역 요약
          const regionName = REGION_NAMES[regionCode ?? ""] ?? "전체";
          const regionResult = await generateWithGemini({
            prompt: buildRegionSummaryPrompt(
              regionName,
              allScores.slice(0, 30).map((s) =>
                `${s.schoolName}: 위험도 ${s.score}점 (${s.level})`
              )
            ),
            model: "flash",
            cacheKey: {
              reportType: "region-summary",
              regionCode: regionCode ?? "ALL",
            },
          });
          regionSummary = regionResult.text;

          sse.progress(90, "지역 인사이트 생성 완료 — 결과를 정리하고 있습니다...");
        } catch (error) {
          console.error("AI 해설 생성 실패:", error);
          sse.progress(90, "AI 해설 일부 실패 — 기본 데이터로 결과를 정리합니다...");
        }
      } else {
        sse.progress(90, "경고 이상 학교 없음 — 결과를 정리하고 있습니다...");
      }

      // 완료
      sse.complete({
        data: { total: allScores.length, counts, avgScore, topRisk },
        narratives,
        regionSummary,
        meta: { source: `학교알리미 (${source})`, total: allScores.length },
      });
    } catch (error) {
      console.error("[early-alert/stream] 에러:", error);
      sse.error("데이터 처리 중 오류가 발생했습니다.");
    }
  })();

  return sse.toResponse();
}
