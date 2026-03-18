import type { SchoolItem } from "@/lib/api/contracts/schools";

interface SchoolCardProps {
  school: SchoolItem;
}

/** 학교급 한글 매핑 */
const SCHOOL_TYPE_LABEL: Record<SchoolItem["schoolType"], string> = {
  elementary: "초등학교",
  middle: "중학교",
  high: "고등학교",
};

/** 학교 정보 카드 — 학교명, 학교급, 지역 표시 */
export function SchoolCard({ school }: SchoolCardProps) {
  const { schoolName, schoolType, district } = school;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-lg font-semibold text-text-primary">{schoolName}</h3>
      <div className="mt-2 flex items-center gap-3">
        <span className="inline-block rounded-full bg-primary-lighter px-3 py-0.5 text-xs font-medium text-primary">
          {SCHOOL_TYPE_LABEL[schoolType]}
        </span>
        <span className="text-sm text-text-secondary">{district}</span>
      </div>
    </div>
  );
}
