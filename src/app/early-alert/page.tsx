"use client";

import { useState, useEffect } from "react";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { Header } from "@/components/Header";
import { AiMarkdown } from "@/components/AiMarkdown";
import { AiProgressBar } from "@/components/AiProgressBar";
import { REGIONS } from "@/lib/constants/regions";


interface FactorBreakdown {
  factor: string;
  value: string;
  rawScore: number;
  weight: number;
  contribution: number;
}

interface TopRiskSchool {
  schoolCode: string;
  schoolName: string;
  score: number;
  level: "safe" | "caution" | "warning" | "danger";
  factors: FactorBreakdown[];
}

interface EarlyAlertData {
  total: number;
  counts: { safe: number; caution: number; warning: number; danger: number };
  avgScore: number;
  topRisk: TopRiskSchool[];
}


export default function EarlyAlertPage() {
  const [data, setData] = useState<EarlyAlertData | null>(null);
  const [narratives, setNarratives] = useState<Record<string, string>>({});
  const [regionSummary, setRegionSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("B10");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState<Array<{ district: string; schoolCount: number }>>([]);
  const [policyPriority, setPolicyPriority] = useState("");
  const [policyLoading, setPolicyLoading] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const regionName = REGIONS.find((r) => r.code === selectedRegion)?.name ?? "전체";

  // 시도 변경 → 시군구 목록 로드
  useEffect(() => {
    setSelectedDistrict("");
    if (selectedRegion) {
      fetch(`/api/districts?region=${selectedRegion}`)
        .then((r) => r.json())
        .then((body) => setDistricts(body.data ?? []))
        .catch(() => setDistricts([]));
    } else {
      setDistricts([]);
    }
  }, [selectedRegion]);

  // SSE 스트림 URL (지역/시군구 변경 시 갱신)
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [policyStreamUrl, setPolicyStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);
    setPolicyPriority("");
    setShowPolicy(false);
    const params = new URLSearchParams({ region: selectedRegion });
    if (selectedDistrict) params.set("district", selectedDistrict);
    setStreamUrl(`/api/early-alert/stream?${params}`);
  }, [selectedRegion, selectedDistrict]);

  // SSE 완료 콜백
  function handleStreamComplete(result: unknown) {
    const body = result as {
      data: EarlyAlertData;
      narratives: Record<string, string>;
      regionSummary: string;
    };
    setData(body.data);
    setNarratives(body.narratives ?? {});
    setRegionSummary(body.regionSummary ?? "");
    setLoading(false);
    setStreamUrl(null);
  }

  function handleStreamError(msg: string) {
    setError(msg);
    setLoading(false);
    setStreamUrl(null);
  }

  // 정책 개입 우선순위 — SSE
  function fetchPolicyPriority() {
    setPolicyLoading(true);
    setShowPolicy(true);
    setPolicyStreamUrl(`/api/ai-insight/stream?type=policy-priority&region=${selectedRegion}`);
  }

  function handlePolicyComplete(result: unknown) {
    const body = result as { data: string };
    setPolicyPriority(body.data);
    setPolicyLoading(false);
    setPolicyStreamUrl(null);
  }

  function handlePolicyError() {
    setPolicyPriority("정책 분석 생성에 실패했습니다.");
    setPolicyLoading(false);
    setPolicyStreamUrl(null);
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
  const PAGE_SIZE = 20;

  // 검색 필터
  const topRisk = data?.topRisk ?? [];
  const filteredScores = searchFilter
    ? topRisk.filter((s) => s.schoolName.includes(searchFilter))
    : topRisk;

  // 페이지네이션
  const totalPages = Math.ceil(filteredScores.length / PAGE_SIZE);
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
            className="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
          {districts.length > 0 && (
            <select
              value={selectedDistrict}
              onChange={(e) => { setSelectedDistrict(e.target.value); setSearchFilter(""); }}
              className="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium"
            >
              <option value="">전체({regionName})</option>
              {districts.map((d) => {
                const short = d.district.split(" ").slice(1).join(" ") || d.district;
                return (
                  <option key={d.district} value={d.district}>
                    {short} ({d.schoolCount})
                  </option>
                );
              })}
            </select>
          )}
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
              {loading ? "—" : data?.total ?? 0}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">위험</p>
            <p className="text-3xl font-bold mt-1 text-risk-danger">
              {loading ? "—" : data?.counts.danger ?? 0}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">경고</p>
            <p className="text-3xl font-bold mt-1 text-risk-warning">
              {loading ? "—" : data?.counts.warning ?? 0}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">안전 / 주의</p>
            <p className="text-3xl font-bold mt-1 text-risk-safe">
              {loading ? "—" : (data?.counts.safe ?? 0) + (data?.counts.caution ?? 0)}
              <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
            </p>
          </div>
        </section>

        {/* AI 지역 패턴 요약 */}
        {regionSummary && (
          <section className="mb-8 bg-primary/5 border border-primary/20 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <span className="text-primary text-lg mt-0.5">AI</span>
              <div>
                <h3 className="text-sm font-semibold text-primary mb-1">지역 인사이트</h3>
                <p className="text-sm text-text-primary leading-relaxed">{regionSummary}</p>
              </div>
            </div>
          </section>
        )}

        {/* AI 정책 개입 우선순위 */}
        {!showPolicy ? (
          <div className="mb-8">
            <button
              onClick={fetchPolicyPriority}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
            >
              AI 정책 개입 우선순위 분석
            </button>
          </div>
        ) : (
          <section className="mb-8 bg-surface border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span className="text-primary">AI</span> 정책 개입 우선순위
            </h3>
            {policyLoading ? (
              <AiProgressBar
                streamUrl={policyStreamUrl ?? undefined}
                onComplete={handlePolicyComplete}
                onError={handlePolicyError}
              />
            ) : (
              <div>
                <AiMarkdown content={policyPriority} />
              </div>
            )}
          </section>
        )}

        {/* 학교 위험도 테이블 */}
        <section>
          <h3 className="text-[22px] font-semibold text-text-primary mb-4">
            위험 학교 현황
            {data && (
              <span className="text-sm font-normal text-text-secondary ml-2">
                (경고 이상 {topRisk.length}개교)
              </span>
            )}
          </h3>

          {loading ? (
            <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
              <AiProgressBar
                streamUrl={streamUrl ?? undefined}
                onComplete={handleStreamComplete}
                onError={handleStreamError}
              />
            </div>
          ) : error ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <p className="text-risk-danger">{error}</p>
            </div>
          ) : topRisk.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <p className="text-risk-safe font-medium">이 지역에 경고 이상 학교가 없습니다.</p>
            </div>
          ) : (<>
            <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden max-h-[calc(100vh-340px)] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-background">
                    <th className="px-4 py-3 text-sm font-semibold text-text-secondary w-[160px]">
                      학교명
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-text-secondary w-[100px]">
                      총점
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-text-secondary">
                      점수 산출 근거
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-text-secondary w-[280px]">
                      AI 분석
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedScores.map((school) => (
                    <tr
                      key={school.schoolCode}
                      className="border-b border-border last:border-b-0 hover:bg-background/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        {school.schoolName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-20">
                          <RiskScoreBadge score={school.score} level={school.level} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {school.factors && school.factors.length > 0 ? (
                          <div className="space-y-1">
                            {school.factors.map((f) => (
                              <div key={f.factor} className="flex items-center gap-2 text-xs">
                                <span className="text-text-secondary w-[100px] shrink-0">{f.factor}</span>
                                <span className="font-medium text-text-primary w-[64px] shrink-0">{f.value}</span>
                                <div className="flex-1 flex items-center gap-1">
                                  <div className="flex-1 bg-border rounded-full h-1.5 max-w-[80px]">
                                    <div
                                      className={`h-1.5 rounded-full ${f.rawScore >= 70 ? "bg-risk-danger" : f.rawScore >= 40 ? "bg-risk-warning" : "bg-risk-safe"}`}
                                      style={{ width: `${f.rawScore}%` }}
                                    />
                                  </div>
                                  <span className={`font-bold w-[28px] text-right ${f.rawScore >= 70 ? "text-risk-danger" : f.rawScore >= 40 ? "text-risk-warning" : "text-risk-safe"}`}>
                                    {f.rawScore}
                                  </span>
                                </div>
                                <span className="text-text-secondary/60 w-[48px] shrink-0 text-right">
                                  +{f.contribution}점
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-secondary/50 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {narratives[school.schoolCode] ? (
                          <p className="leading-relaxed line-clamp-3">{narratives[school.schoolCode]}</p>
                        ) : (
                          <span className="text-text-secondary/50">—</span>
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
