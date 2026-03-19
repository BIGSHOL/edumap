import type { SchoolDetail } from "@/lib/api/contracts/schools";
import type { AcademyStatsData } from "@/lib/services/academy-data";

/**
 * GapMap — 학습자원 공백 분석
 *
 * 목적: 특정 학교/지역의 구조적 학습자원 공백을 식별하고 보완 경로를 제안
 *
 * 분석 관점:
 * 1. 방과후 프로그램 카테고리 커버리지
 * 2. 교원 여건 대비 프로그램 부족
 * 3. 재정 수준 대비 학습자원 부족
 */

/** 방과후 프로그램 기대 카테고리 */
export const EXPECTED_CATEGORIES = [
  { id: "academic", label: "학술/교과" },
  { id: "arts", label: "예술 (음악/미술)" },
  { id: "sports", label: "체육/스포츠" },
  { id: "technology", label: "기술/코딩" },
  { id: "language", label: "외국어" },
] as const;

export type GapCategory = (typeof EXPECTED_CATEGORIES)[number]["id"];

/** 공백 유형 */
export type GapType = "missing_category" | "low_enrollment" | "understaffed" | "underfunded" | "education_desert";

/** 개별 공백 항목 */
export interface GapItem {
  type: GapType;
  category?: GapCategory;
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
}

/** GapMap 분석 결과 */
export interface GapAnalysisResult {
  schoolCode: string;
  schoolName: string;
  totalGaps: number;
  gaps: GapItem[];
  coverageRate: number; // 0~100, 카테고리 커버리지
  overallSeverity: "low" | "medium" | "high";
  academySummary?: {
    totalAcademies: number;
    academyByCategory: Record<string, number>; // GapCategory별 학원 수
    hasComplement: boolean; // 학원 보완 가능 여부
  };
}

/** 프로그램 subject에서 카테고리 추론 */
export function inferCategory(subject: string, category: string | null): GapCategory {
  if (category === "academic") return "academic";
  if (category === "arts") return "arts";
  if (category === "sports") return "sports";
  if (category === "technology") return "technology";
  if (category === "language") return "language";

  const s = subject.toLowerCase();
  if (s.includes("영어") || s.includes("일본어") || s.includes("중국어") || s.includes("외국어")) return "language";
  if (s.includes("코딩") || s.includes("로봇") || s.includes("sw") || s.includes("프로그래밍") || s.includes("컴퓨터")) return "technology";
  if (s.includes("축구") || s.includes("농구") || s.includes("체육") || s.includes("수영") || s.includes("태권도") || s.includes("스포츠")) return "sports";
  if (s.includes("미술") || s.includes("음악") || s.includes("피아노") || s.includes("바이올린") || s.includes("그림") || s.includes("합창")) return "arts";
  return "academic";
}

/**
 * 교습영역별 학원 수를 GapCategory별 학원 수로 변환
 */
function getRealmCountForCategory(
  academyByRealm: Record<string, number>,
  category: GapCategory
): number {
  const realmMap: Record<GapCategory, string[]> = {
    academic: ["입시.검정 및 보습", "인문사회"],
    arts: ["예능(음악)", "예능(미술)", "예능(기타)"],
    sports: ["체육"],
    technology: ["직업기술"],
    language: ["국제화"],
  };
  const realms = realmMap[category] ?? [];
  return realms.reduce((sum, r) => sum + (academyByRealm[r] ?? 0), 0);
}

/**
 * 학교의 학습자원 공백을 분석합니다.
 * @param academyStats 주변 학원 통계 (선택, 있으면 보완 가능 여부 판단)
 */
export function analyzeGaps(
  school: SchoolDetail,
  academyStats?: AcademyStatsData
): GapAnalysisResult {
  const gaps: GapItem[] = [];

  // 1. 방과후 프로그램 카테고리 커버리지 분석
  const coveredCategories = new Set<GapCategory>();
  for (const program of school.afterschoolPrograms) {
    const cat = inferCategory(program.subject, program.category);
    coveredCategories.add(cat);
  }

  const missingCategories = EXPECTED_CATEGORIES.filter(
    (c) => !coveredCategories.has(c.id)
  );

  for (const missing of missingCategories) {
    let severity: "low" | "medium" | "high" = missing.id === "academic" ? "high" : "medium";
    let description = `${missing.label} 분야 방과후 프로그램이 없습니다.`;
    let recommendation = `${missing.label} 분야 방과후 프로그램 개설을 권장합니다. 인근 학교 또는 EBS 온라인 강좌를 활용할 수 있습니다.`;

    // 학원 보완 가능 여부 판단
    if (academyStats) {
      const realmCount = getRealmCountForCategory(academyStats.academyByRealm, missing.id);
      if (realmCount >= 30) {
        severity = "low";
        recommendation += ` 해당 지역에 ${missing.label} 분야 학원이 ${realmCount}개 운영 중이므로 학원을 통한 보완이 가능합니다.`;
      } else if (realmCount >= 10) {
        if (severity === "high") severity = "medium";
        recommendation += ` 인근 ${missing.label} 학원(${realmCount}개)을 통한 부분 보완이 가능합니다.`;
      } else if (realmCount === 0) {
        severity = "high";
        description += " (학원 접근성도 없는 교육 사각지대)";
      }
    }

    gaps.push({
      type: academyStats && getRealmCountForCategory(academyStats.academyByRealm, missing.id) === 0
        ? "education_desert" : "missing_category",
      category: missing.id,
      severity,
      description,
      recommendation,
    });
  }

  const coverageRate = Math.round(
    (coveredCategories.size / EXPECTED_CATEGORIES.length) * 100
  );

  // 2. 수강 인원 부족 분석
  for (const program of school.afterschoolPrograms) {
    if (program.enrollment != null && program.enrollment < 10) {
      gaps.push({
        type: "low_enrollment",
        category: inferCategory(program.subject, program.category),
        severity: program.enrollment < 5 ? "high" : "low",
        description: `'${program.subject}' 프로그램 수강 인원이 ${program.enrollment}명으로 적습니다.`,
        recommendation: `학생 수요 조사 후 프로그램 홍보를 강화하거나, 유사 프로그램과 통합 운영을 고려하세요.`,
      });
    }
  }

  // 2-1. 교과/특기적성 수강 비율 불균형 탐지
  const totalAcademic = school.afterschoolPrograms.reduce(
    (sum, p) => sum + (p.academicEnrollment ?? 0), 0
  );
  const totalExtracurricular = school.afterschoolPrograms.reduce(
    (sum, p) => sum + (p.extracurricularEnrollment ?? 0), 0
  );
  const enrollmentTotal = totalAcademic + totalExtracurricular;
  if (enrollmentTotal > 0) {
    const academicRatio = totalAcademic / enrollmentTotal;
    if (academicRatio > 0.85) {
      gaps.push({
        type: "low_enrollment",
        category: "arts",
        severity: "medium",
        description: `교과 수강 비율이 ${Math.round(academicRatio * 100)}%로 특기적성 수강이 부족합니다.`,
        recommendation: `특기적성(예술/체육/외국어) 프로그램을 확충하여 균형 잡힌 학습 환경을 조성하세요.`,
      });
    } else if (academicRatio < 0.15) {
      gaps.push({
        type: "low_enrollment",
        category: "academic",
        severity: "medium",
        description: `교과 수강 비율이 ${Math.round(academicRatio * 100)}%로 교과 보충이 부족합니다.`,
        recommendation: `교과 보충 프로그램(수학/국어/영어 등)을 개설하여 학습 격차를 줄이세요.`,
      });
    }
  }

  // 2-2. 프로그램당 평균 수강인원 기반 저조 프로그램 탐지
  const totalEnrollmentSum = school.afterschoolPrograms.reduce(
    (sum, p) => sum + (p.totalEnrollmentSum ?? 0), 0
  );
  const programCountForAvg = school.afterschoolPrograms.length;
  if (totalEnrollmentSum > 0 && programCountForAvg > 0) {
    const avgEnrollment = totalEnrollmentSum / programCountForAvg;
    if (avgEnrollment < 10 && school.teacherStats?.totalStudents && school.teacherStats.totalStudents > 100) {
      gaps.push({
        type: "low_enrollment",
        severity: "medium",
        description: `프로그램당 평균 수강인원이 ${avgEnrollment.toFixed(1)}명으로 전반적으로 저조합니다.`,
        recommendation: `학생 수요 조사를 실시하고, 인기 프로그램 중심으로 재편하여 참여율을 높이세요.`,
      });
    }
  }

  // 3. 교원 여건 대비 분석
  if (school.teacherStats?.studentsPerTeacher != null) {
    const spt = school.teacherStats.studentsPerTeacher;
    if (spt > 20 && school.afterschoolPrograms.length < 4) {
      gaps.push({
        type: "understaffed",
        severity: spt > 25 ? "high" : "medium",
        description: `교원 1인당 학생 수(${spt}명)가 높은데 방과후 프로그램(${school.afterschoolPrograms.length}개)이 부족합니다.`,
        recommendation: `교원 부담이 큰 상황에서 외부 강사 초빙이나 지역 교육자원 연계를 통한 방과후 프로그램 확충이 필요합니다.`,
      });
    }
  }

  // 4. 재정 대비 분석
  if (school.financeStats?.budgetPerStudent != null) {
    const bps = school.financeStats.budgetPerStudent;
    if (bps < 3000000 && school.afterschoolPrograms.length < 3) {
      gaps.push({
        type: "underfunded",
        severity: "high",
        description: `학생 1인당 교육비(${Math.round(bps).toLocaleString()}원)가 낮고 방과후 프로그램이 부족합니다.`,
        recommendation: `교육청 추가 지원금 신청 또는 지자체 연계 무료 프로그램 유치를 권장합니다.`,
      });
    }
  }

  // 전체 심각도 산출
  const highCount = gaps.filter((g) => g.severity === "high").length;
  const mediumCount = gaps.filter((g) => g.severity === "medium").length;
  let overallSeverity: "low" | "medium" | "high" = "low";
  if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) {
    overallSeverity = "high";
  } else if (highCount >= 1 || mediumCount >= 2) {
    overallSeverity = "medium";
  }

  // 학원 통계 요약
  let academySummary: GapAnalysisResult["academySummary"];
  if (academyStats) {
    const academyByCategory: Record<string, number> = {};
    for (const cat of EXPECTED_CATEGORIES) {
      academyByCategory[cat.id] = getRealmCountForCategory(academyStats.academyByRealm, cat.id);
    }
    academySummary = {
      totalAcademies: academyStats.totalAcademies,
      academyByCategory,
      hasComplement: Object.values(academyByCategory).some((c) => c >= 10),
    };
  }

  return {
    schoolCode: school.schoolCode,
    schoolName: school.schoolName,
    totalGaps: gaps.length,
    gaps,
    coverageRate,
    overallSeverity,
    academySummary,
  };
}
