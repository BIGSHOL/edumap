"use client";

import { useState, useEffect } from "react";
import type { GapAnalysisResult, GapItem } from "@/lib/analysis/gapmap";
import type { ZoneAnalysisResult } from "@/lib/api/contracts/district-zone";
import { Header } from "@/components/Header";
import { AiMarkdown } from "@/components/AiMarkdown";
import { AiProgressBar } from "@/components/AiProgressBar";
import { ZoneClusterMapDynamic } from "@/components/map/ZoneClusterMapDynamic";
import type { ZoneMarker } from "@/components/map/ZoneClusterMap";
import { REGIONS } from "@/lib/constants/regions";

type AnalysisMode = "school" | "zone";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-risk-safe/10", text: "text-risk-safe", label: "양호" },
  medium: { bg: "bg-risk-warning/10", text: "text-risk-warning", label: "보통" },
  high: { bg: "bg-risk-danger/10", text: "text-risk-danger", label: "심각" },
};

const LEVEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: "bg-risk-safe/10", text: "text-risk-safe", label: "안전" },
  caution: { bg: "bg-risk-caution/10", text: "text-risk-caution", label: "주의" },
  warning: { bg: "bg-risk-warning/10", text: "text-risk-warning", label: "경고" },
  danger: { bg: "bg-risk-danger/10", text: "text-risk-danger", label: "위험" },
};

const GAP_TYPE_LABELS: Record<string, string> = {
  missing_category: "프로그램 미운영",
  low_enrollment: "수강 인원 부족",
  understaffed: "교원 부담 과다",
  underfunded: "재정 부족",
  education_desert: "교육 사각지대",
};

export default function GapMapPage() {
  // 공통 상태
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("school");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("B10");
  const regionName = REGIONS.find((r) => r.code === selectedRegion)?.name ?? "전체";

  // ─── 학교별 분석 상태 ───
  const [results, setResults] = useState<GapAnalysisResult[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<GapAnalysisResult | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState<Array<{ district: string; schoolCount: number }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
  const PAGE_SIZE = 20;

  // ─── 학구별 분석 상태 ───
  const [zoneResults, setZoneResults] = useState<ZoneAnalysisResult[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneAnalysisResult | null>(null);
  const [eduSupportOffices, setEduSupportOffices] = useState<Array<{ code: string; name: string; zoneCount: number }>>([]);
  const [selectedEduSupport, setSelectedEduSupport] = useState("");
  const [zoneCurrentPage, setZoneCurrentPage] = useState(1);

  // 시도 변경 → 시군구/교육지원청 목록 로드
  useEffect(() => {
    setSelectedDistrict("");
    setSelectedEduSupport("");
    if (selectedRegion) {
      fetch(`/api/districts?region=${selectedRegion}`)
        .then((r) => r.json())
        .then((body) => setDistricts(body.data ?? []))
        .catch(() => setDistricts([]));
      fetch(`/api/edu-support-offices?region=${selectedRegion}`)
        .then((r) => r.json())
        .then((body) => setEduSupportOffices(body.data ?? []))
        .catch(() => setEduSupportOffices([]));
    } else {
      setDistricts([]);
      setEduSupportOffices([]);
    }
  }, [selectedRegion]);

  // 학교별 분석 데이터 로드
  useEffect(() => {
    if (analysisMode !== "school") return;
    async function fetchGapData() {
      setLoading(true);
      setCurrentPage(1);
      try {
        const params = new URLSearchParams({ region: selectedRegion });
        if (selectedDistrict) params.set("district", selectedDistrict);
        const res = await fetch(`/api/gapmap?${params}`);
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          setResults(body.data);
          setError(null);
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
  }, [analysisMode, selectedRegion, selectedDistrict]);

  // 학구별 분석 데이터 로드
  useEffect(() => {
    if (analysisMode !== "zone") return;
    async function fetchZoneData() {
      setLoading(true);
      setZoneCurrentPage(1);
      try {
        const params = new URLSearchParams({ region: selectedRegion, limit: "100" });
        if (selectedEduSupport) params.set("eduSupportCode", selectedEduSupport);
        const res = await fetch(`/api/zone-analysis?${params}`);
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          setZoneResults(body.data);
          setError(null);
        } else {
          setError("학구 분석 데이터를 불러오지 못했습니다.");
        }
      } catch {
        setError("서버 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchZoneData();
  }, [analysisMode, selectedRegion, selectedEduSupport]);

  // 학교 선택 시 AI 제안 — SSE 스트림
  const [gapStreamUrl, setGapStreamUrl] = useState<string | null>(null);

  function handleSelectSchool(result: GapAnalysisResult) {
    setSelectedSchool(result);
    setAiSuggestion("");
    setAiLoading(false);
    setGapStreamUrl(null);
  }

  function handleRequestAiSuggestion() {
    if (!selectedSchool || selectedSchool.totalGaps === 0) return;
    setAiLoading(true);
    setGapStreamUrl(`/api/gapmap/stream?schoolCode=${selectedSchool.schoolCode}`);
  }

  function handleGapStreamComplete(result: unknown) {
    const body = result as { aiSuggestion?: string };
    if (body.aiSuggestion) setAiSuggestion(body.aiSuggestion);
    setAiLoading(false);
    setGapStreamUrl(null);
  }

  function handleGapStreamError() {
    setAiLoading(false);
    setGapStreamUrl(null);
  }

  // 학교별 필터/정렬/페이지
  const filteredResults = searchFilter
    ? results.filter((r) => r.schoolName.includes(searchFilter))
    : results;
  const sortedResults = [...filteredResults].sort((a, b) => b.totalGaps - a.totalGaps);
  const totalPages = Math.ceil(sortedResults.length / PAGE_SIZE);
  const pagedResults = sortedResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 학구별 페이지
  const zoneTotalPages = Math.ceil(zoneResults.length / PAGE_SIZE);
  const pagedZoneResults = zoneResults.slice((zoneCurrentPage - 1) * PAGE_SIZE, zoneCurrentPage * PAGE_SIZE);

  // 학구 지도 데이터 변환
  const zoneMarkers: ZoneMarker[] = zoneResults
    .filter((z) => z.schools.length > 0)
    .map((z) => ({
      zoneId: z.zoneId,
      zoneName: z.zoneName,
      schools: z.schools.map((s) => ({
        schoolName: s.schoolName,
        latitude: null, // API에서 좌표를 별도로 가져와야 함
        longitude: null,
        riskScore: s.riskScore,
        riskLevel: s.riskLevel,
      })),
      avgRiskScore: z.avgRiskScore,
      overallLevel: z.overallLevel,
      schoolCount: z.schoolCount,
      eduSupportName: z.eduSupportName,
    }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-[1280px] mx-auto px-12 py-8">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-[28px] font-bold text-text-primary">
            학습자원 공백 지도 (GapMap)
          </h2>

          {/* 분석 모드 토글 */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => { setAnalysisMode("school"); setSelectedZone(null); }}
              className={`px-4 h-11 text-sm font-medium transition-colors ${
                analysisMode === "school"
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary hover:bg-background"
              }`}
            >
              학교별 분석
            </button>
            <button
              onClick={() => { setAnalysisMode("zone"); setSelectedSchool(null); }}
              className={`px-4 h-11 text-sm font-medium transition-colors ${
                analysisMode === "zone"
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary hover:bg-background"
              }`}
            >
              학구별 분석
            </button>
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>

          {/* 학교별: 시군구 필터 */}
          {analysisMode === "school" && districts.length > 0 && (
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
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

          {/* 학구별: 교육지원청 필터 */}
          {analysisMode === "zone" && eduSupportOffices.length > 0 && (
            <select
              value={selectedEduSupport}
              onChange={(e) => setSelectedEduSupport(e.target.value)}
              className="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium"
            >
              <option value="">전체 교육지원청</option>
              {eduSupportOffices.map((o) => {
                const shortName = o.name.replace(/교육지원청$/, "").replace(/.*시|.*도/, "");
                return (
                  <option key={o.code} value={o.code}>
                    {shortName || o.name} ({o.zoneCount}학구)
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <p className="text-text-secondary mb-8">
          {analysisMode === "school"
            ? "학교별 방과후 프로그램 카테고리 커버리지, 교원 여건, 재정 수준을 종합 분석하여 학습자원 공백을 시각화합니다."
            : "학구(동네) 단위로 배정 학교들의 평균 여건을 분석합니다. 같은 동네 아이들이 다니는 학교들의 종합 학습환경을 비교합니다."}
        </p>

        {/* 요약 카드 */}
        {analysisMode === "school" ? (
          <section className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <p className="text-text-secondary text-sm">분석 대상</p>
              {loading ? (
                <div className="animate-pulse h-9 w-20 bg-border rounded mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1">
                  {results.length}
                  <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
                </p>
              )}
            </div>
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <p className="text-text-secondary text-sm">공백 심각 학교</p>
              {loading ? (
                <div className="animate-pulse h-9 w-20 bg-border rounded mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1 text-risk-danger">
                  {results.filter((r) => r.overallSeverity === "high").length}
                  <span className="text-sm font-normal text-text-secondary ml-1">개교</span>
                </p>
              )}
            </div>
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <p className="text-text-secondary text-sm">평균 커버리지</p>
              {loading ? (
                <div className="animate-pulse h-9 w-16 bg-border rounded mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1">
                  {results.length > 0
                    ? Math.round(results.reduce((s, r) => s + r.coverageRate, 0) / results.length)
                    : 0}
                  <span className="text-sm font-normal text-text-secondary ml-1">%</span>
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <p className="text-text-secondary text-sm">분석 학구</p>
              <p className="text-3xl font-bold mt-1">
                {loading ? "—" : zoneResults.length}
                <span className="text-sm font-normal text-text-secondary ml-1">개</span>
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <p className="text-text-secondary text-sm">위험 학구</p>
              <p className="text-3xl font-bold mt-1 text-risk-danger">
                {loading ? "—" : zoneResults.filter((z) => z.overallLevel === "danger" || z.overallLevel === "warning").length}
                <span className="text-sm font-normal text-text-secondary ml-1">개</span>
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <p className="text-text-secondary text-sm">평균 위험도</p>
              <p className="text-3xl font-bold mt-1">
                {loading
                  ? "—"
                  : zoneResults.length > 0
                    ? Math.round(zoneResults.reduce((s, z) => s + z.avgRiskScore, 0) / zoneResults.length)
                    : 0}
                <span className="text-sm font-normal text-text-secondary ml-1">점</span>
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <p className="text-text-secondary text-sm">평균 커버리지</p>
              <p className="text-3xl font-bold mt-1">
                {loading
                  ? "—"
                  : zoneResults.length > 0
                    ? Math.round(zoneResults.reduce((s, z) => s + z.avgCoverageRate, 0) / zoneResults.length)
                    : 0}
                <span className="text-sm font-normal text-text-secondary ml-1">%</span>
              </p>
            </div>
          </section>
        )}

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
        ) : analysisMode === "school" ? (
          /* ────── 학교별 분석 뷰 ────── */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ height: "calc(100vh - 340px)", minHeight: "480px" }}>
            {/* 학교 목록 */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
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
              <div className="bg-surface border border-border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="bg-background sticky top-0 z-10">
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
                            onClick={() => handleSelectSchool(result)}
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
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </div>

            {/* 상세 공백 분석 */}
            <div className="lg:col-span-3 h-full min-h-0">
              {selectedSchool ? (
                <div className="h-full overflow-y-auto">
                  <GapDetail
                    result={selectedSchool}
                    aiSuggestion={aiSuggestion}
                    aiLoading={aiLoading}
                    streamUrl={gapStreamUrl ?? undefined}
                    onStreamComplete={handleGapStreamComplete}
                    onStreamError={handleGapStreamError}
                    onRequestAi={handleRequestAiSuggestion}
                  />
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-lg p-8 h-full flex items-center justify-center">
                  <p className="text-text-secondary">
                    좌측에서 학교를 선택하면 상세 공백 분석을 확인할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ────── 학구별 분석 뷰 ────── */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ height: "calc(100vh - 380px)", minHeight: "480px" }}>
            {/* 학구 목록 */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <h3 className="text-lg font-semibold text-text-primary mb-3">학구별 분석 현황</h3>
              <div className="bg-surface border border-border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="bg-background sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-text-secondary">학구</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-text-secondary w-14">학교</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-text-secondary w-16">위험도</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-text-secondary w-14">수준</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedZoneResults.map((zone) => {
                        const style = LEVEL_STYLES[zone.overallLevel] ?? LEVEL_STYLES.caution;
                        const isSelected = selectedZone?.zoneId === zone.zoneId;
                        return (
                          <tr
                            key={zone.zoneId}
                            onClick={() => setSelectedZone(zone)}
                            className={`border-t border-border cursor-pointer transition-colors ${
                              isSelected ? "bg-primary-lighter/50" : "hover:bg-background"
                            }`}
                          >
                            <td className="px-3 py-2">
                              <p className="font-medium text-text-primary text-xs truncate max-w-[160px]">{zone.zoneName}</p>
                              {zone.eduSupportName && (
                                <p className="text-[10px] text-text-secondary truncate max-w-[160px]">
                                  {zone.eduSupportName.replace(/교육지원청$/, "")}
                                </p>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center text-text-secondary">{zone.schoolCount}</td>
                            <td className="px-2 py-2 text-center font-semibold text-text-primary">{zone.avgRiskScore}</td>
                            <td className="px-2 py-2 text-center">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {pagedZoneResults.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-text-secondary text-sm">
                            학구 데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={zoneCurrentPage} totalPages={zoneTotalPages} onPageChange={setZoneCurrentPage} />
              </div>
            </div>

            {/* 학구 상세 + 지도 */}
            <div className="lg:col-span-3 h-full min-h-0 flex flex-col gap-4">
              {/* 지도 */}
              <div className="h-[280px] shrink-0">
                {zoneMarkers.length > 0 ? (
                  <ZoneClusterMapDynamic
                    zones={zoneMarkers}
                    onZoneClick={(zoneId) => {
                      const zone = zoneResults.find((z) => z.zoneId === zoneId);
                      if (zone) setSelectedZone(zone);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-surface border border-border rounded-lg flex items-center justify-center">
                    <p className="text-text-secondary text-sm">학구 데이터 로딩 대기 중...</p>
                  </div>
                )}
              </div>

              {/* 학구 상세 */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {selectedZone ? (
                  <ZoneDetail zone={selectedZone} />
                ) : (
                  <div className="bg-surface border border-border rounded-lg p-8 h-full flex items-center justify-center">
                    <p className="text-text-secondary">
                      좌측에서 학구를 선택하면 상세 분석을 확인할 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-background border-t border-border py-6 px-12 text-center mt-8">
        <p className="text-xs text-text-secondary">
          출처: 학교알리미(schoolinfo.go.kr), 나이스 교육정보(open.neis.go.kr),
          전국학교학구도연계정보(data.go.kr), 나이스 학원교습소정보 |
          공공누리 제1유형(출처표시) | 제8회 교육 공공데이터 AI 활용대회
        </p>
      </footer>
    </div>
  );
}

/** 공통 페이지네이션 */
function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 border-t border-border bg-surface shrink-0">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium disabled:opacity-40 hover:bg-background transition-colors"
      >
        이전
      </button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
              currentPage === pageNum
                ? "bg-primary text-white"
                : "border border-border bg-surface hover:bg-background"
            }`}
          >
            {pageNum}
          </button>
        );
      })}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium disabled:opacity-40 hover:bg-background transition-colors"
      >
        다음
      </button>
    </div>
  );
}

/** 학구 상세 분석 뷰 */
function ZoneDetail({ zone }: { zone: ZoneAnalysisResult }) {
  const style = LEVEL_STYLES[zone.overallLevel] ?? LEVEL_STYLES.caution;

  return (
    <div className="space-y-4">
      {/* 학구 헤더 */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-text-primary">{zone.zoneName}</h3>
            {zone.eduSupportName && (
              <p className="text-xs text-text-secondary mt-0.5">{zone.eduSupportName}</p>
            )}
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] text-text-secondary">소속 학교</p>
            <p className="text-xl font-bold text-text-primary">{zone.schoolCount}개</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary">평균 위험도</p>
            <p className="text-xl font-bold text-text-primary">{zone.avgRiskScore}점</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary">평균 커버리지</p>
            <p className="text-xl font-bold text-text-primary">{zone.avgCoverageRate}%</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary">학교 간 편차</p>
            <p className={`text-xl font-bold ${zone.riskScoreVariance > 100 ? "text-risk-danger" : "text-text-primary"}`}>
              {zone.riskScoreVariance}
            </p>
          </div>
        </div>

        {zone.avgStudentsPerTeacher != null && (
          <div className="mt-3 flex gap-4 text-xs text-text-secondary">
            <span>평균 교원1인당학생수: <strong className="text-text-primary">{zone.avgStudentsPerTeacher}명</strong></span>
            {zone.avgBudgetPerStudent != null && (
              <span>평균 학생1인당교육비: <strong className="text-text-primary">{Math.round(zone.avgBudgetPerStudent).toLocaleString()}원</strong></span>
            )}
          </div>
        )}

        {zone.worstFactor && (
          <p className="mt-2 text-xs text-risk-warning">
            주요 위험 요인: <strong>{zone.worstFactor}</strong>
          </p>
        )}
      </div>

      {/* 소속 학교 목록 */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h4 className="text-sm font-semibold text-text-primary mb-3">소속 학교</h4>
        <div className="space-y-2">
          {zone.schools.map((school) => {
            const sStyle = LEVEL_STYLES[school.riskLevel] ?? LEVEL_STYLES.caution;
            return (
              <div key={school.schoolCode} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{school.schoolName}</p>
                  <p className="text-[10px] text-text-secondary">
                    커버리지 {school.coverageRate}% | 공백 {school.gapCount}건
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{school.riskScore}점</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sStyle.bg} ${sStyle.text}`}>
                    {sStyle.label}
                  </span>
                </div>
              </div>
            );
          })}
          {zone.schools.length === 0 && (
            <p className="text-xs text-text-secondary text-center py-4">
              학구 내 학교 데이터를 찾을 수 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 학구 내 편차 안내 */}
      {zone.riskScoreVariance > 100 && zone.schools.length > 1 && (
        <div className="bg-risk-warning/5 border border-risk-warning/20 rounded-lg p-4">
          <p className="text-xs text-risk-warning font-semibold">
            같은 학구 내 학교 간 위험도 편차가 큽니다 (분산: {zone.riskScoreVariance})
          </p>
          <p className="text-xs text-text-secondary mt-1">
            같은 동네에서 배정받는 학교에 따라 학습환경이 크게 달라질 수 있습니다.
            격차 해소를 위한 정책적 개입이 필요합니다.
          </p>
        </div>
      )}
    </div>
  );
}

/** 선택된 학교의 상세 공백 분석 뷰 */
function GapDetail({ result, aiSuggestion, aiLoading, streamUrl, onStreamComplete, onStreamError, onRequestAi }: {
  result: GapAnalysisResult;
  aiSuggestion: string;
  aiLoading: boolean;
  streamUrl?: string;
  onStreamComplete?: (data: unknown) => void;
  onStreamError?: (msg: string) => void;
  onRequestAi?: () => void;
}) {
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

      {/* 주변 학원 현황 */}
      {result.academySummary && (
        <div className="bg-surface border border-border rounded-lg p-6">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            주변 학원 현황
            <span className="text-xs font-normal text-text-secondary ml-2">
              ({result.academySummary.totalAcademies.toLocaleString()}개)
            </span>
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: "academic", label: "학술/교과" },
              { id: "arts", label: "예술" },
              { id: "sports", label: "체육" },
              { id: "technology", label: "기술" },
              { id: "language", label: "외국어" },
            ].map((cat) => {
              const count = result.academySummary!.academyByCategory[cat.id] ?? 0;
              return (
                <div key={cat.id} className="text-center p-2 rounded-lg bg-background">
                  <p className="text-xs text-text-secondary">{cat.label}</p>
                  <p className={`text-lg font-bold ${count === 0 ? "text-risk-danger" : count < 10 ? "text-risk-warning" : "text-text-primary"}`}>
                    {count}
                  </p>
                </div>
              );
            })}
          </div>
          {!result.academySummary.hasComplement && (
            <p className="text-xs text-risk-danger mt-2">
              주변에 학원이 부족하여 학교 외부를 통한 학습 보완이 어렵습니다.
            </p>
          )}
        </div>
      )}

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

      {/* AI 개선 제안 — 버튼 클릭 시 */}
      {!aiLoading && !aiSuggestion && result.totalGaps > 0 && onRequestAi && (
        <button
          onClick={onRequestAi}
          className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
        >
          AI 개선 방안 분석
        </button>
      )}

      {(aiLoading || aiSuggestion) && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-primary text-lg mt-0.5">AI</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-primary mb-2">AI 개선 제안</h4>
              {aiLoading ? (
                <AiProgressBar
                  streamUrl={streamUrl}
                  onComplete={onStreamComplete}
                  onError={onStreamError}
                />
              ) : (
                <AiMarkdown content={aiSuggestion} />
              )}
            </div>
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
