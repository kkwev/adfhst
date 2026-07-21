import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Monkey-patch localStorage.setItem to gracefully handle and recover from QuotaExceededError (5MB browser limit)
const originalSetItem = localStorage.setItem;

localStorage.setItem = function(key, value) {
  try {
    // 1. ลองบันทึกข้อมูลแบบปกติและสมบูรณ์ที่สุดก่อน (เพื่อไม่ทำลายรูปภาพที่ผู้ใช้ตั้งใจอัปโหลดจริง)
    // Try to write the raw unmodified value first to preserve custom uploaded images perfectly!
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
      console.warn("⚠️ [localStorage] พื้นที่จัดเก็บเบราว์เซอร์เต็ม (Quota Exceeded)! กำลังทำความสะอาดข้อมูลประวัติและข้อมูลที่ไม่จำเป็นเพื่อคืนพื้นที่...");
      try {
        // 1. ลบประวัติบันทึกการกระทำของระบบ (Non-critical action logs) ที่กินพื้นที่เยอะออกไปก่อน
        try {
          localStorage.removeItem("paopao_online_actions_log");
        } catch (err) {}

        // 2. ทำความสะอาดประวัติการทำรายการเก่าๆ (Keep only recent records and strip processed large images)
        const arraysToPrune = [
          { key: "paopao_chats", max: 10, stripImage: true },
          { key: "paopao_notifications", max: 10, stripImage: false },
          { key: "paopao_orders", max: 15, stripImage: true },
          { key: "paopao_withdrawals", max: 10, stripImage: false },
          { key: "paopao_deposits", max: 10, stripImage: true }
        ];

        for (const item of arraysToPrune) {
          try {
            const raw = localStorage.getItem(item.key);
            if (raw) {
              let parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                // เก็บไว้เฉพาะรายการที่ใหม่ที่สุดตามขีดจำกัดสูงสุด
                if (parsed.length > item.max) {
                  parsed = parsed.slice(-item.max);
                }

                // ลดขนาดรูปภาพในประวัติเก่าๆ
                if (item.stripImage) {
                  if (item.key === "paopao_chats") {
                    parsed = parsed.map((c: any) => ({
                      ...c,
                      image: (c.image && c.image.startsWith("data:")) ? "" : c.image
                    }));
                  } else if (item.key === "paopao_deposits") {
                    parsed = parsed.map((d: any) => {
                      // สลิปที่อนุมัติหรือปฏิเสธแล้ว ไม่จำเป็นต้องเก็บรูปจริงไว้ในเครื่องถาวร (ลบออกเพื่อเซฟพื้นที่)
                      // แต่สลิปที่ 'pending' (รอตรวจสอบ) ต้องคงไว้ห้ามลบเด็ดขาด!
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
                originalSetItem.call(localStorage, item.key, JSON.stringify(parsed));
              }
            }
          } catch (err) {}
        }

        // 3. หลังจากทำความสะอาดประวัติอื่นๆ แล้ว ให้ลองบันทึกคีย์ปัจจุบันใหม่อีกครั้งอย่างปลอดภัย
        let processedValue = value;
        if (key === "paopao_products") {
          try {
            let products = JSON.parse(value);
            if (Array.isArray(products)) {
              products = products.map((p: any) => {
                const hasBase64 = (p.image && p.image.startsWith("data:")) || (p.images && p.images.some((img: string) => img && img.startsWith("data:")));
                if (hasBase64) {
                  const fallbackUrl = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400";
                  const newImage = (p.image && p.image.startsWith("data:")) ? fallbackUrl : p.image;
                  let newImages = (p.images || []).map((img: string) => {
                    if (img && img.startsWith("data:")) {
                      return fallbackUrl;
                    }
                    return img;
                  });
                  // Align first image
                  if (newImages.length === 0) {
                    newImages = [newImage];
                  } else {
                    newImages[0] = newImage;
                  }
                  return { ...p, image: newImage, images: newImages };
                }
                return p;
              });
              processedValue = JSON.stringify(products);
            }
          } catch (pErr) {}
        }

        try {
          originalSetItem.call(localStorage, key, processedValue);
          console.log(`✅ [localStorage] กู้คืนพื้นที่เบราว์เซอร์สำเร็จและบันทึกคีย์ "${key}" สำเร็จแล้วค่ะ`);
        } catch (retryError2) {
          // If still failing, attempt atomic write by removing key first
          localStorage.removeItem(key);
          try {
            originalSetItem.call(localStorage, key, processedValue);
          } catch (retryError3) {
            console.error("❌ [localStorage] พื้นที่เต็มเกินความจุจำกัดสูงสุด 5MB ของเบราว์เซอร์แล้วจริง ๆ:", retryError3);
          }
        }
      } catch (retryError) {
        console.warn("❌ [localStorage] ไม่สามารถกู้คืนพื้นที่ได้สำเร็จ:", retryError);
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

