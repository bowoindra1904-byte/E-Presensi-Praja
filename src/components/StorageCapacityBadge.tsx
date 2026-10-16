import React, { useState, useEffect, useRef } from 'react';
import { HardDrive, Database, ShieldCheck, AlertTriangle, X, Cloud, RefreshCw, Archive } from 'lucide-react';
import { calculateStorageStats, StorageStats } from '../utils/storageEstimator';

interface StorageCapacityBadgeProps {
  attendanceCount?: number;
  employeeCount?: number;
  locationCount?: number;
  variant?: 'header' | 'sidebar' | 'inline';
  onOpenArchiveModal?: () => void;
}

export const StorageCapacityBadge: React.FC<StorageCapacityBadgeProps> = ({
  attendanceCount = 0,
  employeeCount = 0,
  locationCount = 0,
  variant = 'header',
  onOpenArchiveModal,
}) => {
  const [stats, setStats] = useState<StorageStats>(() => 
    calculateStorageStats(attendanceCount, employeeCount, locationCount)
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recalculate stats when counts change or periodically
  useEffect(() => {
    setStats(calculateStorageStats(attendanceCount, employeeCount, locationCount));
  }, [attendanceCount, employeeCount, locationCount]);

  // Click outside listener to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getColorClasses = (status: 'optimal' | 'warning' | 'critical') => {
    if (status === 'critical') {
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
        bar: 'bg-rose-600',
        text: 'text-rose-700',
        badge: 'bg-rose-100 text-rose-800 border-rose-300'
      };
    }
    if (status === 'warning') {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
        bar: 'bg-amber-500',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800 border-amber-300'
      };
    }
    return {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      bar: 'bg-emerald-600',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  };

  const colors = getColorClasses(stats.healthStatus);

  // 1. Tampilan Sidebar (Progress bar mendalam di drawer menu)
  if (variant === 'sidebar') {
    return (
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <HardDrive className="w-3.5 h-3.5 text-slate-600" />
            <span>Penyimpanan Sistem</span>
          </div>
          <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded border ${colors.badge}`}>
            {stats.percentage}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${Math.max(3, stats.percentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>{stats.usedFormatted} terpakai</span>
          <span>Batas: {stats.maxFormatted}</span>
        </div>
      </div>
    );
  }

  // 2. Tampilan Header / Inline (Tombol kecil interaktif dengan popover rincian)
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Kapasitas Penyimpanan Data Sistem: Klik untuk rincian"
        aria-label="Kapasitas Penyimpanan Data Sistem"
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[10.5px] font-mono font-bold transition-all shadow-2xs ${colors.bg}`}
      >
        <HardDrive className="w-3.5 h-3.5 shrink-0" />
        <span className="tracking-tight">{stats.percentage}%</span>
        {/* Mini status indicator dot */}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          stats.healthStatus === 'critical' ? 'bg-rose-500 animate-ping' :
          stats.healthStatus === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
        }`} />
      </button>

      {/* Popover Detail Penyimpanan Data Sistem */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">Penyimpanan Sistem</h4>
                <p className="text-[10px] text-slate-500">Kapasitas Basis Data Presensi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Persentase Utama */}
          <div className="py-2.5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xl font-black font-mono text-slate-900">
                {stats.usedFormatted}
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Cloud: &lt; {stats.firestoreQuotaPercent}% / 1 GB
              </span>
            </div>

            {/* Gauge Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                style={{ width: `${Math.max(3, stats.percentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-slate-500 mt-1">
              <span>Data Akumulatif Aktif</span>
              <span className="font-semibold text-emerald-700">Estimasi Tahan: 5 - 10 Tahun</span>
            </div>
          </div>

          {/* Rincian Dokumen & Kuota */}
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] space-y-1.5 mb-2.5">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Basis Data Server</span>
              </span>
              <span className="font-bold text-slate-800">Cloud Firestore (1 GB)</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Pemakaian Server Cloud</span>
              <span className="font-mono font-bold text-emerald-700">&lt; 0.05% (Sisa 99.95%)</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Cache Memori Browser</span>
              <span className="font-mono text-slate-700">{stats.percentage}% (Batas 10 MB)</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
              <span>Catatan Absensi</span>
              <span className="font-mono font-bold text-slate-900">{stats.attendanceCount} rekaman</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Personel Satpol PP</span>
              <span className="font-mono font-bold text-slate-900">{stats.employeeCount} personel</span>
            </div>
          </div>

          {/* Edukasi Keamanan Kapasitas */}
          <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[10px] text-emerald-900 leading-snug mb-2.5">
            💡 <strong>Penyimpanan Sangat Aman:</strong> Data presensi berbasis teks sangat ringan (~1 KB/absen). Sistem tidak akan cepat penuh. Tersedia menu <em>"Arsip & Bersihkan &gt; 6 Bulan"</em> untuk mengunduh cadangan CSV dinas setiap semester.
          </div>

          {/* Footer Note / Action */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
            <span className="text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Status: Sangat Aman</span>
            </span>

            {onOpenArchiveModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenArchiveModal();
                }}
                className="text-amber-700 hover:text-amber-800 font-bold hover:underline flex items-center gap-1"
              >
                <Archive className="w-3 h-3" />
                <span>Kelola Arsip</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
