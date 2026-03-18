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

  // 요인 1: 교원 1인당 학생 수 (가중치 25%)
  if (school.teacherStats?.studentsPerTeacher != null) {
    const spt = school.teacherStats.studentsPerTeacher;
    const score = Math.min(100, Math.max(0, ((spt - 10) / 15) * 100));
    const weight = 0.25;
    factors.push({
      factor: "교원 1인당 학생 수",
      weight,
      value: spt,
      description: `${spt}명 (전국 평균 대비 ${spt > 16 ? "높음" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 요인 2: 기간제 교원 비율 (가중치 20%)
  if (school.teacherStats?.tempTeacherRatio != null) {
    const ratio = school.teacherStats.tempTeacherRatio;
    const score = Math.min(100, Math.max(0, (ratio / 0.3) * 100));
    const weight = 0.2;
    factors.push({
      factor: "기간제 교원 비율",
      weight,
      value: ratio,
      description: `${(ratio * 100).toFixed(1)}% (${ratio > 0.15 ? "높음" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 요인 3: 학생 1인당 교육비 (가중치 15%, 역수)
  if (school.financeStats?.budgetPerStudent != null) {
    const bps = school.financeStats.budgetPerStudent;
    const score = Math.min(100, Math.max(0, ((5000000 - bps) / 3000000) * 100));
    const weight = 0.15;
    factors.push({
      factor: "학생 1인당 교육비",
      weight,
      value: bps,
      description: `${Math.round(bps).toLocaleString()}원 (${bps < 3000000 ? "낮음" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 요인 4: 방과후 프로그램 수 (가중치 15%, 역수)
  const programCount = school.afterschoolPrograms.length;
  {
    const score = Math.min(100, Math.max(0, ((5 - programCount) / 5) * 100));
    const weight = 0.15;
    factors.push({
      factor: "방과후 프로그램 수",
      weight,
      value: programCount,
      description: `${programCount}개 (${programCount < 3 ? "부족" : "적정"})`,
    });
    totalScore += score * weight;
    totalWeight += weight;
  }

  // 요인 5: 교원 성별 편중 (가중치 10%)
  if (school.teacherStats?.femaleTeachers != null && school.teacherStats?.maleTeachers != null) {
    const female = school.teacherStats.femaleTeachers;
    const male = school.teacherStats.maleTeachers;
    const total = female + male;
    if (total > 0) {
      const dominantRatio = Math.max(female, male) / total;
      // 90% 이상 한 성별이면 위험, 70% 이하면 양호
      const score = Math.min(100, Math.max(0, ((dominantRatio - 0.5) / 0.4) * 100));
      const weight = 0.1;
      factors.push({
        factor: "교원 성별 편중",
        weight,
        value: dominantRatio,
        description: `여 ${female}명/남 ${male}명 (${dominantRatio > 0.8 ? "편중" : "적정"})`,
      });
      totalScore += score * weight;
      totalWeight += weight;
    }
  }

  // 요인 6: 학급 과밀도 (가중치 10%)
  if (school.teacherStats?.currentClasses != null && school.teacherStats?.totalStudents != null) {
    const classes = school.teacherStats.currentClasses;
    const students = school.teacherStats.totalStudents;
    if (classes > 0) {
      const studentsPerClass = students / classes;
      // 35명 이상이면 위험, 20명 이하면 양호
      const score = Math.min(100, Math.max(0, ((studentsPerClass - 20) / 15) * 100));
      const weight = 0.1;
      factors.push({
        factor: "학급 과밀도",
        weight,
        value: studentsPerClass,
        description: `학급당 ${studentsPerClass.toFixed(1)}명 (${studentsPerClass > 30 ? "과밀" : "적정"})`,
      });
      totalScore += score * weight;
      totalWeight += weight;
    }
  }

  // 요인 7: 강사 의존도 (가중치 5%)
  if (school.teacherStats?.lecturerCount != null && school.teacherStats?.totalTeachers != null) {
    const lecturers = school.teacherStats.lecturerCount;
    const totalT = school.teacherStats.totalTeachers;
    if (totalT > 0) {
      const lecturerRatio = lecturers / totalT;
      // 20% 이상이면 위험, 5% 이하면 양호
      const score = Math.min(100, Math.max(0, (lecturerRatio / 0.2) * 100));
      const weight = 0.05;
      factors.push({
        factor: "강사 의존도",
        weight,
        value: lecturerRatio,
        description: `강사 ${lecturers}명/${totalT}명 (${lecturerRatio > 0.1 ? "높음" : "적정"})`,
      });
      totalScore += score * weight;
      totalWeight += weight;
    }
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

/** 요인별 점수 기여 정보 */
export interface FactorBreakdown {
  factor: string;
  value: string;
  rawScore: number;   // 개별 요인 점수 (0~100)
  weight: number;     // 가중치 (0~1)
  contribution: number; // 최종 점수 기여분 (rawScore * weight / totalWeight)
}

/**
 * 위험도 계산 (대시보드 목록용) — 요인별 점수 기여도 포함
 */
export function calculateRiskScoreFromRaw(school: {
  schoolCode: string;
  studentsPerTeacher: number | null;
  tempTeacherRatio: number | null;
  budgetPerStudent: number | null;
  programCount: number;
  femaleTeachers?: number | null;
  maleTeachers?: number | null;
  lecturerCount?: number | null;
  totalTeachers?: number | null;
  currentClasses?: number | null;
  authorizedClasses?: number | null;
  totalStudents?: number | null;
}): { schoolCode: string; score: number; level: RiskLevel; factors: FactorBreakdown[] } {
  let totalScore = 0;
  let totalWeight = 0;
  const factors: FactorBreakdown[] = [];

  // 요인 1: 교원1인당 학생수 (25%)
  if (school.studentsPerTeacher != null) {
    const spt = school.studentsPerTeacher;
    const rawScore = Math.min(100, Math.max(0, ((spt - 10) / 15) * 100));
    const weight = 0.25;
    factors.push({ factor: "교원1인당 학생수", value: `${spt.toFixed(1)}명`, rawScore: Math.round(rawScore), weight, contribution: 0 });
    totalScore += rawScore * weight;
    totalWeight += weight;
  }

  // 요인 2: 기간제교원 비율 (20%)
  if (school.tempTeacherRatio != null) {
    const ratio = school.tempTeacherRatio;
    const rawScore = Math.min(100, Math.max(0, (ratio / 0.3) * 100));
    const weight = 0.2;
    factors.push({ factor: "기간제교원 비율", value: `${(ratio * 100).toFixed(1)}%`, rawScore: Math.round(rawScore), weight, contribution: 0 });
    totalScore += rawScore * weight;
    totalWeight += weight;
  }

  // 요인 3: 학생1인당 교육비 (15%)
  if (school.budgetPerStudent != null) {
    const bps = school.budgetPerStudent;
    const rawScore = Math.min(100, Math.max(0, ((5000000 - bps) / 3000000) * 100));
    const weight = 0.15;
    factors.push({ factor: "학생1인당 교육비", value: `${Math.round(bps).toLocaleString()}원`, rawScore: Math.round(rawScore), weight, contribution: 0 });
    totalScore += rawScore * weight;
    totalWeight += weight;
  }

  // 요인 4: 방과후 프로그램 (15%)
  {
    const rawScore = Math.min(100, Math.max(0, ((5 - school.programCount) / 5) * 100));
    const weight = 0.15;
    factors.push({ factor: "방과후 프로그램", value: `${school.programCount}개`, rawScore: Math.round(rawScore), weight, contribution: 0 });
    totalScore += rawScore * weight;
    totalWeight += weight;
  }

  // 요인 5: 교원 성별 편중 (10%)
  if (school.femaleTeachers != null && school.maleTeachers != null) {
    const total = school.femaleTeachers + school.maleTeachers;
    if (total > 0) {
      const dominantRatio = Math.max(school.femaleTeachers, school.maleTeachers) / total;
      const rawScore = Math.min(100, Math.max(0, ((dominantRatio - 0.5) / 0.4) * 100));
      const weight = 0.1;
      factors.push({ factor: "교원 성별 편중", value: `여${school.femaleTeachers}/남${school.maleTeachers}`, rawScore: Math.round(rawScore), weight, contribution: 0 });
      totalScore += rawScore * weight;
      totalWeight += weight;
    }
  }

  // 요인 6: 학급 과밀도 (10%)
  if (school.currentClasses != null && school.totalStudents != null && school.currentClasses > 0) {
    const studentsPerClass = school.totalStudents / school.currentClasses;
    const rawScore = Math.min(100, Math.max(0, ((studentsPerClass - 20) / 15) * 100));
    const weight = 0.1;
    factors.push({ factor: "학급 과밀도", value: `${studentsPerClass.toFixed(1)}명/반`, rawScore: Math.round(rawScore), weight, contribution: 0 });
    totalScore += rawScore * weight;
    totalWeight += weight;
  }

  // 요인 7: 강사 의존도 (5%)
  if (school.lecturerCount != null && school.totalTeachers != null && school.totalTeachers > 0) {
    const lecturerRatio = school.lecturerCount / school.totalTeachers;
    const rawScore = Math.min(100, Math.max(0, (lecturerRatio / 0.2) * 100));
    const weight = 0.05;
    factors.push({ factor: "강사 의존도", value: `${school.lecturerCount}명`, rawScore: Math.round(rawScore), weight, contribution: 0 });
    totalScore += rawScore * weight;
    totalWeight += weight;
  }

  const finalScore = totalWeight > 0 ? Math.min(100, Math.max(0, Math.round(totalScore / totalWeight))) : 50;

  for (const f of factors) {
    f.contribution = totalWeight > 0 ? Math.round((f.rawScore * f.weight) / totalWeight) : 0;
  }

  return { schoolCode: school.schoolCode, score: finalScore, level: scoreToLevel(finalScore), factors };
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
