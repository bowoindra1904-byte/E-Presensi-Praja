import React, { useState } from 'react';
import { Employee, SecurityLog, NotificationItem, AdminAccount } from '../types';
import { INITIAL_ADMIN_ACCOUNTS } from '../data/initialAdmins';
import { getOrCreateDeviceId } from '../utils/deviceLock';
import { SatpolPPLogo } from './SatpolPPLogo';
import { SatpolPPWatermarkBackground } from './SatpolPPWatermarkBackground';
import { 
  Shield, 
  Smartphone, 
  Users, 
  Lock, 
  KeyRound, 
  UserCheck, 
  Search, 
  ChevronRight, 
  LogIn, 
  ShieldAlert, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  ShieldCheck,
  HelpCircle,
  User,
  FileText,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';

interface LoginPortalProps {
  employees: Employee[];
  adminAccounts?: AdminAccount[];
  onLoginAsEmployee: (employee: Employee, isFirstBinding?: boolean) => void;
  onLoginAsAdmin: (admin: AdminAccount) => void;
  configuredAdminPin?: string;
  onResetDeviceLock?: (employeeId: string) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onAddSecurityLog?: (log: SecurityLog) => void;
  onAddNotification?: (notif: NotificationItem) => void;
  onResetAdminPinToDefault?: (adminId: string, masterKey: string) => { success: boolean; message: string };
}

interface DeviceMismatchState {
  employee: Employee;
  boundDeviceId: string;
  boundDeviceName: string;
  currentDeviceId: string;
  currentDeviceName: string;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  employees,
  adminAccounts = INITIAL_ADMIN_ACCOUNTS,
  onLoginAsEmployee,
  onLoginAsAdmin,
  configuredAdminPin = '123456',
  onResetDeviceLock,
  onUpdateEmployee,
  onAddSecurityLog,
  onAddNotification,
  onResetAdminPinToDefault,
}) => {
  const [activeTab, setActiveTab] = useState<'pegawai' | 'admin'>('pegawai');
  
  // Employee Login State: Nama & NIP
  const [inputName, setInputName] = useState('');
  const [inputNip, setInputNip] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [isNameSuggestionsOpen, setIsNameSuggestionsOpen] = useState(false);
  const [deviceMismatchError, setDeviceMismatchError] = useState<DeviceMismatchState | null>(null);

  // Multi-Admin Login State: 1 Komando + 4 Danru
  const availableAdmins = adminAccounts && adminAccounts.length > 0 ? adminAccounts : INITIAL_ADMIN_ACCOUNTS;
  const [selectedAdminId, setSelectedAdminId] = useState<string>('admin-komando');
  const selectedAdmin = availableAdmins.find(a => a.id === selectedAdminId) || availableAdmins[0];

  // Admin PIN verification modal for legitimate device transfer
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState(false);
  const [adminUnlockPin, setAdminUnlockPin] = useState('');
  const [adminUnlockError, setAdminUnlockError] = useState('');
  const [unlockSuccessMsg, setUnlockSuccessMsg] = useState('');

  // Admin Login State
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);

  // Master Recovery Key State (Hanya Pimpinan / Kasatpol PP)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const currentDevice = getOrCreateDeviceId();

  // Smart normalized search helper
  const normalize = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Smart suggestions for quick auto-fill while typing name or NIP
  const nameSuggestions = React.useMemo(() => {
    const q = inputName.trim();
    if (!q) {
      // If user hasn't typed anything yet, show all registered employees (sorted nicely)
      return employees;
    }
    const cleanQ = q.toLowerCase();
    const cleanDigits = q.replace(/\D/g, '');
    const tokens = cleanQ.split(/\s+/).filter(Boolean);

    return employees.filter(emp => {
      const empName = emp.name.toLowerCase();
      const empNameNorm = normalize(emp.name);
      const empNipDigits = emp.nip.replace(/\D/g, '');
      const empRegu = (emp.regu || '').toLowerCase();
      const empRole = (emp.role || '').toLowerCase();

      // Check if all typed tokens match anywhere in name, role, or regu
      const allTokensMatch = tokens.every(token => 
        empName.includes(token) || 
        empNameNorm.includes(token) ||
        empRegu.includes(token) ||
        empRole.includes(token)
      );

      // Check NIP match if query contains digits
      const nipMatches = cleanDigits.length > 0 && empNipDigits.includes(cleanDigits);

      return allTokensMatch || nipMatches;
    });
  }, [inputName, employees]);

  const handleEmployeeLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceMismatchError(null);
    setUnlockSuccessMsg('');
    setEmployeeError('');

    const cleanInputName = inputName.trim().toLowerCase();
    const cleanInputNip = inputNip.replace(/\D/g, '');

    if (!cleanInputName && !cleanInputNip) {
      setEmployeeError('Silakan masukkan Nama Lengkap dan NIP Anda.');
      return;
    }

    if (!cleanInputName) {
      setEmployeeError('Silakan masukkan Nama Lengkap Anda.');
      return;
    }

    if (!cleanInputNip) {
      setEmployeeError('Silakan masukkan NIP (Nomor Induk Pegawai) Anda.');
      return;
    }

    // Match employee by both NIP and Name, with smart fuzzy/token support
    const matchedEmployee = employees.find(emp => {
      const empNipDigits = emp.nip.replace(/\D/g, '');
      const nipMatches = cleanInputNip.length > 0 
        ? (empNipDigits === cleanInputNip || emp.nip.toLowerCase().includes(inputNip.trim().toLowerCase()))
        : false;

      const empNameClean = emp.name.toLowerCase();
      const empNorm = normalize(emp.name);
      const inputNorm = normalize(cleanInputName);

      const nameWithoutTitles = empNameClean.replace(/,\s*[a-z.\s]+/gi, '').trim();
      const inputWithoutTitles = cleanInputName.replace(/,\s*[a-z.\s]+/gi, '').trim();

      const inputTokens = cleanInputName.split(/\s+/).filter(Boolean);
      const allTokensMatch = inputTokens.length > 0 && inputTokens.every(t => 
        empNameClean.includes(t) || empNorm.includes(normalize(t))
      );

      const nameMatches = 
        empNameClean.includes(cleanInputName) || 
        cleanInputName.includes(nameWithoutTitles) || 
        nameWithoutTitles.includes(inputWithoutTitles) ||
        empNorm === inputNorm ||
        allTokensMatch;

      return nipMatches && nameMatches;
    });

    if (!matchedEmployee) {
      const nipFound = employees.find(e => {
        const empNipDigits = e.nip.replace(/\D/g, '');
        return cleanInputNip.length > 0 && (empNipDigits === cleanInputNip || e.nip.toLowerCase().includes(inputNip.trim().toLowerCase()));
      });

      const nameFound = employees.find(e => {
        const empNameClean = e.name.toLowerCase();
        const empNorm = normalize(e.name);
        const inputNorm = normalize(cleanInputName);
        const inputTokens = cleanInputName.split(/\s+/).filter(Boolean);
        return (
          empNameClean.includes(cleanInputName) || 
          cleanInputName.includes(empNameClean.replace(/,\s*[a-z.\s]+/gi, '').trim()) ||
          empNorm === inputNorm ||
          (inputTokens.length > 0 && inputTokens.every(t => empNameClean.includes(t)))
        );
      });

      if (nipFound && !nameFound) {
        setEmployeeError(`NIP terdaftar atas nama personel "${nipFound.name}", tetapi Nama yang Anda masukkan tidak sesuai. Klik tombol "Daftar" atau pilih dari saran nama untuk pengisian instan.`);
      } else if (!nipFound && nameFound) {
        setEmployeeError(`Personel "${nameFound.name}" ditemukan, tetapi NIP yang Anda masukkan tidak sesuai. Klik nama pada pilihan untuk mengisi NIP (${nameFound.nip}) secara otomatis.`);
      } else {
        setEmployeeError('Data tidak ditemukan! Pastikan Nama Lengkap dan NIP sesuai data personel resmi Satpol PP. Anda juga dapat memilih langsung dari tombol "Daftar".');
      }
      return;
    }

    const emp = matchedEmployee;

    // Requirement: Perangkat masing-masing pegawai terkunci saat melakukan login pertama kali
    if (!emp.boundDeviceId) {
      // 1. FIRST LOGIN: Automatically bind & lock current device to this officer!
      const boundEmp: Employee = {
        ...emp,
        boundDeviceId: currentDevice.deviceId,
        boundDeviceName: currentDevice.deviceName,
        boundAt: new Date().toISOString(),
      };

      if (onUpdateEmployee) {
        onUpdateEmployee(boundEmp);
      }

      onLoginAsEmployee(boundEmp, true);
    } else if (emp.boundDeviceId !== currentDevice.deviceId) {
      // 2. NOT MATCHING: Block login strictly!
      setDeviceMismatchError({
        employee: emp,
        boundDeviceId: emp.boundDeviceId,
        boundDeviceName: emp.boundDeviceName || "Perangkat Dinas Terdaftar",
        currentDeviceId: currentDevice.deviceId,
        currentDeviceName: currentDevice.deviceName
      });

      // Dispatch security violation log & notification to Command
      const currentTimeStr = new Date().toLocaleTimeString('id-ID');
      if (onAddSecurityLog) {
        onAddSecurityLog({
          id: `SEC-REJECT-LOGIN-${Date.now()}`,
          timestamp: `Hari Ini, ${currentTimeStr} WIB`,
          employeeId: emp.id,
          employeeName: emp.name,
          eventType: 'device_mismatch',
          details: `AKSES DITOLAK: Upaya login personel ${emp.name} (NIP: ${emp.nip}) dari perangkat tidak sah [${currentDevice.deviceName} / ${currentDevice.deviceId}]. Perangkat resmi terdaftar: [${emp.boundDeviceId}].`,
          deviceId: currentDevice.deviceId
        });
      }

      if (onAddNotification) {
        onAddNotification({
          id: `NOTIF-DEV-REJECT-${Date.now()}`,
          targetRole: 'admin',
          type: 'security',
          title: `Percobaan Login HP Lain: ${emp.name}`,
          message: `${emp.name} terdeteksi mencoba login menggunakan perangkat tidak terdaftar (${currentDevice.deviceName} - ID: ${currentDevice.deviceId}). Percobaan login berhasil dicegah.`,
          timestamp: `${currentTimeStr} WIB`,
          read: false
        });
      }
    } else {
      // 3. MATCHES: Valid login
      onLoginAsEmployee(emp, false);
    }
  };

  // Handler for legitimate device re-binding by Admin with PIN
  const handleAdminVerifyAndRebind = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminUnlockError('');

    if (!deviceMismatchError) return;

    const cleanPin = adminUnlockPin.trim();
    // Authorizing admin can be any of the 5 official admins with matching PIN, or fallback configuredAdminPin
    const authorizingAdmin = availableAdmins.find(a => a.pin === cleanPin) || (cleanPin === configuredAdminPin ? availableAdmins[0] : null);

    if (authorizingAdmin) {
      const targetEmp = deviceMismatchError.employee;
      
      // Reset & immediately bind the current device as the new official device
      const reboundEmp: Employee = {
        ...targetEmp,
        boundDeviceId: currentDevice.deviceId,
        boundDeviceName: currentDevice.deviceName,
        boundAt: new Date().toISOString(),
      };

      if (onUpdateEmployee) {
        onUpdateEmployee(reboundEmp);
      }

      setInputName(targetEmp.name);
      setInputNip(targetEmp.nip);

      const currentTimeStr = new Date().toLocaleTimeString('id-ID');
      if (onAddSecurityLog) {
        onAddSecurityLog({
          id: `SEC-REBIND-${Date.now()}`,
          timestamp: `Hari Ini, ${currentTimeStr} WIB`,
          employeeId: targetEmp.id,
          employeeName: targetEmp.name,
          eventType: 'device_reset',
          details: `OTORISASI ${authorizingAdmin.name.toUpperCase()}: Kunci perangkat personel ${targetEmp.name} diperbarui ke HP baru [${currentDevice.deviceName} / ${currentDevice.deviceId}] melalui verifikasi PIN mandiri.`,
          deviceId: currentDevice.deviceId
        });
      }

      if (onAddNotification) {
        onAddNotification({
          id: `NOTIF-REBIND-${Date.now()}`,
          targetRole: 'all',
          targetEmployeeId: targetEmp.id,
          type: 'success',
          title: `Pengikatan HP Baru Disetujui (${authorizingAdmin.name.split(' (')[0]})`,
          message: `Perangkat baru ${currentDevice.deviceName} (${currentDevice.deviceId}) telah resmi dikunci untuk personel ${targetEmp.name}.`,
          timestamp: `${currentTimeStr} WIB`,
          read: false
        });
      }

      setShowAdminUnlockModal(false);
      setAdminUnlockPin('');
      setDeviceMismatchError(null);
      setUnlockSuccessMsg(`Perangkat baru berhasil diotorisasi oleh ${authorizingAdmin.name.split(' (')[0]} dan dikunci ke ${targetEmp.name}! Mengalihkan ke portal presensi...`);

      setTimeout(() => {
        onLoginAsEmployee(reboundEmp, false);
      }, 1200);

    } else {
      setAdminUnlockError('PIN Admin/Danru tidak sesuai! Otorisasi reset perangkat ditolak.');
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = adminPinInput.trim();
    if (!selectedAdmin) return;

    // Check against this specific admin's PIN or configured PIN
    if (cleanInput === selectedAdmin.pin || (selectedAdmin.role === 'komando_pusat' && cleanInput === configuredAdminPin)) {
      setAdminError('');
      // Update last login
      const loggedAdmin: AdminAccount = {
        ...selectedAdmin,
        lastLogin: new Date().toISOString()
      };
      onLoginAsAdmin(loggedAdmin);
    } else {
      setAdminError(`PIN Keamanan untuk ${selectedAdmin.name} tidak cocok. Setiap admin memiliki PIN login mandiri.`);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-y-auto">
      {/* Background Watermark with Uploaded Official Satpol PP Emblem */}
      <SatpolPPWatermarkBackground theme="dark" opacity="opacity-25 sm:opacity-30" size="xl" />

      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md my-auto">
        
        {/* Satpol PP Crest Branding */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 p-1 border border-amber-500/30 shadow-xl flex items-center justify-center mb-2.5">
            <SatpolPPLogo className="w-full h-full rounded-xl object-contain drop-shadow" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            SI-PRAJA POL PP
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sistem Informasi Presensi Digital Satpol PP (150 Personel)
          </p>
        </div>

        {/* Tampilan Header Khusus Presensi Pegawai */}
        {activeTab === 'pegawai' && (
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                Portal Presensi Pegawai
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
              Khusus Personel Lapangan
            </span>
          </div>
        )}

        {/* Tampilan Header Khusus Admin Kedinasan */}
        {activeTab === 'admin' && (
          <div className="space-y-3 pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pegawai');
                  setAdminError('');
                  setShowRecoveryModal(false);
                }}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Kembali ke Presensi Pegawai</span>
              </button>

              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Akses Terbatas
              </span>
            </div>

            <div className="text-left bg-slate-950/90 p-3 rounded-xl border border-amber-500/20 shadow-inner">
              <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                Portal Login Pimpinan & Komando
              </h2>
              <p className="text-[10.5px] text-slate-400 mt-0.5 leading-relaxed">
                Akses khusus Kasatpol PP, Provost, dan Komandan Regu Operasional.
              </p>
            </div>
          </div>
        )}

        {/* Tab 1: Pegawai Login */}
        {activeTab === 'pegawai' && (
          <form onSubmit={handleEmployeeLoginSubmit} className="space-y-4">
            
            {/* Input 1: Nama Lengkap Pegawai */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  Nama Lengkap Pegawai
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Sesuai Data Personel</span>
              </label>

              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ketik nama personel atau NIP..."
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value);
                    setEmployeeError('');
                    setIsNameSuggestionsOpen(true);
                  }}
                  onFocus={() => setIsNameSuggestionsOpen(true)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-medium"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  {inputName && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputName('');
                        setInputNip('');
                        setEmployeeError('');
                      }}
                      className="text-slate-400 hover:text-white p-1 text-xs"
                      title="Bersihkan input"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNameSuggestionsOpen(!isNameSuggestionsOpen)}
                    className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/30 transition-colors flex items-center gap-1"
                    title="Buka daftar seluruh personel terdaftar"
                  >
                    <span>Daftar</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isNameSuggestionsOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Suggestions Dropdown for easy autofill without memorizing 18 digits NIP */}
              {isNameSuggestionsOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 divide-y divide-slate-800/80 scrollbar-thin">
                  <div className="px-3.5 py-2 text-[10.5px] text-amber-400 font-bold bg-slate-950 flex justify-between items-center sticky top-0 z-10 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {inputName.trim()
                        ? `Ditemukan ${nameSuggestions.length} Personel Cocok`
                        : `Daftar Semua Personel (${employees.length} Pegawai)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNameSuggestionsOpen(false)}
                      className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      Tutup ✕
                    </button>
                  </div>
                  {nameSuggestions.length === 0 ? (
                    <div className="px-3.5 py-4 text-xs text-slate-400 text-center">
                      {employees.length === 0 ? (
                        <>
                          <p className="font-semibold text-amber-400">Sinkronisasi Database Cloud...</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Sedang memuat data personel. Mohon tunggu sejenak atau periksa koneksi data HP Anda.</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-300">Tidak ada personel yang cocok dengan "{inputName}"</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Pastikan ejaan nama atau digit NIP sudah benar.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    nameSuggestions.map((emp, idx) => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setInputName(emp.name);
                          setInputNip(emp.nip);
                          setIsNameSuggestionsOpen(false);
                          setEmployeeError('');
                        }}
                        className="px-3 py-2.5 hover:bg-slate-800/90 cursor-pointer text-xs transition-colors flex justify-between items-center group"
                      >
                        <div className="truncate pr-2 flex items-center gap-2.5">
                          <span className="text-[10px] font-mono font-bold text-amber-500/80 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-white group-hover:text-amber-300 transition-colors block truncate">
                              {emp.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">
                              NIP: {emp.nip} · <strong className="text-amber-400/90">{emp.regu}</strong> · {emp.role}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 font-bold group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                          Pilih & Isi NIP
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Input 2: NIP (Nomor Induk Pegawai) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  NIP (Nomor Induk Pegawai)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">18 Digit Angka</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 19880415 201001 1 002"
                value={inputNip}
                onChange={(e) => {
                  setInputNip(e.target.value);
                  setEmployeeError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono tracking-wide"
              />
            </div>

            {/* Error Message */}
            {employeeError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed text-[11px]">{employeeError}</span>
              </div>
            )}

            {/* Device Info Badge */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10.5px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                Perangkat Login:
              </span>
              <span className="font-mono text-[10px] text-amber-300 truncate max-w-[170px]" title={currentDevice.deviceId}>
                {currentDevice.deviceName}
              </span>
            </div>

            {/* Success message on re-binding */}
            {unlockSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Otorisasi Berhasil</span>
                </div>
                <p className="text-[11px] text-emerald-100">{unlockSuccessMsg}</p>
              </div>
            )}

            {/* Device Mismatch Error Card */}
            {deviceMismatchError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs space-y-3 animate-in fade-in shadow-xl">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Akses Ditolak: Perangkat Tidak Terdaftar</span>
                </div>
                
                <p className="text-[11px] leading-relaxed text-rose-100/90">
                  Akun personel <strong>{deviceMismatchError.employee.name}</strong> ({deviceMismatchError.employee.regu}) telah terkunci secara permanen pada perangkat dinas terdaftar:
                </p>

                <div className="bg-slate-950/90 p-2.5 rounded-xl font-mono text-[10px] text-amber-300 border border-rose-900/60 space-y-1">
                  <div>
                    <span className="text-slate-400">ID Resmi Terdaftar:</span> {deviceMismatchError.boundDeviceId}
                  </div>
                  <div>
                    <span className="text-slate-400">Model HP Terdaftar:</span> {deviceMismatchError.boundDeviceName}
                  </div>
                  <div className="pt-1 border-t border-slate-800 text-rose-300">
                    <span className="text-slate-400">HP Anda Saat Ini:</span> {currentDevice.deviceName} ({currentDevice.deviceId})
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10.5px] text-slate-300 leading-relaxed">
                  <span className="text-amber-400 font-semibold block mb-0.5">Aturan Kedisiplinan Satpol PP:</span>
                  Setiap personel hanya dapat melakukan presensi melalui <strong>1 perangkat HP resmi</strong>. Masuk menggunakan HP lain diblokir sistem untuk mencegah titip absen.
                </div>

                {/* Legitimate Provost / Admin authorization */}
                <div className="pt-1 border-t border-rose-900/50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminUnlockModal(true);
                      setAdminUnlockPin('');
                      setAdminUnlockError('');
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 rounded-xl text-[11px] font-semibold border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ganti HP Dinas? Buka Kunci dengan PIN Komando</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Masuk ke Portal Absensi
            </button>

            {/* Akses Khusus Admin & Pimpinan (Discreet Gate / Anti-Penyusupan) */}
            <div className="pt-3.5 mt-2 border-t border-slate-800/80 flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setAdminError('');
                  setShowRecoveryModal(false);
                }}
                className="group text-[11px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1.5 py-1 px-3 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-slate-800 cursor-pointer"
                title="Akses khusus login pimpinan dan komandan regu"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                <span>Akses Khusus Pejabat & Admin Komando</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Admin Login (1 Komando Pusat + 4 Admin Danru) */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            
            {/* Pemilihan Akun Admin (1 Komando + 4 Danru) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  Pilih Akun Admin Kedinasan
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  5 Akun Mandiri
                </span>
              </label>

              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {availableAdmins.map((acc) => {
                  const isSelected = acc.id === selectedAdminId;
                  const isKomando = acc.role === 'komando_pusat';

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAdminId(acc.id);
                        setAdminPinInput('');
                        setAdminError('');
                      }}
                      className={`text-left p-2.5 rounded-xl transition-all border flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500/80 text-white shadow-xs ring-1 ring-amber-500/30'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${
                          isSelected
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isKomando ? 'KP' : acc.role.replace('danru_', 'D')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                              {acc.name.split(' (')[0]}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">
                              @{acc.username}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {isKomando ? 'Komando Pusat · Seluruh Regu' : `Pengawas ${acc.reguScope}`}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500 text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input PIN Mandiri untuk Akun yang Terpilih */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  PIN Mandiri: <span className="text-amber-400 font-semibold">{selectedAdmin?.name.split(' (')[0]}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  @{selectedAdmin?.username}
                </span>
              </label>

              <div className="relative">
                <input
                  type={showAdminPin ? "text" : "password"}
                  placeholder={`Masukkan PIN ${selectedAdmin?.name.split(' (')[0]}...`}
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPin(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                  title={showAdminPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {adminError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-900/70 space-y-1">
                  <p className="text-[11px] text-rose-300 font-medium">{adminError}</p>
                </div>
              )}

              {/* Bantuan Pemulihan PIN Terproteksi (Master Recovery Key) */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryModal(true);
                    setMasterKeyInput('');
                    setRecoveryError('');
                    setRecoverySuccess('');
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>Lupa Password / PIN? Pemulihan Terproteksi</span>
                </button>
                <span className="text-[10px] text-slate-500 font-mono">
                  Akses Terenkripsi
                </span>
              </div>
            </div>

            {/* Info Isolasi Akun & Prinsip Keamanan */}
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[10.5px] text-slate-400 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Keamanan Akun Kedinasan:</strong> Masing-masing admin memiliki login mandiri. Pemulihan akun dilindungi ketat oleh Kode Otoritas Komando Pusat.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Masuk sebagai {selectedAdmin?.name.split(' (')[0]}</span>
            </button>
          </form>
        )}

      </div>

      {/* Admin Unlock Modal for legitimate HP replacement in the field */}
      {showAdminUnlockModal && deviceMismatchError && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <span>Otorisasi Komando / Provost</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminUnlockModal(false);
                  setAdminUnlockError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Perangkat baru ini akan didaftarkan & dikunci secara resmi untuk personel <strong>{deviceMismatchError.employee.name}</strong>.
            </p>

            <form onSubmit={handleAdminVerifyAndRebind} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Masukkan PIN Komando Admin:
                </label>
                <input
                  type="password"
                  placeholder="PIN Admin Komando..."
                  value={adminUnlockPin}
                  onChange={(e) => {
                    setAdminUnlockPin(e.target.value);
                    setAdminUnlockError('');
                  }}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-center font-mono tracking-widest text-sm focus:outline-none focus:border-amber-500"
                />
                {adminUnlockError && (
                  <p className="text-[11px] text-rose-400 mt-1 font-medium">{adminUnlockError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminUnlockModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-md"
                >
                  Buka & Kunci HP Ini
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Recovery Key Verification Modal for Legitimate Admin Password Reset */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>Otorisasi Pemulihan Komando</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRecoveryModal(false);
                  setMasterKeyInput('');
                  setRecoveryError('');
                  setRecoverySuccess('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 leading-relaxed">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Proteksi Akses Khusus Pimpinan
              </span>
              <p className="text-[11px] text-amber-100/90">
                Pemulihan akun admin <strong>{selectedAdmin?.name.split(' (')[0]}</strong> hanya dapat dilakukan dengan <strong>Kode Otoritas Pemulihan Komando (Master Key)</strong> yang dipegang oleh Pimpinan/Kasatpol PP/Provost.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRecoveryError('');
                setRecoverySuccess('');

                if (!masterKeyInput.trim()) {
                  setRecoveryError('Silakan masukkan Kode Otoritas Pemulihan Komando.');
                  return;
                }

                if (onResetAdminPinToDefault && selectedAdmin) {
                  const res = onResetAdminPinToDefault(selectedAdmin.id, masterKeyInput.trim());
                  if (res.success) {
                    setRecoverySuccess(res.message);
                    setAdminPinInput('');
                    setAdminError('');
                  } else {
                    setRecoveryError(res.message);
                  }
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Kode Otoritas Pemulihan Komando:
                </label>
                <input
                  type="password"
                  placeholder="Masukkan Kode Otoritas Master..."
                  value={masterKeyInput}
                  onChange={(e) => {
                    setMasterKeyInput(e.target.value);
                    setRecoveryError('');
                    setRecoverySuccess('');
                  }}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-center font-mono tracking-wider text-xs focus:outline-none focus:border-amber-500"
                />
                
                {recoveryError && (
                  <p className="text-[11px] text-rose-400 mt-2 font-medium leading-relaxed bg-rose-950/60 p-2.5 rounded-lg border border-rose-900/50">
                    {recoveryError}
                  </p>
                )}

                {recoverySuccess && (
                  <div className="text-[11px] text-emerald-300 mt-2 font-medium leading-relaxed bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-900/50 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{recoverySuccess}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryModal(false);
                    setMasterKeyInput('');
                    setRecoveryError('');
                    setRecoverySuccess('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Verifikasi & Pulihkan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Credential note */}
      <div className="mt-6 text-center text-xs text-slate-500">
        Praja Wibawa · Satuan Polisi Pamong Praja
      </div>
    </div>
  );
};
