/** 리포트 로딩 스켈레톤 — 애니메이션 펄스 효과 */
export function ReportLoading() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="mb-4 text-sm font-medium text-text-secondary">
        리포트 생성 중...
      </p>
      <div className="animate-pulse space-y-3">
        {/* 제목 스켈레톤 */}
        <div className="h-5 w-2/5 rounded bg-border" />
        {/* 본문 스켈레톤 */}
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-4/5 rounded bg-border" />
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-3/5 rounded bg-border" />
        {/* 구분선 */}
        <div className="my-2" />
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-2/3 rounded bg-border" />
      </div>
    </div>
  );
}
