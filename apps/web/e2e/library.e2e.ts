import { expect, test } from "@playwright/test"

test("searches and navigates the library", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("[data-hydrated=true]")).toBeVisible()

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Bento sections"
  )
  await page
    .getByRole("searchbox", { name: "Search your library" })
    .fill("motion")
  await expect(page.getByText("1 item")).toBeVisible()
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Material and motion direction",
    })
  ).toBeVisible()

  await page.goto("/?folder=testimonials")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Testimonials"
  )
  await expect(
    page.getByRole("heading", { name: "No inspiration found" })
  ).toBeVisible()
})

test("opens folder navigation on compact screens", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Compact navigation is covered by the mobile project")
  await page.goto("/")
  await expect(page.locator("[data-hydrated=true]")).toBeVisible()

  await page.getByRole("button", { name: "Open folders" }).click()
  await expect(
    page.getByRole("dialog", { name: "Stillroom folders" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Connect library" })
  ).toBeVisible()
})

test("shows selection actions", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("[data-hydrated=true]")).toBeVisible()
  await page
    .getByRole("checkbox", { name: "Select Architectural navigation study" })
    .click()

  await expect(page.getByText("1 selected")).toBeVisible()
  await expect(
    page.getByRole("button", { exact: true, name: "Move" })
  ).toBeDisabled()
  await expect(
    page.getByRole("button", { exact: true, name: "Remove" })
  ).toBeDisabled()
})
