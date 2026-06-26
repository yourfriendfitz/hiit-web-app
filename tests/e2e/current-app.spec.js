import { expect, test } from "@playwright/test";

const TEST_NOW = "2025-08-04T12:00:00-05:00";

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

async function getLastWeightRecord(page) {
  return page.evaluate(async () => {
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
    return records.at(-1);
  });
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
    page.getByRole("heading", { name: "Upper (Strength Focus)", level: 1 }),
  ).toBeVisible();
  await expect(page.locator(".route-header__subtitle")).toHaveText(
    "Cycle Week 2/12 • Day 1",
  );
  await expect(page.locator(".exercise-card button").first()).toBeVisible();
  await expect(page.locator("#versionIndicator")).toHaveText("v4.1.0");
});

test("adds and removes one recent missed workout from home", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("workout-section")).toHaveCount(1);
  await page.getByRole("button", { name: "Add missed workout" }).click();

  const quickAddOptions = page.locator(".quick-add__option");
  await expect(quickAddOptions).toHaveCount(2);
  await expect(quickAddOptions.first()).toContainText("Fri, Aug 1");
  await expect(quickAddOptions.nth(1)).toContainText("Thu, Jul 31");
  await quickAddOptions.first().click();

  const workoutSections = page.getByTestId("workout-section");
  await expect(workoutSections).toHaveCount(2);
  await expect(workoutSections.first()).toContainText("Today");
  await expect(workoutSections.nth(1)).toContainText("Added missed workout");
  await expect(workoutSections.nth(1)).toContainText(
    "Fri, Aug 1 • Cycle Week 1/12 • Day 5",
  );
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

  await expect(
    firstExercise.locator(".exercise-card__status .weight-badge"),
  ).toContainText("Added 155");
  await expect
    .poll(() => getLastWeightRecord(page).then((record) => record?.id))
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
  await expect(weightInput).toHaveAttribute("inputmode", "text");
  await expect(saveButton).toBeVisible();
  expect((await saveButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("collapses expanded exercise details as one grid transition", async ({
  page,
}) => {
  await page.goto("/#/workout?week=0&day=0");

  const firstExercise = page.locator(".exercise-card").first();
  const accordion = firstExercise.locator(".accordion-content");
  await firstExercise.locator("button").first().click();
  await expect(accordion).toHaveClass(/open/);

  await firstExercise.locator("button").first().click();

  expect(
    await accordion.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        maxHeight: styles.maxHeight,
        transitionProperty: styles.transitionProperty,
      };
    }),
  ).toEqual({
    maxHeight: "none",
    transitionProperty: "grid-template-rows",
  });

  await expect(accordion).toHaveCSS("grid-template-rows", "0px");
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
    page.getByRole("heading", { name: "Program Week 1", exact: true }),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "History" }).click();
  await expect(page.getByPlaceholder("Search exercises...")).toBeVisible();

  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(
    page.getByRole("heading", { name: "Upper (Strength Focus)", level: 1 }),
  ).toBeVisible();
});

test("opens the directory and loads a selected workout route", async ({
  page,
}) => {
  await page.goto("/#/directory");

  await expect(
    page.getByRole("heading", { name: "Program Week 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cycle 1 of 8", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-cycle-index="0"]')).toHaveJSProperty(
    "open",
    true,
  );
  await expect(page.locator('[data-cycle-index="1"]')).toHaveJSProperty(
    "open",
    false,
  );
  await page.locator('[data-cycle-index="1"] > summary').click();
  await expect(page.locator('[data-cycle-index="1"]')).toHaveJSProperty(
    "open",
    true,
  );
  await expect(
    page.getByRole("heading", { name: "Program Week 13", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-week-index="0"]')).toHaveJSProperty(
    "open",
    false,
  );
  await expect(page.locator('[data-week-index="1"]')).toHaveJSProperty(
    "open",
    true,
  );
  await expect(page.locator('a[href="#/workout?week=0&day=0"]')).toBeHidden();
  await page.locator('[data-week-index="0"] > summary').click();
  await expect(page.locator('a[href="#/workout?week=0&day=0"]')).toBeVisible();

  await page.goto("/#/workout?week=0&day=0");

  await expect(page.locator(".route-header__subtitle")).toHaveText(
    "Cycle Week 1/12 • Day 1",
  );
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
    .toEqual([{ behavior: "smooth", block: "start", weekIndex: "1" }]);
  await expect(page.locator('[data-current-week="true"]')).toContainText(
    "Current",
  );
  await expect(page.locator('[data-current-week="true"]')).toContainText(
    "Cycle Week 2/12",
  );
  await expect(page.locator('[data-current-week="true"]')).toHaveJSProperty(
    "open",
    true,
  );

  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(50);
  expect(
    await page.evaluate(() => window.directoryScrollRequests),
  ).toHaveLength(1);

  await page.locator('[data-week-index="0"] > summary').click();
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
    .toEqual([{ behavior: "auto", block: "start", weekIndex: "1" }]);
});

test("saves a free-text weight and shows it in history", async ({ page }) => {
  await page.goto("/#/workout?week=0&day=0");

  const freeTextWeight = "40s; 9 for 95 9 RPE*";
  const firstExercise = page.locator(".exercise-card").first();
  await firstExercise.locator("button").first().click();
  await firstExercise.locator('input[id^="weight-"]').fill(freeTextWeight);
  await firstExercise.getByRole("button", { name: "Save" }).click();

  await expect(
    firstExercise.locator(".exercise-card__status .weight-badge"),
  ).toContainText(freeTextWeight);

  const fullLatestWeight = firstExercise.locator(".weight-badge--full");
  await expect(fullLatestWeight).toContainText(
    `${freeTextWeight} [Sets: 2, Reps: 6, Early RPE: ~6-7, Last RPE: ~7-8]`,
  );
  await expect(fullLatestWeight.locator(".weight-value")).toHaveCSS(
    "white-space",
    "normal",
  );
  expect(
    await fullLatestWeight.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);

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
  await expect(page.getByText(/40s; 9 for 95 9 RPE\*/)).toBeVisible();
});

test("stores stable context when optional RPE fields are absent", async ({
  page,
}) => {
  await page.route("**/data.json", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    delete data[0][0].exercises[0].earlyRpe;
    delete data[0][0].exercises[0].lastRpe;
    await route.fulfill({ response, json: data });
  });

  await page.goto("/#/workout?week=0&day=0");

  const firstExercise = page.locator(".exercise-card").first();
  await firstExercise.locator("button").first().click();
  await expect(firstExercise.getByText("N/A", { exact: true })).toHaveCount(2);
  await firstExercise.locator('input[id^="weight-"]').fill("Fallback 145");
  await firstExercise.getByRole("button", { name: "Save" }).click();

  await expect
    .poll(() => getLastWeightRecord(page).then((record) => record?.weight))
    .toBe("Fallback 145 [Sets: 2, Reps: 6, Early RPE: N/A, Last RPE: N/A]");
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
    {
      id: "retiredexercise",
      weight: "Legacy unknown 50",
      date: "2025-07-28T12:00:00.000Z",
    },
  ]);

  await page.goto("/#/workout?week=0&day=0");

  const firstExercise = page.locator(".exercise-card").first();
  await firstExercise.locator("button").first().click();
  await expect(
    firstExercise.locator(".exercise-card__status .weight-badge"),
  ).toContainText("Legacy 105");

  await page.goto("/#/history");

  const search = page.getByPlaceholder("Search exercises...");
  await expect(page.getByText("Legacy 105")).toBeVisible();
  await expect(page.getByText("Legacy 70")).toBeVisible();
  await expect(page.getByText("retiredexercise")).toBeVisible();
  await expect(page.getByText("Legacy unknown 50")).toBeVisible();

  await search.fill("Incline Barbell");

  await expect(page.getByText("Legacy 105")).toBeVisible();
  await expect(page.getByText("Legacy 70")).toBeHidden();
  await expect(page.getByText("Legacy unknown 50")).toBeHidden();

  await search.fill("retiredexercise");

  await expect(page.getByText("Legacy 105")).toBeHidden();
  await expect(page.getByText("Legacy unknown 50")).toBeVisible();
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
    page.getByRole("heading", { name: "Program Week 1", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.getDbUpdatedListenerCount()))
    .toBe(0);
});
