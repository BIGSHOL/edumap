import { NextResponse } from "next/server";
import { getSchoolRiskData } from "@/lib/services/school-data";
import { REGION_NAMES } from "@/lib/constants/regions";
import {
  generateWithGemini,
  generateWithClaude,
  batchGenerateWithGemini,
} from "@/lib/ai/gemini";
import {
  buildComparisonPrompt,
  buildComparisonContext,
  buildAnomalyDetectionPrompt,
  buildAnomalyContext,
  buildSmartSearchPrompt,
  buildPolicyPriorityPrompt,
  buildSchoolRiskContext,
} from "@/lib/ai/prompts-gemini";
import { calculateRiskScoreFromRaw } from "@/lib/analysis/early-alert";
import { getAcademyStats } from "@/lib/services/academy-data";

/**
 * AI 인사이트 통합 API
 *
 * GET /api/ai-insight?type=comparison&schoolCode=XXX&region=B10
 * GET /api/ai-insight?type=anomaly&region=B10
 * GET /api/ai-insight?type=smart-search&q=서울에서 위험한 초등학교
 * GET /api/ai-insight?type=policy-priority&region=B10
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    switch (type) {
      case "comparison":
        return handleComparison(searchParams);
      case "anomaly":
        return handleAnomaly(searchParams);
      case "smart-search":
        return handleSmartSearch(searchParams);
      case "policy-priority":
        return handlePolicyPriority(searchParams);
      default:
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "type 파라미터가 필요합니다 (comparison, anomaly, smart-search, policy-priority)" } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("AI 인사이트 생성 실패:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "AI 인사이트 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

/** 학교 비교 문장 — Gemini 2.5 Flash-Lite */
async function handleComparison(params: URLSearchParams) {
  const schoolCode = params.get("schoolCode");
  const regionCode = params.get("region") ?? "B10";

  // 학교 + 학원 데이터 병렬 조회
  const [{ data: schools }, { data: academyData }] = await Promise.all([
    getSchoolRiskData({ region: regionCode }),
    getAcademyStats({ regionCode }),
  ]);
  if (schools.length === 0) {
    return NextResponse.json({ data: {} });
  }

  // 시군구별 학원 수 맵
  const academyMap = new Map(academyData.map((a) => [a.district, a.totalAcademies]));

  // 지역 평균 계산
  const avg = {
    studentsPerTeacher: 0,
    tempTeacherRatio: 0,
    budgetPerStudent: 0,
    programCount: 0,
  };
  let count = { spt: 0, ttr: 0, bps: 0, pc: 0 };
  for (const s of schools) {
    if (s.studentsPerTeacher != null) { avg.studentsPerTeacher += s.studentsPerTeacher; count.spt++; }
    if (s.tempTeacherRatio != null) { avg.tempTeacherRatio += s.tempTeacherRatio; count.ttr++; }
    if (s.budgetPerStudent != null) { avg.budgetPerStudent += s.budgetPerStudent; count.bps++; }
    avg.programCount += s.programCount; count.pc++;
  }
  const totalAcademySum = academyData.reduce((s, a) => s + a.totalAcademies, 0);
  const regionAvg = {
    studentsPerTeacher: count.spt > 0 ? Math.round((avg.studentsPerTeacher / count.spt) * 10) / 10 : 16,
    tempTeacherRatio: count.ttr > 0 ? avg.tempTeacherRatio / count.ttr : 0.15,
    budgetPerStudent: count.bps > 0 ? avg.budgetPerStudent / count.bps : 3500000,
    programCount: count.pc > 0 ? Math.round(avg.programCount / count.pc) : 5,
    academyCount: academyData.length > 0 ? Math.round(totalAcademySum / academyData.length) : 0,
  };

  // 특정 학교 또는 상위 10개
  const targets = schoolCode
    ? schools.filter((s) => s.schoolCode === schoolCode)
    : schools.slice(0, 10);

  const result = await batchGenerateWithGemini({
    items: targets.map((s) => ({
      key: s.schoolCode,
      context: buildComparisonContext({
        ...s,
        nearbyAcademyCount: s.district ? (academyMap.get(s.district) ?? null) : null,
        regionAvg,
      }),
    })),
    reportType: "comparison",
    promptBuilder: buildComparisonPrompt,
    model: "flash-lite",
  });

  return NextResponse.json({ data: Object.fromEntries(result) });
}

/** 데이터 이상치 탐지 — Gemini 2.5 Flash-Lite */
async function handleAnomaly(params: URLSearchParams) {
  const regionCode = params.get("region") ?? "B10";

  const { data: schools } = await getSchoolRiskData({ region: regionCode });
  if (schools.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const result = await batchGenerateWithGemini({
    items: schools.slice(0, 50).map((s) => ({
      key: s.schoolCode,
      context: buildAnomalyContext(s),
    })),
    reportType: "anomaly",
    promptBuilder: buildAnomalyDetectionPrompt,
    model: "flash-lite",
  });

  return NextResponse.json({ data: Object.fromEntries(result) });
}

/** 스마트 검색 — Gemini 2.5 Flash */
async function handleSmartSearch(params: URLSearchParams) {
  const query = params.get("q")?.trim();
  if (!query) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "검색어(q)가 필요합니다." } },
      { status: 400 }
    );
  }

  const result = await generateWithGemini({
    prompt: buildSmartSearchPrompt(query),
    model: "flash",
    cacheKey: {
      reportType: "smart-search",
      schoolCode: query.slice(0, 50), // 검색어를 키로 사용
    },
    maxTokens: 256,
  });

  // JSON 파싱
  let filters: Record<string, string> = {};
  try {
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : result.text.trim();
    filters = JSON.parse(jsonStr);
  } catch {
    // 파싱 실패 시 학교명 검색으로 fallback
    filters = { schoolName: query };
  }

  return NextResponse.json({ data: filters, cached: result.cached });
}

/** 정책 개입 우선순위 — Claude Sonnet */
async function handlePolicyPriority(params: URLSearchParams) {
  const regionCode = params.get("region") ?? "B10";

  const [{ data: schools }, { data: academyData }] = await Promise.all([
    getSchoolRiskData({ region: regionCode }),
    getAcademyStats({ regionCode }),
  ]);
  const academyMap = new Map(academyData.map((a) => [a.district, a.totalAcademies]));

  const allScores = schools
    .map((school) => ({
      ...calculateRiskScoreFromRaw(school),
      schoolName: school.schoolName,
      district: school.district,
    }))
    .sort((a, b) => b.score - a.score);

  const topRisk = allScores.filter((s) => s.level === "danger" || s.level === "warning").slice(0, 15);
  if (topRisk.length === 0) {
    return NextResponse.json({ data: "이 지역에 경고 이상 학교가 없어 정책 개입 우선순위를 생성할 수 없습니다." });
  }

  const regionName = REGION_NAMES[regionCode] ?? "전체";
  const contexts = topRisk.map((s) =>
    buildSchoolRiskContext({
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
      nearbyAcademyCount: s.district ? (academyMap.get(s.district) ?? null) : null,
    })
  );

  const result = await generateWithClaude({
    prompt: buildPolicyPriorityPrompt(regionName, contexts),
    cacheKey: { reportType: "policy-priority", regionCode },
  });

  return NextResponse.json({ data: result.text, cached: result.cached });
}

