import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SchoolItem } from "@/lib/api/contracts/schools";

// --- Mocks (vi.mock은 hoisted되므로 inline factory에서 vi.fn 직접 사용) ---

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    school: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    region: { upsert: vi.fn() },
    teacherStats: { upsert: vi.fn() },
    $queryRaw: vi.fn(),
  },
  isDbConnected: vi.fn(),
}));

vi.mock("@/lib/api/neis", () => ({
  searchSchools: vi.fn(),
  getSchoolByCode: vi.fn(),
}));

vi.mock("@/lib/api/schoolinfo", () => ({
  fetchSchoolInfo: vi.fn().mockResolvedValue({ list: [] }),
  getSchoolOverview: vi.fn().mockResolvedValue([]),
  getTeacherPositions: vi.fn().mockResolvedValue([]),
  getAfterSchoolPrograms: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/services/mappers", () => ({
  mapNeisToSchoolItem: vi.fn((row: Record<string, string>) => ({
    schoolCode: row.SD_SCHUL_CODE ?? "API001",
    schoolName: row.SCHUL_NM ?? "API학교",
    schoolType: "elementary" as const,
    regionCode: row.ATPT_OFCDC_SC_CODE ?? "B10",
    district: "강동구",
    latitude: 37.55,
    longitude: 127.13,
    address: "서울 강동구",
  })),
  mapToTeacherStats: vi.fn(),
  mapToAfterSchoolPrograms: vi.fn().mockReturnValue([]),
  mapPrismaToSchoolDetail: vi.fn((school: Record<string, unknown>) => ({
    schoolCode: school.schoolCode,
    schoolName: school.schoolName,
    schoolType: school.schoolType,
    regionCode: school.regionCode,
    district: school.district,
    latitude: null,
    longitude: null,
    address: null,
    teacherStats: null,
    financeStats: null,
    afterschoolPrograms: [],
  })),
}));

vi.mock("@/lib/services/region-codes", () => ({
  atptToSidoCode: vi.fn().mockReturnValue("11"),
  getSggCodeAll: vi.fn().mockReturnValue("000"),
  toSchulKndCode: vi.fn().mockReturnValue("02"),
  toSchoolType: vi.fn().mockReturnValue("elementary"),
}));

// 실제 mock 데이터 사용
import { mockSchools } from "@/mocks/data/schools";
import { isDbConnected } from "@/lib/db/prisma";
import { prisma } from "@/lib/db/prisma";
import { searchSchools } from "@/lib/api/neis";

const mockedIsDbConnected = vi.mocked(isDbConnected);
const mockedSearchSchools = vi.mocked(searchSchools);
const mockedPrismaSchool = vi.mocked(prisma.school);

describe("school-data: getSchoolList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DB 연결 시 DB에서 학교 목록을 반환한다", async () => {
    mockedIsDbConnected.mockResolvedValue(true);
    mockedPrismaSchool.count.mockResolvedValue(2 as never);
    mockedPrismaSchool.findMany.mockResolvedValue([
      {
        schoolCode: "7130106",
        schoolName: "서울강동초등학교",
        schoolType: "elementary",
        regionCode: "B10",
        district: "강동구",
        latitude: 37.55,
        longitude: 127.13,
        address: "서울 강동구",
      },
      {
        schoolCode: "7130107",
        schoolName: "서울강명초등학교",
        schoolType: "elementary",
        regionCode: "B10",
        district: "강동구",
        latitude: 37.54,
        longitude: 127.15,
        address: "서울 강동구",
      },
    ] as never);

    const { getSchoolList } = await import("@/lib/services/school-data");
    const result = await getSchoolList({ page: 1, limit: 20 });

    expect(result.source).toBe("db");
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.data[0].schoolCode).toBe("7130106");
  });

  it("DB 미연결 + 검색어 있으면 API fallback", async () => {
    mockedIsDbConnected.mockResolvedValue(false);
    mockedSearchSchools.mockResolvedValue([
      {
        ATPT_OFCDC_SC_CODE: "B10",
        ATPT_OFCDC_SC_NM: "서울특별시교육청",
        SD_SCHUL_CODE: "API001",
        SCHUL_NM: "API테스트학교",
        SCHUL_KND_SC_NM: "초등학교",
        ORG_RDNMA: "서울 강동구",
        LCTN_SC_NM: "서울",
      } as never,
    ]);

    const { getSchoolList } = await import("@/lib/services/school-data");
    const result = await getSchoolList({ search: "API테스트", page: 1, limit: 20 });

    expect(result.source).toBe("api");
    expect(result.data).toHaveLength(1);
    expect(mockedSearchSchools).toHaveBeenCalled();
  });

  it("DB 미연결 + API 실패 시 Mock fallback", async () => {
    mockedIsDbConnected.mockResolvedValue(false);

    const { getSchoolList } = await import("@/lib/services/school-data");
    const result = await getSchoolList({ page: 1, limit: 5 });

    expect(result.source).toBe("mock");
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.length).toBeLessThanOrEqual(5);
  });

  it("검색 파라미터로 Mock 데이터를 필터링한다", async () => {
    mockedIsDbConnected.mockResolvedValue(false);
    // API도 빈 결과를 반환하여 Mock fallback 유도
    mockedSearchSchools.mockResolvedValue([]);

    const { getSchoolList } = await import("@/lib/services/school-data");
    const result = await getSchoolList({
      search: "강동초",
      page: 1,
      limit: 20,
    });

    expect(result.source).toBe("mock");
    result.data.forEach((s: SchoolItem) => {
      expect(s.schoolName).toContain("강동초");
    });
  });

  it("페이지네이션이 올바르게 적용된다 (Mock)", async () => {
    mockedIsDbConnected.mockResolvedValue(false);

    const { getSchoolList } = await import("@/lib/services/school-data");
    const page1 = await getSchoolList({ page: 1, limit: 2 });
    const page2 = await getSchoolList({ page: 2, limit: 2 });

    expect(page1.data).toHaveLength(2);
    if (mockSchools.length > 2) {
      expect(page2.data.length).toBeGreaterThan(0);
    }
    if (page2.data.length > 0) {
      expect(page1.data[0].schoolCode).not.toBe(page2.data[0].schoolCode);
    }
  });

  it("region 필터로 Mock 데이터를 필터링한다", async () => {
    mockedIsDbConnected.mockResolvedValue(false);

    const { getSchoolList } = await import("@/lib/services/school-data");
    const result = await getSchoolList({
      region: "B10",
      page: 1,
      limit: 100,
    });

    expect(result.source).toBe("mock");
    result.data.forEach((s: SchoolItem) => {
      expect(s.regionCode).toBe("B10");
    });
  });
});

describe("school-data: getSchoolDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DB 연결 시 DB에서 학교 상세를 반환한다", async () => {
    mockedIsDbConnected.mockResolvedValue(true);
    mockedPrismaSchool.findUnique.mockResolvedValue({
      schoolCode: "7130106",
      schoolName: "서울강동초등학교",
      schoolType: "elementary",
      regionCode: "B10",
      district: "강동구",
      latitude: null,
      longitude: null,
      address: null,
      teacherStats: [],
      financeStats: [],
      afterschoolProgram: [],
    } as never);

    const { getSchoolDetail } = await import("@/lib/services/school-data");
    const result = await getSchoolDetail("7130106");

    expect(result.source).toBe("db");
    expect(result.data).not.toBeNull();
    expect(result.data?.schoolCode).toBe("7130106");
  });

  it("DB 미연결 + API 실패 시 Mock fallback으로 상세를 반환한다", async () => {
    mockedIsDbConnected.mockResolvedValue(false);
    mockedSearchSchools.mockRejectedValue(new Error("API 실패"));

    const { getSchoolDetail } = await import("@/lib/services/school-data");
    const result = await getSchoolDetail("7130106");

    expect(result.source).toBe("mock");
  });

  it("존재하지 않는 학교 코드는 null을 반환한다", async () => {
    mockedIsDbConnected.mockResolvedValue(false);

    const { getSchoolDetail } = await import("@/lib/services/school-data");
    const result = await getSchoolDetail("NONEXISTENT");

    expect(result.data).toBeNull();
    expect(result.source).toBe("mock");
  });
});
