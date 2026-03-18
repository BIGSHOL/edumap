import type { SchoolDetail } from "@/lib/api/contracts/schools";

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
export type GapType = "missing_category" | "low_enrollment" | "understaffed" | "underfunded";

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
 * 학교의 학습자원 공백을 분석합니다.
 */
export function analyzeGaps(school: SchoolDetail): GapAnalysisResult {
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
    gaps.push({
      type: "missing_category",
      category: missing.id,
      severity: missing.id === "academic" ? "high" : "medium",
      description: `${missing.label} 분야 방과후 프로그램이 없습니다.`,
      recommendation: `${missing.label} 분야 방과후 프로그램 개설을 권장합니다. 인근 학교 또는 EBS 온라인 강좌를 활용할 수 있습니다.`,
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

  return {
    schoolCode: school.schoolCode,
    schoolName: school.schoolName,
    totalGaps: gaps.length,
    gaps,
    coverageRate,
    overallSeverity,
  };
}
