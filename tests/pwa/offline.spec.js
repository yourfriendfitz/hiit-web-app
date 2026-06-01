import { expect, test } from "@playwright/test";

const TEST_NOW = "2025-08-04T12:00:00-05:00";

async function prepareOfflineApp(page) {
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
  }, TEST_NOW);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Upper (Strength Focus)", level: 1 }),
  ).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
}

test("loads core routes and saves a weight offline after the first visit", async ({
  context,
  page,
}) => {
  await prepareOfflineApp(page);
  await context.setOffline(true);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Upper (Strength Focus)", level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add missed workout" }).click();
  await page.locator(".quick-add__option").first().click();
  const addedWorkout = page.locator('[data-workout-instance^="missed-"]');
  const addedExercise = addedWorkout.locator(".exercise-card").first();
  await addedExercise.locator("button").first().click();
  await addedExercise.locator('input[id^="weight-"]').fill("Offline added 125");
  await addedExercise.getByRole("button", { name: "Save" }).click();
  await expect(addedExercise.locator(".weight-badge")).toContainText(
    "Offline added 125",
  );

  await page.goto("/#/directory");
  await expect(
    page.getByRole("heading", { name: "Week 1", exact: true }),
  ).toBeVisible();

  await page.goto("/#/workout?week=0&day=0");
  const firstExercise = page.locator(".exercise-card").first();
  await firstExercise.locator("button").first().click();
  await firstExercise.locator('input[id^="weight-"]').fill("Offline 145");
  await firstExercise.getByRole("button", { name: "Save" }).click();
  await expect(firstExercise.locator(".weight-badge")).toContainText(
    "Offline 145",
  );

  await page.goto("/#/history");
  await expect(page.getByText(/Offline 145/)).toBeVisible();
  await expect(page.getByText(/Offline added 125/)).toBeVisible();
});
