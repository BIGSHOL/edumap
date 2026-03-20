"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface ZoneMarker {
  zoneId: string;
  zoneName: string;
  schools: Array<{
    schoolName: string;
    latitude: number | null;
    longitude: number | null;
    riskScore: number;
    riskLevel: "safe" | "caution" | "warning" | "danger";
  }>;
  avgRiskScore: number;
  overallLevel: "safe" | "caution" | "warning" | "danger";
  schoolCount: number;
  eduSupportName?: string | null;
}

interface ZoneClusterMapProps {
  zones: ZoneMarker[];
  center?: [number, number];
  zoom?: number;
  onZoneClick?: (_zoneId: string) => void;
  selectedZoneId?: string | null;
}

const LEVEL_COLORS: Record<string, string> = {
  safe: "#22C55E",
  caution: "#EAB308",
  warning: "#F97316",
  danger: "#EF4444",
};

const LEVEL_LABELS: Record<string, string> = {
  safe: "안전",
  caution: "주의",
  warning: "경고",
  danger: "위험",
};

export function ZoneClusterMap({
  zones,
  center = [36.5, 127.5],
  zoom = 7,
  onZoneClick,
  selectedZoneId,
}: ZoneClusterMapProps) {
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
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const allPoints: [number, number][] = [];

    zones.forEach((zone) => {
      // 학구 중심점 = 소속 학교 좌표의 평균
      const validSchools = zone.schools.filter(
        (s) => s.latitude != null && s.longitude != null
      );
      if (validSchools.length === 0) return;

      const centerLat =
        validSchools.reduce((s, sc) => s + sc.latitude!, 0) / validSchools.length;
      const centerLng =
        validSchools.reduce((s, sc) => s + sc.longitude!, 0) / validSchools.length;

      allPoints.push([centerLat, centerLng]);

      const color = LEVEL_COLORS[zone.overallLevel];
      const levelLabel = LEVEL_LABELS[zone.overallLevel];

      // 외곽 링 (학구 클러스터)
      const outerRadius = Math.max(12, Math.min(24, zone.schoolCount * 6));
      const outerMarker = L.circleMarker([centerLat, centerLng], {
        radius: outerRadius,
        fillColor: color,
        color: "#FFFFFF",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.35,
      }).addTo(map);

      // 내부 숫자 배지 (학교 수)
      const innerMarker = L.circleMarker([centerLat, centerLng], {
        radius: 10,
        fillColor: color,
        color: "#FFFFFF",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      // 학교 수 텍스트 (divIcon으로)
      const countIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:20px;height:20px;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:white;
          font-family:Pretendard,sans-serif;
          pointer-events:none;
        ">${zone.schoolCount}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([centerLat, centerLng], { icon: countIcon, interactive: false }).addTo(
        map
      );

      // 팝업
      const schoolList = zone.schools
        .map(
          (s) =>
            `<li style="font-size:12px;">${s.schoolName} <span style="color:${LEVEL_COLORS[s.riskLevel]};font-weight:600;">${s.riskScore}점</span></li>`
        )
        .join("");

      outerMarker.bindPopup(
        `<div style="font-size:13px;font-family:Pretendard,sans-serif;max-width:250px;">
          <strong>${zone.zoneName}</strong>
          <span style="color:${color};font-weight:600;margin-left:8px;">${levelLabel}</span>
          <br/>학교 ${zone.schoolCount}개 | 평균 위험도 ${zone.avgRiskScore}점
          ${zone.eduSupportName ? `<br/><span style="font-size:11px;color:#666;">${zone.eduSupportName}</span>` : ""}
          <ul style="margin:6px 0 0 16px;padding:0;">${schoolList}</ul>
        </div>`
      );

      if (onZoneClick) {
        outerMarker.on("click", () => onZoneClick(zone.zoneId));
        innerMarker.on("click", () => onZoneClick(zone.zoneId));
      }
    });

    // bounds 자동 조정
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [zones, onZoneClick]);

  // 학구 선택 시 해당 위치로 이동
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedZoneId) return;

    const zone = zones.find((z) => z.zoneId === selectedZoneId);
    if (!zone) return;

    const validSchools = zone.schools.filter(
      (s) => s.latitude != null && s.longitude != null
    );
    if (validSchools.length === 0) return;

    const lat = validSchools.reduce((s, sc) => s + sc.latitude!, 0) / validSchools.length;
    const lng = validSchools.reduce((s, sc) => s + sc.longitude!, 0) / validSchools.length;

    map.flyTo([lat, lng], 13, { duration: 0.8 });
  }, [selectedZoneId, zones]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: "280px" }}
    />
  );
}
