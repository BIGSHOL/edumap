import { z } from "zod/v4";

/** 학교 목록 조회 요청 파라미터 */
export const SchoolsQuerySchema = z.object({
  region: z.string().optional(), // 시도교육청 코드
  type: z.enum(["elementary", "middle", "high"]).optional(), // 학교급
  search: z.string().optional(), // 학교명 검색
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SchoolsQuery = z.infer<typeof SchoolsQuerySchema>;

/** 학교 목록 응답 아이템 */
export const SchoolItemSchema = z.object({
  schoolCode: z.string(),
  schoolName: z.string(),
  schoolType: z.enum(["elementary", "middle", "high"]),
  regionCode: z.string(),
  district: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  address: z.string().nullable(),
});

export type SchoolItem = z.infer<typeof SchoolItemSchema>;

/** 학교 상세 응답 (교원+재정+방과후 포함) */
export const SchoolDetailSchema = SchoolItemSchema.extend({
  // 학교 메타 정보 (NEIS에서)
  foundationType: z.string().nullable().optional(), // 설립명 (국립/공립/사립)
  foundationDate: z.string().nullable().optional(), // 설립일자
  phoneNumber: z.string().nullable().optional(), // 전화번호
  homepageUrl: z.string().nullable().optional(), // 홈페이지주소
  coeducationType: z.string().nullable().optional(), // 남녀공학구분
  highSchoolType: z.string().nullable().optional(), // 고교유형 (일반/특성화/자율)
  dayNightType: z.string().nullable().optional(), // 주야구분

  teacherStats: z
    .object({
      year: z.number(),
      studentsPerTeacher: z.number().nullable(), // 교원1인당학생수
      tempTeacherRatio: z.number().nullable(), // 기간제교원비율
      totalTeachers: z.number().nullable(),
      totalStudents: z.number().nullable(),
      // 교원 확장 (학교알리미에서)
      femaleTeachers: z.number().nullable().optional(), // 여교원수
      maleTeachers: z.number().nullable().optional(), // 남교원수
      lecturerCount: z.number().nullable().optional(), // 강사수
      currentClasses: z.number().nullable().optional(), // 현재 학급수
      authorizedClasses: z.number().nullable().optional(), // 인가 학급수
    })
    .nullable(),
  financeStats: z
    .object({
      year: z.number(),
      totalBudget: z.number().nullable(), // 세입결산총액
      educationBudget: z.number().nullable(), // 교육활동비
      budgetPerStudent: z.number().nullable(), // 학생1인당교육비
    })
    .nullable(),
  afterschoolPrograms: z.array(
    z.object({
      subject: z.string(), // 프로그램명
      enrollment: z.number().nullable(), // 수강인원수
      category: z.string().nullable(),
      // 방과후 확장 (학교알리미에서)
      academicEnrollment: z.number().nullable().optional(), // 교과 수강학생수
      extracurricularEnrollment: z.number().nullable().optional(), // 특기적성 수강학생수
      totalEnrollmentSum: z.number().nullable().optional(), // 수강 연인원
    })
  ),
});

export type SchoolDetail = z.infer<typeof SchoolDetailSchema>;
