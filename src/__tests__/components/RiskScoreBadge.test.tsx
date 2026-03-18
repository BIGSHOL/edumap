import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";

describe("RiskScoreBadge", () => {
  it("스코어 숫자가 표시된다", () => {
    render(<RiskScoreBadge score={72} />);
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("위험 수준 라벨이 표시된다 (danger)", () => {
    render(<RiskScoreBadge score={72} />);
    expect(screen.getByText(/위험/)).toBeInTheDocument();
  });

  it("안전 수준이 올바르게 표시된다", () => {
    render(<RiskScoreBadge score={20} />);
    expect(screen.getByText(/안전/)).toBeInTheDocument();
  });

  it("주의 수준이 올바르게 표시된다", () => {
    render(<RiskScoreBadge score={40} />);
    expect(screen.getByText(/주의/)).toBeInTheDocument();
  });

  it("경고 수준이 올바르게 표시된다", () => {
    render(<RiskScoreBadge score={60} />);
    expect(screen.getByText(/경고/)).toBeInTheDocument();
  });

  it("프로그레스 바가 존재한다", () => {
    render(<RiskScoreBadge score={72} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
