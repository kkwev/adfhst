/**
 * Safe Storage Abstraction with In-Memory Fallback
 * Fully compatible with iOS Safari (including Private Browsing mode & WebViews),
 * Android, and all modern browsers. Prevents fatal crashes from SecurityError or QuotaExceededError.
 */

const memoryStorage = new Map<string, string>();

let isLocalStorageAvailable = false;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
  }
} catch (e) {
  isLocalStorageAvailable = false;
}

// Helper to strip heavy base64 images if storage space is full
function pruneHeavyBase64Data(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/') && obj.length > 200000) {
      return "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=300";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => pruneHeavyBase64Data(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const k of Object.keys(obj)) {
      cleaned[k] = pruneHeavyBase64Data(obj[k]);
    }
    return cleaned;
  }
  return obj;
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (isLocalStorageAvailable) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {}
    }
    return memoryStorage.get(key) || null;
  },

  setItem(key: string, value: string): void {
    memoryStorage.set(key, value);
    if (!isLocalStorageAvailable) return;

    try {
      window.localStorage.setItem(key, value);
    } catch (e: any) {
      // Handle quota error
      try {
        const parsed = JSON.parse(value);
        const pruned = JSON.stringify(pruneHeavyBase64Data(parsed));
        window.localStorage.setItem(key, pruned);
      } catch (err) {
        // Fallback to memory
        memoryStorage.set(key, value);
      }
    }
  },

  removeItem(key: string): void {
    memoryStorage.delete(key);
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {}
    }
  }
};
