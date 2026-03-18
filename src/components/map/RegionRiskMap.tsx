"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DISTRICT_COORDS } from "@/lib/constants/district-coords";
import { REGIONS } from "@/lib/constants/regions";

/** 위험도 수준별 색상 */
function getColor(avgScore: number): string {
  if (avgScore >= 71) return "#EF4444"; // danger
  if (avgScore >= 51) return "#F97316"; // warning
  if (avgScore >= 31) return "#EAB308"; // caution
  return "#22C55E"; // safe
}

/** district 풀네임에서 시군구명 추출 ("서울특별시 강남구" → "강남구") */
function shortDistrict(district: string): string {
  const parts = district.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : district;
}

interface DistrictData {
  regionCode: string;
  district: string;
  avgScore: number;
  schoolCount: number;
}

interface RegionRiskMapProps {
  data: DistrictData[];
  selectedRegion?: string;
  selectedDistrict?: string;
  onRegionClick?: (_code: string) => void;
}

export function RegionRiskMap({ data, selectedRegion, selectedDistrict, onRegionClick }: RegionRiskMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    // 시군구 선택 시 해당 좌표로 줌인, 시도만 선택 시 시도 중심, 없으면 전국
    const districtCoord = selectedDistrict ? DISTRICT_COORDS[selectedDistrict] : null;
    const regionCoord = REGION_CENTER[selectedRegion ?? ""];
    const center: [number, number] = districtCoord
      ? [districtCoord.lat, districtCoord.lng]
      : regionCoord
        ? [regionCoord.lat, regionCoord.lng]
        : [36.0, 127.5];
    const zoom = districtCoord ? 12 : selectedRegion ? 9 : 7;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 14,
      minZoom: 6,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    // 시군구별 원형 마커
    const filteredData = selectedRegion
      ? data.filter((d) => d.regionCode === selectedRegion)
      : data;

    filteredData.forEach((d) => {
      const coords = DISTRICT_COORDS[d.district];
      if (!coords) return;

      const color = getColor(d.avgScore);
      const radius = Math.max(6, Math.min(20, d.schoolCount / 3));
      const name = shortDistrict(d.district);

      const circle = L.circleMarker([coords.lat, coords.lng], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 1.5,
      }).addTo(map);

      circle.bindTooltip(
        `<div style="text-align:center;font-family:Pretendard,sans-serif">
          <b>${name}</b><br/>
          <span style="font-size:14px;font-weight:bold;color:${color}">${d.avgScore}점</span><br/>
          <span style="font-size:11px;color:#6B7280">${d.schoolCount}개교</span>
        </div>`,
        { direction: "top", offset: [0, -radius] }
      );

      if (onRegionClick) {
        circle.on("click", () => onRegionClick(d.regionCode));
        (circle.getElement() as HTMLElement | null)?.style.setProperty("cursor", "pointer");
      }
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [data, selectedRegion, selectedDistrict, onRegionClick]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
}

/** 시도 중심 좌표 (줌 용도) */
const REGION_CENTER: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  REGIONS.map((r) => {
    const centers: Record<string, { lat: number; lng: number }> = {
      B10: { lat: 37.5665, lng: 126.978 },
      C10: { lat: 35.1796, lng: 129.0756 },
      D10: { lat: 35.8714, lng: 128.6014 },
      E10: { lat: 37.4563, lng: 126.7052 },
      F10: { lat: 35.1595, lng: 126.8526 },
      G10: { lat: 36.3504, lng: 127.3845 },
      H10: { lat: 35.5384, lng: 129.3114 },
      I10: { lat: 36.48, lng: 127.0 },
      J10: { lat: 37.275, lng: 127.0095 },
      K10: { lat: 37.8228, lng: 128.1555 },
      M10: { lat: 36.6357, lng: 127.4914 },
      N10: { lat: 36.5184, lng: 126.8 },
      P10: { lat: 35.82, lng: 127.105 },
      Q10: { lat: 34.8161, lng: 126.4629 },
      R10: { lat: 36.576, lng: 128.506 },
      S10: { lat: 35.2383, lng: 128.6925 },
      T10: { lat: 33.4996, lng: 126.5312 },
    };
    return [r.code, centers[r.code]];
  })
);
