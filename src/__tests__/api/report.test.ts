import { describe, it, expect } from "vitest";

describe("/api/report", () => {
  describe("POST /api/report — AI 리포트 생성", () => {
    it("policy 유형 리포트를 생성한다", async () => {
      const { POST } = await import("@/app/api/report/route");
      const request = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: "B100000465",
          reportType: "policy",
        }),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.reportType).toBe("policy");
      expect(body.data.reportContent).toBeDefined();
      expect(body.data.reportContent.length).toBeGreaterThan(0);
      expect(body.data.modelUsed).toBeDefined();
      expect(body.data.generatedAt).toBeDefined();
    });

    it("teacher 유형 리포트를 생성한다", async () => {
      const { POST } = await import("@/app/api/report/route");
      const request = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: "B100000465",
          reportType: "teacher",
        }),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.reportType).toBe("teacher");
    });

    it("parent 유형 리포트를 생성한다", async () => {
      const { POST } = await import("@/app/api/report/route");
      const request = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: "B100000465",
          reportType: "parent",
        }),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.reportType).toBe("parent");
    });

    it("잘못된 reportType에 400을 반환한다", async () => {
      const { POST } = await import("@/app/api/report/route");
      const request = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: "B100000465",
          reportType: "invalid",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("schoolCode와 regionCode 모두 없으면 400을 반환한다", async () => {
      const { POST } = await import("@/app/api/report/route");
      const request = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "policy",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
