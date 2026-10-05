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
      
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Audit Keamanan: Kunci Perangkat & Deteksi Anti-Fake GPS
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mencatat upaya presensi menggunakan perangkat lain (titip absen), pelanggaran radius geofence, atau reset kunci
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onOpenPrintMenu && (
            <button
              onClick={() => onOpenPrintMenu('security')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Log Audit</span>
            </button>
          )}
          <div className="text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
            Total Log Insiden: <strong className="text-rose-600 font-bold">{logs.length}</strong>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Riwayat Audit Integritas Presensi</h3>

        <div className="space-y-2.5">
          {logs.map((log) => {
            const isMismatch = log.eventType === 'device_mismatch';
            const isRadius = log.eventType === 'out_of_radius';
            const isPaired = log.eventType === 'device_paired';

            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs transition-colors ${
                  isMismatch
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : isRadius
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : isPaired
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                  isMismatch
                    ? 'bg-rose-100/80 border-rose-300'
                    : isRadius
                    ? 'bg-amber-100/80 border-amber-300'
                    : isPaired
                    ? 'bg-emerald-100/80 border-emerald-300'
                    : 'bg-white border-slate-200'
                }`}>
                  {isMismatch ? (
                    <Smartphone className="w-4 h-4 text-rose-600" />
                  ) : isRadius ? (
                    <Navigation className="w-4 h-4 text-amber-600" />
                  ) : isPaired ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <RotateCcw className="w-4 h-4 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{log.employeeName}</span>
                    <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {log.timestamp}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-700">{log.details}</p>

                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 font-mono">
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

