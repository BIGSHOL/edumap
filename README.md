# EduMap (에듀맵)

> 교육 공공데이터 AI 분석 플랫폼 — 학습격차 조기 탐지 + 자연어 리포트 자동 생성

제8회 교육 공공데이터 AI 활용대회 (일반부) 출품작

---

## 핵심 기능

### 1. EarlyAlert — 학습격차 조기경보

8개 공공데이터 요인을 가중 분석하여 학교별 위험도 스코어(0~100)를 산출합니다.

- 교원1인당학생수(22%) / 기간제교원비율(18%) / 학생1인당교육비(13%)
- 방과후프로그램수(13%) / 교원성별편중(9%) / 학급과밀도(9%)
- 강사의존도(4%) / 주변학원밀도(12%)
- 위험 수준: `safe` → `caution` → `warning` → `danger`
- AI가 위험 요인별 내러티브를 자동 생성

### 2. GapMap — 학습자원 공백 매핑

지역별 방과후 프로그램과 학원 분포를 분석하여 구조적 학습자원 공백을 탐지합니다.

- 카테고리별 프로그램 분포 분석 (교과/예체능/특기적성)
- 학구별 분석 모드: 학구 단위 평균 위험도, 학교 간 편차 시각화
- 교육 사막(education desert) 탐지: 학원도 부족한 지역 경고

### 3. InsightReport — AI 자연어 리포트

Claude API로 분석 결과를 대상별 맞춤 리포트로 변환합니다.

- **정책담당자용**: 지역 위험도 패턴 + 정책 개입 우선순위
- **교사용**: 우리 학교 격차 현황 + 원인 분석
- **학부모용**: 쉬운 언어로 학교 학습환경 설명

---

## 데모

| 페이지 | 설명 |
|--------|------|
| `/` | 메인 대시보드 — 시도별 지도, 위험도 분포, 학교 목록 |
| `/early-alert` | 조기경보 대시보드 — 위험도 상위 학교 + AI 해설 |
| `/gapmap` | 학습자원 공백 분석 — 학교별/학구별 모드 전환 |
| `/report/[schoolCode]` | 학교 리포트 — 데이터 카드 + 차트 + AI 리포트 |

---

## 기술 스택

```
Next.js 16 (App Router)  ·  TypeScript  ·  Tailwind CSS
PostgreSQL (Supabase)  ·  Prisma 6 ORM
Claude API  ·  Gemini 2.5 Flash
Recharts  ·  Leaflet  ·  Zod v4
Vitest  ·  Playwright
```

---

## 빠른 시작

### 1. 설치

```bash
git clone https://github.com/BIGSHOL/edumap.git
cd edumap
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 API 키를 입력합니다:

```bash
# 필수 — 공공 API
SCHOOLINFO_API_KEY=       # 학교알리미 (schoolinfo.go.kr에서 발급)
NEIS_API_KEY=             # 나이스 (open.neis.go.kr에서 발급)

# 선택 — AI 리포트
ANTHROPIC_API_KEY=        # Claude API (미설정 시 fallback 리포트)
GEMINI_API_KEY=           # Gemini Flash (미설정 시 AI 해설 미생성)

# 선택 — DB 캐싱
DATABASE_URL=             # Supabase PostgreSQL (미설정 시 Mock 데이터)
DIRECT_URL=               # Supabase Direct URL

# 선택 — 학구도
DISTRICT_ZONE_API_KEY=    # 공공데이터포털 (data.go.kr에서 발급)
```

> API 키 없이도 Mock 데이터로 모든 기능이 동작합니다.

### 3. 실행

```bash
npm run dev
# http://localhost:3000
```

### 4. DB 설정 (선택)

Supabase를 사용하는 경우:

```bash
npx prisma db push        # 스키마 반영
npm run db:sync            # 공공 API → DB 전체 동기화
npm run db:studio          # Prisma Studio GUI
```

---

## 활용 공공데이터 (10종)

| 소스 | 주요 데이터 | API |
|------|------------|-----|
| 학교알리미 공시정보 | 교원 현황, 재정, 방과후 프로그램 | Open API |
| 나이스 대국민서비스 | 학교 기본 현황, 교육과정 | Open API |
| 나이스 학원교습소정보 | 학원명, 교습영역, 정원 | Open API |
| 전국학교학구도연계정보 | 학구-학교 매핑, 교육지원청 | Open API |
| 교육통계서비스 (KESS) | 학업중단율, 다문화 비율 | 파일 |
| 에듀데이터서비스 (EDSS) | 학업성취도 평가 결과 | 신청 |
| EBS 공공데이터 | 지역별 강좌 현황 | 파일 |
| 통계청 소득 데이터 | 시군구별 중위소득 | 파일 |

모든 데이터는 **학교 코드**를 기준 키로 조인하여 통합 분석합니다.

---

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router (페이지 + API)
│   ├── page.tsx            # 메인 대시보드
│   ├── early-alert/        # 조기경보 대시보드
│   ├── gapmap/             # GapMap 분석
│   ├── report/[schoolCode] # 학교 리포트
│   └── api/                # 13개 API 라우트
├── components/             # UI 컴포넌트 (차트, 지도, 리포트)
├── lib/
│   ├── ai/                 # AI 프롬프트 + API 클라이언트
│   ├── analysis/           # 분석 알고리즘 (3대 모듈)
│   ├── api/                # 공공 API 클라이언트 (4개)
│   ├── services/           # Cache-Through 서비스 레이어
│   └── db/                 # Prisma 싱글턴
├── mocks/                  # Mock 데이터
└── __tests__/              # 68개 단위 테스트
e2e/                        # 7개 E2E 시나리오
docs/planning/              # 기획 문서 (PRD, TRD, 디자인 시스템 등)
```

---

## 아키텍처

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser   │────▶│  Next.js API     │────▶│  서비스 레이어    │
│  (React)    │◀────│  Routes (13개)   │◀────│  Cache-Through   │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                              ┌───────┼───────┐
                                              ▼       ▼       ▼
                                          ┌──────┐ ┌──────┐ ┌──────┐
                                          │  DB  │ │ API  │ │ Mock │
                                          │Prisma│ │공공API│ │ Data │
                                          └──────┘ └──────┘ └──────┘
                                            1순위    2순위    3순위

분석 엔진:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  EarlyAlert  │  │   GapMap     │  │InsightReport │
│  8요인 스코어  │  │ 공백 탐지    │  │  AI 리포트    │
│  0~100점     │  │ 학구별 분석   │  │ 대상별 맞춤   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 라이선스

공공누리 제1유형 (출처표시) — 활용 공공데이터에 적용

---

## 출처

- [학교알리미](https://schoolinfo.go.kr) — 교원 현황, 방과후 프로그램
- [나이스 교육정보](https://open.neis.go.kr) — 학교 기본 현황
- [공공데이터포털](https://data.go.kr) — 학구도 연계정보
- [교육통계서비스](https://kess.kedi.re.kr) — 교육 통계
