import { expect, test } from "@playwright/test";

const TEST_NOW = "2025-08-01T12:00:00-05:00";

async function freezeDate(page) {
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

async function recordDirectoryScrollRequests(page) {
  await page.addInitScript(() => {
    window.directoryScrollRequests = [];
    Element.prototype.scrollIntoView = function (options) {
      window.directoryScrollRequests.push({
        behavior: options?.behavior,
        block: options?.block,
        weekIndex: this.getAttribute("data-week-index"),
      });
    };
  });
}

test.beforeEach(async ({ page }) => {
  await freezeDate(page);
});

test("loads the current workout on app launch", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Legs (Hypertrophy Focus)", level: 1 }),
  ).toBeVisible();
  await expect(page.locator(".exercise-card button").first()).toBeVisible();
  await expect(page.locator("#versionIndicator")).toHaveText("v4.0.0");
});

test("adds and removes one recent missed workout from home", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("workout-section")).toHaveCount(1);
  await page.getByRole("button", { name: "Add missed workout" }).click();

  const quickAddOptions = page.locator(".quick-add__option");
  await expect(quickAddOptions).toHaveCount(2);
  await expect(quickAddOptions.first()).toContainText("Thu, Jul 31");
  await quickAddOptions.first().click();

  const workoutSections = page.getByTestId("workout-section");
  await expect(workoutSections).toHaveCount(2);
  await expect(workoutSections.first()).toContainText("Today");
  await expect(workoutSections.nth(1)).toContainText("Added missed workout");
  await expect(
    page.getByRole("button", { name: "Add missed workout" }),
  ).toHaveCount(0);

  expect(
    await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map(
        (element) => element.id,
      );
      return new Set(ids).size === ids.length;
    }),
  ).toBe(true);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await workoutSections
    .nth(1)
    .getByRole("button", { name: /^Remove / })
    .click();
  await expect(workoutSections).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Add missed workout" }),
  ).toBeVisible();
});

test("stores a missed-workout weight with its authored exercise id", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add missed workout" }).click();
  await page.locator(".quick-add__option").first().click();

  const addedWorkout = page.locator('[data-workout-instance^="missed-"]');
  const firstExercise = addedWorkout.locator(".exercise-card").first();
  const exerciseId = await firstExercise.getAttribute("data-exercise-id");
  await firstExercise.locator("button").first().click();
  await firstExercise.locator('input[id^="weight-"]').fill("Added 155");
  await firstExercise.getByRole("button", { name: "Save" }).click();

  await expect(firstExercise.locator(".weight-badge")).toContainText(
    "Added 155",
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open("hiit-app-db", 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("Weights", "readonly");
        const request = tx.objectStore("Weights").getAll();
        const records = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.close();
        return records.at(-1)?.id;
      }),
    )
    .toBe(exerciseId);

  await page.goto("/#/history");
  await expect(page.getByText(/Added 155/)).toBeVisible();
});

test("renders one-handed navigation and scannable workout summaries", async ({
  page,
}) => {
  await page.goto("/#/workout?week=0&day=0");
  await expect(
    page.getByRole("button", { name: "Add missed workout" }),
  ).toHaveCount(0);

  const navigation = page.getByTestId("bottom-navigation");
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Directory" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "History" })).toBeVisible();

  for (const link of await navigation.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }

  const firstExercise = page.locator(".exercise-card").first();
  await expect(firstExercise.locator(".exercise-card__name")).toBeVisible();
  await expect(
    firstExercise.locator(".exercise-card__programming"),
  ).toContainText("working sets");

  await firstExercise.locator("button").first().click();
  const weightInput = firstExercise.locator('input[id^="weight-"]');
  const saveButton = firstExercise.getByRole("button", { name: "Save" });
  await expect(weightInput).toHaveAttribute("inputmode", "decimal");
  await expect(saveButton).toBeVisible();
  expect((await saveButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("uses bottom navigation for directory, history, and home", async ({
  browserName,
  page,
}) => {
  await page.goto("/#/workout?week=0&day=0");

  const navigation = page.getByTestId("bottom-navigation");
  await page.evaluate(() => {
    const scrollTo = window.scrollTo.bind(window);
    window.routeResetCalls = 0;
    window.scrollTo = (...args) => {
      const [position] = args;
      if (position?.top === 0 && position?.left === 0) {
        window.routeResetCalls += 1;
      }
      scrollTo(...args);
    };
  });

  if (browserName === "chromium") {
    await page.evaluate(() => {
      document.querySelector("#appContent").style.paddingBottom = "1000px";
      document.scrollingElement.scrollTop =
        document.scrollingElement.scrollHeight;
    });
    expect(
      await page.evaluate(() => document.scrollingElement.scrollTop),
    ).toBeGreaterThan(0);
  }

  await navigation.getByRole("link", { name: "Directory" }).click();
  await expect
    .poll(() => page.evaluate(() => window.routeResetCalls))
    .toBeGreaterThan(0);

  await expect(
    page.getByRole("heading", { name: "Week 1", exact: true }),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "History" }).click();
  await expect(page.getByPlaceholder("Search exercises...")).toBeVisible();

  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(
    page.getByRole("heading", { name: "Legs (Hypertrophy Focus)", level: 1 }),
  ).toBeVisible();
});

test("opens the directory and loads a selected workout route", async ({
  page,
}) => {
  await page.goto("/#/directory");

  await expect(
    page.getByRole("heading", { name: "Week 1", exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href="#/workout?week=0&day=0"]')).toBeVisible();

  await page.goto("/#/workout?week=0&day=0");

  await expect(
    page.locator("#appContent .exercise-card button").first(),
  ).toBeVisible();
});

test("positions the directory at the current week once and keeps workout links usable", async ({
  page,
}) => {
  await recordDirectoryScrollRequests(page);
  await page.goto("/#/directory");

  await expect
    .poll(() => page.evaluate(() => window.directoryScrollRequests))
    .toEqual([{ behavior: "smooth", block: "start", weekIndex: "0" }]);
  await expect(page.locator('[data-current-week="true"]')).toContainText(
    "Current",
  );

  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(50);
  expect(
    await page.evaluate(() => window.directoryScrollRequests),
  ).toHaveLength(1);

  await page.locator('a[href="#/workout?week=0&day=0"]').click();
  await expect(page.locator(".exercise-card").first()).toBeVisible();
});

test("uses immediate directory positioning when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordDirectoryScrollRequests(page);
  await page.goto("/#/directory");

  await expect
    .poll(() => page.evaluate(() => window.directoryScrollRequests))
    .toEqual([{ behavior: "auto", block: "start", weekIndex: "0" }]);
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

  await expect
    .poll(async () => {
      const toastBox = await page.locator(".toastify").boundingBox();
      const navigationBox = await page
        .getByTestId("bottom-navigation")
        .boundingBox();
      return (
        toastBox !== null &&
        navigationBox !== null &&
        toastBox.y + toastBox.height <= navigationBox.y
      );
    })
    .toBe(true);

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
