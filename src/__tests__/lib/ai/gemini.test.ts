import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGenerateContent = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    reportCache: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { generateContent: mockGenerateContent };
      }
    },
  };
});

import { prisma } from "@/lib/db/prisma";

const mockReportCache = vi.mocked(prisma.reportCache);

describe("gemini: generateWithGemini", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("캐시 히트 시 캐시에서 반환한다", async () => {
    mockReportCache.findFirst.mockResolvedValue({
      reportContent: "캐시된 분석 결과입니다.",
      modelUsed: "gemini-2.5-flash",
    } as never);

    const { generateWithGemini } = await import("@/lib/ai/gemini");
    const result = await generateWithGemini({
      prompt: "분석해주세요",
      cacheKey: { reportType: "risk-narrative", schoolCode: "7130106" },
    });

    expect(result.cached).toBe(true);
    expect(result.text).toBe("캐시된 분석 결과입니다.");
    expect(result.model).toBe("gemini-2.5-flash");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("캐시 미스 시 API를 호출한다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockReportCache.findFirst.mockResolvedValue(null as never);
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "AI 분석 결과" },
    });
    mockReportCache.create.mockResolvedValue({} as never);

    const { generateWithGemini } = await import("@/lib/ai/gemini");
    const result = await generateWithGemini({
      prompt: "분석해주세요",
      cacheKey: { reportType: "risk-narrative", schoolCode: "7130106" },
    });

    expect(result.cached).toBe(false);
    expect(result.text).toBe("AI 분석 결과");
    expect(mockGenerateContent).toHaveBeenCalledWith("분석해주세요");
    expect(mockReportCache.create).toHaveBeenCalled();
  });

  it("API 키 미설정 시 빈 문자열을 반환한다", async () => {
    delete process.env.GEMINI_API_KEY;
    mockReportCache.findFirst.mockResolvedValue(null as never);

    const { generateWithGemini } = await import("@/lib/ai/gemini");
    const result = await generateWithGemini({
      prompt: "분석해주세요",
      cacheKey: { reportType: "risk-narrative" },
    });

    expect(result.text).toBe("");
    expect(result.cached).toBe(false);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("API 호출 실패 시 빈 문자열을 반환한다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockReportCache.findFirst.mockResolvedValue(null as never);
    mockGenerateContent.mockRejectedValue(new Error("API 에러"));

    const { generateWithGemini } = await import("@/lib/ai/gemini");
    const result = await generateWithGemini({
      prompt: "분석해주세요",
      cacheKey: { reportType: "risk-narrative" },
    });

    expect(result.text).toBe("");
    expect(result.cached).toBe(false);
  });

  it("DB 캐시 조회 실패해도 API 호출로 진행한다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockReportCache.findFirst.mockRejectedValue(new Error("DB 연결 실패"));
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "DB 없이도 동작" },
    });

    const { generateWithGemini } = await import("@/lib/ai/gemini");
    const result = await generateWithGemini({
      prompt: "분석해주세요",
      cacheKey: { reportType: "risk-narrative" },
    });

    expect(result.text).toBe("DB 없이도 동작");
    expect(result.cached).toBe(false);
  });
});

describe("gemini: batchGenerateWithGemini", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("캐시된 항목은 건너뛰고 uncached만 API 호출한다", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    mockReportCache.findFirst
      .mockResolvedValueOnce({
        reportContent: "캐시된 해설 A",
        modelUsed: "gemini-2.5-flash",
      } as never)
      .mockResolvedValueOnce(null as never);

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '```json\n{"school-B": "새로운 해설 B"}\n```',
      },
    });
    mockReportCache.create.mockResolvedValue({} as never);

    const { batchGenerateWithGemini } = await import("@/lib/ai/gemini");
    const results = await batchGenerateWithGemini({
      items: [
        { key: "school-A", context: "학교 A 데이터" },
        { key: "school-B", context: "학교 B 데이터" },
      ],
      reportType: "risk-narrative",
      promptBuilder: (contexts) => `분석: ${contexts.join(", ")}`,
    });

    expect(results.get("school-A")).toBe("캐시된 해설 A");
    expect(results.get("school-B")).toBe("새로운 해설 B");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("모든 항목이 캐시되어 있으면 API 호출하지 않는다", async () => {
    mockReportCache.findFirst.mockResolvedValue({
      reportContent: "모두 캐시됨",
      modelUsed: "gemini-2.5-flash",
    } as never);

    const { batchGenerateWithGemini } = await import("@/lib/ai/gemini");
    const results = await batchGenerateWithGemini({
      items: [
        { key: "school-A", context: "A" },
        { key: "school-B", context: "B" },
      ],
      reportType: "risk-narrative",
      promptBuilder: (contexts) => contexts.join(", "),
    });

    expect(results.size).toBe(2);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("JSON 파싱 실패 시 빈 결과를 반환한다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockReportCache.findFirst.mockResolvedValue(null as never);
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "이건 JSON이 아닙니다 {{{" },
    });

    const { batchGenerateWithGemini } = await import("@/lib/ai/gemini");
    const results = await batchGenerateWithGemini({
      items: [{ key: "school-A", context: "A" }],
      reportType: "risk-narrative",
      promptBuilder: (contexts) => contexts.join(", "),
    });

    expect(results.has("school-A")).toBe(false);
  });

  it("API 키 미설정 시 캐시된 결과만 반환한다", async () => {
    delete process.env.GEMINI_API_KEY;
    mockReportCache.findFirst
      .mockResolvedValueOnce({
        reportContent: "캐시됨",
        modelUsed: "gemini-2.5-flash",
      } as never)
      .mockResolvedValueOnce(null as never);

    const { batchGenerateWithGemini } = await import("@/lib/ai/gemini");
    const results = await batchGenerateWithGemini({
      items: [
        { key: "school-A", context: "A" },
        { key: "school-B", context: "B" },
      ],
      reportType: "risk-narrative",
      promptBuilder: (contexts) => contexts.join(", "),
    });

    expect(results.get("school-A")).toBe("캐시됨");
    expect(results.has("school-B")).toBe(false);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
