import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/risk-summary
 * - region 없음: 시도별 평균 위험도
 * - region 있음: 해당 시도의 시군구별 평균 위험도
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");

  try {
    const where: Record<string, unknown> = {};
    if (region) where.regionCode = region;

    // 그룹 기준: region이면 시도별, 아니면 시군구별
    const groupBy = region ? "district" : "regionCode";

    const groups = await prisma.school.groupBy({
      by: [groupBy],
      where,
      _count: true,
    });

    const results = await Promise.all(
      groups.map(async (g) => {
        const key = region ? (g as { district: string }).district : (g as { regionCode: string }).regionCode;
        const schoolWhere: Record<string, unknown> = {};
        if (region) {
          schoolWhere.regionCode = region;
          schoolWhere.district = key;
        } else {
          schoolWhere.regionCode = key;
        }

        const schoolCodes = await prisma.school.findMany({
          where: schoolWhere,
          select: { schoolCode: true },
        });

        const stats = await prisma.teacherStats.aggregate({
          where: {
            schoolCode: { in: schoolCodes.map((s) => s.schoolCode) },
            year: 2024,
          },
          _avg: { studentsPerTeacher: true, tempTeacherRatio: true },
        });

        const avgSpt = stats._avg.studentsPerTeacher ?? 16;
        const avgTemp = stats._avg.tempTeacherRatio ?? 0.1;
        const sptScore = Math.min(100, Math.max(0, ((avgSpt - 10) / 15) * 100));
        const tempScore = Math.min(100, Math.max(0, (avgTemp / 0.3) * 100));
        const avgScore = Math.round(sptScore * 0.6 + tempScore * 0.4);

        return {
          regionCode: region || key,
          district: region ? key : undefined,
          schoolCount: g._count,
          avgScore,
        };
      })
    );

    const response = NextResponse.json({
      data: results,
      meta: { source: "학교알리미 (집계)", total: results.length },
    });
    response.headers.set("Cache-Control", "public, max-age=600");
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "위험도 요약 조회 실패" } },
      { status: 500 }
    );
  }
}
