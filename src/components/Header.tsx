import React, { useState } from 'react';
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
  BookOpen,
  MoreVertical,
  X,
  HeartHandshake
} from 'lucide-react';
import { NotificationItem, Employee } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { SatpolPPLogo } from './SatpolPPLogo';

export type AdminTabType = 'monitoring' | 'locations' | 'employees' | 'leaves' | 'reports' | 'security';

interface HeaderProps {
  currentRole: 'pegawai' | 'admin';
  currentEmployee?: Employee;
  activeAdminTab: AdminTabType;
  onAdminTabChange: (tab: AdminTabType) => void;
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
  locationsCount?: number;
  employeesCount?: number;
  pendingLeavesCount?: number;
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
  locationsCount,
  employeesCount,
  pendingLeavesCount = 0,
}) => {
  const [isMobileAdminMenuOpen, setIsMobileAdminMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 shadow-xs">
      {/* Top Accent Gradient Bar */}
      <div className="h-0.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 w-full" />
      
      {/* Main Top Header Bar */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 p-0.5 border border-amber-500/30 shadow-xs flex items-center justify-center shrink-0">
            <SatpolPPLogo className="w-full h-full rounded-xl object-contain drop-shadow-xs" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
                SI-PRAJA
              </span>
              <span className="text-amber-800 font-extrabold text-[9px] sm:text-[10px] uppercase px-1.5 py-0.2 rounded-md bg-amber-100 border border-amber-300">
                POL PP
              </span>
            </div>
            <span className="text-[10px] sm:text-xs text-slate-500 block -mt-0.5 font-medium truncate max-w-[120px] sm:max-w-none">
              {currentRole === 'admin' ? "Komando Admin Satpol PP" : "Portal Presensi Personel"}
            </span>
          </div>
        </div>

        {/* Zone 2: Employee Role View Badge (Desktop View) */}
        {currentRole === 'pegawai' && (
          <div className="hidden md:flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200 text-xs">
            <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 block leading-tight truncate">{currentEmployee?.name}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                  currentEmployee?.regu === 'Harian'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {currentEmployee?.regu}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                NIP: {currentEmployee?.nip} · Slot {currentEmployee?.locationSlotId}
              </span>
            </div>
          </div>
        )}

        {/* Zone 3: Actions & Real-Time Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Admin Quick Tools: Desktop view */}
          {currentRole === 'admin' && (
            <div className="hidden md:flex items-center gap-1.5">
              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={onOpenPrintModal}
                  title="Pusat Cetak Dokumen Kedinasan"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden xl:inline text-[11px]">Cetak Laporan</span>
                </button>
              )}

              {onOpenAdminPinModal && (
                <button
                  type="button"
                  onClick={onOpenAdminPinModal}
                  title="Atur PIN Keamanan Admin"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden xl:inline text-[11px]">PIN</span>
                </button>
              )}

              {/* Test Schedule Button (Uji Jam Shift) - Admin Only */}
              <button
                type="button"
                onClick={onOpenTimeSimulator}
                title="Ubah / Uji Jam Absensi (Simulasi Waktu)"
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 shadow-2xs ${
                  simulatedTime
                    ? 'bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden lg:inline text-[11px]">Simulasi Jam</span>
              </button>
            </div>
          )}

          {/* Admin Tools Mobile Quick Button */}
          {currentRole === 'admin' && (
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileAdminMenuOpen(!isMobileAdminMenuOpen)}
                title="Alat Komando Admin"
                className={`p-2 rounded-xl text-xs font-semibold transition-all border shrink-0 flex items-center justify-center ${
                  isMobileAdminMenuOpen || simulatedTime
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              </button>

              {/* Mobile Admin Tools Dropdown Sheet */}
              {isMobileAdminMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs"
                    onClick={() => setIsMobileAdminMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>Menu Komando HP</span>
                      <button
                        type="button"
                        onClick={() => setIsMobileAdminMenuOpen(false)}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileAdminMenuOpen(false);
                        onOpenTimeSimulator();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Uji Jam Absensi (Simulasi)</span>
                    </button>

                    {onOpenPrintModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAdminMenuOpen(false);
                          onOpenPrintModal();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Pusat Cetak Dokumen</span>
                      </button>
                    )}

                    {onOpenAdminPinModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAdminMenuOpen(false);
                          onOpenAdminPinModal();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Atur PIN Komando</span>
                      </button>
                    )}

                    {onOpenGuideModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileAdminMenuOpen(false);
                          onOpenGuideModal();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Panduan & SOP Dinas</span>
                      </button>
                    )}
                  </div>
                </>
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

          {/* Real-time Clock Display */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] sm:text-xs font-mono font-bold text-amber-700 shadow-2xs shrink-0"
            title={simulatedTime ? "Mode Simulasi Waktu Absensi Aktif" : "Waktu Nyata Terverifikasi (WIB)"}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
            <span className="tracking-tight">{currentTimeString}</span>
            <span className="text-[9px] text-slate-500 font-sans hidden sm:inline">WIB</span>
            {simulatedTime && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-ping" title="Simulasi Waktu" />
            )}
          </div>

          {/* Panduan Button (Desktop) */}
          {onOpenGuideModal && (
            <button
              type="button"
              onClick={onOpenGuideModal}
              title="Buka Petunjuk Teknis & SOP Dinas"
              className="hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all items-center gap-1 shrink-0 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Panduan</span>
            </button>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Keluar / Ganti Akun"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1 shrink-0 shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

        </div>

      </div>

      {/* Admin Navigation Bar (Clean, bright, luminous styling) */}
      {currentRole === 'admin' && (
        <div className="border-t border-slate-200/80 bg-slate-50/90 shadow-2xs">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <nav className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onAdminTabChange('monitoring')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'monitoring'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${activeAdminTab === 'monitoring' ? 'text-white' : 'text-amber-500'}`} />
                <span>Monitoring Live</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('locations')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'locations'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${activeAdminTab === 'locations' ? 'text-white' : 'text-amber-500'}`} />
                <span>{locationsCount ?? 12} Pos Lokasi</span>
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('employees')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'employees'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${activeAdminTab === 'employees' ? 'text-white' : 'text-amber-500'}`} />
                <span>{employeesCount ?? 150} Pegawai</span>
              </button>

              {/* Tab Izin & Sakit (New Feature) */}
              <button
                type="button"
                onClick={() => onAdminTabChange('leaves')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'leaves'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <HeartHandshake className={`w-3.5 h-3.5 ${activeAdminTab === 'leaves' ? 'text-white' : 'text-amber-500'}`} />
                <span>Izin & Sakit</span>
                {pendingLeavesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                    {pendingLeavesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('reports')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'reports'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${activeAdminTab === 'reports' ? 'text-white' : 'text-amber-500'}`} />
                <span>Laporan Bulanan</span>
              </button>

              <button
                type="button"
                onClick={() => onAdminTabChange('security')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'security'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${activeAdminTab === 'security' ? 'text-white' : 'text-amber-500'}`} />
                <span>Kunci & Audit</span>
              </button>
            </nav>

            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 font-medium shrink-0">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono">
                <Cloud className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span>Cloud Firestore Live</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Satpol PP Bangka Barat</span>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
