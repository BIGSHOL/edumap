import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academyStats: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  isDbConnected: vi.fn(),
}));

vi.mock("@/lib/api/academy", () => ({
  getAcademiesByRegion: vi.fn(),
}));

import { isDbConnected, prisma } from "@/lib/db/prisma";
import { getAcademiesByRegion } from "@/lib/api/academy";

const mockedIsDbConnected = vi.mocked(isDbConnected);
const mockedGetAcademiesByRegion = vi.mocked(getAcademiesByRegion);
const mockedAcademyStats = vi.mocked(prisma.academyStats);

describe("academy-data: getAcademyStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DB 연결 시 DB에서 학원 통계를 반환한다", async () => {
    mockedIsDbConnected.mockResolvedValue(true);
    mockedAcademyStats.findMany.mockResolvedValue([
      {
        regionCode: "B10",
        district: "강남구",
        year: 2024,
        totalAcademies: 1823,
        totalCapacity: 45000,
        academyByRealm: { "입시.검정 및 보습": 987 },
      },
    ] as never);

    const { getAcademyStats } = await import("@/lib/services/academy-data");
    const result = await getAcademyStats({ regionCode: "B10" });

    expect(result.source).toBe("db");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].totalAcademies).toBe(1823);
    expect(result.data[0].district).toBe("강남구");
  });

  it("DB 미연결 시 API fallback", async () => {
    mockedIsDbConnected.mockResolvedValue(false);
    mockedGetAcademiesByRegion.mockResolvedValue([
      {
        ATPT_OFCDC_SC_CODE: "B10",
        ADMST_ZONE_NM: "강동구",
        ACA_NM: "테스트학원",
        REALM_SC_NM: "입시.검정 및 보습",
        DTM_RCPTN_ABLTY_NMPR_SMTOT: "50",
      } as never,
      {
        ATPT_OFCDC_SC_CODE: "B10",
        ADMST_ZONE_NM: "강동구",
        ACA_NM: "테스트학원2",
        REALM_SC_NM: "체육",
        DTM_RCPTN_ABLTY_NMPR_SMTOT: "30",
      } as never,
    ]);

    const { getAcademyStats } = await import("@/lib/services/academy-data");
    const result = await getAcademyStats({ regionCode: "B10" });

    expect(result.source).toBe("api");
    expect(result.data).toHaveLength(1); // 같은 구 -> 1건 집계
    expect(result.data[0].district).toBe("강동구");
    expect(result.data[0].totalAcademies).toBe(2);
  });

  it("DB 미연결 + API 실패 시 Mock fallback", async () => {
    mockedIsDbConnected.mockResolvedValue(false);
    mockedGetAcademiesByRegion.mockRejectedValue(new Error("API 에러"));

    const { getAcademyStats } = await import("@/lib/services/academy-data");
    const result = await getAcademyStats({ regionCode: "B10" });

    expect(result.source).toBe("mock");
    expect(result.data.length).toBeGreaterThan(0);
    result.data.forEach((s) => {
      expect(s.regionCode).toBe("B10");
    });
  });

  it("district 필터가 적용된다 (DB)", async () => {
    mockedIsDbConnected.mockResolvedValue(true);
    mockedAcademyStats.findMany.mockResolvedValue([
      {
        regionCode: "B10",
        district: "강남구",
        year: 2024,
        totalAcademies: 500,
        totalCapacity: 10000,
        academyByRealm: {},
      },
    ] as never);

    const { getAcademyStats } = await import("@/lib/services/academy-data");
    const result = await getAcademyStats({
      regionCode: "B10",
      district: "강남구",
    });

    expect(result.source).toBe("db");
    expect(mockedAcademyStats.findMany).toHaveBeenCalledWith({
      where: { regionCode: "B10", year: 2024, district: "강남구" },
    });
  });

  it("API 타임아웃 시 Mock fallback으로 전환한다", async () => {
    mockedIsDbConnected.mockResolvedValue(false);
    // 5초 이상 걸리는 API 시뮬레이션
    mockedGetAcademiesByRegion.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 10000))
    );

    const { getAcademyStats } = await import("@/lib/services/academy-data");
    const result = await getAcademyStats({ regionCode: "B10" });

    // 타임아웃으로 mock fallback
    expect(result.source).toBe("mock");
  }, 15000);

  it("DB에 데이터가 없으면 API로 넘어간다", async () => {
    mockedIsDbConnected.mockResolvedValue(true);
    mockedAcademyStats.findMany.mockResolvedValue([] as never);
    mockedGetAcademiesByRegion.mockResolvedValue([
      {
        ATPT_OFCDC_SC_CODE: "B10",
        ADMST_ZONE_NM: "송파구",
        ACA_NM: "학원A",
        REALM_SC_NM: "예능(음악)",
        DTM_RCPTN_ABLTY_NMPR_SMTOT: "20",
      } as never,
    ]);

    const { getAcademyStats } = await import("@/lib/services/academy-data");
    const result = await getAcademyStats({ regionCode: "B10" });

    expect(result.source).toBe("api");
    expect(result.data[0].district).toBe("송파구");
  });
});

describe("academy-data: mapRealmToGapCategory", () => {
  it("교습영역을 GapCategory로 변환한다", async () => {
    const { mapRealmToGapCategory } = await import(
      "@/lib/services/academy-data"
    );

    expect(mapRealmToGapCategory("입시.검정 및 보습")).toBe("academic");
    expect(mapRealmToGapCategory("예능(음악)")).toBe("arts");
    expect(mapRealmToGapCategory("체육")).toBe("sports");
    expect(mapRealmToGapCategory("직업기술")).toBe("technology");
    expect(mapRealmToGapCategory("국제화")).toBe("language");
    expect(mapRealmToGapCategory("알 수 없는 영역")).toBeNull();
  });
});

describe("academy-data: realmToGapCategoryCounts", () => {
  it("교습영역별 학원 수를 카테고리별로 집계한다", async () => {
    const { realmToGapCategoryCounts } = await import(
      "@/lib/services/academy-data"
    );

    const result = realmToGapCategoryCounts({
      "입시.검정 및 보습": 100,
      "인문사회": 20,
      "예능(음악)": 30,
      "예능(미술)": 15,
      "체육": 40,
    });

    expect(result.academic).toBe(120); // 입시 + 인문사회
    expect(result.arts).toBe(45); // 음악 + 미술
    expect(result.sports).toBe(40);
  });
});
