import { NextResponse } from "next/server";
import { getEduSupportOffices } from "@/lib/services/zone-data";

/**
 * GET /api/edu-support-offices?region=B10
 *
 * 교육지원청 목록 반환 (학구 분석 필터 드롭다운용)
 * 출처: 전국학교학구도연계정보(data.go.kr)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region") ?? undefined;

  const { data, source } = await getEduSupportOffices(regionCode);

  const response = NextResponse.json({
    data,
    meta: { source, total: data.length },
  });
  response.headers.set("Cache-Control", "public, max-age=600");
  return response;
}
