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

    test("space detail page shows space info", async ({ page, request }) => {
        // SSR fetch in src/app/space/[id]/page.tsx runs on the Next.js server
        // and cannot be intercepted via page.route. Hit the real backend with a
        // seeded space instead.
        await mockUnauthenticatedSession(page);

        const backend = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:5001";
        let space: { _id: string; name: string } | undefined;
        try {
            const listRes = await request.get(`${backend}/api/v1/coworkingSpaces?limit=1`);
            const listJson = await listRes.json();
            space = listJson.data?.[0];
        } catch {
            /* backend unreachable */
        }
        test.skip(!space, "Backend not reachable or no seeded coworking space");

        await page.goto(`/space/${space._id}`);
        await expect(page.getByText(space.name).first()).toBeVisible();
    });
});
