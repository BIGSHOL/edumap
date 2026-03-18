/**
 * 전국 초등학교 시드 스크립트
 * 17개 시도교육청의 초등학교 데이터를 학교알리미 API에서 수집하여 Supabase에 저장
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_KEY = process.env.SCHOOLINFO_API_KEY;
const BASE = "https://www.schoolinfo.go.kr/openApi.do";
const YEAR = 2024;

// 17개 시도교육청 (NEIS ATPT코드 → 학교알리미 sidoCode)
const REGIONS = [
  { atpt: "B10", sido: "11", name: "서울" },
  { atpt: "C10", sido: "26", name: "부산" },
  { atpt: "D10", sido: "27", name: "대구" },
  { atpt: "E10", sido: "28", name: "인천" },
  { atpt: "F10", sido: "29", name: "광주" },
  { atpt: "G10", sido: "30", name: "대전" },
  { atpt: "H10", sido: "31", name: "울산" },
  { atpt: "I10", sido: "36", name: "세종" },
  { atpt: "J10", sido: "41", name: "경기" },
  { atpt: "K10", sido: "51", name: "강원" },
  { atpt: "M10", sido: "43", name: "충북" },
  { atpt: "N10", sido: "44", name: "충남" },
  { atpt: "P10", sido: "52", name: "전북" },
  { atpt: "Q10", sido: "46", name: "전남" },
  { atpt: "R10", sido: "47", name: "경북" },
  { atpt: "S10", sido: "48", name: "경남" },
  { atpt: "T10", sido: "50", name: "제주" },
];

async function fetchApi(apiType, sidoCode, sggCode) {
  const url = `${BASE}?apiKey=${API_KEY}&apiType=${apiType}&schulKndCode=02&sidoCode=${sidoCode}&sggCode=${sggCode}&pbanYr=${YEAR}&pIndex=1&pSize=2000`;
  const res = await fetch(url);
  const data = await res.json();
  return data.resultCode === "success" ? data.list || [] : [];
}

async function seedRegion(region) {
  const sggCode = region.sido + "000";

  // API 3종 호출
  const [overviews, positions, afterSchools] = await Promise.all([
    fetchApi("09", region.sido, sggCode),
    fetchApi("17", region.sido, sggCode),
    fetchApi("59", region.sido, sggCode),
  ]);

  if (overviews.length === 0) {
    console.log(`  ${region.name}: 데이터 없음 (skip)`);
    return 0;
  }

  const posMap = new Map(positions.map((r) => [r.SCHUL_NM, r]));
  const afsMap = new Map(afterSchools.map((r) => [r.SCHUL_NM, r]));

  // Region upsert
  await prisma.region.upsert({
    where: { regionCode: region.atpt },
    update: {},
    create: { regionCode: region.atpt, regionName: region.name + "교육청" },
  });

  let saved = 0;
  for (const ov of overviews) {
    try {
      const pos = posMap.get(ov.SCHUL_NM);
      let tempRatio = null;
      if (pos) {
        const total = (pos.COL_1 || 0) + (pos.COL_11 || 0);
        tempRatio = total > 0 ? (pos.COL_11 || 0) / total : 0;
      }

      await prisma.school.upsert({
        where: { schoolCode: ov.SCHUL_CODE },
        update: { schoolName: ov.SCHUL_NM, dataUpdatedAt: new Date() },
        create: {
          schoolCode: ov.SCHUL_CODE,
          schoolName: ov.SCHUL_NM,
          schoolType: "elementary",
          regionCode: region.atpt,
          district: ov.ADRCD_NM || region.name,
          dataUpdatedAt: new Date(),
        },
      });

      await prisma.teacherStats.upsert({
        where: { idx_teacher_school_year: { schoolCode: ov.SCHUL_CODE, year: YEAR } },
        update: {
          studentsPerTeacher: ov.COL_SUM ?? null,
          tempTeacherRatio: tempRatio,
          totalTeachers: ov.TEACH_CNT ?? null,
          totalStudents: ov.COL_S_SUM ?? null,
        },
        create: {
          schoolCode: ov.SCHUL_CODE,
          year: YEAR,
          studentsPerTeacher: ov.COL_SUM ?? null,
          tempTeacherRatio: tempRatio,
          totalTeachers: ov.TEACH_CNT ?? null,
          totalStudents: ov.COL_S_SUM ?? null,
          source: "schoolinfo",
        },
      });

      const afs = afsMap.get(ov.SCHUL_NM);
      if (afs && afs.SUM_ASL_PGM_FGR > 0) {
        await prisma.afterSchoolProgram.deleteMany({ where: { schoolCode: ov.SCHUL_CODE, year: YEAR } });
        const programs = [];
        if (afs.ASL_CURR_PGM_FGR > 0)
          programs.push({ schoolCode: ov.SCHUL_CODE, year: YEAR, subject: `교과 (${afs.ASL_CURR_PGM_FGR}개)`, enrollment: afs.ASL_CURR_REG_STDNT_FGR, category: "academic", source: "schoolinfo" });
        if (afs.ASL_SPABL_APTD_PGM_FGR > 0)
          programs.push({ schoolCode: ov.SCHUL_CODE, year: YEAR, subject: `특기적성 (${afs.ASL_SPABL_APTD_PGM_FGR}개)`, enrollment: afs.ASL_SPABL_APTD_REG_STDNT_FGR, category: "extracurricular", source: "schoolinfo" });
        if (programs.length > 0) await prisma.afterSchoolProgram.createMany({ data: programs });
      }

      saved++;
    } catch {
      // 개별 에러 무시
    }
  }

  return saved;
}

async function main() {
  console.log("=== 전국 초등학교 시드 시작 ===\n");
  const startTime = Date.now();
  let totalSaved = 0;

  for (const region of REGIONS) {
    process.stdout.write(`[${region.name}] `);
    const count = await seedRegion(region);
    totalSaved += count;
    console.log(`${count}개 저장`);

    // API 부하 방지 딜레이
    await new Promise((r) => setTimeout(r, 500));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== 완료: ${totalSaved}개 학교 (${elapsed}초) ===\n`);

  const counts = {
    schools: await prisma.school.count(),
    teachers: await prisma.teacherStats.count(),
    programs: await prisma.afterSchoolProgram.count(),
  };
  console.log("DB 현황:", counts);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
