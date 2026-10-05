import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  X,
  Shield
} from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPin: string;
  onUpdatePin: (newPin: string) => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  currentPin,
  onUpdatePin,
}) => {
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Verify Old PIN
    if (oldPinInput !== currentPin) {
      setErrorMsg('PIN Lama tidak sesuai! Masukkan PIN komando yang benar.');
      return;
    }

    // Validate New PIN
    if (newPinInput.length < 4) {
      setErrorMsg('PIN Baru minimal 4 karakter / angka!');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setErrorMsg('Konfirmasi PIN Baru tidak cocok dengan PIN Baru.');
      return;
    }

    // Success Update
    onUpdatePin(newPinInput);
    setSuccessMsg('PIN Keamanan Admin berhasil diperbarui!');
    setOldPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1500);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan PIN Komando ke PIN bawaan sistem (123456)?')) {
      onUpdatePin('123456');
      setSuccessMsg('PIN Keamanan berhasil di-reset ke default: 123456');
      setOldPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        
        {/* Top Decorative Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Pengaturan PIN Keamanan Admin
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                Otorisasi Akses Komando & Manajemen Satpol PP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4 text-xs overflow-y-auto pr-1">
          
          {/* Current Active Pin Status */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Status PIN Admin:</span>
            </div>
            <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
              Aktif & Terproteksi
            </span>
          </div>

          {/* Old PIN Input */}
          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Masukkan PIN Admin Saat Ini
            </label>
            <div className="relative">
              <input
                type={showPins ? "text" : "password"}
                placeholder="PIN saat ini (Bawaan: 123456)"
                value={oldPinInput}
                onChange={(e) => setOldPinInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-mono tracking-wider focus:outline-none focus:border-amber-500 pr-10 text-base sm:text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New PIN Input */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-[11px]">
                PIN Baru
              </label>
              <input
                type={showPins ? "text" : "password"}
                placeholder="Min. 4 digit"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-mono tracking-wider focus:outline-none focus:border-amber-500 text-base sm:text-xs"
                required
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-[11px]">
                Konfirmasi PIN
              </label>
              <input
                type={showPins ? "text" : "password"}
                placeholder="Ulangi PIN"
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-mono tracking-wider focus:outline-none focus:border-amber-500 text-base sm:text-xs"
                required
              />
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Security Note */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-semibold block mb-0.5 text-amber-800">Penting:</span>
            PIN ini digunakan untuk membuka akses Portal Admin Komando. Jangan berikan PIN ini kepada pegawai non-admin.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Simpan & Terapkan PIN Baru
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="w-full py-2 text-slate-500 hover:text-amber-800 text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke PIN Default (123456)
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
