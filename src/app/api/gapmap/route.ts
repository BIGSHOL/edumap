import { NextResponse } from "next/server";
import { getSchoolDetails } from "@/lib/services/school-data";
import { analyzeGaps } from "@/lib/analysis/gapmap";
import { sourceLabel } from "@/lib/services/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolCode = searchParams.get("schoolCode") ?? undefined;
  const regionCode = searchParams.get("region") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 200)));

  const { data: schools, source } = await getSchoolDetails({
    schoolCode,
    region: regionCode,
  });

  const results = schools
    .map((school) => analyzeGaps(school))
    .sort((a, b) => b.totalGaps - a.totalGaps)
    .slice(0, limit);

  const response = NextResponse.json({
    data: results,
    meta: { source: sourceLabel(source, "공백 분석"), total: schools.length },
  });
  response.headers.set("Cache-Control", "public, max-age=300");
  return response;
}
