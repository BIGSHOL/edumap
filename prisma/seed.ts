import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 시드 데이터 투입 시작...");

  // 1. 지역 데이터 (시도교육청)
  const regions = [
    { regionCode: "B10", regionName: "서울특별시교육청", subRegion: "종로구" },
    { regionCode: "B10-2", regionName: "서울특별시교육청", subRegion: "강남구" },
    { regionCode: "C10", regionName: "부산광역시교육청", subRegion: "부산진구" },
    { regionCode: "D10", regionName: "대구광역시교육청", subRegion: "수성구" },
    { regionCode: "E10", regionName: "인천광역시교육청", subRegion: "남동구" },
    { regionCode: "F10", regionName: "광주광역시교육청", subRegion: "북구" },
    { regionCode: "G10", regionName: "대전광역시교육청", subRegion: "유성구" },
    { regionCode: "R10", regionName: "경기도교육청", subRegion: "수원시" },
  ];

  for (const r of regions) {
    await prisma.region.upsert({
      where: { regionCode: r.regionCode },
      update: r,
      create: r,
    });
  }
  console.log(`  ✅ 지역 ${regions.length}개`);

  // 2. 학교 데이터
  const schools = [
    {
      schoolCode: "B100000465",
      schoolName: "서울대학교사범대학부설초등학교", // 학교명
      schoolType: "elementary",
      regionCode: "B10",
      district: "종로구",
      latitude: 37.5816,
      longitude: 126.9992,
      address: "서울특별시 종로구 대학로 1",
      dataUpdatedAt: new Date("2025-04-01"),
    },
    {
      schoolCode: "B100000466",
      schoolName: "경복중학교", // 학교명
      schoolType: "middle",
      regionCode: "B10",
      district: "종로구",
      latitude: 37.577,
      longitude: 126.982,
      address: "서울특별시 종로구 자하문로 136",
      dataUpdatedAt: new Date("2025-04-01"),
    },
    {
      schoolCode: "C100000123",
      schoolName: "부산진초등학교", // 학교명
      schoolType: "elementary",
      regionCode: "C10",
      district: "부산진구",
      latitude: 35.1587,
      longitude: 129.0367,
      address: "부산광역시 부산진구 중앙대로 680",
      dataUpdatedAt: new Date("2025-04-01"),
    },
    {
      schoolCode: "B100000500",
      schoolName: "서울고등학교", // 학교명
      schoolType: "high",
      regionCode: "B10",
      district: "종로구",
      latitude: 37.5725,
      longitude: 126.985,
      address: "서울특별시 종로구 삼일대로 480",
      dataUpdatedAt: new Date("2025-04-01"),
    },
    {
      schoolCode: "D100000201",
      schoolName: "대구수성초등학교", // 학교명
      schoolType: "elementary",
      regionCode: "D10",
      district: "수성구",
      latitude: 35.8562,
      longitude: 128.6321,
      address: "대구광역시 수성구 달구벌대로 2400",
      dataUpdatedAt: new Date("2025-04-01"),
    },
    {
      schoolCode: "E100000301",
      schoolName: "인천남동중학교", // 학교명
      schoolType: "middle",
      regionCode: "E10",
      district: "남동구",
      latitude: 37.4491,
      longitude: 126.7311,
      address: "인천광역시 남동구 구월로 123",
      dataUpdatedAt: new Date("2025-04-01"),
    },
    {
      schoolCode: "R100000401",
      schoolName: "수원매탄초등학교", // 학교명
      schoolType: "elementary",
      regionCode: "R10",
      district: "수원시",
      latitude: 37.2636,
      longitude: 127.0286,
      address: "경기도 수원시 영통구 매탄로 100",
      dataUpdatedAt: new Date("2025-04-01"),
    },
  ];

  for (const s of schools) {
    await prisma.school.upsert({
      where: { schoolCode: s.schoolCode },
      update: s,
      create: s,
    });
  }
  console.log(`  ✅ 학교 ${schools.length}개`);

  // 3. 교원 현황 (학교알리미)
  const teacherStats = [
    { schoolCode: "B100000465", year: 2025, studentsPerTeacher: 18.5, tempTeacherRatio: 0.12, totalTeachers: 42, totalStudents: 777 },
    { schoolCode: "B100000466", year: 2025, studentsPerTeacher: 15.2, tempTeacherRatio: 0.08, totalTeachers: 38, totalStudents: 578 },
    { schoolCode: "C100000123", year: 2025, studentsPerTeacher: 22.3, tempTeacherRatio: 0.25, totalTeachers: 28, totalStudents: 624 },
    { schoolCode: "B100000500", year: 2025, studentsPerTeacher: 14.8, tempTeacherRatio: 0.05, totalTeachers: 55, totalStudents: 814 },
    { schoolCode: "D100000201", year: 2025, studentsPerTeacher: 20.1, tempTeacherRatio: 0.18, totalTeachers: 32, totalStudents: 643 },
    { schoolCode: "E100000301", year: 2025, studentsPerTeacher: 16.7, tempTeacherRatio: 0.10, totalTeachers: 35, totalStudents: 585 },
    { schoolCode: "R100000401", year: 2025, studentsPerTeacher: 24.0, tempTeacherRatio: 0.30, totalTeachers: 25, totalStudents: 600 },
  ];

  for (const t of teacherStats) {
    await prisma.teacherStats.upsert({
      where: { idx_teacher_school_year: { schoolCode: t.schoolCode, year: t.year } },
      update: t,
      create: { ...t, source: "schoolinfo" },
    });
  }
  console.log(`  ✅ 교원 현황 ${teacherStats.length}개`);

  // 4. 재정 현황 (학교알리미)
  const financeStats = [
    { schoolCode: "B100000465", year: 2025, totalBudget: BigInt(5200000000), educationBudget: BigInt(3100000000), budgetPerStudent: 3990000 },
    { schoolCode: "B100000466", year: 2025, totalBudget: BigInt(4800000000), educationBudget: BigInt(2900000000), budgetPerStudent: 4200000 },
    { schoolCode: "C100000123", year: 2025, totalBudget: BigInt(2800000000), educationBudget: BigInt(1600000000), budgetPerStudent: 2560000 },
    { schoolCode: "B100000500", year: 2025, totalBudget: BigInt(6100000000), educationBudget: BigInt(3800000000), budgetPerStudent: 4670000 },
    { schoolCode: "D100000201", year: 2025, totalBudget: BigInt(3200000000), educationBudget: BigInt(1900000000), budgetPerStudent: 2950000 },
    { schoolCode: "E100000301", year: 2025, totalBudget: BigInt(4100000000), educationBudget: BigInt(2500000000), budgetPerStudent: 3590000 },
    { schoolCode: "R100000401", year: 2025, totalBudget: BigInt(2500000000), educationBudget: BigInt(1400000000), budgetPerStudent: 2330000 },
  ];

  for (const f of financeStats) {
    await prisma.financeStats.upsert({
      where: { idx_finance_school_year: { schoolCode: f.schoolCode, year: f.year } },
      update: f,
      create: { ...f, source: "schoolinfo" },
    });
  }
  console.log(`  ✅ 재정 현황 ${financeStats.length}개`);

  // 5. 방과후 프로그램 (학교알리미)
  const afterschoolPrograms = [
    // 서울대부설초
    { schoolCode: "B100000465", year: 2025, subject: "영어회화", enrollment: 25, category: "academic" },
    { schoolCode: "B100000465", year: 2025, subject: "코딩교실", enrollment: 20, category: "academic" },
    { schoolCode: "B100000465", year: 2025, subject: "축구", enrollment: 30, category: "sports" },
    // 경복중
    { schoolCode: "B100000466", year: 2025, subject: "수학심화", enrollment: 22, category: "academic" },
    { schoolCode: "B100000466", year: 2025, subject: "미술", enrollment: 18, category: "art" },
    { schoolCode: "B100000466", year: 2025, subject: "배드민턴", enrollment: 24, category: "sports" },
    { schoolCode: "B100000466", year: 2025, subject: "로봇공학", enrollment: 15, category: "academic" },
    { schoolCode: "B100000466", year: 2025, subject: "밴드", enrollment: 12, category: "art" },
    // 부산진초 — 프로그램 적음 (위험 요인)
    { schoolCode: "C100000123", year: 2025, subject: "국어논술", enrollment: 15, category: "academic" },
    // 서울고
    { schoolCode: "B100000500", year: 2025, subject: "영어토론", enrollment: 20, category: "academic" },
    { schoolCode: "B100000500", year: 2025, subject: "물리실험", enrollment: 18, category: "academic" },
    { schoolCode: "B100000500", year: 2025, subject: "농구", enrollment: 25, category: "sports" },
    { schoolCode: "B100000500", year: 2025, subject: "오케스트라", enrollment: 30, category: "art" },
    { schoolCode: "B100000500", year: 2025, subject: "AI프로그래밍", enrollment: 22, category: "academic" },
    { schoolCode: "B100000500", year: 2025, subject: "일본어", enrollment: 16, category: "academic" },
    // 대구수성초
    { schoolCode: "D100000201", year: 2025, subject: "수학", enrollment: 20, category: "academic" },
    { schoolCode: "D100000201", year: 2025, subject: "태권도", enrollment: 28, category: "sports" },
    // 인천남동중
    { schoolCode: "E100000301", year: 2025, subject: "영어", enrollment: 22, category: "academic" },
    { schoolCode: "E100000301", year: 2025, subject: "코딩", enrollment: 18, category: "academic" },
    { schoolCode: "E100000301", year: 2025, subject: "축구", enrollment: 26, category: "sports" },
    { schoolCode: "E100000301", year: 2025, subject: "미술", enrollment: 14, category: "art" },
    // 수원매탄초 — 프로그램 없음 (위험 요인)
  ];

  // 방과후 프로그램은 upsert 대신 deleteMany + createMany
  await prisma.afterSchoolProgram.deleteMany({});
  await prisma.afterSchoolProgram.createMany({
    data: afterschoolPrograms.map((p) => ({ ...p, source: "schoolinfo" })),
  });
  console.log(`  ✅ 방과후 프로그램 ${afterschoolPrograms.length}개`);

  console.log("\n🎉 시드 데이터 투입 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 시드 실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
