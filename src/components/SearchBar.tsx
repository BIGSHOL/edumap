"use client";

import { useState, type KeyboardEvent, type ChangeEvent } from "react";

interface SearchBarProps {
  onSearch: (_query: string) => void;
}

/** 학교명 또는 지역명 검색 바 */
export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="flex w-full max-w-xl items-center gap-2">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="학교명 또는 지역명으로 검색"
        aria-label="학교명 또는 지역명 검색"
        className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm
          placeholder:text-text-secondary focus:border-primary focus:outline-none
          focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium
          text-white transition-colors hover:bg-primary-light focus:outline-none
          focus:ring-2 focus:ring-primary/50"
      >
        검색
      </button>
    </div>
  );
}
