/**
 * 서비스 레이어 공통 유틸리티
 */

export type DataSource = "db" | "api" | "mock";

/** 데이터 소스에 따른 출처 라벨 생성 */
export function sourceLabel(source: DataSource, suffix?: string): string {
  const base =
    source === "db"
      ? "학교알리미"
      : source === "api"
        ? "학교알리미 (실시간)"
        : "학교알리미 (샘플)";
  return suffix ? `${base} — ${suffix}` : base;
}
