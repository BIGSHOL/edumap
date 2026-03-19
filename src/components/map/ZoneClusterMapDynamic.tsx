"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet은 window/document에 의존하므로 SSR에서 제외.
 * 이 wrapper를 import하면 자동으로 dynamic + ssr:false 처리됨.
 */
export const ZoneClusterMapDynamic = dynamic(
  () => import("./ZoneClusterMap").then((mod) => mod.ZoneClusterMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-background rounded-lg">
        <p className="text-text-secondary text-sm">학구 지도 로딩 중...</p>
      </div>
    ),
  }
);
