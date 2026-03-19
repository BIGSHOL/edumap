/**
 * 학구도 시드 스크립트
 *
 * DB에 있는 실제 학교 데이터를 기반으로
 * 같은 구의 인접 학교 2~4개씩 학구로 묶어 district_zone 테이블에 저장
 *
 * 대상: 서울(B10), 부산(C10), 대구(D10), 인천(E10), 경기(J10)
 * 각 시도별 약 30개 학구 생성
 *
 * Usage: npx tsx scripts/seed-zones.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 대상 시도 (NEIS ATPT코드 → 교육지원청 이름)
const REGIONS = [
  { code: "B10", name: "서울특별시교육청", prefix: "서울" },
  { code: "C10", name: "부산광역시교육청", prefix: "부산" },
  { code: "D10", name: "대구광역시교육청", prefix: "대구" },
  { code: "E10", name: "인천광역시교육청", prefix: "인천" },
  { code: "J10", name: "경기도교육청", prefix: "경기" },
];

const ZONE_PER_REGION = 30; // 시도당 학구 수
const SCHOOLS_PER_ZONE = 3; // 학구당 학교 수 (2~4)

async function main() {
  console.log("=== 학구도 시드 시작 ===\n");

  let totalZones = 0;
  let totalEntries = 0;

  for (const region of REGIONS) {
    console.log(`[${region.prefix}] ${region.code} 처리 중...`);

    // 구별 학교 목록 조회
    const schools = await prisma.school.findMany({
      where: { regionCode: region.code },
      select: {
        schoolCode: true,
        schoolName: true,
        schoolType: true,
        district: true,
      },
      orderBy: [{ district: "asc" }, { schoolName: "asc" }],
    });

    if (schools.length === 0) {
      console.log(`  학교 없음, 건너뜀`);
      continue;
    }

    // 구별로 그룹핑
    const byDistrict = new Map<string, typeof schools>();
    for (const s of schools) {
      const list = byDistrict.get(s.district) ?? [];
      list.push(s);
      byDistrict.set(s.district, list);
    }

    let zoneCount = 0;
    let entryCount = 0;
    let zoneIndex = 1;

    // 구별로 순회하며 학구 생성
    for (const [district, districtSchools] of byDistrict) {
      if (zoneCount >= ZONE_PER_REGION) break;

      // 학교를 SCHOOLS_PER_ZONE개씩 묶어서 학구 생성
      for (let i = 0; i < districtSchools.length; i += SCHOOLS_PER_ZONE) {
        if (zoneCount >= ZONE_PER_REGION) break;

        const chunk = districtSchools.slice(i, i + SCHOOLS_PER_ZONE);
        if (chunk.length < 2) continue; // 최소 2개 학교

        const zoneId = `${region.code}-${String(zoneIndex).padStart(3, "0")}`;
        // 구 이름에서 '서울특별시 ' 등 시도명 제거
        const shortDistrict = district.replace(/^.+시\s*/, "").replace(/^.+도\s*/, "");
        const eduSupportName = `${region.prefix}${shortDistrict}교육지원청`;
        const eduSupportCode = `${region.code.charAt(0)}${String(zoneIndex).padStart(2, "0")}`;

        for (const school of chunk) {
          await prisma.districtZone.upsert({
            where: {
              idx_zone_school: {
                zoneId,
                schoolId: school.schoolCode,
              },
            },
            update: {
              schoolName: school.schoolName,
              schoolLevel: school.schoolType === "elementary" ? "초등학교" :
                           school.schoolType === "middle" ? "중학교" : "고등학교",
              sidoEduCode: region.code,
              sidoEduName: region.name,
              eduSupportCode,
              eduSupportName,
              referenceDate: "2024-09-01",
            },
            create: {
              zoneId,
              schoolId: school.schoolCode,
              schoolName: school.schoolName,
              schoolLevel: school.schoolType === "elementary" ? "초등학교" :
                           school.schoolType === "middle" ? "중학교" : "고등학교",
              sidoEduCode: region.code,
              sidoEduName: region.name,
              eduSupportCode,
              eduSupportName,
              referenceDate: "2024-09-01",
            },
          });
          entryCount++;
        }

        zoneCount++;
        zoneIndex++;
      }
    }

    console.log(`  ${zoneCount}개 학구, ${entryCount}개 레코드 생성`);
    totalZones += zoneCount;
    totalEntries += entryCount;
  }

  console.log(`\n=== 완료: ${totalZones}개 학구, ${totalEntries}개 레코드 ===`);

  // 확인
  const count = await prisma.districtZone.count();
  console.log(`DB district_zone 테이블: ${count}건`);
}

main()
  .catch((e) => {
    console.error("오류:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
