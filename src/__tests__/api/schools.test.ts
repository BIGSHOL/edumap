import { describe, it, expect } from "vitest";

// API Route 핸들러를 직접 import하여 테스트
// Next.js App Router의 route handler를 함수로 테스트

describe("/api/schools", () => {
  describe("GET /api/schools — 학교 목록 조회", () => {
    it("전체 학교 목록을 반환한다", async () => {
      const { GET } = await import("@/app/api/schools/route");
      const request = new Request("http://localhost:3000/api/schools");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.source).toBeDefined();
    });

    it("지역 필터로 학교를 검색한다", async () => {
      const { GET } = await import("@/app/api/schools/route");
      const request = new Request("http://localhost:3000/api/schools?region=B10");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeDefined();
    });

    it("학교명 검색이 동작한다", async () => {
      const { GET } = await import("@/app/api/schools/route");
      const request = new Request("http://localhost:3000/api/schools?search=서울");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeDefined();
    });

    it("학교급 필터가 동작한다", async () => {
      const { GET } = await import("@/app/api/schools/route");
      const request = new Request("http://localhost:3000/api/schools?type=elementary");
      const response = await GET(request);
      await response.json();

      expect(response.status).toBe(200);
    });
  });
});

describe("/api/schools/[schoolCode]", () => {
  it("학교 상세 정보를 반환한다", async () => {
    const { GET } = await import("@/app/api/schools/[schoolCode]/route");
    const request = new Request("http://localhost:3000/api/schools/7130106");
    const response = await GET(request, { params: Promise.resolve({ schoolCode: "7130106" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.schoolCode).toBe("7130106");
    expect(body.data.teacherStats).toBeDefined();
    expect(body.data.financeStats).toBeDefined();
    expect(body.data.afterschoolPrograms).toBeDefined();
    expect(body.meta.source).toBeDefined();
  });

  it("존재하지 않는 학교코드에 404를 반환한다", async () => {
    const { GET } = await import("@/app/api/schools/[schoolCode]/route");
    const request = new Request("http://localhost:3000/api/schools/INVALID");
    const response = await GET(request, { params: Promise.resolve({ schoolCode: "INVALID" }) });

    expect(response.status).toBe(404);
  });
});
