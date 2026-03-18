import { searchSchools } from "@/lib/api/neis";

/**
 * 학교 실시간 검색 API (나이스 Open API 직접 조회)
 *
 * GET /api/schools/search?q=김해&type=elementary&limit=20
 *
 * 응답: 학교명 + 지역 (예: "김해초등학교 경남 김해시")
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const schoolType = searchParams.get("type"); // elementary, middle, high
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  if (!query || query.length < 1) {
    return Response.json({ data: [], meta: { total: 0 } });
  }

  // 학교급 한글명 변환
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
      schoolCode: r.SD_SCHUL_CODE, // 나이스 표준학교코드
      schoolName: r.SCHUL_NM, // 학교명
      schoolType: toSchoolTypeKey(r.SCHUL_KND_SC_NM), // elementary/middle/high
      regionCode: r.ATPT_OFCDC_SC_CODE, // 시도교육청코드
      regionName: r.ATPT_OFCDC_SC_NM, // 시도교육청명
      district: extractDistrict(r.ORG_RDNMA), // 시군구
      address: `${r.ORG_RDNMA ?? ""} ${r.ORG_RDNDA ?? ""}`.trim(), // 도로명주소
      // 검색 결과 표시용: "김해초등학교 경남 김해시"
      displayName: `${r.SCHUL_NM} ${toShortRegion(r.LCTN_SC_NM)} ${extractDistrict(r.ORG_RDNMA)}`,
    }));

    return Response.json({
      data,
      meta: { source: "나이스 교육정보", total: data.length },
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

/** 도로명주소에서 시군구 추출 (예: "대구광역시 북구 ..." → "북구") */
function extractDistrict(address: string | null): string {
  if (!address) return "";
  const parts = address.split(" ");
  return parts[1] ?? "";
}

/** 시도명 축약 (예: "서울특별시" → "서울", "경상남도" → "경남") */
function toShortRegion(lctnScNm: string): string {
  const map: Record<string, string> = {
    서울특별시: "서울",
    부산광역시: "부산",
    대구광역시: "대구",
    인천광역시: "인천",
    광주광역시: "광주",
    대전광역시: "대전",
    울산광역시: "울산",
    세종특별자치시: "세종",
    경기도: "경기",
    강원특별자치도: "강원",
    충청북도: "충북",
    충청남도: "충남",
    전북특별자치도: "전북",
    전라남도: "전남",
    경상북도: "경북",
    경상남도: "경남",
    제주특별자치도: "제주",
  };
  return map[lctnScNm] ?? lctnScNm;
}
