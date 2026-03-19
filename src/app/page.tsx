"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SchoolCard } from "@/components/SchoolCard";
import { Header } from "@/components/Header";
import { RegionRiskMapDynamic } from "@/components/map/RegionRiskMapDynamic";
import type { SchoolItem } from "@/lib/api/contracts/schools";
import { REGIONS } from "@/lib/constants/regions";

interface RegionSummary {
  regionCode: string;
  district: string;
  avgScore: number;
  schoolCount: number;
}

const PAGE_SIZE = 30;

export default function Home() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [riskSummary, setRiskSummary] = useState({
    total: 0,
    counts: { safe: 0, caution: 0, warning: 0, danger: 0 },
    avgScore: 0,
  });
  const [topRiskSchools, setTopRiskSchools] = useState<
    Array<{ schoolCode: string; schoolName: string; score: number; level: "safe" | "caution" | "warning" | "danger" }>
  >([]);
  const [selectedRegion, setSelectedRegion] = useState("B10");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState<Array<{ district: string; schoolCount: number }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionMapData, setRegionMapData] = useState<RegionSummary[]>([]);
  const [regionSummary, setRegionSummary] = useState("");
  const [narratives, setNarratives] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSchools, setTotalSchools] = useState(0);

  const regionName =
    REGIONS.find((r) => r.code === selectedRegion)?.name ?? "전체";
  // 시군구 선택 시 짧은 이름 (예: "서울특별시 강남구" → "강남구")
  const districtShort = selectedDistrict
    ? selectedDistrict.split(" ").slice(1).join(" ") || selectedDistrict
    : "";
  const locationName = districtShort || regionName;
  const totalPages = Math.ceil(totalSchools / PAGE_SIZE);

  const dangerCount = riskSummary.counts.danger + riskSummary.counts.warning;

  // 학교 목록 로드 (페이지네이션)
  const loadSchools = useCallback(
    async (region: string, page: number, opts?: { search?: string; district?: string }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          page: String(page),
        });
        if (opts?.search) {
          params.set("search", opts.search);
        }
        if (region) {
          params.set("region", region);
        }
        if (opts?.district) {
          params.set("district", opts.district);
        }

        const res = await fetch(`/api/schools?${params}`);
        const body = await res.json();
        if (res.ok) {
          setSchools(body.data);
          setTotalSchools(body.meta?.total ?? body.analyzed);
        }
      } catch {
        console.error("학교 목록 로딩 실패");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 위험도 데이터 로드 — 서버에서 집계된 요약만 수신
  const loadRiskData = useCallback(async (region: string, district?: string) => {
    try {
      const params = new URLSearchParams();
      if (region) params.set("region", region);
      if (district) params.set("district", district);
      params.set("narrative", "false");
      const res = await fetch(`/api/early-alert?${params}`);
      const body = await res.json();
      if (res.ok && body.data) {
        const { total, counts, avgScore, topRisk } = body.data;
        setRiskSummary({ total, counts, avgScore });
        setTopRiskSchools(topRisk);
        setRegionSummary(body.regionSummary ?? "");
        setNarratives(body.narratives ?? {});
      }
    } catch {
      console.error("위험도 로딩 실패");
    }
  }, []);

  // 지도 데이터 로드 (1회)
  useEffect(() => {
    fetch("/api/risk-summary")
      .then((r) => r.json())
      .then((body) => {
        if (Array.isArray(body.data)) setRegionMapData(body.data);
      })
      .catch(() => {});
  }, []);

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

  // 초기 로드 + 지역/시군구 변경
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    loadSchools(selectedRegion, 1, { district: selectedDistrict || undefined });
    loadRiskData(selectedRegion, selectedDistrict || undefined);
  }, [selectedRegion, selectedDistrict, loadSchools, loadRiskData]);

  // 페이지 변경
  useEffect(() => {
    loadSchools(selectedRegion, currentPage, {
      search: searchQuery || undefined,
      district: selectedDistrict || undefined,
    });
  }, [currentPage, selectedRegion, selectedDistrict, searchQuery, loadSchools]);

  // 스마트 검색 (Gemini Flash로 자연어 → 필터 변환)
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);

    if (!query) {
      loadSchools(selectedRegion, 1, { district: selectedDistrict || undefined });
      return;
    }

    // 자연어 검색 시도
    try {
      const res = await fetch(`/api/ai-insight?type=smart-search&q=${encodeURIComponent(query)}`);
      const body = await res.json();
      const filters = body.data;

      if (filters?.region && filters.region !== selectedRegion) {
        setSelectedRegion(filters.region);
      }

      loadSchools(filters?.region || selectedRegion, 1, {
        search: filters?.schoolName || query,
        district: selectedDistrict || undefined,
      });
    } catch {
      // AI 실패 시 기본 검색
      loadSchools(selectedRegion, 1, {
        search: query,
        district: selectedDistrict || undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-[1280px] mx-auto px-12 py-8">
        {/* 검색 + 지역 선택 */}
        <section className="flex gap-4 mb-8 items-start">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          {districts.length > 0 && (
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="">전체({regionName})</option>
              {districts.map((d) => {
                // "서울특별시 강남구" → "강남구"
                const short = d.district.split(" ").slice(1).join(" ") || d.district;
                return (
                  <option key={d.district} value={d.district}>
                    {short} ({d.schoolCount})
                  </option>
                );
              })}
            </select>
          )}
        </section>

        {/* 요약 카드 */}
        <section className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">
              {locationName} 초등학교
            </p>
            <p className="text-3xl font-bold mt-1">
              {loading ? "—" : riskSummary.total}
              <span className="text-sm font-normal text-text-secondary ml-1">
                개교
              </span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">주의 이상 학교</p>
            <p className="text-3xl font-bold mt-1 text-risk-danger">
              {loading ? "—" : dangerCount}
              <span className="text-sm font-normal text-text-secondary ml-1">
                개교
              </span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">
              {locationName} 평균 위험도
            </p>
            <p className="text-3xl font-bold mt-1">
              {loading ? "—" : riskSummary.avgScore}
              <span className="text-sm font-normal text-text-secondary ml-1">
                점
              </span>
            </p>
          </div>
        </section>

        {/* AI 지역 인사이트 */}
        {regionSummary && (
          <section className="mb-8 bg-primary/5 border border-primary/20 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <span className="text-primary text-lg mt-0.5">AI</span>
              <div>
                <h3 className="text-sm font-semibold text-primary mb-1">{locationName} 인사이트</h3>
                <p className="text-sm text-text-primary leading-relaxed">{regionSummary}</p>
              </div>
            </div>
          </section>
        )}

        {/* 전국 시도별 지도 + 위험도 분포 + 위험 학교 목록 */}
        <section className="grid grid-cols-12 gap-6 mb-8">
          {/* 시군구별 위험도 지도 */}
          <div className="col-span-5 bg-surface border border-border rounded-lg shadow-sm overflow-hidden" style={{ height: 380 }}>
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-text-primary">시군구별 위험도</h3>
              <p className="text-xs text-text-secondary mt-0.5">원 크기 = 학교 수, 색상 = 평균 위험도</p>
            </div>
            <div style={{ height: 320 }}>
              <RegionRiskMapDynamic
                data={regionMapData}
                selectedRegion={selectedRegion}
                selectedDistrict={selectedDistrict}
                onRegionClick={(code) => setSelectedRegion(code)}
              />
            </div>
          </div>
          {/* 선택 지역 위험도 수준별 분포 */}
          <div className="col-span-3 bg-surface border border-border rounded-lg p-5 shadow-sm" style={{ height: 380 }}>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              {locationName} 분포
            </h3>
            <RiskDistribution counts={riskSummary.counts} total={riskSummary.total} />
          </div>
          {/* 위험 학교 목록 */}
          <div className="col-span-4 bg-surface border border-border rounded-lg p-5 shadow-sm max-h-[380px] overflow-auto">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              {locationName} 위험도 상위 학교
            </h3>
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-border rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {topRiskSchools
                  .slice(0, 15)
                  .map((r) => (
                    <a
                      key={r.schoolCode}
                      href={`/report/${r.schoolCode}`}
                      className="block px-3 py-2 rounded hover:bg-background transition-colors"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{r.schoolName}</span>
                        <span
                          className={`font-semibold ml-2 shrink-0 ${
                            r.level === "danger"
                              ? "text-risk-danger"
                              : "text-risk-warning"
                          }`}
                        >
                          {r.score}점
                        </span>
                      </div>
                      {narratives[r.schoolCode] && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                          {narratives[r.schoolCode]}
                        </p>
                      )}
                    </a>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* 학교 목록 + 페이지네이션 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-semibold text-text-primary">
              {searchQuery
                ? `"${searchQuery}" 검색 결과 (${totalSchools}개)`
                : `${locationName} 학교 목록 (${totalSchools}개)`}
            </h2>
            {totalPages > 1 && (
              <p className="text-sm text-text-secondary">
                {currentPage} / {totalPages} 페이지
              </p>
            )}
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-border rounded-lg" />
              ))}
            </div>
          ) : schools.length === 0 ? (
            <p className="text-text-secondary">검색 결과가 없습니다.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schools.map((school) => (
                  <a
                    key={school.schoolCode}
                    href={`/report/${school.schoolCode}`}
                  >
                    <SchoolCard school={school} />
                  </a>
                ))}
              </div>

              {/* 페이지네이션 버튼 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium disabled:opacity-40 hover:bg-background transition-colors"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-background border-t border-border py-6 px-12 text-center">
        <p className="text-xs text-text-secondary">
          출처: 학교알리미(schoolinfo.go.kr), 나이스
          교육정보(open.neis.go.kr) | 공공누리 제1유형(출처표시) | 제8회 교육
          공공데이터 AI 활용대회
        </p>
      </footer>
    </div>
  );
}

/** 위험도 수준별 분포 — 도넛 차트 */
function RiskDistribution({
  counts,
  total,
}: {
  counts: { safe: number; caution: number; warning: number; danger: number };
  total: number;
}) {

  const levels = [
    { key: "danger", label: "위험", hex: "#EF4444", count: counts.danger },
    { key: "warning", label: "경고", hex: "#F97316", count: counts.warning },
    { key: "caution", label: "주의", hex: "#EAB308", count: counts.caution },
    { key: "safe", label: "안전", hex: "#22C55E", count: counts.safe },
  ];

  const analyzed = counts.safe + counts.caution + counts.warning + counts.danger;

  // 도넛 SVG 파라미터
  const size = 160;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const arcs = levels.map((l) => {
    const pct = analyzed > 0 ? l.count / analyzed : 0;
    const offset = accumulated;
    accumulated += pct;
    return { ...l, pct, offset };
  });

  const dangerPct = analyzed > 0 ? ((counts.danger + counts.warning) / analyzed * 100) : 0;

  return (
    <div className="flex flex-col items-center h-full">
      {/* 도넛 차트 */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 배경 원 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {/* 각 구간 */}
          {arcs.map((arc) => {
            if (arc.pct === 0) return null;
            return (
              <circle
                key={arc.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.hex}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc.pct * circumference} ${circumference}`}
                strokeDashoffset={-arc.offset * circumference}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary">{Math.round(dangerPct)}%</span>
          <span className="text-[10px] text-text-secondary">주의 이상</span>
        </div>
      </div>

      {/* 범례 */}
      <div className="w-full mt-5 space-y-2">
        {levels.map((l) => {
          const pct = analyzed > 0 ? ((l.count / analyzed) * 100).toFixed(1) : "0";
          return (
            <div key={l.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.hex }} />
                <span className="text-text-primary font-medium">{l.label}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-text-primary">{l.count}</span>
                <span className="text-text-secondary ml-1 text-xs">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 요약 */}
      <p className="text-xs text-text-secondary mt-auto pt-4">
        전체 {total}개 학교 중 분석 대상 {analyzed}개 기준
      </p>
    </div>
  );
}
