/**
 * 학구도 데이터 서비스
 *
 * Cache-Through 패턴: DB(캐시) → 공공API → Mock fallback
 *
 * 출처: 전국학교학구도연계정보표준데이터 (data.go.kr)
 */

import { prisma, isDbConnected } from "@/lib/db/prisma";
import {
  getDistrictZonesByRegion,
  getDistrictZonesByEduSupport,
  searchDistrictZonesBySchool,
  type DistrictZoneRow,
} from "@/lib/api/district-zone";
import { atptToCddcCode } from "@/lib/services/region-codes";
import type { DataSource } from "./utils";

/** 학구 매핑 (학구ID → 소속 학교들) */
export interface ZoneMapping {
  zoneId: string;
  schoolNames: string[]; // 학교명 (기존 School 테이블과 매칭용)
  schoolIds: string[]; // 학구도 API의 schoolId
  eduSupportCode: string;
  eduSupportName: string;
  schoolLevel: string; // 대표 학교급
}

/** 교육지원청 정보 */
export interface EduSupportOffice {
  code: string;
  name: string;
  zoneCount: number;
}

// ──── Mock 데이터 (API 키 없을 때 fallback) ────

const MOCK_ZONES: ZoneMapping[] = [
  {
    zoneId: "ZONE-B10-001",
    schoolNames: ["서울대학교사범대학부설초등학교", "경복중학교"],
    schoolIds: ["B100000465", "B100000466"],
    eduSupportCode: "B11",
    eduSupportName: "서울특별시동부교육지원청",
    schoolLevel: "초등학교",
  },
  {
    zoneId: "ZONE-C10-001",
    schoolNames: ["부산진초등학교"],
    schoolIds: ["C100000123"],
    eduSupportCode: "C11",
    eduSupportName: "부산광역시동래교육지원청",
    schoolLevel: "초등학교",
  },
];

// ──── API 응답 → ZoneMapping 변환 ────

function groupByZone(rows: DistrictZoneRow[]): ZoneMapping[] {
  const zoneMap = new Map<string, ZoneMapping>();

  for (const row of rows) {
    const existing = zoneMap.get(row.atndsklId);
    if (existing) {
      existing.schoolNames.push(row.schulNm);
      existing.schoolIds.push(row.schoolId);
    } else {
      zoneMap.set(row.atndsklId, {
        zoneId: row.atndsklId,
        schoolNames: [row.schulNm],
        schoolIds: [row.schoolId],
        eduSupportCode: row.edcSport,
        eduSupportName: row.edcSportNm,
        schoolLevel: row.enfsType,
      });
    }
  }

  return Array.from(zoneMap.values());
}

/** API 응답 → DB 캐싱 (비동기, 실패 무시) */
async function cacheZonesToDb(rows: DistrictZoneRow[]): Promise<void> {
  try {
    for (const row of rows) {
      await prisma.districtZone.upsert({
        where: {
          idx_zone_school: {
            zoneId: row.atndsklId,
            schoolId: row.schoolId,
          },
        },
        update: {
          schoolName: row.schulNm,
          schoolLevel: row.enfsType,
          sidoEduCode: row.cddcCode,
          sidoEduName: row.cddcNm,
          eduSupportCode: row.edcSport,
          eduSupportName: row.edcSportNm,
          referenceDate: row.referenceDate ?? null,
        },
        create: {
          zoneId: row.atndsklId,
          schoolId: row.schoolId,
          schoolName: row.schulNm,
          schoolLevel: row.enfsType,
          sidoEduCode: row.cddcCode,
          sidoEduName: row.cddcNm,
          eduSupportCode: row.edcSport,
          eduSupportName: row.edcSportNm,
          referenceDate: row.referenceDate ?? null,
        },
      });
    }
  } catch {
    // DB 캐싱 실패는 무시
  }
}

// ──── 메인 서비스 함수 ────

/**
 * 시도교육청 기준 학구 목록 조회
 *
 * @param regionCode NEIS ATPT코드 (B10 등)
 * @param eduSupportCode 교육지원청코드 (선택)
 */
export async function getZonesByRegion(
  regionCode: string,
  eduSupportCode?: string
): Promise<{ data: ZoneMapping[]; source: DataSource }> {
  // 1. DB 캐시 조회 (fast-fail if disconnected)
  if (await isDbConnected()) {
    try {
      const where: Record<string, string> = { sidoEduCode: regionCode };
      if (eduSupportCode) where.eduSupportCode = eduSupportCode;

      const dbRows = await prisma.districtZone.findMany({ where });
      if (dbRows.length > 0) {
        const rows: DistrictZoneRow[] = dbRows.map((r) => ({
          atndsklId: r.zoneId,
          schoolId: r.schoolId,
          schulNm: r.schoolName,
          enfsType: r.schoolLevel,
          cddcCode: r.sidoEduCode,
          cddcNm: r.sidoEduName,
          edcSport: r.eduSupportCode,
          edcSportNm: r.eduSupportName,
          referenceDate: r.referenceDate ?? undefined,
        }));
        return { data: groupByZone(rows), source: "db" };
      }
    } catch {
      // DB 에러
    }
  }

  // 2. 공공 API 조회
  try {
    const cddcCode = atptToCddcCode(regionCode);
    let apiRows: DistrictZoneRow[];

    if (eduSupportCode) {
      apiRows = await getDistrictZonesByEduSupport(eduSupportCode);
    } else {
      apiRows = await getDistrictZonesByRegion(cddcCode);
    }

    if (apiRows.length > 0) {
      // 비동기 DB 캐싱
      cacheZonesToDb(apiRows).catch(() => {});
      return { data: groupByZone(apiRows), source: "api" };
    }
  } catch {
    // API 실패 → Mock fallback
  }

  // 3. Mock fallback
  const mockData = MOCK_ZONES.filter((z) => {
    const matchRegion = z.schoolIds.some((id) =>
      id.startsWith(regionCode.charAt(0))
    );
    if (eduSupportCode) return matchRegion && z.eduSupportCode === eduSupportCode;
    return matchRegion;
  });
  return { data: mockData, source: "mock" };
}

/**
 * 학교명으로 소속 학구 조회
 */
export async function getZonesForSchool(
  schoolName: string
): Promise<{ data: ZoneMapping[]; source: DataSource }> {
  // 1. DB (fast-fail if disconnected)
  if (await isDbConnected()) {
    try {
      const dbRows = await prisma.districtZone.findMany({
        where: { schoolName: { contains: schoolName } },
      });
      if (dbRows.length > 0) {
        const rows: DistrictZoneRow[] = dbRows.map((r) => ({
          atndsklId: r.zoneId,
          schoolId: r.schoolId,
          schulNm: r.schoolName,
          enfsType: r.schoolLevel,
          cddcCode: r.sidoEduCode,
          cddcNm: r.sidoEduName,
          edcSport: r.eduSupportCode,
          edcSportNm: r.eduSupportName,
        }));
        return { data: groupByZone(rows), source: "db" };
      }
    } catch {
      // DB 에러
    }
  }

  // 2. API
  try {
    const apiRows = await searchDistrictZonesBySchool(schoolName);
    if (apiRows.length > 0) {
      cacheZonesToDb(apiRows).catch(() => {});
      return { data: groupByZone(apiRows), source: "api" };
    }
  } catch {
    // API 실패
  }

  // 3. Mock
  const mockData = MOCK_ZONES.filter((z) =>
    z.schoolNames.some((n) => n.includes(schoolName))
  );
  return { data: mockData, source: "mock" };
}

/**
 * 교육지원청 목록 조회 (필터 드롭다운용)
 */
export async function getEduSupportOffices(
  regionCode?: string
): Promise<{ data: EduSupportOffice[]; source: DataSource }> {
  // 1. DB — groupBy로 교육지원청별 학구 수 (fast-fail if disconnected)
  if (await isDbConnected()) {
    try {
      const where = regionCode ? { sidoEduCode: regionCode } : {};
      const grouped = await prisma.districtZone.groupBy({
        by: ["eduSupportCode", "eduSupportName"],
        where,
        _count: { zoneId: true },
      });

      if (grouped.length > 0) {
        const codeToZones = new Map<string, Set<string>>();
        const codeToName = new Map<string, string>();

        const allRows = await prisma.districtZone.findMany({
          where,
          select: { eduSupportCode: true, eduSupportName: true, zoneId: true },
        });

        for (const row of allRows) {
          if (!codeToZones.has(row.eduSupportCode)) {
            codeToZones.set(row.eduSupportCode, new Set());
            codeToName.set(row.eduSupportCode, row.eduSupportName);
          }
          codeToZones.get(row.eduSupportCode)!.add(row.zoneId);
        }

        const data: EduSupportOffice[] = Array.from(codeToZones.entries()).map(
          ([code, zones]) => ({
            code,
            name: codeToName.get(code) ?? code,
            zoneCount: zones.size,
          })
        );

        return { data: data.sort((a, b) => a.name.localeCompare(b.name)), source: "db" };
      }
    } catch {
      // DB 에러
    }
  }

  // 2. API → 교육지원청 목록 추출
  try {
    if (regionCode) {
      const cddcCode = atptToCddcCode(regionCode);
      const apiRows = await getDistrictZonesByRegion(cddcCode);
      if (apiRows.length > 0) {
        cacheZonesToDb(apiRows).catch(() => {});

        const codeToZones = new Map<string, Set<string>>();
        const codeToName = new Map<string, string>();

        for (const row of apiRows) {
          if (!codeToZones.has(row.edcSport)) {
            codeToZones.set(row.edcSport, new Set());
            codeToName.set(row.edcSport, row.edcSportNm);
          }
          codeToZones.get(row.edcSport)!.add(row.atndsklId);
        }

        const data: EduSupportOffice[] = Array.from(codeToZones.entries()).map(
          ([code, zones]) => ({
            code,
            name: codeToName.get(code) ?? code,
            zoneCount: zones.size,
          })
        );

        return { data: data.sort((a, b) => a.name.localeCompare(b.name)), source: "api" };
      }
    }
  } catch {
    // API 실패
  }

  // 3. Mock
  const mockOffices: EduSupportOffice[] = [
    { code: "B11", name: "서울특별시동부교육지원청", zoneCount: 1 },
    { code: "C11", name: "부산광역시동래교육지원청", zoneCount: 1 },
  ];
  const filtered = regionCode
    ? mockOffices.filter((o) => o.code.startsWith(regionCode.charAt(0)))
    : mockOffices;
  return { data: filtered, source: "mock" };
}
