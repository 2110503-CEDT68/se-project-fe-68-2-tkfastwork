import { test, expect, Page } from "@playwright/test";
import {
    mockOwnerSession,
    defaultPreferences,
    ReportPreferenceFixture,
} from "./fixtures";

const REPORTS_PATH = "/my-spaces/reports";

const mockReportEndpoints = async (
    page: Page,
    overrides: Partial<{
        initialPrefs: Partial<ReportPreferenceFixture>;
        savePrefs: Partial<ReportPreferenceFixture>;
        sendNowResponse: { ok: boolean; body: object };
        pdfResponse: { ok: boolean };
    }> = {}
) => {
    const initial = { ...defaultPreferences, ...(overrides.initialPrefs || {}) };

    await page.route("**/api/v1/reports/preferences", async (route) => {
        if (route.request().method() === "GET") {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, data: initial }),
            });
            return;
        }

        const body = JSON.parse(route.request().postData() || "{}");
        const merged = { ...initial, ...body, ...(overrides.savePrefs || {}) };
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                success: true,
                data: {
                    ...merged,
                    nextRunAt: merged.enabled
                        ? new Date("2026-05-04T08:00:00.000Z").toISOString()
                        : null,
                },
            }),
        });
    });

    await page.route("**/api/v1/reports/send-now", async (route) => {
        const result = overrides.sendNowResponse || {
            ok: true,
            body: {
                success: true,
                data: { filename: "owner-report-2026-04-26.pdf", sentTo: "owner@test.com" },
            },
        };
        await route.fulfill({
            status: result.ok ? 200 : 400,
            contentType: "application/json",
            body: JSON.stringify(result.body),
        });
    });

    await page.route("**/api/v1/reports/pdf*", async (route) => {
        const ok = overrides.pdfResponse?.ok ?? true;
        if (!ok) {
            await route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({ success: false, message: "PDF unavailable" }),
            });
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: "application/pdf",
            body: Buffer.from("%PDF-1.4 fake-pdf-bytes"),
            headers: { "Content-Disposition": 'attachment; filename="owner-report.pdf"' },
        });
    });
};

test.describe("US2-4 — scheduled email PDF reports", () => {
    test.beforeEach(async ({ page }) => {
        await mockOwnerSession(page);
    });

    test("renders the schedule page with default values", async ({ page }) => {
        await mockReportEndpoints(page);
        await page.goto(REPORTS_PATH);

        await expect(page.getByRole("heading", { name: "Email Report Schedule" })).toBeVisible();
        await expect(page.getByTestId("enabled-toggle")).not.toBeChecked();
        await expect(page.getByTestId("frequency-select")).toHaveValue("weekly");
        await expect(page.getByTestId("hour-input")).toHaveValue("8");
        await expect(page.getByTestId("minute-input")).toHaveValue("0");
        await expect(page.getByTestId("day-of-week-select")).toBeVisible();
    });

    test("shows day-of-month input when frequency is monthly", async ({ page }) => {
        await mockReportEndpoints(page);
        await page.goto(REPORTS_PATH);

        await page.getByTestId("frequency-select").selectOption("monthly");
        await expect(page.getByTestId("day-of-month-input")).toBeVisible();
        await expect(page.getByTestId("day-of-week-select")).not.toBeVisible();
    });

    test("hides per-frequency fields when daily is chosen", async ({ page }) => {
        await mockReportEndpoints(page);
        await page.goto(REPORTS_PATH);

        await page.getByTestId("frequency-select").selectOption("daily");
        await expect(page.getByTestId("day-of-week-select")).not.toBeVisible();
        await expect(page.getByTestId("day-of-month-input")).not.toBeVisible();
    });

    test("saves the schedule and surfaces a confirmation banner", async ({ page }) => {
        await mockReportEndpoints(page);
        await page.goto(REPORTS_PATH);

        await page.getByTestId("enabled-toggle").check();
        await page.getByTestId("frequency-select").selectOption("daily");
        await page.getByTestId("hour-input").fill("9");
        await page.getByTestId("minute-input").fill("30");
        await page.getByTestId("lookback-input").fill("14");
        await page.getByTestId("timezone-select").selectOption("Asia/Bangkok");

        await page.getByTestId("save-button").click();

        await expect(page.getByTestId("success-banner")).toContainText("Schedule saved");
        await expect(page.getByTestId("next-run")).not.toContainText("—");
    });

    test("send report now triggers backend and shows the recipient", async ({ page }) => {
        await mockReportEndpoints(page);
        await page.goto(REPORTS_PATH);

        await page.getByTestId("send-now-button").click();
        await expect(page.getByTestId("success-banner")).toContainText("owner@test.com");
    });

    test("download PDF triggers a file download", async ({ page }) => {
        await mockReportEndpoints(page);
        await page.goto(REPORTS_PATH);

        const [download] = await Promise.all([
            page.waitForEvent("download"),
            page.getByTestId("download-pdf-button").click(),
        ]);

        expect(download.suggestedFilename()).toMatch(/owner-report-\d{4}-\d{2}-\d{2}\.pdf/);
    });

    test("shows an error banner when the backend rejects send-now", async ({ page }) => {
        await mockReportEndpoints(page, {
            sendNowResponse: {
                ok: false,
                body: { success: false, message: "SMTP unavailable" },
            },
        });
        await page.goto(REPORTS_PATH);

        await page.getByTestId("send-now-button").click();
        await expect(page.getByTestId("error-banner")).toContainText("SMTP unavailable");
    });

    test("loads saved preferences on visit", async ({ page }) => {
        await mockReportEndpoints(page, {
            initialPrefs: {
                enabled: true,
                frequency: "monthly",
                dayOfMonth: 15,
                hour: 7,
                minute: 45,
                timezone: "Asia/Bangkok",
                lookbackDays: 14,
                lastRunAt: "2026-04-15T07:45:00.000Z",
                nextRunAt: "2026-05-15T07:45:00.000Z",
            },
        });
        await page.goto(REPORTS_PATH);

        await expect(page.getByTestId("enabled-toggle")).toBeChecked();
        await expect(page.getByTestId("frequency-select")).toHaveValue("monthly");
        await expect(page.getByTestId("day-of-month-input")).toHaveValue("15");
        await expect(page.getByTestId("hour-input")).toHaveValue("7");
        await expect(page.getByTestId("minute-input")).toHaveValue("45");
        await expect(page.getByTestId("timezone-select")).toHaveValue("Asia/Bangkok");
        await expect(page.getByTestId("lookback-input")).toHaveValue("14");
        await expect(page.getByTestId("last-run")).not.toContainText("—");
        await expect(page.getByTestId("next-run")).not.toContainText("—");
    });
});
