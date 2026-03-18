"use client";

import ReactMarkdown from "react-markdown";

/**
 * AI 생성 마크다운 텍스트 렌더러
 * 프로젝트 디자인 시스템에 맞는 스타일 적용
 */
export function AiMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-text-primary mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold text-text-primary mt-4 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-text-primary mt-3 mb-1">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-text-primary mt-2 mb-1">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-sm text-text-primary leading-relaxed mb-2">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-sm text-text-primary space-y-1 mb-2 ml-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-sm text-text-primary space-y-1 mb-2 ml-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-text-primary">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-primary/30 pl-3 my-2 text-sm text-text-secondary italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-background">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left px-3 py-2 text-xs font-semibold text-text-secondary border-b border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm text-text-primary border-b border-border">{children}</td>
        ),
        hr: () => <hr className="border-border my-4" />,
        code: ({ children }) => (
          <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono text-primary">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
