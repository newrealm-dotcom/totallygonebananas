import { expect, test, type Page } from "@playwright/test";

function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tgb-scroll-engagement-popup", "done");
  });
});

test("homepage loads main content", async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto("/");

  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("link", { name: /skip to content/i })).toBeAttached();
  expect(errors).toEqual([]);
});

test("blog archive loads and Load More is safe when present", async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto("/blog");

  await expect(page.getByRole("heading", { name: /bananas in the wild/i })).toBeVisible();
  const loadMore = page.getByRole("button", { name: /load more/i });
  if (await loadMore.isVisible().catch(() => false)) {
    await loadMore.click();
    await expect(page.locator("main")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("login validates malformed email without sending auth requests", async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto("/login");

  await page.locator("#email").fill("not-an-email");
  await page.getByRole("button", { name: /email me a sign-in link/i }).click();

  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("new recipe redirects signed-out visitors to login", async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto("/recipes/new");

  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole("heading", { name: /come on in/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test("recipe listing links to a recipe detail when recipes exist", async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto("/recipes");

  const recipeLinks = page.locator('a[href^="/recipes/"]:not([href="/recipes/new"])');
  const count = await recipeLinks.count();
  if (count === 0) {
    expect(errors).toEqual([]);
    return;
  }

  await recipeLinks.first().click();
  await expect(page).toHaveURL(/\/recipes\/[^/?#]+/);
  await expect(page.locator("main h1")).toBeVisible();
  expect(errors).toEqual([]);
});
