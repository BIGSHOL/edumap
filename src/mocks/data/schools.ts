import type { SchoolItem, SchoolDetail } from "@/lib/api/contracts/schools";

/**
 * Mock 학교 데이터 — 실제 NEIS 데이터 기반
 *
 * 서울 강동구·송파구·강남구 + 부산 부산진구 학교들로 구성
 * 학구 단위 분석 데모를 위해 같은 구에 2~3개 학교씩 배치
 */
export const mockSchools: SchoolItem[] = [
  // ─── 서울 강동구 (학구 1: 강동초+강명초+강동중) ───
  {
    schoolCode: "7130106",
    schoolName: "서울강동초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "강동구",
    latitude: 37.5509,
    longitude: 127.1340,
    address: "서울특별시 강동구 상일로14길 77",
  },
  {
    schoolCode: "7130107",
    schoolName: "서울강명초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "강동구",
    latitude: 37.5472,
    longitude: 127.1511,
    address: "서울특별시 강동구 상일로 74-1",
  },
  {
    schoolCode: "7130167",
    schoolName: "강동중학교",
    schoolType: "middle",
    regionCode: "B10",
    district: "강동구",
    latitude: 37.5451,
    longitude: 127.1281,
    address: "서울특별시 강동구 풍산로 237",
  },
  // ─── 서울 강동구 (학구 2: 강일초+강빛초+강일중) ───
  {
    schoolCode: "7130108",
    schoolName: "서울강일초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "강동구",
    latitude: 37.5577,
    longitude: 127.1756,
    address: "서울특별시 강동구 아리수로98길 24",
  },
  {
    schoolCode: "7130266",
    schoolName: "서울강빛초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "강동구",
    latitude: 37.5601,
    longitude: 127.1698,
    address: "서울특별시 강동구 아리수로93다길 1",
  },
  {
    schoolCode: "7130169",
    schoolName: "강일중학교",
    schoolType: "middle",
    regionCode: "B10",
    district: "강동구",
    latitude: 37.5562,
    longitude: 127.1724,
    address: "서울특별시 강동구 고덕로27길 12",
  },
  // ─── 서울 송파구 (학구 3: 가동초+가락초+가락중) ───
  {
    schoolCode: "7130101",
    schoolName: "서울가동초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "송파구",
    latitude: 37.5005,
    longitude: 127.1141,
    address: "서울특별시 송파구 중대로20길 47",
  },
  {
    schoolCode: "7130102",
    schoolName: "서울가락초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "송파구",
    latitude: 37.4962,
    longitude: 127.1095,
    address: "서울특별시 송파구 송파대로37길 45",
  },
  {
    schoolCode: "7130165",
    schoolName: "가락중학교",
    schoolType: "middle",
    regionCode: "B10",
    district: "송파구",
    latitude: 37.4945,
    longitude: 127.1058,
    address: "서울특별시 송파구 송이로 45",
  },
  // ─── 서울 강남구 (학구 4: 개원초+개포초+개원중+개포중) ───
  {
    schoolCode: "7091369",
    schoolName: "서울개원초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "강남구",
    latitude: 37.4893,
    longitude: 127.0500,
    address: "서울특별시 강남구 선릉로 29",
  },
  {
    schoolCode: "7091371",
    schoolName: "서울개포초등학교",
    schoolType: "elementary",
    regionCode: "B10",
    district: "강남구",
    latitude: 37.4810,
    longitude: 127.0537,
    address: "서울특별시 강남구 삼성로4길 30",
  },
  {
    schoolCode: "7091420",
    schoolName: "개원중학교",
    schoolType: "middle",
    regionCode: "B10",
    district: "강남구",
    latitude: 37.4905,
    longitude: 127.0481,
    address: "서울특별시 강남구 영동대로 101",
  },
  {
    schoolCode: "7091421",
    schoolName: "개포중학교",
    schoolType: "middle",
    regionCode: "B10",
    district: "강남구",
    latitude: 37.4832,
    longitude: 127.0510,
    address: "서울특별시 강남구 선릉로 9",
  },
  // ─── 부산 부산진구 (학구 5: 부산진초+개금중) ───
  {
    schoolCode: "C100000123",
    schoolName: "부산진초등학교",
    schoolType: "elementary",
    regionCode: "C10",
    district: "부산진구",
    latitude: 35.1587,
    longitude: 129.0367,
    address: "부산광역시 부산진구 중앙대로 680",
  },
  {
    schoolCode: "C100000124",
    schoolName: "개금중학교",
    schoolType: "middle",
    regionCode: "C10",
    district: "부산진구",
    latitude: 35.1452,
    longitude: 129.0198,
    address: "부산광역시 부산진구 개금온천천로 31",
  },
];

/** Mock 학교 상세 — 다양한 여건의 학교들 */
export const mockSchoolDetails: SchoolDetail[] = [
  // ─── 학구 1: 강동구 강동초(양호) + 강명초(열악) + 강동중(보통) ───
  {
    ...mockSchools[0], // 서울강동초
    foundationType: "공립",
    foundationDate: "19640301",
    phoneNumber: "02-442-0801",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 15.2, // 양호
      tempTeacherRatio: 0.08,
      totalTeachers: 38,
      totalStudents: 578,
      femaleTeachers: 28,
      maleTeachers: 10,
      lecturerCount: 2,
      currentClasses: 22,
      authorizedClasses: 24,
    },
    financeStats: {
      year: 2024,
      totalBudget: 4800000000,
      educationBudget: 3200000000,
      budgetPerStudent: 5536000, // 양호
    },
    afterschoolPrograms: [
      { subject: "수학심화", enrollment: 22, category: "academic", academicEnrollment: 22, extracurricularEnrollment: null, totalEnrollmentSum: 22 },
      { subject: "영어회화", enrollment: 28, category: "language", academicEnrollment: 28, extracurricularEnrollment: null, totalEnrollmentSum: 28 },
      { subject: "로봇코딩", enrollment: 18, category: "technology", academicEnrollment: null, extracurricularEnrollment: 18, totalEnrollmentSum: 18 },
      { subject: "축구", enrollment: 25, category: "sports", academicEnrollment: null, extracurricularEnrollment: 25, totalEnrollmentSum: 25 },
      { subject: "미술", enrollment: 15, category: "arts", academicEnrollment: null, extracurricularEnrollment: 15, totalEnrollmentSum: 15 },
    ],
  },
  {
    ...mockSchools[1], // 서울강명초
    foundationType: "공립",
    foundationDate: "20010301",
    phoneNumber: "02-428-8800",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 24.1, // 열악
      tempTeacherRatio: 0.22, // 기간제 높음
      totalTeachers: 18,
      totalStudents: 434,
      femaleTeachers: 16,
      maleTeachers: 2, // 성별 편중
      lecturerCount: 4,
      currentClasses: 14,
      authorizedClasses: 16,
    },
    financeStats: {
      year: 2024,
      totalBudget: 2200000000,
      educationBudget: 1100000000,
      budgetPerStudent: 2534000, // 낮음
    },
    afterschoolPrograms: [
      { subject: "수학보충", enrollment: 12, category: "academic", academicEnrollment: 12, extracurricularEnrollment: null, totalEnrollmentSum: 12 },
    ],
  },
  {
    ...mockSchools[2], // 강동중
    foundationType: "공립",
    foundationDate: "19830301",
    phoneNumber: "02-474-3200",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 18.9, // 보통
      tempTeacherRatio: 0.15,
      totalTeachers: 28,
      totalStudents: 529,
      femaleTeachers: 18,
      maleTeachers: 10,
      lecturerCount: 3,
      currentClasses: 18,
      authorizedClasses: 20,
    },
    financeStats: {
      year: 2024,
      totalBudget: 3500000000,
      educationBudget: 2000000000,
      budgetPerStudent: 3781000,
    },
    afterschoolPrograms: [
      { subject: "영어", enrollment: 20, category: "language", academicEnrollment: 20, extracurricularEnrollment: null, totalEnrollmentSum: 20 },
      { subject: "농구", enrollment: 15, category: "sports", academicEnrollment: null, extracurricularEnrollment: 15, totalEnrollmentSum: 15 },
      { subject: "밴드", enrollment: 12, category: "arts", academicEnrollment: null, extracurricularEnrollment: 12, totalEnrollmentSum: 12 },
    ],
  },
  // ─── 학구 2: 강동구 강일초(보통) + 강빛초(양호) + 강일중(양호) ───
  {
    ...mockSchools[3], // 서울강일초
    foundationType: "공립",
    foundationDate: "20090301",
    phoneNumber: "02-426-0090",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 19.8,
      tempTeacherRatio: 0.14,
      totalTeachers: 32,
      totalStudents: 634,
      femaleTeachers: 24,
      maleTeachers: 8,
      lecturerCount: 2,
      currentClasses: 24,
      authorizedClasses: 24,
    },
    financeStats: {
      year: 2024,
      totalBudget: 4200000000,
      educationBudget: 2800000000,
      budgetPerStudent: 4416000,
    },
    afterschoolPrograms: [
      { subject: "국어논술", enrollment: 18, category: "academic", academicEnrollment: 18, extracurricularEnrollment: null, totalEnrollmentSum: 18 },
      { subject: "바이올린", enrollment: 10, category: "arts", academicEnrollment: null, extracurricularEnrollment: 10, totalEnrollmentSum: 10 },
      { subject: "태권도", enrollment: 22, category: "sports", academicEnrollment: null, extracurricularEnrollment: 22, totalEnrollmentSum: 22 },
    ],
  },
  {
    ...mockSchools[4], // 서울강빛초
    foundationType: "공립",
    foundationDate: "20180301",
    phoneNumber: "02-426-0180",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 13.5, // 매우 양호
      tempTeacherRatio: 0.06,
      totalTeachers: 42,
      totalStudents: 567,
      femaleTeachers: 30,
      maleTeachers: 12,
      lecturerCount: 1,
      currentClasses: 22,
      authorizedClasses: 24,
    },
    financeStats: {
      year: 2024,
      totalBudget: 5500000000,
      educationBudget: 3800000000,
      budgetPerStudent: 6702000,
    },
    afterschoolPrograms: [
      { subject: "영어회화", enrollment: 30, category: "language", academicEnrollment: 30, extracurricularEnrollment: null, totalEnrollmentSum: 30 },
      { subject: "코딩", enrollment: 25, category: "technology", academicEnrollment: null, extracurricularEnrollment: 25, totalEnrollmentSum: 25 },
      { subject: "합창", enrollment: 20, category: "arts", academicEnrollment: null, extracurricularEnrollment: 20, totalEnrollmentSum: 20 },
      { subject: "수영", enrollment: 18, category: "sports", academicEnrollment: null, extracurricularEnrollment: 18, totalEnrollmentSum: 18 },
      { subject: "수학경시", enrollment: 15, category: "academic", academicEnrollment: 15, extracurricularEnrollment: null, totalEnrollmentSum: 15 },
    ],
  },
  {
    ...mockSchools[5], // 강일중
    foundationType: "공립",
    foundationDate: "20100301",
    phoneNumber: "02-426-0100",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 14.8,
      tempTeacherRatio: 0.09,
      totalTeachers: 35,
      totalStudents: 518,
      femaleTeachers: 22,
      maleTeachers: 13,
      lecturerCount: 2,
      currentClasses: 18,
      authorizedClasses: 20,
    },
    financeStats: {
      year: 2024,
      totalBudget: 4900000000,
      educationBudget: 3200000000,
      budgetPerStudent: 5405000,
    },
    afterschoolPrograms: [
      { subject: "영어심화", enrollment: 24, category: "language", academicEnrollment: 24, extracurricularEnrollment: null, totalEnrollmentSum: 24 },
      { subject: "프로그래밍", enrollment: 20, category: "technology", academicEnrollment: null, extracurricularEnrollment: 20, totalEnrollmentSum: 20 },
      { subject: "배드민턴", enrollment: 16, category: "sports", academicEnrollment: null, extracurricularEnrollment: 16, totalEnrollmentSum: 16 },
      { subject: "미술", enrollment: 14, category: "arts", academicEnrollment: null, extracurricularEnrollment: 14, totalEnrollmentSum: 14 },
    ],
  },
  // ─── 학구 3: 송파구 가동초(열악) + 가락초(보통) + 가락중(열악) ───
  {
    ...mockSchools[6], // 서울가동초
    foundationType: "공립",
    foundationDate: "19880301",
    phoneNumber: "02-403-0088",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 22.5, // 열악
      tempTeacherRatio: 0.19,
      totalTeachers: 20,
      totalStudents: 450,
      femaleTeachers: 18,
      maleTeachers: 2, // 극심한 편중
      lecturerCount: 5,
      currentClasses: 14,
      authorizedClasses: 18,
    },
    financeStats: {
      year: 2024,
      totalBudget: 2500000000,
      educationBudget: 1300000000,
      budgetPerStudent: 2889000, // 낮음
    },
    afterschoolPrograms: [
      { subject: "수학", enrollment: 15, category: "academic", academicEnrollment: 15, extracurricularEnrollment: null, totalEnrollmentSum: 15 },
      { subject: "피아노", enrollment: 8, category: "arts", academicEnrollment: null, extracurricularEnrollment: 8, totalEnrollmentSum: 8 },
    ],
  },
  {
    ...mockSchools[7], // 서울가락초
    foundationType: "공립",
    foundationDate: "19830301",
    phoneNumber: "02-401-0083",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 17.3,
      tempTeacherRatio: 0.11,
      totalTeachers: 30,
      totalStudents: 519,
      femaleTeachers: 22,
      maleTeachers: 8,
      lecturerCount: 2,
      currentClasses: 18,
      authorizedClasses: 18,
    },
    financeStats: {
      year: 2024,
      totalBudget: 3800000000,
      educationBudget: 2400000000,
      budgetPerStudent: 4624000,
    },
    afterschoolPrograms: [
      { subject: "영어", enrollment: 20, category: "language", academicEnrollment: 20, extracurricularEnrollment: null, totalEnrollmentSum: 20 },
      { subject: "축구", enrollment: 18, category: "sports", academicEnrollment: null, extracurricularEnrollment: 18, totalEnrollmentSum: 18 },
      { subject: "국어논술", enrollment: 14, category: "academic", academicEnrollment: 14, extracurricularEnrollment: null, totalEnrollmentSum: 14 },
    ],
  },
  {
    ...mockSchools[8], // 가락중
    foundationType: "공립",
    foundationDate: "19860301",
    phoneNumber: "02-400-0086",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 23.8, // 열악
      tempTeacherRatio: 0.20,
      totalTeachers: 22,
      totalStudents: 524,
      femaleTeachers: 17,
      maleTeachers: 5,
      lecturerCount: 4,
      currentClasses: 16,
      authorizedClasses: 20,
    },
    financeStats: {
      year: 2024,
      totalBudget: 2800000000,
      educationBudget: 1500000000,
      budgetPerStudent: 2863000, // 낮음
    },
    afterschoolPrograms: [
      { subject: "수학보충", enrollment: 10, category: "academic", academicEnrollment: 10, extracurricularEnrollment: null, totalEnrollmentSum: 10 },
    ],
  },
  // ─── 학구 4: 강남구 개원초+개포초+개원중+개포중 (전반적 양호) ───
  {
    ...mockSchools[9], // 서울개원초
    foundationType: "공립",
    foundationDate: "19820301",
    phoneNumber: "02-574-0082",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 14.2,
      tempTeacherRatio: 0.07,
      totalTeachers: 45,
      totalStudents: 639,
      femaleTeachers: 32,
      maleTeachers: 13,
      lecturerCount: 1,
      currentClasses: 24,
      authorizedClasses: 24,
    },
    financeStats: {
      year: 2024,
      totalBudget: 6200000000,
      educationBudget: 4500000000,
      budgetPerStudent: 7043000,
    },
    afterschoolPrograms: [
      { subject: "영어심화", enrollment: 35, category: "language", academicEnrollment: 35, extracurricularEnrollment: null, totalEnrollmentSum: 35 },
      { subject: "SW코딩", enrollment: 28, category: "technology", academicEnrollment: null, extracurricularEnrollment: 28, totalEnrollmentSum: 28 },
      { subject: "수학올림피아드", enrollment: 22, category: "academic", academicEnrollment: 22, extracurricularEnrollment: null, totalEnrollmentSum: 22 },
      { subject: "바이올린", enrollment: 18, category: "arts", academicEnrollment: null, extracurricularEnrollment: 18, totalEnrollmentSum: 18 },
      { subject: "수영", enrollment: 20, category: "sports", academicEnrollment: null, extracurricularEnrollment: 20, totalEnrollmentSum: 20 },
    ],
  },
  {
    ...mockSchools[10], // 서울개포초
    foundationType: "공립",
    foundationDate: "19820901",
    phoneNumber: "02-575-0082",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 13.8,
      tempTeacherRatio: 0.05,
      totalTeachers: 48,
      totalStudents: 662,
      femaleTeachers: 35,
      maleTeachers: 13,
      lecturerCount: 1,
      currentClasses: 26,
      authorizedClasses: 26,
    },
    financeStats: {
      year: 2024,
      totalBudget: 6800000000,
      educationBudget: 4900000000,
      budgetPerStudent: 7402000,
    },
    afterschoolPrograms: [
      { subject: "영어", enrollment: 32, category: "language", academicEnrollment: 32, extracurricularEnrollment: null, totalEnrollmentSum: 32 },
      { subject: "로봇공학", enrollment: 25, category: "technology", academicEnrollment: null, extracurricularEnrollment: 25, totalEnrollmentSum: 25 },
      { subject: "피아노", enrollment: 20, category: "arts", academicEnrollment: null, extracurricularEnrollment: 20, totalEnrollmentSum: 20 },
      { subject: "테니스", enrollment: 16, category: "sports", academicEnrollment: null, extracurricularEnrollment: 16, totalEnrollmentSum: 16 },
      { subject: "수학", enrollment: 30, category: "academic", academicEnrollment: 30, extracurricularEnrollment: null, totalEnrollmentSum: 30 },
    ],
  },
  {
    ...mockSchools[11], // 개원중
    foundationType: "공립",
    foundationDate: "19850301",
    phoneNumber: "02-572-0085",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 15.5,
      tempTeacherRatio: 0.08,
      totalTeachers: 40,
      totalStudents: 620,
      femaleTeachers: 26,
      maleTeachers: 14,
      lecturerCount: 2,
      currentClasses: 22,
      authorizedClasses: 24,
    },
    financeStats: {
      year: 2024,
      totalBudget: 5800000000,
      educationBudget: 4000000000,
      budgetPerStudent: 6452000,
    },
    afterschoolPrograms: [
      { subject: "영어토론", enrollment: 22, category: "language", academicEnrollment: 22, extracurricularEnrollment: null, totalEnrollmentSum: 22 },
      { subject: "축구", enrollment: 18, category: "sports", academicEnrollment: null, extracurricularEnrollment: 18, totalEnrollmentSum: 18 },
      { subject: "미술", enrollment: 14, category: "arts", academicEnrollment: null, extracurricularEnrollment: 14, totalEnrollmentSum: 14 },
      { subject: "코딩", enrollment: 20, category: "technology", academicEnrollment: null, extracurricularEnrollment: 20, totalEnrollmentSum: 20 },
    ],
  },
  {
    ...mockSchools[12], // 개포중
    foundationType: "공립",
    foundationDate: "19830901",
    phoneNumber: "02-576-0083",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 14.9,
      tempTeacherRatio: 0.06,
      totalTeachers: 42,
      totalStudents: 626,
      femaleTeachers: 28,
      maleTeachers: 14,
      lecturerCount: 1,
      currentClasses: 22,
      authorizedClasses: 22,
    },
    financeStats: {
      year: 2024,
      totalBudget: 6000000000,
      educationBudget: 4200000000,
      budgetPerStudent: 6710000,
    },
    afterschoolPrograms: [
      { subject: "영어", enrollment: 28, category: "language", academicEnrollment: 28, extracurricularEnrollment: null, totalEnrollmentSum: 28 },
      { subject: "프로그래밍", enrollment: 22, category: "technology", academicEnrollment: null, extracurricularEnrollment: 22, totalEnrollmentSum: 22 },
      { subject: "농구", enrollment: 16, category: "sports", academicEnrollment: null, extracurricularEnrollment: 16, totalEnrollmentSum: 16 },
      { subject: "합창", enrollment: 15, category: "arts", academicEnrollment: null, extracurricularEnrollment: 15, totalEnrollmentSum: 15 },
      { subject: "수학", enrollment: 25, category: "academic", academicEnrollment: 25, extracurricularEnrollment: null, totalEnrollmentSum: 25 },
    ],
  },
  // ─── 학구 5: 부산진구 부산진초(열악) + 개금중(보통) ───
  {
    ...mockSchools[13], // 부산진초
    foundationType: "공립",
    foundationDate: "19460301",
    phoneNumber: "051-808-0046",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 21.3,
      tempTeacherRatio: 0.18,
      totalTeachers: 24,
      totalStudents: 511,
      femaleTeachers: 20,
      maleTeachers: 4,
      lecturerCount: 3,
      currentClasses: 16,
      authorizedClasses: 18,
    },
    financeStats: {
      year: 2024,
      totalBudget: 2600000000,
      educationBudget: 1400000000,
      budgetPerStudent: 2740000,
    },
    afterschoolPrograms: [
      { subject: "영어", enrollment: 14, category: "language", academicEnrollment: 14, extracurricularEnrollment: null, totalEnrollmentSum: 14 },
      { subject: "축구", enrollment: 20, category: "sports", academicEnrollment: null, extracurricularEnrollment: 20, totalEnrollmentSum: 20 },
    ],
  },
  {
    ...mockSchools[14], // 개금중
    foundationType: "공립",
    foundationDate: "19780301",
    phoneNumber: "051-890-0078",
    homepageUrl: null,
    coeducationType: "남여공학",
    highSchoolType: null,
    dayNightType: "주간",
    teacherStats: {
      year: 2024,
      studentsPerTeacher: 17.8,
      tempTeacherRatio: 0.12,
      totalTeachers: 30,
      totalStudents: 534,
      femaleTeachers: 20,
      maleTeachers: 10,
      lecturerCount: 2,
      currentClasses: 18,
      authorizedClasses: 20,
    },
    financeStats: {
      year: 2024,
      totalBudget: 3600000000,
      educationBudget: 2200000000,
      budgetPerStudent: 4120000,
    },
    afterschoolPrograms: [
      { subject: "영어", enrollment: 18, category: "language", academicEnrollment: 18, extracurricularEnrollment: null, totalEnrollmentSum: 18 },
      { subject: "농구", enrollment: 15, category: "sports", academicEnrollment: null, extracurricularEnrollment: 15, totalEnrollmentSum: 15 },
      { subject: "미술", enrollment: 12, category: "arts", academicEnrollment: null, extracurricularEnrollment: 12, totalEnrollmentSum: 12 },
    ],
  },
];

/** 하위 호환용 — 첫 번째 학교 상세 */
export const mockSchoolDetail: SchoolDetail = mockSchoolDetails[0];

export const mockReportContent = {
  policy: `## 서울 강동구 교육 격차 현황 분석

강동구 지역의 초등학교 교육 환경을 분석한 결과, 학교 간 교육여건 편차가 크게 나타나고 있습니다.

### 주요 발견

강동초(교원1인당 15.2명)와 강명초(24.1명) 사이에 약 9명의 차이가 있어, 같은 동네에서도 배정 학교에 따라 학습환경이 크게 달라집니다.

### 정책 개입 우선순위

1. 강명초 정규 교원 확충 (기간제 비율 22% → 10% 이하)
2. 방과후 프로그램 불균형 해소 (강명초 1개 → 5개 이상)

> 출처: 학교알리미 (2024년 기준)`,

  teacher: `## 우리 학교 학습 환경 분석

선생님, 서울강동초등학교의 현재 학습 환경을 분석해 드립니다.

교원 1인당 학생 수 15.2명으로 서울시 평균보다 양호합니다. 방과후 프로그램도 5개 분야를 고르게 운영 중입니다.

### 주목할 점

같은 학구 내 서울강명초가 교원 여건이 열악합니다. 학구 단위 협력 프로그램을 통해 자원을 공유하면 지역 전체의 교육 품질을 높일 수 있습니다.

> 출처: 학교알리미 (2024년 기준)`,

  parent: `## 우리 아이 학교는 어떤 곳인가요?

서울강동초등학교에 대해 쉽게 설명해 드릴게요.

**선생님 한 분이 약 15명의 학생을 담당**하고 있어요. 서울시 평균보다 좋은 수준입니다.

방과후에 영어, 코딩, 축구, 미술, 수학 수업이 있어요. 다양한 분야를 접할 수 있는 환경입니다.

> 출처: 학교알리미 (2024년 기준)`,
};
