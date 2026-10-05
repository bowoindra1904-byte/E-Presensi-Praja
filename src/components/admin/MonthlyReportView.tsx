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
  X,
  HeartHandshake
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

      const presentRecords = empRecords.filter(r => r.checkInStatus === 'tepat_waktu' || r.checkInStatus === 'terlambat');
      const totalPresentDays = presentRecords.length;
      const totalIzinCount = empRecords.filter(r => r.checkInStatus === 'izin').length;
      const totalSakitCount = empRecords.filter(r => r.checkInStatus === 'sakit').length;
      
      // Calculate work hours
      let totalWorkHours = 0;
      presentRecords.forEach((r) => {
        if (r.checkInTime && r.checkOutTime && r.checkInTime !== '-' && r.checkOutTime !== '-') {
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
        totalIzinCount,
        totalSakitCount,
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
      "Izin (Hari)",
      "Sakit (Hari)",
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
      r.totalIzinCount || 0,
      r.totalSakitCount || 0,
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
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Laporan Absensi Bulanan Personel Satpol PP
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi akumulasi jam kerja, tingkat keterlambatan, dispensasi izin/sakit, dan evaluasi kepatuhan 150 personel
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
              <span>Arsip & Bersihkan &gt; 6 Bulan</span>
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
            title="Atur tanggal pengesahan, alamat kota dan pejabat penanda tangan"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-600" />
            <span>Atur Penanda Tangan</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Dokumen Resmi
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Jam Kerja</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{Math.round(totalAccumulatedHours)}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Jam Terakumulasi</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rata-Rata Jam</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-sky-600 font-mono">{avgWorkHours}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Jam Dinas / Personel</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Keterlambatan</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">{totalLateOccurrences}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Insiden Bulan Ini</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Izin & Sakit</span>
            <HeartHandshake className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">
              {filteredReports.reduce((acc, curr) => acc + (curr.totalIzinCount || 0) + (curr.totalSakitCount || 0), 0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Total Hari Dispensasi</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tingkat Disiplin</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{avgDisciplineRate}%</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Kepatuhan Waktu Masuk</span>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Periode Waktu / Bulan */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-600" />
              Periode Waktu
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
              <option value="shift">Shift (12 Jam)</option>
              <option value="harian">Harian (Kantor/Dinas)</option>
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

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Menampilkan rekapitulasi <strong className="text-slate-900">{filteredReports.length}</strong> personel</span>
          <span className="font-mono text-amber-800 font-bold">Periode: {availableMonths.find(m => m.value === selectedMonth)?.label}</span>
        </div>
      </div>

      {/* Main Monthly Report Content: Mobile Cards + Desktop Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        
        {/* Mobile View: HP Card List */}
        <div className="sm:hidden p-3 space-y-3">
          {filteredReports.map((item) => (
            <div key={item.employeeId} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs truncate">{item.employeeName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">NIP: {item.nip} · {item.employeeId}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{item.role}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  item.scheduleType === 'shift' 
                    ? 'bg-amber-50 border-amber-200 text-amber-800' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {item.scheduleType === 'shift' ? 'Shift' : 'Harian'}
                </span>
              </div>

              <div className="text-[10.5px] text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500">Pos Penugasan: </span>
                <span className="font-semibold text-slate-900">Slot {item.locationSlotId}: {item.locationName.replace(/^Slot \d+:\s*/, '')}</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Hadir</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{item.totalPresentDays}h</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Jam</span>
                  <span className="font-mono font-bold text-amber-700 text-xs">{item.totalWorkHours}j</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Terlambat</span>
                  <span className={`font-mono font-bold text-xs ${
                    item.totalLateCount === 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {item.totalLateCount}x
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Izin/Sakit</span>
                  <span className="font-mono font-bold text-blue-700 text-xs">
                    {(item.totalIzinCount || 0) + (item.totalSakitCount || 0)}h
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-200">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-600 truncate max-w-[200px]">{item.attendancePattern}</span>
                  <span className="font-mono font-bold text-slate-900">{item.disciplineRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
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
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama & NIP Personel</th>
                <th className="py-3 px-4">Unit Penempatan</th>
                <th className="py-3 px-4">Tipe Kerja</th>
                <th className="py-3 px-4 text-center">Hari Hadir</th>
                <th className="py-3 px-4 text-center">Total Jam Kerja</th>
                <th className="py-3 px-4 text-center">Keterlambatan</th>
                <th className="py-3 px-4 text-center">Izin / Sakit</th>
                <th className="py-3 px-4">Pola & Tingkat Disiplin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((item) => (
                <tr key={item.employeeId} className="hover:bg-slate-50/70 transition-colors">
                  
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

                  {/* Unit */}
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800 block truncate max-w-[190px]" title={item.locationName}>
                      Slot {item.locationSlotId}: {item.locationName.replace(/^Slot \d+:\s*/, '')}
                    </span>
                  </td>

                  {/* Tipe Kerja */}
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.scheduleType === 'shift' 
                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      {item.scheduleType === 'shift' ? 'Shift (12 Jam)' : 'Harian'}
                    </span>
                  </td>

                  {/* Hari Hadir */}
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono font-bold text-slate-900 text-sm">{item.totalPresentDays}</span>
                    <span className="text-[10px] text-slate-500 block">Hari</span>
                  </td>

                  {/* Total Jam Kerja */}
                  <td className="py-3 px-4 text-center">
                    <div className="font-mono font-black text-amber-800 text-sm">
                      {item.totalWorkHours} Jam
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Rata-rata {(item.totalWorkHours / Math.max(1, item.totalPresentDays)).toFixed(1)}j / hari
                    </span>
                  </td>

                  {/* Keterlambatan */}
                  <td className="py-3 px-4 text-center">
                    <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                      item.totalLateCount === 0 
                        ? 'text-emerald-700 bg-emerald-50' 
                        : item.totalLateCount <= 2 
                        ? 'text-amber-700 bg-amber-50' 
                        : 'text-rose-700 bg-rose-50'
                    }`}>
                      {item.totalLateCount} Kali
                    </span>
                  </td>

                  {/* Izin / Sakit */}
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {(item.totalIzinCount || 0) + (item.totalSakitCount || 0)} Hari
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.totalIzinCount || 0} Izin · {item.totalSakitCount || 0} Sakit
                    </span>
                  </td>

                  {/* Pola & Tingkat Disiplin */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-700 font-medium">{item.attendancePattern}</span>
                        <span className="font-mono font-bold text-slate-900">{item.disciplineRate}%</span>
                      </div>
                      
                      {/* Discipline Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
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
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>Reset Rekapitulasi Presensi Bulanan</span>
              </div>
              <button
                onClick={() => {
                  if (!isResettingMonth) {
                    setIsResetMonthlyModalOpen(false);
                    setResetMonthSuccessMsg('');
                  }
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetMonthSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{resetMonthSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Bulan Terpilih:</span>
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

                {/* Offer quick CSV export before reset */}
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
