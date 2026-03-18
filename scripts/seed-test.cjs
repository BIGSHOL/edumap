require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_KEY = process.env.SCHOOLINFO_API_KEY;
const BASE = `https://www.schoolinfo.go.kr/openApi.do?apiKey=${API_KEY}&schulKndCode=02&sidoCode=11&sggCode=11000&pbanYr=2024&pIndex=1&pSize=1000`;

async function main() {
  console.log("=== 서울 초등학교 시드 ===\n");

  // API 호출
  console.log("[1] API 호출...");
  const [r09, r17, r59] = await Promise.all([
    fetch(BASE + "&apiType=09").then((r) => r.json()),
    fetch(BASE + "&apiType=17").then((r) => r.json()),
    fetch(BASE + "&apiType=59").then((r) => r.json()),
  ]);
  console.log(`  09: ${r09.list?.length}, 17: ${r17.list?.length}, 59: ${r59.list?.length}\n`);

  const posMap = new Map((r17.list || []).map((r) => [r.SCHUL_NM, r]));
  const afsMap = new Map((r59.list || []).map((r) => [r.SCHUL_NM, r]));

  // Region
  console.log("[2] Region 저장...");
  await prisma.region.upsert({
    where: { regionCode: "B10" },
    update: {},
    create: { regionCode: "B10", regionName: "서울특별시교육청" },
  });

  // 학교 저장
  console.log("[3] 학교 저장...");
  let saved = 0;

  for (const ov of r09.list || []) {
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
        regionCode: "B10",
        district: ov.ADRCD_NM || "서울",
        dataUpdatedAt: new Date(),
      },
    });

    await prisma.teacherStats.upsert({
      where: { idx_teacher_school_year: { schoolCode: ov.SCHUL_CODE, year: 2024 } },
      update: {
        studentsPerTeacher: ov.COL_SUM ?? null,
        tempTeacherRatio: tempRatio,
        totalTeachers: ov.TEACH_CNT ?? null,
        totalStudents: ov.COL_S_SUM ?? null,
      },
      create: {
        schoolCode: ov.SCHUL_CODE,
        year: 2024,
        studentsPerTeacher: ov.COL_SUM ?? null,
        tempTeacherRatio: tempRatio,
        totalTeachers: ov.TEACH_CNT ?? null,
        totalStudents: ov.COL_S_SUM ?? null,
        source: "schoolinfo",
      },
    });

    const afs = afsMap.get(ov.SCHUL_NM);
    if (afs && afs.SUM_ASL_PGM_FGR > 0) {
      await prisma.afterSchoolProgram.deleteMany({ where: { schoolCode: ov.SCHUL_CODE, year: 2024 } });
      const programs = [];
      if (afs.ASL_CURR_PGM_FGR > 0)
        programs.push({ schoolCode: ov.SCHUL_CODE, year: 2024, subject: `교과 (${afs.ASL_CURR_PGM_FGR}개)`, enrollment: afs.ASL_CURR_REG_STDNT_FGR, category: "academic", source: "schoolinfo" });
      if (afs.ASL_SPABL_APTD_PGM_FGR > 0)
        programs.push({ schoolCode: ov.SCHUL_CODE, year: 2024, subject: `특기적성 (${afs.ASL_SPABL_APTD_PGM_FGR}개)`, enrollment: afs.ASL_SPABL_APTD_REG_STDNT_FGR, category: "extracurricular", source: "schoolinfo" });
      if (programs.length > 0) await prisma.afterSchoolProgram.createMany({ data: programs });
    }

    saved++;
    if (saved % 100 === 0) console.log(`  ${saved}/${r09.list.length}`);
  }

  console.log(`\n[4] 완료: ${saved}개\n`);

  const counts = {
    schools: await prisma.school.count(),
    teachers: await prisma.teacherStats.count(),
    programs: await prisma.afterSchoolProgram.count(),
  };
  console.log("DB:", counts);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
