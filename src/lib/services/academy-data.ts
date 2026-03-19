/**
 * 학원교습소 통계 서비스 레이어
 *
 * Cache-Through: DB → NEIS API → Mock 3단 fallback
 * 시군구 단위로 집계하여 저장 (개별 학원 X)
 */

import { prisma } from "@/lib/db/prisma";
import { getAcademiesByRegion } from "@/lib/api/academy";
import type { AcademyRow } from "@/lib/api/academy";
import type { DataSource } from "./utils";
import type { GapCategory } from "@/lib/analysis/gapmap";

/** 지역 학원 집계 데이터 */
export interface AcademyStatsData {
  regionCode: string;
  district: string;
  year: number;
  totalAcademies: number;
  totalCapacity: number | null;
  academyByRealm: Record<string, number>;
}

/**
 * 시군구별 학원 통계 조회 (Cache-Through: DB → API → Mock)
 */
export async function getAcademyStats(params: {
  regionCode: string;
  district?: string;
}): Promise<{ data: AcademyStatsData[]; source: DataSource }> {
  const { regionCode, district } = params;

  // 1단계: DB 조회
  try {
    const where: Record<string, unknown> = { regionCode, year: 2024 };
    if (district) where.district = district;

    const cached = await prisma.academyStats.findMany({ where });

    if (cached.length > 0) {
      return {
        data: cached.map((c) => ({
          regionCode: c.regionCode,
          district: c.district,
          year: c.year,
          totalAcademies: c.totalAcademies,
          totalCapacity: c.totalCapacity,
          academyByRealm: c.academyByRealm as Record<string, number>,
        })),
        source: "db",
      };
    }
  } catch {
    // DB 미연결 시 API fallback
  }

  // 2단계: NEIS API 호출 + 집계
  try {
    const rows = await getAcademiesByRegion(regionCode);
    if (rows.length > 0) {
      const stats = aggregateByDistrict(rows, regionCode);
      const filtered = district
        ? stats.filter((s) => s.district === district)
        : stats;

      // 비동기 캐싱
      cacheAcademyStats(stats).catch(() => {});

      return { data: filtered, source: "api" };
    }
  } catch {
    // API 실패 시 Mock fallback
  }

  // 3단계: Mock fallback
  const { mockAcademyStats } = await import("@/mocks/data/academies");
  let filtered = mockAcademyStats.filter((s) => s.regionCode === regionCode);
  if (district) filtered = filtered.filter((s) => s.district === district);

  return { data: filtered, source: "mock" };
}

/**
 * API 원시 데이터 → 시군구별 집계
 */
function aggregateByDistrict(
  rows: AcademyRow[],
  regionCode: string
): AcademyStatsData[] {
  const districtMap = new Map<
    string,
    { total: number; capacity: number; realms: Record<string, number> }
  >();

  for (const row of rows) {
    const district = row.ADMST_ZONE_NM?.trim();
    if (!district) continue;

    let entry = districtMap.get(district);
    if (!entry) {
      entry = { total: 0, capacity: 0, realms: {} };
      districtMap.set(district, entry);
    }

    entry.total++;
    const cap = parseInt(row.DTM_RCPTN_ABLTY_NMPR_SMTOT, 10);
    if (!isNaN(cap)) entry.capacity += cap;

    const realm = row.REALM_SC_NM?.trim() || "기타";
    entry.realms[realm] = (entry.realms[realm] ?? 0) + 1;
  }

  const stats: AcademyStatsData[] = [];
  for (const [district, entry] of districtMap) {
    stats.push({
      regionCode,
      district,
      year: 2024,
      totalAcademies: entry.total,
      totalCapacity: entry.capacity || null,
      academyByRealm: entry.realms,
    });
  }

  return stats.sort((a, b) => b.totalAcademies - a.totalAcademies);
}

/**
 * 집계 결과를 DB에 캐싱 (fire & forget)
 */
async function cacheAcademyStats(stats: AcademyStatsData[]): Promise<void> {
  for (const s of stats) {
    try {
      await prisma.academyStats.upsert({
        where: {
          idx_academy_region_district_year: {
            regionCode: s.regionCode,
            district: s.district,
            year: s.year,
          },
        },
        update: {
          totalAcademies: s.totalAcademies,
          totalCapacity: s.totalCapacity,
          academyByRealm: s.academyByRealm,
          collectedAt: new Date(),
        },
        create: {
          regionCode: s.regionCode,
          district: s.district,
          year: s.year,
          totalAcademies: s.totalAcademies,
          totalCapacity: s.totalCapacity,
          academyByRealm: s.academyByRealm,
          source: "neis",
        },
      });
    } catch {
      // 개별 캐싱 실패 무시
    }
  }
}

/**
 * 교습영역(REALM_SC_NM)을 GapMap 카테고리로 변환
 */
export function mapRealmToGapCategory(realm: string): GapCategory | null {
  const mapping: Record<string, GapCategory> = {
    "입시.검정 및 보습": "academic",
    "인문사회": "academic",
    "예능(음악)": "arts",
    "예능(미술)": "arts",
    "예능(기타)": "arts",
    "체육": "sports",
    "직업기술": "technology",
    "국제화": "language",
  };
  return mapping[realm] ?? null;
}

/**
 * 교습영역별 학원 수를 GapCategory별 학원 수로 변환
 */
export function realmToGapCategoryCounts(
  academyByRealm: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [realm, count] of Object.entries(academyByRealm)) {
    const cat = mapRealmToGapCategory(realm);
    if (cat) {
      result[cat] = (result[cat] ?? 0) + count;
    }
  }
  return result;
}
