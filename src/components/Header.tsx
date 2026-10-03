import React from 'react';
import { 
  Shield, 
  Clock, 
  SlidersHorizontal, 
  UserCheck, 
  Radio, 
  Users, 
  FileText, 
  ShieldAlert, 
  LogOut,
  Printer,
  KeyRound,
  MapPin,
  Cloud,
  BookOpen
} from 'lucide-react';
import { NotificationItem, Employee } from '../types';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  currentRole: 'pegawai' | 'admin';
  currentEmployee?: Employee;
  activeAdminTab: 'monitoring' | 'locations' | 'employees' | 'reports' | 'security';
  onAdminTabChange: (tab: 'monitoring' | 'locations' | 'employees' | 'reports' | 'security') => void;
  onLogout: () => void;
  simulatedTime: Date | null;
  onOpenTimeSimulator: () => void;
  currentTimeString: string;
  notifications: NotificationItem[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  onOpenAdminPinModal?: () => void;
  onOpenPrintModal?: () => void;
  onOpenGuideModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentEmployee,
  activeAdminTab,
  onAdminTabChange,
  onLogout,
  simulatedTime,
  onOpenTimeSimulator,
  currentTimeString,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onOpenAdminPinModal,
  onOpenPrintModal,
  onOpenGuideModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      
      {/* Main Top Header Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">
                SI-PRAJA
              </span>
              <span className="text-amber-400 font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                POL PP
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium truncate max-w-[140px] sm:max-w-none">
              {currentRole === 'admin' ? "Komando & Pengaturan" : "Portal Presensi Personel"}
            </span>
          </div>
        </div>

        {/* Zone 2: Employee Role View Badge (Only shown in Employee mode) */}
        {currentRole === 'pegawai' && (
          <div className="hidden md:flex items-center gap-2.5 bg-slate-900/80 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs">
            <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white block leading-tight truncate">{currentEmployee?.name}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                  currentEmployee?.regu === 'Harian'
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-950/70 text-amber-400 border-amber-500/30'
                }`}>
                  {currentEmployee?.regu}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                NIP: {currentEmployee?.nip} · Slot {currentEmployee?.locationSlotId}
              </span>
            </div>
          </div>
        )}

        {/* Zone 3: Actions, Real-time Clock, Time Simulator, & Logout (Always fits cleanly without overflowing) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Admin Quick Tools: Cetak & PIN */}
          {currentRole === 'admin' && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={onOpenPrintModal}
                  title="Pusat Cetak Dokumen Resmi Satpol PP (Sesuai Menu)"
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline text-[11px]">Cetak</span>
                </button>
              )}

              {onOpenAdminPinModal && (
                <button
                  type="button"
                  onClick={onOpenAdminPinModal}
                  title="Atur PIN Keamanan Admin"
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline text-[11px]">PIN</span>
                </button>
              )}
            </div>
          )}

          {/* Real-time Notification Bell */}
          <NotificationCenter
            notifications={notifications}
            currentUserRole={currentRole}
            currentEmployeeId={currentEmployee?.id}
            onMarkAsRead={onMarkNotificationAsRead}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
          />

          {/* Real-time Clock Display (Compact, Crisp, & Perfectly Aligned) */}
          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-400 shadow-sm shrink-0"
            title={simulatedTime ? "Mode Simulasi Waktu Absensi Aktif" : "Waktu Nyata Terverifikasi (WIB)"}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
            <span className="tracking-tight text-xs sm:text-[13px]">{currentTimeString}</span>
            <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">WIB</span>
            {simulatedTime && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" title="Simulasi Waktu Aktif" />
            )}
          </div>

          {/* Test Schedule Button (Uji Jam Shift) - Admin Only */}
          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={onOpenTimeSimulator}
              title="Ubah / Uji Jam Absensi (Simulasi Waktu)"
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 shadow-sm ${
                simulatedTime
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline">Uji Jam Shift</span>
              <span className="md:hidden text-[11px]">Uji Jam</span>
            </button>
          )}

          {/* Panduan Button */}
          {onOpenGuideModal && (
            <button
              type="button"
              onClick={onOpenGuideModal}
              title="Buka Petunjuk Teknis & SOP Dinas"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:text-white transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Panduan</span>
            </button>
          )}

          {/* Logout Button (Keluar) */}
          <button
            type="button"
            onClick={onLogout}
            title="Keluar dari Portal"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 hover:text-white border border-rose-800/40 hover:border-rose-700 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

        </div>

      </div>

      {/* Admin Navigation Bar (Unified for All Screen Sizes, Beautiful & Spanning Correctly) */}
      {currentRole === 'admin' && (
        <div className="border-t border-slate-800/80 bg-slate-950/95 shadow-inner">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <nav className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onAdminTabChange('monitoring')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'monitoring'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Monitoring Live</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('locations')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'locations'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>8 Pos Lokasi</span>
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('employees')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'employees'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>150 Pegawai Pol PP</span>
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('reports')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'reports'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Laporan Bulanan</span>
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('security')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'security'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Kunci & Audit</span>
              </button>
            </nav>

            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-medium shrink-0">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                <Cloud className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Cloud Firestore Live</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sistem Komando Satpol PP Bangka Barat</span>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
