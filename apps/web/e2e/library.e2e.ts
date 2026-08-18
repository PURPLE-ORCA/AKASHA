import { expect, test } from "@playwright/test"

test("presents the Google authentication entry point", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Keep the ideas worth returning to.",
    })
  ).toBeVisible()
  const googleAuthRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/api/auth/google"
  )
  await page.getByRole("button", { name: "Continue with Google" }).click()
  await googleAuthRequest
  await expect(page.getByRole("img")).toHaveCount(0)
})

test("keeps the primary action visible on compact screens", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Compact layout is covered by the mobile project")
  await page.goto("/")

  await expect(
    page.getByRole("button", { name: "Continue with Google" })
  ).toBeInViewport()
})

test("offers recovery when Google connection fails", async ({ page }) => {
  await page.goto("/?connection=failed")

  await expect(page.getByRole("alert")).toContainText(
    "Akasha couldn’t connect your library"
  )
  await expect(
    page.getByRole("button", { name: "Continue with Google" })
  ).toBeVisible()
})
