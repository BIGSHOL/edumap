import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/risk-summary
 * 시도별 평균 위험도 요약 (지도용)
 * - 각 시도의 학교 수, 평균 교원1인당학생수, 평균 기간제교원비율 기반 위험도 산출
 */
export async function GET() {
  try {
    // 시도별 집계 쿼리
    const regions = await prisma.school.groupBy({
      by: ["regionCode"],
      _count: true,
    });

    const results = await Promise.all(
      regions.map(async (r) => {
        const stats = await prisma.teacherStats.aggregate({
          where: { schoolCode: { in: await getSchoolCodes(r.regionCode) }, year: 2024 },
          _avg: { studentsPerTeacher: true, tempTeacherRatio: true },
        });

        const avgSpt = stats._avg.studentsPerTeacher ?? 16;
        const avgTemp = stats._avg.tempTeacherRatio ?? 0.1;

        // 간이 위험도 산출 (교원1인당학생수 60% + 기간제비율 40%)
        const sptScore = Math.min(100, Math.max(0, ((avgSpt - 10) / 15) * 100));
        const tempScore = Math.min(100, Math.max(0, (avgTemp / 0.3) * 100));
        const avgScore = Math.round(sptScore * 0.6 + tempScore * 0.4);

        return {
          regionCode: r.regionCode,
          schoolCount: r._count,
          avgScore,
          avgStudentsPerTeacher: Math.round(avgSpt * 10) / 10,
          avgTempTeacherRatio: Math.round(avgTemp * 1000) / 10,
        };
      })
    );

    const response = NextResponse.json({
      data: results,
      meta: { source: "학교알리미 (집계)", total: results.length },
    });
    response.headers.set("Cache-Control", "public, max-age=600"); // 10분 캐시
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "위험도 요약 조회 실패" } },
      { status: 500 }
    );
  }
}

async function getSchoolCodes(regionCode: string): Promise<string[]> {
  const schools = await prisma.school.findMany({
    where: { regionCode },
    select: { schoolCode: true },
  });
  return schools.map((s) => s.schoolCode);
}
