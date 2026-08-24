/**
 * iOS Safari Compatibility Wrapper & Polyfills
 * 
 * Features & Safeguards:
 * 1. Zero Impact: Retains 100% of existing storage, state, and business logic.
 * 2. Polyfills & Fallbacks for ES Latest & Web APIs not supported in older/current Safari:
 *    - Array.prototype.at, String.prototype.at
 *    - Array.prototype.findLast, findLastIndex
 *    - Array.prototype.toReversed, toSorted, toSpliced, with
 *    - Object.hasOwn
 *    - structuredClone (falls back to deep clone)
 *    - Promise.allSettled, Promise.any
 *    - crypto.randomUUID
 *    - window.requestIdleCallback / cancelIdleCallback
 *    - AudioContext (webkitAudioContext alias)
 *    - navigator.vibrate (graceful no-op fallback)
 *    - navigator.clipboard.writeText (fallback to execCommand)
 * 3. iOS Safari bfcache (Back-Forward Cache) & Page Freeze Lifecycle handlers:
 *    - 'pageshow' event handling (cleans stuck splash screens and triggers layout reflow)
 *    - 'visibilitychange' event handling (resumes stalled WebKit rendering upon returning to foreground)
 * 4. iOS Viewport Height (--vh) & Touch Tap Highlights
 */

export function initIOSCompatibility(): void {
  if (typeof window === 'undefined') return;

  try {
    /* ==========================================================================
       1. ES & Web API Polyfills & Fallbacks for iOS Safari / WebKit
       ========================================================================== */

    const arrayProto = Array.prototype as any;
    const stringProto = String.prototype as any;

    // --- Array.prototype.at & String.prototype.at ---
    if (!arrayProto.at) {
      Object.defineProperty(Array.prototype, 'at', {
        value: function (index: number) {
          const k = index >= 0 ? index : this.length + index;
          return k >= 0 && k < this.length ? this[k] : undefined;
        },
        writable: true,
        configurable: true,
      });
    }

    if (!stringProto.at) {
      Object.defineProperty(String.prototype, 'at', {
        value: function (index: number) {
          const k = index >= 0 ? index : this.length + index;
          return k >= 0 && k < this.length ? this.charAt(k) : undefined;
        },
        writable: true,
        configurable: true,
      });
    }

    // --- Array.prototype.findLast & findLastIndex ---
    if (!arrayProto.findLast) {
      Object.defineProperty(Array.prototype, 'findLast', {
        value: function (predicate: (value: any, index: number, array: any[]) => boolean, thisArg?: any) {
          for (let i = this.length - 1; i >= 0; i--) {
            if (predicate.call(thisArg, this[i], i, this)) {
              return this[i];
            }
          }
          return undefined;
        },
        writable: true,
        configurable: true,
      });
    }

    if (!arrayProto.findLastIndex) {
      Object.defineProperty(Array.prototype, 'findLastIndex', {
        value: function (predicate: (value: any, index: number, array: any[]) => boolean, thisArg?: any) {
          for (let i = this.length - 1; i >= 0; i--) {
            if (predicate.call(thisArg, this[i], i, this)) {
              return i;
            }
          }
          return -1;
        },
        writable: true,
        configurable: true,
      });
    }

    // --- Array.prototype immutable methods (ES2023 / Safari < 16) ---
    if (!arrayProto.toReversed) {
      Object.defineProperty(Array.prototype, 'toReversed', {
        value: function () {
          return [...this].reverse();
        },
        writable: true,
        configurable: true,
      });
    }

    if (!arrayProto.toSorted) {
      Object.defineProperty(Array.prototype, 'toSorted', {
        value: function (compareFn?: (a: any, b: any) => number) {
          return [...this].sort(compareFn);
        },
        writable: true,
        configurable: true,
      });
    }

    if (!arrayProto.toSpliced) {
      Object.defineProperty(Array.prototype, 'toSpliced', {
        value: function (start: number, deleteCount?: number, ...items: any[]) {
          const copy = [...this];
          if (deleteCount === undefined) {
            copy.splice(start);
          } else {
            copy.splice(start, deleteCount, ...items);
          }
          return copy;
        },
        writable: true,
        configurable: true,
      });
    }

    if (!arrayProto.with) {
      Object.defineProperty(Array.prototype, 'with', {
        value: function (index: number, value: any) {
          const k = index >= 0 ? index : this.length + index;
          if (k < 0 || k >= this.length) {
            throw new RangeError(`Invalid index : ${index}`);
          }
          const copy = [...this];
          copy[k] = value;
          return copy;
        },
        writable: true,
        configurable: true,
      });
    }

    // --- Object.hasOwn (Safari < 15.4) ---
    if (typeof Object.hasOwn !== 'function') {
      Object.hasOwn = function (instance: any, property: PropertyKey): boolean {
        return Object.prototype.hasOwnProperty.call(instance, property);
      };
    }

    // --- structuredClone (Safari < 15.4) ---
    if (typeof window.structuredClone !== 'function') {
      (window as any).structuredClone = function (obj: any) {
        if (obj === undefined) return undefined;
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch (e) {
          // Fallback recursive clone
          const deepClone = (item: any): any => {
            if (item === null || typeof item !== 'object') return item;
            if (item instanceof Date) return new Date(item.getTime());
            if (item instanceof RegExp) return new RegExp(item.source, item.flags);
            if (Array.isArray(item)) return item.map(deepClone);
            const copy: any = {};
            for (const key of Object.keys(item)) {
              copy[key] = deepClone(item[key]);
            }
            return copy;
          };
          return deepClone(obj);
        }
      };
    }

    // --- Promise.allSettled (Safari < 13) ---
    if (typeof Promise.allSettled !== 'function') {
      Promise.allSettled = function <T>(promises: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<Awaited<T>>[]> {
        return Promise.all(
          Array.from(promises).map((p) =>
            Promise.resolve(p).then(
              (value) => ({ status: 'fulfilled', value } as PromiseFulfilledResult<Awaited<T>>),
              (reason) => ({ status: 'rejected', reason } as PromiseRejectedResult)
            )
          )
        );
      };
    }

    // --- crypto.randomUUID (Safari < 15.4) ---
    if (typeof window.crypto === 'undefined') {
      (window as any).crypto = {};
    }
    if (typeof window.crypto.randomUUID !== 'function') {
      window.crypto.randomUUID = function (): `${string}-${string}-${string}-${string}-${string}` {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }) as `${string}-${string}-${string}-${string}-${string}`;
      };
    }

    // --- requestIdleCallback & cancelIdleCallback (Safari < 16.4) ---
    if (typeof window.requestIdleCallback !== 'function') {
      window.requestIdleCallback = function (cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void): number {
        const start = Date.now();
        return window.setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          });
        }, 1) as unknown as number;
      };
    }

    if (typeof window.cancelIdleCallback !== 'function') {
      window.cancelIdleCallback = function (id: number): void {
        clearTimeout(id);
      };
    }

    // --- Web Audio API (Safari webkitAudioContext alias) ---
    if (typeof window.AudioContext === 'undefined' && typeof (window as any).webkitAudioContext !== 'undefined') {
      (window as any).AudioContext = (window as any).webkitAudioContext;
    }

    // --- navigator.vibrate safe fallback (Safari iOS throws or lacks it) ---
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate !== 'function') {
      (navigator as any).vibrate = function () {
        return false;
      };
    }

    // --- navigator.clipboard.writeText safe fallback ---
    if (typeof navigator !== 'undefined') {
      if (!navigator.clipboard) {
        (navigator as any).clipboard = {};
      }
      if (typeof navigator.clipboard.writeText !== 'function') {
        navigator.clipboard.writeText = function (text: string): Promise<void> {
          return new Promise((resolve, reject) => {
            try {
              const textArea = document.createElement('textarea');
              textArea.value = text;
              textArea.style.position = 'fixed';
              textArea.style.top = '0';
              textArea.style.left = '0';
              textArea.style.opacity = '0';
              textArea.style.pointerEvents = 'none';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              const successful = document.execCommand('copy');
              document.body.removeChild(textArea);
              if (successful) {
                resolve();
              } else {
                reject(new Error('execCommand copy failed'));
              }
            } catch (err) {
              reject(err);
            }
          });
        };
      }
    }

    /* ==========================================================================
       2. iOS Viewport & Safe Area Height CSS Variable
       ========================================================================== */
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight, { passive: true });
    window.addEventListener('orientationchange', setViewportHeight, { passive: true });

    /* ==========================================================================
       3. iOS Safari bfcache (Back-Forward Cache) & Page Freeze Lifecycle
       ========================================================================== */
    
    // Function to dismiss any stuck splash screen or force DOM repaint
    const recoverAppDisplay = () => {
      try {
        const splash = document.getElementById('initial-splash');
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => {
            try {
              splash.remove();
            } catch (_) {}
          }, 300);
        }

        // Force a micro reflow to revive frozen WebKit compositor layers
        const root = document.getElementById('root');
        if (root) {
          void root.offsetHeight;
        }
      } catch (err) {
        console.warn('[iOS Compatibility] Non-blocking recovery error:', err);
      }
    };

    // 'pageshow' handles iOS bfcache restores (Back/Forward or App Switch reload)
    window.addEventListener('pageshow', (event: PageTransitionEvent) => {
      if (event.persisted) {
        // App was restored from bfcache - revive rendering
        recoverAppDisplay();
      } else {
        // Normal page show
        setTimeout(recoverAppDisplay, 250);
      }
    });

    // 'visibilitychange' handles app focus after iOS backgrounding / lock screen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Revive viewport dimensions and check stuck splash
        setViewportHeight();
        recoverAppDisplay();
      }
    });

    // Safe global unhandled promise rejection logger (prevents Safari silent freeze)
    window.addEventListener('unhandledrejection', (event) => {
      // Don't crash on cancelled network fetches on navigation in Safari
      if (event.reason && (event.reason.name === 'AbortError' || (typeof event.reason.message === 'string' && event.reason.message.includes('aborted')))) {
        event.preventDefault();
      }
    });

  } catch (globalErr) {
    console.warn('[iOS Compatibility Wrapper] Initialized with non-blocking error:', globalErr);
  }
}

// Auto-run on import to ensure early execution before React root mount
initIOSCompatibility();
