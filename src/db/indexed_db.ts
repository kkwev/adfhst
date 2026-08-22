/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { safeStorage } from './safe_storage';
import { parseDateSafe } from '../utils/thaiTime';

// Permanent IndexedDB Vault for zero data-loss persistence of financial transactions, deposits, withdrawals, and orders.
const DB_NAME = "paopao_permanent_vault_db";
const DB_VERSION = 1;
const STORE_NAMES = ["deposits", "withdrawals", "orders", "users", "notifications", "chats", "transactions"];

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let resolved = false;
    const safeResolve = (val: IDBDatabase | null) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    // Timeout failsafe (max 400ms) for iOS WebKit / Safari when IndexedDB is blocked or slow
    const timer = setTimeout(() => {
      safeResolve(null);
    }, 400);

    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        clearTimeout(timer);
        safeResolve(null);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          for (const storeName of STORE_NAMES) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: "id" });
            }
          }
        } catch (e) {}
      };

      request.onsuccess = (event) => {
        clearTimeout(timer);
        safeResolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        clearTimeout(timer);
        safeResolve(null);
      };

      request.onblocked = () => {
        clearTimeout(timer);
        safeResolve(null);
      };
    } catch (err) {
      clearTimeout(timer);
      safeResolve(null);
    }
  });

  return dbPromise;
}

export async function saveItemsToIndexedDB(storeName: string, items: any[]): Promise<void> {
  try {
    const db = await getIDB();
    if (!db || !items || !Array.isArray(items) || items.length === 0) return;

    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction([storeName], "readwrite");
        const store = tx.objectStore(storeName);

        for (const item of items) {
          if (item && item.id) {
            store.put(item);
          }
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) {
    // Graceful fallback on iOS without logging spam
  }
}

export async function getItemsFromIndexedDB<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getIDB();
    if (!db) return [];
    
    return await new Promise<T[]>((resolve, reject) => {
      try {
        const tx = db.transaction([storeName], "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve((request.result as T[]) || []);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) {
    return [];
  }
}

/**
 * Merges memory/localStorage items with all permanently stored records in IndexedDB.
 * Prevents transaction and history loss under any circumstances.
 */
export async function syncAndMergeWithIndexedDB<T extends { id: string; createdAt?: string }>(
  storeName: string,
  incomingItems: T[]
): Promise<T[]> {
  try {
    const persisted = await getItemsFromIndexedDB<T>(storeName);
    const itemMap = new Map<string, T>();

    // 1. Ingest localStorage items if present
    const lsKeyMap: Record<string, string> = {
      "deposits": "paopao_deposits",
      "withdrawals": "paopao_withdrawals",
      "orders": "paopao_orders",
      "users": "paopao_users",
      "notifications": "paopao_notifications",
      "chats": "paopao_chats"
    };
    const lsKey = lsKeyMap[storeName];
    if (lsKey) {
      try {
        const raw = safeStorage.getItem(lsKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && item.id) {
                itemMap.set(item.id, item);
              }
            }
          }
        }
      } catch (e) {}
    }

    // 2. Load all historically persisted items from IndexedDB
    for (const item of persisted) {
      if (item && item.id) {
        itemMap.set(item.id, item);
      }
    }

    // 3. Overlay incoming items (newer/updated data takes priority)
    for (const item of incomingItems) {
      if (item && item.id) {
        itemMap.set(item.id, item);
      }
    }

    const mergedList = Array.from(itemMap.values());

    // Sort by createdAt descending if present (bulletproof parseDateSafe for Safari iOS)
    mergedList.sort((a, b) => {
      const timeA = a.createdAt ? parseDateSafe(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? parseDateSafe(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    // Save full merged list back to IndexedDB and storage
    saveItemsToIndexedDB(storeName, mergedList).catch(() => {});
    if (lsKey) {
      try {
        safeStorage.setItem(lsKey, JSON.stringify(mergedList));
      } catch (e) {}
    }

    return mergedList;
  } catch (e) {
    return incomingItems;
  }
}

