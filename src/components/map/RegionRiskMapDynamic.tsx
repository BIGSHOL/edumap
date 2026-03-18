"use client";

import dynamic from "next/dynamic";

export const RegionRiskMapDynamic = dynamic(
  () => import("./RegionRiskMap").then((mod) => mod.RegionRiskMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-background rounded-lg animate-pulse" /> }
);
