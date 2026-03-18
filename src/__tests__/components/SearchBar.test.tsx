import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "@/components/SearchBar";

describe("SearchBar", () => {
  it("검색 입력 필드가 렌더링된다", () => {
    render(<SearchBar onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/학교명/i)).toBeInTheDocument();
  });

  it("검색어 입력 시 onSearch가 호출된다", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/학교명/i);
    await user.type(input, "서울");
    await user.keyboard("{Enter}");

    expect(onSearch).toHaveBeenCalledWith("서울");
  });

  it("검색 버튼이 존재한다", () => {
    render(<SearchBar onSearch={() => {}} />);
    expect(screen.getByRole("button", { name: /검색/i })).toBeInTheDocument();
  });
});
