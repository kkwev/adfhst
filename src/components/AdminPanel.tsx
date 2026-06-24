/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, DollarSign, Users, ShieldAlert, ShoppingBag, MessageSquare, Bell, 
  RefreshCw, Check, X, Search, UserPlus, Trash, Trash2, Edit3, Send, AlertTriangle, Eye, Server, ToggleLeft, Database
} from 'lucide-react';
import { 
  User, Product, Order, ChatMessage, SystemNotification, WithdrawalRequest, SystemSettings, DepositRequest, OnlineActionLog 
} from '../types';
import { logOnlineAction, getOnlineActionLogs } from '../db/local_db';

interface AdminPanelProps {
  currentUser: User | null;
  settings: SystemSettings;
  users: User[];
  products: Product[];
  orders: Order[];
  chats: ChatMessage[];
  withdrawals: WithdrawalRequest[];
  notifications: SystemNotification[];
  deposits: DepositRequest[];
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateWithdrawals: (withdrawals: WithdrawalRequest[]) => void;
  onUpdateNotifications: (notifications: SystemNotification[]) => void;
  onUpdateChats: (chats: ChatMessage[]) => void;
  onUpdateDeposits: (deposits: DepositRequest[]) => void;
  onManualRefresh: () => void;
  onClose: () => void;
}

export default function AdminPanel({
  currentUser,
  settings,
  users,
  products,
  orders,
  chats,
  withdrawals,
  notifications,
  deposits,
  onUpdateSettings,
  onUpdateUsers,
  onUpdateProducts,
  onUpdateWithdrawals,
  onUpdateNotifications,
  onUpdateChats,
  onUpdateDeposits,
  onManualRefresh,
  onClose
}: AdminPanelProps) {
  // Current admin module selector
  const [activeModule, setActiveModule] = useState<'settings' | 'financial' | 'users' | 'admins' | 'products' | 'chat' | 'push' | 'merchant_sales' | 'online_actions_log'>('settings');

  // Auto-Refresh requirement state (3 seconds interval tracker)
  const [countdown, setCountdown] = useState(3);
  const [isSyncing, setIsSyncing] = useState(false);

  // Search input filters per module
  const [financialPhoneSearch, setFinancialPhoneSearch] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [productSearchShop, setProductSearchShop] = useState('');
  const [chatSearchUser, setChatSearchUser] = useState('');
  const [pushPhoneSearch, setPushPhoneSearch] = useState('');

  // 1. Settings state
  const [settingsName, setSettingsName] = useState(settings.siteName);
  const [settingsLogo, setSettingsLogo] = useState(settings.siteLogo);
  const [settingsColor, setSettingsColor] = useState(settings.themeColor);
  const [settingsGradEnd, setSettingsGradEnd] = useState(settings.themeGradientEnd);
  const [settingsBanners, setSettingsBanners] = useState<string[]>(settings.banners);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [settingsCategories, setSettingsCategories] = useState<{ key: string; label: string; icon: string }[]>(settings.customCategories || []);
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛍️');

  // 2. Financial menu state
  const [memberDepositSelect, setMemberDepositSelect] = useState<User | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositComment, setDepositComment] = useState('');

  const [withdrawMerchantSelect, setWithdrawMerchantSelect] = useState<User | null>(null);
  const [withdrawAmountManual, setWithdrawAmountManual] = useState(0);
  const [withdrawCommentManual, setWithdrawCommentManual] = useState('');
  const [withdrawActionComment, setWithdrawActionComment] = useState('');
  const [expandedSlipUrl, setExpandedSlipUrl] = useState<string | null>(null);
  const [editingWithDrawalId, setEditingWithDrawalId] = useState<string | null>(null);
  const [editingWithDrawalAmount, setEditingWithDrawalAmount] = useState<number>(0);

  // 3. Member Management state
  const [createUserName, setCreateUserName] = useState('');
  const [createUserPhone, setCreateUserPhone] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'Customer' | 'Merchant' | 'Admin'>('Customer');
  const [createBankName, setCreateBankName] = useState('');
  const [createBankAccount, setCreateBankAccount] = useState('');
  const [createBankHolder, setCreateBankHolder] = useState('');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedUserName, setEditedUserName] = useState('');
  const [editedUserNickname, setEditedUserNickname] = useState('');
  const [editedUserPhone, setEditedUserPhone] = useState('');
  const [editedUserPassword, setEditedUserPassword] = useState('');
  const [editedUserRole, setEditedUserRole] = useState<any>('Customer');
  const [editedUserBank, setEditedUserBank] = useState('');
  const [editedUserBankAcc, setEditedUserBankAcc] = useState('');
  const [editedUserHolder, setEditedUserHolder] = useState('');

  // 4. Admin management (Super Admin only: 0099887766)
  const [minorAdminPhone, setMinorAdminPhone] = useState('');
  const [minorAdminPass, setMinorAdminPass] = useState('');

  // 5. Product Approval comment
  const [rejectProductReason, setRejectProductReason] = useState<{ [pId: string]: string }>({});
  const [editingCatalogProduct, setEditingCatalogProduct] = useState<Product | null>(null);

  // 6. Live Chat Active Admin Side channel
  const [activeAdminChatUserId, setActiveAdminChatUserId] = useState<string | null>(null);
  const [adminChatResponse, setAdminChatResponse] = useState('');

  // 7. Direct Push Notification text
  const [pushSelectedUser, setPushSelectedUser] = useState<User | null>(null);
  const [pushMessageTitle, setPushMessageTitle] = useState('');
  const [pushMessageBody, setPushMessageBody] = useState('');
  const [pushHighlightColor, setPushHighlightColor] = useState('#FF1E27');

  // 9. Online Actions Log states
  const [actionLogs, setActionLogs] = useState<OnlineActionLog[]>([]);
  const [logSearchText, setLogSearchText] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('all');

  useEffect(() => {
    setActionLogs(getOnlineActionLogs());

    const handleNewLog = () => {
      setActionLogs(getOnlineActionLogs());
    };
    window.addEventListener("paopao_online_action_logged", handleNewLog);
    return () => {
      window.removeEventListener("paopao_online_action_logged", handleNewLog);
    };
  }, []);

  const themePrimary = settings.themeColor || '#FF1E27';
  const themeGradientEnd = settings.themeGradientEnd || '#FF5E62';

  // --- AUTO-REFRESH SCRIPT CORE ---
  // "หน้านี้ต้องมีการสร้างสคริปต์ให้ Auto-Refresh ข้อมูลทุกๆ 3 วินาที เพื่อสแตนด์บายรอรับข้อมูลใหม่"
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Defer parent state update to next tick to avoid "Cannot update a component while rendering a different component"
          setTimeout(() => {
            setIsSyncing(true);
            onManualRefresh();
            setTimeout(() => setIsSyncing(false), 800);
          }, 0);
          return 3; // Reset
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onManualRefresh]);

  // Sync state values when settings loads
  useEffect(() => {
    setSettingsName(settings.siteName);
    setSettingsLogo(settings.siteLogo);
    setSettingsColor(settings.themeColor);
    setSettingsGradEnd(settings.themeGradientEnd);
    setSettingsBanners(settings.banners);
    setSettingsCategories(settings.customCategories || []);
  }, [settings]);

  // Access constraints audit: ONLY Admins/SuperAdmins can enter
  const isAuthorized = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin');
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center bg-white rounded-3xl max-w-md mx-auto mt-10 shadow border">
        <AlertTriangle size={48} className="text-[#FF1E27] animate-bounce" />
        <h3 className="text-sm font-black text-gray-800 mt-4 uppercase">เข้าถึงแดชบอร์ดหลังบ้านถูกปฏิเสธ</h3>
        <p className="text-xs text-gray-500 mt-2">สิทธิ์บัญชีของท่านไม่เพียงพอในการเปิดแผงควบคุมหลักบริหารหลังบ้าน SEPHORA THAILAND ค่ะ</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 font-bold text-xs rounded-xl text-white">
          ย้อนกลับหน้าช้อปปิ้ง
        </button>
      </div>
    );
  }

  // --- Settings Module Action ---
  const handleAdminLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("โลโก้ขนาดใหญ่เกินไปค่ะ! (สูงสุดไม่เกิน 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettingsLogo(reader.result as string);
        alert("อัปโหลดและเปลี่ยนไฟล์โลโก้แบรนด์สำเร็จแล้วค่ะ! 🎨");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("สไลเดอร์แบนเนอร์ขนาดใหญ่เกินไปค่ะ! (สูงสุดไม่เกิน 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSettingsBanners([...settingsBanners, base64String]);
        alert("อัปโหลดบอร์ดภาพสไลเดอร์แบนเนอร์ (สัดส่วน 1200x450 pixels) จากไฟล์เครื่องสำเร็จจ้า! 🖼️");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      siteName: settingsName,
      siteLogo: settingsLogo,
      themeColor: settingsColor,
      themeGradientEnd: settingsGradEnd,
      banners: settingsBanners,
      customCategories: settingsCategories
    });
    logOnlineAction(
      "settings",
      "อัปเดตสไตล์และแบรนดิ้งระบบ",
      `อัปเดตชื่อเว็บเป็น "${settingsName}" และปรับแต่งระบบแผงควบคุมแบนเนอร์และสีธีมสำเร็จ`,
      currentUser ? `${currentUser.name} (${currentUser.id})` : "ผู้ดูแลระบบ"
    );
    alert('บันทึกอัปเดตระบบธีมและแบรนดิ้งส่งไปหน้า Front-end เรียบร้อยจ้า!');
  };

  const handleAddBanner = () => {
    if (!newBannerUrl.trim()) return;
    setSettingsBanners([...settingsBanners, newBannerUrl.trim()]);
    setNewBannerUrl('');
  };

  const handleRemoveBanner = (idx: number) => {
    setSettingsBanners(settingsBanners.filter((_, i) => i !== idx));
  };

  // --- Financial Module Action ---
  const handleLookupFinancialUser = () => {
    if (financialPhoneSearch.length !== 10) {
      alert('ป้อนเบอร์โทรติดต่อผู้ใช้ให้ถูกต้อง (10 หลัก)');
      return;
    }
    const found = users.find(u => u.phone === financialPhoneSearch);
    if (!found) {
      alert('ไม่พบบัญชีผู้ใช้ที่มีหมายเลขเบอร์โทรศัพท์นี้ค่ะ');
      setMemberDepositSelect(null);
      setWithdrawMerchantSelect(null);
      return;
    }
    setMemberDepositSelect(found);
    setWithdrawMerchantSelect(found); // Allow manual withdrawals for all roles (every category)
  };

  const handleExecuteDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberDepositSelect || depositAmount <= 0) return;

    const updated = users.map(u => {
      if (u.id === memberDepositSelect.id) {
        return { ...u, wallet: u.wallet + depositAmount };
      }
      return u;
    });

    onUpdateUsers(updated);

    // Record manual deposit so it shows in user's transactions
    const freshManualDeposit: DepositRequest = {
      id: `DEP-MAN-${Date.now()}`,
      userId: memberDepositSelect.id,
      userPhone: memberDepositSelect.phone,
      userName: memberDepositSelect.name,
      amount: depositAmount,
      slipImage: 'manual_admin_credit',
      status: 'approved',
      createdAt: new Date().toISOString()
    };
    onUpdateDeposits([freshManualDeposit, ...deposits]);

    // Write a dummy order push of the funding transaction
    const newNotif: SystemNotification = {
      id: `N-DEP-${Date.now()}`,
      userId: memberDepositSelect.id,
      title: "เติมเงิน Wallet สำเร็จผ่านแอดมินหลังบ้าน",
      message: `แอดมินได้เติมคริสพาวเวอร์ฝากเงินจำนวน ${depositAmount.toLocaleString()} THB เข้า Wallet ของคุณเรียบร้อยแล้วค่ะ! ขอให้สนุกกับการช้อปปิ้งออนไลน์ (หมายเหตุเพิ่มเติม: ${depositComment || 'ทำรายการเครดิตสำเร็จ'})`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };
    onUpdateNotifications([...notifications, newNotif]);

    logOnlineAction(
      "financial",
      "เติมเงินระบบสำเร็จ (แอดมิน)",
      `แอดมินเติมเงินจำนวน ${depositAmount.toLocaleString()} บาท แก่สมาชิก ${memberDepositSelect.name} (${memberDepositSelect.id}) เหตุผล: ${depositComment || 'ทำรายการเติมเงินโดยแอดมินหลังบ้าน'}`,
      currentUser ? `${currentUser.name} (${currentUser.id})` : "ผู้ดูแลระบบ"
    );

    alert(`เครดิตเติมเงินจำนวน ${depositAmount} THB เข้าสู่ประเป๋าเงินของคุณ ${memberDepositSelect.name} สำเร็จและส่ง Push แจ้งเตือนแล้ว!`);
    setDepositAmount(0);
    setDepositComment('');
    setMemberDepositSelect(null);
    setFinancialPhoneSearch('');
  };

  const handleExecuteWithdrawManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawMerchantSelect || withdrawAmountManual <= 0) return;

    if (withdrawMerchantSelect.wallet < withdrawAmountManual) {
      alert('ยอดระบุทำรายการถอนหักเงินนี้ เกินกว่ายอดเงินคงคลังที่มีอยู่ในกระเป๋าตังค์ (Wallet) ของบัญชีดังกล่าวค่ะ!');
      return;
    }

    const updated = users.map(u => {
      if (u.id === withdrawMerchantSelect.id) {
        return { ...u, wallet: u.wallet - withdrawAmountManual };
      }
      return u;
    });

    onUpdateUsers(updated);

    // Dynamic push notification of manually withdrawn funds from system wallet
    const newNotif: SystemNotification = {
      id: `N-WDR-${Date.now()}`,
      userId: withdrawMerchantSelect.id,
      title: "หักลดยอดเงิน Wallet สำเร็จจากแอดมินหลังบ้าน 📥",
      message: `แอดมินได้ตกลงกดยอดถอนหักเงินออกจากประเป๋าตังค์คู่สัญญานัดหมายจำนวน ${withdrawAmountManual.toLocaleString()} THB สำเร็จกัปตัน (หมายเหตุแนบ: ${withdrawCommentManual || 'ไม่มีหมายเหตุระบุไว้'})`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };
    onUpdateNotifications([...notifications, newNotif]);

    logOnlineAction(
      "financial",
      "หักยอดเงินสำเร็จ (แอดมิน)",
      `แอดมินดำเนินการหัก/ถอนเงินจำนวน ${withdrawAmountManual.toLocaleString()} บาท จากสมาชิก ${withdrawMerchantSelect.name} (${withdrawMerchantSelect.id}) หมายเหตุ: ${withdrawCommentManual || 'ทำรายการหักเงินโดยแอดมินหลังบ้าน'}`,
      currentUser ? `${currentUser.name} (${currentUser.id})` : "ผู้ดูแลระบบ"
    );

    alert(`ทำการถอนเงินจำนวน ${withdrawAmountManual.toLocaleString()} THB จากบัญชีคุณ ${withdrawMerchantSelect.name} สมบูรณ์แบบ ยอดเงินในเป๋าตังค์ลบออกเรียบร้อยจ้า! ✨`);
    setWithdrawAmountManual(0);
    setWithdrawCommentManual('');
    setWithdrawMerchantSelect(null);
    setFinancialPhoneSearch('');
  };

  const handleApproveWithDrawalRequest = (reqId: string, approve: boolean) => {
    const matchedReq = withdrawals.find(w => w.id === reqId);
    if (!matchedReq) return;

    if (matchedReq.status !== 'pending') {
      alert('คำขอถอนเงินรายการนี้ถูกประมวลผลไปเสร็จสิ้นแล้วค่ะ');
      return;
    }

    const requestOwner = users.find(u => u.id === matchedReq.merchantId);
    if (!requestOwner) return;

    // Update Withdrawal Request status
    const updatedReqs = withdrawals.map(w => {
      if (w.id === reqId) {
        return { ...w, status: approve ? 'approved' as const : 'rejected' as const, comment: withdrawActionComment };
      }
      return w;
    });
    onUpdateWithdrawals(updatedReqs);

    // If APPROVED, deduct the money from the user's wallet
    if (approve) {
      const updatedUsers = users.map(u => {
        if (u.id === matchedReq.merchantId) {
          return { ...u, wallet: Math.max(0, u.wallet - matchedReq.amount) };
        }
        return u;
      });
      onUpdateUsers(updatedUsers);
    }

    // Direct push notification of results
    const responseNotif: SystemNotification = {
      id: `N-WIT-${Date.now()}`,
      userId: matchedReq.merchantId,
      title: approve ? "คำขอถอนเงิน Wallet ได้รับอนุมัติโอนแล้ว" : "คำขอถอนเงิน Wallet ถูกปฏิเสธ",
      message: approve 
        ? `ยินดีด้วยค่ะ คำร้องขอเบิกถอนเงินจำนวน ${matchedReq.amount.toLocaleString()} THB ได้รับการอนุมัติโอนและยืนยันการตัดเครดิตเรียบร้อยแล้วค่ะ (หมายเหตุแอดมิน: ${withdrawActionComment || 'โอนผ่านระบบธนาคารแล้ว'})`
        : `รายการถอน จำนวน ${matchedReq.amount.toLocaleString()} บาท ของคุณถูกปฏิเสธ${withdrawActionComment ? ` (${withdrawActionComment})` : ''}`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };
    onUpdateNotifications([...notifications, responseNotif]);

    logOnlineAction(
      "financial",
      approve ? "อนุมัติการถอนเงิน" : "ปฏิเสธการถอนเงิน",
      `${approve ? 'อนุมัติ' : 'ปฏิเสธ'}การเบิกถอนเงินจำนวน ${matchedReq.amount.toLocaleString()} บาท ของร้าน ${matchedReq.merchantName} (${matchedReq.merchantId}) หมายเหตุ: ${withdrawActionComment || 'ไม่มี'}`,
      currentUser ? `${currentUser.name} (${currentUser.id})` : "ผู้ดูแลระบบ"
    );

    alert(`ดำเนินการ ${approve ? 'อนุมัติจ่ายเงินและหัก Wallet ถาวร' : 'ปฏิเสธคำขอถอนเงินสำเร็จ'} ของรหัสบิลถอน ${reqId} ยอด ${matchedReq.amount.toLocaleString()} THB สำเร็จแล้วค่ะ!`);
    setWithdrawActionComment('');
  };

  const handleProcessDepositRequest = (reqId: string, approve: boolean) => {
    const matchedReq = deposits.find(d => d.id === reqId);
    if (!matchedReq) return;

    if (matchedReq.status !== 'pending') {
      alert('คำร้องฝากแจ้งยอดยืนยันนี้ได้รับการพิจารณาและเปลี่ยนแปลงสิทธิ์เสร็จสิ้นแล้วค่ะ');
      return;
    }

    const requestOwner = users.find(u => u.id === matchedReq.userId);
    if (!requestOwner) {
      alert('ไม่พบบัญชีผู้ใช้ลูกค้าของรายการฝากนี้ในโครงสร้างข้อมูลระบบค่ะ');
      return;
    }

    // Update Deposit Request status
    const updatedDeposits = deposits.map(d => {
      if (d.id === reqId) {
        return { ...d, status: approve ? 'approved' as const : 'rejected' as const };
      }
      return d;
    });
    onUpdateDeposits(updatedDeposits);

    // If approved, top up the user's wallet
    if (approve) {
      const updatedUsers = users.map(u => {
        if (u.id === matchedReq.userId) {
          return { ...u, wallet: u.wallet + matchedReq.amount };
        }
        return u;
      });
      onUpdateUsers(updatedUsers);
    }

    // Direct push notification of results
    const responseNotif: SystemNotification = {
      id: `N-DEP-${Date.now()}`,
      userId: matchedReq.userId,
      title: approve ? "การแจ้งฝากเงินได้รับการอนุมัติเติมเครดิตแล้ว" : "การแจ้งฝากเงินของคุณถูกปฏิเสธ",
      message: approve 
        ? `ยอดเงินฝากจำนวน ${matchedReq.amount.toLocaleString()} บาท ได้รับการอนุมัติเรียบร้อยแล้วและเพิ่มยอดเงินเข้าสู่ Wallet ของคุณแล้วค่ะ ขอให้สนุกกับการช้อปปิ้งนะคะ 💖`
        : `ยอดแจ้งฝากเงินจำนวน ${matchedReq.amount.toLocaleString()} THB ถูกปฏิเสธเนื่องจากตรวจสอบพบความขัดแย้งของข้อมูลหรือรูปสลิปไม่สมบูรณ์ โปรดทำรายการอีกครั้งค่ะ`,
      isSystemAnnouncement: false,
      createdAt: new Date().toISOString()
    };
    onUpdateNotifications([...notifications, responseNotif]);

    logOnlineAction(
      "financial",
      approve ? "อนุมัติการฝากเงิน" : "ปฏิเสธการฝากเงิน",
      `${approve ? 'อนุมัติเพิ่มเครดิต' : 'ปฏิเสธคำร้องฝาก'}จำนวน ${matchedReq.amount.toLocaleString()} บาท ของสมาชิก ${matchedReq.userName} (${matchedReq.userId})`,
      currentUser ? `${currentUser.name} (${currentUser.id})` : "ผู้ดูแลระบบ"
    );

    alert(`ดำเนินการ ${approve ? 'อนุมัติเพิ่มเครดิต Wallet' : 'ปฏิเสธคำขอฝาก'} ของรหัสบิลฝาก ${reqId} ยอด ${matchedReq.amount.toLocaleString()} THB สำเร็จเรียบร้อยค่ะ!`);
  };

  // --- Member Admin Creation & Control actions ---
  const handleCreateUserByAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (createUserPhone.length !== 10) {
      alert('ระบุเบอร์โทรศัพท์ 10 หลักด้วยค่ะ');
      return;
    }
    if (createUserPassword.length < 8) {
      alert('กรุณาตั้งรหัสผ่านความปลอดภัยอย่างน้อย 8 ตัวอักษรขึ้นไปค่ะ');
      return;
    }

    // Verify duplication
    const duplicated = users.some(u => u.phone === createUserPhone);
    if (duplicated) {
      alert('เบอร์โทรศัพท์ของหมายเลขนี้มีบัญชีใช้งานเรียบร้อยแล้วค่ะ');
      return;
    }

    // Allocate ID prefix
    const countThisRole = users.filter(u => u.role === createUserRole).length;
    const prefix = createUserRole === 'Customer' ? 'M' : createUserRole === 'Merchant' ? 'S' : 'A';
    const paddingNum = String(countThisRole + 1).padStart(5, '0');
    const allocatedId = `${prefix}${paddingNum}`;

    const newUser: User = {
      id: allocatedId,
      name: createUserName,
      phone: createUserPhone,
      password: createUserPassword,
      role: createUserRole,
      status: 'active',
      wallet: 0,
      bankName: createUserRole === 'Merchant' ? createBankName : undefined,
      bankAccount: createUserRole === 'Merchant' ? createBankAccount : undefined,
      bankHolderName: createUserRole === 'Merchant' ? createBankHolder : undefined,
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${createUserName}`
    };

    onUpdateUsers([...users, newUser]);
    alert(`สร้างบัญชีสำเร็จ: ได้รับสิทธิ์ ID [${allocatedId}] ของตำแหน่งประเภทบัญชี [${createUserRole}] เรียบร้อยค่ะ`);
    
    // Clear forms
    setCreateUserName('');
    setCreateUserPhone('');
    setCreateUserPassword('');
    setCreateBankName('');
    setCreateBankAccount('');
    setCreateBankHolder('');
  };

  const handleUpdateUserFreezeStatus = (userId: string, isFrozen: boolean) => {
    const current = users.find(u => u.id === userId);
    if (!current) return;

    if (current.role === 'SuperAdmin') {
      alert('คุณไม่สามารถอายัด หรือแบนบัญชีผู้ดูแลระบบสูงสุด (SuperAdmin) เซฟตี้ได้!');
      return;
    }

    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, status: isFrozen ? 'suspended' as const : 'active' as const };
      }
      return u;
    });

    onUpdateUsers(updated);
    alert(`อัปเดตสิทธิ์บัญชี ${current.name} เป็น: [${isFrozen ? 'อายัดชั่วคราว (Suspended)' : 'เปิดใช้ปกติ (Active)'}]`);
  };

  const handleUpdateUserBanForever = (userId: string) => {
    const current = users.find(u => u.id === userId);
    if (!current) return;

    if (current.role === 'SuperAdmin') {
      alert('คุณไม่สามารถแบนไอดี Super Admin หลักได้!');
      return;
    }

    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, status: 'banned' as const };
      }
      return u;
    });

    onUpdateUsers(updated);
    alert(`แบนบัญชี ${current.name} ตลอดชีพ (Banned) เรียบร้อย สมาชิกรายนี้จะไม่สามารถลงชื่อล็อกอินเข้าระบบ SEPHORA THAILAND ได้อีกต่อไป`);
  };

  const startEditingUser = (u: User) => {
    setEditingUserId(u.id);
    setEditedUserName(u.name);
    setEditedUserNickname(u.nickname || '');
    setEditedUserPhone(u.phone);
    setEditedUserPassword(u.password);
    setEditedUserRole(u.role);
    setEditedUserBank(u.bankName || '');
    setEditedUserBankAcc(u.bankAccount || '');
    setEditedUserHolder(u.bankHolderName || '');
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    const updated = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: editedUserName,
          nickname: editedUserNickname || undefined,
          phone: editedUserPhone,
          password: editedUserPassword,
          role: editedUserRole as any,
          bankName: editedUserBank || undefined,
          bankAccount: editedUserBankAcc || undefined,
          bankHolderName: editedUserHolder || undefined
        };
      }
      return u;
    });

    onUpdateUsers(updated);
    setEditingUserId(null);
    alert('บันทึกแก้ไขข้อมูลส่วนบุคคลและสิทธิ์บัญชีสมาชิกสำเร็จเรียบร้อยค่ะ!');
  };

  // --- Sub-Admin management (Super Admin only check) ---
  const isSuperAdmin = currentUser && currentUser.role === 'SuperAdmin';

  const handleCreateMinorAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (minorAdminPhone.length !== 10) {
      alert('เบอร์ติดต่อแอดมินผู้ช่วยจำต้องครบ 10 หลักค่ะ');
      return;
    }
    if (minorAdminPass.length < 8) {
      alert('รหัสผ่านแอดมินผู้ช่วยจำอย่างน้อย 8 หลักค่ะ');
      return;
    }

    // Roll allocate ID prefix A
    const adminCount = users.filter(u => u.role === 'Admin').length;
    const paddingNum = String(adminCount + 2).padStart(5, '0'); // start high
    const newAdminId = `A${paddingNum}`;

    const newAdmin: User = {
      id: newAdminId,
      name: `นายแอดมินผู้ช่วย (${adminCount + 1})`,
      phone: minorAdminPhone,
      password: minorAdminPass,
      role: 'Admin',
      status: 'active',
      wallet: 1000,
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Admin${minorAdminPhone}`
    };

    onUpdateUsers([...users, newAdmin]);
    setMinorAdminPhone('');
    setMinorAdminPass('');
    alert(`เพิ่มบัญชีแอดมินผู้ช่วยสิทธิ์ระดับรอง ID [${newAdminId}] สำเร็จเรียบร้อยจ้า!`);
  };

  // --- central products edit center actions ---
  const handleProductApproval = (productId: string, approve: boolean) => {
    const comment = rejectProductReason[productId] || '';

    const updated = products.map(p => {
      if (p.id === productId) {
        return { 
          ...p, 
          status: approve ? 'approved' as const : 'rejected' as const,
          rejectionReason: approve ? undefined : (comment || "รายละเอียดเนื้อหาไม่ถูกต้องตามมาตรฐานกองกลาง")
        };
      }
      return p;
    });

    onUpdateProducts(updated);

    // Look for merchant ID
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const respNotif: SystemNotification = {
        id: `N-PROD-${Date.now()}`,
        userId: prod.merchantId,
        title: approve ? "สินค้าผลิตภัณฑ์ของคุณได้รับการอนุมัติวางจำหน่ายแล้ว!" : "คำขอเพิ่มสินค้าของท่านถูกปฏิเสธระงับ",
        message: approve 
          ? `ยินดีด้วยค่ะ สินค้า "${prod.name}" ของร้านร้านค้าได้รับการอนุมัติและวางจัดแสดงขึ้นสู่หน้าแรกเรียบร้อยแล้วค่ะ!`
          : `เรียนพันธมิตรร้านค้า: สินค้าคราวด์แบรนดิ้ง "${prod.name}" ถูกส่งเอกสารระงับชั่วคราวเนื่องจาก (เหตุผล: ${comment || 'ข้อมูลไม่ครบถ้วน'})`,
        isSystemAnnouncement: false,
        createdAt: new Date().toISOString()
      };
      onUpdateNotifications([...notifications, respNotif]);
    }

    alert(`ดำเนินการปรับสถานะสินค้าเป็น: [${approve ? 'อนุมัติวางขาย (Approved)' : 'ปฏิเสธระงับ (Rejected)'}] สำเร็จลุล่วงค่ะ!`);
  };

  const handleDeleteProductCentral = (pId: string) => {
    const productToDelete = products.find(p => p.id === pId);
    if (!productToDelete) return;
    
    const filtered = products.filter(p => p.id !== pId);
    onUpdateProducts(filtered);
    
    if (editingCatalogProduct?.id === pId) {
      setEditingCatalogProduct(null);
    }
  };

  const handleDeleteAllProductsCentral = () => {
    if (products.length === 0) {
      return;
    }
    onUpdateProducts([]);
    if (editingCatalogProduct) {
      setEditingCatalogProduct(null);
    }
  };

  const handleSaveCatalogProductCentral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatalogProduct) return;

    // Align option stocks with edited totalStock
    const alignedProduct = { ...editingCatalogProduct };
    if (alignedProduct.options && alignedProduct.options.length > 0) {
      alignedProduct.options = alignedProduct.options.map(opt => ({
        ...opt,
        list: opt.list.map(item => ({
          ...item,
          stock: alignedProduct.totalStock
        }))
      }));
    }

    const updated = products.map(p => {
      if (p.id === alignedProduct.id) {
        return alignedProduct;
      }
      return p;
    });

    onUpdateProducts(updated);
    setEditingCatalogProduct(null);
    alert('บันทึกแก้ไขสินค้าแอดมินระบบกลางเสร็จสมบูรณ์เรียบร้อยแล้วค่ะ!');
  };

  // --- Live Chat Support actions ---
  const handleAdminResponseSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdminChatUserId || !adminChatResponse.trim()) return;

    const userToReply = users.find(u => u.id === activeAdminChatUserId);
    if (!userToReply) return;

    const newMsg: ChatMessage = {
      id: `CH-REP-${Date.now()}`,
      userId: activeAdminChatUserId,
      userName: userToReply.name,
      userPhone: userToReply.phone,
      sender: 'admin',
      message: adminChatResponse.trim(),
      createdAt: new Date().toISOString()
    };

    onUpdateChats([...chats, newMsg]);
    setAdminChatResponse('');
  };

  // --- Direct push notifications module ---
  const handleLookupPushUser = () => {
    if (pushPhoneSearch.length !== 10) {
      alert('ป้อนเบอร์โทรติดต่อผู้ใช้ให้ถูกต้อง (10 หลัก)');
      return;
    }
    const found = users.find(u => u.phone === pushPhoneSearch);
    if (!found) {
      alert('ไม่พบข้อมูลบัญชีผู้เรียนสายนี้เลยค่ะ');
      setPushSelectedUser(null);
      return;
    }
    setPushSelectedUser(found);
    setPushPhoneSearch('');
  };

  const handlePushDirectNotifByAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushSelectedUser || !pushMessageTitle.trim() || !pushMessageBody.trim()) {
      alert('กรุณากรอกทั้งหัวข้อ และข้อความแจ้งเตือนด้วยค่ะ');
      return;
    }

    const freshNotif: SystemNotification = {
      id: `N-PUSH-${Date.now()}`,
      userId: pushSelectedUser.id,
      title: pushMessageTitle.trim(),
      message: pushMessageBody.trim(),
      isSystemAnnouncement: false, // Individual push
      highlightColor: pushHighlightColor, // glowing contrast
      createdAt: new Date().toISOString()
    };

    onUpdateNotifications([...notifications, freshNotif]);
    alert(`ยิงสาร Push Notification หาคุณ ${pushSelectedUser.name} เรียบร้อยแล้วในเฉดสีไฮไลท์พิเศษ [${pushHighlightColor}] !`);

    // Reset Forms
    setPushMessageTitle('');
    setPushMessageBody('');
    setPushSelectedUser(null);
  };

  // Filtering collections for tables
  const filteredUsersList = users.filter(usr => {
    return usr.phone.includes(userSearchText) || usr.id.toLowerCase().includes(userSearchText.toLowerCase()) || usr.name.toLowerCase().includes(userSearchText.toLowerCase());
  });

  const filteredProductsListApproval = products.filter(p => p.status === 'pending');

  const filteredChatsGroupedByUsers = Object.values(
    chats.reduce((acc: { [uId: string]: ChatMessage }, currentMsg) => {
      const uId = currentMsg.userId;
      if (!acc[uId] || new Date(currentMsg.createdAt) > new Date(acc[uId].createdAt)) {
        acc[uId] = currentMsg;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      {/* 1. BACKEND CONTROL TOP BANNER */}
      <div className="bg-gray-900 text-white px-4 py-3 sm:px-8 border-b-2 border-red-500 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#FF1E27] to-[#FF5E62] flex items-center justify-center p-2 text-white shadow shadow-red-500/20">
            <Server size={16} />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight block uppercase text-[#FF1E27] font-display">SEPHORA BACK-END DATABASE GATEWAY</span>
            <span className="text-[9px] font-bold text-gray-400 block tracking-widest font-mono leading-none mt-1">
              ROLE RECRUIT: {currentUser?.name} ({currentUser?.role})
            </span>
          </div>
        </div>

        {/* Dynamic countdown visual cycle with manual Refresh button */}
        <div className="flex items-center gap-3 shrink-0 bg-white/5 p-2 rounded-xl border border-white/10">
          {/* 3-Second countdown auto refresh ring */}
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-green-400 animate-ping' : 'bg-red-500'}`}></span>
            <span className="text-[10px] font-bold text-gray-300 font-mono select-none">
              AUTO-SYNC: {countdown}S
            </span>
          </div>

          <button
            id="admin-manual-refresh-btn"
            onClick={() => {
              setIsSyncing(true);
              onManualRefresh();
              setTimeout(() => setIsSyncing(false), 900);
            }}
            title="กดปุ่มเพื่อดึงข้อมูลอัปเดตกดรีเฟรชเฉพาะส่วนของหลังบ้าน (Refresh Back-end State)"
            className="p-2 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[10px] tracking-wider flex items-center gap-1.5 transition-all shadow-md hover:scale-[1.03] cursor-pointer"
          >
            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
            <span>🔄 รีเฟรชเฉพาะระบบหลังบ้าน</span>
          </button>

          <button
            onClick={onClose}
            className="text-[9px] font-black text-white hover:text-[#FF1E27] uppercase pl-1 transition-colors"
          >
            ออกจากระบบจำลอง
          </button>
        </div>
      </div>

      {/* 2. TAB MENU BAR */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-8 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 text-xs">
        <button
          onClick={() => setActiveModule('settings')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'settings' ? 'bg-gray-905 bg-gray-900 text-white border-transparent shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <Settings size={14} />
          <span className="text-[9px] leading-none text-center">1. ตั้งค่าระบบ</span>
        </button>

        <button
          onClick={() => setActiveModule('financial')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'financial' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <DollarSign size={14} />
          <span className="text-[9px] leading-none text-center">2. บัญชีฝาก/ถอน</span>
        </button>

        <button
          onClick={() => setActiveModule('users')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'users' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <Users size={14} />
          <span className="text-[9px] leading-none text-center">3. จัดการสมาชิก</span>
        </button>

        <button
          disabled={!isSuperAdmin}
          onClick={() => setActiveModule('admins')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border disabled:opacity-50 ${
            activeModule === 'admins' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-xs shadow-sm'
          }`}
        >
          <ShieldAlert size={14} />
          <span className="text-[9px] leading-none text-center">4. ดูแลแอดมิน</span>
        </button>

        <button
          onClick={() => setActiveModule('products')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'products' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <ShoppingBag size={14} />
          <span className="text-[9px] leading-none text-center">5. คุมสต็อกช็อป</span>
        </button>

        <button
          onClick={() => setActiveModule('chat')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'chat' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <MessageSquare size={14} />
          <span className="text-[9px] leading-none text-center">6. แชตตอบแผง</span>
        </button>

        <button
          onClick={() => setActiveModule('push')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'push' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <Bell size={14} />
          <span className="text-[9px] leading-none text-center">7. ส่งแจ้งเตือน</span>
        </button>

        <button
          onClick={() => setActiveModule('merchant_sales')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'merchant_sales' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <ToggleLeft size={14} />
          <span className="text-[9px] leading-none text-center font-display">8. คุมการขายร้านค้า</span>
        </button>

        <button
          onClick={() => setActiveModule('online_actions_log')}
          className={`py-3 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
            activeModule === 'online_actions_log' ? 'bg-gray-900 border-transparent text-white shadow shadow-red-200' : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'
          }`}
        >
          <Database size={14} />
          <span className="text-[9px] leading-none text-center font-display">9. บันทึกกระทำออนไลน์</span>
        </button>
      </div>

      {/* 3. CORE SUB-DASHBOARD VIEWS CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 py-4 md:px-8 space-y-6">

        {/* 4.1. SYSTEM SETTINGS MODULE */}
        {activeModule === 'settings' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">1. การตั้งค่าสไตล์เว็บบอร์ด (System Settings UI/UX)</h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">ชื่อชื่อเว็บไซต์ทางการ (Site Display Name)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs font-bold"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">โลโก้เว็บไซต์ (ดึงรูปจากเครื่อง หรือระบุ URL) 📷</label>
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-2.5 border rounded-xl">
                    {settingsLogo ? (
                      <img src={settingsLogo} alt="Logo" className="w-10 h-10 object-contain rounded bg-white p-1 border shadow-xs" />
                    ) : (
                      <div className="w-10 h-10 bg-red-100 text-[#FF1E27] flex items-center justify-center font-bold text-[10px] rounded">ไม่มีโลโก้</div>
                    )}
                    <div className="flex-1 space-y-1 w-full">
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdminLogoFileChange}
                          className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#FF1E27] file:text-white hover:file:opacity-90 file:cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder="หรือป้อน URL โลโก้แบรนด์..."
                          className="bg-white border rounded-lg px-2 py-1 text-[10px] w-full font-bold focus:outline-none"
                          value={settingsLogo}
                          onChange={(e) => setSettingsLogo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme palette picker choices */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                <span className="text-[10px] font-extrabold text-[#FF1E27] block font-display">🎨 ตัวเลือกจานแถบสีนวัตกรรมแผงควบคุม (Dynamic color palette)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 block leading-none">PRIMARY BRAND COLOR: (Hex)</label>
                    <input
                      type="color"
                      className="w-full h-10 bg-white border rounded p-1 cursor-pointer"
                      value={settingsColor}
                      onChange={(e) => setSettingsColor(e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full bg-white border rounded-lg p-1.5 text-xs font-mono font-bold"
                      value={settingsColor}
                      onChange={(e) => setSettingsColor(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 block leading-none">GRADIENT END COLOR: (Hex)</label>
                    <input
                      type="color"
                      className="w-full h-10 bg-white border rounded p-1 cursor-pointer"
                      value={settingsGradEnd}
                      onChange={(e) => setSettingsGradEnd(e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full bg-white border rounded-lg p-1.5 text-xs font-mono font-bold"
                      value={settingsGradEnd}
                      onChange={(e) => setSettingsGradEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Slideshow Manager */}
              <div className="border border-gray-150 p-4 rounded-2xl space-y-4">
                <span className="text-[10px] font-extrabold text-[#FF1E27] block">🖼️ ระบบผู้จัดการสไลด์โปรโมชั่นหน้าแรก (Promotion Slideshow Management)</span>
                
                <p className="text-[9.5px] text-gray-500 font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-250 block">
                  💡 คำแนะนำขนาดสไลเดอร์: <strong className="text-red-650 font-mono text-red-500">1200 x 450 pixels (หรืออัตราส่วนใกล้เคียง 8:3)</strong> เพื่อสัดส่วนที่มินิมอล พอดีจอหน้าบ้าน ไม่ล้นกรอบและไม่แตกเป็นเม็ดพิกเซลหยาบค่ะ 📷
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {settingsBanners.map((bUrl, bIdx) => (
                    <div key={bIdx} className="bg-gray-50 border p-2.5 rounded-xl text-center space-y-2 relative group overflow-hidden">
                      <img src={bUrl} alt="" className="aspect-[12/4.5] w-full object-cover rounded shadow-xs" />
                      <button
                        type="button"
                        onClick={() => handleRemoveBanner(bIdx)}
                        className="text-[10px] text-red-500 font-extrabold hover:underline block w-full bg-red-55 hover:bg-red-100 py-1 rounded"
                      >
                        [ลบบอร์ดภาพสไลด์นี้ออก]
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t pt-3 mt-1 text-[10px]">
                  <span className="font-extrabold text-gray-700 block text-[11px]">➕ ทำการเพิ่มสไลด์โชว์แบนเนอร์ใหม่ :</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gray-50/50 p-3 rounded-xl border border-dashed">
                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-gray-500 block">เลือกรูปภาพจากเครื่อง / ไฟล์แกลเลอรี่:</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAdminBannerFileChange}
                        className="text-xs text-none file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-gray-800 file:text-white hover:file:opacity-90 file:cursor-pointer"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-gray-500 block">หรือระบุเพิ่มทาง URL ลิงก์รูปภาพ:</span>
                      <div className="flex gap-2.5">
                        <input
                          type="text"
                          className="bg-white border rounded-xl px-2.5 py-1 text-xs flex-1 font-semibold focus:outline-none focus:border-red-500"
                          placeholder="เช่น https://images.unsplash.com/photo-..."
                          value={newBannerUrl}
                          onChange={(e) => setNewBannerUrl(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleAddBanner();
                            alert("เพิ่มแบนเนอร์จาก URL เรียบร้อยชั่วคราวแล้วค่ะ! อย่าลืมกด 'ยืนยันการตั้งค่าบอร์ดบันทึก' นะคะ");
                          }}
                          className="bg-gray-800 text-white px-3 py-1.5 text-[10px] font-bold rounded-lg hover:bg-gray-700"
                        >
                          เพิ่ม URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Manager */}
              <div id="category-manager-card" className="border border-gray-150 p-4 rounded-2xl space-y-4">
                <span className="text-[10px] font-extrabold text-[#FF1E27] block font-display">🏷️ ระบบจัดการหมวดหมู่สินค้าออนไลน์ (Product Categories Management)</span>
                
                <p className="text-[9.5px] text-gray-500 font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-200 block">
                  💡 ผู้ดูแลระบบและแอดมินสูงสุดสามารถลบหรือเพิ่มหมวดหมู่สินค้าได้เองตามความต้องการ หมวดหมู่ใหม่จะปรากฏให้ระบบร้านค้าเลือกทันทีเมื่ออัปโหลดและกรองสินค้าหน้าหลักค่ะ
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {settingsCategories.map((cat, idx) => (
                    <div key={cat.key} className="bg-gray-50 border p-2 py-3 rounded-xl text-center space-y-1.5 relative group">
                      <span className="text-xl block">{cat.icon || '🛍️'}</span>
                      <span className="text-[10px] font-extrabold text-gray-700 block truncate">{cat.label}</span>
                      <span className="text-[8px] font-mono font-bold text-gray-400 bg-gray-200 px-1 py-0.5 rounded leading-none">{cat.key}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsCategories(settingsCategories.filter((_, i) => i !== idx));
                        }}
                        className="text-[9px] text-red-500 font-bold mt-1.5 bg-red-50 hover:bg-red-100 py-1 rounded w-full border border-red-150"
                      >
                        ลบออก
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t pt-3 mt-1 text-[10px]">
                  <span className="font-extrabold text-gray-700 block text-[11px]">➕ เพิ่มหมวดหมู่สินค้าใหม่ :</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50/50 p-3 rounded-xl border border-dashed">
                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-gray-500 block">ไอคอนอีโมจิ (Emoji Icon):</span>
                      <input
                        type="text"
                        className="bg-white border rounded-lg px-2.5 py-1.5 text-xs w-full font-semibold focus:outline-none"
                        placeholder="เช่น 💅, 💄, 🧴, 🛍️"
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-gray-500 block">ชื่อไทยประทับตรา (Label):</span>
                      <input
                        type="text"
                        className="bg-white border rounded-lg px-2.5 py-1.5 text-xs w-full font-semibold focus:outline-none focus:border-red-500"
                        placeholder="เช่น ลิปสติกบำรุงเรียวปาก"
                        value={newCatLabel}
                        onChange={(e) => setNewCatLabel(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-gray-500 block">รหัสสากล (Category Key EN):</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          className="bg-white border rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-black flex-1 focus:outline-none uppercase"
                          placeholder="เช่น LIPSTICK"
                          value={newCatKey}
                          onChange={(e) => setNewCatKey(e.target.value.toUpperCase())}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newCatKey.trim() || !newCatLabel.trim()) {
                              alert('กรุณากรอกรหัสสากล และ ชื่อหมวดหมู่ให้ครบถ้วนก่อนเพิ่มค่ะ');
                              return;
                            }
                            if (settingsCategories.some(c => c.key === newCatKey.trim().toUpperCase())) {
                              alert('มีรหัสสากลหมวดหมู่นี้อยู่ในระบแล้วค่ะ');
                              return;
                            }
                            const newCategory = {
                              key: newCatKey.trim().toUpperCase(),
                              label: newCatLabel.trim(),
                              icon: newCatIcon.trim() || '🛍️'
                            };
                            setSettingsCategories([...settingsCategories, newCategory]);
                            setNewCatKey('');
                            setNewCatLabel('');
                            setNewCatIcon('🛍️');
                          }}
                          className="bg-gray-900 text-white px-2.5 py-1.5 text-[9.5px] font-bold rounded-lg hover:bg-gray-800 shrink-0"
                        >
                          + เพิ่มหมวดหมู่
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 text-xs font-black text-white rounded-xl shadow-md cursor-pointer transition-transform hover:scale-[1.01]"
                style={{ background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)` }}
              >
                ✓ ยืนยันการตั้งค่าบอร์ดบันทึกธีมและสไลด์ทั้งหมดตัวจริง
              </button>
            </form>
          </div>
        )}

        {/* 4.2. FINANCIAL MANAGEMENT MODULE */}
        {activeModule === 'financial' && (
          <div className="space-y-6">
            
            {/* Find user credentials */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">2. การจัดการเงินฝาก และ เงินถอน (Financial Management Gateway)</h3>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500">ค้นหาเบอร์โทรผู้ใช้ที่ทำรายการในระบบ (10 หลัก)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="เช่น 0991234567"
                    className="flex-1 bg-gray-50 border p-2.5 rounded-xl text-xs font-bold font-mono"
                    value={financialPhoneSearch}
                    onChange={(e) => setFinancialPhoneSearch(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                  <button
                    type="button"
                    onClick={handleLookupFinancialUser}
                    className="px-4 bg-gray-900 border text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Search size={12} /> ส่องบัญชี
                  </button>
                </div>
              </div>
            </div>

            {/* DEPOSIT FORM PANEL */}
            {memberDepositSelect && (
              <div className="bg-white p-6 rounded-3xl border border-teal-200 shadow-sm space-y-4 animate-slide-up">
                <div className="border-b pb-2 flex justify-between text-xs font-bold text-teal-700">
                  <span>📥 ดำเนินการเพิ่มฝากเงินเครดิตทางระบบ (Deposit Wallet Tool)</span>
                  <span>ID: {memberDepositSelect.id}</span>
                </div>
                <div className="p-3 bg-teal-50 hover:bg-teal-100 rounded-xl rounded-bl-none text-xs text-teal-800 space-y-1">
                  <p className="font-extrabold">• ชื่อผู้ใช้: {memberDepositSelect.name}</p>
                  <p>• ตรวจพบเบอร์โทร: {memberDepositSelect.phone}</p>
                  <p className="font-bold">• ยอดเงิน Wallet ปัจจุบันคงคลัง: {memberDepositSelect.wallet.toLocaleString()} THB</p>
                </div>

                <form onSubmit={handleExecuteDeposit} className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">ยอดจำนวนเงินฝากเครดิต (THB)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs font-black font-mono text-teal-600"
                      value={depositAmount || ''}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">หมายเหตุธุรกรรมเครดิต</label>
                    <input
                      type="text"
                      placeholder="เช่น ฝากเงินสดโปรโมชั่น"
                      className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs font-bold"
                      value={depositComment}
                      onChange={(e) => setDepositComment(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs"
                  >
                    ตกลงเติมเงิน Wallet สู่หน้าบ้านทันที
                  </button>
                </form>
              </div>
            )}

            {/* WITHDRAW MANUAL FORM FOR ALL ACCOUNT TYPES */}
            {withdrawMerchantSelect && (
              <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-xs shadow-sm space-y-4 animate-slide-up">
                <div className="border-b pb-2 flex justify-between text-xs font-bold text-rose-700">
                  <span>📤 ดำเนินการกดถอนเงินออกจากบัญชีทุกประเภท (Manual Wallet Withdrawal Manager)</span>
                  <span className="bg-rose-100 px-2 py-0.5 rounded text-[10px]">ประเภท: {withdrawMerchantSelect.role} (ID: {withdrawMerchantSelect.id})</span>
                </div>
                <div className="p-3 bg-rose-50 hover:bg-rose-100 rounded-xl rounded-bl-none text-xs text-rose-800 space-y-1">
                  <p className="font-extrabold">• ชื่อบัญชี: {withdrawMerchantSelect.name} ({withdrawMerchantSelect.phone})</p>
                  <p className="font-mono">• ยอดเงินคงเหลือในเป๋าตังค์กระเป๋า: {withdrawMerchantSelect.wallet.toLocaleString()} THB</p>
                </div>

                <form onSubmit={handleExecuteWithdrawManual} className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">ยอดเงินหักออก (THB)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs font-black font-mono text-rose-600"
                      value={withdrawAmountManual || ''}
                      onChange={(e) => setWithdrawAmountManual(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">หมายเหตุ</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs font-bold"
                      value={withdrawCommentManual}
                      onChange={(e) => setWithdrawCommentManual(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs"
                  >
                    ยืนยันการทำรายการหักความคุ้มครองกระเป๋าตังค์
                  </button>
                </form>
              </div>
            )}

            {/* WITHDRAWALS APPLICATION LIST REQUESTS */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <span className="text-[10px] font-black text-rose-600 block uppercase tracking-wider font-mono">📥 ตารางใบคำสั่งขอนำเสนอถอนเงินสลีป (Withdrawal request submissions)</span>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-500 font-bold uppercase text-[9px] tracking-wide">
                      <th className="p-3">วันที่สั่ง</th>
                      <th className="p-3">ผู้ร้องขอนำโอน</th>
                      <th className="p-3">ยอดเงินขอเบิก</th>
                      <th className="p-3">สถานะธนาคาร</th>
                      <th className="p-3 text-center">จัดการคำสั่ง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {withdrawals.map((wReq) => (
                      <tr key={wReq.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-bold text-gray-500">{wReq.createdAt.replace('T', ' ').substring(0,16)}</td>
                        <td className="p-3 font-bold text-gray-800">
                          {wReq.merchantName} <span className="block text-[9px] text-gray-400 font-mono">Tel: {wReq.merchantPhone}</span>
                        </td>
                        <td className="p-3 font-black font-mono">
                          {editingWithDrawalId === wReq.id ? (
                            <div className="flex items-center gap-1.5 min-w-[140px]">
                              <input
                                type="number"
                                className="w-20 border border-red-300 rounded-lg px-2 py-1 text-xs font-black font-mono text-gray-800 focus:outline-none focus:border-red-500 bg-red-50/50"
                                value={editingWithDrawalAmount}
                                onChange={(e) => setEditingWithDrawalAmount(Number(e.target.value))}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingWithDrawalAmount <= 0) {
                                    alert('ยอดเงินต้องมากกว่า 0 THB ค่ะ');
                                    return;
                                  }
                                  
                                  // Update Withdrawal Request status
                                  const updated = withdrawals.map(w => {
                                    if (w.id === wReq.id) {
                                      return { ...w, amount: editingWithDrawalAmount };
                                    }
                                    return w;
                                  });
                                  onUpdateWithdrawals(updated);
                                  
                                  // Live notification message
                                  const adjustNotif: SystemNotification = {
                                    id: `N-WIT-ADJ-${Date.now()}`,
                                    userId: wReq.merchantId,
                                    title: "หลังบ้านได้ปรับเปลี่ยนยอดคำขอถอนเงินของคุณ",
                                    message: `ยอดคำขอถอนเงินรหัสบิล ${wReq.id} ของคุณ ถูกปรับเปลี่ยนโดยแอดมินจากยอดเดิม ${wReq.amount.toLocaleString()} THB เป็นยอดใหม่จำนวน ${editingWithDrawalAmount.toLocaleString()} THB`,
                                    isSystemAnnouncement: false,
                                    createdAt: new Date().toISOString()
                                  };
                                  onUpdateNotifications([...notifications, adjustNotif]);

                                  alert(`ปรับปรุงยอดคำขอถอนเงินสำเร็จ! เปลี่ยนยอดเป้าหมายจาก ${wReq.amount.toLocaleString()} เป็น ${editingWithDrawalAmount.toLocaleString()} THB เรียบร้อยแล้วค่ะ`);
                                  setEditingWithDrawalId(null);
                                }}
                                className="p-1 px-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-black text-[9px] cursor-pointer"
                              >
                                บันทึก
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWithDrawalId(null)}
                                className="p-1 px-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-black text-[9px] cursor-pointer"
                              >
                                ปิด
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-rose-600">{wReq.amount.toLocaleString()} THB</span>
                              {wReq.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingWithDrawalId(wReq.id);
                                    setEditingWithDrawalAmount(wReq.amount);
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[8.5px] bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 font-extrabold px-1.5 py-0.5 rounded border border-red-200 transition-all cursor-pointer leading-none"
                                >
                                  ✏️ เปลี่ยนยอด
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            wReq.status === 'pending' ? 'bg-amber-100 text-amber-700' : wReq.status === 'approved' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-750'
                          }`}>
                            {wReq.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {wReq.status === 'pending' ? (
                            <div className="flex flex-col gap-1 z-10 max-w-[200px] mx-auto text-xs">
                              <input
                                type="text"
                                placeholder="ใส่หมายเหตุ (ถ้ามี)..."
                                className="border rounded px-2 py-1 text-[10px] font-semibold"
                                value={withdrawActionComment}
                                id={`withdraw-comment-${wReq.id}`}
                                onChange={(e) => setWithdrawActionComment(e.target.value)}
                              />
                              <div className="flex gap-1 justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleApproveWithDrawalRequest(wReq.id, true)}
                                  className="bg-teal-600 font-medium hover:bg-teal-700 text-white text-[9px] px-2.5 py-1 rounded"
                                >
                                  อนุมัติโอนเงิน
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveWithDrawalRequest(wReq.id, false)}
                                  className="bg-rose-600 font-medium hover:bg-rose-700 text-white text-[9px] px-2.5 py-1 rounded"
                                >
                                  ปฏิเสธ
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-400 font-bold border rounded p-1.5 bg-gray-50 text-center font-mono">
                              {wReq.comment || 'บันทึกระบายเรียบร้อย'}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DEPOSITS APPLICATION LIST REQUESTS */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4 mt-6">
              <span className="text-[10px] font-black text-teal-600 block uppercase tracking-wider font-mono">📥 ตารางแจ้งฝากเงินแนบสลิปหน้าบ้าน (Deposit Slip Requests)</span>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-500 font-bold uppercase text-[9px] tracking-wide">
                      <th className="p-3">วันที่สั่งฝาก</th>
                      <th className="p-3">บิล ID</th>
                      <th className="p-3">ผู้แจ้งฝากเงิน</th>
                      <th className="p-3 font-mono">ยอดที่ฝาก</th>
                      <th className="p-3 text-center">ภาพสลิปหลักฐาน</th>
                      <th className="p-3">สถานะ</th>
                      <th className="p-3 text-center">จัดการคำสั่ง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(deposits || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-gray-400 font-bold">
                          ยังไม่มีผู้ใช้ทำรายการแจ้งฝากเงินสลิปเข้ามาค่ะ
                        </td>
                      </tr>
                    ) : (
                      deposits.map((dReq) => (
                        <tr key={dReq.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-mono font-bold text-gray-500">
                            {dReq.createdAt.replace('T', ' ').substring(0, 16)}
                          </td>
                          <td className="p-3 font-mono font-black text-gray-800">
                            {dReq.id}
                          </td>
                          <td className="p-3 font-bold text-gray-800">
                            {dReq.userName} 
                            <span className="block text-[9px] text-gray-400 font-mono">Tel: {dReq.userPhone} (ID: {dReq.userId})</span>
                          </td>
                          <td className="p-3 font-black text-teal-600 font-mono">
                            {dReq.amount.toLocaleString()} THB
                          </td>
                          <td className="p-3 text-center">
                            {dReq.slipImage ? (
                              <button
                                type="button"
                                onClick={() => setExpandedSlipUrl(dReq.slipImage)}
                                className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 border text-gray-700 text-[10px] font-bold py-1 px-2.5 rounded-lg active:scale-95 transition-all mx-auto leading-none cursor-pointer"
                              >
                                🔍 ดูภาพสลิปจริง
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold">ไม่มีภาพ</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold capitalize ${
                              dReq.status === 'pending' 
                                ? 'bg-amber-100 text-amber-700' 
                                : dReq.status === 'approved' 
                                  ? 'bg-teal-100 text-teal-700' 
                                  : 'bg-rose-100 text-rose-750'
                            }`}>
                              {dReq.status === 'pending' ? 'รอตรวจสอบ' : dReq.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {dReq.status === 'pending' ? (
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleProcessDepositRequest(dReq.id, true)}
                                  className="bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 leading-none"
                                >
                                  ✓ อนุมัติฝากเงิน
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleProcessDepositRequest(dReq.id, false)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 leading-none"
                                >
                                  ✗ ปฏิเสธ
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10.5px] text-gray-400 font-bold font-mono">
                                สิ้นสุดทำรายการ
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4.3. MEMBER MANAGEMENTS MODULE */}
        {activeModule === 'users' && (
          <div className="space-y-6">
            {/* Create new User by Admin Form */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">3. การจัดการสมาชิกบอร์ด (User Management & Onboarding)</h3>
              
              <form onSubmit={handleCreateUserByAdmin} className="space-y-4 border rounded-2xl p-4 bg-gray-50/35">
                <span className="text-xs font-black text-[#FF1E27] block">➕ เพิ่มลงทะเบียนคู่ใช้งานใหม่โดยบัญชีแอดมิน</span>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 block">ชื่อจริงเต็มผู้ใช้</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สมพร ดีใจ"
                      className="bg-white border rounded-xl p-2.5 text-xs w-full focus:outline-none"
                      value={createUserName}
                      onChange={(e) => setCreateUserName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 block">เบอร์โทรศัพท์ (10 หลัก)</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 088xxxxxxx"
                      className="bg-white border rounded-xl p-2.5 text-xs font-bold w-full focus:outline-none"
                      value={createUserPhone}
                      onChange={(e) => setCreateUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 block">รหัสผ่านบัญชีผู้ใช้</label>
                    <input
                      type="password"
                      required
                      placeholder="ความละเอียด 8 หลัก"
                      className="bg-white border rounded-xl p-2.5 text-xs w-full focus:outline-none"
                      value={createUserPassword}
                      onChange={(e) => setCreateUserPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 block">ตำแหน่งระดับสิทธิ์โหมด</label>
                    <select
                      className="bg-white border rounded-xl p-2.5 text-xs w-full focus:outline-none"
                      value={createUserRole}
                      onChange={(e) => setCreateUserRole(e.target.value as any)}
                    >
                      <option value="Customer">บัญชีลูกค้า (Customer)</option>
                      <option value="Merchant">บัญชีร้านค้า (Merchant)</option>
                      <option value="Admin">บัญชีแอดมินรอง (Admin Helper)</option>
                    </select>
                  </div>
                </div>

                {/* Sub banking details if user type is Merchant */}
                {createUserRole === 'Merchant' && (
                  <div className="bg-white border border-red-100 p-4 rounded-xl space-y-3 animate-slide-up">
                    <span className="text-[10px] font-black text-rose-500 block font-display">🏦 ตั้งค่าบัญชีธนาคารสำหรับร้านค้า (Merchant Bank Configurations)</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500">ชื่อชื่อธนาคาร</label>
                        <input
                          type="text"
                          placeholder="เช่น KBank, SCB"
                          required
                          className="border rounded p-2 text-xs w-full"
                          value={createBankName}
                          onChange={(e) => setCreateBankName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500">เลขที่บัญชีรับเงิน</label>
                        <input
                          type="text"
                          placeholder="เช่น 123-4-56789-0"
                          required
                          className="border rounded p-2 text-xs w-full"
                          value={createBankAccount}
                          onChange={(e) => setCreateBankAccount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500">ชื่อจริงผู้รับโอนเงิน</label>
                        <input
                          type="text"
                          placeholder="เช่น สมพร อัครโภคิน"
                          required
                          className="border rounded p-2 text-xs w-full"
                          value={createBankHolder}
                          onChange={(e) => setCreateBankHolder(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#FF1E27] py-2.5 rounded-xl text-white font-extrabold text-xs"
                  style={{ backgroundColor: themePrimary }}
                >
                  ตกลงสร้างลงทะเบียนสมาชิกในระบบ
                </button>
              </form>
            </div>

            {/* MEMBER DATABASE DIRECT TABLE CATALOG */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <span className="text-[10px] font-black text-gray-800 block uppercase font-mono">👥 รายชื่อสมาชิกในระบบทั้งหมดในฐานข้อมูล (User Directory list)</span>
                
                {/* Search members bar */}
                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder="ส่องค้นหา: เบอร์โทร, ID, ชื่อ..."
                    className="w-full bg-gray-50 border rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                  />
                </div>
              </div>

              {editingUserId && (
                <form onSubmit={handleSaveUserEdit} className="bg-red-50 border-red-200 border-2 rounded-2xl p-5 space-y-4 animate-slide-up">
                  <div className="flex justify-between items-center text-xs font-black text-rose-700">
                    <span className="flex items-center gap-1.5 text-sm">✏️ กำลังแก้ไขข้อมูลบัญชี ID: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-red-200">{editingUserId}</strong></span>
                    <button type="button" onClick={() => setEditingUserId(null)} className="text-gray-400 hover:text-gray-700 font-bold bg-white w-6 h-6 rounded-full flex items-center justify-center border">✕</button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-semibold text-gray-700">
                    {/* Nickname and Fullname */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">ชื่อเล่น (Nickname)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-red-500"
                        placeholder="เช่น เป๋าเป่า"
                        value={editedUserNickname}
                        onChange={(e) => setEditedUserNickname(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">ชื่อจริง - นามสกุล (Full Name)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-red-500"
                        placeholder="ชื่อ-สกุลจริง"
                        required
                        value={editedUserName}
                        onChange={(e) => setEditedUserName(e.target.value)}
                      />
                    </div>

                    {/* Phone and Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">เบอร์โทรศัพท์ ( phone )</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-red-500"
                        placeholder="เบอร์โทร 10 หลัก"
                        required
                        value={editedUserPhone}
                        onChange={(e) => setEditedUserPhone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">รหัสผ่านบัญชี (Password)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-red-500"
                        placeholder="รหัสผ่านขั้นต่ำ 8 หลัก"
                        required
                        value={editedUserPassword}
                        onChange={(e) => setEditedUserPassword(e.target.value)}
                      />
                    </div>

                    {/* Financial details - Bank Name, Bank Account, Account Holder Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">ชื่อธนาคาร (Bank Name)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-red-500"
                        placeholder="เช่น กสิกรไทย, ไทยพาณิชย์ (ไม่บังคับ)"
                        value={editedUserBank}
                        onChange={(e) => setEditedUserBank(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">เลขบัญชีธนาคาร (Bank Account No.)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-red-500"
                        placeholder="ระบุตัวเลข (ไม่บังคับ)"
                        value={editedUserBankAcc}
                        onChange={(e) => setEditedUserBankAcc(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">ชื่อเจ้าของบัญชี (Holder Name)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-red-500"
                        placeholder="ชื่อสอดคล้องธนาคาร (ไม่บังคับ)"
                        value={editedUserHolder}
                        onChange={(e) => setEditedUserHolder(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">สิทธิ์กลุ่มบัญชี (Role Status)</label>
                      <select
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-red-500"
                        value={editedUserRole}
                        onChange={(e) => setEditedUserRole(e.target.value)}
                      >
                        <option value="Customer">Customer (ลูกค้าทั่วไป)</option>
                        <option value="Merchant">Merchant (ร้านค้าพันธมิตร)</option>
                        <option value="Admin">Admin (ผู้ดูแลระบบรอง)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
                    >
                      ยกเลิกแก้ไข
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl text-white font-extrabold text-xs transition-opacity hover:opacity-90"
                      style={{ backgroundColor: themePrimary }}
                    >
                      ✓ บันทึกการแก้ไขพิกเซลประวัติข้อมูล
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase text-[9px] tracking-widest font-mono">
                      <th className="p-3">User ID</th>
                      <th className="p-3">ชื่อสถิติ</th>
                      <th className="p-3">เบอร์โทรติดต่อ</th>
                      <th className="p-3 font-mono">Wallet THB</th>
                      <th className="p-3">บทบาท</th>
                      <th className="p-3">สถานะกู้ภัย</th>
                      <th className="p-3 text-center">ปรับแต่งมาตราการบทเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-bold text-gray-600">{usr.id}</td>
                        <td className="p-3 font-bold text-gray-800">{usr.name}</td>
                        <td className="p-3 font-semibold text-gray-700">{usr.phone}</td>
                        <td className="p-3 font-black text-emerald-600 font-mono">{usr.wallet.toLocaleString()} THB</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            usr.role === 'SuperAdmin' ? 'bg-black text-rose-500' : usr.role === 'Admin' ? 'bg-rose-50 text-rose-600' : usr.role === 'Merchant' ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            usr.status === 'active' ? 'bg-emerald-100 text-emerald-800' : usr.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {usr.status === 'active' ? 'ผ่านหลักเกณฑ์' : usr.status === 'suspended' ? 'อายัดชั่วคราว' : 'แบนถาวร'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => startEditingUser(usr)}
                              className="p-1 px-2 text-[9px] font-bold text-gray-500 hover:text-black hover:bg-gray-100 rounded"
                            >
                              แก้ไขรายละเอียด
                            </button>

                            {usr.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateUserFreezeStatus(usr.id, true)}
                                className="p-1 px-2 text-[9px] font-extrabold text-amber-600 hover:bg-amber-50 rounded"
                              >
                                อายัดบัญชี
                              </button>
                            ) : usr.status === 'suspended' ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateUserFreezeStatus(usr.id, false)}
                                className="p-1 px-2 text-[9px] font-extrabold text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                ปลดอายัด
                              </button>
                            ) : null}

                            {usr.status !== 'banned' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateUserBanForever(usr.id)}
                                className="p-1 px-2 text-[9px] font-extrabold text-rose-600 hover:bg-rose-50 rounded"
                              >
                                แบนบัญชี
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4.4. ADMIN STAFF MANAGEMENTS (Super Admin only: 0099887766) */}
        {activeModule === 'admins' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-400 tracking-widest uppercase font-mono">4. การจัดการแอดมินช่วยเหลือระดับรอง (Admin Management Dashboard)</h3>

            {isSuperAdmin ? (
              <div className="space-y-4">
                <form onSubmit={handleCreateMinorAdmin} className="bg-gray-50 p-4 rounded-2xl space-y-3 max-w-md border">
                  <span className="text-xs font-black text-rose-600 font-display block">➕ เพิ่มลงผู้ช่วยทีมงานแอดมินใหม่ (Phone/Password credentials)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500">เบอร์แอดมินรอง (10 หลัก)</label>
                      <input
                        type="text"
                        required
                        className="bg-white border rounded p-2 text-xs font-bold"
                        placeholder="เช่น 0888888888"
                        value={minorAdminPhone}
                        onChange={(e) => setMinorAdminPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500">รหัสผ่านสำหรับล็อกอิน</label>
                      <input
                        type="password"
                        required
                        className="bg-white border rounded p-2 text-xs"
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        value={minorAdminPass}
                        onChange={(e) => setMinorAdminPass(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-gray-900 text-white rounded text-xs font-bold"
                  >
                    + บันทึกเพิ่มแอดมินผู้ช่วย
                  </button>
                </form>

                {/* Database logs of Admins list currently registered */}
                <div className="space-y-2 pt-4 border-t">
                  <span className="text-[10px] font-bold text-gray-400 block tracking-wide font-mono uppercase">แผงพนักงานควบคุมช่วยเหลือปัจจัยปัจจุบัน:</span>
                  <div className="divide-y divide-gray-100">
                    {users.filter(u => u.role === 'Admin' || u.role === 'SuperAdmin').map(adm => (
                      <div key={adm.id} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-extrabold text-gray-800 block">{adm.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">เบอร์ล็อกไว้: {adm.phone} | ID: {adm.id}</span>
                        </div>
                        <span className="bg-red-50 text-[#FF1E27] font-black uppercase text-[8.5px] px-2 py-0.5 rounded border">
                          {adm.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-rose-500">
                ⚠️ โมดูลนี้จำกัดไว้สำหรับ Super Admin (บัญชีเซิร์ฟเวอร์หลัก 0099887766) เท่านั้นในการเข้าถึงค่ะ
              </p>
            )}
          </div>
        )}

        {/* 4.5. PRODUCT ARCHITECTURE CATALOG CONTROL */}
        {activeModule === 'products' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 3-Second alert banner */}
            <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl text-[10.5px] font-bold border border-amber-100 flex items-center justify-between">
              <span>🔄 โมดูลสแตนด์บายคลังสินค้า: ข้อมูลกำลัง Sync อัปเดตพื้นหลังอัตโนมัติทุกๆ 3 วินาทีเพื่อรอรับสินค้าใหม่</span>
              <span className="font-mono bg-white text-amber-700 px-2 py-0.5 rounded-full">DB SYNC OK</span>
            </div>

            {/* PRODUCT APPROVAL CONTROL QUEUE */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">5. ระบบอนุมัติสินค้าวางแรกจำหน่าย (Product Approval Standby Queue)</h3>
              
              {filteredProductsListApproval.length === 0 ? (
                <p className="text-center py-8 text-xs font-bold text-gray-400">ยังไม่มีสินค้าส่งรอประเมินเข้ามาใหม่ในคิวค่ะ</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProductsListApproval.map((p) => {
                    const shopUser = users.find(u => u.id === p.merchantId);
                    return (
                      <div key={p.id} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/20 flex gap-3 text-xs justify-between">
                        <img src={p.image} className="w-16 h-16 object-cover rounded-xl bg-gray-100 shadow" referrerPolicy="no-referrer" />
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] bg-amber-150 text-orange-700 rounded px-1.5 py-0.5 font-bold inline-block font-mono">
                            ส่งมาจาก Merchant ID: [{p.merchantId}] (Tel: {p.merchantPhone})
                          </span>
                          
                          {/* Display Merchant Bank details and User Account ID */}
                          <div className="bg-white/80 p-2 rounded-lg border border-amber-150 text-[9.5px] text-gray-700 space-y-0.5">
                            <p className="font-bold text-[#FF1E27]">• ไอดีบัญชีร้านค้าผู้ขาย: <span className="font-mono select-all bg-gray-100 px-1 py-0.5 rounded font-black">{shopUser?.id || p.merchantId}</span></p>
                            <p className="font-bold">• ชื่อบัญชีธนาคารรับเงิน: <span className="text-gray-900">{shopUser?.bankHolderName || 'ไม่ได้กรอก'}</span></p>
                            <p className="font-bold">• ธนาคารร้านค้า: <span className="text-teal-700">{shopUser?.bankName || 'ไม่ได้กรอก'}</span></p>
                            <p className="font-bold">• หมายเลขเลขบัญชี: <span className="font-mono text-xs text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-black">{shopUser?.bankAccount || 'ยังไม่ได้กรอก'}</span></p>
                          </div>

                          <span className="font-black text-gray-800 block truncate text-xs pt-1">{p.name}</span>
                          <span className="font-mono text-rose-650 text-red-500 block font-black text-xs">{p.price.toLocaleString()} THB</span>

                          <div className="flex flex-col gap-1.5 pt-2">
                            <input
                              type="text"
                              id={`reject-reason-${p.id}`}
                              placeholder="ระบุเหตุผลระงับ (หากจะ Reject)..."
                              className="border bg-white text-[10px] rounded px-2 py-1 font-semibold"
                              value={rejectProductReason[p.id] || ''}
                              onChange={(e) => setRejectProductReason({ ...rejectProductReason, [p.id]: e.target.value })}
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleProductApproval(p.id, true)}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] px-3 py-1 rounded font-bold cursor-pointer"
                              >
                                อนุมัติ (Approve)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProductApproval(p.id, false)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-3 py-1 rounded font-bold cursor-pointer"
                              >
                                ระงับ (Reject)
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CENTRAL PRODUCTS MANAGEMENT CATALOG */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <span className="text-[10px] font-black text-gray-800 block uppercase font-mono">🔄 ศูนย์แก้ไขรายละเอียดและสต็อกสินค้าส่วนกลาง (Central product catalog manager)</span>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAllProductsCentral}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-red-100"
                  >
                    <Trash2 size={14} /> ลบสินค้าทั้งหมดในระบบ
                  </button>

                  {/* Search products filter */}
                  <input
                    type="text"
                    placeholder="ส่องสแกน: เสิร์ชชื่อร้าน, เบอร์ร้าน หรือ ID..."
                    className="bg-gray-50 border p-2 rounded-xl text-xs max-w-xs focus:outline-none"
                    value={productSearchShop}
                    onChange={(e) => setProductSearchShop(e.target.value)}
                  />
                </div>
              </div>

              {editingCatalogProduct && (
                <form onSubmit={handleSaveCatalogProductCentral} className="bg-slate-50 border border-slate-350 p-5 rounded-3xl space-y-4 text-xs animate-slide-up">
                  <span className="font-black text-[#FF1E27] block border-b pb-1.5 text-xs">✏️ แอดมินแก้ไขข้อมูลสินค้า: ID {editingCatalogProduct.id}</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500">ชื่อสินค้า (Product Name)</label>
                      <input
                        type="text"
                        className="w-full border bg-white rounded-xl p-2.5 text-xs font-bold"
                        placeholder="ชื่อสินค้า"
                        value={editingCatalogProduct.name}
                        onChange={(e) => setEditingCatalogProduct({ ...editingCatalogProduct, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500">ราคาจำหน่าย (Price THB)</label>
                      <input
                        type="number"
                        className="w-full border bg-white rounded-xl p-2.5 text-xs font-mono font-black"
                        placeholder="ราคา THB"
                        value={editingCatalogProduct.price || ''}
                        onChange={(e) => setEditingCatalogProduct({ ...editingCatalogProduct, price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500">สต็อกทั้งหมด (Total Stock)</label>
                      <input
                        type="number"
                        className="w-full border bg-white rounded-xl p-2.5 text-xs font-mono"
                        placeholder="สต็อกรวม"
                        value={editingCatalogProduct.totalStock}
                        onChange={(e) => setEditingCatalogProduct({ ...editingCatalogProduct, totalStock: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-600">ยอดจำหน่ายสะสม (Sales Volume)</label>
                      <input
                        type="number"
                        className="w-full border border-emerald-250 bg-emerald-50/20 text-emerald-700 rounded-xl p-2.5 text-xs font-mono font-black"
                        placeholder="ยอดขายสะสม"
                        value={editingCatalogProduct.salesVolume ?? 0}
                        onChange={(e) => setEditingCatalogProduct({ ...editingCatalogProduct, salesVolume: Math.max(0, Number(e.target.value)) })}
                      />
                    </div>
                  </div>

                  {/* Description Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">คำอธิบายรายละเอียดสินค้า (Description)</label>
                    <textarea
                      rows={2}
                      className="w-full border bg-white rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-red-500"
                      placeholder="อธิบายข้อมูลสรรพคุณสินค้าสั้นๆ..."
                      value={editingCatalogProduct.description || ''}
                      onChange={(e) => setEditingCatalogProduct({ ...editingCatalogProduct, description: e.target.value })}
                    />
                  </div>

                  {/* Image input with local machine uploader file feature */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-550 block">แก้ไขรูปภาพสินค้า (อัพโหลดดึงรูปจากเครื่อง หรือระบุที่อยู่ URL) 📷</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-white p-3.5 border rounded-2xl">
                      {editingCatalogProduct.image ? (
                        <img src={editingCatalogProduct.image} alt="Preview" className="w-14 h-14 object-cover rounded-xl border bg-gray-50 shadow-xs" />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-400 text-[10px]">ไม่มีภาพ</div>
                      )}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  alert("รูปภาพแบนเนอร์สินค้ามีขนาดไฟล์ใหญ่เกิน 5MB ค่ะ!");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditingCatalogProduct({ ...editingCatalogProduct, image: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-gray-800 file:text-white hover:file:opacity-90 file:cursor-pointer"
                          />
                          <input
                            type="text"
                            className="bg-gray-50 border rounded-lg px-2.5 py-1 text-[10px] flex-1 font-mono focus:outline-none"
                            placeholder="หรือพิมพ์ระบุที่อยู่ลิงก์ภาพ URL..."
                            value={editingCatalogProduct.image}
                            onChange={(e) => setEditingCatalogProduct({ ...editingCatalogProduct, image: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-2.5 pt-1">
                    <button type="submit" className="flex-1 py-3 bg-[#FF1E27] hover:opacity-90 text-white rounded-xl font-bold text-xs shadow" style={{ backgroundColor: themePrimary }}>
                      ✓ ยืนยันบันทึกอัปเดตรายละเอียดสินค้าส่งขายกลาง
                    </button>
                    <button type="button" onClick={() => setEditingCatalogProduct(null)} className="px-5 py-3 border rounded-xl font-bold text-gray-500 bg-white hover:bg-gray-100 text-xs">
                      ยกเลิก
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase text-[9px] tracking-widest font-mono">
                      <th className="p-3">สินค้า</th>
                      <th className="p-3">ร้านค้าเจ้าของ</th>
                      <th className="p-3">ราคา</th>
                      <th className="p-3">สต็อกคงเหลือ</th>
                      <th className="p-3">ยอดขายสะสม</th>
                      <th className="p-3">สถานะตรวจ</th>
                      <th className="p-3 text-center">จัดการระบบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.filter(p => 
                      p.merchantName.toLowerCase().includes(productSearchShop.toLowerCase()) || 
                      p.merchantId.toLowerCase().includes(productSearchShop.toLowerCase()) || 
                      p.name.toLowerCase().includes(productSearchShop.toLowerCase()) ||
                      (p.merchantPhone && p.merchantPhone.includes(productSearchShop))
                    ).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="p-3 flex items-center gap-2.5">
                          <img src={p.image} className="w-9 h-9 rounded-lg object-cover bg-gray-50 border" referrerPolicy="no-referrer" />
                          <div>
                            <span className="font-black text-gray-800 block truncate max-w-[150px]">{p.name}</span>
                            <span className="text-[9px] text-gray-400 font-mono font-bold">บาร์ ID: {p.id}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-gray-700 block">{p.merchantName}</span>
                          {p.merchantPhone && (
                            <span className="text-[10px] text-amber-700 font-mono font-extrabold block bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5 mt-1 max-w-fit">
                              📱 {p.merchantPhone}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">ID: {p.merchantId}</span>
                        </td>
                        <td className="p-3 font-black text-gray-900 font-mono">{p.price.toLocaleString()} THB</td>
                        <td className="p-3 font-black font-mono text-gray-650 text-gray-600">{p.totalStock} ชิ้น</td>
                        <td className="p-3 font-black font-mono text-emerald-600">{p.salesVolume ?? 0} ชิ้น</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                            p.status === 'approved' ? 'bg-teal-100 text-teal-700' : p.status === 'paused' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCatalogProduct(p)}
                              className="p-1 px-2.5 text-[10px] font-extrabold text-gray-600 bg-white border rounded-lg hover:bg-gray-50 transition"
                            >
                              แก้ไขบอร์ด
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProductCentral(p.id)}
                              className="p-1 px-2.5 text-[10px] font-black text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                            >
                              ลบสินค้า 🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4.6. LIVE CHAT CONSOLE MODULE */}
        {activeModule === 'chat' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">6. โต๊ะซัพพอร์ตแชตสดส่วนกลาง (Live Chat Core Desk)</h3>
            
            <div className="grid grid-cols-3 gap-4 h-96">
              
              {/* Users chat side catalog list */}
              <div className="border border-gray-100 rounded-2xl bg-gray-50/50 h-full overflow-y-auto divide-y divide-gray-100 p-1">
                <span className="text-[9px] font-bold text-gray-400 block px-2 py-1.5 uppercase tracking-wider font-mono">แชตสตรีมล่าสุด:</span>
                {filteredChatsGroupedByUsers.map((item) => {
                  const uId = item.userId;
                  const countMsg = chats.filter(c => c.userId === uId).length;
                  const isActive = activeAdminChatUserId === uId;
                  
                  return (
                    <button
                      key={uId}
                      onClick={() => setActiveAdminChatUserId(uId)}
                      className={`w-full text-left p-2.5 rounded-xl transition-colors flex flex-col gap-1 ${
                        isActive ? 'bg-[#FF1E27] text-white shadow-sm' : 'hover:bg-white text-gray-700'
                      }`}
                      style={isActive ? { backgroundColor: themePrimary } : undefined}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black truncate max-w-[100px] block leading-none">{item.userName}</span>
                        <span className="text-[8px] opacity-75 font-mono">{countMsg} ข้อความ</span>
                      </div>
                      <span className="text-[9px] opacity-80 font-semibold truncate leading-none mt-1">
                        {item.message}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Console chat panel dialog */}
              <div className="col-span-2 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between h-full bg-white shadow-inner">
                {activeAdminChatUserId ? (
                  <div className="flex-1 flex flex-col justify-between h-full">
                    {/* Chat dialogue list */}
                    <div className="flex-1 overflow-y-auto p-2 border-b space-y-2.5 flex flex-col h-40 no-scrollbar">
                      {chats.filter(c => c.userId === activeAdminChatUserId).map((chat, index) => {
                        const isNotAdmin = chat.sender === 'user';
                        return (
                          <div
                            key={index}
                            className={`flex flex-col max-w-[85%] ${isNotAdmin ? 'self-start items-start' : 'self-end items-end'}`}
                          >
                            <span className="text-[8px] font-extrabold text-gray-400 mb-0.5">
                              {isNotAdmin ? `ผู้ใช้ [${activeAdminChatUserId}]` : 'แอดมินคุณตอบ'}
                            </span>
                            <div className={`p-2.5 rounded-xl text-xs space-y-1 block leading-relaxed hover:shadow shadow-sm ${
                              isNotAdmin ? 'bg-gray-100 text-gray-800' : 'bg-gray-900 text-white'
                            }`}>
                              <p className="font-semibold break-all whitespace-pre-wrap">{chat.message}</p>
                              {chat.image && <img src={chat.image} className="max-w-[100px] border rounded mt-1" referrerPolicy="no-referrer" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat reply entry form */}
                    <form onSubmit={handleAdminResponseSend} className="flex gap-2 pt-3">
                      <input
                        type="text"
                        placeholder="พิมพ์ข้อความตอบกลับแอดมินสลีป..."
                        className="flex-1 bg-gray-50 border rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none"
                        value={adminChatResponse}
                        onChange={(e) => setAdminChatResponse(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <Send size={11} /> ส่งคำตอบ
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs text-center py-16">
                    <MessageSquare size={24} className="stroke-[1.2] mb-1.5" />
                    <p className="font-bold">กรุณาเลือกหนึ่งสตรีมลูกค้า จากรายการแคตตาล็อกทางซ้าย เพื่อทำการสนทนาแชตตอบกลับค่ะ</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 4.7. DIRECT PUSH NOTIFICATIONS MODULE */}
        {activeModule === 'push' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">7. เมนูส่งการแจ้งเตือนแบบเจาะจง (Direct Push Notifications Console)</h3>

            <div className="space-y-4">
              {/* Lookup User to Push */}
              <div className="space-y-1.5 p-4 border rounded-2xl bg-gray-50/50">
                <span className="text-xs font-black text-rose-600 block">📥 ส่องบัญชีผู้ใช้เป้าหมายการส่ง Push (User Search Lookup)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ป้อนเบอร์โทรผู้รับ เช่น 0991234567"
                    className="flex-1 bg-white border rounded-xl py-2 px-3 text-xs font-bold font-mono"
                    value={pushPhoneSearch}
                    onChange={(e) => setPushPhoneSearch(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                  <button
                    type="button"
                    onClick={handleLookupPushUser}
                    className="bg-gray-900 text-white px-4 py-2 text-xs font-bold rounded-xl"
                  >
                    ค้นหาความเจาะจง
                  </button>
                </div>

                {pushSelectedUser && (
                  <div className="mt-3 p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold">• สแกนพบผู้ใช้: {pushSelectedUser.name}</p>
                      <p className="text-[10px] font-mono">• Target ID: {pushSelectedUser.id} | Tel: {pushSelectedUser.phone}</p>
                    </div>
                    <button type="button" onClick={() => setPushSelectedUser(null)} className="text-gray-400 hover:text-red-500 font-bold">ยกเลิก</button>
                  </div>
                )}
              </div>

              {/* Form to submit Notification */}
              {pushSelectedUser ? (
                <form onSubmit={handlePushDirectNotifByAdmin} className="space-y-4 animate-slide-up">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">หัวข้อสำหรับการแจ้งเตือนความสะใจ (Alert Title)</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs font-bold"
                      placeholder="เช่น แจ้งแจกโปรโมชั่นรางวัลใหญ่ของคุณ"
                      value={pushMessageTitle}
                      onChange={(e) => setPushMessageTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">เนื้อหากล่องข้อความประกาศคราวด์ (Markdown Notification message text)</label>
                    <textarea
                      className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs font-semibold h-24"
                      placeholder="ระบุข้อความประกาศ..."
                      value={pushMessageBody}
                      onChange={(e) => setPushMessageBody(e.target.value)}
                    />
                  </div>

                  {/* Highlights selector colors presets */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl">
                    <label className="text-[10px] font-bold text-gray-400 block">โทนสีแถบไฮไลท์ประยุกต์ใช้งาน (Highlighted Border color preset)</label>
                    <div className="flex gap-2">
                      {['#FF1E27', '#EAB308', '#2563EB', '#0D9488', '#6366F1'].map(hex => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setPushHighlightColor(hex)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            pushHighlightColor === hex ? 'scale-125 border-black shadow' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 text-xs font-black text-white rounded-xl shadow-md transition-opacity hover:opacity-95"
                    style={{ background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)` }}
                  >
                    ยิงข้อความ Push Direct Bullet
                  </button>
                </form>
              ) : (
                <p className="text-[10.5px] font-semibold text-gray-400 bg-gray-50 p-3.5 border rounded-2xl text-center">
                  * หมายเหตุ: กรุณาป้อนเบอร์โทรติดต่อผู้ใช้ด้านบนและ กดค้นหาความเจาะจง ก่อน จึงจะสามารถเข้าถึงแป้นพิมพ์ข้อความส่งแจ้งเตือนสุดโดดเด่นโดนใจได้ค่ะ
                </p>
              )}
            </div>
          </div>
        )}

        {/* 4.8. MERCHANT SALES CONTROL MODULE */}
        {activeModule === 'merchant_sales' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6 animate-fade-in">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">8. ควบคุมสิทธิ์การขายและสถานะรับออเดอร์ร้านค้า (Merchant Sales Control Panel)</h3>

            <div className="space-y-4">
              <span className="text-[10px] font-black text-[#FF1E27] block uppercase tracking-wider font-mono">🏪 บัญชีร้านค้าทั้งหมดในระบบและข้อมูลเลขบัญชีสำหรับการโอน (Merchant Directory & Bank Accounts)</span>
              
              <div className="overflow-x-auto rounded-2xl border border-gray-150">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">รหัสร้านค้า (ID)</th>
                      <th className="p-3">ชื่อ / ชื่อเล่น (Merchant Name)</th>
                      <th className="p-3">เบอร์ติดต่อ (Phone)</th>
                      <th className="p-3">เลขบัญชีร้านค้า (Bank Account)</th>
                      <th className="p-3 text-center">สถานะรับออเดอร์ (Status)</th>
                      <th className="p-3 text-center">ควบคุม (Toggle)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
                    {users.filter(u => u.role === 'Merchant').map((merchant) => {
                      const isOrderEnabled = merchant.isOrderEnabled !== false; // defaults to true
                      return (
                        <tr key={merchant.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-mono text-gray-500">{merchant.id}</td>
                          <td className="p-3">
                            <div className="leading-snug">
                              <p className="font-extrabold text-[#FF1E27]">{merchant.name}</p>
                              {merchant.nickname && <p className="text-[10px] text-gray-400 font-medium">({merchant.nickname})</p>}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[11px]">{merchant.phone}</td>
                          <td className="p-3">
                            {merchant.bankAccount ? (
                              <div className="leading-snug text-gray-600 font-normal">
                                <p className="font-mono text-[11px] font-bold text-gray-800">{merchant.bankAccount}</p>
                                <p className="text-[9px] text-gray-400">{merchant.bankName} - {merchant.bankHolderName || 'ไม่ได้ระบุชื่อผู้ถือ'}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[10px] font-normal">ไม่ได้ผูกบัญชีธนาคาร</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                              isOrderEnabled ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isOrderEnabled ? 'เปิดรับออเดอร์' : 'ปิดการรับออเดอร์'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedUsers = users.map(u => {
                                  if (u.id === merchant.id) {
                                    return { ...u, isOrderEnabled: !isOrderEnabled };
                                  }
                                  return u;
                                });
                                onUpdateUsers(updatedUsers);
                                alert(`ปรับสิทธิ์การรับออเดอร์ของร้านค้า ${merchant.name} เป็น ${!isOrderEnabled ? 'เปิด' : 'ปิด'} เรียบร้อยแล้วค่ะ!`);
                              }}
                              className={`px-3 py-1.5 rounded-xl font-black text-[10px] tracking-wide cursor-pointer transition active:scale-95 ${
                                isOrderEnabled 
                                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow shadow-rose-100' 
                                  : 'bg-teal-500 hover:bg-teal-600 text-white shadow shadow-teal-100'
                              }`}
                            >
                              {isOrderEnabled ? '⛔ ปิด ยืนยันตัวตน' : '✅ เปิด ยืนยันตัวตน'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {users.filter(u => u.role === 'Merchant').length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-400 font-bold">
                          ไม่พบรายชื่อกลุ่มร้านค้าเพื่อควบคุม ณ ขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4.9. ONLINE ACTIONS AUDIT LOG MODULE */}
        {activeModule === 'online_actions_log' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">9. ระบบบันทึกประวัติและจดจำข้อมูลการกระทำออนไลน์ (Online Action Logger Hub)</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  ระบบจดจำข้อมูลและการกระทำทั้งหมดที่เกิดขึ้นบนหน้าเว็บออนไลน์และจัดเก็บสำรองข้อมูลเพื่อความปลอดภัย 🛡️
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const logsStr = JSON.stringify(actionLogs, null, 2);
                      const blob = new Blob([logsStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `paopao_online_activity_logs_${new Date().toISOString().slice(0,10)}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      alert("ดาวน์โหลดล้มเหลว: " + e);
                    }
                  }}
                  className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition active:scale-95"
                >
                  <Database size={13} />
                  📥 ดาวน์โหลดแบ็คอัพสำรองกิจกรรม
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("คุณแน่ใจหรือไม่ที่จะทำการรีเซ็ตล้างประวัติการกระทำและข้อมูลที่จดจำทั้งหมดในเครื่องนี้?")) {
                      const resetLog = [
                        {
                          id: `LOG-RESET-${Date.now()}`,
                          timestamp: new Date().toISOString(),
                          category: "settings",
                          actionName: "ล้างประวัติบันทึกข้อมูล",
                          description: "ผู้ดูแลระบบได้สั่งเคลียร์ประวัติกิจกรรมและระบบความปลอดภัยทั้งหมดในเครื่องนี้เรียบร้อยแล้วค่ะ",
                          operator: currentUser ? `${currentUser.name} (${currentUser.id})` : "ผู้ดูแลระบบ",
                          status: "offline_saved" as const
                        }
                      ];
                      localStorage.setItem("paopao_online_actions_log", JSON.stringify(resetLog));
                      setActionLogs(resetLog);
                      alert("ล้างบันทึกประวัติการกระทำออนไลน์สำเร็จเรียบร้อยค่ะ!");
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black flex items-center gap-1 transition active:scale-95 border border-rose-200"
                >
                  <Trash size={13} />
                  ล้างทั้งหมด
                </button>
              </div>
            </div>

            {/* STATS BREAKDOWN GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">ประวัติกิจกรรมทั้งหมด (Total Logs)</span>
                <p className="text-3xl font-black text-gray-800 mt-1 font-mono">{actionLogs.length} <span className="text-xs font-bold text-gray-400">รายการ</span></p>
              </div>
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">บันทึกสำรองในเบราว์เซอร์ (Offline Cache)</span>
                <p className="text-3xl font-black text-amber-700 mt-1 font-mono">
                  {actionLogs.filter(l => l.status === 'offline_saved').length} <span className="text-xs font-bold text-amber-500">รายการ</span>
                </p>
              </div>
              <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider">สถานะซิงค์คลาวด์สำเร็จ (Cloud Synced)</span>
                <p className="text-3xl font-black text-teal-700 mt-1 font-mono">
                  {actionLogs.filter(l => l.status === 'cloud_synced').length} <span className="text-xs font-bold text-teal-500">รายการ</span>
                </p>
              </div>
            </div>

            {/* LOG SEARCH & FILTERS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ค้นหาตามรหัส รายละเอียด การกระทำ หรือชื่อผู้ดำเนินการ..."
                  value={logSearchText}
                  onChange={(e) => setLogSearchText(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
                />
                <Search size={13} className="absolute left-2.5 top-3 text-gray-400" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-black uppercase">
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    logCategoryFilter === 'all' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter('orders')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    logCategoryFilter === 'orders' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  คำสั่งซื้อ
                </button>
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter('financial')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    logCategoryFilter === 'financial' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  ธุรกรรมการเงิน
                </button>
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter('users')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    logCategoryFilter === 'users' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  สมาชิก
                </button>
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter('products')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    logCategoryFilter === 'products' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  สินค้า
                </button>
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter('settings')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    logCategoryFilter === 'settings' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  ตั้งค่าระบบ
                </button>
              </div>
            </div>

            {/* LOG HISTORY LIST */}
            <div className="overflow-x-auto rounded-2xl border border-gray-150">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">รหัสบันทึก (Log ID)</th>
                    <th className="p-3">วันเวลา (Timestamp)</th>
                    <th className="p-3">ประเภท (Category)</th>
                    <th className="p-3">การกระทำ (Action Event)</th>
                    <th className="p-3">รายละเอียด (Description)</th>
                    <th className="p-3">ผู้ดำเนินการ (Operator)</th>
                    <th className="p-3 text-center">สถานะสำรอง (Backup Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
                  {actionLogs
                    .filter((log) => {
                      if (logCategoryFilter !== 'all' && log.category !== logCategoryFilter) {
                        return false;
                      }
                      if (logSearchText.trim()) {
                        const search = logSearchText.toLowerCase();
                        return (
                          log.id.toLowerCase().includes(search) ||
                          log.actionName.toLowerCase().includes(search) ||
                          log.description.toLowerCase().includes(search) ||
                          log.operator.toLowerCase().includes(search)
                        );
                      }
                      return true;
                    })
                    .map((log) => {
                      let catColor = "bg-gray-100 text-gray-600";
                      let catLabel = log.category;
                      if (log.category === 'settings') {
                        catColor = "bg-blue-100 text-blue-700";
                        catLabel = "⚙️ ตั้งค่าระบบ";
                      } else if (log.category === 'financial') {
                        catColor = "bg-teal-100 text-teal-700";
                        catLabel = "💰 การเงิน/ธุรกรรม";
                      } else if (log.category === 'users') {
                        catColor = "bg-purple-100 text-purple-700";
                        catLabel = "👤 สมาชิก/สิทธิ์";
                      } else if (log.category === 'products') {
                        catColor = "bg-amber-100 text-amber-700";
                        catLabel = "🛍️ สินค้า/สต็อก";
                      } else if (log.category === 'orders') {
                        catColor = "bg-rose-100 text-rose-700";
                        catLabel = "📦 สั่งซื้อคำสั่ง";
                      }

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-mono text-gray-400 text-[10px]">{log.id}</td>
                          <td className="p-3 font-normal text-gray-500 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleString("th-TH")}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${catColor}`}>
                              {catLabel}
                            </span>
                          </td>
                          <td className="p-3 font-extrabold text-gray-800">{log.actionName}</td>
                          <td className="p-3 font-normal text-gray-600 max-w-xs truncate" title={log.description}>
                            {log.description}
                          </td>
                          <td className="p-3 text-gray-500 font-mono text-[10px]">{log.operator}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[9px] font-black inline-flex items-center gap-1 ${
                              log.status === 'cloud_synced' 
                                ? 'bg-teal-100 text-teal-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {log.status === 'cloud_synced' ? '✅ Cloud Synced' : '💾 Local Cached'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {actionLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-400 font-bold">
                        ไม่พบประวัติกิจกรรมการทำรายการในฐานข้อมูลระบบ ณ ตอนนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* POPUP FULLSCREEN SLIP VIEWER */}
      {expandedSlipUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setExpandedSlipUrl(null)}
        >
          <div 
            className="relative bg-white rounded-3xl overflow-hidden max-w-lg w-full max-h-[85vh] flex flex-col p-4 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <span className="text-xs font-black text-gray-800">📸 แนบภาพหลักฐานสลิปฝากเงินจริง</span>
              <button 
                type="button"
                onClick={() => setExpandedSlipUrl(null)}
                className="p-1 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs rounded-lg active:scale-95 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง (X)
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto rounded-2xl border p-1 bg-gray-50 flex items-center justify-center">
              <img 
                src={expandedSlipUrl} 
                alt="Enlarged Slip" 
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <p className="text-center text-[10.5px] font-bold text-gray-400 mt-2.5">
              * แอดมินกรุณาตรวจสอบชื่อผู้โอน ยอดเงินโอนจริง และวันเวลาให้สอดคล้องกับสลิปก่อนกดยืนยัน
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
