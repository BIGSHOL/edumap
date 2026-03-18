import type { SchoolDetail } from "@/lib/api/contracts/schools";

interface SchoolCardProps {
  school: Pick<SchoolDetail, "schoolName" | "schoolType" | "district" | "address" | "foundationType">;
}

/** 학교급 한글 매핑 */
const SCHOOL_TYPE_LABEL: Record<string, string> = {
  elementary: "초등학교",
  middle: "중학교",
  high: "고등학교",
};

/** 설립유형 뱃지 색상 */
const FOUNDATION_COLORS: Record<string, string> = {
  "국립": "bg-blue-100 text-blue-700",
  "공립": "bg-green-100 text-green-700",
  "사립": "bg-purple-100 text-purple-700",
};

/** 학교 정보 카드 — 학교명, 학교급, 지역, 주소, 설립유형 표시 */
export function SchoolCard({ school }: SchoolCardProps) {
  const { schoolName, schoolType, district, address, foundationType } = school;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-text-primary">{schoolName}</h3>
        {foundationType && (
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${FOUNDATION_COLORS[foundationType] ?? "bg-gray-100 text-gray-600"}`}>
            {foundationType}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="inline-block rounded-full bg-primary-lighter px-3 py-0.5 text-xs font-medium text-primary">
          {SCHOOL_TYPE_LABEL[schoolType] ?? schoolType}
        </span>
        <span className="text-sm text-text-secondary">{district}</span>
      </div>
      {address && (
        <p className="mt-1 text-xs text-text-secondary truncate">{address}</p>
      )}
    </div>
  );
}
