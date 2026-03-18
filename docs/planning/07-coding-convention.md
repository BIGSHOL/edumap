# Coding Convention & AI Collaboration Guide — 에듀맵 (EduMap)

> 고품질/유지보수/보안을 위한 인간-AI 협업 운영 지침서입니다.

---

## MVP 캡슐

| # | 항목 | 내용 |
|---|------|------|
| 1 | 목표 | 교육 공공데이터를 AI로 분석하여 학습격차를 조기 탐지하고, 누구나 이해할 수 있는 자연어 리포트를 자동 생성하여 대회 수상 |
| 2 | 페르소나 | 교육청 정책담당자, 학교 교사, 학부모 |
| 3 | 핵심 기능 | FEAT-1: InsightReport (AI 자연어 리포트 생성) |
| 4 | 성공 지표 (노스스타) | 대회 심사위원 평가 — 수상 |
| 5 | 입력 지표 | AI 리포트 품질 점수, 데이터 통합 정확도 |
| 6 | 비기능 요구 | 공공 API 응답 실패 시 fallback 처리 |
| 7 | Out-of-scope | 수익화, 모바일 앱, 개인 학생 데이터, 사용자 인증 |
| 8 | Top 리스크 | 공공데이터 API 불안정 |
| 9 | 완화/실험 | 로컬 캐시 + 샘플 데이터로 데모 대비 |
| 10 | 다음 단계 | 학교알리미 API 연동 및 데이터 수집 |

---

## 1. 핵심 원칙

### 1.1 신뢰하되, 검증하라 (Don't Trust, Verify)

AI가 생성한 코드는 반드시 검증해야 합니다:

- [ ] 코드 리뷰: 생성된 코드 직접 확인
- [ ] 테스트 실행: 자동화 테스트 통과 확인
- [ ] 보안 검토: API 키 노출 여부, 개인정보 노출 확인
- [ ] 동작 확인: 실제로 실행하여 기대 동작 확인

### 1.2 최종 책임은 인간에게

- AI는 도구이고, 최종 결정과 책임은 개발자에게 있습니다
- 이해하지 못하는 코드는 사용하지 않습니다
- 특히 공공데이터 API 응답 구조는 반드시 실제 응답과 대조 확인

---

## 2. 프로젝트 구조

### 2.1 디렉토리 구조 (Next.js App Router)

```
edumap/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # 메인 대시보드 (FEAT-0)
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   ├── globals.css               # 전역 스타일
│   │   ├── report/
│   │   │   └── [schoolCode]/
│   │   │       └── page.tsx          # 리포트 페이지 (FEAT-1)
│   │   └── api/                      # API Routes
│   │       ├── schools/
│   │       │   └── route.ts          # 학교 데이터 조회
│   │       ├── report/
│   │       │   └── route.ts          # AI 리포트 생성
│   │       └── early-alert/
│   │           └── route.ts          # 위험도 스코어 (FEAT-2)
│   ├── components/                   # 재사용 컴포넌트
│   │   ├── ui/                       # 기본 UI (Button, Card, Badge 등)
│   │   ├── charts/                   # 차트 (Recharts 래퍼)
│   │   ├── map/                      # 지도 (Leaflet 래퍼)
│   │   └── report/                   # 리포트 관련 (ReportViewer 등)
│   ├── lib/                          # 유틸리티/서비스
│   │   ├── api/                      # 공공데이터 API 클라이언트
│   │   │   ├── schoolinfo.ts         # 학교알리미 API
│   │   │   ├── neis.ts               # 나이스 API
│   │   │   └── types.ts              # API 응답 타입
│   │   ├── ai/                       # Claude API 연동
│   │   │   ├── report-generator.ts   # 리포트 생성 로직
│   │   │   └── prompts.ts            # 대상별 프롬프트 템플릿
│   │   ├── analysis/                 # 데이터 분석
│   │   │   └── early-alert.ts        # 위험도 스코어링 (FEAT-2)
│   │   └── db/
│   │       └── prisma.ts             # Prisma 클라이언트 싱글톤
│   ├── types/                        # 공유 타입 정의
│   │   ├── school.ts
│   │   ├── report.ts
│   │   └── api-responses.ts
│   └── __tests__/                    # 테스트
│       ├── api/
│       ├── components/
│       └── lib/
├── prisma/
│   └── schema.prisma                 # DB 스키마
├── scripts/
│   └── seed-data.ts                  # 공공데이터 수집/적재
├── public/
│   └── data/                         # 정적 데이터 파일
├── e2e/                              # E2E 테스트
├── docs/
│   └── planning/                     # 기획 문서
├── .env.local                        # 환경변수 (커밋 금지)
├── .env.example                      # 환경변수 예시 (커밋 O)
└── .gitignore
```

### 2.2 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 (컴포넌트) | PascalCase | `RiskScoreBadge.tsx` |
| 파일 (유틸/서비스) | camelCase 또는 kebab-case | `reportGenerator.ts` |
| 파일 (API Route) | kebab-case | `route.ts` (Next.js 규칙) |
| 컴포넌트 | PascalCase | `SchoolCard` |
| 함수/변수 | camelCase | `getSchoolByCode` |
| 상수 | UPPER_SNAKE | `MAX_RISK_SCORE` |
| 타입/인터페이스 | PascalCase | `SchoolInfo`, `ReportType` |
| 환경변수 | UPPER_SNAKE | `SCHOOLINFO_API_KEY` |
| DB 테이블 | snake_case | `teacher_stats` |
| DB 컬럼 | snake_case | `students_per_teacher` |

---

## 3. 아키텍처 원칙

### 3.1 뼈대 먼저 (Skeleton First)

1. 전체 페이지/API Route 구조를 먼저 잡기
2. 빈 컴포넌트/함수로 스켈레톤 생성
3. 하나씩 구현 채워나가기

### 3.2 작은 모듈로 분해

- 한 파일에 200줄 이하 권장
- 한 함수에 50줄 이하 권장
- 한 컴포넌트에 100줄 이하 권장

### 3.3 관심사 분리

| 레이어 | 역할 | 위치 |
|--------|------|------|
| UI | 화면 표시 | src/components/ |
| 페이지 | 라우팅, 데이터 페칭 | src/app/ |
| API | 서버 사이드 로직 | src/app/api/ |
| 서비스 | 외부 API 통신 | src/lib/api/ |
| 분석 | 데이터 분석 로직 | src/lib/analysis/ |
| AI | Claude API 연동 | src/lib/ai/ |
| 타입 | 공유 타입 정의 | src/types/ |

---

## 4. 공공데이터 API 규칙 (에듀맵 특화)

### 4.1 API 응답 타입 정의 필수

공공 API 응답 구조는 **반드시 TypeScript 타입/인터페이스로 정의**합니다.
한글 원본 필드명을 주석으로 병기합니다.

```typescript
// 예시: src/lib/api/types.ts
interface SchoolInfoResponse {
  schoolCode: string;       // 학교코드
  schoolName: string;       // 학교명
  studentsPerTeacher: number; // 교원1인당학생수
  tempTeacherRatio: number;  // 기간제교원비율
}
```

### 4.2 Fallback 전략 필수

모든 공공 API 호출에는 반드시 fallback 처리를 포함합니다:

```
1차: 공공 API 실시간 호출
  ↓ (실패 시)
2차: DB 캐시 데이터
  ↓ (없으면)
3차: 샘플 데이터 + "샘플 데이터입니다" 표시
```

### 4.3 출처 표기 필수

UI에 데이터를 표시할 때 **반드시 출처를 표기**합니다:

```
출처: 학교알리미 (2025년 기준)
출처: 교육통계서비스 KESS (2025년)
```

### 4.4 개인정보 금지

- 학생 개인정보 절대 노출 금지
- 학교 단위 집계 데이터만 사용
- 교사 개인 식별 불가한 집계 통계만 표시

---

## 5. AI 소통 원칙

### 5.1 하나의 채팅 = 하나의 작업

- 한 번에 하나의 명확한 작업만 요청
- 작업 완료 후 다음 작업 진행
- 컨텍스트가 길어지면 새 대화 시작

### 5.2 컨텍스트 명시

**좋은 예:**
> "FEAT-1 InsightReport의 API Route를 구현해주세요.
> 04-database-design.md의 REPORT_CACHE 테이블을 참조하고,
> 02-trd.md의 공공 API Fallback 전략을 따라주세요."

**나쁜 예:**
> "리포트 API 만들어줘"

### 5.3 프롬프트 템플릿

```
## 작업
{{무엇을 해야 하는지}}

## 참조 문서
- {{문서명}} 섹션 {{번호}}

## 제약 조건
- {{지켜야 할 것}}

## 예상 결과
- {{생성될 파일}}
- {{기대 동작}}
```

---

## 6. 보안 체크리스트

### 6.1 절대 금지

- [ ] API 키 하드코딩 금지 (SCHOOLINFO_API_KEY, NEIS_API_KEY, ANTHROPIC_API_KEY)
- [ ] .env / .env.local 파일 커밋 금지
- [ ] 학생 개인정보 노출 금지
- [ ] SQL 직접 문자열 조합 금지 (Prisma ORM 사용)
- [ ] 사용자 입력 그대로 출력 금지 (XSS)

### 6.2 필수 적용

- [ ] 모든 API 요청 파라미터 Zod로 서버 측 검증
- [ ] 환경변수는 서버 사이드(API Routes)에서만 접근
- [ ] HTTPS 사용 (Vercel 자동)
- [ ] 공공 API 키는 절대 클라이언트에 노출하지 않음 (API Routes 프록시)

### 6.3 환경 변수 관리

```bash
# .env.example (커밋 O — 값은 비움)
SCHOOLINFO_API_KEY=
NEIS_API_KEY=
ANTHROPIC_API_KEY=
DATABASE_URL=
DIRECT_URL=

# .env.local (커밋 X — 실제 값)
SCHOOLINFO_API_KEY=실제키값
NEIS_API_KEY=실제키값
ANTHROPIC_API_KEY=실제키값
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

---

## 7. 테스트 워크플로우

### 7.1 즉시 실행 검증

```bash
# 단위/통합 테스트
npm run test

# 커버리지 포함
npm run test -- --coverage

# 특정 파일
npm run test -- src/__tests__/lib/report-generator.test.ts

# E2E
npx playwright test

# 린트
npm run lint

# 타입 체크
npm run type-check
```

### 7.2 오류 로그 공유 규칙

오류 발생 시 AI에게 전달할 정보:

1. 전체 에러 메시지
2. 관련 코드 스니펫
3. 재현 단계
4. 이미 시도한 해결책

---

## 8. Git 워크플로우

### 8.1 브랜치 전략

```
main              # 프로덕션 (Vercel 자동 배포)
├── develop       # 개발 통합
│   ├── feature/feat-0-dashboard    # 메인 대시보드
│   ├── feature/feat-1-report       # AI 리포트 생성
│   ├── feature/feat-2-early-alert  # 조기경보 (Phase 2)
│   ├── feature/feat-3-gapmap       # 자원공백 지도 (Phase 3)
│   └── fix/{{버그설명}}
```

### 8.2 커밋 메시지

```
<type>(<scope>): <subject>

<body>
```

**타입:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `docs`: 문서
- `test`: 테스트
- `chore`: 기타 (의존성, 설정 등)
- `data`: 공공데이터 수집/처리 관련

**예시:**
```
feat(report): Claude API 연동으로 policy 리포트 생성

- 정책담당자용 프롬프트 설계
- 학교알리미 데이터 기반 리포트 생성
- TRD 섹션 4.2 구현 완료
```

---

## 9. 코드 품질 도구

### 9.1 필수 설정

| 도구 | 용도 | 설정 |
|------|------|------|
| ESLint | 린터 | next/core-web-vitals + custom rules |
| Prettier | 포매터 | printWidth: 100, singleQuote: true |
| TypeScript | 타입 체크 | strict: true |
| Vitest | 테스트 | Next.js 호환 설정 |
| Playwright | E2E 테스트 | Chromium 기본 |

### 9.2 Tailwind CSS 규칙

- 커스텀 컬러는 `tailwind.config.ts`에 정의 (Design System 컬러 참조)
- 인라인 스타일 금지 → Tailwind 유틸리티 클래스 사용
- 반복되는 스타일 조합은 `@apply`로 추출

```typescript
// tailwind.config.ts 컬러 예시
colors: {
  primary: { DEFAULT: '#1B3A5C', light: '#2D5F8A', lighter: '#E8EFF6' },
  risk: { safe: '#22C55E', caution: '#EAB308', warning: '#F97316', danger: '#EF4444' },
}
```

---

## Decision Log 참조

| ID | 항목 | 선택 | 근거 |
|----|------|------|------|
| D-19 | 백엔드 | Next.js API Routes | FE/BE 통합, Vercel 배포 간편 |
| D-20 | 프론트엔드 | Next.js + React | SSR/SSG, 차트/지도 라이브러리 풍부 |
| D-21 | DB | PostgreSQL (Supabase) | 무료 티어, Prisma 연동 |
