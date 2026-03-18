"use client";

import type { ReportType } from "@/types/report";

interface ReportTypeSelectorProps {
  selected: ReportType;
  onSelect: (_type: ReportType) => void;
}

const TABS: { type: ReportType; label: string }[] = [
  { type: "policy", label: "정책담당자용" },
  { type: "teacher", label: "교사용" },
  { type: "parent", label: "학부모용" },
];

/** 리포트 유형 선택 탭 — policy / teacher / parent */
export function ReportTypeSelector({
  selected,
  onSelect,
}: ReportTypeSelectorProps) {
  return (
    <nav className="flex gap-1 rounded-lg bg-background p-1" role="tablist">
      {TABS.map(({ type, label }) => {
        const isActive = selected === type;
        return (
          <button
            key={type}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onSelect(type)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
