import Anthropic from "@anthropic-ai/sdk";
import type { ReportType } from "@/types/report";
import type { SchoolDetail } from "@/lib/api/contracts/schools";
import { buildReportPrompt } from "./prompts";

const MODEL = "claude-opus-4-5";

/**
 * Claude API를 사용하여 대상별 리포트를 생성합니다.
 *
 * @param reportType - 리포트 유형 (policy/teacher/parent)
 * @param school - 학교 상세 정보
 * @returns 생성된 리포트 텍스트
 */
export async function generateReport(
  reportType: ReportType,
  school: SchoolDetail
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // API 키가 없으면 샘플 리포트 반환 (대회 데모 대비)
    return generateFallbackReport(reportType, school);
  }

  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildReportPrompt(reportType, school);

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude API에서 텍스트 응답을 받지 못했습니다.");
    }

    return textBlock.text;
  } catch (error) {
    console.error("Claude API 호출 실패:", error);
    // Fallback: 기본 리포트 생성
    return generateFallbackReport(reportType, school);
  }
}

/**
 * Claude API 사용 불가 시 기본 리포트를 생성합니다.
 */
function generateFallbackReport(
  reportType: ReportType,
  school: SchoolDetail
): string {
  const schoolTypeLabel =
    school.schoolType === "elementary"
      ? "초등학교"
      : school.schoolType === "middle"
        ? "중학교"
        : "고등학교";

  const teacherInfo = school.teacherStats
    ? `교원 1인당 학생 수는 ${school.teacherStats.studentsPerTeacher}명`
    : "교원 현황 데이터 없음";

  const programCount = school.afterschoolPrograms.length;

  switch (reportType) {
    case "policy":
      return `## ${school.district} 교육 격차 현황 분석

${school.schoolName}(${schoolTypeLabel})의 교육 환경을 분석한 결과, ${teacherInfo}입니다.

### 주요 발견

이 지역의 학습격차 요인을 분석하면, 교원 여건과 방과후 프로그램 운영 현황이 핵심적인 역할을 하고 있습니다. 현재 ${programCount}개의 방과후 프로그램이 운영 중입니다.

### 정책 개입 우선순위

1. 정규 교원 확충을 통한 학급당 학생 수 감소
2. 방과후 프로그램 다양화 및 접근성 개선

> 출처: 학교알리미 (${school.teacherStats?.year ?? 2025}년 기준)
> ⚠️ 이 리포트는 샘플 데이터 기반입니다.`;

    case "teacher":
      return `## 우리 학교 학습 환경 분석

선생님, ${school.schoolName}의 현재 학습 환경을 분석해 드립니다.

현재 학교의 ${teacherInfo}입니다.

### 주목할 점

방과후 프로그램이 ${programCount}개 운영 중입니다. ${
        programCount < 5
          ? "프로그램 수가 적은 편이므로, 학생들의 다양한 학습 기회 확보를 위해 추가 프로그램 도입을 고려해 볼 수 있습니다."
          : "다양한 프로그램이 운영되고 있어 학생들의 학습 기회가 풍부합니다."
      }

> 출처: 학교알리미 (${school.teacherStats?.year ?? 2025}년 기준)
> ⚠️ 이 리포트는 샘플 데이터 기반입니다.`;

    case "parent":
      return `## 우리 아이 학교는 어떤 곳인가요?

${school.schoolName}에 대해 쉽게 설명해 드릴게요.

**선생님 한 분이 약 ${school.teacherStats?.studentsPerTeacher ?? "?"}명의 학생을 담당**하고 있어요.

학교에서는 방과후에 ${school.afterschoolPrograms.map((p) => p.subject).join(", ")} 수업을 운영하고 있어요. 아이가 관심 있는 분야가 있다면 참여해 보시는 것도 좋겠습니다.

> 출처: 학교알리미 (${school.teacherStats?.year ?? 2025}년 기준)
> ⚠️ 이 리포트는 샘플 데이터 기반입니다.`;
  }
}
