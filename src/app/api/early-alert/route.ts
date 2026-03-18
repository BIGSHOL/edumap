import { NextResponse } from "next/server";
import { getSchoolDetail, getSchoolRiskData } from "@/lib/services/school-data";
import { calculateRiskScore, calculateRiskScoreFromRaw } from "@/lib/analysis/early-alert";
import { sourceLabel } from "@/lib/services/utils";
import { REGION_NAMES } from "@/lib/constants/regions";
import { batchGenerateWithGemini, generateWithGemini } from "@/lib/ai/gemini";
import {
  buildBatchRiskNarrativePrompt,
  buildSchoolRiskContext,
  buildRegionSummaryPrompt,
} from "@/lib/ai/prompts-gemini";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolCode = searchParams.get("schoolCode");
  const regionCode = searchParams.get("region") ?? undefined;
  const district = searchParams.get("district") ?? undefined;
  const withNarrative = searchParams.get("narrative") !== "false";

  // 개별 학교 위험도 조회 (상세 포함, RiskScore DB 캐싱)
  if (schoolCode) {
    // RiskScore 캐시 확인 (6시간 이내)
    try {
      const cached = await prisma.riskScore.findUnique({
        where: { idx_risk_school_year: { schoolCode, year: 2024 } },
      });
      if (cached && (Date.now() - cached.calculatedAt.getTime()) < 6 * 60 * 60 * 1000) {
        return NextResponse.json({
          data: {
            schoolCode: cached.schoolCode,
            year: cached.year,
            score: cached.score,
            level: cached.score <= 30 ? "safe" : cached.score <= 50 ? "caution" : cached.score <= 70 ? "warning" : "danger",
            contributingFactors: cached.contributingFactors ?? [],
          },
          meta: { source: "DB 캐시 (RiskScore)" },
        });
      }
    } catch {
      // DB 미연결
    }

    const { data, source } = await getSchoolDetail(schoolCode);
    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "학교를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const riskScore = calculateRiskScore(data);

    // RiskScore DB에 upsert (비동기)
    prisma.riskScore.upsert({
      where: { idx_risk_school_year: { schoolCode, year: riskScore.year } },
      update: {
        score: riskScore.score,
        contributingFactors: riskScore.contributingFactors as unknown as object,
        calculatedAt: new Date(),
      },
      create: {
        schoolCode,
        year: riskScore.year,
        score: riskScore.score,
        contributingFactors: riskScore.contributingFactors as unknown as object,
      },
    }).catch(() => {});

    return NextResponse.json({
      data: { ...riskScore, schoolName: data.schoolName },
      meta: { source: sourceLabel(source, "분석 결과") },
    });
  }

  // 전체/지역 위험도 — 서버에서 집계 후 요약만 전송
  const { data: schools, source } = await getSchoolRiskData({ region: regionCode, district });
  const allScores = schools.map((school) => ({
    ...calculateRiskScoreFromRaw(school),
    schoolName: school.schoolName,
  }));

  // 집계
  const counts = { safe: 0, caution: 0, warning: 0, danger: 0 };
  let totalScore = 0;
  for (const s of allScores) {
    counts[s.level]++;
    totalScore += s.score;
  }
  const avgScore = allScores.length > 0 ? Math.round(totalScore / allScores.length) : 0;

  // 상위 위험 학교 (danger + warning, 최대 30개) — 요인별 점수 기여도 포함
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
    }));

  // --- AI 해설 (Gemini 2.5 Flash) ---
  let narratives: Record<string, string> = {};
  let regionSummary = "";

  if (withNarrative && topRisk.length > 0) {
    try {
      // 상위 위험 학교 배치 해설
      const narrativeMap = await batchGenerateWithGemini({
        items: topRisk.map((s) => ({
          key: s.schoolCode,
          context: buildSchoolRiskContext({
            schoolCode: s.schoolCode,
            schoolName: s.schoolName,
            score: s.score,
            level: s.level,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            factors: s.factors?.map((f: any) => ({
              factor: f.factor ?? "",
              value: typeof f.value === "number" ? f.value : parseFloat(f.value) || 0,
              description: f.description ?? f.value ?? "",
              weight: f.weight ?? 0,
            })) ?? [],
          }),
        })),
        reportType: "risk-narrative",
        promptBuilder: buildBatchRiskNarrativePrompt,
        model: "flash",
      });
      narratives = Object.fromEntries(narrativeMap);

      // 지역 패턴 요약
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
    } catch (error) {
      console.error("AI 해설 생성 실패:", error);
    }
  }

  const response = NextResponse.json({
    data: {
      total: allScores.length,
      counts,
      avgScore,
      topRisk,
    },
    narratives,
    regionSummary,
    meta: { source: sourceLabel(source, "분석 결과") },
  });
  response.headers.set("Cache-Control", "public, max-age=300");
  return response;
}
