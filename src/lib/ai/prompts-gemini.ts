/**
 * Gemini용 프롬프트 빌더
 *
 * Flash: 위험 요인 해설, 지역 패턴 요약
 * Flash-Lite: 학교 비교 문장, 데이터 이상치 탐지
 */

interface RiskFactorContext {
  schoolCode: string;
  schoolName: string;
  score: number;
  level: string;
  factors: {
    factor: string;
    value: number;
    description: string;
    weight: number;
  }[];
}

/**
 * 배치 위험 요인 해설 프롬프트
 * 여러 학교의 위험 요인을 한 번에 해설
 */
export function buildBatchRiskNarrativePrompt(contexts: string[]): string {
  return `당신은 한국 교육 데이터 분석 전문가입니다.

아래 학교들의 학습격차 위험도 분석 결과를 보고, 각 학교별로 **왜 이 학교가 위험한지** 핵심만 설명하세요.

규칙:
- 각 학교당 반드시 40~60자 이내, 한 문장으로 작성. 마침표(.)로 끝낼 것
- 숫자 나열 금지. 원인과 맥락 중심으로 서술
- 교사, 학부모가 이해할 수 있는 쉬운 한국어
- 위험도가 낮은 학교는 긍정적 요소를 언급
- 반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이)

응답 형식:
\`\`\`json
{
  "학교코드1": "해설 문장",
  "학교코드2": "해설 문장"
}
\`\`\`

학교 데이터:
${contexts.join("\n---\n")}`;
}

/**
 * 개별 학교의 컨텍스트 문자열 생성
 */
export function buildSchoolRiskContext(school: RiskFactorContext): string {
  const factorLines = school.factors
    .map((f) => `  - ${f.factor}: ${f.description} (가중치 ${(f.weight * 100).toFixed(0)}%)`)
    .join("\n");

  return `학교코드: ${school.schoolCode}
학교명: ${school.schoolName}
위험도 점수: ${school.score}/100 (${school.level})
기여 요인:
${factorLines}`;
}

/**
 * 지역 패턴 요약 프롬프트
 */
export function buildRegionSummaryPrompt(regionName: string, contexts: string[]): string {
  return `당신은 한국 교육 정책 분석 전문가입니다.

아래는 ${regionName} 지역 학교들의 학습격차 위험도 데이터입니다.
이 지역의 전반적인 교육 격차 패턴을 요약하세요.

규칙:
- 반드시 2-3문장, 150자 이내로 작성. 절대 초과 금지
- 마지막 문장은 반드시 마침표(.)로 끝나는 완결된 문장이어야 함
- 위험 학교 비율, 주요 원인을 포함
- 정책담당자가 바로 활용할 수 있는 인사이트
- 숫자는 핵심만
- 일반 텍스트로만 응답 (JSON 아님)

학교 데이터:
${contexts.join("\n---\n")}`;
}

// ============================================================
// GapMap AI 개선 제안 (Claude Sonnet 4.5)
// ============================================================

/**
 * GapMap 공백에 대한 구체적 해결 방안 프롬프트
 */
export function buildGapSuggestionPrompt(schoolContext: string): string {
  return `당신은 한국 교육 현장 전문가입니다.

아래 학교의 학습자원 부족 분석 결과를 보고, **학교에서 바로 실행할 수 있는 개선 방안**을 제시하세요.

규칙:
- 반드시 한글로만 작성. 영어 용어 사용 금지
- 교사와 학부모가 바로 이해할 수 있는 쉬운 말로 작성
- 3~5개 개선 방안을 우선순위별로 번호 매기기
- 각 방안에: 무엇을 하면 되는지, 어떤 효과가 있는지, 무엇이 필요한지를 포함
- 현실적인 방안만 제안 (예: 근처 대학 연계, 교육청 지원 신청, 무료 온라인 강좌 활용)
- 비슷한 학교에서 성공한 사례가 있으면 소개
- 마크다운으로 작성하되, 제목(##), 번호 목록, **굵은 글씨** 정도만 사용하여 깔끔한 문서 형태로
- 표(테이블)는 사용하지 않기
- 이모지 사용 금지
- 마지막에 "출처: 학교알리미, 나이스 교육정보" 표기

학교 데이터:
${schoolContext}`;
}

/**
 * GapMap 학교 컨텍스트 문자열 생성
 */
export function buildGapSchoolContext(school: {
  schoolCode: string;
  schoolName: string;
  totalGaps: number;
  coverageRate: number;
  overallSeverity: string;
  gaps: { type: string; category?: string; severity: string; description: string }[];
}): string {
  const gapLines = school.gaps
    .map((g) => `  - [${g.severity}] ${g.description}`)
    .join("\n");

  return `학교코드: ${school.schoolCode}
학교명: ${school.schoolName}
카테고리 커버리지: ${school.coverageRate}%
전체 심각도: ${school.overallSeverity}
총 공백: ${school.totalGaps}건
공백 상세:
${gapLines}`;
}

// ============================================================
// 학교 비교 문장 (Gemini 2.5 Flash-Lite)
// ============================================================

/**
 * 학교 데이터를 지역 평균과 비교하는 한 줄 문장 생성
 */
export function buildComparisonPrompt(contexts: string[]): string {
  return `당신은 교육 데이터 분석가입니다.

아래 학교들의 데이터를 보고, 각 학교의 핵심 지표를 지역 평균과 비교하여 **한 문장**으로 요약하세요.

규칙:
- "평균 대비 ~% 높음/낮음" 형태의 간결한 비교
- 가장 눈에 띄는 지표 1-2개만 언급
- 긍정적 요소와 우려 요소를 균형 있게
- 반드시 JSON 형식으로만 응답

응답 형식:
\`\`\`json
{
  "학교코드1": "비교 문장",
  "학교코드2": "비교 문장"
}
\`\`\`

학교 데이터:
${contexts.join("\n---\n")}`;
}

/**
 * 비교용 학교 컨텍스트
 */
export function buildComparisonContext(school: {
  schoolCode: string;
  schoolName: string;
  studentsPerTeacher: number | null;
  tempTeacherRatio: number | null;
  budgetPerStudent: number | null;
  programCount: number;
  regionAvg: {
    studentsPerTeacher: number;
    tempTeacherRatio: number;
    budgetPerStudent: number;
    programCount: number;
  };
}): string {
  return `학교코드: ${school.schoolCode}
학교명: ${school.schoolName}
교원1인당학생수: ${school.studentsPerTeacher ?? "정보없음"}명 (지역평균: ${school.regionAvg.studentsPerTeacher}명)
기간제교원비율: ${school.tempTeacherRatio != null ? (school.tempTeacherRatio * 100).toFixed(1) : "정보없음"}% (지역평균: ${(school.regionAvg.tempTeacherRatio * 100).toFixed(1)}%)
학생1인당교육비: ${school.budgetPerStudent != null ? Math.round(school.budgetPerStudent).toLocaleString() : "정보없음"}원 (지역평균: ${Math.round(school.regionAvg.budgetPerStudent).toLocaleString()}원)
방과후프로그램: ${school.programCount}개 (지역평균: ${school.regionAvg.programCount}개)`;
}

// ============================================================
// 데이터 이상치 탐지 (Gemini 2.5 Flash-Lite)
// ============================================================

/**
 * 데이터 이상치 탐지 프롬프트
 */
export function buildAnomalyDetectionPrompt(contexts: string[]): string {
  return `당신은 교육 데이터 품질 검수 전문가입니다.

아래 학교 데이터에서 **이상치**(데이터 오류 가능성)를 탐지하세요.

이상치 기준:
- 교원1인당학생수: 30명 초과 또는 5명 미만
- 기간제교원비율: 50% 초과
- 학생1인당교육비: 1000만원 초과 또는 50만원 미만
- 방과후프로그램: 20개 초과

규칙:
- 이상치가 없으면 빈 객체 {} 반환
- 이상치가 있으면 해당 학교코드와 간단한 설명
- 반드시 JSON 형식으로만 응답

응답 형식:
\`\`\`json
{
  "학교코드1": "교원1인당학생수 45명 — 데이터 입력 오류 가능성",
  "학교코드2": "학생1인당교육비 50만원 미만 — 재정 데이터 누락 가능성"
}
\`\`\`

학교 데이터:
${contexts.join("\n---\n")}`;
}

/**
 * 이상치 탐지용 학교 컨텍스트
 */
export function buildAnomalyContext(school: {
  schoolCode: string;
  schoolName: string;
  studentsPerTeacher: number | null;
  tempTeacherRatio: number | null;
  budgetPerStudent: number | null;
  programCount: number;
}): string {
  return `학교코드: ${school.schoolCode}
학교명: ${school.schoolName}
교원1인당학생수: ${school.studentsPerTeacher ?? "없음"}
기간제교원비율: ${school.tempTeacherRatio != null ? (school.tempTeacherRatio * 100).toFixed(1) + "%" : "없음"}
학생1인당교육비: ${school.budgetPerStudent != null ? Math.round(school.budgetPerStudent) + "원" : "없음"}
방과후프로그램수: ${school.programCount}개`;
}

// ============================================================
// 정책 개입 우선순위 (Claude Sonnet 4.5)
// ============================================================

/**
 * 지역 전체 위험도 데이터 기반 정책 개입 우선순위
 */
export function buildPolicyPriorityPrompt(regionName: string, schoolContexts: string[]): string {
  return `당신은 한국 교육 정책 전문가입니다.

${regionName} 지역의 학교 위험도 데이터를 분석하여 **어디부터 도와야 하는지 우선순위**를 제시하세요.

규칙:
- 반드시 한글로만 작성. 영어 용어 사용 금지 (예: tractability → "해결 용이성")
- 교사, 학부모, 일반 시민 누구나 이해할 수 있는 쉬운 말로 작성
- 전문 용어 대신 구체적인 설명 (예: "과밀학급" → "한 반에 학생이 30명 넘는 학교")
- 상위 3~5개 우선 지원 대상을 선정하고 이유를 설명
- 각 항목: ① 어떤 문제가 있는지 ② 어떻게 해결할 수 있는지 ③ 해결하면 어떤 효과가 있는지
- 적은 예산으로 빠르게 효과를 낼 수 있는 곳부터 정렬
- 다른 지역에서 비슷한 문제를 해결한 사례가 있으면 소개
- 마크다운으로 작성하되, 제목(##), 번호 목록, **굵은 글씨** 정도만 사용하여 깔끔한 문서 형태로
- 표(테이블)는 사용하지 않기
- 이모지 사용 금지
- 마지막에 "출처: 학교알리미, 나이스 교육정보" 표기

학교 데이터:
${schoolContexts.join("\n---\n")}`;
}

// ============================================================
// 스마트 검색 (Gemini 2.5 Flash)
// ============================================================

/**
 * 자연어 검색 쿼리를 필터 조건으로 변환
 */
export function buildSmartSearchPrompt(query: string): string {
  return `당신은 한국 학교 데이터 검색 엔진입니다.

사용자가 입력한 자연어 검색어를 분석하여 구조화된 필터 조건으로 변환하세요.

가능한 필터:
- schoolName: 학교명 (부분 일치)
- region: 지역코드 (B10=서울, C10=부산, D10=대구, E10=인천, F10=광주, G10=대전, H10=울산, J10=경기, K10=강원, M10=충북, N10=충남, P10=전북, Q10=전남, R10=경북, S10=경남, T10=제주)
- schoolType: elementary | middle | high
- riskLevel: safe | caution | warning | danger
- minRiskScore: 최소 위험도 점수 (0-100)
- maxRiskScore: 최대 위험도 점수 (0-100)

규칙:
- 해당하지 않는 필터는 생략
- 반드시 JSON으로만 응답 (다른 텍스트 없이)
- 검색어가 단순 학교명이면 schoolName만 반환

사용자 검색어: "${query}"

응답 형식:
\`\`\`json
{
  "schoolName": "학교명",
  "region": "지역코드",
  "schoolType": "학교급",
  "riskLevel": "위험수준"
}
\`\`\``;
}
