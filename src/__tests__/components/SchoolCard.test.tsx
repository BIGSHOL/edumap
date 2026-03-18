import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchoolCard } from "@/components/SchoolCard";
import { mockSchools } from "@/mocks/data/schools";

describe("SchoolCard", () => {
  const school = mockSchools[0];

  it("학교명이 표시된다", () => {
    render(<SchoolCard school={school} />);
    expect(screen.getByText(school.schoolName)).toBeInTheDocument();
  });

  it("학교급이 표시된다", () => {
    render(<SchoolCard school={school} />);
    expect(screen.getAllByText(/초등학교/).length).toBeGreaterThanOrEqual(1);
  });

  it("지역 정보가 표시된다", () => {
    render(<SchoolCard school={school} />);
    expect(screen.getAllByText(/종로구/).length).toBeGreaterThanOrEqual(1);
  });
});
