import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db/prisma";
import {
  CLAUDE_ANALYSIS_MODEL,
  GEMINI_MODEL_MAP,
  type GeminiModel,
} from "@/lib/constants/models";

// --- 캐시 TTL (7일) ---
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Gemini API 호출 + ReportCache 캐시
 *
 * 1. DB 캐시 조회 (reportType + schoolCode/regionCode)
 * 2. 캐시 히트 → 즉시 반환
 * 3. 캐시 미스 → Gemini 호출 → DB 저장 → 반환
 */
export async function generateWithGemini(opts: {
  prompt: string;
  model?: GeminiModel;
  cacheKey: {
    reportType: string;
    schoolCode?: string;
    regionCode?: string;
  };
  maxTokens?: number;
}): Promise<{ text: string; cached: boolean; model: string }> {
  const { prompt, model = "flash", cacheKey, maxTokens = 4096 } = opts;
  const modelId = GEMINI_MODEL_MAP[model];

  // 1. 캐시 조회
  try {
    const cached = await prisma.reportCache.findFirst({
      where: {
        reportType: cacheKey.reportType,
        schoolCode: cacheKey.schoolCode ?? null,
        regionCode: cacheKey.regionCode ?? null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { generatedAt: "desc" },
    });

    if (cached) {
      return { text: cached.reportContent, cached: true, model: cached.modelUsed };
    }
  } catch {
    // DB 연결 실패 시 캐시 없이 진행
  }

  // 2. Gemini 호출
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { text: "", cached: false, model: modelId };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    // 3. 캐시 저장
    try {
      await prisma.reportCache.create({
        data: {
          reportType: cacheKey.reportType,
          schoolCode: cacheKey.schoolCode ?? null,
          regionCode: cacheKey.regionCode ?? null,
          reportContent: text,
          modelUsed: modelId,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
      });
    } catch {
      // 캐시 저장 실패해도 결과는 반환
    }

    return { text, cached: false, model: modelId };
  } catch (error) {
    console.error(`Gemini API 호출 실패 (${modelId}):`, error);
    return { text: "", cached: false, model: modelId };
  }
}

/**
 * 배치 Gemini 호출 — 여러 학교를 한 프롬프트로 처리
 *
 * 캐시된 학교는 건너뛰고, 미캐시 학교만 배치 프롬프트로 호출
 */
export async function batchGenerateWithGemini(opts: {
  items: { key: string; context: string }[]; // key = schoolCode 등
  reportType: string;
  promptBuilder: (_contexts: string[]) => string;
  model?: GeminiModel;
}): Promise<Map<string, string>> {
  const { items, reportType, promptBuilder, model = "flash" } = opts;
  const results = new Map<string, string>();

  // 1. 캐시된 항목 조회
  const uncached: typeof items = [];
  for (const item of items) {
    try {
      const cached = await prisma.reportCache.findFirst({
        where: {
          reportType,
          schoolCode: item.key,
          expiresAt: { gt: new Date() },
        },
        orderBy: { generatedAt: "desc" },
      });
      if (cached) {
        results.set(item.key, cached.reportContent);
        continue;
      }
    } catch {
      // DB 실패 시 uncached로 처리
    }
    uncached.push(item);
  }

  if (uncached.length === 0) return results;

  // 2. 배치 프롬프트 생성 + Gemini 호출
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return results;

  const modelId = GEMINI_MODEL_MAP[model];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: { maxOutputTokens: 2048 },
    });

    const prompt = promptBuilder(uncached.map((i) => i.context));
    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    // 3. JSON 파싱 (배치 응답은 { "schoolCode": "해설" } 형태)
    const parsed = parseJsonResponse(text);

    for (const item of uncached) {
      const narrative = parsed[item.key] ?? "";
      if (narrative) {
        results.set(item.key, narrative);

        // 캐시 저장
        try {
          await prisma.reportCache.create({
            data: {
              reportType,
              schoolCode: item.key,
              reportContent: narrative,
              modelUsed: modelId,
              generatedAt: new Date(),
              expiresAt: new Date(Date.now() + CACHE_TTL_MS),
            },
          });
        } catch {
          // 개별 캐시 실패 무시
        }
      }
    }
  } catch (error) {
    console.error(`Gemini 배치 호출 실패 (${modelId}):`, error);
  }

  return results;
}

// ============================================================
// Claude Sonnet 4.6 호출 + ReportCache 캐시
// ============================================================

/**
 * Claude API 호출 + ReportCache 캐시
 * GapMap 개선 제안, 정책 개입 우선순위 등 심층 분석에 사용
 */
export async function generateWithClaude(opts: {
  prompt: string;
  cacheKey: {
    reportType: string;
    schoolCode?: string;
    regionCode?: string;
  };
  maxTokens?: number;
}): Promise<{ text: string; cached: boolean; model: string }> {
  const { prompt, cacheKey, maxTokens = 8192 } = opts;

  // 1. 캐시 조회
  try {
    const cached = await prisma.reportCache.findFirst({
      where: {
        reportType: cacheKey.reportType,
        schoolCode: cacheKey.schoolCode ?? null,
        regionCode: cacheKey.regionCode ?? null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { generatedAt: "desc" },
    });

    if (cached) {
      return { text: cached.reportContent, cached: true, model: cached.modelUsed };
    }
  } catch {
    // DB 연결 실패 시 캐시 없이 진행
  }

  // 2. Claude 호출
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { text: "", cached: false, model: CLAUDE_ANALYSIS_MODEL };
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: CLAUDE_ANALYSIS_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    // 3. 캐시 저장
    try {
      await prisma.reportCache.create({
        data: {
          reportType: cacheKey.reportType,
          schoolCode: cacheKey.schoolCode ?? null,
          regionCode: cacheKey.regionCode ?? null,
          reportContent: text,
          modelUsed: CLAUDE_ANALYSIS_MODEL,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
      });
    } catch {
      // 캐시 저장 실패해도 결과는 반환
    }

    return { text, cached: false, model: CLAUDE_ANALYSIS_MODEL };
  } catch (error) {
    console.error("Claude API 호출 실패:", error);
    return { text: "", cached: false, model: CLAUDE_ANALYSIS_MODEL };
  }
}

/** JSON 블록 추출 및 파싱 */
function parseJsonResponse(text: string): Record<string, string> {
  try {
    // ```json ... ``` 블록 추출
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
}
