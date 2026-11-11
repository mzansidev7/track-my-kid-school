import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?::|\/)).*/, (route) =>
    route.abort(),
  );
});

test("school login page renders without a production backend", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Sign in to your school" }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("school@example.com")).toBeVisible();
  await expect(page.getByPlaceholder("Enter your password")).toBeVisible();
});

test("school password reset request uses a mocked API", async ({ page }) => {
  await page.route("http://127.0.0.1:4010/forgot-password", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message:
          "If an account with this email exists, a password reset link has been sent.",
      }),
    }),
  );

  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByPlaceholder("school@example.com").fill("school@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(
    page.getByText(/If an account with that email exists/),
  ).toBeVisible();
});

test("school reset form submits to a mocked API", async ({ page }) => {
  await page.route("http://127.0.0.1:4010/reset-password", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );

  await page.goto(`/reset-password?token=${"a".repeat(43)}`);
  await page.getByLabel("New password").fill("safe-password-123");
  await page.getByLabel("Confirm new password").fill("safe-password-123");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(
    page.getByRole("heading", { name: "Password updated" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue to sign in" }),
  ).toBeVisible();
});
