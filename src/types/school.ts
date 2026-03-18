/** 학교급 */
export type SchoolType = "elementary" | "middle" | "high";

/** 학교 기본 정보 */
export interface SchoolInfo {
  schoolCode: string; // 학교코드
  schoolName: string; // 학교명
  schoolType: SchoolType; // 학교급
  regionCode: string; // 시도교육청 코드
  district: string; // 시군구
  latitude: number | null; // 위도
  longitude: number | null; // 경도
  address: string | null; // 주소
}

/** 지역 정보 */
export interface RegionInfo {
  regionCode: string; // 시도교육청 코드
  regionName: string; // 시도명
  subRegion?: string; // 시군구
}

/** 교원 현황 */
export interface TeacherStatsInfo {
  schoolCode: string;
  year: number;
  studentsPerTeacher: number | null; // 교원1인당학생수
  tempTeacherRatio: number | null; // 기간제교원비율
  totalTeachers: number | null; // 전체 교원 수
  totalStudents: number | null; // 전체 학생 수
}

/** 재정 현황 */
export interface FinanceStatsInfo {
  schoolCode: string;
  year: number;
  totalBudget: number | null; // 세입결산총액
  educationBudget: number | null; // 교육활동비
  budgetPerStudent: number | null; // 학생1인당교육비
}

/** 방과후 프로그램 */
export interface AfterSchoolProgramInfo {
  schoolCode: string;
  year: number;
  subject: string; // 프로그램명
  enrollment: number | null; // 수강인원수
  category: string | null; // 분류
}
