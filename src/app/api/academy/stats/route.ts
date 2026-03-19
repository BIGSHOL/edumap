import { NextResponse } from "next/server";
import { getAcademyStats } from "@/lib/services/academy-data";
import { sourceLabel } from "@/lib/services/utils";

/**
 * GET /api/academy/stats?region=B10&district=강남구
 * 시군구별 학원교습소 통계
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region") ?? "B10";
  const district = searchParams.get("district") ?? undefined;

  try {
    const { data, source } = await getAcademyStats({ regionCode, district });

    const response = NextResponse.json({
      data,
      meta: {
        source: sourceLabel(source, "학원교습소 통계"),
        total: data.length,
      },
    });
    response.headers.set("Cache-Control", "public, max-age=600");
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "학원 통계 조회 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
