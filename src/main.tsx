import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Monkey-patch localStorage.setItem to gracefully handle and recover from QuotaExceededError (5MB browser limit)
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  try {
    originalSetItem.call(localStorage, key, value);
  } catch (e: any) {
    const isQuotaError = 
      e instanceof DOMException && (
        e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        e.code === 22 ||
        e.code === 1014
      ) || (e && (e.name === "QuotaExceededError" || e.message?.includes("quota") || e.message?.includes("Quota")));

    if (isQuotaError) {
      console.warn("localStorage quota exceeded! Attempting auto-cleanup of non-essential data to free up space...");
      try {
        // 1. Remove large, non-essential online action logs
        localStorage.removeItem("paopao_online_actions_log");
        
        // 2. Clear or truncate other logs and non-critical data
        const notifications = localStorage.getItem("paopao_notifications");
        if (notifications && notifications.length > 100000) {
          localStorage.setItem("paopao_notifications", JSON.stringify([]));
        }

        const chats = localStorage.getItem("paopao_chats");
        if (chats && chats.length > 200000) {
          localStorage.setItem("paopao_chats", JSON.stringify([]));
        }

        // Retry the original write operation
        originalSetItem.call(localStorage, key, value);
        console.log(`Successfully recovered from QuotaExceededError for key: "${key}" after clearing local logs.`);
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

