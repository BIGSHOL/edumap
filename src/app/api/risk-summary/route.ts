import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/risk-summary
 * 항상 시군구 단위로 평균 위험도 반환
 * - region 없음: 전국 시군구별
 * - region 있음: 해당 시도 시군구별
 *
 * 최적화: 단일 쿼리 → JS 집계 (커넥션 풀 절약)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");

  try {
    const where: Record<string, unknown> = {};
    if (region) where.regionCode = region;

    const schools = await prisma.school.findMany({
      where,
      select: {
        regionCode: true,
        district: true,
        teacherStats: {
          where: { year: 2024 },
          select: { studentsPerTeacher: true, tempTeacherRatio: true },
          take: 1,
        },
      },
    });

    // 시군구 단위 집계
    const groups = new Map<string, {
      regionCode: string;
      totalSpt: number;
      totalTemp: number;
      count: number;
      schoolCount: number;
    }>();

    for (const s of schools) {
      const key = s.district;
      if (!groups.has(key)) {
        groups.set(key, { regionCode: s.regionCode, totalSpt: 0, totalTemp: 0, count: 0, schoolCount: 0 });
      }
      const g = groups.get(key)!;
      g.schoolCount++;

      const ts = s.teacherStats[0];
      if (ts) {
        g.totalSpt += ts.studentsPerTeacher ?? 16;
        g.totalTemp += ts.tempTeacherRatio ?? 0.1;
        g.count++;
      }
    }

    const results = Array.from(groups.entries()).map(([district, g]) => {
      const avgSpt = g.count > 0 ? g.totalSpt / g.count : 16;
      const avgTemp = g.count > 0 ? g.totalTemp / g.count : 0.1;
      const sptScore = Math.min(100, Math.max(0, ((avgSpt - 10) / 15) * 100));
      const tempScore = Math.min(100, Math.max(0, (avgTemp / 0.3) * 100));
      const avgScore = Math.round(sptScore * 0.6 + tempScore * 0.4);

      return {
        regionCode: g.regionCode,
        district,
        schoolCount: g.schoolCount,
        avgScore,
      };
    });

    const response = NextResponse.json({
      data: results,
      meta: { source: "학교알리미 (집계)", total: results.length },
    });
    response.headers.set("Cache-Control", "public, max-age=600");
    return response;
  } catch (error) {
    console.error("[risk-summary] 에러:", error);
    return NextResponse.json({
      data: [],
      meta: { source: "학교알리미 (오프라인)", total: 0 },
    });
  }
}
