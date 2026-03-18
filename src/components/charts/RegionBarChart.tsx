"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RiskItem {
  schoolCode: string;
  schoolName: string;
  score: number;
  level: "safe" | "caution" | "warning" | "danger";
}

interface RegionBarChartProps {
  data: RiskItem[];
}

const LEVEL_COLORS: Record<string, string> = {
  safe: "#22C55E",
  caution: "#EAB308",
  warning: "#F97316",
  danger: "#EF4444",
};

export function RegionBarChart({ data }: RegionBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary text-sm">데이터가 없습니다.</p>
      </div>
    );
  }

  const chartData = data
    .sort((a, b) => b.score - a.score)
    .map((d) => ({
      name: d.schoolName.length > 8 ? d.schoolName.slice(0, 8) + "…" : d.schoolName,
      score: d.score,
      level: d.level,
      fullName: d.schoolName,
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6B7280" }}
          tickLine={false}
          axisLine={{ stroke: "#E5E7EB" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#6B7280" }}
          tickLine={false}
          axisLine={{ stroke: "#E5E7EB" }}
          label={{ value: "위험도", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6B7280" }}
        />
        <Tooltip
          formatter={(value) => [`${value}점`, "위험도"]}
          labelFormatter={(_label, payload) => {
            const entry = payload?.[0]?.payload as { fullName?: string } | undefined;
            return entry?.fullName ?? String(_label);
          }}
          contentStyle={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={LEVEL_COLORS[entry.level] ?? "#6B7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
