import { prisma } from "@/lib/db/prisma";
import { searchSchools } from "@/lib/api/neis";

/**
 * 학교 검색 API — DB 우선, NEIS API fallback
 *
 * GET /api/schools/search?q=김해&type=elementary&limit=20
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const schoolType = searchParams.get("type"); // elementary, middle, high
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  if (!query || query.length < 1) {
    return Response.json({ data: [], meta: { total: 0 } });
  }

  // 1. DB 우선 검색
  try {
    const where: Record<string, unknown> = {
      schoolName: { contains: query },
    };
    if (schoolType) where.schoolType = schoolType;

    const schools = await prisma.school.findMany({
      where,
      take: limit,
      orderBy: { schoolName: "asc" },
      include: { region: true },
    });

    if (schools.length > 0) {
      const data = schools.map((s) => ({
        schoolCode: s.schoolCode,
        schoolName: s.schoolName,
        schoolType: s.schoolType,
        regionCode: s.regionCode,
        regionName: s.region?.regionName ?? "",
        district: s.district,
        address: s.address ?? "",
        displayName: `${s.schoolName} ${s.district}`,
      }));

      return Response.json({
        data,
        meta: { source: "학교알리미", total: data.length },
      });
    }
  } catch {
    // DB 미연결 — NEIS fallback으로
  }

  // 2. NEIS API fallback
  const schulKndMap: Record<string, string> = {
    elementary: "초등학교",
    middle: "중학교",
    high: "고등학교",
  };

  try {
    const rows = await searchSchools({
      SCHUL_NM: query,
      SCHUL_KND_SC_NM: schoolType ? schulKndMap[schoolType] : undefined,
      pSize: limit,
    });

    const data = rows.map((r) => ({
      schoolCode: r.SD_SCHUL_CODE,
      schoolName: r.SCHUL_NM,
      schoolType: toSchoolTypeKey(r.SCHUL_KND_SC_NM),
      regionCode: r.ATPT_OFCDC_SC_CODE,
      regionName: r.ATPT_OFCDC_SC_NM,
      district: extractDistrict(r.ORG_RDNMA),
      address: `${r.ORG_RDNMA ?? ""} ${r.ORG_RDNDA ?? ""}`.trim(),
      displayName: `${r.SCHUL_NM} ${toShortRegion(r.LCTN_SC_NM)} ${extractDistrict(r.ORG_RDNMA)}`,
    }));

    return Response.json({
      data,
      meta: { source: "나이스 교육정보 (실시간)", total: data.length },
    });
  } catch {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "학교 검색 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

/** 학교종류명 → schoolType 키 */
function toSchoolTypeKey(nm: string): string {
  if (nm?.includes("초등")) return "elementary";
  if (nm?.includes("중학")) return "middle";
  return "high";
}

/** 도로명주소에서 시군구 추출 */
function extractDistrict(address: string | null): string {
  if (!address) return "";
  const parts = address.split(" ");
  return parts[1] ?? "";
}

/** 시도명 축약 */
function toShortRegion(lctnScNm: string): string {
  const map: Record<string, string> = {
    서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구",
    인천광역시: "인천", 광주광역시: "광주", 대전광역시: "대전",
    울산광역시: "울산", 세종특별자치시: "세종", 경기도: "경기",
    강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남",
    전북특별자치도: "전북", 전라남도: "전남", 경상북도: "경북",
    경상남도: "경남", 제주특별자치도: "제주",
  };
  return map[lctnScNm] ?? lctnScNm;
}
