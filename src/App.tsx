/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthView from './components/AuthView';
import HomeTab from './components/HomeTab';
import CartTab from './components/CartTab';
import OrdersTab from './components/OrdersTab';
import NotificationsTab from './components/NotificationsTab';
import ProfileTab from './components/ProfileTab';
import AdminPanel from './components/AdminPanel';

import { 
  User, Product, Order, ChatMessage, SystemNotification, WithdrawalRequest, SystemSettings, OrderItem, DepositRequest, OnlineActionLog 
} from './types';
import { 
  initializeDB, getStoredData, setStoredData, DEFAULT_SETTINGS, registerExternalSync, logOnlineAction, getOnlineActionLogs 
} from './db/local_db';
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "./db/firebase";
import { initializeFirestoreDB, saveToFirestore, onFirestoreQuotaExceeded, isQuotaError, updateFirestoreCache, disableFirestoreNetwork } from "./db/firestore_service";
import { AlertTriangle } from "lucide-react";

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions: { [category: string]: string };
}

export default function App() {
  // Navigation states: 'home' | 'cart' | 'orders' | 'notifications' | 'profile' | 'admin' | 'login'
  const [activeTab, setActiveTab] = useState<string>('home');

  // Master databases loaded from localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [firestoreQuotaExceeded, setFirestoreQuotaExceeded] = useState<boolean>(
    localStorage.getItem("paopao_firestore_quota_exceeded") === "true"
  );

  // Intercept any click on buttons/interactive elements when user is not logged in to redirect instantly
  useEffect(() => {
    if (currentUser || activeTab === 'login') return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      let current: HTMLElement | null = target;
      let isInteractive = false;
      
      while (current && current !== document.body) {
        const tagName = current.tagName.toLowerCase();
        if (
          tagName === 'button' ||
          tagName === 'a' ||
          current.getAttribute('role') === 'button' ||
          current.classList.contains('cursor-pointer') ||
          tagName === 'input' ||
          tagName === 'select' ||
          tagName === 'textarea'
        ) {
          isInteractive = true;
          break;
        }
        current = current.parentElement;
      }

      if (isInteractive) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab('login');
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [currentUser, activeTab]);

  // Read latest tables from localStorage
  const syncFromLocalStorage = useCallback(() => {
    const rawSettings = getStoredData<SystemSettings>("paopao_settings", DEFAULT_SETTINGS);
    const loadedSettings = {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      siteName: (!rawSettings.siteName || rawSettings.siteName === "PAOPAO") ? "Sephora Thailand" : rawSettings.siteName,
      siteLogo: (!rawSettings.siteLogo || rawSettings.siteLogo.includes("sephora-ar21.svg")) ? "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sephora_logo.svg/600px-Sephora_logo.svg.png" : rawSettings.siteLogo,
      customCategories: (rawSettings.customCategories && rawSettings.customCategories.length > 0) 
        ? rawSettings.customCategories 
        : DEFAULT_SETTINGS.customCategories
    };
    const loadedUsers = getStoredData<User[]>("paopao_users", []);
    const loadedProducts = getStoredData<Product[]>("paopao_products", []);
    const loadedOrders = getStoredData<Order[]>("paopao_orders", []);
    const loadedChats = getStoredData<ChatMessage[]>("paopao_chats", []);
    const loadedWithdrawals = getStoredData<WithdrawalRequest[]>("paopao_withdrawals", []);
    const loadedNotifs = getStoredData<SystemNotification[]>("paopao_notifications", []);
    const loadedDeposits = getStoredData<DepositRequest[]>("paopao_deposits", []);

    setSettings(loadedSettings);
    setUsers(loadedUsers);
    setProducts(loadedProducts);
    setOrders(loadedOrders);
    setChats(loadedChats);
    setWithdrawals(loadedWithdrawals);
    setNotifications(loadedNotifs);
    setDeposits(loadedDeposits);

    // Sync active session user details with master data using a stable functional updater
    setCurrentUser(prevUser => {
      if (!prevUser) return null;
      const refUser = loadedUsers.find(u => u.id === prevUser.id);
      if (refUser) {
        // Only update if something actually changed to prevent infinite rendering cascades
        if (JSON.stringify(refUser) !== JSON.stringify(prevUser)) {
          localStorage.setItem("paopao_session_user", JSON.stringify(refUser));
          return refUser;
        }
      }
      return prevUser;
    });
  }, []);

  // Detect virtual keyboard and form focus state to prevent layout displacement
  useEffect(() => {
    const checkKeyboard = () => {
      const activeEl = document.activeElement;
      const isInputFocused = !!(activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' ||
        activeEl.getAttribute('contenteditable') === 'true'
      ));
      
      if (isInputFocused) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    };

    window.addEventListener('focusin', checkKeyboard);
    // Use delay for focusout so we don't flicker between inputs
    const handleFocusOut = () => setTimeout(checkKeyboard, 100);
    window.addEventListener('focusout', handleFocusOut);
    
    if (window.visualViewport) {
      const handleResize = () => {
        if (window.visualViewport && window.visualViewport.height < window.innerHeight * 0.85) {
          document.body.classList.add('keyboard-open');
        } else {
          const activeEl = document.activeElement;
          const isInputFocused = !!(activeEl && (
            activeEl.tagName === 'INPUT' || 
            activeEl.tagName === 'TEXTAREA' || 
            activeEl.tagName === 'SELECT'
          ));
          if (!isInputFocused) {
            document.body.classList.remove('keyboard-open');
          }
        }
      };
      window.visualViewport.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('focusin', checkKeyboard);
        window.removeEventListener('focusout', handleFocusOut);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
        }
      };
    }

    return () => {
      window.removeEventListener('focusin', checkKeyboard);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Initialize DB once on load
  useEffect(() => {
    initializeDB();

    let unsubscibers: (() => void)[] = [];

    const handleQuotaErrorGlobal = (err?: any) => {
      if (err ? isQuotaError(err) : true) {
        setFirestoreQuotaExceeded(true);
        console.warn("Firestore sync quota limit exceeded. Safely unsubscribing active snapshot listeners.");
        disableFirestoreNetwork();
        unsubscibers.forEach(unsub => {
          try {
            unsub();
          } catch (e) {
            // ignore
          }
        });
        unsubscibers = [];
      }
    };

    onFirestoreQuotaExceeded(() => {
      handleQuotaErrorGlobal();
    });
    
    // Seed Firestore if empty, then sync and start listeners
    const setupAndSync = async () => {
      await initializeFirestoreDB();
      syncFromLocalStorage();
    };
    setupAndSync();

    // Register Firestore writing registry
    registerExternalSync((key, value) => {
      saveToFirestore(key, value);
    });

    // Check sessions if cached
    const storedSession = localStorage.getItem("paopao_session_user");
    if (storedSession) {
      try {
        const u = JSON.parse(storedSession) as User;
        setCurrentUser(u);
      } catch (e) {
        console.error(e);
      }
    }

    // Set up real-time snapshot listeners for multi-device live replication (bypass if quota exceeded)
    if (localStorage.getItem("paopao_firestore_quota_exceeded") !== "true") {
      unsubscibers = [
        onSnapshot(collection(db, "users"), (snapshot) => {
        const list: User[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as User);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        updateFirestoreCache("paopao_users", list);
        localStorage.setItem("paopao_users", JSON.stringify(list));
        setUsers(list);
        
        setCurrentUser(prevUser => {
          if (!prevUser) return null;
          const refUser = list.find(u => u.id === prevUser.id);
          if (refUser) {
            if (JSON.stringify(refUser) !== JSON.stringify(prevUser)) {
              localStorage.setItem("paopao_session_user", JSON.stringify(refUser));
              return refUser;
            }
          }
          return prevUser;
        });
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (users). Using local offline storage.");
        } else {
          console.error("Firestore sync error (users):", err);
        }
        handleQuotaErrorGlobal(err);
      }),

      onSnapshot(collection(db, "products"), (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Product);
        });

        // One-time master delete of all existing Firestore products
        if (localStorage.getItem("paopao_firestore_products_deleted_v3") !== "true") {
          localStorage.setItem("paopao_firestore_products_deleted_v3", "true");
          import("firebase/firestore").then(({ doc, deleteDoc }) => {
            for (const p of list) {
              deleteDoc(doc(db, "products", p.id)).catch(e => {
                console.error("Firestore cleanup error: ", e);
              });
            }
          });
          updateFirestoreCache("paopao_products", []);
          localStorage.setItem("paopao_products", JSON.stringify([]));
          setProducts([]);
          return;
        }

        list.sort((a, b) => a.id.localeCompare(b.id));
        updateFirestoreCache("paopao_products", list);
        localStorage.setItem("paopao_products", JSON.stringify(list));
        setProducts(list);
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (products). Using local offline storage.");
        } else {
          console.error("Firestore sync error (products):", err);
        }
        handleQuotaErrorGlobal(err);
      }),

      onSnapshot(collection(db, "orders"), (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Order);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        updateFirestoreCache("paopao_orders", list);
        localStorage.setItem("paopao_orders", JSON.stringify(list));
        setOrders(list);
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (orders). Using local offline storage.");
        } else {
          console.error("Firestore sync error (orders):", err);
        }
        handleQuotaErrorGlobal(err);
      }),

      onSnapshot(collection(db, "notifications"), (snapshot) => {
        const list: SystemNotification[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as SystemNotification);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        updateFirestoreCache("paopao_notifications", list);
        localStorage.setItem("paopao_notifications", JSON.stringify(list));
        setNotifications(list);
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (notifications). Using local offline storage.");
        } else {
          console.error("Firestore sync error (notifications):", err);
        }
        handleQuotaErrorGlobal(err);
      }),

      onSnapshot(collection(db, "chats"), (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as ChatMessage);
        });
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        updateFirestoreCache("paopao_chats", list);
        localStorage.setItem("paopao_chats", JSON.stringify(list));
        setChats(list);
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (chats). Using local offline storage.");
        } else {
          console.error("Firestore sync error (chats):", err);
        }
        handleQuotaErrorGlobal(err);
      }),

      onSnapshot(collection(db, "withdrawals"), (snapshot) => {
        const list: WithdrawalRequest[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as WithdrawalRequest);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        updateFirestoreCache("paopao_withdrawals", list);
        localStorage.setItem("paopao_withdrawals", JSON.stringify(list));
        setWithdrawals(list);
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (withdrawals). Using local offline storage.");
        } else {
          console.error("Firestore sync error (withdrawals):", err);
        }
        handleQuotaErrorGlobal(err);
      }),

      onSnapshot(collection(db, "deposits"), (snapshot) => {
        const list: DepositRequest[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as DepositRequest);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        updateFirestoreCache("paopao_deposits", list);
        localStorage.setItem("paopao_deposits", JSON.stringify(list));
        setDeposits(list);
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (deposits). Using local offline storage.");
        } else {
          console.error("Firestore sync error (deposits):", err);
        }
        handleQuotaErrorGlobal(err);
      }),

      onSnapshot(doc(db, "settings", "main"), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          updateFirestoreCache("paopao_settings", data);
          localStorage.setItem("paopao_settings", JSON.stringify(data));
          setSettings(data);
        }
      }, (err) => {
        if (isQuotaError(err)) {
          console.warn("Firestore sync quota limit exceeded (settings). Using local offline storage.");
        } else {
          console.error("Firestore sync error (settings):", err);
        }
        handleQuotaErrorGlobal(err);
      })
    ];
  }

    // Live backend/database synchronization across separate tabs & iframes
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("paopao_")) {
        syncFromLocalStorage();
      }
      if (e.key === "paopao_session_user") {
        if (e.newValue) {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch (err) {
            console.error(err);
          }
        } else {
          setCurrentUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      unsubscibers.forEach(unsub => unsub());
    };
  }, [syncFromLocalStorage]);

  // Fetch from user-specific cache whenever user details switch
  useEffect(() => {
    if (currentUser) {
      const storedCart = getStoredData<CartItem[]>(`paopao_cart_${currentUser.id}`, []);
      setCart(storedCart);
    } else {
      setCart([]);
    }
  }, [currentUser]);

  // Dynamic document title matching the store name
  useEffect(() => {
    document.title = settings.siteName || "Sephora Thailand";
  }, [settings.siteName]);

  // --- CART MANAGEMENT ---
  const handleAddToCart = (product: Product, quantity: number, selectedOptions: { [category: string]: string }) => {
    if (!currentUser) {
      alert("กรุณาเข้าสู่ระบบก่อนเพิ่มผ้าใส่ตะกร้าจ้า 🛍️");
      setActiveTab('login');
      return;
    }

    // Check account status is active
    if (currentUser.status !== 'active') {
      alert("บัญชีบอร์ดของคุณถูกระงับชั่วคราว ไม่สามารถทำรายการสั่งซื้อใดๆ ได้ค่ะ");
      return;
    }

    // Make unique key for cart combining product id and option choices
    const optionKey = Object.entries(selectedOptions)
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const itemId = `${product.id}_${optionKey}`;

    const newCart = [...cart];
    const existingIdx = newCart.findIndex(item => item.id === itemId);

    if (existingIdx !== -1) {
      newCart[existingIdx].quantity += quantity;
    } else {
      newCart.push({
        id: itemId,
        product,
        quantity,
        selectedOptions
      });
    }

    setCart(newCart);
    setStoredData(`paopao_cart_${currentUser.id}`, newCart);
    alert(`เพิ่มสินค้า "${product.name}" สู่ตระกร้าเรียบร้อยค่ะ!`);
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    if (!currentUser) return;

    let newCart = [...cart];
    const targetIdx = newCart.findIndex(it => it.id === itemId);

    if (targetIdx !== -1) {
      if (newQty <= 0) {
        newCart = newCart.filter(it => it.id !== itemId);
      } else {
        newCart[targetIdx].quantity = newQty;
      }
    }

    setCart(newCart);
    setStoredData(`paopao_cart_${currentUser.id}`, newCart);
  };

  const handleRemoveFromCart = (itemId: string) => {
    if (!currentUser) return;

    const newCart = cart.filter(it => it.id !== itemId);
    setCart(newCart);
    setStoredData(`paopao_cart_${currentUser.id}`, newCart);
  };

  // --- TRANSACTIONS LOG & BILL CHECKOUT FLOWS ---
  const handleCheckout = (orderData: {
    items: OrderItem[];
    merchantId: string;
    shippingAddress: { name: string; phone: string; address: string; zipcode: string };
    paymentMethod: 'wallet' | 'cod';
    subtotal: number;
    shippingFee: number;
    discount: number;
    grandTotal: number;
  }) => {
    if (!currentUser) return;

    // Allocate order ID starting at OR34589 and randomly incrementing
    let lastOrderNum = localStorage.getItem("paopao_last_order_num");
    let nextNum: number;
    if (!lastOrderNum) {
      nextNum = 34589;
    } else {
      nextNum = Number(lastOrderNum) + Math.floor(Math.random() * 45) + 5;
    }
    localStorage.setItem("paopao_last_order_num", String(nextNum));
    const orderId = `OR${nextNum}`;

    // 1. Double check wallet if paid via Wallet
    if (orderData.paymentMethod === 'wallet' && currentUser.wallet < orderData.grandTotal) {
      alert("ยอดเงินคงคลังใน Wallet ของท่านไม่เพียงพอทำชำระบิลนี้ค่ะ!");
      return;
    }

    // 2. Decrement item stocks & increment sales volume
    const currentProducts = [...products];
    orderData.items.forEach(it => {
      const prodIdx = currentProducts.findIndex(p => p.id === it.productId);
      if (prodIdx !== -1) {
        const prod = { ...currentProducts[prodIdx] };
        prod.totalStock = Math.max(0, prod.totalStock - it.quantity);
        prod.salesVolume += it.quantity;

        // Decrement target options stock as well
        if (prod.options) {
          prod.options = prod.options.map(opt => {
            const chosenValue = it.options[opt.category];
            if (chosenValue) {
              return {
                ...opt,
                list: opt.list.map(listItem => {
                  if (listItem.name === chosenValue) {
                    return { ...listItem, stock: Math.max(0, listItem.stock - it.quantity) };
                  }
                  return listItem;
                })
              };
            }
            return opt;
          });
        }
        currentProducts[prodIdx] = prod;
      }
    });

    // 3. Create the order
    const freshOrder: Order = {
      id: orderId,
      merchantId: orderData.merchantId,
      customerId: currentUser.id,
      subtotal: orderData.subtotal,
      shippingFee: orderData.shippingFee,
      discount: orderData.discount,
      grandTotal: orderData.grandTotal,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress,
      status: 'waiting_approval', // First step
      createdAt: new Date().toISOString(),
      items: orderData.items
    };

    const newOrders = [freshOrder, ...orders];

    // 4. Update user balances (deduct buyer, deposit merchant if wallet used)
    let newUsers = [...users];
    if (orderData.paymentMethod === 'wallet') {
      newUsers = newUsers.map(u => {
        if (u.id === currentUser.id) {
          return { ...u, wallet: Math.max(0, u.wallet - orderData.grandTotal) };
        }
        if (u.id === orderData.merchantId) {
          return { ...u, wallet: u.wallet + orderData.grandTotal };
        }
        return u;
      });
    }

    // 5. Push transactional notification
    const orderNotification: SystemNotification = {
      id: `N-ORD-${Date.now()}`,
      userId: currentUser.id,
      title: "ชำระเงินพัสดุสำเร็จ รอร้านอนุมัติ",
      message: `ระบบได้รับใบคำสั่งซื้อเลขบิล ${orderId} ยอดรวม ${orderData.grandTotal.toLocaleString()} THB เรียบร้อยแล้วค่ะ! รอร้านค้ายืนยันรับคำสั่งซื้อสักครู่ค่ะ`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };

    const merchantNotification: SystemNotification = {
      id: `N-ORD-MER-${Date.now()}`,
      userId: orderData.merchantId,
      title: "มีออเดอร์ใหม่",
      message: `เลขออเดอร์: ${orderId}\nชื่อผู้ซื้อ: ${(currentUser.name || "ลูกค้าทั่วไป").substring(0, 4)}xxxxxxxx\n\nโปรดติดต่อผู้ดูแลส่วนตัวของท่านเพื่อยืนยันตัวตนร้านค้าและเปิดการมองเห็นเนื่องจากสมาชิกเป็นร้านค้าใหม่`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };

    const newNotifs = [orderNotification, merchantNotification, ...notifications];

    // Persist all databases state
    setProducts(currentProducts);
    setOrders(newOrders);
    setUsers(newUsers);
    setNotifications(newNotifs);

    setStoredData("paopao_products", currentProducts);
    setStoredData("paopao_orders", newOrders);
    setStoredData("paopao_users", newUsers);
    setStoredData("paopao_notifications", newNotifs);

    // Sync current session state
    const syncedBuyer = newUsers.find(u => u.id === currentUser.id);
    if (syncedBuyer) {
      setCurrentUser(syncedBuyer);
      localStorage.setItem("paopao_session_user", JSON.stringify(syncedBuyer));
    }

    // Clear active matched items from cart
    const purchasedProductIds = orderData.items.map(it => it.productId);
    const updatedCart = cart.filter(item => !purchasedProductIds.includes(item.product.id));
    setCart(updatedCart);
    setStoredData(`paopao_cart_${currentUser.id}`, updatedCart);

    logOnlineAction(
      "orders",
      "สั่งซื้อสินค้าสำเร็จ",
      `สั่งซื้อสินค้าออเดอร์ ${orderId} ยอดรวม ${orderData.grandTotal.toLocaleString()} บาท ชำระเงินด้วย ${orderData.paymentMethod === 'wallet' ? 'Wallet' : 'เก็บเงินปลายทาง (COD)'}`,
      `${currentUser.name} (${currentUser.id})`
    );

    alert(`ยินดีด้วยค่ะสั่งซื้อพัสดุ ${orderId} เสร็จสมบูรณ์แล้ว! ติดตามสถานะได้ในแถบเมนูคำสั่งซื้อย่อยค่ะ`);
    setActiveTab('orders');
  };

  const handleCancelOrder = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // Refund wallet funds only if paid via Wallet
    let newUsers = [...users];
    if (targetOrder.paymentMethod === 'wallet') {
      newUsers = newUsers.map(u => {
        if (u.id === targetOrder.customerId) {
          return { ...u, wallet: u.wallet + targetOrder.grandTotal };
        }
        if (u.id === targetOrder.merchantId) {
          return { ...u, wallet: Math.max(0, u.wallet - targetOrder.grandTotal) };
        }
        return u;
      });
    }

    // Update order status to Cancelled
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'cancelled' as const };
      }
      return o;
    });

    const refundNotification: SystemNotification = {
      id: `N-REF-${Date.now()}`,
      userId: targetOrder.customerId,
      title: "คำสั่งซื้อถูกยกเลิกแล้ว ได้รับเงินคืนเข้า Wallet",
      message: `คุณได้กดยกเลิกสินค้าพัสดุบิลเลขที่ ${orderId} เรียบร้อยแล้ว ระบบได้ดึงมูลค่าเงินคืนย้อนยอดจำนวน ${targetOrder.grandTotal.toLocaleString()} THB เข้าสู่ Wallet ร้านเป๋าเป่า สำเร็จแล้วจ้า`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };

    const merchantCancelNotification: SystemNotification = {
      id: `N-REF-MER-${Date.now()}`,
      userId: targetOrder.merchantId,
      title: `ใบสั่งซื้อบิล ${orderId} ถูกลูกค้ากดยกเลิกแล้ว ❌`,
      message: `มีรายการยกเลิกใหม่: ลูกค้าได้ทำการกดยกเลิกสิทธิ์คำสั่งซื้อ เลขบิลคู่สัญญา ${orderId} และเรียกเงินดึงระบบคืนเข้าเป๋า Wallet บัญชีเขาจำนวน ${targetOrder.grandTotal.toLocaleString()} THB เรียบร้อยแล้วค่ะ`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };

    const newNotifs = [refundNotification, merchantCancelNotification, ...notifications];

    setOrders(updatedOrders);
    setUsers(newUsers);
    setNotifications(newNotifs);

    setStoredData("paopao_orders", updatedOrders);
    setStoredData("paopao_users", newUsers);
    setStoredData("paopao_notifications", newNotifs);

    logOnlineAction(
      "orders",
      "ยกเลิกคำสั่งซื้อ",
      `ยกเลิกคำสั่งซื้อเลขบิล ${orderId} และเรียกคืนเงินเข้า Wallet จำนวน ${targetOrder.grandTotal.toLocaleString()} บาท`,
      currentUser ? `${currentUser.name} (${currentUser.id})` : "ระบบ"
    );

    // Sync session user
    if (currentUser) {
      const updatedSess = newUsers.find(u => u.id === currentUser.id);
      if (updatedSess) {
        setCurrentUser(updatedSess);
        localStorage.setItem("paopao_session_user", JSON.stringify(updatedSess));
      }
    }

    alert('กดยกเลิกรายการสั่งซื้อบิล และ ดึงยอดคืน Wallet ของคุณเสร็จสิ้นเรียบร้อย!');
  };

  const handleMarkReceived = (orderId: string) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'completed' as const };
      }
      return o;
    });

    setOrders(updatedOrders);
    setStoredData("paopao_orders", updatedOrders);

    logOnlineAction(
      "orders",
      "ยืนยันรับสินค้าสำเร็จ",
      `ลูกค้ากดยืนยันได้รับพัสดุและเสร็จสิ้นกระบวนการออเดอร์เลขบิล ${orderId}`,
      currentUser ? `${currentUser.name} (${currentUser.id})` : "ระบบ"
    );

    alert('ขอบคุณสำหรับความไว้วางใจในการกดรับพัสดุผลิตภัณฑ์ความงามจาก SEPHORA THAILAND หวังว่าจะได้ดีลบำรุงผิวสุดพิเศษกันรอบหน้าใหม่จ้า 🌟');
  };

  const handleMarkNotificationAsRead = (notifId: string) => {
    if (!currentUser) return;
    const updated = notifications.map(notif => {
      if (notif.id === notifId) {
        const readBy = notif.readBy || [];
        if (!readBy.includes(currentUser.id)) {
          return { ...notif, readBy: [...readBy, currentUser.id] };
        }
      }
      return notif;
    });

    setNotifications(updated);
    setStoredData("paopao_notifications", updated);
  };

  const handleMarkAllNotificationsAsRead = () => {
    if (!currentUser) return;
    const updated = notifications.map(notif => {
      const isRelevant = notif.userId === 'all' || notif.userId === currentUser.id;
      if (isRelevant) {
        const readBy = notif.readBy || [];
        if (!readBy.includes(currentUser.id)) {
          return { ...notif, readBy: [...readBy, currentUser.id] };
        }
      }
      return notif;
    });

    setNotifications(updated);
    setStoredData("paopao_notifications", updated);
  };

  const handleLogout = () => {
    localStorage.removeItem("paopao_session_user");
    setCurrentUser(null);
    setCart([]);
    setActiveTab('home');
    alert('ออกจากระบบจัดประวัติความปลอดภัยเรียบร้อยแล้วค่ะ!');
  };

  // --- PROFILE LOGGED IN DETAILS EDIT ---
  const handleUpdateAvatar = (url: string) => {
    if (!currentUser) return;
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, avatar: url };
      }
      return u;
    });
    setUsers(updatedUsers);
    setStoredData("paopao_users", updatedUsers);
    syncFromLocalStorage();
  };

  const handleUpdatePersonalInfo = (info: { nickname?: string; dob?: string; bankName?: string; bankAccount?: string; bankHolderName?: string }) => {
    if (!currentUser) return;
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          nickname: info.nickname !== undefined ? info.nickname : u.nickname,
          dob: info.dob !== undefined ? info.dob : u.dob,
          bankName: info.bankName !== undefined ? info.bankName : u.bankName,
          bankAccount: info.bankAccount !== undefined ? info.bankAccount : u.bankAccount,
          bankHolderName: info.bankHolderName !== undefined ? info.bankHolderName : u.bankHolderName,
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    setStoredData("paopao_users", updatedUsers);
    syncFromLocalStorage();
  };

  // --- LIVE CHAT SEND MESSAGE ---
  const handleSendChatMessage = (msg: string, img?: string) => {
    if (!currentUser) return;

    const newChat: ChatMessage = {
      id: `CH-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      sender: 'user',
      message: msg,
      image: img,
      createdAt: new Date().toISOString()
    };

    const newChats = [...chats, newChat];
    setChats(newChats);
    setStoredData("paopao_chats", newChats);

    // Mock automatic bot responder for custom admin feel
    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `CH-BOT-${Date.now() + 50}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone,
        sender: 'admin',
        message: "ระบบอัตโนมัติ SEPHORA: ทีมบริการลูกค้าได้รับข้อความและพยานหลักฐานของคุณเรียบร้อยแล้วค่ะ แอดมินจะรีบติดต่อตอบท่านกลับในทันทีนะคะ 🛎️",
        createdAt: new Date().toISOString()
      };
      const chatsWithReply = [...newChats, autoReply];
      setChats(chatsWithReply);
      setStoredData("paopao_chats", chatsWithReply);
    }, 1500);
  };

  // --- MERCHANT ORDER SHIPMENT CONFIRM ---
  const handleMerchantAcceptOrder = (orderId: string) => {
    if (currentUser?.isOrderEnabled === false) {
      alert("โปรดติดต่อผู้ดูแลส่วนตัวของท่านเพื่อทำการเปิดการมองเห็นหรือยืนยันตัวตนร้านค้าเพื่อให้สามารถรับ Order เพื่อจัดส่งได้ตามปกติค่ะ");
      return;
    }
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'in_transit' as const };
      }
      return o;
    });

    // Send push notification to customer
    const orderShipNotif: SystemNotification = {
      id: `N-SHIP-${Date.now()}`,
      userId: orders.find(o => o.id === orderId)?.customerId || 'all',
      title: "พัสดุของคุณได้รับการขนส่งออกเดินทางแล้ว",
      message: `สินค้าหมายเลขบิล ${orderId} ถูกจัดส่งโดยผู้ขายแล้ว สามารถติดตามสถานะการจัดส่งและหมายเลขพัสดุได้ในช่องทางแจ้งเตือนร้านค้าของคุณ`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };

    const newNotifs = [orderShipNotif, ...notifications];

    setOrders(updated);
    setNotifications(newNotifs);

    setStoredData("paopao_orders", updated);
    setStoredData("paopao_notifications", newNotifs);
    syncFromLocalStorage();
    alert(`อนุมัติคำสั่งซื้อบิล ${orderId} และจัดส่งเรียบร้อยแล้วค่ะ 🚚`);
  };

  // --- WITHDRAW DEPOSIT APPLICATION ---
  const handleRequestWithdrawal = (amount: number) => {
    if (!currentUser) return;

    const totalWithdrawsCount = withdrawals.length;
    const paddingNum = String(totalWithdrawsCount + 1).padStart(5, '0');
    const reqId = `W${paddingNum}`;

    const freshWithdraw: WithdrawalRequest = {
      id: reqId,
      merchantId: currentUser.id,
      merchantPhone: currentUser.phone,
      merchantName: currentUser.name,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const newWithdrawalsList = [freshWithdraw, ...withdrawals];
    setWithdrawals(newWithdrawalsList);
    setStoredData("paopao_withdrawals", newWithdrawalsList);

    syncFromLocalStorage();
  };

  // --- NEW PRODUCTS LOG ADD BY MERCHANTS ---
  const handleAddProduct = (productData: Omit<Product, 'id' | 'salesVolume'>) => {
    const countTotalProds = products.length;
    const paddingNum = String(countTotalProds + 1).padStart(5, '0');
    const assignedId = `P${paddingNum}`;

    const newProd: Product = {
      ...productData,
      id: assignedId,
      salesVolume: 0
    };

    const updatedProds = [newProd, ...products];
    setProducts(updatedProds);
    setStoredData("paopao_products", updatedProds);
    alert(`ส่งยื่นตรวจสินค้าใหม่ลงทะเบียนสำเร็จ! รหัสสินค้าคือ [${assignedId}] ยอดการตรวจสอบจะค้างรอการอนุญาตประเมินจากแอดมินก่อนขึ้นจริงหน้าร้านค่ะ`);
  };

  // --- EDIT PRODUCT BY STORE OWNER ---
  const handleEditProduct = (updatedProd: Product) => {
    const updated = products.map(p => {
      if (p.id === updatedProd.id) {
        return updatedProd;
      }
      return p;
    });

    setProducts(updated);
    setStoredData("paopao_products", updated);
    alert('บันทึกแก้ไขสินค้า และ อัปเดตข้อมูลจำนวนผ้าคลังสำแดงเรียบร้อย!');
  };

  // Authenticate triggers
  const handleLoginSuccess = (userObj: User) => {
    localStorage.setItem("paopao_session_user", JSON.stringify(userObj));
    setCurrentUser(userObj);
    setActiveTab('home');

    logOnlineAction(
      "users",
      "เข้าสู่ระบบสำเร็จ",
      `ผู้ใช้ ${userObj.name} (${userObj.id}) ได้ทำการล็อกอินเข้าสู่ระบบเรียบร้อย`,
      `${userObj.name} (${userObj.id})`
    );
  };

  const handleRegisterSuccess = (newUserObj: User) => {
    // Read the absolute latest users from localStorage to preserve concurrent modifications or registrations
    const freshUsers = getStoredData<User[]>("paopao_users", []);
    
    // Uniqueness fallback check on active master listing
    if (freshUsers.some(u => u.phone === newUserObj.phone)) {
      alert('เบอร์โทรศัพท์มือถือนี้สมัครสมาชิกระบบแล้วล่ะค่ะ!');
      return;
    }

    const updatedUsers = [...freshUsers, newUserObj];
    setUsers(updatedUsers);
    setStoredData("paopao_users", updatedUsers);
    
    logOnlineAction(
      "users",
      "สมัครสมาชิกสำเร็จ",
      `ผู้ใช้ชื่อ ${newUserObj.name} (โทร: ${newUserObj.phone}) ลงทะเบียนสมัครสมาชิกใหม่สำเร็จ (บทบาท: ${newUserObj.role})`,
      `${newUserObj.name} (${newUserObj.id})`
    );

    // Automatically log the newly registered user in immediately, and route to home
    localStorage.setItem("paopao_session_user", JSON.stringify(newUserObj));
    setCurrentUser(newUserObj);
    setActiveTab('home');
    alert('สมัครสมาชิกและเข้าสู่ระบบสำเร็จเรียบร้อยแล้วค่ะ! ยินดีต้อนรับสู่ SEPHORA THAILAND ค่ะ 🎉');
  };

  const handleRetryFirestoreConnection = () => {
    localStorage.removeItem("paopao_firestore_quota_exceeded");
    setFirestoreQuotaExceeded(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative antialiased selection:bg-red-500 selection:text-white">
      
      {firestoreQuotaExceeded && (
        <div id="firestore-quota-warning-banner" className="bg-amber-500 text-amber-950 px-4 py-3 shadow-md border-b border-amber-600 transition-all duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs md:text-sm font-medium">
            <div className="flex items-start md:items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-900 shrink-0 mt-0.5 md:mt-0" />
              <span>
                <strong>⚠️ โหมดใช้งานออฟไลน์อัตโนมัติ (Offline-First Local Storage):</strong> ขออภัยด้วยค่ะ ปัจจุบันสิทธิ์การเขียนข้อมูลของระบบคลาวด์รายวัน (Firestore Write Quota) เต็มชั่วคราว ระบบจึงได้เปลี่ยนเข้าสู่โหมดออฟไลน์เพื่อความปลอดภัย ข้อมูลของท่านจะได้รับการบันทึกอยู่ในเครื่องของท่านอย่างสมบูรณ์ และคุณยังสามารถลบสินค้า, แก้ไขราคา, และทำรายการทุกฟีเจอร์ได้ตามปกติ 100% ค่ะ
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
              <a 
                href="https://console.firebase.google.com/project/gen-lang-client-0631640025/firestore/databases/ai-studio-77b32e73-4355-4202-b52b-d1541ad1eaeb/data?openUpgradeDialog=true" 
                target="_blank" 
                rel="noreferrer"
                className="bg-amber-950/15 hover:bg-amber-950/25 text-amber-950 px-3 py-1.5 rounded-md border border-amber-950/20 text-xs flex items-center gap-1 transition-colors font-semibold"
              >
                จัดการแผนบริการ 🔗
              </a>
              <button 
                onClick={handleRetryFirestoreConnection}
                className="bg-amber-900 hover:bg-amber-950 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                ลองเชื่อมต่อใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL BRANDING HEADER */}
      <Header 
        currentUser={currentUser} 
        settings={settings} 
        cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
        onNavigate={(tab) => setActiveTab(tab)} 
        onOpenAdmin={() => setActiveTab('admin')}
      />

      {/* CORE NAVIGATION CONDITIONAL PANEL SWITCHES */}
      <div className="flex-1 pb-10">
        {activeTab === 'home' && (
          <HomeTab 
            products={products} 
            currentUser={currentUser} 
            settings={settings} 
            notifications={notifications} 
            onAddToCart={handleAddToCart}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onUpdateSettings={(updated) => { setSettings(updated); setStoredData("paopao_settings", updated); }}
          />
        )}

        {activeTab === 'login' && (
          <AuthView 
            settings={settings} 
            users={users} 
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
            currentTab={activeTab}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'cart' && (
          <CartTab 
            cart={cart} 
            currentUser={currentUser} 
            settings={settings} 
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveFromCart={handleRemoveFromCart}
            onCheckout={handleCheckout}
            userWalletBalance={currentUser?.wallet || 0}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab 
            orders={orders} 
            currentUser={currentUser} 
            settings={settings} 
            onCancelOrder={handleCancelOrder}
            onMarkReceived={handleMarkReceived}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab 
            notifications={notifications} 
            currentUser={currentUser} 
            settings={settings} 
            onNavigate={(tab) => setActiveTab(tab)}
            onMarkAsRead={handleMarkNotificationAsRead}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab 
            currentUser={currentUser} 
            settings={settings} 
            orders={orders} 
            chats={chats} 
            withdrawals={withdrawals} 
            deposits={deposits}
            onLogout={handleLogout}
            onUpdateAvatar={handleUpdateAvatar}
            onUpdatePersonalInfo={handleUpdatePersonalInfo}
            onSendChatMessage={handleSendChatMessage}
            onRequestWithdrawal={handleRequestWithdrawal}
            onMerchantAcceptOrder={handleMerchantAcceptOrder}
            onNavigate={(tab) => setActiveTab(tab)}
            onUpdateDeposits={(updated) => { setDeposits(updated); setStoredData("paopao_deposits", updated); }}
            products={products}
            onEditProduct={handleEditProduct}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel 
            currentUser={currentUser} 
            settings={settings} 
            users={users} 
            products={products} 
            orders={orders} 
            chats={chats} 
            withdrawals={withdrawals} 
            notifications={notifications} 
            deposits={deposits}
            onUpdateSettings={(updated) => { setSettings(updated); setStoredData("paopao_settings", updated); }}
            onUpdateUsers={(updated) => { setUsers(updated); setStoredData("paopao_users", updated); }}
            onUpdateProducts={(updated) => { 
              const currentIds = new Set(updated.map(p => p.id));
              const deletedProducts = products.filter(p => !currentIds.has(p.id));
              
              setProducts(updated); 
              setStoredData("paopao_products", updated); 

              if (deletedProducts.length > 0) {
                import("firebase/firestore").then(({ doc, deleteDoc }) => {
                  for (const p of deletedProducts) {
                    deleteDoc(doc(db, "products", p.id)).catch(e => {
                      console.error("Firestore direct delete error: ", e);
                    });
                  }
                });
              }
            }}
            onUpdateWithdrawals={(updated) => { setWithdrawals(updated); setStoredData("paopao_withdrawals", updated); }}
            onUpdateNotifications={(updated) => { setNotifications(updated); setStoredData("paopao_notifications", updated); }}
            onUpdateChats={(updated) => { setChats(updated); setStoredData("paopao_chats", updated); }}
            onUpdateDeposits={(updated) => { setDeposits(updated); setStoredData("paopao_deposits", updated); }}
            onManualRefresh={syncFromLocalStorage}
            onClose={() => setActiveTab('profile')}
          />
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR TAB */}
      <Footer 
        currentTab={activeTab} 
        onNavigate={(tab) => setActiveTab(tab)} 
        cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
        notificationCount={currentUser ? notifications.filter(notif => {
          const isRelevant = notif.userId === 'all' || notif.userId === currentUser.id;
          if (!isRelevant) return false;
          const readBy = notif.readBy || [];
          return !readBy.includes(currentUser.id);
        }).length : 0}
        ordersCount={currentUser ? orders.filter(o => o.customerId === currentUser.id && o.status !== 'completed' && o.status !== 'cancelled').length : 0}
        settings={settings}
      />

    </div>
  );
}
