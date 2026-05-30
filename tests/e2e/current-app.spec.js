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
  await page.route("**/cdn.tailwindcss.com", (route) =>
    route.fulfill({
      body: "window.tailwind = { config: {} };",
      contentType: "application/javascript",
    }),
  );
  await page.route("**/fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  await page.route("**/fonts.gstatic.com/**", (route) =>
    route.fulfill({ body: "", contentType: "font/woff2" }),
  );
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

async function seedWeightRecords(page, records) {
  await page.goto("/");
  await page.evaluate(async (seedRecords) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("hiit-app-db", 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("Weights")) {
          const store = db.createObjectStore("Weights", {
            autoIncrement: true,
          });
          store.createIndex("id", "id", { unique: false });
          store.createIndex("date", "date", { unique: false });
          store.createIndex("weight", "weight", { unique: false });
        }
      };

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("Weights", "readwrite");
        const store = tx.objectStore("Weights");

        seedRecords.forEach((record) => store.put(record));

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, records);
}

test.beforeEach(async ({ page }) => {
  await freezeDateAndToast(page);
  await stubExternalAssets(page);
});

test("loads the current workout on app launch", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Legs (Hypertrophy Focus)")).toBeVisible();
  await expect(page.locator(".exercise-card button").first()).toBeVisible();
  await expect(page.locator("#versionIndicator")).toHaveText("v3.0.4");
});

test("opens the directory and loads a selected workout route", async ({
  page,
}) => {
  await page.goto("/#/directory");

  await expect(
    page.getByRole("heading", { name: "Week 1", exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href="#/workout?week=0&day=0"]')).toBeVisible();

  // The current app has duplicate link handlers that can race on click.
  // Milestone 1 captures the routable behavior without changing app source.
  await page.goto("/#/workout?week=0&day=0");

  await expect(
    page.locator("#appContent .exercise-card button").first(),
  ).toBeVisible();
});

test("saves a free-text weight and shows it in history", async ({ page }) => {
  await page.goto("/#/workout?week=0&day=0");

  const firstExercise = page.locator(".exercise-card").first();
  await firstExercise.locator("button").first().click();
  await firstExercise.locator('input[id^="weight-"]').fill("Test 135");
  await firstExercise.getByRole("button", { name: "Save" }).click();

  await expect(firstExercise.locator(".weight-badge")).toContainText(
    "Test 135",
  );

  await page.goto("/#/history");

  await expect(page.getByPlaceholder("Search exercises...")).toBeVisible();
  await expect(page.getByText(/Test 135/)).toBeVisible();
});

test("reads seeded history and filters it by exercise name", async ({
  page,
}) => {
  await seedWeightRecords(page, [
    {
      id: "45inclinebarbellpress",
      weight: "Legacy 95",
      date: "2025-07-29T12:00:00.000Z",
    },
    {
      id: "45inclinebarbellpress",
      weight: "Legacy 105",
      date: "2025-07-31T12:00:00.000Z",
    },
    {
      id: "legextension",
      weight: "Legacy 70",
      date: "2025-07-30T12:00:00.000Z",
    },
  ]);

  await page.goto("/#/workout?week=0&day=0");

  const firstExercise = page.locator(".exercise-card").first();
  await firstExercise.locator("button").first().click();
  await expect(firstExercise.locator(".weight-badge")).toContainText(
    "Legacy 105",
  );

  await page.goto("/#/history");

  const search = page.getByPlaceholder("Search exercises...");
  await expect(page.getByText("Legacy 105")).toBeVisible();
  await expect(page.getByText("Legacy 70")).toBeVisible();

  await search.fill("Incline Barbell");

  await expect(page.getByText("Legacy 105")).toBeVisible();
  await expect(page.getByText("Legacy 70")).toBeHidden();
});

test("cleans up database update listeners across route transitions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const listeners = new Set();
    const addEventListener = window.addEventListener.bind(window);
    const removeEventListener = window.removeEventListener.bind(window);

    window.addEventListener = (type, listener, options) => {
      if (type === "dbUpdated") {
        listeners.add(listener);
      }
      addEventListener(type, listener, options);
    };

    window.removeEventListener = (type, listener, options) => {
      if (type === "dbUpdated") {
        listeners.delete(listener);
      }
      removeEventListener(type, listener, options);
    };

    window.getDbUpdatedListenerCount = () => listeners.size;
  });

  await page.goto("/#/workout?week=0&day=0");
  await expect(page.locator(".exercise-card").first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.getDbUpdatedListenerCount()))
    .toBe(await page.locator(".exercise-card").count());

  await page.goto("/#/history");
  await expect(page.getByPlaceholder("Search exercises...")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.getDbUpdatedListenerCount()))
    .toBe(1);

  await page.goto("/#/directory");
  await expect(
    page.getByRole("heading", { name: "Week 1", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.getDbUpdatedListenerCount()))
    .toBe(0);
});
