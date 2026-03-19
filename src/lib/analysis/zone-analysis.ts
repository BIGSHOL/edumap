/**
 * ZoneAnalysis — 학구 단위 종합 분석
 *
 * 목적: 한 학구(동네)에 배정되는 학교들의 평균 여건을 종합 분석
 *
 * 분석 관점:
 * 1. 학구 내 학교들의 평균 위험도
 * 2. 학구 내 학교들의 평균 학습자원 커버리지
 * 3. 학구 내에서 가장 취약한 요인 식별
 * 4. 학교 간 편차 (같은 학구 내 학교 격차)
 */

import type { SchoolDetail } from "@/lib/api/contracts/schools";
import type { RiskLevel } from "@/types/report";
import { calculateRiskScore, scoreToLevel } from "./early-alert";
import { analyzeGaps } from "./gapmap";

export interface ZoneAnalysisResult {
  zoneId: string;
  zoneName: string; // 한글 학구명
  schoolCount: number;
  schools: Array<{
    schoolCode: string;
    schoolName: string;
    schoolType: "elementary" | "middle" | "high";
    riskScore: number;
    riskLevel: RiskLevel;
    coverageRate: number;
    gapCount: number;
  }>;
  // 학구 평균 지표
  avgRiskScore: number;
  avgCoverageRate: number;
  avgStudentsPerTeacher: number | null;
  avgBudgetPerStudent: number | null;
  worstFactor: string | null;
  overallLevel: RiskLevel;
  // 학구 내 편차
  riskScoreVariance: number;
  // 교육지원청 정보
  eduSupportCode: string | null;
  eduSupportName: string | null;
}

/**
 * 학구 단위 종합 분석
 *
 * 기존 calculateRiskScore + analyzeGaps를 조합하여
 * 학구 평균 산출 + 학교 간 편차 계산
 */
export function analyzeZone(
  zoneId: string,
  schools: SchoolDetail[],
  eduSupportInfo?: { code: string; name: string }
): ZoneAnalysisResult {
  const zoneName = buildZoneName(zoneId, schools, eduSupportInfo);

  if (schools.length === 0) {
    return {
      zoneId,
      zoneName,
      schoolCount: 0,
      schools: [],
      avgRiskScore: 50,
      avgCoverageRate: 0,
      avgStudentsPerTeacher: null,
      avgBudgetPerStudent: null,
      worstFactor: null,
      overallLevel: "caution",
      riskScoreVariance: 0,
      eduSupportCode: eduSupportInfo?.code ?? null,
      eduSupportName: eduSupportInfo?.name ?? null,
    };
  }

  // 1. 개별 학교 분석
  const schoolResults = schools.map((school) => {
    const risk = calculateRiskScore(school);
    const gaps = analyzeGaps(school);
    return {
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      schoolType: school.schoolType,
      riskScore: risk.score,
      riskLevel: risk.level,
      coverageRate: gaps.coverageRate,
      gapCount: gaps.totalGaps,
      contributingFactors: risk.contributingFactors,
      studentsPerTeacher: school.teacherStats?.studentsPerTeacher ?? null,
      budgetPerStudent: school.financeStats?.budgetPerStudent ?? null,
    };
  });

  // 2. 학구 평균
  const avgRiskScore = Math.round(
    schoolResults.reduce((s, r) => s + r.riskScore, 0) / schoolResults.length
  );
  const avgCoverageRate = Math.round(
    schoolResults.reduce((s, r) => s + r.coverageRate, 0) / schoolResults.length
  );

  // 3. 교원/재정 평균
  const sptValues = schoolResults
    .map((r) => r.studentsPerTeacher)
    .filter((v): v is number => v != null);
  const bpsValues = schoolResults
    .map((r) => r.budgetPerStudent)
    .filter((v): v is number => v != null);

  const avgStudentsPerTeacher =
    sptValues.length > 0
      ? Math.round((sptValues.reduce((a, b) => a + b, 0) / sptValues.length) * 10) / 10
      : null;
  const avgBudgetPerStudent =
    bpsValues.length > 0
      ? Math.round(bpsValues.reduce((a, b) => a + b, 0) / bpsValues.length)
      : null;

  // 4. 가장 빈번한 위험 요인
  const factorCounts = new Map<string, number>();
  for (const r of schoolResults) {
    if (r.contributingFactors.length > 0) {
      const worst = r.contributingFactors[0]; // 가중치 순 정렬됨
      factorCounts.set(worst.factor, (factorCounts.get(worst.factor) ?? 0) + 1);
    }
  }
  const worstFactor =
    [...factorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 5. 학구 내 편차 (분산)
  const variance =
    schoolResults.length > 1
      ? Math.round(
          schoolResults.reduce((s, r) => s + (r.riskScore - avgRiskScore) ** 2, 0) /
            schoolResults.length
        )
      : 0;

  return {
    zoneId,
    zoneName,
    schoolCount: schoolResults.length,
    schools: schoolResults.map((r) => ({
      schoolCode: r.schoolCode,
      schoolName: r.schoolName,
      schoolType: r.schoolType,
      riskScore: r.riskScore,
      riskLevel: r.riskLevel,
      coverageRate: r.coverageRate,
      gapCount: r.gapCount,
    })),
    avgRiskScore,
    avgCoverageRate,
    avgStudentsPerTeacher,
    avgBudgetPerStudent,
    worstFactor,
    overallLevel: scoreToLevel(avgRiskScore),
    riskScoreVariance: variance,
    eduSupportCode: eduSupportInfo?.code ?? null,
    eduSupportName: eduSupportInfo?.name ?? null,
  };
}

/**
 * 학구 한글명 생성
 *
 * 우선순위:
 * 1. 소속 학교명 기반: "종로 서울대부설초·경복중 학구"
 * 2. 교육지원청 기반: "동부교육지원청 학구"
 * 3. 학구ID fallback
 */
function buildZoneName(
  zoneId: string,
  schools: SchoolDetail[],
  eduSupportInfo?: { code: string; name: string }
): string {
  if (schools.length > 0) {
    // 학교명을 짧게 축약 (접미사 제거)
    const shortNames = schools.map((s) =>
      s.schoolName
        .replace(/초등학교$/, "초")
        .replace(/중학교$/, "중")
        .replace(/고등학교$/, "고")
    );

    // 2개까지만 표시
    const display =
      shortNames.length <= 2
        ? shortNames.join("·")
        : `${shortNames[0]} 외 ${shortNames.length - 1}교`;

    // 시군구 추출
    const district = schools[0].district;
    if (district) {
      return `${district} ${display} 학구`;
    }
    return `${display} 학구`;
  }

  if (eduSupportInfo?.name) {
    // "서울특별시동부교육지원청" → "동부" 추출
    const short = eduSupportInfo.name
      .replace(/.*시|.*도|.*청$/, "")
      .replace(/교육지원$/, "");
    return short ? `${short} 학구` : `${eduSupportInfo.name} 학구`;
  }

  return `학구 ${zoneId}`;
}
