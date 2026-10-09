import React, { useState, useMemo } from 'react';
import { Employee, WorkLocation, AttendanceRecord, MonthlyEmployeeReport, LeaveRequest, ReguType, ScheduleType } from '../../types';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  ShieldCheck, 
  TrendingUp, 
  Users,
  PenTool,
  Archive,
  RotateCcw,
  Trash2,
  X,
  HeartHandshake,
  Table,
  Grid,
  Info,
  ChevronRight,
  Eye,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { ArchiveCleanupModal } from './ArchiveCleanupModal';
import { 
  calculateSmartMonthlyReport, 
  getStatusCodeBadge, 
  INDONESIAN_DAY_NAMES,
  INDONESIAN_MONTH_NAMES,
  DayAttendanceStatus
} from '../../utils/smartAttendanceCalculator';

interface MonthlyReportViewProps {
  employees: Employee[];
  locations: WorkLocation[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  onOpenPrintMenu?: (menu: 'monthly') => void;
  onExecuteArchive?: (
    recordIds: string[], 
    mode: 'photos_only' | 'delete_all',
    cutoffLabel: string
  ) => Promise<void>;
  onResetMonthlyAttendance?: (recordIds: string[], monthLabel: string) => Promise<void>;
  onUpdateEmployeeSchedule?: (employeeId: string, newSchedule: ScheduleType) => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  employees,
  locations,
  attendanceRecords,
  leaveRequests = [],
  onOpenPrintMenu,
  onExecuteArchive,
  onResetMonthlyAttendance,
  onUpdateEmployeeSchedule,
}) => {
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedSlot, setSelectedSlot] = useState<string>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('all');
  const [selectedRegu, setSelectedRegu] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // View mode: 'summary' = Tabel Ringkasan & Persentase, 'matrix' = Matriks Harian (1-31)
  const [viewMode, setViewMode] = useState<'summary' | 'matrix'>('summary');

  // Selected Employee Modal for detailed day-by-day calendar
  const [selectedEmpForCalendar, setSelectedEmpForCalendar] = useState<MonthlyEmployeeReport | null>(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);

  // Reset Monthly Attendance Modal State
  const [isResetMonthlyModalOpen, setIsResetMonthlyModalOpen] = useState<boolean>(false);
  const [isResettingMonth, setIsResettingMonth] = useState<boolean>(false);
  const [resetMonthSuccessMsg, setResetMonthSuccessMsg] = useState<string>('');

  // Months available
  const availableMonths = [
    { value: '2026-10', label: 'Oktober 2026' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'Agustus 2026' },
    { value: '2026-07', label: 'Juli 2026' },
    { value: '2026-06', label: 'Juni 2026' },
  ];

  // Number of days in selected month
  const daysInSelectedMonth = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth]);

  // Compute monthly report metrics for each employee with Smart Attendance Calculator
  // Dynamically reacts if admin changes employee schedule (shift <-> harian or regu)
  const monthlyReports: MonthlyEmployeeReport[] = useMemo(() => {
    return employees.map((emp) => {
      // Calculate smart monthly report automatically
      const smart = calculateSmartMonthlyReport(
        emp,
        selectedMonth,
        attendanceRecords,
        leaveRequests,
        locations
      );

      const empRecords = attendanceRecords.filter(
        r => r.employeeId === emp.id && r.date.startsWith(selectedMonth)
      );

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        nip: emp.nip,
        rank: emp.rank,
        role: emp.role,
        regu: emp.regu,
        scheduleType: emp.scheduleType,
        locationSlotId: emp.locationSlotId,
        locationName: smart.locationName,
        totalPresentDays: smart.totalHadirSah, // Kehadiran sah (hadir + pemutihan)
        totalWorkHours: smart.totalWorkHours,
        totalLateCount: smart.lateCount,
        totalIzinCount: smart.izinCount,
        totalSakitCount: smart.sakitCount,
        totalDispensasiCount: smart.pemutihanCount,
        disciplineRate: smart.disciplineRate,
        attendancePattern: smart.attendancePattern,
        records: empRecords,

        // Smart metrics
        targetWorkDays: smart.targetWorkDays,
        totalMonthWorkDays: smart.totalMonthWorkDays,
        hadirCount: smart.hadirCount,
        lateCount: smart.lateCount,
        sakitCount: smart.sakitCount,
        izinCount: smart.izinCount,
        tanpaKeteranganCount: smart.tanpaKeteranganCount,
        pemutihanCount: smart.pemutihanCount,
        liburCount: smart.liburCount,
        totalHadirSah: smart.totalHadirSah,
        attendanceRate: smart.attendanceRate,
        dailyBreakdown: smart.dailyBreakdown,
      };
    });
  }, [employees, locations, attendanceRecords, selectedMonth, leaveRequests]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return monthlyReports.filter((item) => {
      const matchSlot = selectedSlot === 'all' || 
        String(item.locationSlotId) === String(selectedSlot) || 
        Number(item.locationSlotId) === Number(selectedSlot);
      const matchSchedule = selectedSchedule === 'all' || item.scheduleType === selectedSchedule;
      const matchRegu = selectedRegu === 'all' || item.regu === selectedRegu;
      const matchSearch = 
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nip.includes(searchQuery) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSlot && matchSchedule && matchRegu && matchSearch;
    });
  }, [monthlyReports, selectedSlot, selectedSchedule, selectedRegu, searchQuery]);

  // Aggregate monthly stats
  const totalAccumulatedHours = filteredReports.reduce((acc, curr) => acc + (isNaN(curr.totalWorkHours) ? 0 : curr.totalWorkHours), 0);
  const rawAvgWorkHours = filteredReports.length > 0 
    ? Math.round(totalAccumulatedHours / filteredReports.length) 
    : 0;
  const avgWorkHours = isNaN(rawAvgWorkHours) ? 0 : rawAvgWorkHours;

  const totalLateOccurrences = filteredReports.reduce((acc, curr) => acc + (curr.lateCount ?? curr.totalLateCount ?? 0), 0);
  const totalSakitOccurrences = filteredReports.reduce((acc, curr) => acc + (curr.sakitCount ?? curr.totalSakitCount ?? 0), 0);
  const totalIzinOccurrences = filteredReports.reduce((acc, curr) => acc + (curr.izinCount ?? curr.totalIzinCount ?? 0), 0);
  const totalPemutihanOccurrences = filteredReports.reduce((acc, curr) => acc + (curr.pemutihanCount ?? curr.totalDispensasiCount ?? 0), 0);
  const totalTanpaKeteranganOccurrences = filteredReports.reduce((acc, curr) => acc + (curr.tanpaKeteranganCount ?? 0), 0);

  // Rata-rata persentase kehadiran pintar otomatis
  const avgAttendanceRate = filteredReports.length > 0
    ? Math.round(filteredReports.reduce((acc, curr) => acc + (curr.attendanceRate ?? 100), 0) / filteredReports.length)
    : 100;

  // Export CSV Lengkap dengan Kolom Wajib Kerja, Hadir (H), Izin (I), Sakit (S), TK, Pemutihan (P)
  const handleExportCSV = () => {
    const headers = [
      "ID Personel", 
      "NIP", 
      "Nama Pegawai", 
      "Pangkat", 
      "Jabatan", 
      "Regu",
      "Slot Penugasan", 
      "Tipe Jam Kerja", 
      "Target Hari Wajib Kerja",
      "Hadir (H)", 
      "Terlambat (T)",
      "Izin (I)",
      "Sakit (S)",
      "Tanpa Keterangan (TK)",
      "Pemutihan (P)",
      "Total Hadir Sah",
      "Persentase Kehadiran (%)",
      "Tingkat Ketepatan Waktu (%)",
      "Total Jam Kerja", 
      "Pola & Keterangan Evaluasi"
    ];

    const rows = filteredReports.map(r => [
      r.employeeId,
      `"${r.nip}"`,
      `"${r.employeeName}"`,
      `"${r.rank}"`,
      `"${r.role}"`,
      `"${r.regu}"`,
      `"Slot ${r.locationSlotId}: ${r.locationName}"`,
      r.scheduleType.toUpperCase(),
      r.targetWorkDays ?? 0,
      r.hadirCount ?? 0,
      r.lateCount ?? 0,
      r.izinCount ?? 0,
      r.sakitCount ?? 0,
      r.tanpaKeteranganCount ?? 0,
      r.pemutihanCount ?? 0,
      r.totalHadirSah ?? 0,
      `${r.attendanceRate ?? 100}%`,
      `${r.disciplineRate}%`,
      r.totalWorkHours,
      `"${r.attendancePattern}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Absensi_Pintar_Satpol_PP_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentMonthRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.date.startsWith(selectedMonth));
  }, [attendanceRecords, selectedMonth]);

  const selectedMonthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const handleConfirmResetMonthly = async () => {
    if (!onResetMonthlyAttendance || currentMonthRecords.length === 0) return;

    try {
      setIsResettingMonth(true);
      const targetIds = currentMonthRecords.map(r => r.id);
      await onResetMonthlyAttendance(targetIds, selectedMonthLabel);
      setResetMonthSuccessMsg(`Berhasil me-reset ${targetIds.length} rekaman presensi periode ${selectedMonthLabel}.`);
      setTimeout(() => {
        setIsResetMonthlyModalOpen(false);
        setResetMonthSuccessMsg('');
        setIsResettingMonth(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsResettingMonth(false);
    }
  };

  // Print layout trigger
  const handlePrint = () => {
    if (onOpenPrintMenu) {
      onOpenPrintMenu('monthly');
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              Sistem Pintar Otomatis
            </span>
            <span className="text-xs text-slate-500">Perhitungan Presensi Real-Time</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Laporan & Rekapan Bulanan Personel Satpol PP
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Perhitungan persentase kehadiran otomatis dari awal bulan. Menyesuaikan dinamis jika admin mengubah jadwal Harian (Senin-Jumat) ⇄ Shift 12 Jam (Pagi-Malam-Libur-Libur).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetMonthlyAttendance && (
            <button
              onClick={() => {
                setIsResetMonthlyModalOpen(true);
                setResetMonthSuccessMsg('');
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Reset dan kosongkan seluruh data rekapitulasi presensi pada bulan yang dipilih"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Rekap Bulan Ini</span>
            </button>
          )}
          {onExecuteArchive && (
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Arsipkan dan bersihkan data presensi lama lebih dari 6 bulan"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-600" />
              <span>Arsip &gt; 6 Bulan</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Ekspor Excel / CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-amber-800 hover:text-amber-900 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Atur penanda tangan dan cetak dokumen resmi"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-600" />
            <span>Pengesahan Pejabat</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Rekap Resmi
          </button>
        </div>
      </div>

      {/* Info Card: Aturan Perhitungan Otomatis */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-blue-50/60 border border-amber-200/90 rounded-2xl p-4 text-xs shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-amber-700" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span>Sistem Pintar Perhitungan Kehadiran Otomatis Berdasarkan Tipe Jadwal</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">Dinamis</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-700">
              <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                <div className="font-bold text-emerald-800 flex items-center gap-1 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Jadwal Harian (Kantor/Dinas)
                </div>
                <p className="text-slate-600 leading-relaxed text-[10.5px]">
                  Hari kerja <strong>Senin - Jumat</strong>. Hari <strong>Sabtu, Minggu</strong> dan <strong>Hari Besar/Libur Nasional 2026</strong> otomatis Libur (L).
                </p>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                <div className="font-bold text-amber-800 flex items-center gap-1 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Jadwal Shift 12 Jam
                </div>
                <p className="text-slate-600 leading-relaxed text-[10.5px]">
                  Siklus berulang dinamis: <strong>Shift Pagi ➔ Shift Malam ➔ Libur ➔ Libur</strong>. Dihitung otomatis sesuai kondisi di lapangan.
                </p>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                <div className="font-bold text-blue-800 flex items-center gap-1 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Dinamis & Pemutihan
                </div>
                <p className="text-slate-600 leading-relaxed text-[10.5px]">
                  Jika admin mengganti jadwal personel, persentase kehadiran <strong>otomatis berubah</strong>. Pemutihan (P) dihitung hadir sah.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Rata-Rata Persentase Kehadiran Pintar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">% Kehadiran</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-black font-mono ${
                avgAttendanceRate >= 90 ? 'text-emerald-600' : avgAttendanceRate >= 75 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {avgAttendanceRate}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Rata-rata Kehadiran Sah</span>
          </div>
        </div>

        {/* Hadir Sah & Pemutihan */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hadir (H) & P</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {filteredReports.reduce((acc, curr) => acc + (curr.totalHadirSah ?? 0), 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Total Hari Hadir Sah</span>
          </div>
        </div>

        {/* Sakit (S) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sakit (S)</span>
            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold flex items-center justify-center">S</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-purple-700 font-mono">{totalSakitOccurrences}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Hari Sakit Sah</span>
          </div>
        </div>

        {/* Izin (I) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Izin (I)</span>
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center justify-center">I</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono">{totalIzinOccurrences}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Hari Izin Resmi</span>
          </div>
        </div>

        {/* Tanpa Keterangan (TK) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tanpa Ket. (TK)</span>
            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black flex items-center justify-center">TK</span>
          </div>
          <div className="mt-3">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${totalTanpaKeteranganOccurrences > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {totalTanpaKeteranganOccurrences}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Hari Alpha / TK</span>
          </div>
        </div>

        {/* Pemutihan (P) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pemutihan (P)</span>
            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 text-[11px] font-bold flex items-center justify-center">P</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-cyan-700 font-mono">{totalPemutihanOccurrences}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Disp. HP / Lapangan</span>
          </div>
        </div>

      </div>

      {/* Official Legend Bar (Keterangan Kode S, I, TK, P, H, T, L) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Keterangan Kode Tabel Rekapan:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
              <span className="w-4 h-4 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px]">H</span>
              <span>Hadir (Tepat Waktu)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
              <span className="w-4 h-4 rounded bg-amber-500 text-white font-bold flex items-center justify-center text-[9px]">T</span>
              <span>Terlambat</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-semibold">
              <span className="w-4 h-4 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[9px]">S</span>
              <span>Sakit (Surat Dokter)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold">
              <span className="w-4 h-4 rounded bg-indigo-600 text-white font-bold flex items-center justify-center text-[9px]">I</span>
              <span>Izin (Resmi Disetujui)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold">
              <span className="w-4 h-4 rounded bg-rose-600 text-white font-black flex items-center justify-center text-[9px]">TK</span>
              <span>Tanpa Keterangan (Alpha)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 font-semibold">
              <span className="w-4 h-4 rounded bg-cyan-600 text-white font-bold flex items-center justify-center text-[9px]">P</span>
              <span>Pemutihan (Disp. HP / Lapangan)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-medium">
              <span className="w-4 h-4 rounded bg-slate-400 text-white font-bold flex items-center justify-center text-[9px]">L</span>
              <span>Libur (Weekend / Off Siklus)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar + View Mode Toggle */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Periode Waktu / Bulan */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-600" />
              Periode Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Unit / Pos Penempatan */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-600" />
              Unit / Slot Pos Penempatan
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Unit ({locations.length} Slot Pos)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                </option>
              ))}
            </select>
          </div>

          {/* Regu */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-600" />
              Regu Operasional
            </label>
            <select
              value={selectedRegu}
              onChange={(e) => setSelectedRegu(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Regu</option>
              <option value="Regu 1">Regu 1</option>
              <option value="Regu 2">Regu 2</option>
              <option value="Regu 3">Regu 3</option>
              <option value="Regu 4">Regu 4</option>
              <option value="Harian">Regu Harian</option>
            </select>
          </div>

          {/* Tipe Jam Kerja */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              Tipe Jam Kerja
            </label>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Tipe (Shift & Harian)</option>
              <option value="shift">Shift (12 Jam - Siklus 4 Hari)</option>
              <option value="harian">Harian (Senin - Jumat)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-amber-600" />
              Cari Nama / NIP
            </label>
            <input
              type="text"
              placeholder="Cari personel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        {/* View Mode Toggle (Summary vs Matrix) & Counter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Tampilan Rekapan:</span>
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'summary' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-amber-600" />
                <span>Ringkasan & Persentase</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'matrix' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-indigo-600" />
                <span>Matriks Presensi Harian (1-{daysInSelectedMonth})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Menampilkan <strong className="text-slate-900">{filteredReports.length}</strong> personel</span>
            <span className="font-mono text-amber-800 font-bold bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
              {availableMonths.find(m => m.value === selectedMonth)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Monthly Report Content */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        
        {/* ============================================================== */}
        {/* TAMPILAN 1: TABEL RINGKASAN & PERSENTASE KEHADIRAN (DEFAULT) */}
        {/* ============================================================== */}
        {viewMode === 'summary' && (
          <>
            {/* Mobile View: HP Card List */}
            <div className="sm:hidden p-3 space-y-3">
              {filteredReports.map((item) => (
                <div key={item.employeeId} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs truncate">{item.employeeName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">NIP: {item.nip} · {item.employeeId}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{item.role} · <strong className="text-slate-800">{item.regu}</strong></div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      item.scheduleType === 'shift' 
                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      {item.scheduleType === 'shift' ? 'Shift 12 Jam' : 'Harian'}
                    </span>
                  </div>

                  <div className="text-[10.5px] text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-slate-500">Pos: </span>
                      <span className="font-semibold text-slate-900">Slot {item.locationSlotId}: {item.locationName.replace(/^Slot \d+:\s*/, '')}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">Wajib: {item.targetWorkDays ?? 0}h</span>
                  </div>

                  {/* Grid Badge S, I, TK, P, H, T */}
                  <div className="grid grid-cols-6 gap-1 text-center text-xs">
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] text-emerald-700 font-bold block">H</span>
                      <span className="font-mono font-bold text-slate-900 text-[11px]">{item.hadirCount ?? item.totalPresentDays}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] text-amber-700 font-bold block">T</span>
                      <span className={`font-mono font-bold text-[11px] ${(item.lateCount ?? item.totalLateCount) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                        {item.lateCount ?? item.totalLateCount}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] text-indigo-700 font-bold block">I</span>
                      <span className={`font-mono font-bold text-[11px] ${(item.izinCount ?? 0) > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                        {item.izinCount ?? 0}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] text-purple-700 font-bold block">S</span>
                      <span className={`font-mono font-bold text-[11px] ${(item.sakitCount ?? 0) > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                        {item.sakitCount ?? 0}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] text-rose-700 font-bold block">TK</span>
                      <span className={`font-mono font-black text-[11px] ${(item.tanpaKeteranganCount ?? 0) > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                        {item.tanpaKeteranganCount ?? 0}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] text-cyan-800 font-bold block">P</span>
                      <span className={`font-mono font-bold text-[11px] ${(item.pemutihanCount ?? 0) > 0 ? 'text-cyan-800' : 'text-slate-400'}`}>
                        {item.pemutihanCount ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Attendance Rate Progress */}
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-600 truncate max-w-[200px]">{item.attendancePattern}</span>
                      <span className={`font-mono font-black text-xs ${
                        (item.attendanceRate ?? 100) >= 90 ? 'text-emerald-700' : (item.attendanceRate ?? 100) >= 75 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {item.attendanceRate ?? 100}% Kehadiran
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (item.attendanceRate ?? 100) >= 90
                            ? 'bg-emerald-500'
                            : (item.attendanceRate ?? 100) >= 75
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.attendanceRate ?? 100}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEmpForCalendar(item)}
                    className="w-full py-1.5 text-center text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Kalender Harian Pegawai</span>
                  </button>
                </div>
              ))}

              {filteredReports.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Tidak ada data laporan bulanan pada filter ini.
                </div>
              )}
            </div>

            {/* Desktop & Tablet Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-4 min-w-[200px]">Nama & NIP Personel</th>
                    <th className="py-3 px-3">Regu & Pos</th>
                    <th className="py-3 px-3">Tipe Jam Kerja</th>
                    <th className="py-3 px-3 text-center bg-slate-100/70 border-x border-slate-200/60" title="Target Hari Kerja dari Awal Bulan s.d Hari Ini">
                      Wajib Kerja
                    </th>
                    <th className="py-3 px-2.5 text-center text-emerald-800 bg-emerald-50/50" title="Hadir Tepat Waktu">H</th>
                    <th className="py-3 px-2.5 text-center text-amber-800 bg-amber-50/50" title="Terlambat">T</th>
                    <th className="py-3 px-2.5 text-center text-indigo-800 bg-indigo-50/50" title="Izin">I</th>
                    <th className="py-3 px-2.5 text-center text-purple-800 bg-purple-50/50" title="Sakit">S</th>
                    <th className="py-3 px-2.5 text-center text-rose-800 bg-rose-50/60 font-black" title="Tanpa Keterangan / Alpha">TK</th>
                    <th className="py-3 px-2.5 text-center text-cyan-800 bg-cyan-50/50" title="Pemutihan (HP Rusak / Penugasan Sah)">P</th>
                    <th className="py-3 px-4 text-center min-w-[130px]">
                      % Kehadiran
                    </th>
                    <th className="py-3 px-3 text-center">Jam Kerja</th>
                    <th className="py-3 px-4 min-w-[160px]">Pola & Evaluasi</th>
                    <th className="py-3 px-3 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((item, idx) => {
                    const attRate = item.attendanceRate ?? 100;
                    return (
                      <tr 
                        key={item.employeeId} 
                        className={`hover:bg-slate-50/90 transition-colors ${
                          (item.tanpaKeteranganCount ?? 0) > 0 ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {/* No */}
                        <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Personel */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{item.employeeName}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="text-amber-700 font-semibold">{item.employeeId}</span>
                            <span>·</span>
                            <span>NIP: {item.nip}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{item.role}</div>
                        </td>

                        {/* Regu & Pos */}
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px] mb-1">
                            {item.regu}
                          </span>
                          <span className="font-medium text-slate-700 block truncate max-w-[170px] text-[11px]" title={item.locationName}>
                            Slot {item.locationSlotId}: {item.locationName.replace(/^Slot \d+:\s*/, '')}
                          </span>
                        </td>

                        {/* Tipe Kerja */}
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${
                            item.scheduleType === 'shift' 
                              ? 'bg-amber-50 border-amber-200 text-amber-800' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            {item.scheduleType === 'shift' ? 'Shift 12 Jam' : 'Harian'}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            {item.scheduleType === 'shift' ? 'P-M-L-L Dinamis' : 'Senin - Jumat'}
                          </span>
                        </td>

                        {/* Target Wajib Kerja */}
                        <td className="py-3 px-3 text-center bg-slate-50/60 border-x border-slate-200/60 font-mono font-bold text-slate-800">
                          <span className="text-sm">{item.targetWorkDays ?? 0}</span>
                          <span className="text-[9.5px] text-slate-500 block">Hari</span>
                        </td>

                        {/* H (Hadir) */}
                        <td className="py-3 px-2.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                          {item.hadirCount ?? item.totalPresentDays}
                        </td>

                        {/* T (Terlambat) */}
                        <td className="py-3 px-2.5 text-center font-mono text-xs bg-amber-50/20">
                          {(item.lateCount ?? item.totalLateCount) > 0 ? (
                            <span className="font-bold text-amber-700 px-1.5 py-0.5 bg-amber-100 rounded">
                              {item.lateCount ?? item.totalLateCount}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* I (Izin) */}
                        <td className="py-3 px-2.5 text-center font-mono text-xs bg-indigo-50/20">
                          {(item.izinCount ?? 0) > 0 ? (
                            <span className="font-bold text-indigo-700 px-1.5 py-0.5 bg-indigo-100 rounded">
                              {item.izinCount}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* S (Sakit) */}
                        <td className="py-3 px-2.5 text-center font-mono text-xs bg-purple-50/20">
                          {(item.sakitCount ?? 0) > 0 ? (
                            <span className="font-bold text-purple-700 px-1.5 py-0.5 bg-purple-100 rounded">
                              {item.sakitCount}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* TK (Tanpa Keterangan) */}
                        <td className="py-3 px-2.5 text-center font-mono text-xs bg-rose-50/30">
                          {(item.tanpaKeteranganCount ?? 0) > 0 ? (
                            <span className="font-black text-rose-700 px-1.5 py-0.5 bg-rose-200 rounded animate-pulse">
                              {item.tanpaKeteranganCount}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">0</span>
                          )}
                        </td>

                        {/* P (Pemutihan) */}
                        <td className="py-3 px-2.5 text-center font-mono text-xs bg-cyan-50/20">
                          {(item.pemutihanCount ?? 0) > 0 ? (
                            <span className="font-bold text-cyan-800 px-1.5 py-0.5 bg-cyan-100 rounded">
                              {item.pemutihanCount}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Persentase Kehadiran (%) */}
                        <td className="py-3 px-4 text-center">
                          <div className="space-y-1">
                            <span className={`inline-block font-mono font-black text-sm px-2.5 py-0.5 rounded-full border ${
                              attRate >= 90
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : attRate >= 75
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {attRate}%
                            </span>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden max-w-[90px] mx-auto">
                              <div
                                className={`h-full rounded-full ${
                                  attRate >= 90
                                    ? 'bg-emerald-500'
                                    : attRate >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${attRate}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 block">
                              Sah: {item.totalHadirSah ?? 0} dari {item.targetWorkDays ?? 0}h
                            </span>
                          </div>
                        </td>

                        {/* Jam Kerja */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-black text-slate-800 text-xs">
                            {item.totalWorkHours} Jam
                          </span>
                        </td>

                        {/* Pola & Evaluasi */}
                        <td className="py-3 px-4">
                          <div className="text-[11px] text-slate-700 font-medium leading-tight">
                            {item.attendancePattern}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Disiplin Jam: <strong className="font-mono">{item.disciplineRate}%</strong>
                          </div>
                        </td>

                        {/* Detail Modal Action */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedEmpForCalendar(item)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors shadow-2xs"
                            title="Buka Kalender Rincian Harian Pegawai (1-31)"
                          >
                            <CalendarDays className="w-4 h-4 text-amber-700" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* TAMPILAN 2: MATRIKS HARIAN PRESENSI (1 s/d 31)                 */}
        {/* ============================================================== */}
        {viewMode === 'matrix' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
              <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold border-b border-slate-300 select-none">
                <tr>
                  <th className="py-2.5 px-2 text-center w-8 border-r border-slate-200 sticky left-0 bg-slate-100 z-10">No</th>
                  <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-200 sticky left-8 bg-slate-100 z-10">Nama Personel</th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200">Regu</th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200">Jadwal</th>

                  {/* Day Columns 1..daysInSelectedMonth */}
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => {
                    const dayDate = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                    const [y, m, d] = dayDate.split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    const dayIdx = dt.getDay();
                    const dayShort = INDONESIAN_DAY_NAMES[dayIdx].substring(0, 3);
                    const isSunday = dayIdx === 0;
                    const isSaturday = dayIdx === 6;

                    return (
                      <th 
                        key={day} 
                        className={`py-1.5 px-1 text-center w-8 border-r border-slate-200 text-[9.5px] ${
                          isSunday ? 'bg-rose-100/70 text-rose-800' : isSaturday ? 'bg-slate-200/60 text-slate-700' : 'bg-slate-100'
                        }`}
                        title={`${INDONESIAN_DAY_NAMES[dayIdx]}, ${day} ${availableMonths.find(m => m.value === selectedMonth)?.label}`}
                      >
                        <div className="font-bold text-slate-900 font-mono text-[10px]">{day}</div>
                        <div className="text-[8px] text-slate-500 font-sans uppercase">{dayShort}</div>
                      </th>
                    );
                  })}

                  <th className="py-2.5 px-2 text-center w-12 border-l border-slate-200 font-bold bg-emerald-50 text-emerald-800">H</th>
                  <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200 font-bold bg-indigo-50 text-indigo-800">I</th>
                  <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200 font-bold bg-purple-50 text-purple-800">S</th>
                  <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200 font-black bg-rose-50 text-rose-800">TK</th>
                  <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200 font-bold bg-cyan-50 text-cyan-800">P</th>
                  <th className="py-2.5 px-2 text-center w-14 font-black bg-slate-200 text-slate-900">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredReports.map((item, idx) => {
                  const dailyMap = new Map((item.dailyBreakdown || []).map(d => [d.dayNumber, d]));

                  return (
                    <tr key={item.employeeId} className="hover:bg-amber-50/30 transition-colors">
                      {/* No */}
                      <td className="py-2 px-1 text-center font-mono text-slate-400 font-bold border-r border-slate-200 sticky left-0 bg-white">
                        {idx + 1}
                      </td>

                      {/* Nama */}
                      <td className="py-2 px-3 border-r border-slate-200 sticky left-8 bg-white max-w-[180px]">
                        <button
                          type="button"
                          onClick={() => setSelectedEmpForCalendar(item)}
                          className="text-left font-bold text-slate-900 hover:text-amber-700 truncate block text-[11px]"
                          title="Klik untuk melihat kalender lengkap"
                        >
                          {item.employeeName}
                        </button>
                        <span className="text-[9px] text-slate-500 font-mono block">NIP: {item.nip}</span>
                      </td>

                      {/* Regu */}
                      <td className="py-2 px-1 text-center font-semibold text-slate-700 border-r border-slate-200 text-[10px]">
                        {item.regu}
                      </td>

                      {/* Jadwal */}
                      <td className="py-2 px-1 text-center border-r border-slate-200">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          item.scheduleType === 'shift' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.scheduleType === 'shift' ? 'Shift' : 'Harian'}
                        </span>
                      </td>

                      {/* Days 1..N */}
                      {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => {
                        const dayStatus = dailyMap.get(day);
                        const code = dayStatus?.code || '-';
                        const badge = getStatusCodeBadge(code);

                        return (
                          <td 
                            key={day} 
                            className="p-0.5 text-center border-r border-slate-100 select-none"
                            title={`${dayStatus?.dayName || ''}, ${day}: ${dayStatus?.codeLabel || ''} (${dayStatus?.scheduleLabel || ''})`}
                          >
                            <div className={`w-6 h-6 mx-auto rounded flex items-center justify-center font-mono font-bold text-[9.5px] border ${badge.bg} ${badge.border}`}>
                              {badge.shortLabel}
                            </div>
                          </td>
                        );
                      })}

                      {/* H, I, S, TK, P, % */}
                      <td className="py-2 px-1 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40 border-l border-slate-200 text-[10.5px]">
                        {item.hadirCount ?? item.totalPresentDays}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-bold text-indigo-800 bg-indigo-50/40 border-r border-slate-200 text-[10.5px]">
                        {item.izinCount || '-'}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-bold text-purple-800 bg-purple-50/40 border-r border-slate-200 text-[10.5px]">
                        {item.sakitCount || '-'}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-black text-rose-800 bg-rose-50/50 border-r border-slate-200 text-[10.5px]">
                        {(item.tanpaKeteranganCount ?? 0) > 0 ? (
                          <span className="bg-rose-200 px-1 py-0.5 rounded text-rose-900">{item.tanpaKeteranganCount}</span>
                        ) : '0'}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-bold text-cyan-800 bg-cyan-50/40 border-r border-slate-200 text-[10.5px]">
                        {item.pemutihanCount || '-'}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-black text-slate-900 bg-slate-100 text-[11px]">
                        {item.attendanceRate ?? 100}%
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* MODAL RINCIAN KALENDER PRESENSI HARIAN PERSONEL (1-31)         */}
      {/* ============================================================== */}
      {selectedEmpForCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-white/20 text-white border border-white/30 uppercase">
                    Rincian Presensi Harian
                  </span>
                  <span className="text-xs text-amber-200 font-mono">
                    {availableMonths.find(m => m.value === selectedMonth)?.label}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold">
                  {selectedEmpForCalendar.employeeName}
                </h3>
                <p className="text-xs text-amber-100 font-mono mt-0.5">
                  NIP: {selectedEmpForCalendar.nip} · {selectedEmpForCalendar.regu} · Slot {selectedEmpForCalendar.locationSlotId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmpForCalendar(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Header inside modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Jadwal</span>
                <span className={`font-bold text-xs ${
                  selectedEmpForCalendar.scheduleType === 'shift' ? 'text-amber-800' : 'text-emerald-800'
                }`}>
                  {selectedEmpForCalendar.scheduleType === 'shift' ? 'Shift 12 Jam' : 'Harian'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Wajib Kerja</span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {selectedEmpForCalendar.targetWorkDays ?? 0} Hari
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-emerald-700 block font-semibold">Hadir (H)</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {selectedEmpForCalendar.hadirCount ?? selectedEmpForCalendar.totalPresentDays} Hari
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-indigo-700 block font-semibold">Izin (I) / S</span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {selectedEmpForCalendar.izinCount ?? 0}I · {selectedEmpForCalendar.sakitCount ?? 0}S
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-rose-700 block font-bold">Tanpa Ket. (TK)</span>
                <span className={`font-mono font-black text-xs ${
                  (selectedEmpForCalendar.tanpaKeteranganCount ?? 0) > 0 ? 'text-rose-700' : 'text-slate-400'
                }`}>
                  {selectedEmpForCalendar.tanpaKeteranganCount ?? 0} Hari
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">% Kehadiran</span>
                <span className={`font-mono font-black text-xs ${
                  (selectedEmpForCalendar.attendanceRate ?? 100) >= 90 ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {selectedEmpForCalendar.attendanceRate ?? 100}%
                </span>
              </div>
            </div>

            {/* Modal Body: Day-by-Day Calendar List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Rincian Presensi Tanggal 1 s/d {daysInSelectedMonth}:</span>
                <span className="text-slate-500 font-normal">
                  S = Sakit · I = Izin · TK = Tanpa Keterangan · P = Pemutihan · H = Hadir · L = Libur
                </span>
              </div>

              <div className="space-y-1.5">
                {(selectedEmpForCalendar.dailyBreakdown || []).map((day) => {
                  const badge = getStatusCodeBadge(day.code);
                  return (
                    <div 
                      key={day.date}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        day.code === 'TK' 
                          ? 'bg-rose-50/70 border-rose-200' 
                          : day.code === 'P'
                          ? 'bg-cyan-50/50 border-cyan-200'
                          : day.code === 'S'
                          ? 'bg-purple-50/50 border-purple-200'
                          : day.code === 'I'
                          ? 'bg-indigo-50/50 border-indigo-200'
                          : day.code === 'H' || day.code === 'T'
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-lg border font-mono font-black text-xs flex items-center justify-center shrink-0 ${badge.bg} ${badge.border}`}>
                          {badge.shortLabel}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{day.dayName}, {day.dayNumber} {INDONESIAN_MONTH_NAMES[parseInt(selectedMonth.split('-')[1], 10) - 1]}</span>
                            <span className="text-slate-400 font-normal">·</span>
                            <span className="text-[10px] text-slate-500 font-normal">{day.scheduleLabel}</span>
                          </div>
                          <div className="text-[10.5px] text-slate-600 mt-0.5 truncate">
                            {day.notes || day.codeLabel}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {day.record?.checkInTime ? (
                          <div className="font-mono text-[11px] font-bold text-slate-800">
                            Masuk: {day.record.checkInTime}
                            {day.record.checkOutTime && day.record.checkOutTime !== '-' && (
                              <span className="text-slate-500 font-normal"> · Pulang: {day.record.checkOutTime}</span>
                            )}
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.bg}`}>
                            {badge.tooltip}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Sistem pintar otomatis memperbarui rekap apabila admin mengganti jadwal kerja pegawai.
              </span>
              <button
                type="button"
                onClick={() => setSelectedEmpForCalendar(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ARCHIVE & CLEANUP MODAL                                        */}
      {/* ============================================================== */}
      {isArchiveModalOpen && onExecuteArchive && (
        <ArchiveCleanupModal
          isOpen={isArchiveModalOpen}
          attendanceRecords={attendanceRecords}
          onClose={() => setIsArchiveModalOpen(false)}
          onExecuteArchive={onExecuteArchive}
        />
      )}

      {/* ============================================================== */}
      {/* RESET MONTHLY ATTENDANCE MODAL                                 */}
      {/* ============================================================== */}
      {isResetMonthlyModalOpen && onResetMonthlyAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setIsResetMonthlyModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Rekapitulasi Presensi</h3>
                <p className="text-xs text-slate-500">Kosongkan data absensi periode berjalan</p>
              </div>
            </div>

            {resetMonthSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold text-center mb-4">
                {resetMonthSuccessMsg}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Bulan yang Ditarget:</span>
                    <span className="font-bold text-amber-700 font-sans">{selectedMonthLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Data Presensi:</span>
                    <span className="font-bold text-slate-900">{currentMonthRecords.length} Rekaman</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Jam Kerja:</span>
                    <span className="text-slate-700">{Math.round(totalAccumulatedHours)} Jam Dinas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Keterlambatan:</span>
                    <span className="text-rose-700">{totalLateOccurrences} Kali</span>
                  </div>
                </div>

                {/* Quick CSV export before reset */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-600">
                    <span className="text-slate-900 font-semibold block">Cadangkan Data Sebelum Reset</span>
                    Simpan salinan CSV untuk arsip dinas Anda.
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Unduh CSV</span>
                  </button>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 leading-relaxed text-[11px]">
                  <span className="font-bold block text-rose-900 mb-0.5">⚠️ Peringatan Penting:</span>
                  Tindakan ini akan menghapus seluruh data kehadiran, akumulasi jam kerja, dan catatan presensi untuk bulan <strong>{selectedMonthLabel}</strong>. Statistik bulanan periode ini akan di-reset kembali ke 0.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isResettingMonth}
                    onClick={() => setIsResetMonthlyModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isResettingMonth || currentMonthRecords.length === 0}
                    onClick={handleConfirmResetMonthly}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {isResettingMonth ? (
                      <span>Memproses...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset Rekap ({currentMonthRecords.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
