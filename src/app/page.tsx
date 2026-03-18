"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SchoolCard } from "@/components/SchoolCard";
import { Header } from "@/components/Header";
import { RegionRiskMapDynamic } from "@/components/map/RegionRiskMapDynamic";
import type { SchoolItem } from "@/lib/api/contracts/schools";

interface RegionSummary {
  regionCode: string;
  avgScore: number;
  schoolCount: number;
}

const REGIONS = [
  { code: "", name: "전체" },
  { code: "B10", name: "서울" },
  { code: "C10", name: "부산" },
  { code: "D10", name: "대구" },
  { code: "E10", name: "인천" },
  { code: "F10", name: "광주" },
  { code: "G10", name: "대전" },
  { code: "H10", name: "울산" },
  { code: "J10", name: "경기" },
  { code: "K10", name: "강원" },
  { code: "M10", name: "충북" },
  { code: "N10", name: "충남" },
  { code: "P10", name: "전북" },
  { code: "Q10", name: "전남" },
  { code: "R10", name: "경북" },
  { code: "S10", name: "경남" },
  { code: "T10", name: "제주" },
];

const PAGE_SIZE = 30;

export default function Home() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [riskData, setRiskData] = useState<
    Array<{
      schoolCode: string;
      schoolName: string;
      score: number;
      level: "safe" | "caution" | "warning" | "danger";
    }>
  >([]);
  const [riskSummary, setRiskSummary] = useState({
    total: 0,
    danger: 0,
    avgScore: 0,
  });
  const [selectedRegion, setSelectedRegion] = useState("B10");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState<Array<{ district: string; schoolCount: number }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionMapData, setRegionMapData] = useState<RegionSummary[]>([]);
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

  // 시군구 선택 시: 학교 목록 기준으로 위험도 데이터 필터
  const schoolCodesSet = new Set(schools.map((s) => s.schoolCode));
  const filteredRiskData = selectedDistrict
    ? riskData.filter((r) => schoolCodesSet.has(r.schoolCode))
    : riskData;
  const displaySummary = selectedDistrict
    ? {
        total: totalSchools,
        danger: filteredRiskData.filter((s) => s.level === "danger" || s.level === "warning").length,
        avgScore: filteredRiskData.length > 0
          ? Math.round(filteredRiskData.reduce((sum, s) => sum + s.score, 0) / filteredRiskData.length)
          : 0,
      }
    : riskSummary;

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
          setTotalSchools(body.meta?.total ?? body.data.length);
        }
      } catch {
        console.error("학교 목록 로딩 실패");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 위험도 데이터 로드 (지역 변경 시만)
  const loadRiskData = useCallback(async (region: string) => {
    try {
      const regionParam = region ? `region=${region}&` : "";
      const res = await fetch(
        `/api/early-alert?${regionParam}limit=500`
      );
      const body = await res.json();
      if (res.ok && Array.isArray(body.data)) {
        const scores = body.data;
        setRiskData(scores);
        const dangerCount = scores.filter(
          (s: { level: string }) =>
            s.level === "danger" || s.level === "warning"
        ).length;
        const avg =
          scores.length > 0
            ? Math.round(
                scores.reduce(
                  (sum: number, s: { score: number }) => sum + s.score,
                  0
                ) / scores.length
              )
            : 0;
        setRiskSummary({
          total: body.meta?.total ?? scores.length,
          danger: dangerCount,
          avgScore: avg,
        });
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
    loadRiskData(selectedRegion);
  }, [selectedRegion, selectedDistrict, loadSchools, loadRiskData]);

  // 페이지 변경
  useEffect(() => {
    loadSchools(selectedRegion, currentPage, {
      search: searchQuery || undefined,
      district: selectedDistrict || undefined,
    });
  }, [currentPage, selectedRegion, selectedDistrict, searchQuery, loadSchools]);

  // 검색
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    loadSchools(selectedRegion, 1, {
      search: query || undefined,
      district: selectedDistrict || undefined,
    });
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
              <option value="">전체 ({regionName})</option>
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
              {loading ? "—" : displaySummary.total}
              <span className="text-sm font-normal text-text-secondary ml-1">
                개교
              </span>
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <p className="text-text-secondary text-sm">주의 이상 학교</p>
            <p className="text-3xl font-bold mt-1 text-risk-danger">
              {loading ? "—" : displaySummary.danger}
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
              {loading ? "—" : displaySummary.avgScore}
              <span className="text-sm font-normal text-text-secondary ml-1">
                점
              </span>
            </p>
          </div>
        </section>

        {/* 전국 시도별 지도 + 위험도 분포 + 위험 학교 목록 */}
        <section className="grid grid-cols-5 gap-6 mb-8">
          {/* 시도별 위험도 지도 */}
          <div className="col-span-2 bg-surface border border-border rounded-lg shadow-sm overflow-hidden" style={{ height: 360 }}>
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-text-primary">전국 시도별 위험도</h3>
              <p className="text-xs text-text-secondary mt-0.5">원 크기 = 학교 수, 색상 = 평균 위험도</p>
            </div>
            <div style={{ height: 300 }}>
              <RegionRiskMapDynamic
                data={regionMapData}
                selectedRegion={selectedRegion}
                onRegionClick={(code) => setSelectedRegion(code)}
              />
            </div>
          </div>
          {/* 선택 지역 위험도 수준별 분포 */}
          <div className="col-span-1 bg-surface border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              {locationName} 분포
            </h3>
            <RiskDistribution data={filteredRiskData} total={displaySummary.total} />
          </div>
          {/* 위험 학교 목록 */}
          <div className="col-span-2 bg-surface border border-border rounded-lg p-5 shadow-sm max-h-[360px] overflow-auto">
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
              <div className="space-y-1.5">
                {riskData
                  .filter((r) => {
                    if (r.level !== "danger" && r.level !== "warning") return false;
                    // 시군구 선택 시 해당 구 학교만
                    if (selectedDistrict) {
                      const schoolCodes = new Set(schools.map((s) => s.schoolCode));
                      return schoolCodes.has(r.schoolCode);
                    }
                    return true;
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 20)
                  .map((r) => (
                    <a
                      key={r.schoolCode}
                      href={`/report/${r.schoolCode}`}
                      className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-background transition-colors text-sm"
                    >
                      <span className="truncate">{r.schoolName}</span>
                      <span
                        className={`font-semibold ml-2 ${
                          r.level === "danger"
                            ? "text-risk-danger"
                            : "text-risk-warning"
                        }`}
                      >
                        {r.score}점
                      </span>
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

/** 위험도 수준별 분포 시각화 */
function RiskDistribution({
  data,
  total,
}: {
  data: Array<{ level: "safe" | "caution" | "warning" | "danger" }>;
  total: number;
}) {
  const counts = {
    safe: data.filter((d) => d.level === "safe").length,
    caution: data.filter((d) => d.level === "caution").length,
    warning: data.filter((d) => d.level === "warning").length,
    danger: data.filter((d) => d.level === "danger").length,
  };

  const levels = [
    { key: "safe", label: "안전", color: "bg-risk-safe", count: counts.safe },
    { key: "caution", label: "주의", color: "bg-risk-caution", count: counts.caution },
    { key: "warning", label: "경고", color: "bg-risk-warning", count: counts.warning },
    { key: "danger", label: "위험", color: "bg-risk-danger", count: counts.danger },
  ];

  return (
    <div className="space-y-5">
      {/* 수평 누적 바 */}
      <div className="w-full h-8 rounded-lg overflow-hidden flex">
        {levels.map((l) => {
          const pct = total > 0 ? (l.count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={l.key}
              className={`${l.color} h-full flex items-center justify-center text-white text-xs font-semibold transition-all`}
              style={{ width: `${pct}%` }}
            >
              {pct >= 8 ? `${Math.round(pct)}%` : ""}
            </div>
          );
        })}
      </div>

      {/* 수준별 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {levels.map((l) => {
          const pct = total > 0 ? ((l.count / total) * 100).toFixed(1) : "0";
          return (
            <div key={l.key} className="flex items-center gap-3 p-3 rounded-lg bg-background">
              <div className={`w-3 h-3 rounded-full ${l.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{l.label}</p>
                <p className="text-xs text-text-secondary">{l.count}개교 ({pct}%)</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-secondary">
        전체 {total}개 학교 중 분석 대상 {data.length}개 기준
      </p>
    </div>
  );
}
