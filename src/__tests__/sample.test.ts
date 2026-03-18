import { describe, it, expect } from "vitest";

describe("프로젝트 셋업 검증", () => {
  it("Vitest가 정상 동작한다", () => {
    expect(1 + 1).toBe(2);
  });

  it("TypeScript 타입이 정상 동작한다", () => {
    const schoolCode: string = "B100000465";
    expect(schoolCode).toBeDefined();
  });
});
