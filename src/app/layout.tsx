import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "에듀맵 (EduMap) — 교육 데이터 AI 분석 플랫폼",
  description:
    "교육 공공데이터를 AI로 분석하여 학습격차를 조기 탐지하고, 누구나 이해할 수 있는 인사이트 리포트를 자동 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
