import { test, expect } from "@playwright/test";
import { mockUnauthenticatedSession, mockUserSession } from "./fixtures";

const MOCK_SPACES = [
    {
        _id: "space-1",
        name: "Creative Hub",
        address: "123 Main St",
        tel: "0812345678",
        opentime: "08:00",
        closetime: "18:00",
        description: "A creative coworking space",
        pics: [],
        isVisible: true,
        reservations: [],
    },
    {
        _id: "space-2",
        name: "Tech Loft",
        address: "456 Innovation Ave",
        tel: "0898765432",
        opentime: "09:00",
        closetime: "21:00",
        description: "Tech-focused workspace",
        pics: [],
        isVisible: true,
        reservations: [],
    },
];

test.describe("Browse coworking spaces", () => {
    test("home page shows spaces listing", async ({ page }) => {
        // Mock the backend API for spaces (server-side fetch uses BACKEND_URL)
        await page.route("**/api/v1/coworkingSpaces", async (route) => {
            if (route.request().method() === "GET" && !route.request().url().includes("/coworkingSpaces/")) {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({ success: true, count: 2, data: MOCK_SPACES }),
                });
            } else {
                await route.continue();
            }
        });

        await page.goto("/");
        await expect(page.getByText("Find Your Perfect Workspace")).toBeVisible();
    });

    test("space detail page shows space info", async ({ page }) => {
        await mockUnauthenticatedSession(page);

        await page.route("**/api/v1/coworkingSpaces/space-1", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, data: MOCK_SPACES[0] }),
            });
        });

        // Also mock rooms for the space detail page
        await page.route("**/api/v1/coworkingSpaces/space-1/rooms**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, count: 0, data: [] }),
            });
        });

        await page.goto("/space/space-1");
        await expect(page.getByText("Creative Hub")).toBeVisible();
    });
});
