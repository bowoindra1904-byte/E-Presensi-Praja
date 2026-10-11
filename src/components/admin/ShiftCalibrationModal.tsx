import React, { useState, useMemo } from 'react';
import { ReguType, AdminAccount, Employee, AttendanceRecord, MonthlyShiftCalibration } from '../../types';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  Shield, 
  Clock, 
  Calendar, 
  Sparkles, 
  Info, 
  Check, 
  AlertCircle,
  Save,
  Users
} from 'lucide-react';
import { 
  getAllReguMonthlyShiftCalibrations, 
  saveStoredShiftCalibration, 
  removeStoredShiftCalibration,
  detectReguMonthlyShiftCalibration
} from '../../utils/smartAttendanceCalculator';

interface ShiftCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string; // YYYY-MM
  onMonthChange?: (newMonth: string) => void;
  currentAdmin?: AdminAccount;
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  onCalibrationsUpdated?: () => void;
}

export const ShiftCalibrationModal: React.FC<ShiftCalibrationModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  onMonthChange,
  currentAdmin,
  employees,
  attendanceRecords,
  onCalibrationsUpdated
}) => {
  if (!isOpen) return null;

  const isDanru = Boolean(currentAdmin && currentAdmin.role !== 'komando_pusat' && currentAdmin.reguScope !== 'all');
  const adminRegu = isDanru ? (currentAdmin?.reguScope as ReguType) : null;

  // Local state for month and calibrations
  const [activeMonth, setActiveMonth] = useState<string>(selectedMonth);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Editable drafts for each regu: { [regu]: { anchorDate: string, anchorCycle: 'Pagi' | 'Malam' } }
  const [drafts, setDrafts] = useState<Record<string, { anchorDate: string; anchorCycle: 'Pagi' | 'Malam' }>>({});

  // Compute live calibrations from database / storage
  const calibrations = useMemo(() => {
    return getAllReguMonthlyShiftCalibrations(activeMonth, attendanceRecords, employees);
  }, [activeMonth, attendanceRecords, employees]);

  // Available regus to display
  const reguList: ReguType[] = ['Regu 1', 'Regu 2', 'Regu 3', 'Regu 4'];

  const availableMonths = [
    { value: '2026-10', label: 'Oktober 2026' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'Agustus 2026' },
    { value: '2026-07', label: 'Juli 2026' },
    { value: '2026-06', label: 'Juni 2026' },
  ];

  // Helper to get or init draft value
  const getDraft = (regu: ReguType) => {
    if (drafts[regu]) return drafts[regu];
    const cal = calibrations[regu];
    return {
      anchorDate: cal?.anchorDate || `${activeMonth}-01`,
      anchorCycle: cal?.anchorCycle || (regu === 'Regu 2' ? 'Malam' : 'Pagi')
    };
  };

  const handleDraftChange = (regu: ReguType, field: 'anchorDate' | 'anchorCycle', val: string) => {
    setDrafts(prev => ({
      ...prev,
      [regu]: {
        ...getDraft(regu),
        [field]: val
      }
    }));
  };

  const handleSaveCalibration = (regu: ReguType) => {
    const draft = getDraft(regu);
    const cal: MonthlyShiftCalibration = {
      month: activeMonth,
      regu,
      anchorDate: draft.anchorDate,
      anchorCycle: draft.anchorCycle,
      isAutoDetected: false,
      firstAttendanceDate: draft.anchorDate,
      firstShiftCycle: draft.anchorCycle,
      updatedAt: new Date().toISOString(),
      updatedBy: currentAdmin?.name || 'Admin',
      notes: `Penyesuaian manual oleh ${currentAdmin?.name || 'Admin'} (Mulai ${draft.anchorDate} - Shift ${draft.anchorCycle})`
    };

    saveStoredShiftCalibration(cal);
    setSuccessMsg(`Jadwal rotasi ${regu} periode ${activeMonth} berhasil disimpan!`);
    if (onCalibrationsUpdated) onCalibrationsUpdated();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetToAuto = (regu: ReguType) => {
    removeStoredShiftCalibration(activeMonth, regu);
    // Remove local draft
    setDrafts(prev => {
      const next = { ...prev };
      delete next[regu];
      return next;
    });

    const fresh = detectReguMonthlyShiftCalibration(regu, activeMonth, attendanceRecords, employees);
    setSuccessMsg(`Rotasi ${regu} dikembalikan ke kalkulasi otomatis dari presensi perdana.`);
    if (onCalibrationsUpdated) onCalibrationsUpdated();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetAllToAuto = () => {
    reguList.forEach(regu => {
      removeStoredShiftCalibration(activeMonth, regu);
    });
    setDrafts({});
    setSuccessMsg(`Seluruh regu dikembalikan ke deteksi otomatis presensi awal bulan.`);
    if (onCalibrationsUpdated) onCalibrationsUpdated();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 font-mono">
                  Sistem Pintar
                </span>
                <span className="text-xs text-amber-300 font-semibold">
                  Penyesuaian Rotasi Awal Bulan
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-0.5 tracking-tight">
                Kalkulasi Pintar Shift Tiap Regu
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Karena shift tidak memiliki jadwal kalender kaku baku, sistem secara cerdas menyesuaikan siklus 4-hari tiap regu dari absensi pertama di awal tiap bulan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Notification Alert */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Month Selector & Re-sync All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Periode Bulan Penugasan
                </label>
                <select
                  value={activeMonth}
                  onChange={(e) => {
                    setActiveMonth(e.target.value);
                    if (onMonthChange) onMonthChange(e.target.value);
                  }}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 mt-0.5"
                >
                  {availableMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleResetAllToAuto}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs self-start sm:self-center"
              title="Kembalikan semua regu ke deteksi otomatis presensi awal bulan"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Sinkronkan Ulang Semua Regu</span>
            </button>
          </div>

          {/* Operational Principle Info Box */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed text-[11px]">
              <p className="font-bold text-amber-900">
                Prinsip Kalkulasi Pintar Rotasi 4-Hari (Satpol PP):
              </p>
              <p>
                <strong>Siklus:</strong> Shift Pagi (08.00-20.00 WIB) ➔ Shift Malam (20.00-08.00 WIB) ➔ Libur (Lepas Piket) ➔ Libur (Cadangan).
              </p>
              <p className="text-amber-900/90">
                Hari sebelum tanggal absen pertama di awal bulan secara otomatis diakui sebagai <strong>Libur Shift (Menunggu Giliran)</strong> dan <strong>tidak dikenai alpa/TK</strong>. Setelah absen pertama tercatat, siklus berputar secara presisi.
              </p>
            </div>
          </div>

          {/* Cards for each Regu */}
          <div className="space-y-4">
            {reguList.map(regu => {
              const cal = calibrations[regu];
              const draft = getDraft(regu);
              const isUserRegu = isDanru && adminRegu === regu;
              const canEdit = !isDanru || isUserRegu;

              return (
                <div 
                  key={regu}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isUserRegu 
                      ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/30' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs">
                        {regu.replace('Regu ', 'R')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">{regu}</span>
                          {isUserRegu && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                              Wilayah Anda
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {cal.notes || 'Rotasi shift operasional dinas'}
                        </p>
                      </div>
                    </div>

                    {/* Detection Badge */}
                    <div className="shrink-0">
                      {cal.isAutoDetected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Otomatis dari Presensi Perdana
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Penyesuaian Manual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3.5">
                    {/* Anchor Date */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Tanggal Absen Perdana Awal Bulan:
                      </label>
                      <input
                        type="date"
                        value={draft.anchorDate}
                        disabled={!canEdit}
                        min={`${activeMonth}-01`}
                        max={`${activeMonth}-31`}
                        onChange={(e) => handleDraftChange(regu, 'anchorDate', e.target.value)}
                        className={`w-full text-xs rounded-xl px-3 py-2 border transition-colors ${
                          canEdit 
                            ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500' 
                            : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Hari sebelum tanggal ini otomatis diakui Libur Shift.
                      </span>
                    </div>

                    {/* Anchor Shift */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Shift Perdana Saat Absen Pertama:
                      </label>
                      <select
                        value={draft.anchorCycle}
                        disabled={!canEdit}
                        onChange={(e) => handleDraftChange(regu, 'anchorCycle', e.target.value as 'Pagi' | 'Malam')}
                        className={`w-full text-xs rounded-xl px-3 py-2 border transition-colors ${
                          canEdit 
                            ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500' 
                            : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <option value="Pagi">Shift Pagi (08.00 - 20.00 WIB)</option>
                        <option value="Malam">Shift Malam (20.00 - 08.00 WIB)</option>
                      </select>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Menjadi titik awal putaran 4-hari (Pagi-Malam-Libur-Libur).
                      </span>
                    </div>
                  </div>

                  {/* Detected personnel info if auto-detected */}
                  {cal.detectedEmployeeName && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Absen pertama tercatat oleh <strong>{cal.detectedEmployeeName}</strong>
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 text-[10px]">
                        {cal.anchorDate} · {cal.detectedCheckInTime || '-'} WIB ({cal.anchorCycle})
                      </span>
                    </div>
                  )}

                  {/* Actions for this regu */}
                  {canEdit && (
                    <div className="flex items-center justify-end gap-2 mt-3.5 pt-3 border-t border-slate-100">
                      {!cal.isAutoDetected && (
                        <button
                          type="button"
                          onClick={() => handleResetToAuto(regu)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          Reset ke Otomatis
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveCalibration(regu)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-amber-600 transition-colors shadow-2xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan {regu}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Perubahan langsung mengkalkulasi ulang matriks laporan bulanan & persentase hadir secara real-time.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
