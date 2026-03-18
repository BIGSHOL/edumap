"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FinanceChartProps {
  totalBudget: number | null;
  educationBudget: number | null;
  budgetPerStudent: number | null;
}

function formatWon(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
}

export function FinanceChart({
  totalBudget,
  educationBudget,
  budgetPerStudent,
}: FinanceChartProps) {
  const budgetData = [
    {
      name: "세입결산총액",
      value: totalBudget ?? 0,
    },
    {
      name: "교육활동비",
      value: educationBudget ?? 0,
    },
  ];

  return (
    <div>
      {/* 학생 1인당 교육비 강조 */}
      <div className="bg-primary-lighter/50 rounded-lg px-4 py-2 mb-4 inline-block">
        <p className="text-xs text-text-secondary">학생 1인당 교육비</p>
        <p className="text-lg font-bold text-primary">
          {budgetPerStudent != null ? `${Math.round(budgetPerStudent).toLocaleString()}원` : "—"}
        </p>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={budgetData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickLine={false}
              tickFormatter={(v: number) => formatWon(v)}
            />
            <Tooltip
              formatter={(value) => [`${formatWon(Number(value))}원`, "금액"]}
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="value" fill="#2E7D32" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
