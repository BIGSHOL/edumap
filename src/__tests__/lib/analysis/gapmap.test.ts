import { describe, it, expect } from "vitest";
import {
  analyzeGaps,
  inferCategory,
  EXPECTED_CATEGORIES,
} from "@/lib/analysis/gapmap";
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

describe("inferCategory", () => {
  it("카테고리가 명시되어 있으면 그대로 반환", () => {
    expect(inferCategory("영어", "academic")).toBe("academic");
    expect(inferCategory("축구", "sports")).toBe("sports");
  });

  it("카테고리가 없으면 subject에서 추론", () => {
    expect(inferCategory("영어회화", null)).toBe("language");
    expect(inferCategory("코딩교실", null)).toBe("technology");
    expect(inferCategory("축구", null)).toBe("sports");
    expect(inferCategory("미술", null)).toBe("arts");
    expect(inferCategory("수학심화", null)).toBe("academic");
  });

  it("매칭 안 되면 academic 기본값", () => {
    expect(inferCategory("독서토론", null)).toBe("academic");
  });
});

describe("analyzeGaps", () => {
  it("모든 카테고리 충족 시 missing_category 공백 없음", () => {
    const school = makeSchool();
    const result = analyzeGaps(school);
    const missingGaps = result.gaps.filter((g) => g.type === "missing_category");
    expect(missingGaps).toHaveLength(0);
    expect(result.coverageRate).toBe(100);
  });

  it("카테고리 누락 시 missing_category 공백 검출", () => {
    const school = makeSchool({
      afterschoolPrograms: [
        { subject: "수학심화", enrollment: 20, category: "academic" },
      ],
    });
    const result = analyzeGaps(school);
    const missingGaps = result.gaps.filter((g) => g.type === "missing_category");
    // arts, sports, technology, language 4개 누락
    expect(missingGaps).toHaveLength(4);
    expect(result.coverageRate).toBe(20); // 1/5 = 20%
  });

  it("수강 인원 10명 미만 시 low_enrollment 공백 검출", () => {
    const school = makeSchool({
      afterschoolPrograms: [
        { subject: "수학심화", enrollment: 3, category: "academic" },
        { subject: "영어", enrollment: 25, category: "language" },
        { subject: "축구", enrollment: 30, category: "sports" },
        { subject: "미술", enrollment: 15, category: "arts" },
        { subject: "코딩", enrollment: 20, category: "technology" },
      ],
    });
    const result = analyzeGaps(school);
    const lowEnrollment = result.gaps.filter((g) => g.type === "low_enrollment");
    expect(lowEnrollment).toHaveLength(1);
    expect(lowEnrollment[0].severity).toBe("high"); // < 5명
  });

  it("교원 부담이 크고 프로그램 부족 시 understaffed 공백 검출", () => {
    const school = makeSchool({
      teacherStats: {
        year: 2025,
        studentsPerTeacher: 26,
        tempTeacherRatio: 0.2,
        totalTeachers: 20,
        totalStudents: 520,
      },
      afterschoolPrograms: [
        { subject: "수학", enrollment: 20, category: "academic" },
      ],
    });
    const result = analyzeGaps(school);
    const understaffed = result.gaps.filter((g) => g.type === "understaffed");
    expect(understaffed).toHaveLength(1);
    expect(understaffed[0].severity).toBe("high"); // > 25
  });

  it("재정 부족 + 프로그램 부족 시 underfunded 공백 검출", () => {
    const school = makeSchool({
      financeStats: {
        year: 2025,
        totalBudget: 2000000000,
        educationBudget: 1000000000,
        budgetPerStudent: 2500000,
      },
      afterschoolPrograms: [
        { subject: "수학", enrollment: 20, category: "academic" },
      ],
    });
    const result = analyzeGaps(school);
    const underfunded = result.gaps.filter((g) => g.type === "underfunded");
    expect(underfunded).toHaveLength(1);
    expect(underfunded[0].severity).toBe("high");
  });

  it("overallSeverity를 올바르게 산출", () => {
    // 모든 카테고리 충족 + 양호한 여건 → low
    const healthySchool = makeSchool();
    expect(analyzeGaps(healthySchool).overallSeverity).toBe("low");

    // 많은 공백 → high
    const poorSchool = makeSchool({
      teacherStats: {
        year: 2025,
        studentsPerTeacher: 28,
        tempTeacherRatio: 0.25,
        totalTeachers: 15,
        totalStudents: 420,
      },
      financeStats: {
        year: 2025,
        totalBudget: 1500000000,
        educationBudget: 800000000,
        budgetPerStudent: 2000000,
      },
      afterschoolPrograms: [],
    });
    const poorResult = analyzeGaps(poorSchool);
    expect(poorResult.overallSeverity).toBe("high");
    expect(poorResult.totalGaps).toBeGreaterThan(0);
  });

  it("결과에 schoolCode, schoolName 포함", () => {
    const school = makeSchool({ schoolCode: "X999", schoolName: "서울테스트초" });
    const result = analyzeGaps(school);
    expect(result.schoolCode).toBe("X999");
    expect(result.schoolName).toBe("서울테스트초");
  });

  it("프로그램이 없으면 coverageRate 0%", () => {
    const school = makeSchool({ afterschoolPrograms: [] });
    const result = analyzeGaps(school);
    expect(result.coverageRate).toBe(0);
    expect(result.gaps.filter((g) => g.type === "missing_category")).toHaveLength(
      EXPECTED_CATEGORIES.length
    );
  });
});
