# EduMap (에듀맵) — 프로젝트 컨텍스트

## 프로젝트 개요

**에듀맵**은 교육 공공데이터를 AI로 분석하여 학습격차를 조기 탐지하고,
교사·학부모·정책담당자 누구나 이해할 수 있는 인사이트 리포트를 자동 생성하는 플랫폼이다.

- **대회**: 제8회 교육 공공데이터 AI 활용대회 (일반부) — 2026년 5월 제출
- **핵심 컨셉**: 흩어진 공공데이터 연결 → AI 격차 예측 → 자연어 리포트 자동 생성
- **구현 형태**: 웹앱 (PC 브라우저 전용, 대회 데모 최적화)

## 기술 스택

- **프레임워크**: Next.js 16 (App Router) — FE/BE 통합
- **언어**: TypeScript (strict mode)
- **DB**: PostgreSQL (Supabase) + Prisma 6 ORM
- **배포**: Vercel (무료 티어)
- **AI**: Claude API (@anthropic-ai/sdk) — 자연어 리포트 생성 (API 키 미설정 시 fallback 리포트 자동 생성)
- **차트**: Recharts (구현 완료)
- **지도**: Leaflet + react-leaflet (구현 완료)
- **스타일링**: Tailwind CSS (정부/공공기관 스타일, primary #1B3A5C)
- **테스트**: Vitest + React Testing Library + MSW + Playwright
- **유효성 검증**: Zod v4 (API 계약)

---

## 구현 현황

### 완료 (Phase 0~2)

- [x] Next.js 16 + TypeScript + Prisma 6 + Tailwind CSS 프로젝트 셋업
- [x] Vitest + React Testing Library + MSW + Playwright 테스트 환경
- [x] Prisma 스키마 (9 모델: Region, School, TeacherStats, FinanceStats, AfterSchoolProgram, RiskScore, ReportCache, ApiCache, AcademyStats)
- [x] API 계약 정의 (Zod): schools, report, early-alert
- [x] Mock 데이터 (3개 학교 + 상세 정보 + 리포트 샘플)
- [x] API Routes: `/api/schools`, `/api/schools/[schoolCode]`, `/api/report`, `/api/early-alert`
- [x] AI 리포트 생성: Claude API 연동 + fallback 리포트 (API 키 없이도 동작)
- [x] 대상별 프롬프트 설계 (policy/teacher/parent)
- [x] EarlyAlert 위험도 스코어링 로직 (가중 다요인 8개: 교원1인당학생수 22%, 기간제교원비율 18%, 학생1인당교육비 13%, 방과후프로그램수 13%, 교원성별편중 9%, 학급과밀도 9%, 강사의존도 4%, 주변학원밀도 12%)
- [x] UI 컴포넌트: SearchBar, SchoolCard, RiskScoreBadge, ReportViewer, ReportTypeSelector, ReportLoading
- [x] 메인 대시보드 (`/`): 검색, 요약 카드, 학교 목록
- [x] 학교 리포트 페이지 (`/report/[schoolCode]`): 학교 정보 + 데이터 카드 + 방과후 프로그램 테이블 + AI 리포트 생성
- [x] 조기경보 대시보드 (`/early-alert`): 위험도 요약 + 학교별 위험도 테이블
- [x] 60개 테스트 전체 통과
- [x] type-check, build, lint 모두 통과
- [x] 차트 시각화 (Recharts): RegionBarChart, TeacherStatsChart, FinanceChart
- [x] 지도 시각화 (Leaflet): SchoolMap + SSR-safe 동적 임포트
- [x] GapMap 모듈 (학습자원 공백 분석): 분석 로직 + API + UI 페이지
- [x] E2E 테스트 시나리오 작성 (Playwright): 7개 시나리오

### 구현 완료 (Phase 3)

- [x] 공공 API 클라이언트 작성: 학교알리미 (`src/lib/api/schoolinfo.ts`), 나이스 (`src/lib/api/neis.ts`)
- [x] 학교 검색 API (`/api/schools/search`)
- [x] GapMap 모듈: 분석 로직 + API + UI 페이지 (`/gapmap`)

### 구현 완료 (Phase 4 — Cache-Through)

- [x] 서비스 레이어 구축 (`src/lib/services/`) — DB 캐시 → 공공 API → Mock 3단 fallback
- [x] 시도교육청 코드 매핑 (`region-codes.ts`) — NEIS ↔ 학교알리미 17개 시도
- [x] 데이터 변환 매퍼 (`mappers.ts`) — API 응답 → SchoolDetail (4개 라우트 중복 제거)
- [x] 5개 API 라우트 리팩토링 — Prisma 직접 호출 제거, 서비스 레이어 사용
- [x] 학교알리미 API 실시간 연동 확인 (sidoCode=행정구역 2자리, sggCode=5자리)
- [x] NEIS-학교알리미 학교코드 불일치 해결 (학교명 매칭 방식)
- [x] Pretendard 폰트 CDN 로드 (상업용 무료 폰트, OFL-1.1)
- [x] 공공누리 제1유형 라이선스 표기 (모든 페이지 푸터)

### 구현 완료 (Phase 5 — 학원교습소 데이터 통합)

- [x] 나이스 학원교습소정보 API 클라이언트 (`src/lib/api/academy.ts`)
- [x] AcademyStats Prisma 모델 — 시군구 단위 학원 집계 (교습영역별 JSON)
- [x] Cache-Through 서비스 레이어 (`src/lib/services/academy-data.ts`)
- [x] Zod 계약 (`src/lib/api/contracts/academy.ts`) + Mock 데이터
- [x] API 라우트: `/api/academy/stats`
- [x] EarlyAlert 8번째 요인 "주변 학원 밀도" 추가 (가중치 12%, 8요인 합 100%)
- [x] GapMap 학원 보완 여부 판단 — missing_category 심각도 조정, education_desert 탐지
- [x] AI 프롬프트에 학원 컨텍스트 추가 (Claude 리포트 생성 시 활용)
- [x] GapMap UI — 주변 학원 현황 섹션 (카테고리별 학원 수 표시)
- [x] 60개 테스트 전체 통과, 빌드 성공

### 구현 완료 (Phase 6 — 학구도 데이터 통합)

- [x] 학구도 REST API 클라이언트 (`src/lib/api/district-zone.ts`) — 공공데이터포털 학구도연계정보
- [x] Prisma DistrictZone 모델 — 학구-학교 매핑 (zone_id + school_id)
- [x] Zod 계약 (`src/lib/api/contracts/district-zone.ts`) — ZoneAnalysisResult, EduSupportOffice
- [x] 시도교육청코드 매핑 확장 (`region-codes.ts`) — enfsType 변환, DEMO_REGIONS 5개 시도
- [x] Cache-Through 서비스 레이어 (`src/lib/services/zone-data.ts`) — DB → API → Mock 3단 fallback
- [x] 학구 분석 모듈 (`src/lib/analysis/zone-analysis.ts`) — 학구 평균 + 학교 간 편차 산출
- [x] API 라우트: `/api/zone-analysis`, `/api/edu-support-offices`
- [x] 지도 컴포넌트: ZoneClusterMap + SSR-safe 동적 임포트
- [x] GapMap 페이지 학구별 분석 모드 추가 (학교별/학구별 토글, 교육지원청 필터)
- [x] 출처 표기: 전국학교학구도연계정보(data.go.kr) 추가
- [x] 68개 테스트 전체 통과, 빌드 성공

### 미완료 / 대회 제출 준비

- [ ] Vercel 배포 + 환경변수 설정
- [ ] PPT 작성 (15매, 활용데이터 정보 + AI 과정 + 스크린샷)
- [ ] Supabase 연동 — DB 캐싱 활성화 (선택)

---

## 서비스 구조 — 3대 모듈

### 모듈 1: EarlyAlert (학습격차 조기경보 탐지) ✅ 구현 완료

**목적**: 학습격차가 심화될 가능성이 높은 학교·지역을 사전 탐지, 위험도 스코어(0~100) 산출

**핵심 로직** (`src/lib/analysis/early-alert.ts`):
- 입력: 교원 여건 + 재정 수준 + 방과후 프로그램 수
- 분석: 가중 다요인 스코어링 (8개 요인: 교원1인당학생수 22%, 기간제교원비율 18%, 학생1인당교육비 13%, 방과후프로그램수 13%, 교원성별편중 9%, 학급과밀도 9%, 강사의존도 4%, 주변학원밀도 12%)
- 출력: 학교·지역별 위험도 스코어 + 주요 기여 요인 랭킹
- 수준 분류: safe(0-30) / caution(31-50) / warning(51-70) / danger(71-100)

---

### 모듈 2: GapMap (학습자원 공백 매핑) ✅ 구현 완료

**목적**: 특정 지역의 구조적 학습자원 공백을 시각화하고 보완 경로 자동 제안

**핵심 로직** (`src/lib/analysis/gapmap.ts`):
- 카테고리별 방과후 프로그램 분포 분석
- 공백 유형 탐지: missing_category, low_enrollment, understaffed, underfunded, education_desert
- 학교별 공백 심각도(overallSeverity) 산출
- **학구별 분석 모드** (`src/lib/analysis/zone-analysis.ts`): 학구 단위 평균 위험도, 커버리지, 학교 간 편차
- 학구 클러스터 지도 시각화 (`src/components/map/ZoneClusterMap.tsx`)

---

### 모듈 3: InsightReport (AI 자연어 리포트 생성) ✅ 구현 완료

**목적**: 분석 결과를 Claude API로 대상별 자연어 리포트 자동 생성

**대상별 유형** (`src/lib/ai/prompts.ts`, `src/lib/ai/report-generator.ts`):
| 대상 | 리포트 성격 | 구현 |
|---|---|---|
| `policy` | 교육청·정책담당자 — 지역 위험도 요약 + 정책 개입 우선순위 제안 | ✅ |
| `teacher` | 교사 — 우리 학교 격차 현황 및 원인 분석 | ✅ |
| `parent` | 학부모 — 비전문가 언어로 학교 학습환경 인사이트 | ✅ |

**프롬프트 원칙**:
- 숫자 나열 금지 → 스토리텔링 형태
- "왜 이 격차가 발생했는가" 원인 중심 서술
- 대상에 맞는 언어 수준 명시
- API 키 없으면 템플릿 기반 fallback 리포트 자동 생성

---

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (Pretendard 폰트)
│   ├── page.tsx                # 메인 대시보드
│   ├── early-alert/page.tsx    # 조기경보 대시보드
│   ├── gapmap/page.tsx         # GapMap 학습자원 공백 분석 페이지
│   ├── report/[schoolCode]/page.tsx  # 학교 리포트 페이지
│   └── api/
│       ├── schools/route.ts          # 학교 목록 API
│       ├── schools/[schoolCode]/route.ts  # 학교 상세 API
│       ├── report/route.ts           # AI 리포트 생성 API
│       ├── early-alert/route.ts      # 위험도 분석 API
│       ├── gapmap/route.ts           # GapMap 분석 API
│       ├── academy/stats/route.ts   # 학원교습소 통계 API
│       ├── zone-analysis/route.ts    # 학구별 종합 분석 API
│       ├── edu-support-offices/route.ts  # 교육지원청 목록 API
│       └── schools/search/route.ts   # 학교 검색 API
├── components/
│   ├── SearchBar.tsx
│   ├── SchoolCard.tsx
│   ├── RiskScoreBadge.tsx
│   ├── charts/
│   │   ├── RegionBarChart.tsx      # 학교별 위험도 바 차트
│   │   ├── TeacherStatsChart.tsx   # 교원 현황 차트
│   │   └── FinanceChart.tsx        # 재정 현황 차트
│   ├── map/
│   │   ├── SchoolMap.tsx           # Leaflet 지도 (학교 마커)
│   │   ├── SchoolMapDynamic.tsx    # SSR-safe 동적 임포트 래퍼
│   │   ├── ZoneClusterMap.tsx      # 학구 클러스터 지도 (학구별 마커)
│   │   └── ZoneClusterMapDynamic.tsx # SSR-safe 동적 임포트 래퍼
│   └── report/
│       ├── ReportViewer.tsx
│       ├── ReportTypeSelector.tsx
│       └── ReportLoading.tsx
├── lib/
│   ├── ai/
│   │   ├── prompts.ts          # 대상별 프롬프트 빌더
│   │   └── report-generator.ts # Claude API 연동 + fallback
│   ├── analysis/
│   │   ├── early-alert.ts      # 위험도 스코어링 알고리즘
│   │   ├── gapmap.ts           # 학습자원 공백 분석
│   │   └── zone-analysis.ts    # 학구 단위 종합 분석
│   ├── api/
│   │   ├── contracts/          # Zod 스키마 (API 계약)
│   │   ├── schoolinfo.ts       # 학교알리미 API 클라이언트
│   │   ├── neis.ts             # 나이스 API 클라이언트
│   │   ├── academy.ts          # 나이스 학원교습소 API 클라이언트
│   │   └── district-zone.ts    # 학구도연계정보 API 클라이언트
│   ├── services/
│   │   ├── school-data.ts      # Cache-Through 서비스 (DB→API→Mock)
│   │   ├── academy-data.ts     # 학원 통계 서비스 (DB→API→Mock)
│   │   ├── zone-data.ts        # 학구도 서비스 (DB→API→Mock)
│   │   ├── mappers.ts          # API 응답 → SchoolDetail 변환
│   │   ├── region-codes.ts     # 시도교육청 코드 매핑
│   │   └── utils.ts            # 데이터 소스 라벨 등 유틸
│   └── db/prisma.ts            # Prisma 클라이언트 싱글턴
├── mocks/data/schools.ts       # 목 데이터 (3개 학교)
├── types/                      # TypeScript 타입 정의
└── __tests__/                  # 테스트 (60개)
e2e/
└── report-flow.spec.ts         # E2E 테스트 (Playwright, 7개 시나리오)
```

---

## 기획 문서

기획 문서는 `docs/planning/`에 위치합니다:

| 문서 | 설명 |
|------|------|
| `01-prd.md` | 제품 요구사항 정의서 |
| `02-trd.md` | 기술 요구사항 정의서 |
| `03-user-flow.md` | 사용자 흐름도 (Mermaid) |
| `04-database-design.md` | 데이터베이스 설계 (ERD) |
| `05-design-system.md` | 디자인 시스템 (정부/공공기관 스타일) |
| `06-tasks.md` | AI 개발 파트너용 태스크 목록 (TDD 워크플로우) |
| `07-coding-convention.md` | 코딩 컨벤션 & AI 협업 가이드 |

---

## 활용 공공데이터

### 데이터 소스 목록

| No. | 소스 | 주요 필드 | 활용 모듈 | 제공 방식 |
|---|---|---|---|---|
| 1 | 학교알리미 공시정보 API | 교원 1인당 학생 수, 기간제 교원 비율, 방과후 프로그램 수 | ①②③ 공통 | Open API |
| 2 | 학교알리미 공개용 파일 | 학교폭력 발생 현황, 재정 현황, 급식·시설 수준 | ① EarlyAlert | 파일 다운로드 |
| 3 | 교육통계서비스 (KESS) | 시도별 학업중단율, 다문화 학생 비율 | ① EarlyAlert | 파일 다운로드 |
| 4 | 에듀데이터서비스 (EDSS) | 학업성취도 평가 결과, 교과별 성취 수준 분포 | ② GapMap | 신청 후 제공 |
| 5 | 학교알리미 방과후학교 | 과목별 수강 인원, 프로그램 운영 여부 | ② GapMap | Open API |
| 6 | EBS 공공데이터 | 지역별 강좌 수강 현황, 무료 강좌 접근성 | ② GapMap | 파일 다운로드 |
| 7 | 통계청 소득 데이터 | 시군구별 중위소득, 기초생활수급 학생 비율 | ③ InsightReport | 파일 다운로드 |
| 8 | 나이스 대국민서비스 | 학교별 기본 현황, 교육과정 편성 정보 | ①②③ 공통 | Open API |
| 9 | 나이스 학원교습소정보 | 학원명, 교습영역, 정원, 등록상태, 행정구역 | ①② EarlyAlert/GapMap | Open API |
| 10 | 전국학교학구도연계정보 | 학구ID, 학교ID, 학교명, 학교급, 교육지원청코드 | ② GapMap(학구분석) | Open API |

### 데이터 연결 방식

**기준 키**: 학교알리미 학교기본정보의 **학교 코드**
- 전국 모든 학교에 부여된 고유 코드
- 학교명·위치 좌표·교육청 코드·학교급 포함
- 모든 데이터셋을 이 코드로 조인하여 통합 분석

### API 접근 정보

```
학교알리미 Open API
  URL : https://schoolinfo.go.kr
  인증 : 네이버/카카오 로그인 후 인증키 발급 (1회)
  키명 : SCHOOLINFO_API_KEY

나이스 Open API
  URL : https://open.neis.go.kr
  키명 : NEIS_API_KEY

EDSS (에듀데이터서비스)
  URL : https://www.edmgr.kr/edss
  방식 : 신청·심사 후 데이터 제공 → 수동 업로드
  ⚠️  사전 신청 필요 (심사 기간 여유 확보)

Claude API (InsightReport)
  키명 : ANTHROPIC_API_KEY
  모델 : claude-opus-4-5 (한국어 품질 최우선)

전국학교학구도연계정보 (공공데이터포털)
  URL : https://api.data.go.kr/openapi/tn_pubr_public_schul_atndskl_zn_drw_lnkinfo_api
  키명 : DISTRICT_ZONE_API_KEY
  일일 트래픽 : 1,000건
  라이선스 : 저작자표시
```

---

## 코딩 컨벤션

- **환경변수**: API 키 하드코딩 절대 금지 → `.env` 또는 `.env.local` 사용
- **에러 처리**: 공공 API 응답 실패 시 반드시 fallback 처리 (공공 API는 불안정할 수 있음)
- **주석**: 공공데이터 필드명은 한글 원본 명칭을 주석으로 병기
- **데이터 범위**: 학생 개인정보 절대 노출 금지 → 학교 단위 집계 데이터만 사용
- **출처 표기**: 공공데이터 활용 시 UI에 출처 표기 필수 (학교알리미, KESS 등)
- **타입**: 공공데이터 API 응답 구조는 반드시 타입/인터페이스로 정의

---

## 필수 환경변수

```bash
SCHOOLINFO_API_KEY=     # 학교알리미 Open API 인증키
NEIS_API_KEY=           # 나이스 Open API 인증키
ANTHROPIC_API_KEY=      # Claude API (InsightReport 리포트 생성)
DISTRICT_ZONE_API_KEY=  # 전국학교학구도연계정보 API (공공데이터포털)
DATABASE_URL=           # Supabase PostgreSQL 연결 URL
DIRECT_URL=             # Supabase Direct URL (Prisma 마이그레이션용)
```

---

## Skills

커스텀 검증 및 유지보수 스킬은 `.claude/skills/`에 정의되어 있습니다:

| Skill | Purpose |
|-------|---------|
| `verify-implementation` | 프로젝트의 모든 verify 스킬을 순차 실행하여 통합 검증 보고서를 생성합니다 |
| `manage-skills` | 세션 변경사항을 분석하고, 검증 스킬을 생성/업데이트하며, CLAUDE.md를 관리합니다 |
| `verify-api` | API 라우트의 Zod 계약 준수, mock fallback, 에러 핸들링 검증 |
| `verify-analysis` | EarlyAlert, GapMap, InsightReport 분석 로직 무결성 검증 |
| `verify-ui` | UI 컴포넌트 디자인 시스템 준수, 출처 표기, SSR 안전성 검증 |
| `verify-api-clients` | 공공 API 클라이언트 환경변수 사용, 키 보안, 타입 정의 검증 |
| `verify-tests` | 테스트 커버리지, 테스트 통과, mock 설정 정합성 검증 |

---

## 참고 링크

- 학교알리미 API 가이드: https://schoolinfo.go.kr/ng/go/pnnggo_a01_m0.do
- 공공데이터포털 학교알리미: https://data.go.kr/data/15014351/fileData.do
- 교육통계서비스: https://kess.kedi.re.kr
- 교육데이터플랫폼(EDSS): https://www.edmgr.kr/edss
- 대회 공식 사이트: https://www.2026edudataaicontest.com
