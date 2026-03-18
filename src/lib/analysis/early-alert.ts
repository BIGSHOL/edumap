import type { RiskLevel, ContributingFactor, RiskScoreInfo } from "@/types/report";
import type { SchoolDetail } from "@/lib/api/contracts/schools";

/**
 * 위험도 스코어링 (0~100)
 *
 * 입력: 교원 여건 + 재정 수준 + 방과후 프로그램 수
 * 출력: 위험도 스코어 + 주요 기여 요인 랭킹
 */
export function calculateRiskScore(school: SchoolDetail): RiskScoreInfo {
  const factors: ContributingFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // 요인 1: 교원 1인당 학생 수 (가중치 35%)
  if (school.teacherStats?.studentsPerTeacher != null) {
    const spt = school.teacherStats.studentsPerTeacher;
    // 전국 평균 약 16명 기준, 25명 이상이면 위험
    const score = Math.min(100, Math.max(0, ((spt - 10) / 15) * 100));
    const weight = 0.35;
    factors.push({
      factor: "교원 1인당 학생 수", // 교원1인당학생수
      weight,
      value: spt,
      description: `${spt}명 (전국 평균 대비 ${spt > 16 ? "높음" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 요인 2: 기간제 교원 비율 (가중치 25%)
  if (school.teacherStats?.tempTeacherRatio != null) {
    const ratio = school.teacherStats.tempTeacherRatio;
    // 10% 이하면 양호, 30% 이상이면 위험
    const score = Math.min(100, Math.max(0, (ratio / 0.3) * 100));
    const weight = 0.25;
    factors.push({
      factor: "기간제 교원 비율", // 기간제교원비율
      weight,
      value: ratio,
      description: `${(ratio * 100).toFixed(1)}% (${ratio > 0.15 ? "높음" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 요인 3: 학생 1인당 교육비 (가중치 20%, 역수)
  if (school.financeStats?.budgetPerStudent != null) {
    const bps = school.financeStats.budgetPerStudent;
    // 500만원 이상이면 양호, 200만원 이하면 위험
    const score = Math.min(100, Math.max(0, ((5000000 - bps) / 3000000) * 100));
    const weight = 0.2;
    factors.push({
      factor: "학생 1인당 교육비", // 학생1인당교육비
      weight,
      value: bps,
      description: `${Math.round(bps).toLocaleString()}원 (${bps < 3000000 ? "낮음" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 요인 4: 방과후 프로그램 수 (가중치 20%, 역수)
  const programCount = school.afterschoolPrograms.length;
  {
    // 5개 이상이면 양호, 2개 이하면 위험
    const score = Math.min(100, Math.max(0, ((5 - programCount) / 5) * 100));
    const weight = 0.2;
    factors.push({
      factor: "방과후 프로그램 수",
      weight,
      value: programCount,
      description: `${programCount}개 (${programCount < 3 ? "부족" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 가중치 합으로 정규화
  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  const clampedScore = Math.min(100, Math.max(0, finalScore));

  // 기여 요인을 가중치 * 개별스코어 순으로 정렬
  factors.sort((a, b) => b.weight - a.weight);

  return {
    schoolCode: school.schoolCode,
    year: school.teacherStats?.year ?? new Date().getFullYear(),
    score: clampedScore,
    level: scoreToLevel(clampedScore),
    contributingFactors: factors,
  };
}

/** 스코어를 위험도 수준으로 변환 */
export function scoreToLevel(score: number): RiskLevel {
  if (score <= 30) return "safe";
  if (score <= 50) return "caution";
  if (score <= 70) return "warning";
  return "danger";
}

/** 위험도 수준 한글 라벨 */
export function levelToLabel(level: RiskLevel): string {
  switch (level) {
    case "safe":
      return "안전";
    case "caution":
      return "주의";
    case "warning":
      return "경고";
    case "danger":
      return "위험";
  }
}
