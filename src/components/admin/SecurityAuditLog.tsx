import React from 'react';
import { SecurityLog } from '../../types';
import { ShieldAlert, Smartphone, Navigation, CheckCircle2, RotateCcw, Printer } from 'lucide-react';

interface SecurityAuditLogProps {
  logs: SecurityLog[];
  onClearLogs?: () => void;
  onOpenPrintMenu?: (menu: 'security') => void;
}

export const SecurityAuditLog: React.FC<SecurityAuditLogProps> = ({ logs, onOpenPrintMenu }) => {
  return (
    <div className="space-y-6">
      
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Audit Keamanan: Kunci Perangkat & Deteksi Anti-Fake GPS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mencatat upaya presensi menggunakan perangkat lain (titip absen), pelanggaran radius geofence, atau reset kunci
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onOpenPrintMenu && (
            <button
              onClick={() => onOpenPrintMenu('security')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Log Audit</span>
            </button>
          )}
          <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
            Total Log Insiden: <strong className="text-rose-400">{logs.length}</strong>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white mb-2">Riwayat Audit Integritas Presensi</h3>

        <div className="space-y-2.5">
          {logs.map((log) => {
            const isMismatch = log.eventType === 'device_mismatch';
            const isRadius = log.eventType === 'out_of_radius';
            const isPaired = log.eventType === 'device_paired';
            const isReset = log.eventType === 'device_reset';

            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs transition-colors ${
                  isMismatch
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : isRadius
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : isPaired
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-slate-950/80 shrink-0 mt-0.5">
                  {isMismatch ? (
                    <Smartphone className="w-4 h-4 text-rose-400" />
                  ) : isRadius ? (
                    <Navigation className="w-4 h-4 text-amber-400" />
                  ) : isPaired ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <RotateCcw className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm">{log.employeeName}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {log.timestamp}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-200">{log.details}</p>

                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                    <span>ID Pegawai: {log.employeeId}</span>
                    <span>·</span>
                    <span>ID Perangkat: {log.deviceId}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              Belum ada insiden keamanan atau pelanggaran kunci perangkat tercatat.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
