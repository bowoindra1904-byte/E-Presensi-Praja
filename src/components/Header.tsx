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
  HeartHandshake,
  Trophy,
  CalendarDays,
  Menu,
  ChevronRight
} from 'lucide-react';
import { NotificationItem, Employee, AdminAccount } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { SatpolPPLogo } from './SatpolPPLogo';

export type AdminTabType = 'monitoring' | 'locations' | 'employees' | 'leaves' | 'holidays' | 'reports' | 'top_five' | 'security';

interface HeaderProps {
  currentRole: 'pegawai' | 'admin';
  currentEmployee?: Employee;
  currentAdmin?: AdminAccount;
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
  customHolidaysCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentEmployee,
  currentAdmin,
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
  customHolidaysCount = 0,
}) => {
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);

  // Daftar Menu Dashboard Utama Admin Satpol PP untuk Side Board
  const adminMenuItems: Array<{
    id: AdminTabType;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
    badgeColor?: string;
  }> = [
    {
      id: 'monitoring',
      label: 'Monitoring Live',
      sublabel: 'Pantau log kehadiran & peta pos realtime',
      icon: Radio,
      badge: 'Live',
      badgeColor: 'bg-emerald-500 text-white animate-pulse'
    },
    {
      id: 'locations',
      label: 'Pos Lokasi',
      sublabel: 'Kelola 12 pos penugasan & radius geofence',
      icon: MapPin,
      badge: `${locationsCount ?? 12} Pos`,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'employees',
      label: 'Data Pegawai',
      sublabel: 'Personel Satpol PP, NIP, Regu & Kunci HP',
      icon: Users,
      badge: `${employeesCount ?? 150} Orang`,
      badgeColor: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'leaves',
      label: 'Izin & Sakit',
      sublabel: 'Verifikasi permohonan dinas, izin & sakit',
      icon: HeartHandshake,
      badge: pendingLeavesCount > 0 ? `${pendingLeavesCount} Menunggu` : null,
      badgeColor: 'bg-rose-600 text-white animate-pulse'
    },
    {
      id: 'holidays',
      label: 'Hari Libur',
      sublabel: 'Kalender libur kustom pemda & hari besar',
      icon: CalendarDays,
      badge: customHolidaysCount > 0 ? `${customHolidaysCount} Kustom` : null,
      badgeColor: 'bg-amber-200 text-amber-900'
    },
    {
      id: 'reports',
      label: 'Laporan Bulanan',
      sublabel: 'Rekapitulasi resmi, arsip dokumen & ekspor CSV',
      icon: FileText,
      badge: 'Rekap',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'top_five',
      label: 'Top Five Presensi',
      sublabel: 'Peringkat 5 paling disiplin, terlambat & TK',
      icon: Trophy,
      badge: 'Top 5',
      badgeColor: 'bg-amber-400 text-amber-950 font-black'
    },
    {
      id: 'security',
      label: 'Kunci & Audit',
      sublabel: 'Deteksi anti-fake GPS & integritas perangkat',
      icon: ShieldAlert,
      badge: 'Audit',
      badgeColor: 'bg-rose-100 text-rose-800'
    }
  ];

  const activeItem = adminMenuItems.find(m => m.id === activeAdminTab) || adminMenuItems[0];
  const ActiveIcon = activeItem.icon;

  const handleSelectTab = (tab: AdminTabType) => {
    onAdminTabChange(tab);
    setIsAdminSidebarOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 shadow-xs">
        {/* Top Accent Gradient Bar */}
        <div className="h-0.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 w-full" />
        
        {/* Main Top Header Bar */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2">
          
          {/* Zone 1: Tombol Tiga Garis (Side Board) + Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {currentRole === 'admin' && (
              <button
                type="button"
                onClick={() => setIsAdminSidebarOpen(true)}
                title="Buka Menu Dashboard (Side Board)"
                className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 transition-all flex items-center gap-2 shadow-xs group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <Menu className="w-5 h-5 text-amber-700 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-xs font-black tracking-tight text-amber-950">
                  MENU
                </span>
                {(pendingLeavesCount > 0 || customHolidaysCount > 0) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping sm:hidden" />
                )}
              </button>
            )}

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
          </div>

          {/* Zone 2: Penunjuk Menu Aktif Saat Ini (Untuk Admin) atau Kartu Pegawai */}
          {currentRole === 'admin' ? (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdminSidebarOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/90 text-xs transition-all shadow-2xs group cursor-pointer"
                title="Klik untuk membuka Side Board menu lainnya"
              >
                <div className="p-1 rounded-lg bg-amber-100 text-amber-800">
                  <ActiveIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 leading-none">{activeItem.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">· Aktif</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">{activeItem.sublabel}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform ml-1" />
              </button>

              {/* Logged-in Admin Identity Badge */}
              {currentAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdminPinModal}
                  title="Klik untuk mengelola profil & PIN login akun Anda"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs transition-all group cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {currentAdmin.role === 'komando_pusat' ? 'KP' : currentAdmin.role.replace('danru_', 'D')}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-amber-950 truncate max-w-[130px] leading-tight">
                        {currentAdmin.name.split(' (')[0]}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.1 rounded bg-amber-200 text-amber-900 font-bold shrink-0">
                        {currentAdmin.role === 'komando_pusat' ? 'PUSAT' : currentAdmin.reguScope}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-800/80 block leading-tight font-mono">
                      @{currentAdmin.username} · PIN & Akun
                    </span>
                  </div>
                </button>
              )}
            </div>
          ) : (
            /* Employee View Badge */
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
              <div className="hidden lg:flex items-center gap-1.5">
                {onOpenPrintModal && (
                  <button
                    type="button"
                    onClick={onOpenPrintModal}
                    title="Pusat Cetak Dokumen Kedinasan"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px]">Cetak</span>
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
                    <span className="text-[11px]">PIN</span>
                  </button>
                )}

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
                  <span className="text-[11px]">Simulasi</span>
                </button>
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
                <span className="hidden md:inline">Panduan</span>
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

      </header>

      {/* ========================================================================= */}
      {/* SIDE BOARD / SIDEBAR DRAWER MENU ADMIN (TOMBOL GARIS TIGA)               */}
      {/* ========================================================================= */}
      {currentRole === 'admin' && isAdminSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAdminSidebarOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-sm sm:max-w-md bg-white shadow-2xl border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-300 ease-out animate-in slide-in-from-left">
              
              {/* Sidebar Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-amber-50/60 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 p-1 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <SatpolPPLogo className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                        <span>KOMANDO ADMIN</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                          {currentAdmin?.role === 'komando_pusat' ? 'PUSAT' : currentAdmin?.reguScope || 'POL PP'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-600 truncate font-medium">
                        {currentAdmin ? `${currentAdmin.name.split(' (')[0]} (@${currentAdmin.username})` : 'Pusat Kendali Sistem Presensi SI-PRAJA'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAdminSidebarOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                    title="Tutup Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sidebar Menu Items List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 scrollbar-thin">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Menu Utama Dashboard
                </div>

                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeAdminTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between gap-3 group ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/25 ring-2 ring-amber-500/30 font-bold'
                          : 'bg-white hover:bg-amber-50/70 text-slate-700 hover:text-amber-950 border border-slate-100 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-amber-600 group-hover:bg-amber-100 group-hover:text-amber-800'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                              {item.label}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate ${isActive ? 'text-amber-100' : 'text-slate-500'}`}>
                            {item.sublabel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'} ${isActive ? 'bg-white text-amber-900 border-white' : ''}`}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5'} transition-all`} />
                      </div>
                    </button>
                  );
                })}

                {/* Seksi Alat Cepat Komando */}
                <div className="pt-4 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Alat & Utilitas Kedinasan
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {onOpenPrintModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminSidebarOpen(false);
                        onOpenPrintModal();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-amber-200 text-left transition-colors group"
                    >
                      <Printer className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xs font-bold text-slate-900">Cetak Dokumen</div>
                      <div className="text-[10px] text-slate-500">Pusat Cetak Berita Acara</div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminSidebarOpen(false);
                      onOpenTimeSimulator();
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-amber-200 text-left transition-colors group"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold text-slate-900">Uji Jam Kerja</div>
                    <div className="text-[10px] text-slate-500">Simulasi Aturan Masuk/Pulang</div>
                  </button>

                  {onOpenAdminPinModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminSidebarOpen(false);
                        onOpenAdminPinModal();
                      }}
                      className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors group cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-amber-700 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xs font-bold text-amber-950">Kelola Akun & PIN</div>
                      <div className="text-[10px] text-amber-800">
                        {currentAdmin ? currentAdmin.name.split(' (')[0] : 'Kunci Keamanan'}
                      </div>
                    </button>
                  )}

                  {onOpenGuideModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminSidebarOpen(false);
                        onOpenGuideModal();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-amber-200 text-left transition-colors group"
                    >
                      <BookOpen className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xs font-bold text-slate-900">SOP & Panduan</div>
                      <div className="text-[10px] text-slate-500">Buku Panduan Teknis</div>
                    </button>
                  )}
                </div>

              </div>

              {/* Sidebar Footer info */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>Cloud Firestore Live</span>
                  </span>
                  <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Sinkron
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-200">
                  Satpol PP Kabupaten Bangka Barat © 2026
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
