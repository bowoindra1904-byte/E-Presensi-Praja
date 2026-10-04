import React, { useState } from 'react';
import { X, Clock, Calendar, Check, RotateCcw } from 'lucide-react';
import { DAY_NAMES } from '../utils/scheduleRules';

interface TimeSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSimulatedTime: Date | null;
  onApplySimulatedTime: (date: Date | null) => void;
}

export const TimeSimulatorModal: React.FC<TimeSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentSimulatedTime,
  onApplySimulatedTime,
}) => {
  if (!isOpen) return null;

  const baseDate = currentSimulatedTime || new Date();
  
  const [selectedDayIndex, setSelectedDayIndex] = useState(baseDate.getDay());
  const [hours, setHours] = useState(baseDate.getHours());
  const [minutes, setMinutes] = useState(baseDate.getMinutes());

  // Quick preset test scenarios for easy evaluation
  const presets = [
    {
      label: "07:15 WIB (Sebelum Buka Shift Pagi)",
      desc: "Menolak absen masuk (belum 30 mnt)",
      hours: 7,
      minutes: 15,
      day: 1 // Senin
    },
    {
      label: "07:45 WIB (Masuk Shift Pagi - Tepat Waktu)",
      desc: "Bisa absen masuk, tepat waktu",
      hours: 7,
      minutes: 45,
      day: 1
    },
    {
      label: "08:20 WIB (Masuk Shift Pagi - Terlambat)",
      desc: "Bisa absen masuk, tercatat terlambat",
      hours: 8,
      minutes: 20,
      day: 1
    },
    {
      label: "15:45 WIB (Harian Sebelum Pulang)",
      desc: "Menolak absen pulang (< 16.00 WIB)",
      hours: 15,
      minutes: 45,
      day: 2 // Selasa
    },
    {
      label: "16:05 WIB (Harian Jam Pulang Sah)",
      desc: "Bisa absen pulang (>= 16.00 WIB)",
      hours: 16,
      minutes: 5,
      day: 2
    },
    {
      label: "Jumat 06:45 WIB (Masuk Jumat Tepat Waktu)",
      desc: "Aturan khusus Jumat masuk 07.00 WIB",
      hours: 6,
      minutes: 45,
      day: 5 // Jumat
    },
    {
      label: "Jumat 16:35 WIB (Pulang Jumat Sah)",
      desc: "Aturan khusus Jumat pulang 16.30 WIB",
      hours: 16,
      minutes: 35,
      day: 5
    },
    {
      label: "19:40 WIB (Masuk Shift Malam)",
      desc: "Buka 30 menit sebelum pk 20.00 WIB",
      hours: 19,
      minutes: 40,
      day: 3
    },
    {
      label: "20:05 WIB (Pulang Shift Pagi)",
      desc: "Tepat pada jam pulang 20.00 WIB",
      hours: 20,
      minutes: 5,
      day: 3
    }
  ];

  const handleApply = () => {
    const d = new Date();
    // adjust day of week
    const currentDay = d.getDay();
    const dayDiff = selectedDayIndex - currentDay;
    d.setDate(d.getDate() + dayDiff);
    d.setHours(hours, minutes, 0, 0);
    onApplySimulatedTime(d);
    onClose();
  };

  const handleResetRealTime = () => {
    onApplySimulatedTime(null);
    onClose();
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setHours(preset.hours);
    setMinutes(preset.minutes);
    setSelectedDayIndex(preset.day);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">Simulasi Waktu & Pengujian Jadwal</h3>
              <p className="text-[10.5px] sm:text-xs text-slate-400 truncate">
                Uji validasi aturan 30 menit sebelum masuk dan jam pulang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          
          {/* Day & Time Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Pilih Hari
              </label>
              <select
                value={selectedDayIndex}
                onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {DAY_NAMES.map((dName, idx) => (
                  <option key={idx} value={idx}>
                    Hari {dName} {idx === 5 ? "(Aturan Khusus Masuk 07.00 / Pulang 16.30)" : idx === 0 || idx === 6 ? "(Akhir Pekan)" : "(Senin-Kamis)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Pilih Jam & Menit (WIB)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(23, Number(e.target.value))))}
                  className="w-20 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-center text-lg font-mono font-bold focus:outline-none focus:border-amber-500"
                />
                <span className="text-xl font-bold text-slate-400">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="w-20 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-center text-lg font-mono font-bold focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded border border-amber-500/20">
                  WIB
                </span>
              </div>
            </div>
          </div>

          {/* Quick Scenario Buttons */}
          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Skenario Pengujian Siap Pakai:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`text-left p-2.5 rounded-lg border transition-all ${
                    hours === p.hours && minutes === p.minutes && selectedDayIndex === p.day
                      ? 'bg-amber-600/20 border-amber-500 text-white'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold text-amber-400">{p.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleResetRealTime}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Kembalikan ke Waktu Nyata Sekarang
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
            >
              Batal
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Terapkan Waktu Simulasi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
