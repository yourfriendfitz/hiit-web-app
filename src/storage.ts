import {
  DB_NAME,
  WEIGHT_STORE,
  type WeightRecord,
  type WeightRecordContext,
} from "./types";

export const DB_VERSION = 2;
const EXERCISE_CYCLE_CONTEXT_INDEX = "exerciseCycleContext";

export type WeightLookupSource = "cycle-context" | "exercise-fallback" | "none";

export type WeightLookupResult = {
  record: WeightRecord | null;
  source: WeightLookupSource;
  weight: string;
};

type StorageAdapterOptions = {
  indexedDB: IDBFactory;
  keyRange: typeof IDBKeyRange;
  onUpdated?: () => void;
};

export interface WeightStorage {
  open(): Promise<IDBDatabase>;
  getBestWeightForContext(
    id: string,
    context: WeightRecordContext,
  ): Promise<WeightLookupResult>;
  getLatestWeight(id: string): Promise<string>;
  importWeights(records: WeightRecord[]): Promise<number>;
  listWeights(): Promise<WeightRecord[]>;
  saveWeight(
    id: string,
    weight: string,
    context?: WeightRecordContext,
  ): Promise<void>;
  close(): void;
}

export class IndexedDBWeightStorage implements WeightStorage {
  private dbInstance: IDBDatabase | null = null;
  private pendingOpen: Promise<IDBDatabase> | null = null;
  private readonly indexedDB: IDBFactory;
  private readonly keyRange: typeof IDBKeyRange;
  private readonly onUpdated?: () => void;

  constructor({ indexedDB, keyRange, onUpdated }: StorageAdapterOptions) {
    this.indexedDB = indexedDB;
    this.keyRange = keyRange;
    this.onUpdated = onUpdated;
  }

  open(): Promise<IDBDatabase> {
    if (this.dbInstance) {
      return Promise.resolve(this.dbInstance);
    }

    if (this.pendingOpen) {
      return this.pendingOpen;
    }

    this.pendingOpen = new Promise((resolve, reject) => {
      const request = this.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        let store: IDBObjectStore;

        if (!db.objectStoreNames.contains(WEIGHT_STORE)) {
          store = db.createObjectStore(WEIGHT_STORE, {
            autoIncrement: true,
          });
        } else {
          store = (event.target as IDBOpenDBRequest).transaction!.objectStore(
            WEIGHT_STORE,
          );
        }

        this.ensureIndexes(store);
      };

      request.onsuccess = (event) => {
        this.dbInstance = (event.target as IDBOpenDBRequest).result;
        this.dbInstance.onversionchange = () => this.close();
        this.pendingOpen = null;
        resolve(this.dbInstance);
      };

      request.onerror = () => {
        this.pendingOpen = null;
        reject(new Error("Failed to initialize IndexedDB."));
      };
      request.onblocked = () => {
        this.pendingOpen = null;
        reject(new Error("IndexedDB initialization blocked."));
      };
    });

    return this.pendingOpen;
  }

  private ensureIndexes(store: IDBObjectStore) {
    if (!store.indexNames.contains("id")) {
      store.createIndex("id", "id", { unique: false });
    }

    if (!store.indexNames.contains("date")) {
      store.createIndex("date", "date", { unique: false });
    }

    if (!store.indexNames.contains("weight")) {
      store.createIndex("weight", "weight", { unique: false });
    }

    if (!store.indexNames.contains(EXERCISE_CYCLE_CONTEXT_INDEX)) {
      store.createIndex(
        EXERCISE_CYCLE_CONTEXT_INDEX,
        ["id", "cycleLength", "cycleWeek", "workoutDay"],
        { unique: false },
      );
    }
  }

  async saveWeight(
    id: string,
    weight: string,
    context?: WeightRecordContext,
  ): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(WEIGHT_STORE, "readwrite");
    tx.objectStore(WEIGHT_STORE).put({
      id,
      weight,
      date: new Date(),
      ...context,
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        this.onUpdated?.();
        resolve();
      };

      tx.onerror = () =>
        reject(tx.error || new Error("Failed to store weight."));
      tx.onabort = () =>
        reject(tx.error || new Error("Weight transaction aborted."));
    });
  }

  async importWeights(records: WeightRecord[]): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    const db = await this.open();
    const tx = db.transaction(WEIGHT_STORE, "readwrite");
    const store = tx.objectStore(WEIGHT_STORE);

    records.forEach((record) => {
      store.put(record);
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        this.onUpdated?.();
        resolve(records.length);
      };

      tx.onerror = () =>
        reject(tx.error || new Error("Failed to import weights."));
      tx.onabort = () =>
        reject(tx.error || new Error("Weight import transaction aborted."));
    });
  }

  async getLatestWeight(id: string): Promise<string> {
    const record = await this.getLatestWeightRecord(id);
    return record ? record.weight : "";
  }

  async getBestWeightForContext(
    id: string,
    context: WeightRecordContext,
  ): Promise<WeightLookupResult> {
    const contextRecord = await this.getLatestWeightRecordByCycleContext(
      id,
      context,
    );

    if (contextRecord) {
      return {
        record: contextRecord,
        source: "cycle-context",
        weight: contextRecord.weight,
      };
    }

    const fallbackRecord = await this.getLatestWeightRecord(id);

    if (fallbackRecord) {
      return {
        record: fallbackRecord,
        source: "exercise-fallback",
        weight: fallbackRecord.weight,
      };
    }

    return {
      record: null,
      source: "none",
      weight: "",
    };
  }

  private async getLatestWeightRecord(
    id: string,
  ): Promise<WeightRecord | null> {
    const db = await this.open();
    const tx = db.transaction(WEIGHT_STORE, "readonly");
    const store = tx.objectStore(WEIGHT_STORE);
    const index = store.index("id");
    const request = index.openCursor(this.keyRange.only(id));

    return this.getLatestRecordFromCursor(
      request,
      `Request failed for id: ${id}`,
    );
  }

  private async getLatestWeightRecordByCycleContext(
    id: string,
    context: WeightRecordContext,
  ): Promise<WeightRecord | null> {
    const db = await this.open();
    const tx = db.transaction(WEIGHT_STORE, "readonly");
    const store = tx.objectStore(WEIGHT_STORE);
    const index = store.index(EXERCISE_CYCLE_CONTEXT_INDEX);
    const request = index.openCursor(
      this.keyRange.only([
        id,
        context.cycleLength,
        context.cycleWeek,
        context.workoutDay,
      ]),
    );

    return this.getLatestRecordFromCursor(
      request,
      `Request failed for cycle context: ${id}`,
    );
  }

  private getLatestRecordFromCursor(
    request: IDBRequest<IDBCursorWithValue | null>,
    errorMessage: string,
  ): Promise<WeightRecord | null> {
    return new Promise((resolve, reject) => {
      let mostRecentEntry: WeightRecord | null = null;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
          .result;

        if (cursor) {
          if (
            !mostRecentEntry ||
            new Date(cursor.value.date) > new Date(mostRecentEntry.date)
          ) {
            mostRecentEntry = cursor.value as WeightRecord;
          }
          cursor.continue();
          return;
        }

        resolve(mostRecentEntry);
      };

      request.onerror = () => reject(request.error || new Error(errorMessage));
    });
  }

  async listWeights(): Promise<WeightRecord[]> {
    const db = await this.open();
    const tx = db.transaction(WEIGHT_STORE, "readonly");
    const store = tx.objectStore(WEIGHT_STORE);

    return new Promise((resolve, reject) => {
      const weights: WeightRecord[] = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
          .result;

        if (cursor) {
          weights.push(cursor.value as WeightRecord);
          cursor.continue();
          return;
        }

        resolve(weights);
      };

      request.onerror = () =>
        reject(request.error || new Error("Failed to fetch weights."));
    });
  }

  close() {
    this.dbInstance?.close();
    this.dbInstance = null;
    this.pendingOpen = null;
  }
}

export function createBrowserWeightStorage(): IndexedDBWeightStorage {
  return new IndexedDBWeightStorage({
    indexedDB: window.indexedDB,
    keyRange: window.IDBKeyRange,
    onUpdated: () => window.dispatchEvent(new Event("dbUpdated")),
  });
}

let browserWeightStorage: IndexedDBWeightStorage | null = null;

export function getBrowserWeightStorage(): IndexedDBWeightStorage {
  browserWeightStorage ||= createBrowserWeightStorage();
  return browserWeightStorage;
}

export const initDB = () => getBrowserWeightStorage().open();
export const storeWeight = (
  id: string,
  weight: string,
  context?: WeightRecordContext,
) => getBrowserWeightStorage().saveWeight(id, weight, context);
export const importWeights = (records: WeightRecord[]) =>
  getBrowserWeightStorage().importWeights(records);
export const getWeight = (id: string) =>
  getBrowserWeightStorage().getLatestWeight(id);
export const getWeightForContext = (id: string, context: WeightRecordContext) =>
  getBrowserWeightStorage().getBestWeightForContext(id, context);
export const getAllWeights = () => getBrowserWeightStorage().listWeights();
