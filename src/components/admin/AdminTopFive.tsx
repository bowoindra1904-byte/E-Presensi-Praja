import React, { useState, useMemo } from 'react';
import { Employee, WorkLocation, AttendanceRecord, LeaveRequest, ReguType, ScheduleType } from '../../types';
import { 
  Trophy, 
  Award, 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Users, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  Sparkles, 
  Search, 
  Building2, 
  Medal, 
  X,
  FileText,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  UserX,
  UserCheck
} from 'lucide-react';
import { 
  calculateSmartMonthlyReport, 
  SmartMonthlyReportResult,
  getStatusCodeBadge,
  INDONESIAN_MONTH_NAMES
} from '../../utils/smartAttendanceCalculator';

interface AdminTopFiveProps {
  employees: Employee[];
  locations: WorkLocation[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  onOpenPrintMenu?: (menu: 'monthly') => void;
}

export const AdminTopFive: React.FC<AdminTopFiveProps> = ({
  employees,
  locations,
  attendanceRecords,
  leaveRequests = [],
  onOpenPrintMenu
}) => {
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedRegu, setSelectedRegu] = useState<string>('all');
  const [selectedSlot, setSelectedSlot] = useState<string>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'tepat_waktu' | 'terlambat' | 'tk'>('all');

  // Detail Modal State
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<SmartMonthlyReportResult | null>(null);

  const availableMonths = [
    { value: '2026-10', label: 'Oktober 2026' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'Agustus 2026' },
    { value: '2026-07', label: 'Juli 2026' },
    { value: '2026-06', label: 'Juni 2026' },
  ];

  // Calculate smart monthly metrics for all employees in selected month
  const allMonthlyReports: SmartMonthlyReportResult[] = useMemo(() => {
    return employees.map((emp) => {
      return calculateSmartMonthlyReport(
        emp,
        selectedMonth,
        attendanceRecords,
        leaveRequests,
        locations
      );
    });
  }, [employees, selectedMonth, attendanceRecords, leaveRequests, locations]);

  // Filter based on controls
  const filteredReports = useMemo(() => {
    return allMonthlyReports.filter((item) => {
      const matchRegu = selectedRegu === 'all' || item.regu === selectedRegu;
      const matchSlot = selectedSlot === 'all' || 
        String(item.locationSlotId) === String(selectedSlot) || 
        Number(item.locationSlotId) === Number(selectedSlot);
      const matchSchedule = selectedSchedule === 'all' || item.scheduleType === selectedSchedule;
      const matchSearch = 
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nip.includes(searchQuery) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase());

      return matchRegu && matchSlot && matchSchedule && matchSearch;
    });
  }, [allMonthlyReports, selectedRegu, selectedSlot, selectedSchedule, searchQuery]);

  // 1. TOP 5 PALING TEPAT WAKTU (Teladan Disiplin)
  // Diurutkan berdasarkan: onTimeCount terbanyak, tie-breaker: disciplineRate tertinggi, lateCount terkecil, tk terkecil
  const topFiveTepatWaktu = useMemo(() => {
    return [...filteredReports]
      .sort((a, b) => {
        if (b.onTimeCount !== a.onTimeCount) return b.onTimeCount - a.onTimeCount;
        if (b.disciplineRate !== a.disciplineRate) return b.disciplineRate - a.disciplineRate;
        if (a.lateCount !== b.lateCount) return a.lateCount - b.lateCount;
        return a.tanpaKeteranganCount - b.tanpaKeteranganCount;
      })
      .slice(0, 5);
  }, [filteredReports]);

  // 2. TOP 5 PALING SERING TERLAMBAT
  // Diurutkan berdasarkan: lateCount terbanyak
  const topFiveTerlambat = useMemo(() => {
    return [...filteredReports]
      .sort((a, b) => {
        if (b.lateCount !== a.lateCount) return b.lateCount - a.lateCount;
        return a.disciplineRate - b.disciplineRate;
      })
      .slice(0, 5);
  }, [filteredReports]);

  // 3. TOP 5 PALING SERING TANPA KETERANGAN (TK / ALPHA)
  // Diurutkan berdasarkan: tanpaKeteranganCount terbanyak, tie-breaker: attendanceRate terendah
  const topFiveTK = useMemo(() => {
    return [...filteredReports]
      .sort((a, b) => {
        if (b.tanpaKeteranganCount !== a.tanpaKeteranganCount) {
          return b.tanpaKeteranganCount - a.tanpaKeteranganCount;
        }
        return a.attendanceRate - b.attendanceRate;
      })
      .slice(0, 5);
  }, [filteredReports]);

  // Export CSV Top Five
  const handleExportCSV = () => {
    const selectedMonthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const lines: string[] = [];

    lines.push(`LAPORAN KHUSUS TOP FIVE DISIPLIN & PELANGGARAN PRESENSI PERSONEL SATPOL PP`);
    lines.push(`Periode: ${selectedMonthLabel}`);
    lines.push(``);

    lines.push(`=== TOP 5 PERSONEL PALING TEPAT WAKTU (TELADAN) ===`);
    lines.push(`Peringkat,NIP,Nama Personel,Pangkat,Regu,Pos Penugasan,Tepat Waktu (H),Terlambat (T),Disiplin %,Status`);
    topFiveTepatWaktu.forEach((p, idx) => {
      lines.push(`${idx + 1},"${p.nip}","${p.employeeName}","${p.rank}","${p.regu}","Slot ${p.locationSlotId}: ${p.locationName}",${p.onTimeCount},${p.lateCount},${p.disciplineRate}%,"Teladan Disiplin"`);
    });
    lines.push(``);

    lines.push(`=== TOP 5 PERSONEL PALING SERING TERLAMBAT ===`);
    lines.push(`Peringkat,NIP,Nama Personel,Pangkat,Regu,Pos Penugasan,Terlambat (T),Tepat Waktu (H),Disiplin %,Rekomendasi`);
    topFiveTerlambat.forEach((p, idx) => {
      lines.push(`${idx + 1},"${p.nip}","${p.employeeName}","${p.rank}","${p.regu}","Slot ${p.locationSlotId}: ${p.locationName}",${p.lateCount},${p.onTimeCount},${p.disciplineRate}%,"Pembinaan Ketepatan Waktu"`);
    });
    lines.push(``);

    lines.push(`=== TOP 5 PERSONEL PALING SERING TANPA KETERANGAN (TK / ALPHA) ===`);
    lines.push(`Peringkat,NIP,Nama Personel,Pangkat,Regu,Pos Penugasan,Tanpa Keterangan (TK),Wajib Kerja,Kehadiran %,Rekomendasi`);
    topFiveTK.forEach((p, idx) => {
      lines.push(`${idx + 1},"${p.nip}","${p.employeeName}","${p.rank}","${p.regu}","Slot ${p.locationSlotId}: ${p.locationName}",${p.tanpaKeteranganCount},${p.targetWorkDays},${p.attendanceRate}%,"Tindakan Disiplin Provost"`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + lines.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_TOP_FIVE_Presensi_Satpol_PP_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRankBadgeStyle = (rankIndex: number) => {
    switch (rankIndex) {
      case 0:
        return {
          badge: 'bg-amber-400 text-amber-950 ring-2 ring-amber-300 shadow-sm font-black',
          medal: '🥇',
          label: 'Juara 1'
        };
      case 1:
        return {
          badge: 'bg-slate-300 text-slate-900 ring-2 ring-slate-200 shadow-sm font-black',
          medal: '🥈',
          label: 'Peringkat 2'
        };
      case 2:
        return {
          badge: 'bg-amber-700 text-amber-100 ring-2 ring-amber-600 shadow-sm font-black',
          medal: '🥉',
          label: 'Peringkat 3'
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-700 font-bold border border-slate-300',
          medal: `#${rankIndex + 1}`,
          label: `Peringkat ${rankIndex + 1}`
        };
    }
  };

  const selectedMonthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs">
              Executive Leaderboard
            </span>
            <span className="text-xs text-slate-500 font-mono">Satpol PP Bangka Barat</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            TOP FIVE Presensi Personel Satpol PP
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pemantauan 5 Personel teratas untuk kategori <strong>Tepat Waktu (Teladan)</strong>, <strong>Sering Terlambat</strong>, dan <strong>Tanpa Keterangan (TK / Alpha)</strong> guna keperluan evaluasi pembinaan dan reward disiplin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Ekspor Leaderboard (CSV)
          </button>
          {onOpenPrintMenu && (
            <button
              type="button"
              onClick={() => onOpenPrintMenu('monthly')}
              className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen Resmi
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Periode Bulan */}
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
              <option value="all">Semua Regu (1-4 & Harian)</option>
              <option value="Regu 1">Regu 1</option>
              <option value="Regu 2">Regu 2</option>
              <option value="Regu 3">Regu 3</option>
              <option value="Regu 4">Regu 4</option>
              <option value="Harian">Regu Harian</option>
            </select>
          </div>

          {/* Pos Lokasi */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-600" />
              Slot Pos Penugasan
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Pos ({locations.length} Slot)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                </option>
              ))}
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
              <option value="all">Semua Tipe Kerja</option>
              <option value="shift">Shift (12 Jam)</option>
              <option value="harian">Harian (Senin-Jumat)</option>
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
              placeholder="Cari nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        {/* Category Tabs Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter Kategori:</span>
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeCategory === 'all' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Semua (3 Kolom)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('tepat_waktu')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeCategory === 'tepat_waktu' 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Top Tepat Waktu</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('terlambat')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeCategory === 'terlambat' 
                    ? 'bg-amber-600 text-white shadow-2xs' 
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Top Terlambat</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('tk')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeCategory === 'tk' 
                    ? 'bg-rose-600 text-white shadow-2xs' 
                    : 'text-rose-800 hover:text-rose-950'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Top TK (Alpha)</span>
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-mono font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-800">
            Periode: {selectedMonthLabel}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3 TOP FIVE SECTIONS                                            */}
      {/* ============================================================== */}
      <div className={`grid gap-6 ${
        activeCategory === 'all' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
      }`}>
        
        {/* ============================================================ */}
        {/* KOLOM 1: TOP 5 PALING TEPAT WAKTU (TELADAN)                   */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'tepat_waktu') && (
          <div className="bg-white border-2 border-emerald-300 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
            {/* Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                    <Trophy className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>Top 5 Tepat Waktu</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                        Teladan
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Personel paling disiplin & konsisten tepat waktu</p>
                  </div>
                </div>
              </div>

              {/* List Cards */}
              <div className="space-y-3 mt-4">
                {topFiveTepatWaktu.map((emp, idx) => {
                  const rank = getRankBadgeStyle(idx);
                  return (
                    <div 
                      key={emp.employeeId}
                      onClick={() => setSelectedEmployeeDetail(emp)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                        idx === 0 
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30' 
                          : 'bg-white border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${rank.badge}`}>
                            {rank.medal}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {emp.employeeName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP: {emp.nip} · {emp.regu}
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                              Slot {emp.locationSlotId}: {emp.locationName.replace(/^Slot \d+:\s*/, '')}
                            </div>
                          </div>
                        </div>

                        {/* Metric Badge */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-emerald-700 text-sm">
                            {emp.onTimeCount}x Hadir
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            {emp.disciplineRate}% Disiplin
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 mt-2 border-t border-slate-100">
                        <span>Terlambat: <strong className="text-slate-800">{emp.lateCount}x</strong></span>
                        <span>Total Jam: <strong className="text-amber-800 font-mono">{emp.totalWorkHours}j</strong></span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Detail
                        </span>
                      </div>
                    </div>
                  );
                })}

                {topFiveTepatWaktu.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Belum ada data kehadiran tepat waktu pada filter ini.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100 text-[11px] text-emerald-800 flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold">
                <Medal className="w-3.5 h-3.5 text-amber-500" />
                Rekomendasi Piagam Disiplin
              </span>
              <span className="text-[10px] text-slate-500">Standar BKD/Provost</span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* KOLOM 2: TOP 5 PALING SERING TERLAMBAT                        */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'terlambat') && (
          <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
            {/* Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-amber-100 text-amber-800">
                    <Clock className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>Top 5 Sering Terlambat</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono">
                        Pembinaan
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Personel dengan frekuensi keterlambatan terbanyak</p>
                  </div>
                </div>
              </div>

              {/* List Cards */}
              <div className="space-y-3 mt-4">
                {topFiveTerlambat.map((emp, idx) => {
                  const rank = getRankBadgeStyle(idx);
                  return (
                    <div 
                      key={emp.employeeId}
                      onClick={() => setSelectedEmployeeDetail(emp)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                        emp.lateCount > 0 
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-400/20' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${rank.badge}`}>
                            {rank.medal}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {emp.employeeName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP: {emp.nip} · {emp.regu}
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                              Slot {emp.locationSlotId}: {emp.locationName.replace(/^Slot \d+:\s*/, '')}
                            </div>
                          </div>
                        </div>

                        {/* Metric Badge */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-amber-800 text-sm">
                            {emp.lateCount}x Terlambat
                          </div>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            {emp.disciplineRate}% Tepat
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 mt-2 border-t border-slate-100">
                        <span>Tepat Waktu: <strong className="text-emerald-700">{emp.onTimeCount}x</strong></span>
                        <span>Jadwal: <strong className="text-slate-800">{emp.scheduleType === 'shift' ? 'Shift 12J' : 'Harian'}</strong></span>
                        <span className="text-amber-800 font-semibold flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Log Absen
                        </span>
                      </div>
                    </div>
                  );
                })}

                {topFiveTerlambat.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Nihil keterlambatan pada periode ini.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-100 text-[11px] text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Perlu Pembinaan Danru / Provost
              </span>
              <span className="text-[10px] text-slate-500">Teguran Lisan / Tertulis</span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* KOLOM 3: TOP 5 PALING SERING TANPA KETERANGAN (TK / ALPHA)   */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'tk') && (
          <div className="bg-white border-2 border-rose-300 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
            {/* Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />
            
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-rose-100 text-rose-800">
                    <AlertOctagon className="w-5 h-5 text-rose-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>Top 5 Tanpa Ket. (TK)</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-100 text-rose-900 font-mono">
                        Tindakan Disiplin
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Personel tidak hadir tanpa surat izin / sakit sah</p>
                  </div>
                </div>
              </div>

              {/* List Cards */}
              <div className="space-y-3 mt-4">
                {topFiveTK.map((emp, idx) => {
                  const rank = getRankBadgeStyle(idx);
                  return (
                    <div 
                      key={emp.employeeId}
                      onClick={() => setSelectedEmployeeDetail(emp)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                        emp.tanpaKeteranganCount > 0 
                          ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-400/20' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${rank.badge}`}>
                            {rank.medal}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {emp.employeeName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP: {emp.nip} · {emp.regu}
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                              Slot {emp.locationSlotId}: {emp.locationName.replace(/^Slot \d+:\s*/, '')}
                            </div>
                          </div>
                        </div>

                        {/* Metric Badge */}
                        <div className="text-right shrink-0">
                          <div className={`font-mono font-black text-sm ${
                            emp.tanpaKeteranganCount > 0 ? 'text-rose-700 animate-pulse' : 'text-slate-400'
                          }`}>
                            {emp.tanpaKeteranganCount} Hari TK
                          </div>
                          <span className="text-[10px] font-black text-rose-900 bg-rose-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            {emp.attendanceRate}% Kehadiran
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 mt-2 border-t border-slate-100">
                        <span>Wajib Kerja: <strong className="text-slate-800">{emp.targetWorkDays}h</strong></span>
                        <span>Hadir Sah: <strong className="text-emerald-700">{emp.totalHadirSah}h</strong></span>
                        <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Rekap Provost
                        </span>
                      </div>
                    </div>
                  );
                })}

                {topFiveTK.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Nihil pelanggaran TK pada periode ini.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-rose-100 text-[11px] text-rose-900 flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Rekomendasi Sidang Provost Satpol PP
              </span>
              <span className="text-[10px] text-slate-500">Pasal 14 PP No. 94/2021</span>
            </div>
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* MODAL DETAIL PERSONEL KALENDER HARIAN                          */}
      {/* ============================================================== */}
      {selectedEmployeeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-white/20 text-white uppercase">
                    Audit Presensi & Disiplin
                  </span>
                  <span className="text-xs text-amber-200 font-mono">
                    {selectedMonthLabel}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold">
                  {selectedEmployeeDetail.employeeName}
                </h3>
                <p className="text-xs text-amber-100 font-mono mt-0.5">
                  NIP: {selectedEmployeeDetail.nip} · {selectedEmployeeDetail.regu} · Slot {selectedEmployeeDetail.locationSlotId}: {selectedEmployeeDetail.locationName.replace(/^Slot \d+:\s*/, '')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeDetail(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Tepat Waktu (H)</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {selectedEmployeeDetail.onTimeCount} Hari
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Terlambat (T)</span>
                <span className="font-mono font-bold text-amber-700 text-xs">
                  {selectedEmployeeDetail.lateCount} Kali
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-rose-700 block font-bold">Tanpa Ket. (TK)</span>
                <span className="font-mono font-black text-rose-700 text-xs">
                  {selectedEmployeeDetail.tanpaKeteranganCount} Hari
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Pemutihan (P)</span>
                <span className="font-mono font-bold text-cyan-800 text-xs">
                  {selectedEmployeeDetail.pemutihanCount} Hari
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">% Kehadiran</span>
                <span className="font-mono font-black text-slate-900 text-xs">
                  {selectedEmployeeDetail.attendanceRate}%
                </span>
              </div>
            </div>

            {/* List of daily breakdown */}
            <div className="p-4 overflow-y-auto space-y-1.5 flex-1">
              <div className="text-[11px] font-bold text-slate-700 mb-2">
                Rincian Riwayat Presensi Bulan Ini:
              </div>
              {selectedEmployeeDetail.dailyBreakdown.map((d) => {
                const badge = getStatusCodeBadge(d.code);
                return (
                  <div
                    key={d.date}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      d.code === 'TK'
                        ? 'bg-rose-50/70 border-rose-200'
                        : d.code === 'T'
                        ? 'bg-amber-50/60 border-amber-200'
                        : d.code === 'H'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : d.code === 'P'
                        ? 'bg-cyan-50/40 border-cyan-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${badge.bg}`}>
                        {badge.shortLabel}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs">
                          {d.dayName}, {d.dayNumber} {INDONESIAN_MONTH_NAMES[parseInt(selectedMonth.split('-')[1], 10) - 1]}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {d.scheduleLabel}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {d.record?.checkInTime ? (
                        <span className="font-mono text-[11px] font-bold text-slate-800">
                          {d.record.checkInTime}
                        </span>
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

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Data tersinkronisasi otomatis dengan aturan absensi Satpol PP Bangka Barat.
              </span>
              <button
                type="button"
                onClick={() => setSelectedEmployeeDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
