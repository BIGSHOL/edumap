# EduMap (에듀맵) — 프로젝트 컨텍스트

## 프로젝트 개요

**에듀맵**은 교육 공공데이터를 AI로 분석하여 학습격차를 조기 탐지하고,
교사·학부모·정책담당자 누구나 이해할 수 있는 인사이트 리포트를 자동 생성하는 플랫폼이다.

- **대회**: 제8회 교육 공공데이터 AI 활용대회 (일반부) — 2026년 5월 제출
- **핵심 컨셉**: 흩어진 공공데이터 연결 → AI 격차 예측 → 자연어 리포트 자동 생성
- **구현 형태**: 웹앱 (PC 브라우저 전용, 대회 데모 최적화)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) — FE/BE 통합 |
| 언어 | TypeScript (strict mode) |
| DB | PostgreSQL (Supabase) + Prisma 6 ORM |
| 배포 | Vercel (무료 티어) |
| AI | Claude API (`@anthropic-ai/sdk`) + Gemini 2.5 Flash (`@google/generative-ai`) |
| 차트 | Recharts |
| 지도 | Leaflet + react-leaflet (SSR-safe dynamic import) |
| 스타일링 | Tailwind CSS (정부/공공기관 스타일, primary `#1B3A5C`) |
| 테스트 | Vitest + React Testing Library + MSW + Playwright |
| 유효성 검증 | Zod v4 (API 계약) |

---

## 아키텍처 — Cache-Through 3단 fallback

모든 데이터 조회는 동일한 패턴을 따른다:

```
1. DB (Prisma/Supabase) — 캐시 히트 시 즉시 반환
2. 공공 API (나이스/학교알리미/공공데이터포털) — 실시간 조회 후 DB 캐싱
3. Mock 데이터 — API도 실패 시 fallback (대회 데모 보장)
```

**DB 연결 fast-fail**: `isDbConnected()` 함수가 최초 1회 `SELECT 1`로 연결 상태를 확인하고, 실패 시 60초간 DB 호출을 건너뛰어 빠르게 fallback으로 넘어간다.

---

## 서비스 구조 — 3대 모듈

### 모듈 1: EarlyAlert (학습격차 조기경보 탐지)

**목적**: 학습격차가 심화될 가능성이 높은 학교·지역을 사전 탐지, 위험도 스코어(0~100) 산출

**핵심 로직** (`src/lib/analysis/early-alert.ts`):
- 가중 다요인 스코어링 (8개 요인)
  - 교원1인당학생수 22% | 기간제교원비율 18% | 학생1인당교육비 13%
  - 방과후프로그램수 13% | 교원성별편중 9% | 학급과밀도 9%
  - 강사의존도 4% | 주변학원밀도 12%
- 수준 분류: safe(0-30) / caution(31-50) / warning(51-70) / danger(71-100)
- AI 해설: Gemini Flash로 학교별 위험 요인 내러티브 + 지역 패턴 요약 자동 생성

### 모듈 2: GapMap (학습자원 공백 매핑)

**목적**: 특정 지역의 구조적 학습자원 공백을 시각화하고 보완 경로 자동 제안

**핵심 로직** (`src/lib/analysis/gapmap.ts`):
- 카테고리별 방과후 프로그램 분포 분석
- 공백 유형: missing_category, low_enrollment, understaffed, underfunded, education_desert
- **학구별 분석 모드** (`zone-analysis.ts`): 학구 단위 평균 위험도, 커버리지, 학교 간 편차
- 학원 데이터 연동: 학원이 충분한 지역의 missing_category 심각도 하향 조정

### 모듈 3: InsightReport (AI 자연어 리포트 생성)

**목적**: 분석 결과를 Claude API로 대상별 자연어 리포트 자동 생성

| 대상 | 리포트 성격 |
|------|------------|
| `policy` | 교육청·정책담당자 — 지역 위험도 요약 + 정책 개입 우선순위 제안 |
| `teacher` | 교사 — 학교 격차 현황 및 원인 분석 |
| `parent` | 학부모 — 비전문가 언어로 학교 학습환경 인사이트 |

- Claude API 미설정 시 템플릿 기반 fallback 리포트 자동 생성
- 프롬프트 원칙: 숫자 나열 금지 → 스토리텔링, 원인 중심 서술

---

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx                          # 루트 레이아웃 (Pretendard 폰트)
│   ├── page.tsx                            # 메인 대시보드
│   ├── early-alert/page.tsx                # 조기경보 대시보드
│   ├── gapmap/page.tsx                     # GapMap 학습자원 공백 분석
│   ├── report/[schoolCode]/page.tsx        # 학교별 리포트
│   └── api/
│       ├── schools/route.ts                # 학교 목록
│       ├── schools/[schoolCode]/route.ts   # 학교 상세
│       ├── schools/search/route.ts         # 학교 검색
│       ├── early-alert/route.ts            # 위험도 분석
│       ├── risk-summary/route.ts           # 시군구별 위험도 집계
│       ├── districts/route.ts              # 시군구 목록
│       ├── regions/route.ts                # 시도 목록
│       ├── report/route.ts                 # AI 리포트 생성
│       ├── gapmap/route.ts                 # GapMap 분석
│       ├── academy/stats/route.ts          # 학원교습소 통계
│       ├── zone-analysis/route.ts          # 학구별 종합 분석
│       ├── edu-support-offices/route.ts    # 교육지원청 목록
│       └── ai-insight/route.ts             # AI 인사이트 (스마트 검색)
├── components/
│   ├── Header.tsx, SearchBar.tsx, SchoolCard.tsx, RiskScoreBadge.tsx
│   ├── AiMarkdown.tsx, AiProgressBar.tsx
│   ├── charts/   RegionBarChart, TeacherStatsChart, FinanceChart
│   ├── map/      SchoolMap, RegionRiskMap, ZoneClusterMap (+Dynamic 래퍼)
│   └── report/   ReportViewer, ReportTypeSelector, ReportLoading
├── lib/
│   ├── ai/
│   │   ├── prompts.ts              # Claude 대상별 프롬프트
│   │   ├── prompts-gemini.ts       # Gemini 위험도 해설 프롬프트
│   │   ├── report-generator.ts     # Claude API 연동 + fallback
│   │   └── gemini.ts               # Gemini API 클라이언트 + 캐싱
│   ├── analysis/
│   │   ├── early-alert.ts          # 위험도 스코어링 (8요인)
│   │   ├── gapmap.ts               # 학습자원 공백 분석
│   │   └── zone-analysis.ts        # 학구 단위 종합 분석
│   ├── api/
│   │   ├── contracts/              # Zod 스키마 (API 계약)
│   │   ├── schoolinfo.ts           # 학교알리미 API 클라이언트
│   │   ├── neis.ts                 # 나이스 API 클라이언트
│   │   ├── academy.ts              # 나이스 학원교습소 API 클라이언트
│   │   └── district-zone.ts        # 학구도연계정보 API 클라이언트
│   ├── services/
│   │   ├── school-data.ts          # Cache-Through (DB→API→Mock)
│   │   ├── academy-data.ts         # 학원 통계 서비스
│   │   ├── zone-data.ts            # 학구도 서비스
│   │   ├── api-cache.ts            # 공공 API 응답 DB 캐싱
│   │   ├── mappers.ts              # API 응답 → SchoolDetail 변환
│   │   ├── region-codes.ts         # 시도교육청 코드 매핑
│   │   └── utils.ts                # 데이터 소스 라벨 유틸
│   ├── db/prisma.ts                # Prisma 싱글턴 + isDbConnected()
│   ├── constants/regions.ts        # 17개 시도 상수
│   └── sse.ts                      # Server-Sent Events 유틸
├── mocks/data/
│   ├── schools.ts                  # Mock 학교 데이터
│   └── academies.ts                # Mock 학원 통계
├── types/                          # TypeScript 타입 정의
└── __tests__/                      # 단위 테스트 (68개)
e2e/
└── report-flow.spec.ts             # E2E (Playwright, 7개 시나리오)
prisma/
├── schema.prisma                   # 10 모델 (Region, School, TeacherStats, ...)
├── seed.ts                         # DB 시드
└── sync.ts                         # 공공 API → DB 동기화 스크립트
docs/planning/                      # 기획 문서 (PRD, TRD, 유저플로우 등)
```

---

## 활용 공공데이터 (10종)

| No. | 소스 | 활용 모듈 | 제공 방식 |
|-----|------|-----------|-----------|
| 1 | 학교알리미 공시정보 API | ①②③ 공통 | Open API |
| 2 | 학교알리미 공개용 파일 | ① EarlyAlert | 파일 |
| 3 | 교육통계서비스 (KESS) | ① EarlyAlert | 파일 |
| 4 | 에듀데이터서비스 (EDSS) | ② GapMap | 신청 |
| 5 | 학교알리미 방과후학교 | ② GapMap | Open API |
| 6 | EBS 공공데이터 | ② GapMap | 파일 |
| 7 | 통계청 소득 데이터 | ③ InsightReport | 파일 |
| 8 | 나이스 대국민서비스 | ①②③ 공통 | Open API |
| 9 | 나이스 학원교습소정보 | ①② EarlyAlert/GapMap | Open API |
| 10 | 전국학교학구도연계정보 | ② GapMap(학구분석) | Open API |

**데이터 연결 키**: 학교알리미 학교기본정보의 **학교 코드** (전국 모든 학교 고유 코드)

---

## 코딩 컨벤션

- **환경변수**: API 키 하드코딩 절대 금지 → `.env` 또는 `.env.local` 사용
- **에러 처리**: 공공 API 응답 실패 시 반드시 fallback 처리 (공공 API는 불안정)
- **주석**: 공공데이터 필드명은 한글 원본 명칭을 주석으로 병기
- **데이터 범위**: 학생 개인정보 절대 노출 금지 → 학교 단위 집계만 사용
- **출처 표기**: 공공데이터 활용 시 UI에 출처 표기 필수
- **타입**: 공공 API 응답은 반드시 타입/인터페이스로 정의
- **DB 호출**: 반드시 `isDbConnected()` 가드를 사용하여 미연결 시 fast-fail

---

## 필수 환경변수

```bash
SCHOOLINFO_API_KEY=       # 학교알리미 Open API
NEIS_API_KEY=             # 나이스 Open API
ANTHROPIC_API_KEY=        # Claude API (InsightReport)
GEMINI_API_KEY=           # Gemini 2.5 Flash (위험도 해설)
DISTRICT_ZONE_API_KEY=    # 전국학교학구도연계정보 (공공데이터포털)
DATABASE_URL=             # Supabase PostgreSQL (Pooler)
DIRECT_URL=               # Supabase Direct (Prisma 마이그레이션)
```

---

## 주요 커맨드

```bash
npm run dev               # 개발 서버 (http://localhost:3000)
npm run build             # 프로덕션 빌드
npm run lint              # ESLint
npm run type-check        # TypeScript 타입 검사
npm run test              # Vitest 단위 테스트
npm run test:e2e          # Playwright E2E 테스트
npm run db:sync           # 공공 API → DB 전체 동기화
npm run db:sync:region    # 특정 시도만 동기화
npm run db:studio         # Prisma Studio (DB GUI)
```

---

## Skills

커스텀 검증 스킬은 `.claude/skills/`에 정의:

| Skill | Purpose |
|-------|---------|
| `verify-implementation` | 모든 verify 스킬 순차 실행 → 통합 검증 보고서 |
| `manage-skills` | 세션 변경사항 분석, 검증 스킬 생성/업데이트 |
| `verify-api` | API Zod 계약 준수, fallback, 에러 핸들링 검증 |
| `verify-analysis` | EarlyAlert, GapMap, InsightReport 분석 로직 검증 |
| `verify-ui` | 디자인 시스템, 출처 표기, SSR 안전성 검증 |
| `verify-api-clients` | 공공 API 환경변수, 키 보안, 타입 정의 검증 |
| `verify-tests` | 테스트 커버리지, 통과 여부, mock 정합성 검증 |
