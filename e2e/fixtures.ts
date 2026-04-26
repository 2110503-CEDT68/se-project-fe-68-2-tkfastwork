import { Page } from "@playwright/test";

export const mockOwnerSession = async (page: Page) => {
    await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                user: {
                    id: "owner-1",
                    name: "Test Owner",
                    email: "owner@test.com",
                    role: "owner",
                    token: "fake-jwt-token",
                },
                expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }),
        });
    });

    // next-auth keeps polling for csrf and providers — fulfill those too so the page is quiet
    await page.route("**/api/auth/csrf", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ csrfToken: "test-csrf" }),
        });
    });

    await page.route("**/api/auth/providers", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });
};

export const mockUserSession = async (page: Page) => {
    await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                user: {
                    id: "user-1",
                    name: "Test User",
                    email: "user@test.com",
                    role: "user",
                    token: "fake-user-jwt",
                },
                expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }),
        });
    });

    await page.route("**/api/auth/csrf", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ csrfToken: "test-csrf" }),
        });
    });

    await page.route("**/api/auth/providers", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });
};

export const mockUnauthenticatedSession = async (page: Page) => {
    await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });

    await page.route("**/api/auth/csrf", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ csrfToken: "test-csrf" }),
        });
    });

    await page.route("**/api/auth/providers", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });
};

export interface ReportPreferenceFixture {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    hour: number;
    minute: number;
    timezone: string;
    dayOfWeek: number;
    dayOfMonth: number;
    lookbackDays: number;
    lastRunAt: string | null;
    nextRunAt: string | null;
}

export const defaultPreferences: ReportPreferenceFixture = {
    enabled: false,
    frequency: "weekly",
    hour: 8,
    minute: 0,
    timezone: "UTC",
    dayOfWeek: 1,
    dayOfMonth: 1,
    lookbackDays: 30,
    lastRunAt: null,
    nextRunAt: null,
};
