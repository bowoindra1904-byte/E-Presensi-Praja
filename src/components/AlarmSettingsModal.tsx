import React, { useState } from 'react';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  X, 
  Check, 
  Play, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { 
  AlarmConfig, 
  AlarmSoundType, 
  playSoundSample, 
  saveAlarmConfig 
} from '../utils/alarmAudio';
import { Employee } from '../types';

interface AlarmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AlarmConfig;
  onUpdateConfig: (newConfig: AlarmConfig) => void;
  currentEmployee?: Employee;
  todayScheduleLabel?: string;
  nextAlarmInfo?: {
    type: 'check_in' | 'check_out' | 'none';
    timeString: string;
    description: string;
  };
}

export const AlarmSettingsModal: React.FC<AlarmSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  currentEmployee,
  todayScheduleLabel = 'Shift Operasional Satpol PP & Damkar',
  nextAlarmInfo,
}) => {
  const [localConfig, setLocalConfig] = useState<AlarmConfig>(config);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestSound = (type?: AlarmSoundType) => {
    const soundToPlay = type || localConfig.soundType;
    setIsPlayingTest(true);
    playSoundSample(soundToPlay, localConfig.volume);
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 1800);
  };

  const handleSave = () => {
    saveAlarmConfig(localConfig);
    onUpdateConfig(localConfig);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <span>Alarm Pengingat Kedinasan</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  Anti-PSW
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Peringatan suara & getar jam absen pulang & tukar shift
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          
          {/* Master Switch */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                localConfig.enabled ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'
              }`}>
                {localConfig.enabled ? <Bell className="w-4 h-4" /> : <BellRing className="w-4 h-4 opacity-50" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Status Alarm Otomatis</span>
                <span className="text-[10.5px] text-slate-500">
                  {localConfig.enabled ? 'Aktif membunyikan pengingat di HP Anda' : 'Alarm dinonaktifkan sementara'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.enabled}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Schedule Context Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold mb-1">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Jadwal Aktif Hari Ini</span>
            </div>
            <p className="text-[11px] text-amber-800 font-medium">
              {todayScheduleLabel}
            </p>
            {nextAlarmInfo && nextAlarmInfo.type !== 'none' && (
              <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10.5px]">
                <span className="text-amber-900 font-semibold">Alarm Berikutnya:</span>
                <span className="font-mono font-bold bg-amber-600 text-white px-2 py-0.5 rounded-lg shadow-2xs">
                  {nextAlarmInfo.timeString} WIB
                </span>
              </div>
            )}
          </div>

          {/* Sound Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Pilihan Nada Alarm</span>
              <span className="text-[10px] text-slate-400 font-normal">Klik untuk dengarkan</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'siren', label: 'Sirene Taktis', desc: 'Satpol PP & Damkar' },
                { id: 'bell', label: 'Gong Pos Jaga', desc: 'Resonan Digital' },
                { id: 'chime', label: 'Chime Melodi', desc: 'Santai & Halus' },
              ].map((item) => {
                const isSelected = localConfig.soundType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLocalConfig(prev => ({ ...prev, soundType: item.id as AlarmSoundType }));
                      handleTestSound(item.id as AlarmSoundType);
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs block">{item.label}</span>
                    <span className="text-[9.5px] opacity-75 block">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Sound Button & Volume */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Volume Alarm: {Math.round(localConfig.volume * 100)}%</span>
              </span>
              <button
                type="button"
                onClick={() => handleTestSound()}
                disabled={isPlayingTest}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition"
              >
                <Play className={`w-3 h-3 ${isPlayingTest ? 'animate-spin' : ''}`} />
                <span>{isPlayingTest ? 'Memutar...' : 'Uji Bunyi'}</span>
              </button>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={localConfig.volume}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          {/* Options Checkboxes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Pemicu Pengingat</label>
            
            {/* Anti-PSW Pulang */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={localConfig.remindCheckOut}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, remindCheckOut: e.target.checked }))}
                className="rounded text-amber-600 focus:ring-amber-500 mt-0.5 accent-amber-600"
              />
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block">
                  Alarm Jam Pulang & Tukar Shift (Anti-PSW)
                </span>
                <span className="text-[10.5px] text-slate-500 block leading-snug">
                  Berbunyi otomatis saat jam dinas berakhir jika Anda belum melakukan Tap Pulang.
                </span>
              </div>
            </label>

            {/* Anti-Terlambat Masuk */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={localConfig.remindCheckIn}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, remindCheckIn: e.target.checked }))}
                className="rounded text-amber-600 focus:ring-amber-500 mt-0.5 accent-amber-600"
              />
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block">
                  Alarm Jam Masuk Dinas (Anti-Terlambat)
                </span>
                <span className="text-[10.5px] text-slate-500 block leading-snug">
                  Berbunyi saat jendela absensi masuk dibuka (30 menit s.d 10 menit sebelum apel/masuk).
                </span>
              </div>
            </label>

            {/* Getar HP */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={localConfig.vibrateEnabled}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, vibrateEnabled: e.target.checked }))}
                className="rounded text-amber-600 focus:ring-amber-500 mt-0.5 accent-amber-600"
              />
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  Aktifkan Getaran HP (Vibrate)
                </span>
                <span className="text-[10.5px] text-slate-500 block leading-snug">
                  Memberikan getaran taktis berulang pada smartphone saat jam alarm tiba.
                </span>
              </div>
            </label>
          </div>

          {/* Timing Offset */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Waktu Pemicu Pengingat Pulang</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0, label: 'Tepat Jam Pulang' },
                { val: 5, label: '5 Mnt Sebelumnya' },
                { val: 10, label: '10 Mnt Sebelumnya' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setLocalConfig(prev => ({ ...prev, advanceMinutes: opt.val }))}
                  className={`py-2 px-1 text-[11px] rounded-xl border text-center transition ${
                    localConfig.advanceMinutes === opt.val
                      ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <BellRing className="w-4 h-4" />
                <span>Simpan Pengaturan Alarm</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
