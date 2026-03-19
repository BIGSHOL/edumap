import { NextResponse } from "next/server";
import { getZonesByRegion } from "@/lib/services/zone-data";
import { getSchoolDetails } from "@/lib/services/school-data";
import { analyzeZone } from "@/lib/analysis/zone-analysis";
import { sourceLabel } from "@/lib/services/utils";

/**
 * GET /api/zone-analysis?region=B10&eduSupportCode=B11&zoneId=...
 *
 * 학구 단위 종합 분석 결과 반환
 * 출처: 전국학교학구도연계정보(data.go.kr) + 학교알리미 + 나이스
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region") ?? "B10";
  const eduSupportCode = searchParams.get("eduSupportCode") ?? undefined;
  const zoneId = searchParams.get("zoneId") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  // 1. 학구 매핑 조회
  const { data: zones, source: zoneSource } = await getZonesByRegion(
    regionCode,
    eduSupportCode
  );

  // 특정 학구 필터
  const filteredZones = zoneId ? zones.filter((z) => z.zoneId === zoneId) : zones;

  // 2. 학구 내 학교 데이터 조회 (학교명으로 매칭)
  const { data: allSchools, source: schoolSource } = await getSchoolDetails({
    region: regionCode,
  });

  // 학교명 → SchoolDetail 맵
  const schoolByName = new Map(allSchools.map((s) => [s.schoolName, s]));

  // 3. 학구별 분석
  const zoneResults = filteredZones.map((zone) => {
    const zoneSchools = zone.schoolNames
      .map((name) => schoolByName.get(name))
      .filter((s): s is NonNullable<typeof s> => s != null);

    return analyzeZone(zone.zoneId, zoneSchools, {
      code: zone.eduSupportCode,
      name: zone.eduSupportName,
    });
  });

  // 위험도 높은 학구 우선 정렬
  zoneResults.sort((a, b) => b.avgRiskScore - a.avgRiskScore);

  // 페이지네이션
  const total = zoneResults.length;
  const paged = zoneResults.slice((page - 1) * limit, page * limit);

  const response = NextResponse.json({
    data: paged,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      source: sourceLabel(
        schoolSource === "mock" && zoneSource === "mock" ? "mock" : schoolSource,
        "학구 분석"
      ),
      zoneSource,
    },
  });
  response.headers.set("Cache-Control", "public, max-age=300");
  return response;
}
