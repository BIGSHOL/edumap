import type { AcademyStatsData } from "@/lib/services/academy-data";

/** 학원 통계 목 데이터 (대회 데모용) */
export const mockAcademyStats: AcademyStatsData[] = [
  {
    regionCode: "B10",
    district: "종로구",
    year: 2024,
    totalAcademies: 342,
    totalCapacity: 8500,
    academyByRealm: {
      "입시.검정 및 보습": 156,
      "예능(음악)": 52,
      "예능(미술)": 28,
      "체육": 41,
      "국제화": 35,
      "예능(기타)": 15,
      "직업기술": 8,
      "인문사회": 7,
    },
  },
  {
    regionCode: "B10",
    district: "강남구",
    year: 2024,
    totalAcademies: 1823,
    totalCapacity: 45000,
    academyByRealm: {
      "입시.검정 및 보습": 987,
      "예능(음악)": 198,
      "예능(미술)": 112,
      "체육": 156,
      "국제화": 215,
      "예능(기타)": 65,
      "직업기술": 42,
      "인문사회": 48,
    },
  },
  {
    regionCode: "C10",
    district: "해운대구",
    year: 2024,
    totalAcademies: 567,
    totalCapacity: 14000,
    academyByRealm: {
      "입시.검정 및 보습": 289,
      "예능(음악)": 68,
      "예능(미술)": 35,
      "체육": 72,
      "국제화": 52,
      "예능(기타)": 22,
      "직업기술": 15,
      "인문사회": 14,
    },
  },
];
