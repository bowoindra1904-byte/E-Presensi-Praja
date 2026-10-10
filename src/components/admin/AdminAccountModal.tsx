import React, { useState, useEffect } from 'react';
import { AdminAccount } from '../../types';
import { 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Shield,
  User,
  Phone,
  ShieldAlert,
  Users,
  Check,
  AlertTriangle
} from 'lucide-react';

interface AdminAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAdmin: AdminAccount;
  allAdmins: AdminAccount[];
  onUpdateAdminAccount: (updatedAccount: AdminAccount) => void;
}

export const AdminAccountModal: React.FC<AdminAccountModalProps> = ({
  isOpen,
  onClose,
  currentAdmin,
  allAdmins,
  onUpdateAdminAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'my_account' | 'all_admins'>('my_account');
  
  // Form state for current admin's own profile & PIN
  const [nameInput, setNameInput] = useState(currentAdmin.name);
  const [phoneInput, setPhoneInput] = useState(currentAdmin.phone || '');
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Keep form inputs synced if currentAdmin changes
  useEffect(() => {
    if (isOpen) {
      setNameInput(currentAdmin.name);
      setPhoneInput(currentAdmin.phone || '');
      setOldPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentAdmin]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nameInput.trim()) {
      setErrorMsg('Nama Admin / Pejabat tidak boleh kosong!');
      return;
    }

    let finalPin = currentAdmin.pin;

    // If user attempts to change PIN
    if (newPinInput.trim() || oldPinInput.trim() || confirmPinInput.trim()) {
      if (oldPinInput !== currentAdmin.pin) {
        setErrorMsg('PIN Lama tidak sesuai! Masukkan PIN akun Anda saat ini dengan benar.');
        return;
      }

      if (newPinInput.length < 4) {
        setErrorMsg('PIN Baru minimal 4 karakter / angka!');
        return;
      }

      if (newPinInput !== confirmPinInput) {
        setErrorMsg('Konfirmasi PIN Baru tidak cocok dengan PIN Baru.');
        return;
      }

      finalPin = newPinInput.trim();
    }

    const updated: AdminAccount = {
      ...currentAdmin,
      name: nameInput.trim(),
      phone: phoneInput.trim(),
      pin: finalPin,
      updatedAt: new Date().toISOString()
    };

    onUpdateAdminAccount(updated);

    setSuccessMsg('Data profil dan login akun Anda berhasil diperbarui!');
    setOldPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');

    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
                <span>Manajemen Login & Akun Admin</span>
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                1 Admin Komando Pusat & 4 Admin Danru Satpol PP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('my_account')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'my_account'
                ? 'bg-white text-amber-950 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>Akun Saya ({currentAdmin.username})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('all_admins')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'all_admins'
                ? 'bg-white text-amber-950 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Daftar 5 Admin Kedinasan</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* TAB 1: KELOLA AKUN SAYA */}
          {activeTab === 'my_account' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Badge Kartu Akun Aktif */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-xs">
                  {currentAdmin.role === 'komando_pusat' ? 'KP' : currentAdmin.role.replace('danru_', 'D')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-950 truncate">
                      {currentAdmin.name}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.2 rounded bg-amber-200 text-amber-900 font-bold shrink-0">
                      {currentAdmin.role === 'komando_pusat' ? 'KOMANDO PUSAT' : `DANRU ${currentAdmin.reguScope?.toUpperCase()}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    Username: <span className="font-mono font-bold">@{currentAdmin.username}</span> · Hak Akses: {currentAdmin.reguScope === 'all' ? 'Seluruh Personel & Sistem' : `Khusus ${currentAdmin.reguScope}`}
                  </p>
                </div>
              </div>

              {/* Status Alert Messages */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Data Profil Admin */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Admin / Jabatan Resmi
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      placeholder="Contoh: Admin Danru Regu 1 (Operasional)"
                      required
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      placeholder="Contoh: 0812-7000-0001"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Digunakan untuk koordinasi darurat dan pemulihan akun internal.
                  </span>
                </div>
              </div>

              {/* Seksi Ubah PIN Login Mandiri */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">Ubah PIN Login Akun Saya</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPins(!showPins)}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPins ? 'Sembunyikan' : 'Lihat PIN'}</span>
                  </button>
                </div>
                
                <p className="text-[11px] text-slate-500">
                  Biarkan kosong jika tidak ingin mengganti PIN login Anda saat ini.
                </p>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      PIN Saat Ini (Verifikasi)
                    </label>
                    <input
                      type={showPins ? 'text' : 'password'}
                      value={oldPinInput}
                      onChange={(e) => setOldPinInput(e.target.value)}
                      placeholder="Masukkan PIN lama akun Anda..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono tracking-wider focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        PIN Baru
                      </label>
                      <input
                        type={showPins ? 'text' : 'password'}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="Minimal 4 digit..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono tracking-wider focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Ulangi PIN Baru
                      </label>
                      <input
                        type={showPins ? 'text' : 'password'}
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        placeholder="Ulangi PIN baru..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono tracking-wider focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Keamanan Notice */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Otoritas Mandiri Terjamin:</strong> Perubahan profil dan PIN ini hanya berlaku untuk akun <strong>{currentAdmin.name}</strong>. Anda tidak dapat merubah data admin lain, dan admin lain tidak dapat merubah data Anda.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Akun Saya</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: DAFTAR SELURUH 5 ADMIN (ISOLASI KEAMANAN MANDIRI) */}
          {activeTab === 'all_admins' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs leading-relaxed space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Prinsip Keamanan Mandiri (5 Admin Dinas Satpol PP)</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Aplikasi dikelola bersama oleh <strong>1 Admin Komando Pusat</strong> dan <strong>4 Admin Komandan Regu (Danru)</strong>. Demi kerahasiaan dan integritas operasional, <strong>setiap admin hanya dapat mengelola akunnya sendiri</strong> dan tidak diizinkan mengubah PIN atau data admin lainnya.
                </p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {allAdmins.map((admin) => {
                  const isCurrent = admin.id === currentAdmin.id;

                  return (
                    <div 
                      key={admin.id}
                      className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isCurrent
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {admin.role === 'komando_pusat' ? 'KP' : admin.role.replace('danru_', 'D')}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {admin.name}
                            </h4>
                            {isCurrent && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Akun Anda Aktif
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono font-medium">@{admin.username}</span>
                            <span>•</span>
                            <span>{admin.role === 'komando_pusat' ? 'Seluruh Personel & Sistem' : `Regu: ${admin.reguScope}`}</span>
                            {admin.phone && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{admin.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status / Aksi */}
                      <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                        {isCurrent ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('my_account')}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Edit Akun Saya</span>
                          </button>
                        ) : (
                          <div 
                            className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-semibold text-slate-500 flex items-center gap-1.5"
                            title="Terkunci mandiri: Anda tidak dapat mengubah data akun admin lain"
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Terkunci Mandiri</span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Jika ada Danru yang lupa PIN loginnya, pemulihan dilakukan secara tatap muka dengan Admin Komando Pusat melalui verifikasi langsung di markas.
                </span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
