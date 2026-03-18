"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { ReportType } from "@/types/report";
import type { SchoolDetail } from "@/lib/api/contracts/schools";
import { TeacherStatsChart } from "@/components/charts/TeacherStatsChart";
import { FinanceChart } from "@/components/charts/FinanceChart";
import { Header } from "@/components/Header";
import { AiMarkdown } from "@/components/AiMarkdown";

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  policy: "정책담당자용",
  teacher: "교사용",
  parent: "학부모용",
};

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  elementary: "초등학교",
  middle: "중학교",
  high: "고등학교",
};

export default function SchoolReportPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [selectedType, setSelectedType] = useState<ReportType>("policy");
  const [reportContent, setReportContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [comparison, setComparison] = useState("");

  useEffect(() => {
    async function fetchSchool() {
      try {
        const res = await fetch(`/api/schools/${schoolCode}`);
        const body = await res.json();
        if (res.ok) {
          setSchool(body.data);
          // 비교 문장 가져오기 (Flash-Lite, 캐시됨)
          fetch(`/api/ai-insight?type=comparison&schoolCode=${schoolCode}&region=${body.data.regionCode}`)
            .then((r) => r.json())
            .then((b) => { if (b.data?.[schoolCode]) setComparison(b.data[schoolCode]); })
            .catch(() => {});
        }
      } catch {
        console.error("학교 정보 조회 실패");
      } finally {
        setSchoolLoading(false);
      }
    }
    fetchSchool();
  }, [schoolCode]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setReportContent("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolCode, reportType: selectedType }),
      });
      const body = await res.json();
      if (res.ok) {
        setReportContent(body.data.reportContent);
      }
    } catch {
      setReportContent("리포트 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [schoolCode, selectedType]);

  if (schoolLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-[1280px] mx-auto px-12 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-border rounded w-1/3" />
            <div className="h-5 bg-border rounded w-1/2" />
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-border rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-[1280px] mx-auto px-12 py-8">
          <div className="bg-surface border border-border rounded-lg p-12 text-center">
            <p className="text-2xl font-bold text-text-primary mb-2">학교를 찾을 수 없습니다</p>
            <p className="text-text-secondary mb-6">학교 코드: {schoolCode}</p>
            <a href="/" className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
              대시보드로 돌아가기
            </a>
          </div>
        </main>
      </div>
    );
  }

  const spt = school.teacherStats?.studentsPerTeacher;
  const tempRatio = school.teacherStats?.tempTeacherRatio;
  const programCount = school.afterschoolPrograms.length;

  // 간단 위험도 표시
  const riskLevel =
    (spt && spt > 22) || (tempRatio && tempRatio > 0.3)
      ? "warning"
      : (spt && spt > 18) || (tempRatio && tempRatio > 0.2)
        ? "caution"
        : "safe";
  const riskColors = {
    safe: "bg-risk-safe/10 text-risk-safe border-risk-safe/20",
    caution: "bg-risk-caution/10 text-risk-caution border-risk-caution/20",
    warning: "bg-risk-warning/10 text-risk-warning border-risk-warning/20",
  };
  const riskLabels = { safe: "양호", caution: "주의", warning: "경고" };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* 히어로 섹션 — 학교 기본 정보 */}
      <div className="bg-primary text-white">
        <div className="max-w-[1280px] mx-auto px-12 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-bold">{school.schoolName}</h1>
              <p className="text-white/70 mt-2 text-sm">
                {SCHOOL_TYPE_LABELS[school.schoolType]} &middot; {school.district}
                {school.address && ` &middot; ${school.address}`}
              </p>
              {/* 학교 프로필 확장 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/60">
                {school.foundationType && <span>설립: {school.foundationType}</span>}
                {school.foundationDate && <span>설립일: {school.foundationDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3")}</span>}
                {school.coeducationType && <span>{school.coeducationType}</span>}
                {school.highSchoolType && school.highSchoolType !== "해당없음" && <span>유형: {school.highSchoolType}</span>}
                {school.dayNightType && school.dayNightType !== "해당없음" && <span>{school.dayNightType}</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-white/50">
                <span>학교 코드: {school.schoolCode}</span>
                {school.phoneNumber && <span>TEL: {school.phoneNumber}</span>}
                {school.homepageUrl && (
                  <a href={school.homepageUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">
                    홈페이지
                  </a>
                )}
              </div>
              {comparison && (
                <p className="text-white/80 text-sm mt-2 bg-white/10 rounded-lg px-3 py-2">
                  <span className="text-white/50 mr-1">AI</span> {comparison}
                </p>
              )}
            </div>
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${riskColors[riskLevel]}`}>
              교육환경 {riskLabels[riskLevel]}
            </span>
          </div>

          {/* 핵심 지표 카드 */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-white/60 text-xs">교원 1인당 학생 수</p>
              <p className="text-2xl font-bold mt-1">
                {spt ?? "—"}<span className="text-sm font-normal text-white/60 ml-1">명</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-white/60 text-xs">기간제 교원 비율</p>
              <p className="text-2xl font-bold mt-1">
                {tempRatio != null ? `${(tempRatio * 100).toFixed(1)}` : "—"}
                <span className="text-sm font-normal text-white/60 ml-1">%</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-white/60 text-xs">전체 교원</p>
              <p className="text-2xl font-bold mt-1">
                {school.teacherStats?.totalTeachers ?? "—"}
                <span className="text-sm font-normal text-white/60 ml-1">명</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <p className="text-white/60 text-xs">방과후 프로그램</p>
              <p className="text-2xl font-bold mt-1">
                {programCount}<span className="text-sm font-normal text-white/60 ml-1">개</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-12 py-8">
        {/* 차트 섹션 — 가로 꽉 채움 */}
        <section className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-text-primary mb-4">교원 현황</h3>
            <TeacherStatsChart
              studentsPerTeacher={spt ?? null}
              tempTeacherRatio={tempRatio ?? null}
              totalTeachers={school.teacherStats?.totalTeachers ?? null}
              totalStudents={school.teacherStats?.totalStudents ?? null}
              femaleTeachers={school.teacherStats?.femaleTeachers ?? null}
              maleTeachers={school.teacherStats?.maleTeachers ?? null}
              lecturerCount={school.teacherStats?.lecturerCount ?? null}
              currentClasses={school.teacherStats?.currentClasses ?? null}
              authorizedClasses={school.teacherStats?.authorizedClasses ?? null}
            />
            <p className="text-xs text-text-secondary mt-3">
              출처: 학교알리미 ({school.teacherStats?.year ?? 2024}년 기준)
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-text-primary mb-4">재정 현황</h3>
            <FinanceChart
              totalBudget={school.financeStats?.totalBudget ?? null}
              educationBudget={school.financeStats?.educationBudget ?? null}
              budgetPerStudent={school.financeStats?.budgetPerStudent ?? null}
            />
            <p className="text-xs text-text-secondary mt-3">
              출처: 학교알리미 ({school.financeStats?.year ?? 2024}년 기준)
            </p>
          </div>
        </section>

        {/* 방과후 프로그램 + AI 리포트 — 2열 레이아웃 */}
        <section className="grid grid-cols-5 gap-6 mb-8">
          {/* 좌측: 방과후 프로그램 */}
          <div className="col-span-2">
            <h2 className="text-lg font-semibold text-text-primary mb-4">방과후 프로그램</h2>
            {programCount > 0 ? (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-background">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">프로그램명</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">수강 인원</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">교과 수강</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">특기적성 수강</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">분류</th>
                    </tr>
                  </thead>
                  <tbody>
                    {school.afterschoolPrograms.map((p, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-3 text-sm">{p.subject}</td>
                        <td className="px-4 py-3 text-sm">{p.enrollment ?? "—"}명</td>
                        <td className="px-4 py-3 text-sm">{p.academicEnrollment != null ? `${p.academicEnrollment}명` : "—"}</td>
                        <td className="px-4 py-3 text-sm">{p.extracurricularEnrollment != null ? `${p.extracurricularEnrollment}명` : "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary-lighter text-primary font-medium">
                            {p.category === "academic" ? "교과" : p.category === "extracurricular" ? "특기적성" : p.category ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-text-secondary px-4 py-2 border-t border-border bg-background">
                  출처: 학교알리미 ({school.teacherStats?.year ?? 2024}년 기준)
                </p>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-lg p-8 text-center">
                <p className="text-text-secondary text-sm">등록된 방과후 프로그램이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 우측: AI 리포트 */}
          <div className="col-span-3">
            <h2 className="text-lg font-semibold text-text-primary mb-4">AI 인사이트 리포트</h2>
            <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
              {/* 리포트 유형 선택 + 생성 버튼 */}
              <div className="flex items-center gap-3 mb-6">
                {(["policy", "teacher", "parent"] as ReportType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedType === type
                        ? "bg-primary text-white"
                        : "border border-border text-text-primary hover:bg-primary-lighter"
                    }`}
                  >
                    {REPORT_TYPE_LABELS[type]}
                  </button>
                ))}
                <button
                  onClick={generateReport}
                  disabled={loading}
                  className="ml-auto bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 transition-colors"
                >
                  {loading ? "생성 중..." : "리포트 생성"}
                </button>
              </div>

              {/* 리포트 결과 */}
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-border rounded w-2/3" />
                  <div className="h-4 bg-border rounded w-full" />
                  <div className="h-4 bg-border rounded w-5/6" />
                  <div className="h-4 bg-border rounded w-4/5" />
                  <div className="h-4 bg-border rounded w-full" />
                  <p className="text-text-secondary text-sm mt-4">AI가 리포트를 생성하고 있습니다...</p>
                </div>
              ) : reportContent ? (
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary-lighter text-primary mb-4">
                    {REPORT_TYPE_LABELS[selectedType]}
                  </span>
                  <div>
                    <AiMarkdown content={reportContent} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary text-sm">
                    대상 유형을 선택하고 &ldquo;리포트 생성&rdquo; 버튼을 눌러주세요.
                  </p>
                  <p className="text-text-secondary text-xs mt-1">
                    AI가 {school.schoolName}의 교육 환경을 분석하여 맞춤 리포트를 생성합니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-background border-t border-border py-6 px-12 text-center">
        <p className="text-xs text-text-secondary">
          출처: 학교알리미(schoolinfo.go.kr), 나이스 교육정보(open.neis.go.kr) |
          공공누리 제1유형(출처표시) | 제8회 교육 공공데이터 AI 활용대회
        </p>
      </footer>
    </div>
  );
}
