"use client";

import { AiProgressBar, REPORT_STEPS } from "@/components/AiProgressBar";

/** 리포트 생성 중 프로그레스바 */
export function ReportLoading() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary text-lg">AI</span>
        <p className="text-sm font-semibold text-text-primary">리포트 생성 중</p>
      </div>
      <AiProgressBar steps={REPORT_STEPS} />
    </div>
  );
}
