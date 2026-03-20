"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/early-alert", label: "조기경보" },
  { href: "/gapmap", label: "학습자원 공백" },
];

export function Header() {
  const pathname = usePathname();

  // /report/xxx 페이지는 별도 active 처리 없음
  const isReportPage = pathname.startsWith("/report/");

  return (
    <header className="bg-primary text-white h-16 flex items-center px-12">
      <Link href="/" className="text-xl font-bold hover:text-white/90 transition-colors">
        에듀맵 EduMap
      </Link>
      <p className="ml-4 text-sm text-white/70">교육 데이터 AI 분석 플랫폼</p>

      <nav className="ml-auto flex items-center gap-6 text-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = !isReportPage && pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "text-white font-medium"
                  : "text-white/70 hover:text-white transition-colors"
              }
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* 리포트 페이지에서 뒤로가기 */}
      {isReportPage && (
        <button
          onClick={() => window.history.back()}
          className="ml-6 text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1"
        >
          <span>&larr;</span> 뒤로가기
        </button>
      )}
    </header>
  );
}
