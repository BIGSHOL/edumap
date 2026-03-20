"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SSEProgress } from "@/lib/sse";

// ─── SSE 연동 프로그레스바 ───────────────────────────────

interface AiProgressBarProps {
  /** SSE 스트림 URL (지정 시 실제 진행도 표시) */
  streamUrl?: string;
  /** SSE 완료 시 콜백 — 서버가 보낸 최종 데이터를 전달 */
  onComplete?: (_data: unknown) => void;
  /** SSE 에러 시 콜백 */
  onError?: (_message: string) => void;
  /** fallback: SSE URL 없을 때 사용할 단계 메시지 */
  steps?: string[];
  /** fallback: 단계 전환 간격 (ms) */
  interval?: number;
}

export function AiProgressBar({
  streamUrl,
  onComplete,
  onError,
  steps = [],
  interval = 3000,
}: AiProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState(steps[0] ?? "준비 중...");
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  // ── SSE 모드 ──
  useEffect(() => {
    if (!streamUrl) return;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload: SSEProgress = JSON.parse(event.data);
        setProgress(payload.progress);
        setStepMessage(payload.step);

        if (payload.done && payload.data) {
          eventSource.close();
          onCompleteRef.current?.(payload.data);
        }
        if (payload.error) {
          eventSource.close();
          onErrorRef.current?.(payload.error);
        }
      } catch {
        // 파싱 실패 무시
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onErrorRef.current?.("서버 연결이 끊어졌습니다.");
    };

    return () => eventSource.close();
  }, [streamUrl]);

  // ── Fallback 모드 (streamUrl 없을 때) ──
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    if (streamUrl || steps.length === 0) return;
    const timer = setInterval(() => {
      setFallbackIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, interval);
    return () => clearInterval(timer);
  }, [streamUrl, steps, interval]);

  useEffect(() => {
    if (streamUrl) return;
    const tick = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return Math.min(90, prev + Math.max(0.3, (90 - prev) * 0.02));
      });
    }, 100);
    return () => clearInterval(tick);
  }, [streamUrl]);

  const displayMessage = streamUrl ? stepMessage : (steps[fallbackIndex] ?? stepMessage);
  const displayProgress = streamUrl ? progress : progress;

  return (
    <div className="space-y-3">
      {/* 프로그레스바 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-border/50 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500 ease-out"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-text-secondary tabular-nums w-8 text-right">
          {Math.round(displayProgress)}%
        </span>
      </div>

      {/* 단계 메시지 */}
      <div className="flex items-center gap-2">
        <div className="relative w-3.5 h-3.5 shrink-0">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-0.5 rounded-full bg-primary animate-pulse" />
        </div>
        <p className="text-sm text-text-secondary animate-fade-in">
          {displayMessage}
        </p>
      </div>
    </div>
  );
}

// ─── SSE fetch 훅 ─────────────────────────────────────

/**
 * SSE 스트림 URL을 받아 진행도를 추적하고 완료 시 데이터를 반환하는 훅.
 * 컴포넌트에서 AiProgressBar와 함께 사용.
 */
export function useSSEFetch<T = unknown>(url: string | null) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("준비 중...");
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback((result: unknown) => {
    setData(result as T);
    setLoading(false);
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setData(null);
    setError(null);
    setProgress(0);
    setStep("준비 중...");

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const payload: SSEProgress = JSON.parse(event.data);
        setProgress(payload.progress);
        setStep(payload.step);

        if (payload.done && payload.data) {
          eventSource.close();
          handleComplete(payload.data);
        }
        if (payload.error) {
          eventSource.close();
          handleError(payload.error);
        }
      } catch {
        // ignore
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      handleError("서버 연결이 끊어졌습니다.");
    };

    return () => eventSource.close();
  }, [url, handleComplete, handleError]);

  return { progress, step, data, loading, error };
}

// ─── Fallback 단계 상수 (SSE 미지원 시 사용) ─────────

export const POLICY_STEPS = [
  "학교 데이터를 수집하고 있습니다...",
  "위험도 패턴을 분석하고 있습니다...",
  "AI가 정책 개입 우선순위를 도출하고 있습니다...",
  "분석 결과를 정리하고 있습니다...",
];

export const REGION_ANALYSIS_STEPS = [
  "학교별 위험도를 계산하고 있습니다...",
  "지역 패턴을 분석하고 있습니다...",
  "AI가 인사이트를 생성하고 있습니다...",
  "결과를 종합하고 있습니다...",
];

export const GAP_SUGGESTION_STEPS = [
  "학교 프로그램 현황을 분석하고 있습니다...",
  "공백 영역을 파악하고 있습니다...",
  "AI가 개선 방안을 생성하고 있습니다...",
  "맞춤형 제안을 정리하고 있습니다...",
];

export const REPORT_STEPS = [
  "학교 데이터를 종합하고 있습니다...",
  "교원 여건과 재정 현황을 분석하고 있습니다...",
  "AI가 맞춤형 리포트를 작성하고 있습니다...",
  "리포트를 최종 검토하고 있습니다...",
];
