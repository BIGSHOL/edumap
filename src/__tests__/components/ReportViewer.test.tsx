import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportViewer } from "@/components/report/ReportViewer";
import { mockReportContent } from "@/mocks/data/schools";

describe("ReportViewer", () => {
  it("리포트 내용이 렌더링된다", () => {
    render(
      <ReportViewer content={mockReportContent.policy} reportType="policy" loading={false} />
    );
    expect(screen.getByText(/교육 격차 현황 분석/)).toBeInTheDocument();
  });

  it("로딩 중일 때 로딩 표시가 나타난다", () => {
    render(<ReportViewer content="" reportType="policy" loading={true} />);
    expect(screen.getByText(/생성 중/)).toBeInTheDocument();
  });

  it("출처 표기가 포함된다", () => {
    render(
      <ReportViewer content={mockReportContent.policy} reportType="policy" loading={false} />
    );
    expect(screen.getAllByText(/출처/).length).toBeGreaterThanOrEqual(1);
  });

  it("리포트 유형에 따라 다른 라벨이 표시된다", () => {
    render(
      <ReportViewer content={mockReportContent.teacher} reportType="teacher" loading={false} />
    );
    expect(screen.getByText(/교사용/i)).toBeInTheDocument();
  });
});
