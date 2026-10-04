import React, { useState, useMemo } from 'react';
import { Employee, WorkLocation, AttendanceRecord, MonthlyEmployeeReport } from '../../types';
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
  X
} from 'lucide-react';
import { ArchiveCleanupModal } from './ArchiveCleanupModal';

interface MonthlyReportViewProps {
  employees: Employee[];
  locations: WorkLocation[];
  attendanceRecords: AttendanceRecord[];
  onOpenPrintMenu?: (menu: 'monthly') => void;
  onExecuteArchive?: (
    recordIds: string[], 
    mode: 'photos_only' | 'delete_all',
    cutoffLabel: string
  ) => Promise<void>;
  onResetMonthlyAttendance?: (recordIds: string[], monthLabel: string) => Promise<void>;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  employees,
  locations,
  attendanceRecords,
  onOpenPrintMenu,
  onExecuteArchive,
  onResetMonthlyAttendance,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedSlot, setSelectedSlot] = useState<string>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);

  // Reset Monthly Attendance Modal State
  const [isResetMonthlyModalOpen, setIsResetMonthlyModalOpen] = useState<boolean>(false);
  const [isResettingMonth, setIsResettingMonth] = useState<boolean>(false);
  const [resetMonthSuccessMsg, setResetMonthSuccessMsg] = useState<string>('');

  // Months available
  const availableMonths = [
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'Agustus 2026' },
    { value: '2026-07', label: 'Juli 2026' },
    { value: '2026-06', label: 'Juni 2026' },
  ];

  // Compute monthly report metrics for each employee
  const monthlyReports: MonthlyEmployeeReport[] = useMemo(() => {
    return employees.map((emp) => {
      const loc = locations.find(l => 
        String(l.id) === String(emp.locationSlotId) || 
        Number(l.slotNumber) === Number(emp.locationSlotId) || 
        Number(l.id) === Number(emp.locationSlotId)
      ) || locations[0];
      
      // Filter records for this employee in selected month
      const empRecords = attendanceRecords.filter(
        r => r.employeeId === emp.id && r.date.startsWith(selectedMonth)
      );

      const presentRecords = empRecords.filter(r => !!r.checkInTime);
      const totalPresentDays = presentRecords.length;
      
      // Calculate work hours
      let totalWorkHours = 0;
      presentRecords.forEach((r) => {
        if (r.checkInTime && r.checkOutTime) {
          const inParts = r.checkInTime.split(':').map(Number);
          const outParts = r.checkOutTime.split(':').map(Number);
          let hours = (outParts[0] + outParts[1] / 60) - (inParts[0] + inParts[1] / 60);
          if (hours < 0) hours += 24; // overnight shift
          totalWorkHours += hours;
        } else {
          // Standard day default if checkout in progress
          totalWorkHours += emp.scheduleType === 'shift' ? 12 : 8.5;
        }
      });

      const totalLateCount = presentRecords.filter(r => r.checkInStatus === 'terlambat').length;
      
      const onTimeCount = totalPresentDays - totalLateCount;
      const disciplineRate = totalPresentDays > 0 
        ? Math.round((onTimeCount / totalPresentDays) * 100) 
        : 100;

      let attendancePattern = "Disiplin Prima (100% Tepat Waktu)";
      if (disciplineRate < 70) {
        attendancePattern = "Perlu Tindakan Disiplin (Sering Terlambat)";
      } else if (disciplineRate < 85) {
        attendancePattern = "Perlu Evaluasi Pembinaan";
      } else if (disciplineRate < 100) {
        attendancePattern = "Kepatuhan Baik (Keterlambatan Ringan)";
      }

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        nip: emp.nip,
        rank: emp.rank,
        role: emp.role,
        regu: emp.regu,
        scheduleType: emp.scheduleType,
        locationSlotId: emp.locationSlotId,
        locationName: loc.name,
        totalPresentDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalLateCount,
        disciplineRate,
        attendancePattern,
        records: empRecords,
      };
    });
  }, [employees, locations, attendanceRecords, selectedMonth]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return monthlyReports.filter((item) => {
      const matchSlot = selectedSlot === 'all' || 
        String(item.locationSlotId) === String(selectedSlot) || 
        Number(item.locationSlotId) === Number(selectedSlot);
      const matchSchedule = selectedSchedule === 'all' || item.scheduleType === selectedSchedule;
      const matchSearch = 
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nip.includes(searchQuery) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSlot && matchSchedule && matchSearch;
    });
  }, [monthlyReports, selectedSlot, selectedSchedule, searchQuery]);

  // Aggregate monthly stats
  const totalAccumulatedHours = filteredReports.reduce((acc, curr) => acc + curr.totalWorkHours, 0);
  const avgWorkHours = filteredReports.length > 0 
    ? Math.round(totalAccumulatedHours / filteredReports.length) 
    : 0;
  const totalLateOccurrences = filteredReports.reduce((acc, curr) => acc + curr.totalLateCount, 0);
  const avgDisciplineRate = filteredReports.length > 0
    ? Math.round(filteredReports.reduce((acc, curr) => acc + curr.disciplineRate, 0) / filteredReports.length)
    : 100;

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "ID Personel", 
      "NIP", 
      "Nama Pegawai", 
      "Pangkat", 
      "Jabatan", 
      "Slot Penugasan", 
      "Tipe Jam Kerja", 
      "Hari Hadir", 
      "Total Jam Kerja", 
      "Jumlah Terlambat", 
      "Tingkat Disiplin (%)", 
      "Pola Absensi"
    ];

    const rows = filteredReports.map(r => [
      r.employeeId,
      `"${r.nip}"`,
      `"${r.employeeName}"`,
      `"${r.rank}"`,
      `"${r.role}"`,
      `"Slot ${r.locationSlotId}: ${r.locationName}"`,
      r.scheduleType.toUpperCase(),
      r.totalPresentDays,
      r.totalWorkHours,
      r.totalLateCount,
      `${r.disciplineRate}%`,
      `"${r.attendancePattern}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Absensi_Bulanan_Satpol_PP_${selectedMonth}.csv`);
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Laporan Absensi Bulanan Personel Satpol PP
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Rekapitulasi akumulasi jam kerja, tingkat keterlambatan, dan evaluasi pola presensi 150 personel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetMonthlyAttendance && (
            <button
              onClick={() => {
                setIsResetMonthlyModalOpen(true);
                setResetMonthSuccessMsg('');
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 hover:text-white rounded-xl border border-rose-800/60 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Reset dan kosongkan seluruh data rekapitulasi presensi pada bulan yang dipilih"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Rekap Bulan Ini</span>
            </button>
          )}
          {onExecuteArchive && (
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 hover:text-white rounded-xl border border-emerald-700/60 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Arsipkan dan bersihkan data presensi lama lebih dari 6 bulan"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arsip & Bersihkan &gt; 6 Bulan</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Ekspor Excel / CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            title="Atur tanggal pengesahan, alamat kota dan pejabat penanda tangan"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <span>Atur Tanggal & Penanda Tangan</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Dokumen Resmi
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Jam Kerja</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{Math.round(totalAccumulatedHours)}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Jam Terakumulasi</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Rata-Rata Jam / Orang</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">{avgWorkHours}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Jam Dinas / Personel</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Keterlambatan</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">{totalLateOccurrences}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Insiden Bulan Ini</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tingkat Disiplin Satpol PP</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{avgDisciplineRate}%</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Kepatuhan Waktu Masuk</span>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Periode Waktu / Bulan */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-500" />
              Periode Waktu
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Unit / Pos Penempatan */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-500" />
              Unit / Slot Pos Penempatan
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Unit ({locations.length} Slot Pos)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                </option>
              ))}
            </select>
          </div>

          {/* Tipe Jam Kerja */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              Tipe Jam Kerja
            </label>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Tipe (Shift & Harian)</option>
              <option value="shift">Shift (12 Jam)</option>
              <option value="harian">Harian (Kantor/Dinas)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-amber-500" />
              Cari Nama / NIP
            </label>
            <input
              type="text"
              placeholder="Cari personel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Menampilkan rekapitulasi <strong className="text-white">{filteredReports.length}</strong> personel</span>
          <span className="font-mono text-amber-400 font-bold">Periode: {availableMonths.find(m => m.value === selectedMonth)?.label}</span>
        </div>
      </div>

      {/* Main Monthly Report Content: Mobile Cards + Desktop Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        
        {/* Mobile View: HP Card List */}
        <div className="sm:hidden p-3 space-y-3">
          {filteredReports.map((item) => (
            <div key={item.employeeId} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs truncate">{item.employeeName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">NIP: {item.nip} · {item.employeeId}</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">{item.role}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  item.scheduleType === 'shift' 
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}>
                  {item.scheduleType === 'shift' ? 'Shift' : 'Harian'}
                </span>
              </div>

              <div className="text-[10.5px] text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Pos Penugasan: </span>
                <span className="font-semibold text-white">Slot {item.locationSlotId}: {item.locationName.replace(/^Slot \d+:\s*/, '')}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-[9.5px] text-slate-400 block">Hadir</span>
                  <span className="font-mono font-bold text-white text-xs">{item.totalPresentDays} Hari</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-[9.5px] text-slate-400 block">Jam Kerja</span>
                  <span className="font-mono font-bold text-amber-400 text-xs">{item.totalWorkHours}j</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-[9.5px] text-slate-400 block">Terlambat</span>
                  <span className={`font-mono font-bold text-xs ${
                    item.totalLateCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {item.totalLateCount}x
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-300 truncate max-w-[200px]">{item.attendancePattern}</span>
                  <span className="font-mono font-bold text-white">{item.disciplineRate}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.disciplineRate >= 90
                        ? 'bg-emerald-500'
                        : item.disciplineRate >= 75
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.disciplineRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              Tidak ada data laporan bulanan pada filter ini.
            </div>
          )}
        </div>

        {/* Desktop & Tablet Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama & NIP Personel</th>
                <th className="py-3 px-4">Unit Penempatan</th>
                <th className="py-3 px-4">Tipe Kerja</th>
                <th className="py-3 px-4 text-center">Hari Hadir</th>
                <th className="py-3 px-4 text-center">Total Jam Kerja</th>
                <th className="py-3 px-4 text-center">Keterlambatan</th>
                <th className="py-3 px-4">Pola & Tingkat Disiplin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReports.map((item) => (
                <tr key={item.employeeId} className="hover:bg-slate-800/40 transition-colors">
                  
                  {/* Personel */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white text-sm">{item.employeeName}</div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span className="text-amber-400 font-semibold">{item.employeeId}</span>
                      <span>·</span>
                      <span>NIP: {item.nip}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{item.role}</div>
                  </td>

                  {/* Unit */}
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-200 block truncate max-w-[190px]" title={item.locationName}>
                      Slot {item.locationSlotId}: {item.locationName.replace(/^Slot \d+:\s*/, '')}
                    </span>
                  </td>

                  {/* Tipe Kerja */}
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.scheduleType === 'shift' 
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {item.scheduleType === 'shift' ? 'Shift (12 Jam)' : 'Harian'}
                    </span>
                  </td>

                  {/* Hari Hadir */}
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono font-bold text-white text-sm">{item.totalPresentDays}</span>
                    <span className="text-[10px] text-slate-400 block">Hari</span>
                  </td>

                  {/* Total Jam Kerja */}
                  <td className="py-3 px-4 text-center">
                    <div className="font-mono font-black text-amber-400 text-sm">
                      {item.totalWorkHours} Jam
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Rata-rata {(item.totalWorkHours / Math.max(1, item.totalPresentDays)).toFixed(1)}j / hari
                    </span>
                  </td>

                  {/* Keterlambatan */}
                  <td className="py-3 px-4 text-center">
                    <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                      item.totalLateCount === 0 
                        ? 'text-emerald-400 bg-emerald-500/10' 
                        : item.totalLateCount <= 2 
                        ? 'text-amber-400 bg-amber-500/10' 
                        : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {item.totalLateCount} Kali
                    </span>
                  </td>

                  {/* Pola & Tingkat Disiplin */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium">{item.attendancePattern}</span>
                        <span className="font-mono font-bold text-white">{item.disciplineRate}%</span>
                      </div>
                      
                      {/* Discipline Progress Bar */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.disciplineRate >= 90
                              ? 'bg-emerald-500'
                              : item.disciplineRate >= 75
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.disciplineRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                </tr>
              ))}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    Tidak ada personel yang sesuai filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {onExecuteArchive && (
        <ArchiveCleanupModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          attendanceRecords={attendanceRecords}
          onExecuteArchive={onExecuteArchive}
        />
      )}

      {/* Reset Monthly Attendance Modal */}
      {isResetMonthlyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <RotateCcw className="w-5 h-5 text-rose-500" />
                <span>Reset Rekapitulasi Presensi Bulanan</span>
              </div>
              <button
                onClick={() => {
                  if (!isResettingMonth) {
                    setIsResetMonthlyModalOpen(false);
                    setResetMonthSuccessMsg('');
                  }
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetMonthSuccessMsg ? (
              <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">{resetMonthSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Bulan Terpilih:</span>
                    <span className="font-bold text-amber-400 font-sans">{selectedMonthLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Total Data Presensi:</span>
                    <span className="font-bold text-white">{currentMonthRecords.length} Rekaman</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Total Jam Kerja:</span>
                    <span className="text-slate-200">{Math.round(totalAccumulatedHours)} Jam Dinas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Total Keterlambatan:</span>
                    <span className="text-rose-400">{totalLateOccurrences} Kali</span>
                  </div>
                </div>

                {/* Offer quick CSV export before reset */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-300 font-semibold block">Cadangkan Data Sebelum Reset</span>
                    Simpan salinan CSV untuk arsip dinas Anda.
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>Unduh CSV</span>
                  </button>
                </div>

                <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-200 leading-relaxed text-[11px]">
                  <span className="font-bold block text-rose-300 mb-0.5">⚠️ Peringatan Penting:</span>
                  Tindakan ini akan menghapus seluruh data kehadiran, akumulasi jam kerja, dan catatan presensi untuk bulan <strong>{selectedMonthLabel}</strong>. Statistik bulanan periode ini akan di-reset kembali ke 0.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isResettingMonth}
                    onClick={() => setIsResetMonthlyModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isResettingMonth || currentMonthRecords.length === 0}
                    onClick={handleConfirmResetMonthly}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40"
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
