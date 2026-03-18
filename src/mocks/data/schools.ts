import type { SchoolItem, SchoolDetail } from "@/lib/api/contracts/schools";

export const mockSchools: SchoolItem[] = [
  {
    schoolCode: "B100000465",
    schoolName: "서울대학교사범대학부설초등학교", // 학교명
    schoolType: "elementary",
    regionCode: "B10", // 서울특별시교육청
    district: "종로구",
    latitude: 37.5816,
    longitude: 126.9992,
    address: "서울특별시 종로구 대학로 1",
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
  },
  {
    schoolCode: "C100000123",
    schoolName: "부산진초등학교", // 학교명
    schoolType: "elementary",
    regionCode: "C10", // 부산광역시교육청
    district: "부산진구",
    latitude: 35.1587,
    longitude: 129.0367,
    address: "부산광역시 부산진구 중앙대로 680",
  },
];

export const mockSchoolDetail: SchoolDetail = {
  ...mockSchools[0],
  teacherStats: {
    year: 2025,
    studentsPerTeacher: 18.5, // 교원1인당학생수
    tempTeacherRatio: 0.12, // 기간제교원비율
    totalTeachers: 42,
    totalStudents: 777,
  },
  financeStats: {
    year: 2025,
    totalBudget: 5200000000, // 세입결산총액
    educationBudget: 3100000000, // 교육활동비
    budgetPerStudent: 3990000, // 학생1인당교육비
  },
  afterschoolPrograms: [
    { subject: "영어회화", enrollment: 25, category: "academic" }, // 프로그램명, 수강인원수
    { subject: "코딩교실", enrollment: 20, category: "academic" },
    { subject: "축구", enrollment: 30, category: "sports" },
  ],
};

export const mockReportContent = {
  policy: `## 서울 종로구 교육 격차 현황 분석

종로구 지역의 초등학교 교육 환경을 분석한 결과, 교원 1인당 학생 수가 18.5명으로 서울시 평균(16.2명)보다 높은 수준입니다.

### 주요 발견

이 지역의 학습격차가 발생하는 핵심 원인은 **기간제 교원 비율**에 있습니다. 전체 교원의 12%가 기간제로, 이는 수업의 연속성과 학생 관리에 영향을 미칠 수 있습니다.

### 정책 개입 우선순위

1. 정규 교원 확충을 통한 교원 1인당 학생 수 감소
2. 방과후 프로그램 다양화 (현재 3개 → 목표 5개 이상)

> 출처: 학교알리미 (2025년 기준)`,

  teacher: `## 우리 학교 학습 환경 분석

선생님, 서울대학교사범대학부설초등학교의 현재 학습 환경을 분석해 드립니다.

현재 학교의 교원 1인당 학생 수는 18.5명입니다. 이는 같은 지역 평균보다 약간 높은 수준이에요.

### 주목할 점

방과후 프로그램이 3개 운영 중인데, 학술(영어회화, 코딩)과 체육(축구) 중심입니다. 예체능 분야의 프로그램을 보완하면 학생들의 균형 있는 성장에 도움이 될 수 있습니다.

> 출처: 학교알리미 (2025년 기준)`,

  parent: `## 우리 아이 학교는 어떤 곳인가요?

서울대학교사범대학부설초등학교에 대해 쉽게 설명해 드릴게요.

**선생님 한 분이 약 19명의 학생을 담당**하고 있어요. 전국 평균과 비슷한 수준이라 안심하셔도 됩니다.

학교에서는 방과후에 영어회화, 코딩, 축구 수업을 운영하고 있어요. 아이가 관심 있는 분야가 있다면 참여해 보시는 것도 좋겠습니다.

> 출처: 학교알리미 (2025년 기준)`,
};
