import { DB_NAME, WEIGHT_STORE, type WeightRecord } from "./types";

let dbInstance: IDBDatabase | null = null;

export function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(WEIGHT_STORE)) {
        const store = db.createObjectStore(WEIGHT_STORE, {
          autoIncrement: true,
        });
        store.createIndex("id", "id", { unique: false });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("weight", "weight", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () =>
      reject(new Error("Failed to initialize IndexedDB."));
    request.onblocked = () =>
      reject(new Error("IndexedDB initialization blocked."));
  });
}

export async function storeWeight(id: string, weight: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(WEIGHT_STORE, "readwrite");
  tx.objectStore(WEIGHT_STORE).put({ id, weight, date: new Date() });

  return new Promise((resolve) => {
    tx.oncomplete = () => {
      window.dispatchEvent(new Event("dbUpdated"));
      resolve();
    };

    tx.onerror = () => {
      console.error("Failed to store weight:", tx.error);
      resolve();
    };
  });
}

export async function getWeight(id: string): Promise<string> {
  const db = await initDB();
  const tx = db.transaction(WEIGHT_STORE, "readonly");
  const store = tx.objectStore(WEIGHT_STORE);
  const index = store.index("id");
  const request = index.openCursor(IDBKeyRange.only(id));

  return new Promise((resolve) => {
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

      resolve(mostRecentEntry ? mostRecentEntry.weight : "");
    };

    request.onerror = () => {
      console.error(`Request failed for id: ${id}`);
      resolve("");
    };
  });
}

export async function getAllWeights(): Promise<WeightRecord[]> {
  const db = await initDB();
  const tx = db.transaction(WEIGHT_STORE, "readonly");
  const store = tx.objectStore(WEIGHT_STORE);

  return new Promise((resolve) => {
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

    request.onerror = () => {
      console.error("Failed to fetch weights:", request.error);
      resolve(weights);
    };
  });
}
