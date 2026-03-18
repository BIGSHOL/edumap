import { describe, it, expect } from "vitest";
import { calculateRiskScore, scoreToLevel, levelToLabel } from "@/lib/analysis/early-alert";
import { mockSchoolDetail } from "@/mocks/data/schools";

describe("EarlyAlert 위험도 스코어링", () => {
  it("학교 데이터로 위험도 스코어를 산출한다", () => {
    const result = calculateRiskScore(mockSchoolDetail);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.schoolCode).toBe(mockSchoolDetail.schoolCode);
    expect(result.contributingFactors.length).toBeGreaterThan(0);
  });

  it("기여 요인 랭킹이 포함된다", () => {
    const result = calculateRiskScore(mockSchoolDetail);

    expect(result.contributingFactors.length).toBe(4);
    result.contributingFactors.forEach((f) => {
      expect(f.factor).toBeDefined();
      expect(f.weight).toBeGreaterThan(0);
      expect(f.description).toBeDefined();
    });
  });

  it("위험도 수준이 올바르게 매핑된다", () => {
    const result = calculateRiskScore(mockSchoolDetail);
    const expectedLevel = scoreToLevel(result.score);
    expect(result.level).toBe(expectedLevel);
  });
});

describe("scoreToLevel", () => {
  it("0-30은 safe", () => expect(scoreToLevel(20)).toBe("safe"));
  it("31-50은 caution", () => expect(scoreToLevel(40)).toBe("caution"));
  it("51-70은 warning", () => expect(scoreToLevel(60)).toBe("warning"));
  it("71-100은 danger", () => expect(scoreToLevel(80)).toBe("danger"));
  it("경계값: 30은 safe", () => expect(scoreToLevel(30)).toBe("safe"));
  it("경계값: 31은 caution", () => expect(scoreToLevel(31)).toBe("caution"));
  it("경계값: 70은 warning", () => expect(scoreToLevel(70)).toBe("warning"));
  it("경계값: 71은 danger", () => expect(scoreToLevel(71)).toBe("danger"));
});

describe("levelToLabel", () => {
  it("safe → 안전", () => expect(levelToLabel("safe")).toBe("안전"));
  it("caution → 주의", () => expect(levelToLabel("caution")).toBe("주의"));
  it("warning → 경고", () => expect(levelToLabel("warning")).toBe("경고"));
  it("danger → 위험", () => expect(levelToLabel("danger")).toBe("위험"));
});
