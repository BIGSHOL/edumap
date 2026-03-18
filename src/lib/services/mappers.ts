/**
 * 공공 API 응답 → SchoolDetail/SchoolItem 변환 매퍼
 *
 * NEIS(나이스) + 학교알리미 API 응답을 프로젝트 내부 타입으로 변환
 * 기존 4개 라우트에 중복되던 Prisma→SchoolDetail 변환도 통합
 */

import type { SchoolDetail, SchoolItem } from "@/lib/api/contracts/schools";
import type { NeisSchoolRow } from "@/lib/api/neis";
import type {
  SchoolOverviewRow,
  TeacherPositionRow,
} from "@/lib/api/schoolinfo";
import { toSchoolType } from "./region-codes";

// ─── NEIS → SchoolItem ───

/** NEIS 학교기본정보 → SchoolItem */
export function mapNeisToSchoolItem(row: NeisSchoolRow): SchoolItem {
  return {
    schoolCode: row.SD_SCHUL_CODE,
    schoolName: row.SCHUL_NM,
    schoolType: toSchoolType(row.SCHUL_KND_SC_NM),
    regionCode: row.ATPT_OFCDC_SC_CODE,
    district: row.LCTN_SC_NM || extractDistrict(row.ORG_RDNMA),
    latitude: null,
    longitude: null,
    address: row.ORG_RDNMA || null,
  };
}

// ─── 학교알리미 → teacherStats ───

/** 학교알리미 apiType=09 + apiType=17 → teacherStats */
export function mapToTeacherStats(
  overview: SchoolOverviewRow | undefined,
  positions: TeacherPositionRow | undefined,
  year: number
): SchoolDetail["teacherStats"] {
  if (!overview) return null;

  const totalTeachers = overview.TEACH_CNT;
  const totalStudents = overview.COL_S_SUM;
  const studentsPerTeacher = overview.COL_SUM ?? overview.TEACH_CAL ?? null;

  // 기간제교원비율: apiType=17의 COL_11(기간제) / (COL_1(정규) + COL_11(기간제))
  let tempTeacherRatio: number | null = null;
  if (positions) {
    const regular = positions.COL_1 ?? 0;
    const temp = positions.COL_11 ?? 0;
    const total = regular + temp;
    tempTeacherRatio = total > 0 ? temp / total : 0;
  }

  return {
    year,
    studentsPerTeacher,
    tempTeacherRatio,
    totalTeachers,
    totalStudents,
  };
}

// ─── 학교알리미 → afterschoolPrograms ───

/**
 * 학교알리미 apiType=59 → afterschoolPrograms
 *
 * 학교알리미 방과후 API는 학교 단위 요약 정보만 제공 (개별 프로그램 목록 아님)
 * 프로그램 수와 참여 학생 수를 기반으로 요약 항목 생성
 */
export function mapToAfterSchoolPrograms(
  programCount: number,
  participantCount: number,
  currProgramCount: number,
  aptdProgramCount: number
): SchoolDetail["afterschoolPrograms"] {
  const programs: SchoolDetail["afterschoolPrograms"] = [];

  // 교과 프로그램
  if (currProgramCount > 0) {
    programs.push({
      subject: `교과 프로그램 (${currProgramCount}개)`,
      enrollment: null,
      category: "academic",
    });
  }

  // 특기적성 프로그램
  if (aptdProgramCount > 0) {
    programs.push({
      subject: `특기적성 프로그램 (${aptdProgramCount}개)`,
      enrollment: null,
      category: "extracurricular",
    });
  }

  // 전체 참여 학생 수 기반 요약 항목 (프로그램 수가 있지만 분류 정보가 없는 경우)
  if (programs.length === 0 && programCount > 0) {
    programs.push({
      subject: `방과후 프로그램 (${programCount}개)`,
      enrollment: participantCount > 0 ? participantCount : null,
      category: "academic",
    });
  }

  return programs;
}

// ─── Prisma → SchoolDetail (기존 4개 라우트 중복 제거) ───

/** Prisma school + relations → SchoolDetail */
export function mapPrismaToSchoolDetail(school: {
  schoolCode: string;
  schoolName: string;
  schoolType: string;
  regionCode: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  teacherStats: Array<{
    year: number;
    studentsPerTeacher: number | null;
    tempTeacherRatio: number | null;
    totalTeachers: number | null;
    totalStudents: number | null;
  }>;
  financeStats: Array<{
    year: number;
    totalBudget: bigint | null;
    educationBudget: bigint | null;
    budgetPerStudent: number | null;
  }>;
  afterschoolProgram: Array<{
    subject: string;
    enrollment: number | null;
    category: string | null;
  }>;
}): SchoolDetail {
  const ts = school.teacherStats[0];
  const fs = school.financeStats[0];

  return {
    schoolCode: school.schoolCode,
    schoolName: school.schoolName,
    schoolType: school.schoolType as "elementary" | "middle" | "high",
    regionCode: school.regionCode,
    district: school.district,
    latitude: school.latitude,
    longitude: school.longitude,
    address: school.address,
    teacherStats: ts
      ? {
          year: ts.year,
          studentsPerTeacher: ts.studentsPerTeacher,
          tempTeacherRatio: ts.tempTeacherRatio,
          totalTeachers: ts.totalTeachers,
          totalStudents: ts.totalStudents,
        }
      : null,
    financeStats: fs
      ? {
          year: fs.year,
          totalBudget: fs.totalBudget ? Number(fs.totalBudget) : null,
          educationBudget: fs.educationBudget
            ? Number(fs.educationBudget)
            : null,
          budgetPerStudent: fs.budgetPerStudent,
        }
      : null,
    afterschoolPrograms: school.afterschoolProgram.map((p) => ({
      subject: p.subject,
      enrollment: p.enrollment,
      category: p.category,
    })),
  };
}

// ─── 헬퍼 ───

/** 주소에서 시군구 추출 (예: "서울특별시 종로구 ..." → "종로구") */
function extractDistrict(address: string): string {
  if (!address) return "";
  const parts = address.split(" ");
  return parts[1] ?? parts[0] ?? "";
}
