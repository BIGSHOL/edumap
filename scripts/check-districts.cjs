require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  // 샘플
  const samples = await p.school.findMany({ take: 10, select: { schoolName: true, district: true, regionCode: true } });
  console.log("=== district 샘플 ===");
  samples.forEach(s => console.log(`  ${s.regionCode} | ${s.district} | ${s.schoolName}`));

  console.log("\n=== 서울 district 종류 ===");
  const seoulDistricts = await p.school.groupBy({ by: ["district"], where: { regionCode: "B10" }, _count: true, orderBy: { _count: { schoolCode: "desc" } } });
  console.log(`총 ${seoulDistricts.length}개 구/군:`);
  seoulDistricts.forEach(d => console.log(`  ${d.district}: ${d._count}개`));

  console.log("\n=== 부산 district 종류 ===");
  const busanDistricts = await p.school.groupBy({ by: ["district"], where: { regionCode: "C10" }, _count: true, orderBy: { _count: { schoolCode: "desc" } } });
  console.log(`총 ${busanDistricts.length}개 구/군:`);
  busanDistricts.slice(0, 5).forEach(d => console.log(`  ${d.district}: ${d._count}개`));

  await p.$disconnect();
})();
