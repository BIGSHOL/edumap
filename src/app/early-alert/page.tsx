"use client";

import { useState, useEffect } from "react";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { Header } from "@/components/Header";

/** 위험 수준 라벨 매핑 */
const levelToLabel: Record<string, string> = {
  safe: "안전",
  caution: "주의",
  warning: "경고",
  danger: "위험",
};

interface ContributingFactor {
  factor: string;
  weight: number;
  value: number;
  description: string;
}

interface RiskScore {
  schoolCode: string;
  schoolName: string;
  score: number;
  level: "safe" | "caution" | "warning" | "danger";
  contributingFactors: ContributingFactor[];
  year: number;
}

/** 위험 수준별 텍스트 색상 클래스 */
function levelColorClass(level: string): string {
  switch (level) {
    case "safe":
      return "text-risk-safe";
    case "caution":
      return "text-risk-caution";
    case "warning":
      return "text-risk-warning";
    case "danger":
      return "text-risk-danger";
    default:
      return "text-text-secondary";
  }
}

const REGIONS = [
  { code: "B10", name: "서울" }, { code: "C10", name: "부산" },
  { code: "D10", name: "대구" }, { code: "E10", name: "인천" },
  { code: "F10", name: "광주" }, { code: "G10", name: "대전" },
  { code: "H10", name: "울산" }, { code: "J10", name: "경기" },
  { code: "K10", name: "강원" }, { code: "M10", name: "충북" },
  { code: "N10", name: "충남" }, { code: "P10", name: "전북" },
  { code: "Q10", name: "전남" }, { code: "R10", name: "경북" },
  { code: "S10", name: "경남" }, { code: "T10", name: "제주" },
];

export default function EarlyAlertPage() {
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("B10");

  useEffect(() => {
    async function fetchRiskScores() {
      setLoading(true);
      setCurrentPage(1);
      try {
        const res = await fetch(`/api/early-alert?region=${selectedRegion}`);
        const body = await res.json();

        if (res.ok && Array.isArray(body.data)) {
          setRiskScores(body.data);
        } else {
          setError("위험도 데이터를 불러오지 못했습니다.");
        }
      } catch {
        setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    }
    fetchRiskScores();
  }, [selectedRegion]);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
  const PAGE_SIZE = 30;

  // 검색 필터
  const filteredScores = searchFilter
    ? riskScores.filter((s) => s.schoolName.includes(searchFilter))
    : riskScores;

  // 요약 집계
  const totalSchools = filteredScores.length;
  const dangerCount = filteredScores.filter((s) => s.level === "danger").length;
  const warningCount = filteredScores.filter((s) => s.level === "warning").length;
  const safeCount = filteredScores.filter(
    (s) => s.level === "safe" || s.level === "caution"
  ).length;

  // 페이지네이션
  const totalPages = Math.ceil(totalSchools / PAGE_SIZE);
  const pagedScores = filteredScores.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-[1280px] mx-auto px-12 py-8">
        {/* 타이틀 + 지역 선택 + 검색 */}
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-[28px] font-bold text-text-primary whitespace-nowrap">
            조기경보 대시보드
          </h2>
          <select
            value={selectedRegion}
            onChange={(e) => { setSelectedRegion(e.target.value); setSearchFilter(""); }}
            className="h-10 px-4 rounded-lg border border-border bg-surface text-sm font-medium"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="학교명 검색..."
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
            aria-label="학교명 검색"
            className="h-10 px-4 rounded-lg border border-border bg-surface text-sm flex-1 max-w-xs placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* 요약 카드 */}
        <section className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">전체 학교</p>
            <p className="text-3xl font-bold mt-1">
              {loading ? "—" : totalSchools}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">위험</p>
            <p className="text-3xl font-bold mt-1 text-risk-danger">
              {loading ? "—" : dangerCount}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">경고</p>
            <p className="text-3xl font-bold mt-1 text-risk-warning">
              {loading ? "—" : warningCount}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">안전 / 주의</p>
            <p className="text-3xl font-bold mt-1 text-risk-safe">
              {loading ? "—" : safeCount}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
        </section>

        {/* 학교 위험도 테이블 */}
        <section>
          <h3 className="text-[22px] font-semibold text-text-primary mb-4">
            학교별 위험도 현황
          </h3>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-border rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <p className="text-risk-danger">{error}</p>
            </div>
          ) : riskScores.length === 0 ? (
            <p className="text-text-secondary">표시할 데이터가 없습니다.</p>
          ) : (<>
            <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-6 py-3 text-sm font-semibold text-text-secondary">
                      학교명
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-text-secondary">
                      위험도 점수
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-text-secondary">
                      위험 수준
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-text-secondary">
                      주요 기여 요인
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedScores.map((school) => (
                    <tr
                      key={school.schoolCode}
                      className="border-b border-border last:border-b-0 hover:bg-background/50 transition-colors"
                    >
                      {/* 학교명 (학교 이름) */}
                      <td className="px-6 py-4 text-sm font-medium text-text-primary">
                        {school.schoolName}
                      </td>

                      {/* 위험도 점수 — RiskScoreBadge 컴포넌트 사용 */}
                      <td className="px-6 py-4">
                        <div className="w-28">
                          <RiskScoreBadge score={school.score} level={school.level} />
                        </div>
                      </td>

                      {/* 위험 수준 라벨 */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${levelColorClass(school.level)}`}
                        >
                          {levelToLabel[school.level] ?? school.level}
                        </span>
                      </td>

                      {/* 주요 기여 요인 (상위 3개) */}
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {school.contributingFactors.length > 0 ? (
                          <ul className="space-y-1">
                            {school.contributingFactors.slice(0, 3).map((f) => (
                              <li key={f.factor}>
                                <span className="font-medium text-text-primary">
                                  {f.description}
                                </span>{" "}
                                <span className="text-xs text-text-secondary">
                                  (가중치 {(f.weight * 100).toFixed(0)}%)
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium disabled:opacity-40 hover:bg-background transition-colors"
                >
                  이전
                </button>
                {Array.from(
                  { length: Math.min(7, totalPages) },
                  (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-primary text-white"
                            : "border border-border bg-surface hover:bg-background"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium disabled:opacity-40 hover:bg-background transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </>)}
        </section>
      </main>

      {/* 푸터 — 데이터 출처 표기 */}
      <footer className="bg-background border-t border-border py-6 px-12 text-center">
        <p className="text-xs text-text-secondary">
          출처: 학교알리미(schoolinfo.go.kr), 나이스 교육정보(open.neis.go.kr) |
          공공누리 제1유형(출처표시) | 제8회 교육 공공데이터 AI 활용대회
        </p>
      </footer>
    </div>
  );
}
