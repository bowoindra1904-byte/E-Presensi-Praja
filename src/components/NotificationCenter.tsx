import React, { useState } from 'react';
import { NotificationItem } from '../types';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  X, 
  Check, 
  Sparkles 
} from 'lucide-react';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  currentUserRole: 'admin' | 'pegawai';
  currentEmployeeId?: string;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  currentUserRole,
  currentEmployeeId,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter notifications visible to current role/employee
  const visibleNotifications = notifications.filter(n => {
    if (currentUserRole === 'admin') {
      return n.targetRole === 'admin' || n.targetRole === 'all';
    } else {
      // Employee sees notifications for employee role or specifically targeted to them
      return (
        (n.targetRole === 'employee' || n.targetRole === 'all') &&
        (!n.targetEmployeeId || n.targetEmployeeId === currentEmployeeId)
      );
    }
  });

  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'invalid_time':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'checkout_reminder':
        return <Sparkles className="w-4 h-4 text-sky-600" />;
      case 'security':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors"
        title="Notifikasi Real-time"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="fixed sm:absolute inset-x-2.5 sm:inset-x-auto top-14 sm:top-full mt-2 sm:right-0 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
            {/* Popover Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-900">Notifikasi Real-Time</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                >
                  Tandai Dibaca
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onMarkAsRead(n.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                      !n.read ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50 opacity-90'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-white shrink-0 mt-0.5 border border-slate-200 shadow-2xs">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {n.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  Tidak ada notifikasi saat ini
                </div>
              )}
            </div>

            {/* Popover Footer */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 flex items-center justify-between">
              <span>{currentUserRole === 'admin' ? "Notifikasi Komando Satpol PP" : "Notifikasi Personel"}</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Toast notification component for instant real-time popups
export const ToastNotificationOverlay: React.FC<{
  toasts: NotificationItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom duration-300 ${
            toast.type === 'late'
              ? 'bg-white border-amber-300 text-amber-950'
              : toast.type === 'invalid_time' || toast.type === 'security'
              ? 'bg-white border-rose-300 text-rose-950'
              : toast.type === 'checkout_reminder'
              ? 'bg-white border-sky-300 text-sky-950'
              : 'bg-white border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {toast.type === 'late' && <Clock className="w-5 h-5 text-amber-600" />}
            {(toast.type === 'invalid_time' || toast.type === 'security') && <AlertTriangle className="w-5 h-5 text-rose-600" />}
            {toast.type === 'checkout_reminder' && <Sparkles className="w-5 h-5 text-sky-600" />}
          </div>
          <div className="flex-1">
            <h5 className="text-xs font-bold text-slate-900">{toast.title}</h5>
            <p className="text-[11px] mt-0.5 leading-relaxed text-slate-600">{toast.message}</p>
            <span className="text-[9px] font-mono text-slate-400 block mt-1">{toast.timestamp}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
