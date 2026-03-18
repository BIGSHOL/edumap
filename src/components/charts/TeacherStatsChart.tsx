"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface TeacherStatsChartProps {
  studentsPerTeacher: number | null;
  tempTeacherRatio: number | null;
  totalTeachers: number | null;
  totalStudents: number | null;
  femaleTeachers?: number | null;
  maleTeachers?: number | null;
  lecturerCount?: number | null;
  currentClasses?: number | null;
  authorizedClasses?: number | null;
}

export function TeacherStatsChart({
  studentsPerTeacher,
  tempTeacherRatio,
  totalTeachers,
  totalStudents,
  femaleTeachers,
  maleTeachers,
  lecturerCount,
  currentClasses,
  authorizedClasses,
}: TeacherStatsChartProps) {
  const data = [
    {
      name: "교원 1인당\n학생 수",
      value: studentsPerTeacher ?? 0,
      unit: "명",
      average: 16,
    },
    {
      name: "기간제\n교원 비율",
      value: tempTeacherRatio != null ? Math.round(tempTeacherRatio * 100) : 0,
      unit: "%",
      average: 10,
    },
  ];

  const summaryData = [
    { label: "전체 교원", value: totalTeachers ?? "—", unit: "명" },
    { label: "전체 학생", value: totalStudents ?? "—", unit: "명" },
    ...(lecturerCount != null ? [{ label: "강사", value: lecturerCount, unit: "명" }] : []),
  ];

  // 교원 성비 데이터
  const hasGenderData = femaleTeachers != null && maleTeachers != null;
  const genderData = hasGenderData
    ? [{ name: "교원 성비", female: femaleTeachers, male: maleTeachers }]
    : null;

  // 학급 과밀도 데이터
  const hasClassData = currentClasses != null && currentClasses > 0;
  const classUtilization = hasClassData && authorizedClasses && authorizedClasses > 0
    ? Math.round((currentClasses / authorizedClasses) * 100)
    : null;
  const studentsPerClass = hasClassData && totalStudents
    ? (totalStudents / currentClasses!).toFixed(1)
    : null;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        {summaryData.map((item) => (
          <div key={item.label} className="bg-primary-lighter/50 rounded-lg px-4 py-2">
            <p className="text-xs text-text-secondary">{item.label}</p>
            <p className="text-lg font-bold text-primary">
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              <span className="text-xs font-normal ml-0.5">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickLine={false}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} />
            <Tooltip
              formatter={(value, _name, props) => {
                const entry = props?.payload as { unit?: string } | undefined;
                return [`${value}${entry?.unit ?? ""}`, "현재 값"];
              }}
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <ReferenceLine y={16} stroke="#2D5F8A" strokeDasharray="3 3" label={{ value: "전국 평균", fontSize: 10, fill: "#2D5F8A" }} />
            <Bar dataKey="value" fill="#1B3A5C" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 교원 성비 바 */}
      {genderData && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-text-secondary mb-2">교원 성비</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genderData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "13px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="female" name="여교원" fill="#EC4899" radius={[0, 4, 4, 0]} maxBarSize={24} />
                <Bar dataKey="male" name="남교원" fill="#3B82F6" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 학급 과밀도 게이지 */}
      {hasClassData && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-text-secondary mb-2">학급 현황</p>
          <div className="flex gap-4">
            <div className="bg-primary-lighter/50 rounded-lg px-3 py-2 flex-1">
              <p className="text-xs text-text-secondary">현재 학급</p>
              <p className="text-base font-bold text-primary">{currentClasses}<span className="text-xs font-normal ml-0.5">개</span></p>
            </div>
            {authorizedClasses != null && (
              <div className="bg-primary-lighter/50 rounded-lg px-3 py-2 flex-1">
                <p className="text-xs text-text-secondary">인가 학급</p>
                <p className="text-base font-bold text-primary">{authorizedClasses}<span className="text-xs font-normal ml-0.5">개</span></p>
              </div>
            )}
            {studentsPerClass && (
              <div className="bg-primary-lighter/50 rounded-lg px-3 py-2 flex-1">
                <p className="text-xs text-text-secondary">학급당 학생</p>
                <p className="text-base font-bold text-primary">{studentsPerClass}<span className="text-xs font-normal ml-0.5">명</span></p>
              </div>
            )}
          </div>
          {classUtilization != null && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>학급 활용률</span>
                <span>{classUtilization}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${classUtilization > 100 ? "bg-risk-warning" : classUtilization > 90 ? "bg-risk-caution" : "bg-risk-safe"}`}
                  style={{ width: `${Math.min(classUtilization, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
