interface RiskScoreBadgeProps {
  score: number;
  level?: "safe" | "caution" | "warning" | "danger";
}

interface RiskLevel {
  label: string;
  colorClass: string;
  bgClass: string;
}

/** 위험도 점수에 따른 수준 반환 */
function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return { label: "안전", colorClass: "text-risk-safe", bgClass: "bg-risk-safe" };
  if (score <= 50) return { label: "주의", colorClass: "text-risk-caution", bgClass: "bg-risk-caution" };
  if (score <= 70) return { label: "경고", colorClass: "text-risk-warning", bgClass: "bg-risk-warning" };
  return { label: "위험", colorClass: "text-risk-danger", bgClass: "bg-risk-danger" };
}

/** 위험 수준 이름으로 레벨 정보 반환 */
function getRiskLevelByName(level: string): RiskLevel {
  switch (level) {
    case "safe": return { label: "안전", colorClass: "text-risk-safe", bgClass: "bg-risk-safe" };
    case "caution": return { label: "주의", colorClass: "text-risk-caution", bgClass: "bg-risk-caution" };
    case "warning": return { label: "경고", colorClass: "text-risk-warning", bgClass: "bg-risk-warning" };
    case "danger": return { label: "위험", colorClass: "text-risk-danger", bgClass: "bg-risk-danger" };
    default: return getRiskLevel(50);
  }
}

/** 위험도 스코어 뱃지 — 점수(0~100), 수준 라벨, 프로그레스 바 표시 */
export function RiskScoreBadge({ score, level }: RiskScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const computed = getRiskLevel(clamped);
  const { label, colorClass, bgClass } = level ? getRiskLevelByName(level) : computed;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4">
      <span className={`text-3xl font-bold ${colorClass}`}>
        {clamped}
      </span>
      <span
        className={`rounded-full px-3 py-0.5 text-xs font-semibold text-white ${bgClass}`}
      >
        {label}
      </span>
      <div className="mt-1 h-2.5 w-full rounded-full bg-border">
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-2.5 rounded-full transition-all ${bgClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
