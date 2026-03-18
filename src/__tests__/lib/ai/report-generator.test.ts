import { describe, it, expect } from "vitest";
import { generateReport } from "@/lib/ai/report-generator";
import { mockSchoolDetail } from "@/mocks/data/schools";

describe("InsightReport 리포트 생성", () => {
  // ANTHROPIC_API_KEY가 없으므로 fallback 리포트가 생성됨

  it("policy 리포트를 생성한다", async () => {
    const report = await generateReport("policy", mockSchoolDetail);

    expect(report).toBeDefined();
    expect(report.length).toBeGreaterThan(0);
    expect(report).toContain("출처");
  });

  it("teacher 리포트를 생성한다", async () => {
    const report = await generateReport("teacher", mockSchoolDetail);

    expect(report).toBeDefined();
    expect(report.length).toBeGreaterThan(0);
    expect(report).toContain("출처");
  });

  it("parent 리포트를 생성한다", async () => {
    const report = await generateReport("parent", mockSchoolDetail);

    expect(report).toBeDefined();
    expect(report.length).toBeGreaterThan(0);
    expect(report).toContain("출처");
  });

  it("리포트에 학교명이 포함된다", async () => {
    const report = await generateReport("policy", mockSchoolDetail);
    expect(report).toContain(mockSchoolDetail.schoolName);
  });

  it("parent 리포트는 쉬운 언어로 작성된다", async () => {
    const report = await generateReport("parent", mockSchoolDetail);
    // 학부모 리포트에는 "우리 아이" 관련 표현이 포함되어야 함
    expect(report).toContain("우리 아이");
  });
});
