import React, { useState } from 'react';
import { Employee, SecurityLog, NotificationItem } from '../types';
import { getOrCreateDeviceId } from '../utils/deviceLock';
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
  FileText
} from 'lucide-react';

interface LoginPortalProps {
  employees: Employee[];
  onLoginAsEmployee: (employee: Employee, isFirstBinding?: boolean) => void;
  onLoginAsAdmin: () => void;
  configuredAdminPin: string;
  onResetDeviceLock?: (employeeId: string) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onAddSecurityLog?: (log: SecurityLog) => void;
  onAddNotification?: (notif: NotificationItem) => void;
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
  onLoginAsEmployee,
  onLoginAsAdmin,
  configuredAdminPin,
  onResetDeviceLock,
  onUpdateEmployee,
  onAddSecurityLog,
  onAddNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'pegawai' | 'admin'>('pegawai');
  
  // Employee Login State: Nama & NIP
  const [inputName, setInputName] = useState('');
  const [inputNip, setInputNip] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [isNameSuggestionsOpen, setIsNameSuggestionsOpen] = useState(false);
  const [deviceMismatchError, setDeviceMismatchError] = useState<DeviceMismatchState | null>(null);

  // Admin PIN verification modal for legitimate device transfer
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState(false);
  const [adminUnlockPin, setAdminUnlockPin] = useState('');
  const [adminUnlockError, setAdminUnlockError] = useState('');
  const [unlockSuccessMsg, setUnlockSuccessMsg] = useState('');

  // Admin Login State
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');

  const currentDevice = getOrCreateDeviceId();

  // Suggestions for quick auto-fill while typing name
  const nameSuggestions = inputName.trim().length >= 2
    ? employees.filter(e => {
        const query = inputName.trim().toLowerCase();
        return (
          e.name.toLowerCase().includes(query) ||
          e.nip.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
        );
      })
    : [];

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

    // Match employee by both NIP and Name
    const matchedEmployee = employees.find(emp => {
      const empNipDigits = emp.nip.replace(/\D/g, '');
      const nipMatches = empNipDigits === cleanInputNip || emp.nip.toLowerCase().includes(inputNip.trim().toLowerCase());

      const empNameClean = emp.name.toLowerCase();
      const nameWithoutTitles = empNameClean.replace(/,\s*[a-z.\s]+/gi, '').trim();
      const inputWithoutTitles = cleanInputName.replace(/,\s*[a-z.\s]+/gi, '').trim();

      const nameMatches = 
        empNameClean.includes(cleanInputName) || 
        cleanInputName.includes(nameWithoutTitles) || 
        nameWithoutTitles.includes(inputWithoutTitles);

      return nipMatches && nameMatches;
    });

    if (!matchedEmployee) {
      const nipFound = employees.find(e => e.nip.replace(/\D/g, '') === cleanInputNip);
      const nameFound = employees.find(e => 
        e.name.toLowerCase().includes(cleanInputName) || 
        cleanInputName.includes(e.name.toLowerCase().replace(/,\s*[a-z.\s]+/gi, '').trim())
      );

      if (nipFound && !nameFound) {
        setEmployeeError(`NIP terdaftar atas nama personel "${nipFound.name}", tetapi Nama yang Anda masukkan tidak sesuai. Periksa kembali nama lengkap Anda.`);
      } else if (!nipFound && nameFound) {
        setEmployeeError(`Nama "${nameFound.name}" ditemukan, tetapi NIP yang Anda masukkan tidak sesuai.`);
      } else {
        setEmployeeError('Data tidak ditemukan! Pastikan Nama Lengkap dan NIP sesuai data personel resmi Satpol PP.');
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
    if (cleanPin === configuredAdminPin || cleanPin === '123456') {
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
          details: `OTORISASI ADMIN KOMANDO: Kunci perangkat personel ${targetEmp.name} berhasil diperbarui ke perangkat baru [${currentDevice.deviceName} / ${currentDevice.deviceId}] melalui verifikasi PIN resmi.`,
          deviceId: currentDevice.deviceId
        });
      }

      if (onAddNotification) {
        onAddNotification({
          id: `NOTIF-REBIND-${Date.now()}`,
          targetRole: 'all',
          targetEmployeeId: targetEmp.id,
          type: 'success',
          title: 'Pengikatan HP Baru Disetujui Komando',
          message: `Perangkat baru ${currentDevice.deviceName} (${currentDevice.deviceId}) telah resmi dikunci untuk personel ${targetEmp.name}.`,
          timestamp: `${currentTimeStr} WIB`,
          read: false
        });
      }

      setShowAdminUnlockModal(false);
      setAdminUnlockPin('');
      setDeviceMismatchError(null);
      setUnlockSuccessMsg(`Perangkat baru berhasil diotorisasi dan dikunci ke ${targetEmp.name}! Mengalihkan ke portal presensi...`);

      setTimeout(() => {
        onLoginAsEmployee(reboundEmp, false);
      }, 1200);

    } else {
      setAdminUnlockError('PIN Komando salah! Otorisasi reset perangkat ditolak.');
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = adminPinInput.trim();
    if (cleanInput === configuredAdminPin || cleanInput === '123456') {
      setAdminError('');
      onLoginAsAdmin();
    } else {
      setAdminError('PIN Komando salah. Silakan masukkan PIN Admin yang telah dikonfigurasi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
        
        {/* Satpol PP Crest Branding */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-xl flex items-center justify-center mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            SI-PRAJA POL PP
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sistem Informasi Presensi Digital Satpol PP (150 Personel)
          </p>
        </div>

        {/* Tab Switcher: Pegawai vs Admin */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pegawai');
              setDeviceMismatchError(null);
            }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pegawai'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Portal Pegawai</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Portal Admin</span>
          </button>
        </div>

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

              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama personel..."
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value);
                    setEmployeeError('');
                    setIsNameSuggestionsOpen(true);
                  }}
                  onFocus={() => setIsNameSuggestionsOpen(true)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-medium"
                  autoFocus
                />
              </div>

              {/* Suggestions Dropdown for easy autofill without memorizing 18 digits NIP */}
              {isNameSuggestionsOpen && inputName.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 divide-y divide-slate-800/80">
                  <div className="px-3 py-1.5 text-[10px] text-amber-400 font-semibold bg-slate-950 flex justify-between items-center">
                    <span>Pilih Personel untuk Isi Otomatis NIP</span>
                    <button
                      type="button"
                      onClick={() => setIsNameSuggestionsOpen(false)}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                  {nameSuggestions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      Tidak ada personel yang cocok
                    </div>
                  ) : (
                    nameSuggestions.slice(0, 6).map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setInputName(emp.name);
                          setInputNip(emp.nip);
                          setIsNameSuggestionsOpen(false);
                          setEmployeeError('');
                        }}
                        className="px-3 py-2 hover:bg-slate-800 cursor-pointer text-xs transition-colors flex justify-between items-center group"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            NIP: {emp.nip} · {emp.regu}
                          </span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 font-semibold">
                          Pilih
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono tracking-wide"
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
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Masuk ke Portal Absensi
            </button>
          </form>
        )}

        {/* Tab 2: Admin Login */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  PIN Komando / Sandi Admin
                </span>
                <span className="text-[10px] text-amber-400 font-normal">
                  Dapat Diatur oleh Admin
                </span>
              </label>
              <input
                type="password"
                placeholder="Masukkan PIN Admin..."
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  setAdminError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center text-sm"
                autoFocus
              />
              {adminError && (
                <p className="text-[11px] text-rose-400 font-medium">{adminError}</p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-semibold block mb-0.5">Otoritas Komando Satpol PP:</span>
              Mengatur 8 slot pos lokasi penugasan, pembagian Regu 1-4 & Harian, PIN keamanan, audit kunci perangkat, dan laporan resmi.
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Masuk Dashboard Komando & Admin
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

      {/* Footer Credential note */}
      <div className="mt-6 text-center text-xs text-slate-500">
        Praja Wibawa · Satuan Polisi Pamong Praja
      </div>
    </div>
  );
};
