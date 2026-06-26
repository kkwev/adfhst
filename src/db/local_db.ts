/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Product, Order, ChatMessage, SystemNotification, WithdrawalRequest, SystemSettings, OnlineActionLog } from '../types';

// Default initial data to seed the application
export const DEFAULT_SETTINGS: SystemSettings = {
  siteName: "Sephora Thailand",
  siteLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sephora_logo.svg/600px-Sephora_logo.svg.png",
  themeColor: "#000000", // Sephora black luxury theme color
  themeGradientEnd: "#1A1A1A", // Dark luxury gradient end
  banners: [
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=1200&h=400", // Luxury Skincare & Makeup
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1200&h=400", // Classic Beauty
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1200&h=400",  // Luxury Perfumes
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=1200&h=400"  // Business Loan Banner
  ],
  customCategories: [
    { key: 'APPAREL', label: 'เครื่องยืด & สตรีทแวร์', icon: '👕' },
    { key: 'BAGS', label: 'กระเป๋าซิกเนเจอร์', icon: '🎒' },
    { key: 'CAPS', label: 'หมวกลายเท่', icon: '🧢' },
    { key: 'TUMBLER', label: 'แก้วเนออนทัมเบลอร์', icon: '🥤' }
  ]
};

export const SEED_USERS: User[] = [
  {
    id: "A00001",
    name: "PAOPAO Super Admin",
    nickname: "แอดมินสูงสุด",
    phone: "0099887766",
    password: "PaoPao1995",
    role: "SuperAdmin",
    status: "active",
    wallet: 999999,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "A00002",
    name: "นายสมชาย ยินดี (Admin)",
    nickname: "สมชาย แอดมิน",
    phone: "0888888888",
    password: "adminpassword",
    role: "Admin",
    status: "active",
    wallet: 15000,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "S00001",
    name: "PaoPao Official Shop",
    nickname: "PAOPAO Shop",
    phone: "0812345678",
    password: "merchantpassword",
    role: "Merchant",
    status: "active",
    wallet: 12500,
    bankName: "ธนาคารกสิกรไทย (KBank)",
    bankAccount: "123-4-56789-0",
    bankHolderName: "บริษัท เป๋าเป่า จำกัด",
    avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "S00002",
    name: "Streetwear Neon Shop",
    nickname: "Streetwear",
    phone: "0823456789",
    password: "merchantpassword2",
    role: "Merchant",
    status: "active",
    wallet: 4500,
    bankName: "ธนาคารไทยพาณิชย์ (SCB)",
    bankAccount: "987-6-54321-0",
    bankHolderName: "นายพิธา กรุงเทพ",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "M00001",
    name: "Mali Sakuldee",
    nickname: "น้องมะลิ",
    dob: "2000-05-15",
    phone: "0991234567",
    password: "customerpassword",
    role: "Customer",
    status: "active",
    wallet: 3500,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: "M00002",
    name: "สมควร มีทรัพย์",
    nickname: "พี่ควร",
    dob: "1988-11-20",
    phone: "0997654321",
    password: "customerpassword2",
    role: "Customer",
    status: "active",
    wallet: 800,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
  }
];

export const SEED_PRODUCTS: Product[] = [];

export const SEED_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "N00001",
    userId: "all",
    title: "ยินดีต้อนรับสู่ PAOPAO แฟลตฟอร์มช้อปปิ้งสตรีทแวร์แนวใหม่!",
    message: "แจกโค้ดส่วนลดต้อนรับสมาชิกใหม่ลดทันที 50 บาทเมื่อช้อปครบ 500 บาท ใช้โค้ด: WELCOMEPAOPAO สมัครบัญชีใช้งานด่วนวันนี้ ช้อปง่าย ส่งไว ปลอดภัย 100%",
    isSystemAnnouncement: true,
    createdAt: "2026-06-20T10:00:00Z"
  },
  {
    id: "N00003",
    userId: "M00001",
    title: "เติมเงินสำเร็จ",
    message: "คุณได้ทำการเติมเงินเข้าสู่กระเป๋าตังค์ PAOPAO Wallet จำนวน 1,500 บาท เรียบร้อยแล้ว ขอให้มีความสุขกับการช้อปปิ้งออนไลน์",
    isSystemAnnouncement: false,
    createdAt: "2026-06-20T14:30:00Z"
  }
];

export const SEED_ORDERS: Order[] = [
  {
    id: "ORD00001",
    merchantId: "S00001",
    customerId: "M00001",
    subtotal: 890,
    shippingFee: 50,
    discount: 50,
    grandTotal: 890, // 890 + 50 - 50 = 890
    paymentMethod: "wallet",
    status: "completed",
    createdAt: "2026-06-18T10:15:00Z",
    shippingAddress: {
      name: "Mali Sakuldee",
      phone: "0991234567",
      address: "123/45 ถนนวิภาวดีรังสิต แขวงดินแดง เขตดินแดง กรุงเทพมหานคร",
      zipcode: "10400"
    },
    items: [
      {
        productId: "P00001",
        name: "กระเป๋าเป้สะพายหลังแบรนด์ PAOPAO Minimal Canvas",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400",
        price: 890,
        quantity: 1,
        options: {
          "ขนาด (Size)": "M (18L)",
          "โทนสี (Color)": "ขาวคลีน (Pure White)"
        }
      }
    ]
  },
  {
    id: "ORD00002",
    merchantId: "S00001",
    customerId: "M00001",
    subtotal: 490,
    shippingFee: 50,
    discount: 0,
    grandTotal: 540,
    paymentMethod: "cod",
    status: "in_transit",
    createdAt: "2026-06-19T16:20:00Z",
    shippingAddress: {
      name: "Mali Sakuldee",
      phone: "0991234567",
      address: "123/45 ถนนวิภาวดีรังสิต แขวงดินแดง เขตดินแดง กรุงเทพมหานคร",
      zipcode: "10400"
    },
    items: [
      {
        productId: "P00002",
        name: "เสื้อยืด PaoPao Glow Neon Red Graphic Tee",
        image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400",
        price: 490,
        quantity: 1,
        options: {
          "ไซส์ (Size)": "L",
          "แบบเสื้อ (Color)": "แดงสะท้อนแสง (Neon Red)"
        }
      }
    ]
  }
];

export const SEED_CHATS: ChatMessage[] = [
  {
    id: "C00001",
    userId: "M00001",
    userName: "Mali Sakuldee",
    userPhone: "0991234567",
    sender: "user",
    message: "สวัสดีค่ะ มีข้อสอบถามเกี่ยวกับระยะเวลาจัดส่งสินค้าในเขตกรุงเทพค่ะ",
    createdAt: "2026-06-19T10:00:00Z"
  },
  {
    id: "C00002",
    userId: "M00001",
    userName: "Mali Sakuldee",
    userPhone: "0991234567",
    sender: "admin",
    message: "สวัสดีครับคุณมะลิ ในพื้นที่กรุงเทพและปริมณฑล จะใช้เวลาจัดส่งประมาณ 1-2 วันทำการหลังจากยืนยันคำสั่งซื้อจ้า",
    createdAt: "2026-06-19T10:05:00Z"
  }
];

export const SEED_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: "W00001",
    merchantId: "S00001",
    merchantPhone: "0812345678",
    merchantName: "PaoPao Official Shop",
    amount: 5000,
    status: "pending",
    createdAt: "2026-06-20T09:00:00Z"
  },
  {
    id: "W00002",
    merchantId: "S00002",
    merchantPhone: "0823456789",
    merchantName: "Streetwear Neon Shop",
    amount: 1500,
    status: "approved",
    comment: "โอนผ่านระบบเรียบร้อย ธนาคารไทยพาณิชย์",
    createdAt: "2026-06-19T11:00:00Z"
  }
];

// Initialize database with seed data if vacant
export function initializeDB() {
  if (!localStorage.getItem("paopao_users")) {
    localStorage.setItem("paopao_users", JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem("paopao_products")) {
    localStorage.setItem("paopao_products", JSON.stringify(SEED_PRODUCTS));
  }
  if (!localStorage.getItem("paopao_notifications")) {
    localStorage.setItem("paopao_notifications", JSON.stringify(SEED_NOTIFICATIONS));
  }
  if (!localStorage.getItem("paopao_orders")) {
    localStorage.setItem("paopao_orders", JSON.stringify(SEED_ORDERS));
  }
  if (!localStorage.getItem("paopao_chats")) {
    localStorage.setItem("paopao_chats", JSON.stringify(SEED_CHATS));
  }
  if (!localStorage.getItem("paopao_withdrawals")) {
    localStorage.setItem("paopao_withdrawals", JSON.stringify(SEED_WITHDRAWALS));
  }
  if (!localStorage.getItem("paopao_settings")) {
    localStorage.setItem("paopao_settings", JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem("paopao_online_actions_log")) {
    localStorage.setItem("paopao_online_actions_log", JSON.stringify([
      {
        id: "LOG-INIT-001",
        timestamp: new Date().toISOString(),
        category: "settings",
        actionName: "เริ่มต้นระบบฐานข้อมูลสถิติมุมมองออนไลน์",
        description: "ระบบจดจำข้อมูลและการกระทำออนไลน์ (Online Action Logger Hub) เริ่มทำงาน พร้อมแบ็คอัพสำรองข้อมูลเรียบร้อยค่ะ",
        operator: "ระบบความปลอดภัยของระบบ",
        status: "offline_saved"
      }
    ]));
  }
}

// Registry for external sync callback (e.g. Firestore) to write changes to cloud
let externalSyncCallback: ((key: string, value: any) => void) | null = null;

export function registerExternalSync(cb: (key: string, value: any) => void) {
  externalSyncCallback = cb;
}

// Get typed tables from localStorage
export function getStoredData<T>(key: string, defaultVal: T): T {
  const data = localStorage.getItem(key);
  if (!data) return defaultVal;
  return JSON.parse(data) as T;
}

// Save back to localStorage
export function setStoredData<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  if (externalSyncCallback) {
    try {
      externalSyncCallback(key, value);
    } catch (e) {
      console.error("External database sync callback failed:", e);
    }
  }
}

export function getOnlineActionLogs(): OnlineActionLog[] {
  try {
    const raw = localStorage.getItem("paopao_online_actions_log");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function logOnlineAction(
  category: string,
  actionName: string,
  description: string,
  operator: string
): void {
  try {
    const logs = getOnlineActionLogs();
    const isQuotaExceeded = localStorage.getItem("paopao_firestore_quota_exceeded") === "true";
    const status = isQuotaExceeded ? ("offline_saved" as const) : ("cloud_synced" as const);
    
    const newLog: OnlineActionLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      category,
      actionName,
      description,
      operator,
      status
    };
    
    logs.unshift(newLog); // newer first
    
    // Cap logs at 1000 items to avoid running out of localstorage space
    if (logs.length > 1000) {
      logs.splice(1000);
    }
    
    localStorage.setItem("paopao_online_actions_log", JSON.stringify(logs));
    
    // Dispatch a custom event so components can listen to changes immediately
    window.dispatchEvent(new CustomEvent("paopao_online_action_logged", { detail: newLog }));
  } catch (e) {
    console.error("Failed to log online action:", e);
  }
}

