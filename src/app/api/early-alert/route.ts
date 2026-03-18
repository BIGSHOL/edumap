import { NextResponse } from "next/server";
import { getSchoolDetail, getSchoolDetails } from "@/lib/services/school-data";
import { calculateRiskScore } from "@/lib/analysis/early-alert";
import { sourceLabel } from "@/lib/services/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolCode = searchParams.get("schoolCode");
  const regionCode = searchParams.get("region") ?? undefined;
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit") ?? 1000)));

  // 개별 학교 위험도 조회
  if (schoolCode) {
    const { data, source } = await getSchoolDetail(schoolCode);
    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "학교를 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    const riskScore = calculateRiskScore(data);
    return NextResponse.json({
      data: { ...riskScore, schoolName: data.schoolName },
      meta: { source: sourceLabel(source, "분석 결과") },
    });
  }

  // 전체/지역 위험도 목록
  const { data: schools, source } = await getSchoolDetails({ region: regionCode });
  const scores = schools
    .map((school) => ({
      ...calculateRiskScore(school),
      schoolName: school.schoolName,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const response = NextResponse.json({
    data: scores,
    meta: { source: sourceLabel(source, "분석 결과"), total: schools.length },
  });
  response.headers.set("Cache-Control", "public, max-age=300"); // 5분 캐시
  return response;
}
