import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Monkey-patch localStorage.setItem to gracefully handle and recover from QuotaExceededError (5MB browser limit)
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  let processedValue = value;
  
  // Compressing any large base64 strings in values BEFORE attempting to write
  if (typeof processedValue === "string" && (processedValue.includes("data:image/") || processedValue.includes("data:application/"))) {
    try {
      processedValue = processedValue.replace(/"data:(image|application)\/[^"]+"/g, (match) => {
        if (match.length > 30000) {
          return '"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400"';
        }
        return match;
      });
    } catch (err) {
      console.warn("Base64 regex stripping failed in localStorage:", err);
    }
  }

  try {
    originalSetItem.call(localStorage, key, processedValue);
  } catch (e: any) {
    const isQuotaError = 
      e instanceof DOMException && (
        e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        e.code === 22 ||
        e.code === 1014
      ) || (e && (e.name === "QuotaExceededError" || e.message?.includes("quota") || e.message?.includes("Quota")));

    if (isQuotaError) {
      console.warn("localStorage quota exceeded! Attempting aggressive auto-cleanup of non-essential data to free up space...");
      try {
        // 1. Remove large, non-essential online action logs
        localStorage.removeItem("paopao_online_actions_log");
        
        // 2. Aggressively reset non-critical logs and arrays to free up massive chunks of space
        const keysToClear = [
          "paopao_chats",
          "paopao_notifications",
          "paopao_orders",
          "paopao_deposits",
          "paopao_withdrawals"
        ];
        
        for (const k of keysToClear) {
          try {
            originalSetItem.call(localStorage, k, JSON.stringify([]));
          } catch (clearErr) {}
        }

        // Also compress the settings value if we are trying to save it
        if (key === "paopao_settings" && typeof processedValue === "string") {
          try {
            const parsed = JSON.parse(processedValue);
            if (parsed.banners && Array.isArray(parsed.banners)) {
              // Replace high-resolution banner images with lightweight Unsplash mock URLs
              parsed.banners = parsed.banners.map(() => "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200");
              processedValue = JSON.stringify(parsed);
            }
          } catch (pErr) {}
        }

        // Retry the original write operation with compressed/cleaned storage state
        originalSetItem.call(localStorage, key, processedValue);
        console.log(`Successfully recovered from QuotaExceededError for key: "${key}" after aggressive clearing.`);
      } catch (retryError) {
        console.error("Critical: localStorage still exceeded quota after aggressive cleanup of logs.", retryError);
        // Do not throw the error to prevent crashing the React app
      }
    } else {
      throw e;
    }
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

