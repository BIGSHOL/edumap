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
} from "recharts";

interface TeacherStatsChartProps {
  studentsPerTeacher: number | null;
  tempTeacherRatio: number | null;
  totalTeachers: number | null;
  totalStudents: number | null;
}

export function TeacherStatsChart({
  studentsPerTeacher,
  tempTeacherRatio,
  totalTeachers,
  totalStudents,
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
  ];

  return (
    <div>
      <div className="flex gap-4 mb-4">
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
    </div>
  );
}
