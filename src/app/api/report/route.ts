import { getSchoolDetail } from "@/lib/services/school-data";
import { generateReport } from "@/lib/ai/report-generator";
import type { ReportType } from "@/types/report";

const VALID_REPORT_TYPES = ["policy", "teacher", "parent"] as const;

export async function POST(request: Request) {
  let body: { schoolCode?: string; regionCode?: string; reportType?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 유효한 JSON이 아닙니다." } },
      { status: 400 }
    );
  }

  const { schoolCode, regionCode, reportType } = body;

  if (!schoolCode && !regionCode) {
    return Response.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "schoolCode 또는 regionCode 중 하나는 반드시 포함해야 합니다.",
        },
      },
      { status: 400 }
    );
  }

  if (!reportType || !VALID_REPORT_TYPES.includes(reportType as ReportType)) {
    return Response.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: `reportType은 ${VALID_REPORT_TYPES.join(", ")} 중 하나여야 합니다.`,
        },
      },
      { status: 400 }
    );
  }

  const validType = reportType as ReportType;

  try {
    // 학교 데이터 조회 (DB 캐시 → API → Mock)
    const { data: schoolDetail } = schoolCode
      ? await getSchoolDetail(schoolCode)
      : { data: null };

    // 학교 데이터가 없으면 mock fallback
    let finalDetail = schoolDetail;
    if (!finalDetail) {
      const { mockSchoolDetail } = await import("@/mocks/data/schools");
      finalDetail = mockSchoolDetail;
    }

    // AI 리포트 생성 (API 키 없으면 자동 fallback)
    const reportContent = await generateReport(validType, finalDetail);

    return Response.json({
      data: {
        id: crypto.randomUUID(),
        reportType: validType,
        reportContent,
        modelUsed: "claude-sonnet-4-6-20250514",
        generatedAt: new Date().toISOString(),
        source: "학교알리미 (2024년 기준)",
        cached: false,
      },
    });
  } catch {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "리포트 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
