"use client";

import type { ReportType } from "@/types/report";
import { ReportLoading } from "./ReportLoading";

interface ReportViewerProps {
  content: string;
  reportType: ReportType;
  loading: boolean;
}

/** 리포트 유형 한글 라벨 */
const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  policy: "정책담당자용",
  teacher: "교사용",
  parent: "학부모용",
};

/** AI 생성 리포트 뷰어 — 유형 라벨, 본문, 출처 표시 */
export function ReportViewer({
  content,
  reportType,
  loading,
}: ReportViewerProps) {
  if (loading) {
    return <ReportLoading />;
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-6">
      <header className="mb-4 border-b border-border pb-3">
        <span className="inline-block rounded-full bg-primary-lighter px-3 py-1 text-xs font-semibold text-primary">
          {REPORT_TYPE_LABEL[reportType]}
        </span>
      </header>

      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-text-primary">
        {content}
      </div>

      <footer className="mt-6 border-t border-border pt-3 text-xs text-text-secondary">
        출처: 학교알리미(schoolinfo.go.kr), 나이스 교육정보(open.neis.go.kr) |
        공공누리 제1유형(출처표시)
      </footer>
    </article>
  );
}
