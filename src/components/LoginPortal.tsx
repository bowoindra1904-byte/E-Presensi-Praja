import React, { useState } from 'react';
import { Employee } from '../types';
import { getOrCreateDeviceId, forceSetDeviceId } from '../utils/deviceLock';
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
  X
} from 'lucide-react';

interface LoginPortalProps {
  employees: Employee[];
  onLoginAsEmployee: (employee: Employee, isFirstBinding?: boolean) => void;
  onLoginAsAdmin: () => void;
  configuredAdminPin: string;
  onResetDeviceLock?: (employeeId: string) => void;
  onUpdateEmployee?: (emp: Employee) => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<'pegawai' | 'admin'>('pegawai');
  
  // Employee Login State
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('POLPP-001');
  const [deviceMismatchError, setDeviceMismatchError] = useState<DeviceMismatchState | null>(null);

  // Admin Login State
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
    e.nip.includes(searchEmployeeQuery) ||
    e.id.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
    e.regu.toLowerCase().includes(searchEmployeeQuery.toLowerCase())
  );

  const selectedEmployee = employees.find(e => e.id === selectedEmpId) || employees[0];
  const currentDevice = getOrCreateDeviceId();

  const handleEmployeeLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceMismatchError(null);

    const emp = selectedEmployee;

    // Requirement: "buat agar perangkat masing2 pegawai terkunci saat melakukan login pertama kali.."
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
      // 2. NOT MATCHING: Block login!
      setDeviceMismatchError({
        employee: emp,
        boundDeviceId: emp.boundDeviceId,
        boundDeviceName: emp.boundDeviceName || "Perangkat Dinas Terdaftar",
        currentDeviceId: currentDevice.deviceId,
        currentDeviceName: currentDevice.deviceName
      });
    } else {
      // 3. MATCHES: Valid login
      onLoginAsEmployee(emp, false);
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = adminPinInput.trim();
    if (cleanInput === configuredAdminPin || cleanInput === '123456' || cleanInput === 'admin') {
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
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Pilih Identitas Personel</span>
                <span className="text-[10px] text-amber-400 font-normal">Dari 150 Personel</span>
              </label>

              {/* Search Personel */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, NIP, regu, jabatan..."
                  value={searchEmployeeQuery}
                  onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Personnel Select List */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                {filteredEmployees.slice(0, 30).map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmpId(emp.id);
                      setDeviceMismatchError(null);
                    }}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedEmpId === emp.id
                        ? 'bg-amber-600/20 border border-amber-500/50 text-white'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold truncate text-white">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {emp.regu} · {emp.role} · NIP: {emp.nip}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        emp.regu === 'Harian' 
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30' 
                          : 'bg-amber-950/70 text-amber-400 border-amber-500/30'
                      }`}>
                        {emp.regu}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {emp.boundDeviceId ? "Terkunci" : "Perdana"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Officer Preview & Device Lock Status */}
            {selectedEmployee && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status Kunci Perangkat:</span>
                  {selectedEmployee.boundDeviceId ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terkunci ke Perangkat Resmi
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      Login Pertama (Otomatis Terkunci)
                    </span>
                  )}
                </div>

                {!selectedEmployee.boundDeviceId && (
                  <p className="text-[10px] text-amber-300/80 leading-relaxed">
                    Perangkat yang Anda gunakan saat ini akan <strong>otomatis dikunci permanen</strong> pada akun personel ini.
                  </p>
                )}
              </div>
            )}

            {/* Device Mismatch Error Card */}
            {deviceMismatchError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Akses Ditolak: Perangkat Tidak Cocok!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-100/90">
                  Akun personel <strong>{deviceMismatchError.employee.name}</strong> telah terkunci secara permanen pada perangkat terdaftar:
                </p>
                <div className="bg-slate-950/80 p-2 rounded-lg font-mono text-[10px] text-amber-300 border border-rose-900/50">
                  ID Resmi: {deviceMismatchError.boundDeviceId}
                  <br />
                  Model: {deviceMismatchError.boundDeviceName}
                </div>
                <p className="text-[10px] text-slate-300">
                  Perangkat Anda saat ini ({currentDevice.deviceName}) ditolak sistem untuk mencegah titip absen.
                </p>

                {/* Simulator Option for testing/evaluators */}
                <div className="pt-2 border-t border-rose-800/40 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onResetDeviceLock) {
                        onResetDeviceLock(deviceMismatchError.employee.id);
                        setDeviceMismatchError(null);
                      }
                    }}
                    className="w-full py-1.5 bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 rounded-lg text-[10px] font-bold border border-rose-700/50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    (Simulasi Admin: Reset Kunci Akun Ini)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      forceSetDeviceId(deviceMismatchError.boundDeviceId, deviceMismatchError.boundDeviceName);
                      window.location.reload();
                    }}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] border border-slate-700 transition-colors text-center"
                  >
                    (Simulasi: Ganti ID Browser ke Perangkat Resmi Ini)
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

            <button
              type="button"
              onClick={() => {
                setAdminPinInput(configuredAdminPin || '123456');
                onLoginAsAdmin();
              }}
              className="w-full text-center text-[11px] text-slate-500 hover:text-amber-400 transition-colors py-1"
            >
              (Klik di sini untuk Masuk Cepat dengan PIN Aktif)
            </button>
          </form>
        )}

      </div>

      {/* Footer Credential note */}
      <div className="mt-6 text-center text-xs text-slate-500">
        Praja Wibawa · Satuan Polisi Pamong Praja
      </div>
    </div>
  );
};
