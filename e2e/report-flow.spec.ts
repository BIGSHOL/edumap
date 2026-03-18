import { test, expect } from "@playwright/test";

test.describe("에듀맵 메인 플로우", () => {
  test("메인 대시보드가 로딩된다", async ({ page }) => {
    await page.goto("/");

    // 헤더 확인
    await expect(page.locator("header")).toContainText("에듀맵 EduMap");

    // 검색바 확인
    await expect(page.getByPlaceholder(/학교|지역|검색/i)).toBeVisible();

    // 요약 카드 확인
    await expect(page.getByText("전체 학교")).toBeVisible();
    await expect(page.getByText("주의 이상 학교")).toBeVisible();
    await expect(page.getByText("평균 위험도")).toBeVisible();
  });

  test("학교 카드를 클릭하면 리포트 페이지로 이동", async ({ page }) => {
    await page.goto("/");

    // 학교 목록이 로드될 때까지 대기
    const schoolCard = page.locator("a[href^='/report/']").first();
    await schoolCard.waitFor({ state: "visible", timeout: 10000 });
    await schoolCard.click();

    // 리포트 페이지 확인
    await expect(page).toHaveURL(/\/report\//);
    await expect(page.getByText("AI 인사이트 리포트")).toBeVisible();
  });

  test("리포트 유형을 선택하고 생성할 수 있다", async ({ page }) => {
    await page.goto("/");

    // 학교 카드 클릭
    const schoolCard = page.locator("a[href^='/report/']").first();
    await schoolCard.waitFor({ state: "visible", timeout: 10000 });
    await schoolCard.click();

    // 리포트 유형 탭 확인
    await expect(page.getByText("정책담당자용")).toBeVisible();
    await expect(page.getByText("교사용")).toBeVisible();
    await expect(page.getByText("학부모용")).toBeVisible();

    // 교사용 선택
    await page.getByText("교사용").click();

    // 리포트 생성 버튼 클릭
    await page.getByText("리포트 생성").click();

    // 로딩 또는 결과 확인
    const loadingOrResult = page.getByText(/리포트 생성 중|출처/);
    await expect(loadingOrResult).toBeVisible({ timeout: 15000 });
  });

  test("조기경보 대시보드가 로딩된다", async ({ page }) => {
    await page.goto("/early-alert");

    await expect(page.getByText("학습격차 조기경보 대시보드")).toBeVisible();
    await expect(page.getByText("학교별 위험도 현황")).toBeVisible();

    // 요약 카드 확인
    await expect(page.getByText("전체 학교")).toBeVisible();
    await expect(page.getByText("위험")).toBeVisible();
    await expect(page.getByText("경고")).toBeVisible();
  });

  test("GapMap 페이지가 로딩된다", async ({ page }) => {
    await page.goto("/gapmap");

    await expect(page.getByText("학습자원 공백 지도 (GapMap)")).toBeVisible();
    await expect(page.getByText("분석 대상")).toBeVisible();
    await expect(page.getByText("공백 심각 학교")).toBeVisible();
    await expect(page.getByText("평균 커버리지")).toBeVisible();
  });

  test("네비게이션이 모든 페이지로 이동할 수 있다", async ({ page }) => {
    await page.goto("/");

    // 조기경보 네비게이션
    await page.getByRole("link", { name: "조기경보" }).click();
    await expect(page).toHaveURL("/early-alert");

    // 대시보드 네비게이션
    await page.getByRole("link", { name: "대시보드" }).click();
    await expect(page).toHaveURL("/");

    // 학습자원 공백 네비게이션
    await page.getByRole("link", { name: "학습자원 공백" }).click();
    await expect(page).toHaveURL("/gapmap");
  });

  test("검색 기능이 동작한다", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(/학교|지역|검색/i);
    await searchInput.waitFor({ state: "visible", timeout: 10000 });

    // 존재하지 않는 학교 검색
    await searchInput.fill("존재하지않는학교XYZ");
    await page.getByRole("button", { name: /검색/ }).click();

    // 결과 없음 확인
    await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
  });
});
