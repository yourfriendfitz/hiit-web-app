import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import {
  DB_VERSION,
  IndexedDBWeightStorage,
  type WeightStorage,
} from "../../src/storage";
import {
  DB_NAME,
  WEIGHT_STORE,
  type WeightRecord,
  type WeightRecordContext,
} from "../../src/types";

const createdStorage: WeightStorage[] = [];

const createStorage = () => {
  const storage = new IndexedDBWeightStorage({
    indexedDB,
    keyRange: IDBKeyRange,
  });
  createdStorage.push(storage);
  return storage;
};

const deleteDatabase = () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error || new Error("Failed to delete test database."));
    request.onblocked = () =>
      reject(new Error("Test database deletion was blocked."));
  });

function createLegacyIndexes(store: IDBObjectStore) {
  store.createIndex("id", "id", { unique: false });
  store.createIndex("date", "date", { unique: false });
  store.createIndex("weight", "weight", { unique: false });
}

function createCurrentIndexes(store: IDBObjectStore) {
  createLegacyIndexes(store);
  store.createIndex(
    "exerciseCycleContext",
    ["id", "cycleLength", "cycleWeek", "workoutDay"],
    { unique: false },
  );
}

const seedCompatibleRecords = (records: WeightRecord[]) =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(WEIGHT_STORE, {
        autoIncrement: true,
      });
      createCurrentIndexes(store);
    };

    request.onerror = () =>
      reject(request.error || new Error("Failed to seed test database."));

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(WEIGHT_STORE, "readwrite");
      const store = tx.objectStore(WEIGHT_STORE);

      records.forEach((record) => store.put(record));

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () =>
        reject(tx.error || new Error("Failed to seed test records."));
    };
  });

const seedVersion1Database = (records: WeightRecord[]) =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(WEIGHT_STORE, {
        autoIncrement: true,
      });
      createLegacyIndexes(store);
    };

    request.onerror = () =>
      reject(
        request.error || new Error("Failed to seed version-1 test database."),
      );

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(WEIGHT_STORE, "readwrite");
      const store = tx.objectStore(WEIGHT_STORE);

      records.forEach((record) => store.put(record));

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () =>
        reject(tx.error || new Error("Failed to seed version-1 records."));
    };
  });

const expectCurrentIndexNames = (store: IDBObjectStore) => {
  expect(Array.from(store.indexNames)).toEqual([
    "date",
    "exerciseCycleContext",
    "id",
    "weight",
  ]);
};

const cycleWeekOneDayOneContext: WeightRecordContext = {
  programWeek: 1,
  cycle: 1,
  cycleWeek: 1,
  cycleLength: 12,
  workoutDay: 1,
};

const cycleWeekTwoDayTwoContext: WeightRecordContext = {
  programWeek: 14,
  cycle: 2,
  cycleWeek: 2,
  cycleLength: 12,
  workoutDay: 2,
};

afterEach(async () => {
  createdStorage.splice(0).forEach((storage) => storage.close());
  await deleteDatabase();
});

describe("IndexedDBWeightStorage", () => {
  it("opens the current storage contract", async () => {
    await seedCompatibleRecords([]);

    const db = await createStorage().open();

    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
    expect(Array.from(db.objectStoreNames)).toEqual([WEIGHT_STORE]);

    const tx = db.transaction(WEIGHT_STORE, "readonly");
    const store = tx.objectStore(WEIGHT_STORE);
    expectCurrentIndexNames(store);
  });

  it("upgrades a version-1 database to version 2 while preserving records", async () => {
    const existingRecord: WeightRecord = {
      id: "incline",
      weight: "95 lbs",
      date: "2026-05-01T12:00:00.000Z",
    };
    await seedVersion1Database([existingRecord]);

    const storage = createStorage();
    const db = await storage.open();

    expect(db.version).toBe(DB_VERSION);
    expect(db.version).toBe(2);

    const tx = db.transaction(WEIGHT_STORE, "readonly");
    const store = tx.objectStore(WEIGHT_STORE);
    expectCurrentIndexNames(store);
    await expect(storage.listWeights()).resolves.toEqual([existingRecord]);
  });

  it("shares one pending connection while the database opens", async () => {
    const storage = createStorage();

    const firstOpen = storage.open();
    const secondOpen = storage.open();

    expect(secondOpen).toBe(firstOpen);
    await expect(firstOpen).resolves.toMatchObject({
      name: DB_NAME,
      version: DB_VERSION,
    });
  });

  it("reads legacy-compatible records with Date and parseable string dates", async () => {
    await seedCompatibleRecords([
      {
        id: "incline",
        weight: "95 lbs",
        date: "2026-05-01T12:00:00.000Z",
      },
      {
        id: "incline",
        weight: "105 lbs",
        date: new Date("2026-05-02T12:00:00.000Z"),
      },
    ]);

    await expect(createStorage().getLatestWeight("incline")).resolves.toBe(
      "105 lbs",
    );
  });

  it("selects the newest matching weight independent of insertion order", async () => {
    await seedCompatibleRecords([
      {
        id: "row",
        weight: "135 lbs",
        date: new Date("2026-05-03T12:00:00.000Z"),
      },
      {
        id: "row",
        weight: "115 lbs",
        date: new Date("2026-05-01T12:00:00.000Z"),
      },
      {
        id: "row",
        weight: "125 lbs",
        date: new Date("2026-05-02T12:00:00.000Z"),
      },
    ]);

    await expect(createStorage().getLatestWeight("row")).resolves.toBe(
      "135 lbs",
    );
  });

  it("writes exactly the legacy-compatible record shape", async () => {
    const storage = createStorage();

    await storage.saveWeight("curl", "40s; 9 for 95 9 RPE*");

    const [record] = await storage.listWeights();
    expect(Object.keys(record).sort()).toEqual(["date", "id", "weight"]);
    expect(record).toEqual({
      id: "curl",
      weight: "40s; 9 for 95 9 RPE*",
      date: expect.any(Date),
    });
  });

  it("writes optional cycle context fields when context is provided", async () => {
    const storage = createStorage();

    await storage.saveWeight(
      "curl",
      "40s; 9 for 95 9 RPE*",
      cycleWeekTwoDayTwoContext,
    );

    const [record] = await storage.listWeights();
    expect(record).toEqual({
      id: "curl",
      weight: "40s; 9 for 95 9 RPE*",
      date: expect.any(Date),
      programWeek: 14,
      cycle: 2,
      cycleWeek: 2,
      cycleLength: 12,
      workoutDay: 2,
    });
  });

  it("returns a cycle-context match before a newer wrong-context record", async () => {
    await seedCompatibleRecords([
      {
        id: "press",
        weight: "Cycle context 95",
        date: "2026-05-01T12:00:00.000Z",
        ...cycleWeekOneDayOneContext,
      },
      {
        id: "press",
        weight: "Wrong context 135",
        date: "2026-05-02T12:00:00.000Z",
        ...cycleWeekTwoDayTwoContext,
      },
    ]);

    await expect(
      createStorage().getBestWeightForContext(
        "press",
        cycleWeekOneDayOneContext,
      ),
    ).resolves.toMatchObject({
      source: "cycle-context",
      weight: "Cycle context 95",
      record: {
        weight: "Cycle context 95",
        cycleWeek: 1,
        workoutDay: 1,
      },
    });
  });

  it("falls back to the newest same-exercise record without an exact context match", async () => {
    await seedCompatibleRecords([
      {
        id: "row",
        weight: "115 lbs",
        date: "2026-05-01T12:00:00.000Z",
      },
      {
        id: "row",
        weight: "135 lbs",
        date: "2026-05-02T12:00:00.000Z",
      },
    ]);

    await expect(
      createStorage().getBestWeightForContext("row", cycleWeekOneDayOneContext),
    ).resolves.toEqual({
      source: "exercise-fallback",
      weight: "135 lbs",
      record: {
        id: "row",
        weight: "135 lbs",
        date: "2026-05-02T12:00:00.000Z",
      },
    });
  });

  it("returns an empty none result when no record exists", async () => {
    await expect(
      createStorage().getBestWeightForContext(
        "missing",
        cycleWeekOneDayOneContext,
      ),
    ).resolves.toEqual({
      source: "none",
      weight: "",
      record: null,
    });
  });

  it("lists every existing record", async () => {
    const seededRecords: WeightRecord[] = [
      {
        id: "press",
        weight: "95 lbs",
        date: new Date("2026-05-01T12:00:00.000Z"),
      },
      {
        id: "curl",
        weight: "35 lbs",
        date: "2026-05-02T12:00:00.000Z",
      },
    ];
    await seedCompatibleRecords(seededRecords);

    await expect(createStorage().listWeights()).resolves.toEqual(seededRecords);
  });

  it("bulk imports legacy-compatible records without a schema migration", async () => {
    const storage = createStorage();

    await expect(
      storage.importWeights([
        {
          id: "press",
          weight: "Imported 95",
          date: "2026-06-01T12:00:00.000Z",
        },
        {
          id: "row",
          weight: "Imported 135",
          date: "2026-06-02T12:00:00.000Z",
        },
      ]),
    ).resolves.toBe(2);

    const db = await storage.open();
    expect(db.version).toBe(DB_VERSION);
    expect(Array.from(db.objectStoreNames)).toEqual([WEIGHT_STORE]);
    await expect(storage.listWeights()).resolves.toEqual([
      {
        id: "press",
        weight: "Imported 95",
        date: "2026-06-01T12:00:00.000Z",
      },
      {
        id: "row",
        weight: "Imported 135",
        date: "2026-06-02T12:00:00.000Z",
      },
    ]);
  });

  it("imports context-bearing records that can be queried by exact context", async () => {
    const storage = createStorage();

    await expect(
      storage.importWeights([
        {
          id: "press",
          weight: "Imported context 95",
          date: "2026-06-01T12:00:00.000Z",
          ...cycleWeekOneDayOneContext,
        },
      ]),
    ).resolves.toBe(1);

    await expect(
      storage.getBestWeightForContext("press", cycleWeekOneDayOneContext),
    ).resolves.toMatchObject({
      source: "cycle-context",
      weight: "Imported context 95",
      record: {
        programWeek: 1,
        cycle: 1,
        cycleWeek: 1,
        cycleLength: 12,
        workoutDay: 1,
      },
    });
  });
});
