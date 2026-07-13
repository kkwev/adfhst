import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Monkey-patch localStorage.setItem to gracefully handle and recover from QuotaExceededError (5MB browser limit)
const originalSetItem = localStorage.setItem;

function makeLightweightForLocalStorage(key: string, rawValue: string): string {
  if (!rawValue) return rawValue;
  try {
    const trimmed = rawValue.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      
      // 1. For products, replace heavy base64 image strings with a lightweight high-quality Unsplash beauty photo
      if (key === "paopao_products" && Array.isArray(parsed)) {
        const cleaned = parsed.map((p: any) => ({
          ...p,
          image: (p.image && p.image.startsWith("data:")) 
            ? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=150" 
            : p.image,
          images: (p.images || []).map((img: string) => 
            img && img.startsWith("data:") 
              ? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=150" 
              : img
          )
        }));
        return JSON.stringify(cleaned);
      }
      
      // 2. For deposits, replace heavy base64 slipImage with empty string or a lightweight slip photo placeholder
      if (key === "paopao_deposits" && Array.isArray(parsed)) {
        const cleaned = parsed.map((d: any) => ({
          ...d,
          slipImage: (d.slipImage && d.slipImage.startsWith("data:"))
            ? (d.status === "pending" 
                ? "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=150" 
                : "")
            : d.slipImage
        }));
        return JSON.stringify(cleaned);
      }
      
      // 3. For chats, remove any heavy base64 images completely to keep chat history tiny
      if (key === "paopao_chats" && Array.isArray(parsed)) {
        const cleaned = parsed.map((c: any) => ({
          ...c,
          image: (c.image && c.image.startsWith("data:")) ? "" : c.image
        }));
        return JSON.stringify(cleaned);
      }

      // 4. For orders, replace product item base64 images with lightweight Unsplash cosmetics
      if (key === "paopao_orders" && Array.isArray(parsed)) {
        const cleaned = parsed.map((o: any) => ({
          ...o,
          items: (o.items || []).map((it: any) => ({
            ...it,
            image: (it.image && it.image.startsWith("data:"))
              ? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=150"
              : it.image
          }))
        }));
        return JSON.stringify(cleaned);
      }

      // 5. For users, replace heavy base64 avatar with a lightweight Unsplash avatar placeholder
      if (key === "paopao_users" && Array.isArray(parsed)) {
        const cleaned = parsed.map((u: any) => ({
          ...u,
          avatar: (u.avatar && u.avatar.startsWith("data:"))
            ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"
            : u.avatar
        }));
        return JSON.stringify(cleaned);
      }
    }
  } catch (err) {
    if (typeof rawValue === "string" && rawValue.includes("data:image/")) {
      try {
        return rawValue.replace(/"data:image\/[^"]+"/g, '"https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=150"');
      } catch (regexErr) {}
    }
  }
  return rawValue;
}

localStorage.setItem = function(key, value) {
  // Proactively make the saved value lightweight to completely prevent QuotaExceededErrors
  const processedValue = makeLightweightForLocalStorage(key, value);
  
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
      console.warn("localStorage quota exceeded even after proactive pruning! Performing aggressive emergency cleanup...");
      try {
        // Completely remove non-critical action logs
        try {
          localStorage.removeItem("paopao_online_actions_log");
        } catch (err) {}

        // Keep only very last few elements of critical arrays to reclaim space
        const arraysToPrune = [
          { key: "paopao_chats", max: 3 },
          { key: "paopao_notifications", max: 3 },
          { key: "paopao_orders", max: 3 },
          { key: "paopao_deposits", max: 3 },
          { key: "paopao_withdrawals", max: 3 }
        ];

        for (const item of arraysToPrune) {
          try {
            const raw = localStorage.getItem(item.key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > item.max) {
                originalSetItem.call(localStorage, item.key, JSON.stringify(parsed.slice(-item.max)));
              }
            }
          } catch (err) {}
        }

        // Retry the save with proactive and aggressive backup pruning
        localStorage.removeItem(key);
        originalSetItem.call(localStorage, key, processedValue);
        console.log(`Successfully recovered from emergency QuotaExceededError for key: "${key}".`);
      } catch (retryError) {
        console.warn("localStorage recovery warning for key: " + key, retryError);
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

