import React, { useState, useMemo } from 'react';
import { Employee, AttendanceRecord, WorkLocation, LeaveRequest } from '../../types';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CalendarCheck, 
  HeartHandshake, 
  Stethoscope, 
  Download,
  Filter,
  ShieldCheck,
  Sparkles,
  Info,
  CalendarDays,
  ListFilter
} from 'lucide-react';
import { 
  calculateSmartMonthlyReport, 
  getStatusCodeBadge, 
  INDONESIAN_MONTH_NAMES,
  INDONESIAN_DAY_NAMES
} from '../../utils/smartAttendanceCalculator';

interface EmployeeAttendanceRecapProps {
  employee: Employee;
  attendanceRecords: AttendanceRecord[];
  locations: WorkLocation[];
  currentDate: Date;
  leaveRequests?: LeaveRequest[];
}

export const EmployeeAttendanceRecap: React.FC<EmployeeAttendanceRecapProps> = ({
  employee,
  attendanceRecords,
  locations,
  currentDate,
  leaveRequests = [],
}) => {
  // Current month default: YYYY-MM
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [subView, setSubView] = useState<'calendar' | 'logs'>('calendar');

  // Smart Attendance Calculation for this officer
  // Automatically recalculates when admin changes employee.scheduleType (shift <-> harian)
  const smartReport = useMemo(() => {
    return calculateSmartMonthlyReport(
      employee,
      selectedMonth,
      attendanceRecords,
      leaveRequests,
      locations
    );
  }, [employee, selectedMonth, attendanceRecords, leaveRequests, locations]);

  // Filter records for this employee and selected month (for logs view)
  const monthlyRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      if (r.employeeId !== employee.id) return false;
      const isSameMonth = r.date.startsWith(selectedMonth);
      if (!isSameMonth) return false;

      if (filterStatus === 'all') return true;
      if (filterStatus === 'hadir') return r.checkInStatus === 'tepat_waktu' || r.checkInStatus === 'terlambat';
      if (filterStatus === 'tepat_waktu') return r.checkInStatus === 'tepat_waktu';
      if (filterStatus === 'terlambat') return r.checkInStatus === 'terlambat';
      if (filterStatus === 'izin') return r.checkInStatus === 'izin';
      if (filterStatus === 'sakit') return r.checkInStatus === 'sakit';
      if (filterStatus === 'dispensasi_kantor') return r.checkInStatus === 'dispensasi_kantor';
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, employee.id, selectedMonth, filterStatus]);

  const getLocationName = (slotId: number) => {
    const loc = locations.find(l => l.id === slotId);
    return loc ? loc.name.replace(/^Slot \d+:\s*/i, '') : `Pos #${slotId}`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'tepat_waktu':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Tepat Waktu (H)
          </span>
        );
      case 'terlambat':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Terlambat (T)
          </span>
        );
      case 'dispensasi_kantor':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
            <FileText className="w-3 h-3 text-cyan-700" />
            Pemutihan (P)
          </span>
        );
      case 'izin':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <HeartHandshake className="w-3 h-3 text-indigo-600" />
            Izin Resmi (I)
          </span>
        );
      case 'sakit':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-purple-600" />
            Sakit (S)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Hadir (H)
          </span>
        );
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Month Selector */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              Sistem Pintar Presensi
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Jadwal: {employee.scheduleType === 'shift' ? 'Shift 12 Jam (Pagi-Malam-Libur-Libur)' : 'Harian (Senin-Jumat)'}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-600" />
            <span>Rekapitulasi Kehadiran Presensi Pribadi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Perhitungan persentase kehadiran otomatis dihitung dari awal bulan sesuai jadwal dinas resmi Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-slate-700">Periode:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handlePrintSummary}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xs transition-colors flex items-center gap-1.5"
            title="Cetak Rekap Presensi Pribadi"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Info Banner: Jadwal Kerja Aktif Pegawai */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-blue-50/60 border border-amber-200/90 rounded-2xl p-4 text-xs shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-amber-700" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span>Jadwal Aktif Anda: {employee.scheduleType === 'shift' ? 'Shift Operasional 12 Jam' : 'Harian Kantor'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                employee.scheduleType === 'shift' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-emerald-100 border-emerald-300 text-emerald-900'
              }`}>
                {employee.regu}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {employee.scheduleType === 'shift' ? (
                <span>
                  Siklus 4 hari dinamis: <strong>Shift Pagi (08.00-20.00) ➔ Shift Malam (20.00-08.00) ➔ Libur ➔ Libur</strong>. Target hari kerja otomatis menghitung hari giliran piket Anda.
                </span>
              ) : (
                <span>
                  Hari dinas: <strong>Senin s.d Jumat</strong>. Akhir pekan (Sabtu-Minggu) dan Hari Libur Nasional otomatis dihitung Libur.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
        {/* Persentase Kehadiran Pintar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">% Kehadiran</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${
              smartReport.attendanceRate >= 90 ? 'text-emerald-600' : smartReport.attendanceRate >= 75 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {smartReport.attendanceRate}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5 font-medium truncate">
            {smartReport.totalHadirSah} sah / {smartReport.targetWorkDays} wajib
          </span>
        </div>

        {/* Wajib Kerja */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Wajib Kerja</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{smartReport.targetWorkDays}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5 font-medium">
            Dari awal bulan
          </span>
        </div>

        {/* Hadir (H) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">Hadir (H)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">{smartReport.hadirCount}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">
            {smartReport.lateCount > 0 ? `${smartReport.lateCount}x Terlambat` : 'Tepat Waktu'}
          </span>
        </div>

        {/* Sakit (S) */}
        <div className="bg-white border border-purple-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 block">Sakit (S)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono">{smartReport.sakitCount}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block">
            Surat Dokter Sah
          </span>
        </div>

        {/* Izin Resmi (I) */}
        <div className="bg-white border border-indigo-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-700 block">Izin Resmi (I)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">{smartReport.izinCount}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block">
            Disetujui Admin
          </span>
        </div>

        {/* Tanpa Keterangan (TK) */}
        <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 block">Tanpa Ket. (TK)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl sm:text-2xl font-black font-mono ${
              smartReport.tanpaKeteranganCount > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}>
              {smartReport.tanpaKeteranganCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block ${
            smartReport.tanpaKeteranganCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
          }`}>
            {smartReport.tanpaKeteranganCount > 0 ? 'Alpha Presensi' : 'Nol Alpha'}
          </span>
        </div>

        {/* Pemutihan (P) */}
        <div className="bg-white border border-cyan-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-cyan-800 block">Pemutihan (P)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-cyan-800 font-mono">{smartReport.pemutihanCount}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block">
            Disp. HP Rusak Sah
          </span>
        </div>

      </div>

      {/* Official Legend Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px]">
          <div className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Keterangan Kode Presensi Anda:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">H = Hadir</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">T = Terlambat</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">S = Sakit</span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">I = Izin</span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-black">TK = Tanpa Keterangan</span>
            <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold">P = Pemutihan (Hadir Sah)</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">L = Libur</span>
          </div>
        </div>
      </div>

      {/* Main Content Card: Sub-view Switcher (Kalender Harian vs Log Presensi) */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        
        {/* Sub-view navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSubView('calendar')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                subView === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              <span>Kalender Rincian Harian (1-{smartReport.dailyBreakdown.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('logs')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                subView === 'logs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Riwayat Log Presensi ({monthlyRecords.length})</span>
            </button>
          </div>

          {subView === 'logs' && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Semua Status</option>
                <option value="hadir">Semua Hadir (H & T)</option>
                <option value="tepat_waktu">Hanya Tepat Waktu</option>
                <option value="terlambat">Hanya Terlambat</option>
                <option value="dispensasi_kantor">Hanya Pemutihan</option>
                <option value="izin">Hanya Izin</option>
                <option value="sakit">Hanya Sakit</option>
              </select>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* SUBVIEW 1: KALENDER RINCIAN HARIAN (1 S/D 31)                 */}
        {/* ============================================================== */}
        {subView === 'calendar' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500 flex items-center justify-between pb-1">
              <span>Menampilkan seluruh hari di bulan berjalan dengan kode status dinas resmi:</span>
              <span className="font-mono font-bold text-slate-800">
                Total Jam: {smartReport.totalWorkHours} Jam
              </span>
            </div>

            <div className="space-y-1.5">
              {smartReport.dailyBreakdown.map((day) => {
                const badge = getStatusCodeBadge(day.code);
                return (
                  <div
                    key={day.date}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-colors ${
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
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-8 h-8 rounded-xl border font-mono font-black text-xs flex items-center justify-center shrink-0 ${badge.bg} ${badge.border}`}>
                        {badge.shortLabel}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{day.dayName}, {day.dayNumber} {INDONESIAN_MONTH_NAMES[parseInt(selectedMonth.split('-')[1], 10) - 1]}</span>
                          <span className="text-slate-400 font-normal">·</span>
                          <span className="text-[10px] text-slate-500 font-normal">{day.scheduleLabel}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                          {day.notes || day.codeLabel}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {day.record?.checkInTime ? (
                        <div className="font-mono text-xs font-bold text-slate-800">
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
        )}

        {/* ============================================================== */}
        {/* SUBVIEW 2: LOG RECORD PRESENSI                                 */}
        {/* ============================================================== */}
        {subView === 'logs' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3.5">Hari / Tanggal</th>
                  <th className="py-3 px-3.5">Pos Penugasan</th>
                  <th className="py-3 px-3.5">Jam Masuk</th>
                  <th className="py-3 px-3.5">Jam Pulang</th>
                  <th className="py-3 px-3.5">Status Presensi</th>
                  <th className="py-3 px-3.5">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyRecords.map((r) => {
                  const dateObj = new Date(`${r.date}T00:00:00`);
                  const formattedDate = dateObj.toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  const isDisp = r.checkInStatus === 'dispensasi_kantor';

                  return (
                    <tr key={r.id} className={`hover:bg-slate-50/70 transition-colors ${isDisp ? 'bg-cyan-50/30' : ''}`}>
                      <td className="py-3 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-slate-800">
                          Slot {r.locationSlotId}: {getLocationName(r.locationSlotId)}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono">
                        {r.checkInTime && r.checkInTime !== '-' ? (
                          <span className="font-semibold text-slate-900">{r.checkInTime}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono">
                        {r.checkOutTime && r.checkOutTime !== '-' ? (
                          <span className="font-semibold text-slate-900">{r.checkOutTime}</span>
                        ) : (
                          <span className="text-slate-400 italic">Belum Pulang</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        {getStatusBadge(r.checkInStatus)}
                      </td>
                      <td className="py-3 px-3.5 max-w-[200px] truncate text-slate-500">
                        {r.notes || r.dispensationReason || '-'}
                      </td>
                    </tr>
                  );
                })}

                {monthlyRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs italic">
                      Tidak ada rekaman presensi yang sesuai dengan filter pada bulan ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};
