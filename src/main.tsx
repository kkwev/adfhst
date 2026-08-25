import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// ==========================================
// iOS Safari / WebKit Compatibility Polyfills
// ==========================================

// 1. globalThis polyfill
if (typeof globalThis === 'undefined') {
  (function() {
    if (typeof self !== 'undefined') {
      (self as any).globalThis = self;
    } else if (typeof window !== 'undefined') {
      (window as any).globalThis = window;
    }
  })();
}

// 2. crypto.randomUUID polyfill
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  crypto.randomUUID = function(): `${string}-${string}-${string}-${string}-${string}` {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}

// 3. requestIdleCallback / cancelIdleCallback polyfill
if (typeof window !== 'undefined') {
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = function(cb: any) {
      const start = Date.now();
      return window.setTimeout(function() {
        cb({
          didTimeout: false,
          timeRemaining: function() {
            return Math.max(0, 50 - (Date.now() - start));
          }
        });
      }, 1);
    } as any;
  }
  if (!window.cancelIdleCallback) {
    window.cancelIdleCallback = function(id: number) {
      clearTimeout(id);
    };
  }
}

// 4. Array.prototype.at polyfill
if (!Array.prototype.at) {
  Array.prototype.at = function(n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// 5. String.prototype.replaceAll polyfill
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(searchValue: any, replaceValue: any) {
    if (searchValue instanceof RegExp) {
      return this.replace(searchValue, replaceValue);
    }
    return this.split(searchValue).join(replaceValue);
  };
}

// 6. Object.hasOwn polyfill
if (!Object.hasOwn) {
  Object.hasOwn = function(obj: any, prop: any) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// 7. structuredClone polyfill
if (typeof window !== 'undefined' && !(window as any).structuredClone) {
  (window as any).structuredClone = function(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Monkey-patch localStorage.setItem to gracefully handle and recover from QuotaExceededError (5MB browser limit)
// Safely wrapped with fallback so restricted Safari/WebKit environments never throw an unhandled exception
const memoryStorageMap = new Map<string, string>();

let originalSetItem: ((key: string, value: string) => void) | null = null;
let originalGetItem: ((key: string) => string | null) | null = null;
let originalRemoveItem: ((key: string) => void) | null = null;

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    originalGetItem = window.localStorage.getItem.bind(window.localStorage);
    originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
  }
} catch (e) {
  console.warn('[Storage] localStorage access is restricted on this device. Using memory storage fallback.');
}

if (originalGetItem && originalSetItem && originalRemoveItem) {
  try {
    localStorage.getItem = function(key: string) {
      try {
        if (originalGetItem) {
          const val = originalGetItem(key);
          if (val !== null) return val;
        }
      } catch (e) {}
      return memoryStorageMap.get(key) || null;
    };

    localStorage.removeItem = function(key: string) {
      try {
        if (originalRemoveItem) {
          originalRemoveItem(key);
        }
      } catch (e) {}
      memoryStorageMap.delete(key);
    };
  } catch (patchErr) {
    console.warn('[Storage] Readonly Storage prototype in Safari WebKit. Fallback memory mapping active.');
  }
}

// Helper to strip/optimize heavy base64 strings from data structures when quota is tight
function pruneHeavyBase64Data(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/') && obj.length > 300000) {
      // Replace oversized base64 with a lightweight stock image fallback
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

if (originalSetItem && originalGetItem && originalRemoveItem) {
  try {
    localStorage.setItem = function(key: string, value: string) {
      memoryStorageMap.set(key, value); // Always store in memory fallback
      try {
        // 1. Try normal unmodified write
        if (originalSetItem) {
          originalSetItem(key, value);
        }
      } catch (e: any) {
        const isQuotaError = 
          (typeof DOMException !== 'undefined' && e instanceof DOMException && (
            e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
            e.code === 22 ||
            e.code === 1014
          )) || (e && (e.name === "QuotaExceededError" || String(e.message || e).toLowerCase().includes("quota")));

        if (isQuotaError) {
          console.warn(`⚠️ [localStorage] Storage space limit reached. Cleaning non-critical history to save key "${key}"...`);
          try {
            // 1. Remove non-critical action logs
            try { if (originalRemoveItem) originalRemoveItem("paopao_online_actions_log"); } catch (err) {}

            // 2. Optimize image data in history arrays without deleting any transaction or notification records
            const arraysToPrune = [
              { key: "paopao_chats", stripImage: true },
              { key: "paopao_notifications", stripImage: false },
              { key: "paopao_orders", stripImage: true },
              { key: "paopao_withdrawals", stripImage: false },
              { key: "paopao_deposits", stripImage: true }
            ];

            for (const item of arraysToPrune) {
              try {
                if (originalGetItem && originalSetItem) {
                  const raw = originalGetItem(item.key);
                  if (raw) {
                    let parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                      if (item.stripImage) {
                        if (item.key === "paopao_chats") {
                          parsed = parsed.map((c: any) => ({
                            ...c,
                            image: (c.image && c.image.startsWith("data:")) ? "" : c.image
                          }));
                        } else if (item.key === "paopao_deposits") {
                          parsed = parsed.map((d: any) => {
                            if (d.status !== "pending" && d.slipImage && d.slipImage.startsWith("data:")) {
                              return { ...d, slipImage: "" };
                            }
                            return d;
                          });
                        } else if (item.key === "paopao_orders") {
                          parsed = parsed.map((o: any) => {
                            if (o.items && Array.isArray(o.items)) {
                              return {
                                ...o,
                                items: o.items.map((it: any) => ({
                                  ...it,
                                  image: (it.image && it.image.startsWith("data:"))
                                    ? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=150"
                                    : it.image
                                }))
                              };
                            }
                            return o;
                          });
                        }
                      }
                      originalSetItem(item.key, JSON.stringify(parsed));
                    }
                  }
                }
              } catch (err) {}
            }

            // 3. Try writing key again after freeing up space
            try {
              if (originalSetItem) originalSetItem(key, value);
              return;
            } catch (retryErr1) {
              // 4. If still failing, prune heavy base64 data directly from the value being saved
              try {
                const parsedValue = JSON.parse(value);
                const prunedValue = JSON.stringify(pruneHeavyBase64Data(parsedValue));
                if (originalSetItem) originalSetItem(key, prunedValue);
                return;
              } catch (retryErr2) {
                // 5. Atomic fallback: remove key first then set pruned value
                try {
                  if (originalRemoveItem) originalRemoveItem(key);
                  const parsedValue = JSON.parse(value);
                  const prunedValue = JSON.stringify(pruneHeavyBase64Data(parsedValue));
                  if (originalSetItem) originalSetItem(key, prunedValue);
                  return;
                } catch (retryErr3) {
                  console.warn(`[localStorage] Safely operating in memory mode for key "${key}".`);
                }
              }
            }
          } catch (retryError) {
            console.warn(`[localStorage] Operating in memory fallback mode for key "${key}".`);
          }
        } else {
          console.warn(`[localStorage] setItem exception for "${key}". Saved to memory storage.`);
        }
      }
    };
  } catch (setItemPatchErr) {
    console.warn('[Storage] localStorage.setItem patch skipped safely in WebKit.');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

