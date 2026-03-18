"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SchoolMarker {
  schoolCode: string;
  schoolName: string;
  latitude: number | null;
  longitude: number | null;
  district: string;
  score?: number;
  level?: "safe" | "caution" | "warning" | "danger";
}

interface SchoolMapProps {
  schools: SchoolMarker[];
  center?: [number, number];
  zoom?: number;
  onSchoolClick?: (_schoolCode: string) => void;
}

/** Leaflet은 Tailwind 클래스를 사용할 수 없으므로 디자인 시스템 색상을 상수로 정의 */
const PRIMARY_COLOR = "#1B3A5C";

const LEVEL_COLORS: Record<string, string> = {
  safe: "#22C55E",
  caution: "#EAB308",
  warning: "#F97316",
  danger: "#EF4444",
};

export function SchoolMap({
  schools,
  center = [36.5, 127.5],
  zoom = 7,
  onSchoolClick,
}: SchoolMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 기존 마커 제거
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // 유효 좌표 학교 필터
    const validSchools = schools.filter(
      (s) => s.latitude != null && s.longitude != null
    );

    validSchools.forEach((school) => {
      const color = school.level ? LEVEL_COLORS[school.level] : PRIMARY_COLOR;
      const radius = school.score != null ? Math.max(6, Math.min(14, school.score / 8)) : 8;

      const marker = L.circleMarker([school.latitude!, school.longitude!], {
        radius,
        fillColor: color,
        color: "#FFFFFF",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(map);

      const scoreText =
        school.score != null ? `<br/>위험도: ${school.score}점` : "";
      marker.bindPopup(
        `<div style="font-size:13px;font-family:Pretendard,sans-serif;">
          <strong>${school.schoolName}</strong><br/>
          ${school.district}${scoreText}
        </div>`
      );

      if (onSchoolClick) {
        marker.on("click", () => onSchoolClick(school.schoolCode));
      }
    });

    // 마커가 있으면 bounds 자동 조정
    if (validSchools.length > 0) {
      const bounds = L.latLngBounds(
        validSchools.map((s) => [s.latitude!, s.longitude!])
      );
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [schools, onSchoolClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: "280px" }}
    />
  );
}
