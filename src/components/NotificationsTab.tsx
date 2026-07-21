/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Sparkles, MessageCircle, Calendar, ShieldAlert } from 'lucide-react';
import { SystemNotification, User, SystemSettings } from '../types';

interface NotificationsTabProps {
  notifications: SystemNotification[];
  currentUser: User | null;
  settings: SystemSettings;
  onNavigate: (tab: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationsTab({
  notifications,
  currentUser,
  settings,
  onNavigate,
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationsTabProps) {
  const themePrimary = settings.themeColor || '#FF1E27';
  const themeGradientEnd = settings.themeGradientEnd || '#FF5E62';

  // Filter notifications relevant to current user: either target "all" or specific user's ID
  const relevantList = notifications
    .filter(notif => {
      const isRelevant = notif.userId === 'all' || (currentUser && notif.userId === currentUser.id);
      if (!isRelevant) return false;

      // When registering a new account, do not show historical system alerts that happened before registration
      if (currentUser) {
        const userCreatedAt = currentUser.createdAt || "2026-06-01T00:00:00Z";
        if (new Date(notif.createdAt).getTime() < new Date(userCreatedAt).getTime()) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="px-4 py-8 md:px-8 max-w-xl mx-auto pb-32 animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider block font-display mb-1 flex items-center gap-1.5 font-sans">
            <Bell size={17} className="text-[#FF1E27] fill-[#FF1E27]/10" />
            ศูนย์การแจ้งเตือนข่าวสาร (Notifications)
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">
            Direct Alerts & Announcements
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && relevantList.some(n => !n.readBy || !n.readBy.includes(currentUser.id)) && (
            <button
              onClick={onMarkAllAsRead}
              className="text-[10px] bg-red-50 hover:bg-red-100 text-[#FF1E27] px-2.5 py-1 rounded-lg font-bold transition-all border border-red-100 select-none cursor-pointer"
            >
              ✓ อ่านทั้งหมด (Read All)
            </button>
          )}
          <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-mono font-bold text-gray-600 shrink-0">
            {relevantList.length} ALERTS
          </span>
        </div>
      </div>

      {relevantList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center">
          <Bell size={36} className="text-gray-300 stroke-[1.2] mb-2" />
          <p className="text-xs font-bold text-gray-400">คุณยังไม่มีข้อความแจ้งเตือนใหม่ในกล่องจดหมาย</p>
        </div>
      ) : (
        <div className="space-y-4">
          {relevantList.map((notif) => {
            const dateObj = new Date(notif.createdAt);
            const dateStr = dateObj.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const isUnread = currentUser && (!notif.readBy || !notif.readBy.includes(currentUser.id));

            // If it is a System Announcement, render extra HIGHLIGHTED neon red gradients and custom styles,
            // HIDING any reference to 'System Announcement' / 'การแจ้งเตือนจากระบบ' labels!
            if (notif.isSystemAnnouncement) {
              return (
                <div
                  key={notif.id}
                  id={`notif-${notif.id}`}
                  onClick={() => {
                    if (isUnread) onMarkAsRead(notif.id);
                  }}
                  className={`rounded-2xl p-5 shadow-sm border text-white relative overflow-hidden flex flex-col gap-2.5 transition active:scale-[0.98] cursor-pointer ${
                    isUnread ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-white' : 'opacity-85'
                  }`}
                  style={{ 
                    backgroundImage: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)`,
                    borderColor: themePrimary,
                    boxShadow: `0 4px 18px ${themePrimary}20`
                  }}
                >
                  {/* Glowing dynamic background decorative symbols */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

                  <div className="flex justify-between items-start">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest font-display text-yellow-300 bg-black/30 px-2.5 py-0.5 rounded-full border border-yellow-300/20">
                      <Sparkles size={10} className="fill-yellow-300" />
                      SPECIAL NOTIFICATION BULLETIN {isUnread && "🔴 (NEW)"}
                    </span>
                    <span className="text-[9px] font-bold opacity-80 font-mono flex items-center gap-1 text-white">
                      <Calendar size={10} /> {dateStr}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-black tracking-tight drop-shadow-sm leading-snug">
                      {notif.title}
                    </h3>
                    <p className="text-[11px] font-medium leading-relaxed opacity-95 text-red-50">
                      {notif.message}
                    </p>
                  </div>
                </div>
              );
            }

            // Normal Notification (e.g., customized push or transaction notifications)
            const customBgColor = notif.highlightColor || '#ffffff';
            const isCustomHighlighted = !!notif.highlightColor;

            return (
              <div
                key={notif.id}
                id={`notif-${notif.id}`}
                onClick={() => {
                  if (isUnread) onMarkAsRead(notif.id);
                }}
                className={`bg-white rounded-2xl p-4 border flex gap-3.5 shadow-sm transition-all hover:border-gray-300 active:scale-[0.99] cursor-pointer relative overflow-hidden ${
                  isUnread ? 'border-red-300 bg-red-50/5 ring-1 ring-red-100' : 'border-gray-100'
                }`}
                style={isCustomHighlighted ? {
                  borderLeft: `5px solid ${customBgColor}`,
                  boxShadow: `0 4px 14px ${customBgColor}10`
                } : undefined}
              >
                {isUnread && (
                  <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}

                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isCustomHighlighted ? `${customBgColor}12` : '#F9FAFB' }}
                >
                  {isCustomHighlighted ? (
                    <ShieldAlert size={18} style={{ color: customBgColor }} />
                  ) : (
                    <MessageCircle size={18} className="text-[#FF1E27]" />
                  )}
                </div>

                <div className="flex-1 space-y-1 pr-4">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className={`text-xs sm:text-sm leading-snug ${isUnread ? 'font-extrabold text-gray-900' : 'font-bold text-gray-700'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[8px] font-bold text-gray-400 font-mono shrink-0">
                      {dateStr}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
