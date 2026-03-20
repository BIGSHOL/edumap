import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getZonesByRegion } from "@/lib/services/zone-data";
import { getSchoolDetails } from "@/lib/services/school-data";
import { analyzeZone } from "@/lib/analysis/zone-analysis";
import { sourceLabel } from "@/lib/services/utils";

/** GET 파라미터 검증 스키마 */
const ZoneAnalysisQuerySchema = z.object({
  region: z.string().min(1).optional().default("B10"),
  eduSupportCode: z.string().min(1).optional(),
  zoneId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(2000).optional().default(100),
});

/**
 * GET /api/zone-analysis?region=B10&eduSupportCode=B11&zoneId=...
 *
 * 학구 단위 종합 분석 결과 반환
 * 출처: 전국학교학구도연계정보(data.go.kr) + 학교알리미 + 나이스
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = ZoneAnalysisQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: parsed.error.issues.map((i) => i.message).join(", ") } },
      { status: 400 }
    );
  }

  const regionCode = parsed.data.region;
  const eduSupportCode = parsed.data.eduSupportCode;
  const zoneId = parsed.data.zoneId;
  const page = parsed.data.page;
  const limit = parsed.data.limit;

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

  // 매칭된 학교가 있는 학구만 (0개 학구 = 의미 없는 분석)
  const validResults = zoneResults.filter((z) => z.schoolCount > 0);

  // 위험도 높은 학구 우선, 같으면 학교 수 많은 순
  validResults.sort((a, b) => b.avgRiskScore - a.avgRiskScore || b.schoolCount - a.schoolCount);

  // 페이지네이션
  const total = validResults.length;
  const paged = validResults.slice((page - 1) * limit, page * limit);

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
