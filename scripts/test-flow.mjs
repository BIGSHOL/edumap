import { config } from "dotenv";
config({ path: ".env.local" });

const key = process.env.NEIS_API_KEY;
const siKey = process.env.SCHOOLINFO_API_KEY;

console.log("=== Cache-Through 프로세스 확인 ===\n");

// Step 1
console.log("[1] DB 조회 시도 → DB 미연결이므로 SKIP\n");

// Step 2: NEIS
console.log("[2] NEIS API: 학교 검색 (서울대학교사범대학부설초등학교)");
const neisUrl = `https://open.neis.go.kr/hub/schoolInfo?KEY=${key}&Type=json&pIndex=1&pSize=1&SCHUL_NM=서울대학교사범대학부설초등학교`;
const neisRes = await fetch(neisUrl);
const neisData = await neisRes.json();
const school = neisData.schoolInfo?.[1]?.row?.[0];
if (!school) { console.log("  → 실패"); process.exit(1); }
console.log(`  → 성공: ${school.SCHUL_NM}`);
console.log(`  → NEIS 학교코드: ${school.SD_SCHUL_CODE}`);
console.log(`  → ATPT코드: ${school.ATPT_OFCDC_SC_CODE} (${school.ATPT_OFCDC_SC_NM})`);
console.log(`  → 주소: ${school.ORG_RDNMA}\n`);

// Step 3: 코드 변환
const atptToSido = { B10: "11", C10: "26", D10: "27", E10: "28" };
const sidoCode = atptToSido[school.ATPT_OFCDC_SC_CODE] || "11";
const sggCode = sidoCode + "000";
console.log(`[3] 코드 변환: ATPT ${school.ATPT_OFCDC_SC_CODE} → sidoCode=${sidoCode}, sggCode=${sggCode}\n`);

// Step 4: 학교알리미 3개 병렬 호출
console.log("[4] 학교알리미 API 3개 병렬 호출...");
const baseUrl = `https://www.schoolinfo.go.kr/openApi.do?apiKey=${siKey}`;
const common = `&schulKndCode=02&sidoCode=${sidoCode}&sggCode=${sggCode}&pbanYr=2024&pIndex=1&pSize=1000`;

const [r09, r17, r59] = await Promise.all([
  fetch(`${baseUrl}&apiType=09${common}`).then((r) => r.json()),
  fetch(`${baseUrl}&apiType=17${common}`).then((r) => r.json()),
  fetch(`${baseUrl}&apiType=59${common}`).then((r) => r.json()),
]);

console.log(`  → apiType=09 (교원현황): ${r09.list?.length || 0}개 학교`);
console.log(`  → apiType=17 (직위별교원): ${r17.list?.length || 0}개 학교`);
console.log(`  → apiType=59 (방과후): ${r59.list?.length || 0}개 학교\n`);

// Step 5: 학교명 매칭
const schoolName = school.SCHUL_NM;
const ov = r09.list?.find((r) => r.SCHUL_NM === schoolName);
const pos = r17.list?.find((r) => r.SCHUL_NM === schoolName);
const afs = r59.list?.find((r) => r.SCHUL_NM === schoolName);

console.log(`[5] 학교명 매칭: "${schoolName}"`);
console.log(`  → 교원현황: ${ov ? "매칭됨" : "없음"}`);
console.log(`  → 직위별교원: ${pos ? "매칭됨" : "없음"}`);
console.log(`  → 방과후: ${afs ? "매칭됨" : "없음"}\n`);

// Step 6: 결과
if (ov) {
  const tempRatio = pos ? pos.COL_11 / (pos.COL_1 + pos.COL_11) : null;
  console.log("[6] SchoolDetail 조립 결과:");
  console.log(`  schoolCode: ${school.SD_SCHUL_CODE}`);
  console.log(`  schoolName: ${schoolName}`);
  console.log(`  schoolType: elementary`);
  console.log(`  regionCode: ${school.ATPT_OFCDC_SC_CODE}`);
  console.log(`  district: ${ov.ADRCD_NM || ""}`);
  console.log("  teacherStats:");
  console.log(`    studentsPerTeacher: ${ov.COL_SUM}`);
  console.log(`    tempTeacherRatio: ${tempRatio ? tempRatio.toFixed(3) : "null"}`);
  console.log(`    totalTeachers: ${ov.TEACH_CNT}`);
  console.log(`    totalStudents: ${ov.COL_S_SUM}`);
  console.log("  financeStats: null (API 미제공)");
  if (afs) {
    console.log("  afterschoolPrograms:");
    console.log(`    전체: ${afs.SUM_ASL_PGM_FGR}개, 참여학생: ${afs.ASL_PTPT_STDNT_FGR}명`);
    console.log(`    교과: ${afs.ASL_CURR_PGM_FGR}개, 특기적성: ${afs.ASL_SPABL_APTD_PGM_FGR}개`);
  }
}

console.log("\n[7] DB에 캐싱 → (DB 미연결이므로 SKIP, 실패 무시)");
console.log('[8] 응답 반환 (source: "학교알리미 (실시간)")\n');
console.log("=== 두 번째 호출 시 ===");
console.log('[1] DB 조회 → 캐시 히트! → 즉시 반환 (source: "학교알리미")');
