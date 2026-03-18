"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** 17개 시도 중심 좌표 */
const REGION_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  B10: { lat: 37.5665, lng: 126.978, name: "서울" },
  C10: { lat: 35.1796, lng: 129.0756, name: "부산" },
  D10: { lat: 35.8714, lng: 128.6014, name: "대구" },
  E10: { lat: 37.4563, lng: 126.7052, name: "인천" },
  F10: { lat: 35.1595, lng: 126.8526, name: "광주" },
  G10: { lat: 36.3504, lng: 127.3845, name: "대전" },
  H10: { lat: 35.5384, lng: 129.3114, name: "울산" },
  I10: { lat: 36.48, lng: 127.0, name: "세종" },
  J10: { lat: 37.275, lng: 127.0095, name: "경기" },
  K10: { lat: 37.8228, lng: 128.1555, name: "강원" },
  M10: { lat: 36.6357, lng: 127.4914, name: "충북" },
  N10: { lat: 36.5184, lng: 126.8, name: "충남" },
  P10: { lat: 35.82, lng: 127.105, name: "전북" },
  Q10: { lat: 34.8161, lng: 126.4629, name: "전남" },
  R10: { lat: 36.576, lng: 128.506, name: "경북" },
  S10: { lat: 35.2383, lng: 128.6925, name: "경남" },
  T10: { lat: 33.4996, lng: 126.5312, name: "제주" },
};

/** 위험도 수준별 색상 */
function getColor(avgScore: number): string {
  if (avgScore >= 71) return "#EF4444"; // danger
  if (avgScore >= 51) return "#F97316"; // warning
  if (avgScore >= 31) return "#EAB308"; // caution
  return "#22C55E"; // safe
}

interface RegionData {
  regionCode: string;
  avgScore: number;
  schoolCount: number;
}

interface RegionRiskMapProps {
  data: RegionData[];
  selectedRegion?: string;
  onRegionClick?: (_code: string) => void;
}

export function RegionRiskMap({ data, selectedRegion, onRegionClick }: RegionRiskMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // 기존 맵 제거
    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    // 선택된 지역으로 줌
    const selectedCoords = selectedRegion ? REGION_COORDS[selectedRegion] : null;
    const center: [number, number] = selectedCoords
      ? [selectedCoords.lat, selectedCoords.lng]
      : [36.0, 127.5];
    const zoom = selectedCoords ? 9 : 7;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // 한글 지도 타일 (Vworld 국토정보플랫폼)
    L.tileLayer("https://api.vworld.kr/req/wmts/1.0.0/3F833442-B21B-3A49-8F47-A795B95B5429/Base/{z}/{y}/{x}.png", {
      maxZoom: 18,
      minZoom: 6,
      attribution: "&copy; VWorld",
    }).addTo(map);

    // 시도별 원형 마커
    data.forEach((region) => {
      const coords = REGION_COORDS[region.regionCode];
      if (!coords) return;

      const color = getColor(region.avgScore);
      const isSelected = region.regionCode === selectedRegion;
      const radius = Math.max(15, Math.min(35, region.schoolCount / 15));

      const circle = L.circleMarker([coords.lat, coords.lng], {
        radius,
        color: isSelected ? "#1B3A5C" : color,
        fillColor: color,
        fillOpacity: isSelected ? 0.9 : 0.7,
        weight: isSelected ? 3 : 1.5,
      }).addTo(map);

      // 툴팁
      circle.bindTooltip(
        `<div style="text-align:center;font-family:Pretendard,sans-serif">
          <b>${coords.name}</b><br/>
          <span style="font-size:16px;font-weight:bold;color:${color}">${region.avgScore}점</span><br/>
          <span style="font-size:11px;color:#6B7280">${region.schoolCount}개교</span>
        </div>`,
        { direction: "top", offset: [0, -radius] }
      );

      // 클릭 이벤트
      if (onRegionClick) {
        circle.on("click", () => onRegionClick(region.regionCode));
        (circle.getElement() as HTMLElement | null)?.style.setProperty("cursor", "pointer");
      }
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [data, selectedRegion, onRegionClick]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
}
