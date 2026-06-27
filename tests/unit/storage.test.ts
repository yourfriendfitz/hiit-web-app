import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import {
  DB_VERSION,
  IndexedDBWeightStorage,
  type WeightStorage,
} from "../../src/storage";
import { DB_NAME, WEIGHT_STORE, type WeightRecord } from "../../src/types";

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

const seedCompatibleRecords = (records: WeightRecord[]) =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(WEIGHT_STORE, {
        autoIncrement: true,
      });
      store.createIndex("id", "id", { unique: false });
      store.createIndex("date", "date", { unique: false });
      store.createIndex("weight", "weight", { unique: false });
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

afterEach(async () => {
  createdStorage.splice(0).forEach((storage) => storage.close());
  await deleteDatabase();
});

describe("IndexedDBWeightStorage", () => {
  it("opens the existing version-1 compatibility contract without migration", async () => {
    await seedCompatibleRecords([]);

    const db = await createStorage().open();

    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
    expect(Array.from(db.objectStoreNames)).toEqual([WEIGHT_STORE]);

    const tx = db.transaction(WEIGHT_STORE, "readonly");
    const store = tx.objectStore(WEIGHT_STORE);
    expect(Array.from(store.indexNames)).toEqual(["date", "id", "weight"]);
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
});
