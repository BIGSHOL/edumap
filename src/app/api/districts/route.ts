import { NextResponse } from "next/server";
import { prisma, isDbConnected } from "@/lib/db/prisma";

/**
 * GET /api/districts?region=B10
 * 시도 내 시군구 목록 반환
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");

  if (!(await isDbConnected())) {
    return NextResponse.json({ data: [] });
  }

  try {
    const where: Record<string, unknown> = {};
    if (region) where.regionCode = region;

    const groups = await prisma.school.groupBy({
      by: ["district"],
      where,
      _count: true,
      orderBy: { district: "asc" },
    });

    const data = groups.map((g) => ({
      district: g.district,
      schoolCount: g._count,
    }));

    const response = NextResponse.json({ data });
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  } catch {
    return NextResponse.json({ data: [] });
  }
}
