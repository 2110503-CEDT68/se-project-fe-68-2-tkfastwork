import { test, expect } from "@playwright/test";
import { mockUserSession } from "./fixtures";

const MOCK_RESERVATIONS = [
    {
        _id: "res-1",
        apptDate: "2026-05-01T10:00:00.000Z",
        apptEnd: "2026-05-01T11:00:00.000Z",
        user: "user-1",
        coworkingSpace: { _id: "space-1", name: "Creative Hub", address: "123 Main St", tel: "0812345678", opentime: "08:00", closetime: "18:00" },
        room: { _id: "room-1", name: "Meeting Room A", capacity: 10 },
    },
];

test.describe("Bookings", () => {
    test("bookings page shows user reservations", async ({ page }) => {
        await mockUserSession(page);

        await page.route("**/api/v1/reservations", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, count: 1, data: MOCK_RESERVATIONS }),
            });
        });

        await page.goto("/bookings");
        await expect(page.getByRole("heading", { name: "My Bookings" })).toBeVisible();
        await expect(page.getByText("Creative Hub")).toBeVisible();
    });

    test("bookings page shows empty state when no reservations", async ({ page }) => {
        await mockUserSession(page);

        await page.route("**/api/v1/reservations", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, count: 0, data: [] }),
            });
        });

        await page.goto("/bookings");
        await expect(page.getByText("No bookings yet")).toBeVisible();
        await expect(page.getByRole("link", { name: "Browse Spaces" })).toBeVisible();
    });

    test("unauthenticated user is redirected from bookings", async ({ page }) => {
        // Mock unauthenticated session
        await page.route("**/api/auth/session", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({}),
            });
        });
        await page.route("**/api/auth/csrf", async (route) => {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "test-csrf" }) });
        });
        await page.route("**/api/auth/providers", async (route) => {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
        });

        await page.goto("/bookings");
        // Should redirect to login
        await page.waitForURL("**/login", { timeout: 10000 });
        await expect(page).toHaveURL(/\/login/);
    });
});
