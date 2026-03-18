import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/** 시도 코드 → 짧은 이름 (fallback용) */
const REGION_SHORT_NAMES: Record<string, string> = {
  B10: "서울", C10: "부산", D10: "대구", E10: "인천",
  F10: "광주", G10: "대전", H10: "울산", I10: "세종",
  J10: "경기", K10: "강원", M10: "충북", N10: "충남",
  P10: "전북", Q10: "전남", R10: "경북", S10: "경남",
  T10: "제주",
};

/**
 * GET /api/regions
 * 시도 목록 반환 (DB 우선, fallback 내장)
 */
export async function GET() {
  // 1. DB에서 조회
  try {
    const regions = await prisma.region.findMany({
      orderBy: { regionCode: "asc" },
      select: { regionCode: true, regionName: true },
    });

    if (regions.length > 0) {
      const data = regions.map((r) => ({
        code: r.regionCode,
        name: toShortName(r.regionCode, r.regionName),
      }));

      const response = NextResponse.json({ data });
      response.headers.set("Cache-Control", "public, max-age=86400"); // 24시간
      return response;
    }
  } catch {
    // DB 미연결
  }

  // 2. Fallback: 하드코딩 목록
  const data = Object.entries(REGION_SHORT_NAMES).map(([code, name]) => ({
    code,
    name,
  }));

  return NextResponse.json({ data });
}

/** "서울특별시교육청" → "서울" 등 짧은 이름으로 변환 */
function toShortName(code: string, fullName: string): string {
  return REGION_SHORT_NAMES[code] ?? fullName.replace(/교육청|특별시|광역시|도|특별자치/g, "").trim();
}
