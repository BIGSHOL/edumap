/**
 * AI 모델 상수 — 중앙 관리
 *
 * 모델명 변경 시 이 파일만 수정하면 됩니다.
 */

// ─── Claude (Anthropic) ───
/** InsightReport 리포트 생성용 */
export const CLAUDE_REPORT_MODEL = "claude-sonnet-4-6-20250514";
/** GapMap 심층 분석용 (gemini.ts generateWithClaude) */
export const CLAUDE_ANALYSIS_MODEL = "claude-sonnet-4-6";

// ─── Gemini (Google) ───
/** 위험도 해설, 스마트 검색 등 일반 추론 */
export const GEMINI_FLASH_MODEL = "gemini-2.5-flash";
/** 경량 작업 (배치 내러티브 등) */
export const GEMINI_FLASH_LITE_MODEL = "gemini-2.5-flash-lite";

export type GeminiModel = "flash" | "flash-lite";

export const GEMINI_MODEL_MAP: Record<GeminiModel, string> = {
  flash: GEMINI_FLASH_MODEL,
  "flash-lite": GEMINI_FLASH_LITE_MODEL,
};
