/**
 * 서울 초등학교 시드 스크립트
 *
 * 학교알리미 API에서 서울 초등학교 데이터를 수집하여 Supabase에 저장
 * - apiType=09: 교원 현황 (교원수, 학생수, 교원1인당학생수)
 * - apiType=17: 직위별 교원 (기간제교원비율 산출)
 * - apiType=59: 방과후 프로그램 (프로그램 수, 참여 학생수)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { PrismaClient } = await import("@prisma/client");

const prisma = new PrismaClient();
const API_KEY = process.env.SCHOOLINFO_API_KEY;
const BASE_URL = "https://www.schoolinfo.go.kr/openApi.do";

// 서울: sidoCode=11, sggCode=11000, schulKndCode=02(초등)
const SIDO_CODE = "11";
const SGG_CODE = "11000";
const SCHUL_KND = "02";
const YEAR = 2024;

async function fetchAll(apiType) {
  const allRows = [];
  let page = 1;
  const pSize = 500;

  while (true) {
    const url = `${BASE_URL}?apiKey=${API_KEY}&apiType=${apiType}&schulKndCode=${SCHUL_KND}&sidoCode=${SIDO_CODE}&sggCode=${SGG_CODE}&pbanYr=${YEAR}&pIndex=${page}&pSize=${pSize}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.resultCode !== "success" || !data.list?.length) break;
    allRows.push(...data.list);
    if (data.list.length < pSize) break;
    page++;
    await new Promise((r) => setTimeout(r, 300));
  }

  return allRows;
}

async function main() {
  console.log("=== 서울 초등학교 시드 시작 ===\n");

  // 1. 데이터 수집
  console.log("[1/4] 학교알리미 API 호출 중...");
  const [overviews, positions, afterSchools] = await Promise.all([
    fetchAll("09"),
    fetchAll("17"),
    fetchAll("59"),
  ]);

  console.log(`  교원현황(09): ${overviews.length}개`);
  console.log(`  직위별교원(17): ${positions.length}개`);
  console.log(`  방과후(59): ${afterSchools.length}개\n`);

  // Map으로 학교명 기반 조인
  const posMap = new Map(positions.map((r) => [r.SCHUL_NM, r]));
  const afsMap = new Map(afterSchools.map((r) => [r.SCHUL_NM, r]));

  // 2. Region upsert
  console.log("[2/4] Region 저장...");
  await prisma.region.upsert({
    where: { regionCode: "B10" },
    update: {},
    create: { regionCode: "B10", regionName: "서울특별시교육청" },
  });

  // 3. 학교 + 교원 데이터 저장
  console.log("[3/4] 학교 데이터 저장 중...");
  let saved = 0;
  let errors = 0;

  for (const ov of overviews) {
    try {
      const pos = posMap.get(ov.SCHUL_NM);
      const afs = afsMap.get(ov.SCHUL_NM);

      // 기간제교원비율 계산
      let tempRatio = null;
      if (pos) {
        const regular = pos.COL_1 ?? 0;
        const temp = pos.COL_11 ?? 0;
        const total = regular + temp;
        tempRatio = total > 0 ? temp / total : 0;
      }

      // School upsert
      await prisma.school.upsert({
        where: { schoolCode: ov.SCHUL_CODE },
        update: {
          schoolName: ov.SCHUL_NM,
          dataUpdatedAt: new Date(),
        },
        create: {
          schoolCode: ov.SCHUL_CODE,
          schoolName: ov.SCHUL_NM,
          schoolType: "elementary",
          regionCode: "B10",
          district: ov.ADRCD_NM ?? "서울",
          latitude: null,
          longitude: null,
          address: null,
          dataUpdatedAt: new Date(),
        },
      });

      // TeacherStats upsert
      await prisma.teacherStats.upsert({
        where: {
          idx_teacher_school_year: {
            schoolCode: ov.SCHUL_CODE,
            year: YEAR,
          },
        },
        update: {
          studentsPerTeacher: ov.COL_SUM ?? ov.TEACH_CAL ?? null,
          tempTeacherRatio: tempRatio,
          totalTeachers: ov.TEACH_CNT ?? null,
          totalStudents: ov.COL_S_SUM ?? null,
        },
        create: {
          schoolCode: ov.SCHUL_CODE,
          year: YEAR,
          studentsPerTeacher: ov.COL_SUM ?? ov.TEACH_CAL ?? null,
          tempTeacherRatio: tempRatio,
          totalTeachers: ov.TEACH_CNT ?? null,
          totalStudents: ov.COL_S_SUM ?? null,
          source: "schoolinfo",
        },
      });

      // AfterSchoolProgram (요약 정보)
      if (afs && afs.SUM_ASL_PGM_FGR > 0) {
        // 기존 데이터 삭제 후 재생성
        await prisma.afterSchoolProgram.deleteMany({
          where: { schoolCode: ov.SCHUL_CODE, year: YEAR },
        });

        const programs = [];
        if (afs.ASL_CURR_PGM_FGR > 0) {
          programs.push({
            schoolCode: ov.SCHUL_CODE,
            year: YEAR,
            subject: `교과 프로그램 (${afs.ASL_CURR_PGM_FGR}개)`,
            enrollment: afs.ASL_CURR_REG_STDNT_FGR ?? null,
            category: "academic",
            source: "schoolinfo",
          });
        }
        if (afs.ASL_SPABL_APTD_PGM_FGR > 0) {
          programs.push({
            schoolCode: ov.SCHUL_CODE,
            year: YEAR,
            subject: `특기적성 프로그램 (${afs.ASL_SPABL_APTD_PGM_FGR}개)`,
            enrollment: afs.ASL_SPABL_APTD_REG_STDNT_FGR ?? null,
            category: "extracurricular",
            source: "schoolinfo",
          });
        }

        if (programs.length > 0) {
          await prisma.afterSchoolProgram.createMany({ data: programs });
        }
      }

      saved++;
      if (saved % 100 === 0) console.log(`  ${saved}/${overviews.length} 저장 완료`);
    } catch (e) {
      errors++;
      if (errors <= 3) console.error(`  에러: ${ov.SCHUL_NM} — ${e.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n[4/4] 완료: ${saved}개 저장, ${errors}개 에러\n`);

  // 결과 확인
  const schoolCount = await prisma.school.count();
  const teacherCount = await prisma.teacherStats.count();
  const programCount = await prisma.afterSchoolProgram.count();

  console.log("=== DB 현황 ===");
  console.log(`  학교: ${schoolCount}개`);
  console.log(`  교원 데이터: ${teacherCount}개`);
  console.log(`  방과후 프로그램: ${programCount}개`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
