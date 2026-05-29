import { expect, test } from "@playwright/test";

const TEST_NOW = "2025-08-01T12:00:00-05:00";

const bootstrapToggleShim = `
  document.addEventListener("click", (event) => {
    const button = event.target.closest('[data-bs-toggle="collapse"]');
    if (!button) return;

    const target = document.querySelector(button.getAttribute("data-bs-target"));
    if (!target) return;

    const willShow = !target.classList.contains("show");
    target.classList.toggle("show", willShow);
    button.classList.toggle("collapsed", !willShow);
    button.setAttribute("aria-expanded", String(willShow));
  });
`;

async function stubExternalAssets(page) {
  await page.route("**/bootstrap.bundle.min.js", (route) =>
    route.fulfill({
      body: bootstrapToggleShim,
      contentType: "application/javascript",
    }),
  );
  await page.route("**/toastify-js", (route) =>
    route.fulfill({
      body: "window.Toastify = function Toastify() { return { showToast() {} }; };",
      contentType: "application/javascript",
    }),
  );
  await page.route("**/toastify.min.css", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  await page.route("**/bootstrap.min.css", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  await page.route("**/font-awesome/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
}

async function freezeDateAndToast(page) {
  await page.addInitScript((nowIso) => {
    const fixedTimestamp = new Date(nowIso).getTime();
    const RealDate = Date;

    function MockDate(...args) {
      if (this instanceof MockDate) {
        return args.length > 0
          ? new RealDate(...args)
          : new RealDate(fixedTimestamp);
      }

      return new RealDate(fixedTimestamp).toString();
    }

    MockDate.now = () => fixedTimestamp;
    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    MockDate.prototype = RealDate.prototype;

    window.Date = MockDate;
    window.Toastify = function Toastify() {
      return { showToast() {} };
    };
  }, TEST_NOW);
}

test.beforeEach(async ({ page }) => {
  await freezeDateAndToast(page);
  await stubExternalAssets(page);
});

test("loads the current workout on app launch", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Pull (Hypertrophy Focus)")).toBeVisible();
  await expect(page.locator(".accordion-button").first()).toBeVisible();
  await expect(page.locator("#versionIndicator")).toHaveText("v1.0.0");
});

test("opens the directory and loads a selected workout route", async ({
  page,
}) => {
  await page.goto("/#/directory");

  await expect(page.getByRole("heading", { name: /^Week 1 \(/ })).toBeVisible();
  await expect(page.locator('a[href="#/workout?week=0&day=0"]')).toBeVisible();

  // The current app has duplicate link handlers that can race on click.
  // Milestone 1 captures the routable behavior without changing app source.
  await page.goto("/#/workout?week=0&day=0");

  await expect(
    page.locator("#appContent .accordion-button").first(),
  ).toBeVisible();
});

test("saves a free-text weight and shows it in history", async ({ page }) => {
  await page.goto("/#/workout?week=0&day=0");

  const firstExercise = page.locator(".accordion").first();
  await firstExercise.locator(".accordion-button").click();
  await firstExercise.locator('input[id^="weight-"]').fill("Test 135");
  await firstExercise.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(/Last Weight: Test 135/)).toBeVisible();

  await page.goto("/#/history");

  await expect(page.getByPlaceholder("Search exercises...")).toBeVisible();
  await expect(page.getByText(/Test 135/)).toBeVisible();
});
