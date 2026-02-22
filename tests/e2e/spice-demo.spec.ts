import { test, expect } from "@playwright/test";

test.describe("SPICE Client Demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the demo page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("SPICE Client Demo");
    await expect(page.locator('input[placeholder="Host"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Port"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
    await expect(page.locator("button", { hasText: "Connect" })).toBeVisible();
  });

  test("should have default connection settings", async ({ page }) => {
    await expect(page.locator('input[placeholder="Host"]')).toHaveValue("192.168.2.31");
    await expect(page.locator('input[placeholder="Port"]')).toHaveValue("5908");
  });

  test("should show disconnected status initially", async ({ page }) => {
    const statusText = page.locator(".status-disconnected");
    await expect(statusText).toContainText("Disconnected");
  });

  test("should have logs panel", async ({ page }) => {
    const logsPanel = page.locator(".logs-panel");
    await expect(logsPanel).toBeVisible();
    await expect(logsPanel.locator(".logs-header")).toContainText("Logs");
  });

  test("should have debug info section", async ({ page }) => {
    const debugInfo = page.locator(".debug-info");
    await expect(debugInfo).toBeVisible();
    await expect(debugInfo).toContainText("Ready to connect");
  });

  test("should attempt connection when Connect button is clicked", async ({ page }) => {
    const connectButton = page.locator("button", { hasText: "Connect" });
    await connectButton.click();

    await expect(page.locator(".status-connecting")).toBeVisible({ timeout: 5000 });
  });

  test("should show success message after successful connection", async ({ page }) => {
    const connectButton = page.locator("button", { hasText: "Connect" });
    await connectButton.click();

    await expect(page.locator(".status-connected")).toBeVisible({ timeout: 30000 });

    const debugInfo = page.locator(".debug-info.success");
    await expect(debugInfo).toContainText("All right", { timeout: 30000 });
  });

  test("should render canvas after connection", async ({ page }) => {
    const connectButton = page.locator("button", { hasText: "Connect" });
    await connectButton.click();

    await expect(page.locator(".status-connected")).toBeVisible({ timeout: 30000 });

    const canvas = page.locator("#spice-screen canvas");
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const canvasWidth = await canvas.evaluate((el: HTMLCanvasElement) => el.width);
    const canvasHeight = await canvas.evaluate((el: HTMLCanvasElement) => el.height);
    expect(canvasWidth).toBeGreaterThan(0);
    expect(canvasHeight).toBeGreaterThan(0);
  });

  test("should have canvas with rendered pixels", async ({ page }) => {
    const connectButton = page.locator("button", { hasText: "Connect" });
    await connectButton.click();

    await expect(page.locator(".status-connected")).toBeVisible({ timeout: 30000 });

    const canvas = page.locator("#spice-screen canvas");
    await expect(canvas).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(3000);

    const hasPixels = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext("2d");
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, Math.min(el.width, 100), Math.min(el.height, 100));
      const data = imageData.data;
      let nonZeroPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
          nonZeroPixels++;
        }
      }
      return nonZeroPixels > 0;
    });

    expect(hasPixels).toBe(true);
  });

  test("should disconnect when Disconnect button is clicked", async ({ page }) => {
    const connectButton = page.locator("button", { hasText: "Connect" });
    await connectButton.click();

    await expect(page.locator(".status-connected")).toBeVisible({ timeout: 30000 });

    const disconnectButton = page.locator("button", { hasText: "Disconnect" });
    await disconnectButton.click();

    await expect(page.locator(".status-disconnected")).toBeVisible({ timeout: 5000 });
  });

  test("should log connection attempt to server", async ({ page }) => {
    const connectButton = page.locator("button", { hasText: "Connect" });
    await connectButton.click();

    await page.waitForTimeout(2000);

    const logsResponse = await page.request.get("http://localhost:3001/api/logs");
    const logs = await logsResponse.json();

    expect(logs.serverLog).toContain("WebSocket connection");
  });

  test("should display logs in the UI", async ({ page }) => {
    const connectButton = page.locator("button", { hasText: "Connect" });
    await connectButton.click();

    await page.waitForTimeout(3000);

    const logsContent = page.locator(".logs-content");
    await expect(logsContent).not.toBeEmpty();
  });
});
