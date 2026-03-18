"use client";

import { useState, useEffect } from "react";
import type { GapAnalysisResult, GapItem } from "@/lib/analysis/gapmap";
import { Header } from "@/components/Header";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-risk-safe/10", text: "text-risk-safe", label: "양호" },
  medium: { bg: "bg-risk-warning/10", text: "text-risk-warning", label: "보통" },
  high: { bg: "bg-risk-danger/10", text: "text-risk-danger", label: "심각" },
};

const GAP_TYPE_LABELS: Record<string, string> = {
  missing_category: "프로그램 미운영",
  low_enrollment: "수강 인원 부족",
  understaffed: "교원 부담 과다",
  underfunded: "재정 부족",
};

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

export default function GapMapPage() {
  const [results, setResults] = useState<GapAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<GapAnalysisResult | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("B10");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
  const PAGE_SIZE = 30;

  useEffect(() => {
    async function fetchGapData() {
      setLoading(true);
      setCurrentPage(1);
      try {
        const res = await fetch(`/api/gapmap?region=${selectedRegion}`);
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          setResults(body.data);
        } else {
          setError("공백 분석 데이터를 불러오지 못했습니다.");
        }
      } catch {
        setError("서버 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchGapData();
  }, [selectedRegion]);

  const filteredResults = searchFilter
    ? results.filter((r) => r.schoolName.includes(searchFilter))
    : results;
  const sortedResults = [...filteredResults].sort((a, b) => b.totalGaps - a.totalGaps);
  const totalPages = Math.ceil(sortedResults.length / PAGE_SIZE);
  const pagedResults = sortedResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-[1280px] mx-auto px-12 py-8">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-[28px] font-bold text-text-primary">
            학습자원 공백 지도 (GapMap)
          </h2>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="h-10 px-4 rounded-lg border border-border bg-surface text-sm font-medium"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>
        <p className="text-text-secondary mb-8">
          학교별 방과후 프로그램 카테고리 커버리지, 교원 여건, 재정 수준을 종합 분석하여 학습자원 공백을 시각화합니다.
        </p>

        {/* 요약 카드 */}
        <section className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">분석 대상</p>
            <p className="text-3xl font-bold mt-1">
              {loading ? "—" : results.length}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">공백 심각 학교</p>
            <p className="text-3xl font-bold mt-1 text-risk-danger">
              {loading ? "—" : results.filter((r) => r.overallSeverity === "high").length}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">평균 커버리지</p>
            <p className="text-3xl font-bold mt-1">
              {loading
                ? "—"
                : results.length > 0
                  ? Math.round(results.reduce((s, r) => s + r.coverageRate, 0) / results.length)
                  : 0}
              <span className="text-sm font-normal text-text-secondary ml-1">%</span>
            </p>
          </div>
        </section>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-border rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <p className="text-risk-danger">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 학교 목록 */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-text-primary whitespace-nowrap">학교별 공백 현황</h3>
                <input
                  type="text"
                  placeholder="학교명 검색..."
                  value={searchFilter}
                  onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
                  aria-label="학교명 검색"
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-background">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-text-secondary">학교명</th>
                      <th className="text-center px-2 py-2 text-xs font-semibold text-text-secondary w-14">공백</th>
                      <th className="text-center px-2 py-2 text-xs font-semibold text-text-secondary w-20">커버리지</th>
                      <th className="text-center px-2 py-2 text-xs font-semibold text-text-secondary w-14">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedResults.map((result) => {
                      const style = SEVERITY_STYLES[result.overallSeverity];
                      const isSelected = selectedSchool?.schoolCode === result.schoolCode;
                      return (
                        <tr
                          key={result.schoolCode}
                          onClick={() => setSelectedSchool(result)}
                          className={`border-t border-border cursor-pointer transition-colors ${
                            isSelected ? "bg-primary-lighter/50" : "hover:bg-background"
                          }`}
                        >
                          <td className="px-3 py-2 font-medium text-text-primary truncate max-w-[180px]">
                            {result.schoolName}
                          </td>
                          <td className="px-2 py-2 text-center text-text-secondary">{result.totalGaps}</td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center gap-1">
                              <div className="flex-1 bg-border rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${result.coverageRate}%` }} />
                              </div>
                              <span className="text-xs text-text-secondary w-8">{result.coverageRate}%</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 px-4 pb-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium disabled:opacity-40 hover:bg-background transition-colors"
                  >
                    이전
                  </button>
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
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
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium disabled:opacity-40 hover:bg-background transition-colors"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>

            {/* 상세 공백 분석 */}
            <div className="lg:col-span-3">
              {selectedSchool ? (
                <GapDetail result={selectedSchool} />
              ) : (
                <div className="bg-surface border border-border rounded-lg p-8 h-full flex items-center justify-center">
                  <p className="text-text-secondary">
                    좌측에서 학교를 선택하면 상세 공백 분석을 확인할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-background border-t border-border py-6 px-12 text-center mt-8">
        <p className="text-xs text-text-secondary">
          출처: 학교알리미(schoolinfo.go.kr), 나이스 교육정보(open.neis.go.kr) |
          공공누리 제1유형(출처표시) | 제8회 교육 공공데이터 AI 활용대회
        </p>
      </footer>
    </div>
  );
}

/** 선택된 학교의 상세 공백 분석 뷰 */
function GapDetail({ result }: { result: GapAnalysisResult }) {
  const style = SEVERITY_STYLES[result.overallSeverity];

  return (
    <div className="space-y-6">
      {/* 학교 헤더 */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">{result.schoolName}</h3>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${style.bg} ${style.text}`}
          >
            전체 심각도: {style.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-secondary">총 공백 수</p>
            <p className="text-2xl font-bold text-text-primary">{result.totalGaps}건</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">카테고리 커버리지</p>
            <p className="text-2xl font-bold text-text-primary">{result.coverageRate}%</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">학교 코드</p>
            <p className="text-sm font-mono text-text-secondary mt-1">{result.schoolCode}</p>
          </div>
        </div>

        {/* 커버리지 바 */}
        <div className="mt-4">
          <div className="w-full bg-border rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                result.coverageRate >= 80
                  ? "bg-risk-safe"
                  : result.coverageRate >= 50
                    ? "bg-risk-warning"
                    : "bg-risk-danger"
              }`}
              style={{ width: `${result.coverageRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 공백 항목 목록 — 2열 그리드 */}
      {result.gaps.length === 0 ? (
        <div className="bg-risk-safe/5 border border-risk-safe/20 rounded-lg p-6 text-center">
          <p className="text-risk-safe font-semibold">학습자원 공백이 발견되지 않았습니다.</p>
        </div>
      ) : (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-3">발견된 공백 ({result.gaps.length}건)</h4>
          <div className="grid grid-cols-2 gap-3">
            {result.gaps.map((gap, i) => (
              <GapItemCard key={i} gap={gap} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GapItemCard({ gap }: { gap: GapItem }) {
  const sevStyle = SEVERITY_STYLES[gap.severity];

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary-lighter text-primary">
          {GAP_TYPE_LABELS[gap.type] ?? gap.type}
        </span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sevStyle.bg} ${sevStyle.text}`}
        >
          {sevStyle.label}
        </span>
      </div>
      <p className="text-xs text-text-primary leading-relaxed">{gap.description}</p>
      <p className="text-xs text-text-secondary mt-1.5">{gap.recommendation}</p>
    </div>
  );
}
