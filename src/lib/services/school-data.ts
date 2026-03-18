/**
 * 학교 데이터 Cache-Through 서비스
 *
 * 데이터 조회 우선순위:
 *   1. DB (Prisma) — 캐시 히트
 *   2. 공공 API (나이스 + 학교알리미) — 실시간 조회 후 DB에 캐싱
 *   3. Mock 데이터 — API도 실패 시 fallback
 */

import { prisma } from "@/lib/db/prisma";
import { searchSchools, getSchoolByCode } from "@/lib/api/neis";
import type { NeisSchoolRow } from "@/lib/api/neis";
import {
  fetchSchoolInfo,
  getSchoolOverview,
  getTeacherPositions,
  getAfterSchoolPrograms,
} from "@/lib/api/schoolinfo";
import type {
  SchoolOverviewRow,
  TeacherPositionRow,
  AfterSchoolRow,
} from "@/lib/api/schoolinfo";
import { mockSchools, mockSchoolDetail } from "@/mocks/data/schools";
import {
  mapNeisToSchoolItem,
  mapToTeacherStats,
  mapToAfterSchoolPrograms,
  mapPrismaToSchoolDetail,
} from "./mappers";
import {
  atptToSidoCode,
  getSggCodeAll,
  toSchulKndCode,
  toSchoolType,
} from "./region-codes";
import type { DataSource } from "./utils";
import type { SchoolDetail, SchoolItem } from "@/lib/api/contracts/schools";

const CURRENT_YEAR = "2024"; // 학교알리미 공시 기준연도

// ─── 학교 목록 ───

export async function getSchoolList(filters: {
  region?: string;
  type?: string;
  search?: string;
  district?: string;
  page: number;
  limit: number;
}): Promise<{ data: SchoolItem[]; total: number; source: DataSource }> {
  // 1. Try DB
  try {
    const where: Record<string, unknown> = {};
    if (filters.region) where.regionCode = filters.region;
    if (filters.type) where.schoolType = filters.type;
    if (filters.search) where.schoolName = { contains: filters.search };
    if (filters.district) where.district = filters.district;

    const [total, schools] = await Promise.all([
      prisma.school.count({ where }),
      prisma.school.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { schoolName: "asc" },
      }),
    ]);

    if (schools.length > 0) {
      const data = schools.map((s) => ({
        schoolCode: s.schoolCode,
        schoolName: s.schoolName,
        schoolType: s.schoolType as "elementary" | "middle" | "high",
        regionCode: s.regionCode,
        district: s.district,
        latitude: s.latitude,
        longitude: s.longitude,
        address: s.address,
      }));
      return { data, total, source: "db" };
    }
  } catch {
    // DB 미연결
  }

  // 2. Try NEIS API (검색어가 있을 때만 — 전체 목록 조회는 비효율)
  if (filters.search) {
    try {
      const neisParams: {
        SCHUL_NM?: string;
        SCHUL_KND_SC_NM?: string;
        ATPT_OFCDC_SC_CODE?: string;
        pSize?: number;
      } = {
        SCHUL_NM: filters.search,
        pSize: filters.limit,
      };

      if (filters.type) {
        const typeMap: Record<string, string> = {
          elementary: "초등학교",
          middle: "중학교",
          high: "고등학교",
        };
        neisParams.SCHUL_KND_SC_NM = typeMap[filters.type];
      }
      if (filters.region) {
        neisParams.ATPT_OFCDC_SC_CODE = filters.region;
      }

      const rows = await searchSchools(neisParams);
      if (rows.length > 0) {
        const data = rows.map(mapNeisToSchoolItem);
        // DB에 비동기 캐싱
        cacheSchoolItems(rows).catch(() => {});
        return { data, total: data.length, source: "api" };
      }
    } catch {
      // API 실패
    }
  }

  // 3. Mock fallback
  let filtered = [...mockSchools];
  if (filters.region)
    filtered = filtered.filter((s) => s.regionCode === filters.region);
  if (filters.type)
    filtered = filtered.filter((s) => s.schoolType === filters.type);
  if (filters.search)
    filtered = filtered.filter((s) =>
      s.schoolName.includes(filters.search!)
    );

  const total = filtered.length;
  const data = filtered.slice(
    (filters.page - 1) * filters.limit,
    filters.page * filters.limit
  );
  return { data, total, source: "mock" };
}

// ─── 학교 상세 ───

export async function getSchoolDetail(
  schoolCode: string
): Promise<{ data: SchoolDetail | null; source: DataSource }> {
  // 1. Try DB
  try {
    const school = await prisma.school.findUnique({
      where: { schoolCode },
      include: {
        teacherStats: { where: { year: 2024 }, take: 1 },
        financeStats: { where: { year: 2024 }, take: 1 },
        afterschoolProgram: { where: { year: 2024 } },
      },
    });

    if (school) {
      return { data: mapPrismaToSchoolDetail(school), source: "db" };
    }
  } catch {
    // DB 미연결
  }

  // 2. Try public APIs
  try {
    const detail = await fetchSchoolDetailFromApis(schoolCode);
    if (detail) {
      // DB에 비동기 캐싱
      cacheSchoolDetail(detail).catch(() => {});
      return { data: detail, source: "api" };
    }
  } catch {
    // API 실패
  }

  // 3. Mock fallback
  const mockItem = mockSchools.find((s) => s.schoolCode === schoolCode);
  if (!mockItem) return { data: null, source: "mock" };

  if (schoolCode === mockSchoolDetail.schoolCode) {
    return { data: mockSchoolDetail, source: "mock" };
  }
  return {
    data: {
      ...mockItem,
      teacherStats: null,
      financeStats: null,
      afterschoolPrograms: [],
    },
    source: "mock",
  };
}

// ─── 다수 학교 위험도 경량 조회 (대시보드용) ───

export interface RiskRawData {
  schoolCode: string;
  schoolName: string;
  studentsPerTeacher: number | null;
  tempTeacherRatio: number | null;
  budgetPerStudent: number | null;
  programCount: number;
  // 7요인 확장
  femaleTeachers: number | null;
  maleTeachers: number | null;
  lecturerCount: number | null;
  totalTeachers: number | null;
  currentClasses: number | null;
  authorizedClasses: number | null;
  totalStudents: number | null;
}

/**
 * 위험도 계산에 필요한 최소 필드만 조회 (대시보드 성능 최적화)
 * - afterschoolProgram 본문 대신 _count만 사용
 * - financeStats/teacherStats에서 필요한 숫자 컬럼만 select
 */
export async function getSchoolRiskData(filters?: {
  region?: string;
  district?: string;
}): Promise<{ data: RiskRawData[]; source: DataSource }> {
  // 1. Try DB — 경량 쿼리
  try {
    const where: Record<string, unknown> = {};
    if (filters?.region) where.regionCode = filters.region;
    if (filters?.district) where.district = filters.district;

    const schools = await prisma.school.findMany({
      where,
      select: {
        schoolCode: true,
        schoolName: true,
        teacherStats: {
          where: { year: 2024 },
          select: {
            studentsPerTeacher: true,
            tempTeacherRatio: true,
            totalTeachers: true,
            totalStudents: true,
            femaleTeachers: true,
            maleTeachers: true,
            lecturerCount: true,
            currentClasses: true,
            authorizedClasses: true,
          },
          take: 1,
        },
        financeStats: {
          where: { year: 2024 },
          select: { budgetPerStudent: true },
          take: 1,
        },
        _count: { select: { afterschoolProgram: true } },
      },
    });

    if (schools.length > 0) {
      return {
        data: schools.map((s) => {
          const ts = s.teacherStats[0];
          return {
            schoolCode: s.schoolCode,
            schoolName: s.schoolName,
            studentsPerTeacher: ts?.studentsPerTeacher ?? null,
            tempTeacherRatio: ts?.tempTeacherRatio ?? null,
            budgetPerStudent: s.financeStats[0]?.budgetPerStudent ?? null,
            programCount: s._count.afterschoolProgram,
            femaleTeachers: ts?.femaleTeachers ?? null,
            maleTeachers: ts?.maleTeachers ?? null,
            lecturerCount: ts?.lecturerCount ?? null,
            totalTeachers: ts?.totalTeachers ?? null,
            currentClasses: ts?.currentClasses ?? null,
            authorizedClasses: ts?.authorizedClasses ?? null,
            totalStudents: ts?.totalStudents ?? null,
          };
        }),
        source: "db",
      };
    }
  } catch {
    // DB 미연결
  }

  // 2. Fallback: 기존 getSchoolDetails 사용
  const result = await getSchoolDetails(filters);
  return {
    data: result.data.map((d) => ({
      schoolCode: d.schoolCode,
      schoolName: d.schoolName,
      studentsPerTeacher: d.teacherStats?.studentsPerTeacher ?? null,
      tempTeacherRatio: d.teacherStats?.tempTeacherRatio ?? null,
      budgetPerStudent: d.financeStats?.budgetPerStudent ?? null,
      programCount: d.afterschoolPrograms.length,
      femaleTeachers: d.teacherStats?.femaleTeachers ?? null,
      maleTeachers: d.teacherStats?.maleTeachers ?? null,
      lecturerCount: d.teacherStats?.lecturerCount ?? null,
      totalTeachers: d.teacherStats?.totalTeachers ?? null,
      currentClasses: d.teacherStats?.currentClasses ?? null,
      authorizedClasses: d.teacherStats?.authorizedClasses ?? null,
      totalStudents: d.teacherStats?.totalStudents ?? null,
    })),
    source: result.source,
  };
}

// ─── 다수 학교 상세 (gapmap, 개별 리포트용) ───

export async function getSchoolDetails(filters?: {
  schoolCode?: string;
  region?: string;
  district?: string;
}): Promise<{ data: SchoolDetail[]; source: DataSource }> {
  // 개별 학교 조회
  if (filters?.schoolCode) {
    const result = await getSchoolDetail(filters.schoolCode);
    return {
      data: result.data ? [result.data] : [],
      source: result.source,
    };
  }

  // 1. Try DB (전체/지역 조회)
  try {
    const where: Record<string, unknown> = {};
    if (filters?.region) where.regionCode = filters.region;
    if (filters?.district) where.district = filters.district;

    const schools = await prisma.school.findMany({
      where,
      include: {
        teacherStats: { where: { year: 2024 }, take: 1 },
        financeStats: { where: { year: 2024 }, take: 1 },
        afterschoolProgram: { where: { year: 2024 }, take: 10 },
      },
    });

    if (schools.length > 0) {
      return {
        data: schools.map(mapPrismaToSchoolDetail),
        source: "db",
      };
    }
  } catch {
    // DB 미연결
  }

  // 2. Try 학교알리미 API (지역 전체 조회)
  if (filters?.region) {
    try {
      const details = await fetchRegionSchoolDetails(filters.region);
      if (details.length > 0) {
        // DB에 비동기 캐싱
        for (const d of details) {
          cacheSchoolDetail(d).catch(() => {});
        }
        return { data: details, source: "api" };
      }
    } catch {
      // API 실패
    }
  }

  // 3. Mock fallback
  return { data: [mockSchoolDetail], source: "mock" };
}

// ─── 내부: 공공 API → SchoolDetail ───

/**
 * 단일 학교의 상세 정보를 공공 API에서 조회
 *
 * 1. NEIS에서 기본 정보 조회 (학교코드로 검색)
 * 2. 학교알리미에서 교원/방과후 정보 조회 (지역 전체 → 학교명으로 필터)
 */
async function fetchSchoolDetailFromApis(
  schoolCode: string
): Promise<SchoolDetail | null> {
  // NEIS에서 학교 검색 (모든 시도교육청에서 검색)
  let neisSchool: NeisSchoolRow | null = null;

  // 먼저 mock schoolCode 패턴이면 학교명으로 검색
  const mockItem = mockSchools.find((s) => s.schoolCode === schoolCode);
  if (mockItem) {
    const rows = await searchSchools({ SCHUL_NM: mockItem.schoolName });
    neisSchool = rows[0] ?? null;
  }

  // NEIS 학교코드 형태(숫자 7자리)이면 직접 조회 시도
  if (!neisSchool && /^\d{7}$/.test(schoolCode)) {
    // 모든 시도교육청에서 검색
    const atptCodes = [
      "B10", "C10", "D10", "E10", "F10", "G10", "H10",
      "I10", "J10", "K10", "M10", "N10", "P10", "Q10",
      "R10", "S10", "T10",
    ];
    for (const atpt of atptCodes) {
      neisSchool = await getSchoolByCode(atpt, schoolCode);
      if (neisSchool) break;
    }
  }

  if (!neisSchool) return null;

  const schoolItem = mapNeisToSchoolItem(neisSchool);
  const sidoCode = atptToSidoCode(neisSchool.ATPT_OFCDC_SC_CODE);
  const sggCode = getSggCodeAll(sidoCode);
  const schulKndCode = toSchulKndCode(schoolItem.schoolType);

  // 학교알리미에서 교원+방과후 정보 조회 (병렬)
  const [overviewResult, positionsResult, afterSchoolResult] =
    await Promise.all([
      fetchSchoolInfo<SchoolOverviewRow>({
        apiType: "09",
        schulKndCode,
        sidoCode,
        sggCode,
        pbanYr: CURRENT_YEAR,
        pSize: 1000,
      }),
      fetchSchoolInfo<TeacherPositionRow>({
        apiType: "17",
        schulKndCode,
        sidoCode,
        sggCode,
        pbanYr: CURRENT_YEAR,
        pSize: 1000,
      }),
      fetchSchoolInfo<AfterSchoolRow>({
        apiType: "59",
        schulKndCode,
        sidoCode,
        sggCode,
        pbanYr: CURRENT_YEAR,
        pSize: 1000,
      }),
    ]);

  // 학교명으로 매칭 (학교알리미 SCHUL_CODE ≠ NEIS SD_SCHUL_CODE)
  const schoolName = neisSchool.SCHUL_NM;
  const overview = overviewResult.list?.find(
    (r) => r.SCHUL_NM === schoolName
  );
  const positions = positionsResult.list?.find(
    (r) => r.SCHUL_NM === schoolName
  );
  const afterSchool = afterSchoolResult.list?.find(
    (r) => r.SCHUL_NM === schoolName
  );

  return {
    ...schoolItem,
    teacherStats: mapToTeacherStats(
      overview,
      positions,
      Number(CURRENT_YEAR)
    ),
    financeStats: null, // 재정 데이터는 학교알리미 API에서 미제공
    afterschoolPrograms: afterSchool
      ? mapToAfterSchoolPrograms(
          afterSchool.SUM_ASL_PGM_FGR,
          afterSchool.ASL_PTPT_STDNT_FGR,
          afterSchool.ASL_CURR_PGM_FGR,
          afterSchool.ASL_SPABL_APTD_PGM_FGR,
          afterSchool.ASL_CURR_REG_STDNT_FGR, // 교과 수강학생수
          afterSchool.ASL_SPABL_APTD_REG_STDNT_FGR, // 특기적성 수강학생수
          afterSchool.SUM_ASL_REG_STDNT_FGR // 수강 연인원
        )
      : [],
  };
}

/**
 * 지역 전체 학교의 상세 정보를 조회 (early-alert, gapmap용)
 */
async function fetchRegionSchoolDetails(
  regionCode: string
): Promise<SchoolDetail[]> {
  const sidoCode = atptToSidoCode(regionCode);
  const sggCode = getSggCodeAll(sidoCode);

  // 초등학교 기준으로 전체 페이지 수집 (fetchAllPages 사용)
  const [overviews, positions, afterSchools] =
    await Promise.all([
      getSchoolOverview(sidoCode, sggCode, "02", CURRENT_YEAR),
      getTeacherPositions(sidoCode, sggCode, "02", CURRENT_YEAR),
      getAfterSchoolPrograms(sidoCode, sggCode, "02", CURRENT_YEAR),
    ]);

  const positionsMap = new Map(
    positions.map((r) => [r.SCHUL_NM, r])
  );
  const afterSchoolMap = new Map(
    afterSchools.map((r) => [r.SCHUL_NM, r])
  );

  return overviews.map((ov) => {
    const pos = positionsMap.get(ov.SCHUL_NM);
    const afs = afterSchoolMap.get(ov.SCHUL_NM);

    return {
      schoolCode: ov.SCHUL_CODE,
      schoolName: ov.SCHUL_NM,
      schoolType: toSchoolType(ov.SCHUL_KND_SC_CODE === "02" ? "초등학교" : "중학교"),
      regionCode: regionCode,
      district: ov.ADRCD_NM ?? "",
      latitude: null,
      longitude: null,
      address: null,
      teacherStats: mapToTeacherStats(ov, pos, Number(CURRENT_YEAR)),
      financeStats: null,
      afterschoolPrograms: afs
        ? mapToAfterSchoolPrograms(
            afs.SUM_ASL_PGM_FGR,
            afs.ASL_PTPT_STDNT_FGR,
            afs.ASL_CURR_PGM_FGR,
            afs.ASL_SPABL_APTD_PGM_FGR,
            afs.ASL_CURR_REG_STDNT_FGR,
            afs.ASL_SPABL_APTD_REG_STDNT_FGR,
            afs.SUM_ASL_REG_STDNT_FGR
          )
        : [],
    };
  });
}

// ─── 내부: DB 캐싱 ───

/** NEIS 학교 기본정보를 DB에 캐싱 */
async function cacheSchoolItems(rows: NeisSchoolRow[]): Promise<void> {
  try {
    for (const row of rows) {
      const item = mapNeisToSchoolItem(row);

      // Region upsert
      await prisma.region.upsert({
        where: { regionCode: item.regionCode },
        update: {},
        create: {
          regionCode: item.regionCode,
          regionName: row.ATPT_OFCDC_SC_NM,
        },
      });

      // School upsert (메타 필드 포함)
      await prisma.school.upsert({
        where: { schoolCode: item.schoolCode },
        update: {
          schoolName: item.schoolName,
          address: item.address,
          foundationType: item.foundationType,
          foundationDate: item.foundationDate,
          phoneNumber: item.phoneNumber,
          homepageUrl: item.homepageUrl,
          coeducationType: item.coeducationType,
          highSchoolType: item.highSchoolType,
          dayNightType: item.dayNightType,
        },
        create: {
          schoolCode: item.schoolCode,
          schoolName: item.schoolName,
          schoolType: item.schoolType,
          regionCode: item.regionCode,
          district: item.district,
          latitude: item.latitude,
          longitude: item.longitude,
          address: item.address,
          foundationType: item.foundationType,
          foundationDate: item.foundationDate,
          phoneNumber: item.phoneNumber,
          homepageUrl: item.homepageUrl,
          coeducationType: item.coeducationType,
          highSchoolType: item.highSchoolType,
          dayNightType: item.dayNightType,
          dataUpdatedAt: new Date(),
        },
      });
    }
  } catch {
    // DB 캐싱 실패는 무시
  }
}

/** SchoolDetail을 DB에 캐싱 */
async function cacheSchoolDetail(detail: SchoolDetail): Promise<void> {
  try {
    // Region upsert
    await prisma.region.upsert({
      where: { regionCode: detail.regionCode },
      update: {},
      create: {
        regionCode: detail.regionCode,
        regionName: detail.regionCode,
      },
    });

    // School upsert (메타 필드 포함)
    await prisma.school.upsert({
      where: { schoolCode: detail.schoolCode },
      update: {
        schoolName: detail.schoolName,
        address: detail.address,
        foundationType: detail.foundationType ?? undefined,
        foundationDate: detail.foundationDate ?? undefined,
        phoneNumber: detail.phoneNumber ?? undefined,
        homepageUrl: detail.homepageUrl ?? undefined,
        coeducationType: detail.coeducationType ?? undefined,
        highSchoolType: detail.highSchoolType ?? undefined,
        dayNightType: detail.dayNightType ?? undefined,
        dataUpdatedAt: new Date(),
      },
      create: {
        schoolCode: detail.schoolCode,
        schoolName: detail.schoolName,
        schoolType: detail.schoolType,
        regionCode: detail.regionCode,
        district: detail.district,
        latitude: detail.latitude,
        longitude: detail.longitude,
        address: detail.address,
        foundationType: detail.foundationType ?? null,
        foundationDate: detail.foundationDate ?? null,
        phoneNumber: detail.phoneNumber ?? null,
        homepageUrl: detail.homepageUrl ?? null,
        coeducationType: detail.coeducationType ?? null,
        highSchoolType: detail.highSchoolType ?? null,
        dayNightType: detail.dayNightType ?? null,
        dataUpdatedAt: new Date(),
      },
    });

    // TeacherStats upsert (확장 필드 포함)
    if (detail.teacherStats) {
      const ts = detail.teacherStats;
      await prisma.teacherStats.upsert({
        where: {
          idx_teacher_school_year: {
            schoolCode: detail.schoolCode,
            year: ts.year,
          },
        },
        update: {
          studentsPerTeacher: ts.studentsPerTeacher,
          tempTeacherRatio: ts.tempTeacherRatio,
          totalTeachers: ts.totalTeachers,
          totalStudents: ts.totalStudents,
          femaleTeachers: ts.femaleTeachers ?? undefined,
          maleTeachers: ts.maleTeachers ?? undefined,
          lecturerCount: ts.lecturerCount ?? undefined,
          currentClasses: ts.currentClasses ?? undefined,
          authorizedClasses: ts.authorizedClasses ?? undefined,
        },
        create: {
          schoolCode: detail.schoolCode,
          year: ts.year,
          studentsPerTeacher: ts.studentsPerTeacher,
          tempTeacherRatio: ts.tempTeacherRatio,
          totalTeachers: ts.totalTeachers,
          totalStudents: ts.totalStudents,
          femaleTeachers: ts.femaleTeachers ?? null,
          maleTeachers: ts.maleTeachers ?? null,
          lecturerCount: ts.lecturerCount ?? null,
          currentClasses: ts.currentClasses ?? null,
          authorizedClasses: ts.authorizedClasses ?? null,
          source: "schoolinfo",
        },
      });
    }
  } catch {
    // DB 캐싱 실패는 무시
  }
}
