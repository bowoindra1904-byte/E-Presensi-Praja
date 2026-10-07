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
  Filter
} from 'lucide-react';

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

  // Filter records for this employee and selected month
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

  // Approved leaves for this employee in selected month
  const approvedMonthLeaves = useMemo(() => {
    return leaveRequests.filter(lr => 
      lr.employeeId === employee.id &&
      lr.status === 'approved' &&
      !lr.id.startsWith('LEAVE-REQ-') &&
      !['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(lr.id) &&
      (lr.startDate.startsWith(selectedMonth) || lr.endDate.startsWith(selectedMonth))
    );
  }, [leaveRequests, employee.id, selectedMonth]);

  // Aggregate stats
  const allMonthlyRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.employeeId === employee.id && r.date.startsWith(selectedMonth));
  }, [attendanceRecords, employee.id, selectedMonth]);

  const totalHadir = allMonthlyRecords.filter(
    r => r.checkInStatus === 'tepat_waktu' || r.checkInStatus === 'terlambat' || r.checkInStatus === 'dispensasi_kantor'
  ).length;
  const totalTepatWaktu = allMonthlyRecords.filter(r => r.checkInStatus === 'tepat_waktu').length;
  const totalTerlambat = allMonthlyRecords.filter(r => r.checkInStatus === 'terlambat').length;
  const totalIzin = Math.max(
    allMonthlyRecords.filter(r => r.checkInStatus === 'izin').length,
    approvedMonthLeaves.filter(l => l.type === 'izin').reduce((acc, l) => acc + (l.totalDays || 1), 0)
  );
  const totalSakit = Math.max(
    allMonthlyRecords.filter(r => r.checkInStatus === 'sakit').length,
    approvedMonthLeaves.filter(l => l.type === 'sakit').reduce((acc, l) => acc + (l.totalDays || 1), 0)
  );
  const totalDispensasi = Math.max(
    allMonthlyRecords.filter(r => r.checkInStatus === 'dispensasi_kantor').length,
    approvedMonthLeaves.filter(l => l.type === 'dispensasi_kantor' || l.isOfficeDispensation).reduce((acc, l) => acc + (l.totalDays || 1), 0)
  );

  // Work hours estimate safely
  const totalJamKerja = allMonthlyRecords.reduce((acc, r) => {
    if (r.checkInStatus === 'izin' || r.checkInStatus === 'sakit') return acc;
    if (r.checkInStatus === 'dispensasi_kantor') {
      return acc + (employee.scheduleType === 'shift' ? 12 : 8.5);
    }
    if (
      r.checkInTime && 
      r.checkOutTime && 
      r.checkInTime !== '-' && 
      r.checkOutTime !== '-' &&
      r.checkInTime.includes(':') &&
      r.checkOutTime.includes(':')
    ) {
      const [hIn, mIn] = r.checkInTime.split(':').map(Number);
      const [hOut, mOut] = r.checkOutTime.split(':').map(Number);
      if (!isNaN(hIn) && !isNaN(hOut)) {
        const diff = (hOut * 60 + (mOut || 0)) - (hIn * 60 + (mIn || 0));
        let hours = diff > 0 ? diff / 60 : (employee.scheduleType === 'shift' ? 12 : 8.5);
        return acc + (isNaN(hours) ? (employee.scheduleType === 'shift' ? 12 : 8.5) : hours);
      }
    }
    return acc + (employee.scheduleType === 'shift' ? 12 : 8.5);
  }, 0);

  const onTimeOrDispensed = totalTepatWaktu + totalDispensasi;
  const rawDisiplin = totalHadir > 0 
    ? Math.round((onTimeOrDispensed / totalHadir) * 100) 
    : 100;
  const persentaseDisiplin = isNaN(rawDisiplin) ? 100 : Math.max(0, Math.min(100, rawDisiplin));

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
            Tepat Waktu
          </span>
        );
      case 'terlambat':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Terlambat
          </span>
        );
      case 'dispensasi_kantor':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-600" />
            Dispensasi Kantor (HP Rusak)
          </span>
        );
      case 'izin':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <HeartHandshake className="w-3 h-3 text-indigo-600" />
            Izin Resmi
          </span>
        );
      case 'sakit':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-purple-600" />
            Sakit
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Hadir
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
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-600" />
            <span>Rekap Kehadiran Presensi Pribadi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan riwayat jam kerja dinas, ketepatan waktu, dan catatan izin/sakit personel Satpol PP
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
            title="Cetak Rekap Presensi"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards (Clean, luminous, elegant palette) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total Hadir */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Hari Hadir</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{totalHadir}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">
            {totalTepatWaktu} tepat waktu
          </span>
        </div>

        {/* Tepat Waktu */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Tepat Waktu</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">{totalTepatWaktu}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5">Sesuai jam dinas</span>
        </div>

        {/* Terlambat */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Terlambat</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">{totalTerlambat}</span>
            <span className="text-xs text-slate-400 font-medium">Kali</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5">Lewat jam toleransi</span>
        </div>

        {/* Dispensasi Kantor (HP Rusak) */}
        <div className="bg-white border border-blue-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 block">Dispensasi Kantor</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono">{totalDispensasi}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block">
            HP Rusak / Surat Sah
          </span>
        </div>

        {/* Izin Resmi */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Izin Resmi</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">{totalIzin}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block">
            Disetujui Admin
          </span>
        </div>

        {/* Sakit */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Sakit (Dokter)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-purple-600 font-mono">{totalSakit}</span>
            <span className="text-xs text-slate-400 font-medium">Hari</span>
          </div>
          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block">
            Disetujui Admin
          </span>
        </div>

        {/* Skor Disiplin */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Skor Disiplin</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono">{persentaseDisiplin}%</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5 font-medium">
            ~{Math.round(totalJamKerja)} Jam Dinas
          </span>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Log Presensi & Keterangan Dinas ({monthlyRecords.length} Catatan)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="hadir">Semua Hadir (Tepat Waktu & Terlambat)</option>
              <option value="tepat_waktu">Hanya Tepat Waktu</option>
              <option value="terlambat">Hanya Terlambat</option>
              <option value="dispensasi_kantor">Hanya Dispensasi Kantor (HP Rusak)</option>
              <option value="izin">Hanya Izin</option>
              <option value="sakit">Hanya Sakit</option>
            </select>
          </div>
        </div>

        {/* Responsive Table for Desktop & Mobile */}
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
                  <tr key={r.id} className={`hover:bg-slate-50/70 transition-colors ${isDisp ? 'bg-blue-50/30' : ''}`}>
                    <td className="py-3 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                      <span className="text-slate-800 font-semibold">{getLocationName(r.locationSlotId)}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Slot {r.locationSlotId} · {r.regu || employee.regu}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {isDisp ? (
                        <span className="text-blue-700 font-bold">DISPENSASI</span>
                      ) : (
                        r.checkInTime && r.checkInTime !== '-' ? `${r.checkInTime} WIB` : '-'
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {isDisp ? (
                        <span className="text-slate-500 font-medium">Surat Kantor</span>
                      ) : (
                        r.checkOutTime && r.checkOutTime !== '-' ? `${r.checkOutTime} WIB` : (r.checkInStatus === 'izin' || r.checkInStatus === 'sakit' ? '-' : <span className="text-slate-400 italic font-normal">Belum absen</span>)
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {getStatusBadge(r.checkInStatus)}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 text-[11px] max-w-sm">
                      <div>{r.notes || '-'}</div>
                      {r.dispensationLetterNumber && (
                        <div className="flex items-center gap-1.5 text-blue-700 font-semibold mt-0.5">
                          <span>No. Surat: {r.dispensationLetterNumber}</span>
                          {r.dispensationLetterPhoto && (
                            <a
                              href={r.dispensationLetterPhoto}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-[10px] hover:text-blue-900"
                            >
                              Lihat Surat
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {monthlyRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada catatan presensi pada filter bulan dan status ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
