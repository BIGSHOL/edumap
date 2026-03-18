/**
 * 지역별 초등학교 시드 — 인자로 지역 지정
 * Usage: node scripts/seed-region.cjs 부산 C10 26
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const KEY = process.env.SCHOOLINFO_API_KEY;
const BASE = "https://www.schoolinfo.go.kr/openApi.do";

// 인자 또는 기본값
const ALL_REGIONS = [
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
  const url = `${BASE}?apiKey=${KEY}&apiType=${apiType}&schulKndCode=02&sidoCode=${sidoCode}&sggCode=${sggCode}&pbanYr=2024&pIndex=1&pSize=2000`;
  const res = await fetch(url);
  const data = await res.json();
  return data.resultCode === "success" ? data.list || [] : [];
}

async function seedRegion(r) {
  const sgg = r.sido + "000";
  const [ovs, poss, afss] = await Promise.all([
    fetchApi("09", r.sido, sgg),
    fetchApi("17", r.sido, sgg),
    fetchApi("59", r.sido, sgg),
  ]);
  if (!ovs.length) { console.log(`  ${r.name}: 데이터 없음`); return 0; }
  console.log(`  ${r.name}: ${ovs.length}개 학교 데이터 수집 완료`);

  const posMap = new Map(poss.map((x) => [x.SCHUL_NM, x]));
  const afsMap = new Map(afss.map((x) => [x.SCHUL_NM, x]));

  await prisma.region.upsert({
    where: { regionCode: r.atpt },
    update: {},
    create: { regionCode: r.atpt, regionName: r.name + "교육청" },
  });

  let saved = 0;
  for (const ov of ovs) {
    try {
      const pos = posMap.get(ov.SCHUL_NM);
      let tr = null;
      if (pos) { const t = (pos.COL_1||0) + (pos.COL_11||0); tr = t > 0 ? (pos.COL_11||0)/t : 0; }

      await prisma.school.upsert({
        where: { schoolCode: ov.SCHUL_CODE },
        update: { schoolName: ov.SCHUL_NM, dataUpdatedAt: new Date() },
        create: { schoolCode: ov.SCHUL_CODE, schoolName: ov.SCHUL_NM, schoolType: "elementary", regionCode: r.atpt, district: ov.ADRCD_NM || r.name, dataUpdatedAt: new Date() },
      });
      await prisma.teacherStats.upsert({
        where: { idx_teacher_school_year: { schoolCode: ov.SCHUL_CODE, year: 2024 } },
        update: { studentsPerTeacher: ov.COL_SUM??null, tempTeacherRatio: tr, totalTeachers: ov.TEACH_CNT??null, totalStudents: ov.COL_S_SUM??null },
        create: { schoolCode: ov.SCHUL_CODE, year: 2024, studentsPerTeacher: ov.COL_SUM??null, tempTeacherRatio: tr, totalTeachers: ov.TEACH_CNT??null, totalStudents: ov.COL_S_SUM??null, source: "schoolinfo" },
      });
      const afs = afsMap.get(ov.SCHUL_NM);
      if (afs && afs.SUM_ASL_PGM_FGR > 0) {
        await prisma.afterSchoolProgram.deleteMany({ where: { schoolCode: ov.SCHUL_CODE, year: 2024 } });
        const p = [];
        if (afs.ASL_CURR_PGM_FGR > 0) p.push({ schoolCode: ov.SCHUL_CODE, year: 2024, subject: `교과 (${afs.ASL_CURR_PGM_FGR}개)`, enrollment: afs.ASL_CURR_REG_STDNT_FGR, category: "academic", source: "schoolinfo" });
        if (afs.ASL_SPABL_APTD_PGM_FGR > 0) p.push({ schoolCode: ov.SCHUL_CODE, year: 2024, subject: `특기적성 (${afs.ASL_SPABL_APTD_PGM_FGR}개)`, enrollment: afs.ASL_SPABL_APTD_REG_STDNT_FGR, category: "extracurricular", source: "schoolinfo" });
        if (p.length > 0) await prisma.afterSchoolProgram.createMany({ data: p });
      }
      saved++;
    } catch { /* skip */ }
  }
  return saved;
}

async function main() {
  console.log("=== 전국 초등학교 순차 시드 ===\n");
  const t0 = Date.now();
  let total = 0;

  for (const r of ALL_REGIONS) {
    process.stdout.write(`[${r.name}] `);
    const n = await seedRegion(r);
    total += n;
    console.log(`  → ${n}개 저장 완료`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 지역 간 1초 딜레이
  }

  const elapsed = Math.round((Date.now() - t0) / 1000);
  const counts = { schools: await prisma.school.count(), teachers: await prisma.teacherStats.count(), programs: await prisma.afterSchoolProgram.count() };
  console.log(`\n=== 완료: 신규 ${total}개 (${elapsed}초) ===`);
  console.log("DB 총:", counts);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
