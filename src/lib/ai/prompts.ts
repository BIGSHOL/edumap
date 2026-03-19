import type { ReportType } from "@/types/report";
import type { SchoolDetail } from "@/lib/api/contracts/schools";
import type { AcademyStatsData } from "@/lib/services/academy-data";

/**
 * 대상별 프롬프트 생성
 *
 * 프롬프트 원칙:
 * - 숫자 나열 금지 → 스토리텔링 형태
 * - "왜 이 격차가 발생했는가" 원인 중심 서술
 * - 대상에 맞는 언어 수준 명시
 */
export function buildReportPrompt(
  reportType: ReportType,
  school: SchoolDetail,
  academyStats?: AcademyStatsData
): string {
  const baseContext = buildSchoolContext(school, academyStats);

  switch (reportType) {
    case "policy":
      return buildPolicyPrompt(baseContext, school);
    case "teacher":
      return buildTeacherPrompt(baseContext, school);
    case "parent":
      return buildParentPrompt(baseContext, school);
  }
}

function buildSchoolContext(school: SchoolDetail, academyStats?: AcademyStatsData): string {
  const lines: string[] = [
    `학교명: ${school.schoolName}`,
    `학교급: ${school.schoolType === "elementary" ? "초등학교" : school.schoolType === "middle" ? "중학교" : "고등학교"}`,
    `소재지: ${school.district}`,
  ];

  if (school.teacherStats) {
    const ts = school.teacherStats;
    lines.push(`[교원 현황 - ${ts.year}년]`);
    if (ts.studentsPerTeacher != null)
      lines.push(`  교원 1인당 학생 수: ${ts.studentsPerTeacher}명`); // 교원1인당학생수
    if (ts.tempTeacherRatio != null)
      lines.push(`  기간제 교원 비율: ${(ts.tempTeacherRatio * 100).toFixed(1)}%`); // 기간제교원비율
    if (ts.totalTeachers != null) lines.push(`  전체 교원 수: ${ts.totalTeachers}명`);
    if (ts.totalStudents != null) lines.push(`  전체 학생 수: ${ts.totalStudents}명`);
  }

  if (school.financeStats) {
    const fs = school.financeStats;
    lines.push(`[재정 현황 - ${fs.year}년]`);
    if (fs.budgetPerStudent != null)
      lines.push(`  학생 1인당 교육비: ${Math.round(fs.budgetPerStudent).toLocaleString()}원`); // 학생1인당교육비
  }

  if (school.afterschoolPrograms.length > 0) {
    lines.push(`[방과후 프로그램]`);
    lines.push(`  운영 프로그램 수: ${school.afterschoolPrograms.length}개`);
    school.afterschoolPrograms.forEach((p) => {
      lines.push(`  - ${p.subject} (${p.enrollment ?? "?"}명 수강)`); // 프로그램명, 수강인원수
    });
  }

  // 주변 학원 현황 (나이스 학원교습소정보)
  if (academyStats) {
    lines.push(`[주변 학원 현황 - ${academyStats.year}년, ${academyStats.district}]`);
    lines.push(`  지역 내 학원 수: ${academyStats.totalAcademies}개`);
    if (academyStats.totalCapacity) {
      lines.push(`  총 수용 인원: ${academyStats.totalCapacity.toLocaleString()}명`);
    }
    const topRealms = Object.entries(academyStats.academyByRealm)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    for (const [realm, count] of topRealms) {
      lines.push(`  - ${realm}: ${count}개`); // 교습영역별 학원수
    }
  }

  return lines.join("\n");
}

function buildPolicyPrompt(context: string, school: SchoolDetail): string {
  return `당신은 교육 정책 분석 전문가입니다. 아래 학교 데이터를 분석하여 교육청 정책담당자를 위한 리포트를 작성하세요.

## 규칙
- 반드시 한글로만 작성. 영어 용어 사용 최소화
- 공식적이고 신뢰감 있는 어조로 작성
- 숫자를 나열하지 말고, 스토리텔링 형태로 인사이트를 전달
- "왜 이런 격차가 발생했는가" 원인 중심으로 서술
- 정책 개입 우선순위를 제안
- 이모지 사용 금지
- 마지막에 "출처: 학교알리미 (${school.teacherStats?.year ?? 2025}년 기준)" 포함

## 학교 데이터
${context}

## 요청
${school.schoolName}이 위치한 ${school.district} 지역의 교육 격차 현황을 분석하고, 정책 개입 우선순위를 제안하는 리포트를 작성하세요. 마크다운 형식으로 작성하되, 제목은 ##으로 시작합니다.`;
}

function buildTeacherPrompt(context: string, school: SchoolDetail): string {
  return `당신은 교육 현장 분석 전문가입니다. 아래 학교 데이터를 분석하여 담임교사를 위한 리포트를 작성하세요.

## 규칙
- 반드시 한글로만 작성. 영어 용어 사용 금지
- 친근하지만 전문적인 어조 (교사 동료에게 말하듯)
- 숫자 나열 금지 → 의미 중심 해석
- "우리 학교"라는 표현 사용
- 학생 격차의 원인과 교실에서 활용할 수 있는 시사점 포함
- 이모지 사용 금지
- 마지막에 "출처: 학교알리미 (${school.teacherStats?.year ?? 2025}년 기준)" 포함

## 학교 데이터
${context}

## 요청
${school.schoolName}의 학습 환경을 분석하고, 교사가 학생 격차 해소에 참고할 수 있는 인사이트를 담은 리포트를 작성하세요. 마크다운 형식으로 작성하되, 제목은 ##으로 시작합니다.`;
}

function buildParentPrompt(context: string, school: SchoolDetail): string {
  return `당신은 교육 상담사입니다. 아래 학교 데이터를 분석하여 학부모를 위한 리포트를 작성하세요.

## 규칙
- 반드시 한글로만 작성. 영어 용어 사용 금지
- 쉽고 친근한 언어 사용 (전문 용어 금지)
- "우리 아이 학교"라는 표현 사용
- 비유와 쉬운 설명 활용
- 학부모가 걱정할 만한 점과 안심할 수 있는 점을 균형 있게 제시
- 이모지 사용 금지
- 마지막에 "출처: 학교알리미 (${school.teacherStats?.year ?? 2025}년 기준)" 포함

## 학교 데이터
${context}

## 요청
${school.schoolName}의 학습 환경에 대해 비전문가인 학부모가 쉽게 이해할 수 있는 인사이트 리포트를 작성하세요. 마크다운 형식으로 작성하되, 제목은 ##으로 시작합니다.`;
}
