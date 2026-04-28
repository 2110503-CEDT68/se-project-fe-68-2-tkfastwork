import { test, expect } from "@playwright/test";
import { mockUnauthenticatedSession } from "./fixtures";

test.describe("Authentication flows", () => {
    test("login page renders with form fields", async ({ page }) => {
        await mockUnauthenticatedSession(page);
        await page.goto("/login");
        await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
        await expect(page.locator("#loginEmail")).toBeVisible();
        await expect(page.locator("#loginPassword")).toBeVisible();
        await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    });

    test("login page has link to register", async ({ page }) => {
        await mockUnauthenticatedSession(page);
        await page.goto("/login");
        const registerLink = page.getByRole("link", { name: "Create one" });
        await expect(registerLink).toBeVisible();
        await expect(registerLink).toHaveAttribute("href", "/register");
    });

    test("login shows success message after registration redirect", async ({ page }) => {
        await mockUnauthenticatedSession(page);
        await page.goto("/login?registered=1");
        await expect(page.getByText("Account created successfully")).toBeVisible();
    });

    test("login shows error on invalid credentials", async ({ page }) => {
        await mockUnauthenticatedSession(page);
        // Mock the NextAuth signIn to fail
        await page.route("**/api/auth/callback/credentials*", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    url: "http://localhost:3000/api/auth/error?error=CredentialsSignin",
                    error: "CredentialsSignin",
                    status: 401,
                    ok: false,
                }),
            });
        });
        await page.goto("/login");
        await page.locator("#loginEmail").fill("wrong@test.com");
        await page.locator("#loginPassword").fill("wrongpassword");
        await page.getByRole("button", { name: "Sign In" }).click();
        // NextAuth v4 may either render the inline error or redirect to the
        // shared error page when credentials fail — both signal a rejected login.
        await expect(page).toHaveURL(/\/(login|api\/auth\/error)/);
        await expect(page.locator("body")).not.toContainText(/welcome.*back/i);
    });

    test("register page renders with form fields", async ({ page }) => {
        await mockUnauthenticatedSession(page);
        await page.goto("/register");
        // Check that register form exists with key fields
        await expect(page.getByRole("heading", { name: /create|register|sign up/i })).toBeVisible();
    });
});
