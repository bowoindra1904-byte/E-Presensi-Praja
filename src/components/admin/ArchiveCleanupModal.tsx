import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Trash2, 
  Download, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  HardDrive, 
  Image as ImageIcon,
  FileSpreadsheet
} from 'lucide-react';
import { AttendanceRecord } from '../../types';

interface ArchiveCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceRecords: AttendanceRecord[];
  onExecuteArchive: (
    recordIds: string[], 
    mode: 'photos_only' | 'delete_all',
    cutoffLabel: string
  ) => Promise<void>;
}

export const ArchiveCleanupModal: React.FC<ArchiveCleanupModalProps> = ({
  isOpen,
  onClose,
  attendanceRecords,
  onExecuteArchive
}) => {
  // Retention period choice in months (default: 6 months as requested)
  const [monthsThreshold, setMonthsThreshold] = useState<number>(6);
  const [cleanupMode, setCleanupMode] = useState<'photos_only' | 'delete_all'>('photos_only');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasExported, setHasExported] = useState<boolean>(false);

  // Compute cutoff date
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsThreshold);
    return d;
  }, [monthsThreshold]);

  const cutoffDateString = cutoffDate.toISOString().split('T')[0];

  // Eligible records for archiving
  const eligibleRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      if (!r.date) return false;
      return r.date < cutoffDateString;
    });
  }, [attendanceRecords, cutoffDateString]);

  // Photo count in eligible records
  const photosCount = useMemo(() => {
    return eligibleRecords.filter(r => r.checkInPhoto || r.checkOutPhoto).length;
  }, [eligibleRecords]);

  // Estimated memory saved (assuming ~40KB per record with photo, ~1KB for pure text)
  const estimatedSavedKb = useMemo(() => {
    if (cleanupMode === 'photos_only') {
      return photosCount * 38;
    }
    return (photosCount * 38) + (eligibleRecords.length * 1.5);
  }, [eligibleRecords, photosCount, cleanupMode]);

  const formatSize = (kb: number) => {
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${Math.round(kb)} KB`;
  };

  if (!isOpen) return null;

  // Handle Export CSV backup
  const handleExportBackup = () => {
    if (eligibleRecords.length === 0) return;

    const headers = [
      "ID Presensi",
      "ID Personel",
      "Nama Pegawai",
      "NIP",
      "Tanggal",
      "Jadwal Dinas",
      "Pos Slot",
      "Nama Pos",
      "Jam Masuk",
      "Status Masuk",
      "Jarak Masuk (m)",
      "Jam Pulang",
      "Status Pulang",
      "Jarak Pulang (m)",
      "Catatan"
    ];

    const rows = eligibleRecords.map(r => [
      `"${r.id}"`,
      `"${r.employeeId}"`,
      `"${r.employeeName}"`,
      `"${r.employeeNip}"`,
      `"${r.date}"`,
      `"${r.scheduleType}"`,
      `"${r.locationSlotId}"`,
      `"${r.locationName}"`,
      `"${r.checkInTime || '-'}"`,
      `"${r.checkInStatus || '-'}"`,
      `"${r.checkInDistance ?? '-'}"`,
      `"${r.checkOutTime || '-'}"`,
      `"${r.checkOutStatus || '-'}"`,
      `"${r.checkOutDistance ?? '-'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Arsip_Presensi_SatpolPP_BangkaBarat_LebihDari_${monthsThreshold}Bulan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setHasExported(true);
  };

  // Execute Cleanup
  const handleConfirmCleanup = async () => {
    if (eligibleRecords.length === 0) return;

    const actionText = cleanupMode === 'photos_only'
      ? `Apakah Anda yakin ingin mengosongkan foto selfie dari ${eligibleRecords.length} presensi yang berumur lebih dari ${monthsThreshold} bulan? (Catatan teks kehadiran tetap tersimpan utuh)`
      : `PERINGATAN: Apakah Anda yakin ingin MENGHAPUS TOTAL ${eligibleRecords.length} data presensi berumur lebih dari ${monthsThreshold} bulan dari database Cloud Firebase?`;

    if (!window.confirm(actionText)) return;

    try {
      setIsProcessing(true);
      const recordIds = eligibleRecords.map(r => r.id);
      await onExecuteArchive(recordIds, cleanupMode, `> ${monthsThreshold} Bulan (sebelum ${cutoffDateString})`);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat memproses pembersihan database.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-10" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <Archive className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <span className="truncate">Arsip & Pembersihan Cloud</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono shrink-0">
                  Cloud
                </span>
              </h3>
              <p className="text-[10.5px] sm:text-xs text-slate-500 truncate">
                Optimasi kuota penyimpanan database presensi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-5 overflow-y-auto pr-1">
          
          {/* Threshold Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Pilih Batas Waktu Retensi Arsip:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { months: 3, label: '> 3 Bulan', desc: 'Arsip Triwulan' },
                { months: 6, label: '> 6 Bulan', desc: 'Rekomendasi Utama' },
                { months: 12, label: '> 1 Tahun', desc: 'Arsip Tahunan' }
              ].map(opt => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => {
                    setMonthsThreshold(opt.months);
                    setHasExported(false);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    monthsThreshold === opt.months
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-1 ring-amber-400/40'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-200">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Tanggal Batas Pembersihan:</span>
              </span>
              <span className="font-mono font-bold text-amber-800">
                Sebelum {cutoffDateString}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500">Presensi Lama</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                  {eligibleRecords.length}
                </div>
                <div className="text-[10px] text-slate-400">rekaman</div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500">Foto Selfie</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5 font-mono">
                  {photosCount}
                </div>
                <div className="text-[10px] text-slate-400">berkas foto</div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500">Ruang Pulih</div>
                <div className="text-lg font-bold text-emerald-600 mt-0.5 font-mono">
                  ~{formatSize(estimatedSavedKb)}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">efisiensi</div>
              </div>
            </div>

            {eligibleRecords.length === 0 && (
              <div className="text-center py-2 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                Tidak ada rekaman presensi yang berumur lebih dari {monthsThreshold} bulan saat ini. Database dalam kondisi sangat ramping!
              </div>
            )}
          </div>

          {/* Action Step 1: Export First (Safety Guarantee) */}
          <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Langkah 1: Unduh Berkas Cadangan Arsip (CSV)</span>
                    {hasExported && (
                      <span className="text-[10px] text-emerald-700 flex items-center gap-0.5 font-normal">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah Diunduh
                      </span>
                    )}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Amankan data lama dengan mengunduh seluruh baris presensi ke file CSV di komputer dinas sebelum dilakukan pembersihan.
                </p>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={eligibleRecords.length === 0 || isProcessing}
                  className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File Arsip ({eligibleRecords.length} Data)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Step 2: Cleanup Mode Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Langkah 2: Tentukan Metode Pembersihan:
            </label>
            <div className="space-y-2">
              
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  cleanupMode === 'photos_only'
                    ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/40'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="cleanupMode"
                  value="photos_only"
                  checked={cleanupMode === 'photos_only'}
                  onChange={() => setCleanupMode('photos_only')}
                  className="mt-1 accent-amber-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Hanya Kosongkan Foto Selfie Lama (Sangat Direkomendasikan)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                      Aman 100%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Menghapus string foto selfie lama yang memakan kuota, namun <strong>tetap mempertahankan seluruh data teks jam masuk, jam pulang, NIP, status, dan nama pos</strong>. Laporan bulanan tetap lengkap!
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  cleanupMode === 'delete_all'
                    ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-300/40'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="cleanupMode"
                  value="delete_all"
                  checked={cleanupMode === 'delete_all'}
                  onChange={() => setCleanupMode('delete_all')}
                  className="mt-1 accent-rose-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Hapus & Bersihkan Seluruh Dokumen Presensi Lama
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
                      Total Reset
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Menghapus seluruh rekaman presensi lama dari database Cloud Firebase setelah berkas CSV diunduh ke arsip dinas.
                  </p>
                </div>
              </label>

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kapasitas Cloud Firebase terlindungi</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmCleanup}
              disabled={eligibleRecords.length === 0 || isProcessing}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                cleanupMode === 'photos_only'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses Cloud...</span>
                </>
              ) : (
                <>
                  {cleanupMode === 'photos_only' ? (
                    <ImageIcon className="w-3.5 h-3.5" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Jalankan Pembersihan</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
