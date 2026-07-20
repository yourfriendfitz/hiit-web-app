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
  await expect(
    addedExercise.locator(".exercise-card__status .weight-badge"),
  ).toContainText("Offline added 125");

  await page.goto("/#/directory");
  await expect(
    page.getByRole("heading", { name: "Program Week 1", exact: true }),
  ).toBeVisible();

  await page.goto("/#/workout?week=0&day=0");
  const firstExercise = page.locator(".exercise-card").first();
  await firstExercise.locator("button").first().click();
  await firstExercise
    .locator('input[id^="weight-"]')
    .fill("Offline 145; 8 RPE*");
  await firstExercise.getByRole("button", { name: "Save" }).click();
  await expect(
    firstExercise.locator(".exercise-card__status .weight-badge"),
  ).toContainText("Offline 145; 8 RPE*");

  await page.goto("/#/history");
  await expect(page.getByText(/Offline 145; 8 RPE\*/)).toBeVisible();
  await expect(page.getByText(/Offline added 125/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open("hiit-app-db", 2);
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction("Weights", "readonly");
              const records = transaction.objectStore("Weights").getAll();
              records.onsuccess = () => {
                db.close();
                resolve(
                  records.result.some(
                    (record) =>
                      typeof record.programWeek === "number" &&
                      typeof record.cycle === "number" &&
                      typeof record.cycleWeek === "number" &&
                      typeof record.cycleLength === "number" &&
                      typeof record.workoutDay === "number",
                  ),
                );
              };
              records.onerror = () => reject(records.error);
            };
            request.onerror = () => reject(request.error);
          }),
      ),
    )
    .toBe(true);

  await page.getByLabel("Import history backup").setInputFiles({
    name: "offline-history-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        app: "hiit-web-app",
        format: "weights-backup",
        formatVersion: 1,
        exportedAt: "2026-06-26T20:32:30.000Z",
        recordCount: 1,
        records: [
          {
            id: "legextension",
            weight: "Offline imported 225",
            date: "2025-08-03T12:00:00.000Z",
          },
        ],
      }),
    ),
  });
  await expect(
    page.getByText("Imported 1 record. No duplicates skipped."),
  ).toBeVisible();
  await expect(page.getByText(/Offline imported 225/)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^hiit-history-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
});

test("legacy migration bridge removes stale shell caches without deleting IndexedDB history", async ({
  page,
}) => {
  await prepareOfflineApp(page);
  await Promise.all([
    page.waitForEvent("framenavigated"),
    page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );

      const legacyCache = await caches.open("hiit-app-cache-v3.0.4");
      await legacyCache.put("/legacy-index.html", new Response("legacy shell"));
      const controlCache = await caches.open("migration-control-cache");
      await controlCache.put("/retain.html", new Response("retain"));

      await new Promise((resolve, reject) => {
        const request = indexedDB.open("hiit-app-db", 2);

        request.onupgradeneeded = () => {
          const db = request.result;
          let store;

          if (!db.objectStoreNames.contains("Weights")) {
            store = db.createObjectStore("Weights", {
              autoIncrement: true,
            });
          } else {
            store = request.transaction.objectStore("Weights");
          }

          if (!store.indexNames.contains("id")) {
            store.createIndex("id", "id", { unique: false });
          }
          if (!store.indexNames.contains("date")) {
            store.createIndex("date", "date", { unique: false });
          }
          if (!store.indexNames.contains("weight")) {
            store.createIndex("weight", "weight", { unique: false });
          }
          if (!store.indexNames.contains("exerciseCycleContext")) {
            store.createIndex(
              "exerciseCycleContext",
              ["id", "cycleLength", "cycleWeek", "workoutDay"],
              { unique: false },
            );
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("Weights", "readwrite");
          transaction.objectStore("Weights").put({
            id: "migration-probe",
            weight: "Legacy 135",
            date: new Date("2026-05-01T12:00:00-05:00"),
          });
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
        request.onerror = () => reject(request.error);
      });

      await navigator.serviceWorker.register("/service-worker.js");
    }),
  ]);
  await page.waitForLoadState("domcontentloaded");

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cacheNames = await caches.keys();
        return {
          legacyCachePresent: cacheNames.includes("hiit-app-cache-v3.0.4"),
          controlCachePresent: cacheNames.includes("migration-control-cache"),
        };
      }),
    )
    .toEqual({
      legacyCachePresent: false,
      controlCachePresent: true,
    });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open("hiit-app-db", 2);
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction("Weights", "readonly");
              const records = transaction.objectStore("Weights").getAll();
              records.onsuccess = () => {
                db.close();
                resolve(
                  records.result.some(
                    ({ id, weight }) =>
                      id === "migration-probe" && weight === "Legacy 135",
                  ),
                );
              };
              records.onerror = () => reject(records.error);
            };
            request.onerror = () => reject(request.error);
          }),
      ),
    )
    .toBe(true);
});
