import { describe, it, expect } from "vitest";
import { analyzeZone } from "@/lib/analysis/zone-analysis";
import type { SchoolDetail } from "@/lib/api/contracts/schools";

/** 테스트용 기본 학교 데이터 생성 */
function makeSchool(overrides: Partial<SchoolDetail> = {}): SchoolDetail {
  return {
    schoolCode: "T000000001",
    schoolName: "테스트초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "테스트구",
    latitude: 37.5,
    longitude: 127.0,
    address: "서울특별시 테스트구 테스트로 1",
    teacherStats: {
      year: 2025,
      studentsPerTeacher: 18,
      tempTeacherRatio: 0.1,
      totalTeachers: 30,
      totalStudents: 540,
    },
    financeStats: {
      year: 2025,
      totalBudget: 5000000000,
      educationBudget: 3000000000,
      budgetPerStudent: 4000000,
    },
    afterschoolPrograms: [
      { subject: "영어회화", enrollment: 25, category: "language" },
      { subject: "코딩교실", enrollment: 20, category: "technology" },
      { subject: "축구", enrollment: 30, category: "sports" },
      { subject: "미술", enrollment: 15, category: "arts" },
      { subject: "수학심화", enrollment: 18, category: "academic" },
    ],
    ...overrides,
  };
}

describe("analyzeZone", () => {
  it("빈 학구 처리 — 기본값 반환", () => {
    const result = analyzeZone("ZONE-EMPTY", []);
    expect(result.schoolCount).toBe(0);
    expect(result.avgRiskScore).toBe(50);
    expect(result.avgCoverageRate).toBe(0);
    expect(result.overallLevel).toBe("caution");
    expect(result.riskScoreVariance).toBe(0);
    expect(result.schools).toEqual([]);
    expect(result.zoneName).toContain("학구");
  });

  it("단일 학교 학구 분석", () => {
    const school = makeSchool();
    const result = analyzeZone("ZONE-SINGLE", [school]);

    expect(result.schoolCount).toBe(1);
    expect(result.zoneName).toContain("테스트초"); // 학교명 축약 포함
    expect(result.schools).toHaveLength(1);
    expect(result.schools[0].schoolCode).toBe("T000000001");
    expect(result.avgRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.avgRiskScore).toBeLessThanOrEqual(100);
    expect(result.avgCoverageRate).toBeGreaterThanOrEqual(0);
    expect(result.avgCoverageRate).toBeLessThanOrEqual(100);
    expect(result.riskScoreVariance).toBe(0); // 단일 학교 → 편차 0
  });

  it("다수 학교 학구 평균 계산", () => {
    const school1 = makeSchool({
      schoolCode: "T000000001",
      schoolName: "양호초등학교",
      teacherStats: { year: 2025, studentsPerTeacher: 14, tempTeacherRatio: 0.05, totalTeachers: 40, totalStudents: 560 },
      financeStats: { year: 2025, totalBudget: 6000000000, educationBudget: 4000000000, budgetPerStudent: 5000000 },
    });
    const school2 = makeSchool({
      schoolCode: "T000000002",
      schoolName: "열악초등학교",
      teacherStats: { year: 2025, studentsPerTeacher: 25, tempTeacherRatio: 0.25, totalTeachers: 15, totalStudents: 375 },
      financeStats: { year: 2025, totalBudget: 2000000000, educationBudget: 1000000000, budgetPerStudent: 2000000 },
      afterschoolPrograms: [{ subject: "수학", enrollment: 10, category: "academic" }],
    });

    const result = analyzeZone("ZONE-MULTI", [school1, school2]);

    expect(result.schoolCount).toBe(2);
    expect(result.schools).toHaveLength(2);
    // 평균은 두 학교 사이에 위치
    expect(result.avgRiskScore).toBeGreaterThan(0);
    expect(result.avgStudentsPerTeacher).not.toBeNull();
    expect(result.avgStudentsPerTeacher!).toBeCloseTo(19.5, 0); // (14+25)/2
    expect(result.avgBudgetPerStudent).not.toBeNull();
    expect(result.avgBudgetPerStudent!).toBeCloseTo(3500000, -4); // (5M+2M)/2
  });

  it("학구 내 편차 산출", () => {
    const school1 = makeSchool({
      schoolCode: "T000000001",
      schoolName: "안전초",
      teacherStats: { year: 2025, studentsPerTeacher: 12, tempTeacherRatio: 0.03, totalTeachers: 50, totalStudents: 600 },
      financeStats: { year: 2025, totalBudget: 7000000000, educationBudget: 5000000000, budgetPerStudent: 6000000 },
    });
    const school2 = makeSchool({
      schoolCode: "T000000002",
      schoolName: "위험초",
      teacherStats: { year: 2025, studentsPerTeacher: 28, tempTeacherRatio: 0.28, totalTeachers: 10, totalStudents: 280 },
      financeStats: { year: 2025, totalBudget: 1500000000, educationBudget: 800000000, budgetPerStudent: 1500000 },
      afterschoolPrograms: [],
    });

    const result = analyzeZone("ZONE-VARIANCE", [school1, school2]);

    // 두 학교의 위험도가 매우 다르므로 편차가 크다
    expect(result.riskScoreVariance).toBeGreaterThan(0);
    expect(result.schoolCount).toBe(2);
  });

  it("overallLevel은 avgRiskScore에 의해 결정", () => {
    // 매우 양호한 학교들로 구성
    const safeSchool = makeSchool({
      teacherStats: { year: 2025, studentsPerTeacher: 12, tempTeacherRatio: 0.03, totalTeachers: 50, totalStudents: 600 },
      financeStats: { year: 2025, totalBudget: 7000000000, educationBudget: 5000000000, budgetPerStudent: 6000000 },
    });

    const result = analyzeZone("ZONE-SAFE", [safeSchool]);
    expect(["safe", "caution"]).toContain(result.overallLevel);
  });

  it("worstFactor 식별", () => {
    const school = makeSchool({
      teacherStats: { year: 2025, studentsPerTeacher: 25, tempTeacherRatio: 0.2, totalTeachers: 15, totalStudents: 375 },
    });

    const result = analyzeZone("ZONE-FACTOR", [school]);
    expect(result.worstFactor).not.toBeNull();
    expect(typeof result.worstFactor).toBe("string");
  });

  it("교육지원청 정보 전달", () => {
    const school = makeSchool();
    const result = analyzeZone("ZONE-EDU", [school], {
      code: "B11",
      name: "서울특별시동부교육지원청",
    });

    expect(result.eduSupportCode).toBe("B11");
    expect(result.eduSupportName).toBe("서울특별시동부교육지원청");
  });

  it("교육지원청 정보 없으면 null", () => {
    const school = makeSchool();
    const result = analyzeZone("ZONE-NO-EDU", [school]);

    expect(result.eduSupportCode).toBeNull();
    expect(result.eduSupportName).toBeNull();
  });
});
