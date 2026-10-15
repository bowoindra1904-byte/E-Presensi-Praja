import React, { useEffect } from 'react';
import { 
  BellRing, 
  VolumeX, 
  Volume2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RotateCcw,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { stopAlarmLoop } from '../utils/alarmAudio';

interface ActiveAlarmBannerModalProps {
  isOpen: boolean;
  type: 'checkout' | 'checkin';
  title: string;
  message: string;
  currentTimeString: string;
  onDismiss: () => void;
  onSnooze: (minutes?: number) => void;
  onActionTap: () => void;
  actionButtonLabel?: string;
  isAudioPlaying?: boolean;
  onToggleMute?: () => void;
}

export const ActiveAlarmBannerModal: React.FC<ActiveAlarmBannerModalProps> = ({
  isOpen,
  type,
  title,
  message,
  currentTimeString,
  onDismiss,
  onSnooze,
  onActionTap,
  actionButtonLabel,
  isAudioPlaying = true,
  onToggleMute,
}) => {
  // When modal closes, ensure sound stops
  useEffect(() => {
    return () => {
      stopAlarmLoop();
    };
  }, []);

  if (!isOpen) return null;

  const isCheckout = type === 'checkout';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in-95">
      <div className={`w-full max-w-lg rounded-3xl shadow-2xl border-2 overflow-hidden flex flex-col bg-white ${
        isCheckout 
          ? 'border-orange-500 ring-4 ring-orange-500/20' 
          : 'border-amber-500 ring-4 ring-amber-500/20'
      }`}>
        
        {/* Flashing Top Alert Bar */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between ${
          isCheckout
            ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700'
            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 animate-bounce">
              <BellRing className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full border border-white/20">
                  {isCheckout ? 'SIAGA KEPULANGAN' : 'SIAGA MASUK DINAS'}
                </span>
                <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {currentTimeString} WIB
                </span>
              </div>
              <h3 className="font-black text-base sm:text-lg tracking-tight mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title={isAudioPlaying ? "Senyapkan Bunyi Alarm" : "Nyalakan Bunyi Alarm"}
            >
              {isAudioPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-300" />}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4">
          
          <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
            isCheckout
              ? 'bg-orange-50/80 border-orange-200 text-orange-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <p className="font-semibold">{message}</p>
            {isCheckout && (
              <div className="mt-2 pt-2 border-t border-orange-200/80 text-[11px] text-orange-900 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Perhatian Regulasi Kedisiplinan:</strong> Tidak melakukan absen pulang akan otomatis tercatat sebagai <strong>PSW</strong> (Pegawai Tidak Absen Pulang) dan jam kerja hanya diakui 4 jam.
                </span>
              </div>
            )}
          </div>

          {/* Large Action Button */}
          <button
            type="button"
            onClick={() => {
              stopAlarmLoop();
              onActionTap();
            }}
            className={`w-full py-4 px-4 rounded-2xl font-black text-sm sm:text-base text-white shadow-xl flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer ${
              isCheckout
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 ring-2 ring-orange-500/40'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 ring-2 ring-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{actionButtonLabel || (isCheckout ? 'TAP ABSEN PULANG SEKARANG' : 'TAP ABSEN MASUK')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary Controls (Snooze & Dismiss) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                stopAlarmLoop();
                onSnooze(5);
              }}
              className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Tunda 5 Menit (Snooze)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopAlarmLoop();
                onDismiss();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Matikan Alarm</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
