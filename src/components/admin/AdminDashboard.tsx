import React, { useState, useMemo } from 'react';
import { 
  Employee, 
  WorkLocation, 
  AttendanceRecord, 
  SecurityLog,
  LeaveRequest 
} from '../../types';
import { MapComponent } from '../MapComponent';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Radio, 
  FileSpreadsheet, 
  Search, 
  MapPin, 
  Filter,
  Camera,
  Printer,
  RotateCcw,
  Trash2,
  X,
  HeartHandshake,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

interface AdminDashboardProps {
  employees: Employee[];
  locations: WorkLocation[];
  attendanceRecords: AttendanceRecord[];
  securityLogs: SecurityLog[];
  currentDate: Date;
  leaveRequests?: LeaveRequest[];
  onOpenPrintMenu?: (menu: 'daily') => void;
  onResetDailyAttendance?: (recordIds: string[], dateLabel: string) => Promise<void>;
  onNavigateToPemutihan?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  locations,
  attendanceRecords,
  securityLogs,
  currentDate,
  leaveRequests = [],
  onOpenPrintMenu,
  onResetDailyAttendance,
  onNavigateToPemutihan,
}) => {
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>('all');
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<string>('all');
  const [attendanceViewTab, setAttendanceViewTab] = useState<'all' | 'tepat_waktu' | 'terlambat' | 'izin_sakit' | 'belum_absen'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  // Reset Daily Attendance State
  const [isResetDailyModalOpen, setIsResetDailyModalOpen] = useState(false);
  const [resetScope, setResetScope] = useState<'all' | 'filtered'>('all');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Local date calculation helper (prevents UTC timezone shift)
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => formatLocalDate(currentDate), [currentDate]);
  const yesterdayStr = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    return formatLocalDate(d);
  }, [currentDate]);

  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(todayStr);

  // Map of registered employees currently in database
  const registeredEmployeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  // 1. Purge bawaan/sample records and ONLY keep records for registered employees
  const cleanAttendanceRecords = useMemo(() => {
    return attendanceRecords.filter(r => 
      registeredEmployeeMap.has(r.employeeId) &&
      !r.id.startsWith('ATT-2026-') &&
      !r.id.startsWith('ATT-HIST-') &&
      !r.id.startsWith('ATT-SAMPLE-')
    );
  }, [attendanceRecords, registeredEmployeeMap]);

  // 2. Filter approved leaves covering the selected date for registered employees
  const approvedLeavesForDate = useMemo(() => {
    if (selectedDateFilter === 'all') return [];
    return leaveRequests.filter(lr => 
      lr.status === 'approved' &&
      registeredEmployeeMap.has(lr.employeeId) &&
      !lr.id.startsWith('LEAVE-REQ-') &&
      !['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(lr.id) &&
      selectedDateFilter >= lr.startDate &&
      selectedDateFilter <= lr.endDate
    );
  }, [leaveRequests, selectedDateFilter, registeredEmployeeMap]);

  // 3. Active records for the selected date (Guaranteed clean & synchronized with approved leaves)
  const activeDateRecords = useMemo(() => {
    let records = cleanAttendanceRecords;
    if (selectedDateFilter !== 'all') {
      records = records.filter(r => r.date === selectedDateFilter);
    }

    // Merge any approved leave requests for this date that are not yet recorded
    if (selectedDateFilter !== 'all' && approvedLeavesForDate.length > 0) {
      const existingEmpIds = new Set(records.map(r => r.employeeId));
      const syntheticRecords: AttendanceRecord[] = [];

      approvedLeavesForDate.forEach(lr => {
        if (!existingEmpIds.has(lr.employeeId)) {
          const emp = registeredEmployeeMap.get(lr.employeeId);
          if (emp) {
            const locId = emp.locationSlotId || 1;
            const loc = locations.find(l => l.id === locId) || locations[0];
            syntheticRecords.push({
              id: `ATT-LEAVE-${lr.id}-${selectedDateFilter}`,
              employeeId: emp.id,
              employeeName: emp.name,
              employeeNip: emp.nip,
              date: selectedDateFilter,
              regu: emp.regu,
              scheduleType: emp.scheduleType,
              locationSlotId: locId,
              locationName: loc?.name || `Pos #${locId}`,
              checkInTime: lr.type === 'izin' ? 'IZIN' : lr.type === 'sakit' ? 'SAKIT' : 'DISPENSASI',
              checkInStatus: lr.type,
              checkOutTime: '-',
              notes: `[DISPOSISI ${lr.type.toUpperCase()}] ${lr.reason} (Disetujui Admin: ${lr.adminNote || 'Disahkan'})`,
              leaveRequestId: lr.id,
              isOfficeDispensation: lr.type === 'dispensasi_kantor' || lr.isOfficeDispensation,
              dispensationLetterNumber: lr.dispensationLetterNumber,
              dispensationLetterPhoto: lr.attachmentUrl,
              dispensationReason: lr.reason,
              dispensationIssuedBy: lr.dispensationIssuedBy || 'Kantor Satpol PP'
            });
          }
        }
      });

      if (syntheticRecords.length > 0) {
        records = [...syntheticRecords, ...records];
      }
    }

    return records;
  }, [cleanAttendanceRecords, selectedDateFilter, approvedLeavesForDate, registeredEmployeeMap, locations]);

  // Metric Computations for the selected date
  const totalEmployees = employees.length;
  const hadirCount = activeDateRecords.filter(r => r.checkInStatus === 'tepat_waktu').length;
  const terlambatCount = activeDateRecords.filter(r => r.checkInStatus === 'terlambat').length;
  const totalHadir = hadirCount + terlambatCount;
  const izinCount = activeDateRecords.filter(r => r.checkInStatus === 'izin').length;
  const sakitCount = activeDateRecords.filter(r => r.checkInStatus === 'sakit').length;
  const dispensasiCount = activeDateRecords.filter(r => r.checkInStatus === 'dispensasi_kantor').length;
  const totalIzinSakit = izinCount + sakitCount + dispensasiCount;
  const belumAbsenCount = Math.max(0, totalEmployees - totalHadir - totalIzinSakit);
  const securityIncidentCount = securityLogs.length;

  // Selected date human label
  const selectedDateLabel = useMemo(() => {
    if (selectedDateFilter === 'all') return 'Semua Riwayat Tanggal (Akumulatif)';
    try {
      const [y, m, d] = selectedDateFilter.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedDateFilter;
    }
  }, [selectedDateFilter]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    if (selectedDateFilter === 'all') {
      setSelectedDateFilter(todayStr);
      return;
    }
    const [y, m, d] = selectedDateFilter.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    setSelectedDateFilter(formatLocalDate(dateObj));
  };

  const handleNextDay = () => {
    if (selectedDateFilter === 'all') {
      setSelectedDateFilter(todayStr);
      return;
    }
    const [y, m, d] = selectedDateFilter.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    setSelectedDateFilter(formatLocalDate(dateObj));
  };

  // Full employee roster for selected date (combines attendance records with employees who have not checked in yet)
  const fullRoster = useMemo(() => {
    const recordByEmpId = new Map(activeDateRecords.map(r => [r.employeeId, r]));

    return employees.map(emp => {
      const record = recordByEmpId.get(emp.id);
      const loc = locations.find(l => l.id === emp.locationSlotId) || locations[0];

      return {
        employee: emp,
        record,
        hasRecord: !!record,
        status: record ? record.checkInStatus || 'hadir' : 'belum_absen',
        locationName: loc?.name || `Slot ${emp.locationSlotId}`,
      };
    });
  }, [employees, activeDateRecords, locations]);

  // Filtered log records (Guaranteed date-scoped so previous days are NEVER mixed in)
  const filteredRecords = useMemo(() => {
    return activeDateRecords.filter(record => {
      const matchSlot = selectedSlotFilter === 'all' || record.locationSlotId === Number(selectedSlotFilter);
      const matchSchedule = selectedScheduleFilter === 'all' || record.scheduleType === selectedScheduleFilter;
      const matchStatusTab = 
        attendanceViewTab === 'all' ||
        (attendanceViewTab === 'tepat_waktu' && record.checkInStatus === 'tepat_waktu') ||
        (attendanceViewTab === 'terlambat' && record.checkInStatus === 'terlambat') ||
        (attendanceViewTab === 'izin_sakit' && (record.checkInStatus === 'izin' || record.checkInStatus === 'sakit' || record.checkInStatus === 'dispensasi_kantor'));
      
      const matchSearch = 
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeNip.includes(searchQuery) ||
        record.locationName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSlot && matchSchedule && matchStatusTab && matchSearch;
    });
  }, [activeDateRecords, selectedSlotFilter, selectedScheduleFilter, attendanceViewTab, searchQuery]);

  // Unattended employees list for selected date
  const unattendedEmployees = useMemo(() => {
    if (selectedDateFilter === 'all') return [];
    const recordedIds = new Set(activeDateRecords.map(r => r.employeeId));
    return employees.filter(emp => {
      if (recordedIds.has(emp.id)) return false;
      const matchSlot = selectedSlotFilter === 'all' || emp.locationSlotId === Number(selectedSlotFilter);
      const matchSchedule = selectedScheduleFilter === 'all' || emp.scheduleType === selectedScheduleFilter;
      const matchSearch = 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.nip.includes(searchQuery);
      return matchSlot && matchSchedule && matchSearch;
    });
  }, [employees, activeDateRecords, selectedDateFilter, selectedSlotFilter, selectedScheduleFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Tanggal", "Nama Personel", "NIP", "Tipe Kerja", "Slot Pos", "Jam Masuk", "Status Masuk", "Jarak Masuk (m)", "Jam Pulang", "Status Pulang", "Device ID"];
    const rows = filteredRecords.map(r => [
      r.id,
      r.date,
      `"${r.employeeName}"`,
      `"${r.employeeNip}"`,
      r.scheduleType,
      `"Slot ${r.locationSlotId}: ${r.locationName}"`,
      r.checkInTime || "-",
      r.checkInStatus || "-",
      r.checkInDistance ?? "-",
      r.checkOutTime || "-",
      r.checkOutStatus || "-",
      `"${r.checkInDeviceId || ''}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Presensi_Satpol_PP_${selectedDateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const targetResetRecords = resetScope === 'filtered' ? filteredRecords : activeDateRecords;

  const handleConfirmResetDaily = async () => {
    if (!onResetDailyAttendance) return;
    if (targetResetRecords.length === 0) return;

    try {
      setIsResetting(true);
      const targetIds = targetResetRecords.map(r => r.id);
      const label = currentDate.toLocaleDateString('id-ID', { dateStyle: 'full' });
      await onResetDailyAttendance(targetIds, label);
      setResetSuccessMessage(`Berhasil me-reset ${targetIds.length} data presensi harian.`);
      setTimeout(() => {
        setIsResetDailyModalOpen(false);
        setResetSuccessMessage('');
        setIsResetting(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Prominent Date & Calendar Command Bar (Pusat Kendali Tanggal Monitoring) */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                Monitoring Presensi Harian
              </span>
              <span className="text-[11px] font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-lg">
                {selectedDateFilter === 'all' ? 'Semua Tanggal' : selectedDateFilter}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{selectedDateLabel}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih tanggal untuk memfilter rekapan harian. Menampilkan hanya data personel riil terdaftar Satpol PP.
            </p>
          </div>

          {/* Quick Date Selectors & Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Lihat hari sebelumnya"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">H-1</span>
            </button>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-600 mr-2 shrink-0" />
              <input
                type="date"
                value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value || todayStr)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Lihat hari berikutnya"
            >
              <span className="hidden sm:inline">H+1</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDateFilter(todayStr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                selectedDateFilter === todayStr
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => setSelectedDateFilter(yesterdayStr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                selectedDateFilter === yesterdayStr
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Kemarin
            </button>

            <button
              type="button"
              onClick={() => setSelectedDateFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                selectedDateFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Tampilkan rekapan akumulatif seluruh tanggal"
            >
              Semua Tanggal
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Personel */}
        <div 
          onClick={() => setAttendanceViewTab('all')}
          className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Personel</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalEmployees}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Personel Siaga</span>
          </div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div 
          onClick={() => setAttendanceViewTab('tepat_waktu')}
          className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tepat Waktu</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{hadirCount}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Sesuai jendela jadwal</span>
          </div>
        </div>

        {/* Terlambat */}
        <div 
          onClick={() => setAttendanceViewTab('terlambat')}
          className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">{terlambatCount}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Lewat jam dinas</span>
          </div>
        </div>

        {/* Izin, Sakit & Dispensasi Kantor */}
        <div 
          onClick={() => setAttendanceViewTab('izin_sakit')}
          className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Izin & Dispensasi</span>
            <HeartHandshake className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">{totalIzinSakit}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {izinCount} Izin · {dispensasiCount} Disp. HP · {sakitCount} Sakit
            </span>
          </div>
        </div>

        {/* Belum Absen */}
        <div 
          onClick={() => setAttendanceViewTab('belum_absen')}
          className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between cursor-pointer hover:border-rose-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Belum Hadir</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-700 font-mono">{belumAbsenCount}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Klik untuk lihat nama</span>
          </div>
        </div>

        {/* Insiden Keamanan & Kunci HP */}
        <div className="col-span-2 sm:col-span-1 bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Audit Keamanan</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">{securityIncidentCount}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Percobaan HP / GPS</span>
          </div>
        </div>

      </div>

      {/* Map Overview Section: All Slots Live */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-600" />
              Monitoring Peta Lapangan {locations.length} Pos Satpol PP
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pusat komando pemantauan radius geofence pos dan sebaran personel
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {locations.slice(0, 4).map((l) => (
              <span key={l.id} className="text-[10px] bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 font-mono">
                Slot {l.slotNumber}: {employees.filter(e => e.locationSlotId === l.id).length} Personel
              </span>
            ))}
          </div>
        </div>

        <MapComponent
          locations={locations}
          height="340px"
          zoom={13}
        />
      </div>

      {/* Live Attendance Table */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Rekapitulasi Presensi Digital Personel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Log kehadiran real-time dengan verifikasi GPS digital dan kunci perangkat dinas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToPemutihan && (
              <button
                type="button"
                onClick={onNavigateToPemutihan}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Input pemutihan absensi kendala HP rusak/error lapangan kapan saja"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>⚡ Pemutihan Absensi (HP Rusak)</span>
              </button>
            )}
            {onResetDailyAttendance && (
              <button
                onClick={() => {
                  setIsResetDailyModalOpen(true);
                  setResetSuccessMessage('');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Reset dan kosongkan data presensi masuk & pulang hari ini"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset Rekap Harian</span>
              </button>
            )}
            {onOpenPrintMenu && (
              <button
                onClick={() => onOpenPrintMenu('daily')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap Harian</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Ekspor CSV
            </button>
          </div>
        </div>

        {/* Date Filter & Status Bar */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Tanggal Rekap Presensi:</span>
            </span>
            <input
              type="date"
              value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value || 'all')}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedDateFilter(todayStr)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedDateFilter === todayStr
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDateFilter(d.toISOString().split('T')[0]);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  (() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 1);
                    return selectedDateFilter === d.toISOString().split('T')[0];
                  })()
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedDateFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Semua Tanggal
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
            <span>
              Menampilkan <strong>{filteredRecords.length}</strong> rekaman presensi{' '}
              {selectedDateFilter === todayStr ? '(Hari Ini)' : selectedDateFilter === 'all' ? '(Semua Tanggal)' : `(${selectedDateFilter})`}
            </span>
            {selectedDateFilter !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter(todayStr)}
                className="text-amber-700 hover:underline font-bold text-xs"
              >
                Kembali ke Hari Ini
              </button>
            )}
          </div>
        </div>

        {/* Status Category Tabs (Semua, Tepat Waktu, Terlambat, Izin/Disp, Belum Hadir) */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setAttendanceViewTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              attendanceViewTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Rekaman ({activeDateRecords.length})
          </button>

          <button
            type="button"
            onClick={() => setAttendanceViewTab('tepat_waktu')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              attendanceViewTab === 'tepat_waktu'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tepat Waktu ({hadirCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceViewTab('terlambat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              attendanceViewTab === 'terlambat'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Terlambat ({terlambatCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceViewTab('izin_sakit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              attendanceViewTab === 'izin_sakit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Izin & Disp. HP ({totalIzinSakit})</span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceViewTab('belum_absen')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              attendanceViewTab === 'belum_absen'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Belum Hadir ({belumAbsenCount})</span>
          </button>
        </div>

        {/* Filter Controls (Search, Slot Pos, Tipe Jadwal) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, atau pos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedSlotFilter}
              onChange={(e) => setSelectedSlotFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Slot Pos ({locations.length} Pos)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedScheduleFilter}
              onChange={(e) => setSelectedScheduleFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Tipe Jadwal</option>
              <option value="shift">Shift (12 Jam)</option>
              <option value="harian">Harian (Kantor/Dinas)</option>
            </select>
          </div>
        </div>

        {/* Mobile View: Card List (Optimized for HP) */}
        <div className="sm:hidden space-y-3">
          {attendanceViewTab === 'belum_absen' ? (
            unattendedEmployees.length > 0 ? (
              unattendedEmployees.map((emp) => {
                const loc = locations.find(l => l.id === emp.locationSlotId) || locations[0];
                return (
                  <div key={emp.id} className="bg-rose-50/50 border border-rose-200/90 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-xs truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIP: {emp.nip} · {emp.rank}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                        Belum Hadir
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-rose-100 flex items-center justify-between">
                      <span className="truncate max-w-[190px] font-medium">{loc?.name || `Slot ${emp.locationSlotId}`}</span>
                      <span className="text-[9.5px] font-mono text-amber-700 shrink-0 font-semibold">
                        {emp.scheduleType === 'harian' ? 'Harian' : 'Shift'} · {emp.regu}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-rose-700 pt-1 border-t border-rose-100/60 font-semibold">
                      <span>Status: Belum ada rekaman presensi masuk</span>
                      {onNavigateToPemutihan && (
                        <button
                          type="button"
                          onClick={onNavigateToPemutihan}
                          className="text-[10px] text-blue-700 font-bold hover:underline"
                        >
                          + Pemutihan HP
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-emerald-700 text-xs bg-emerald-50 rounded-xl border border-emerald-200 font-bold">
                🎉 Seluruh personel telah hadir atau memiliki catatan dispensasi dinas!
              </div>
            )
          ) : (
            filteredRecords.map((r) => (
              <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate">{r.employeeName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">NIP: {r.employeeNip}</div>
                  </div>
                  {r.checkInPhoto && (
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoPreview(r.checkInPhoto || null)}
                      className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 hover:border-amber-500 shrink-0 shadow-xs"
                    >
                      <img src={r.checkInPhoto} alt="Foto" className="w-full h-full object-cover" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="truncate max-w-[190px] font-medium">{r.locationName}</span>
                  <span className="text-[9.5px] font-mono text-amber-700 shrink-0 font-semibold">
                    {r.scheduleType === 'harian' ? 'Harian' : 'Shift'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[9.5px] text-slate-500 block">Absen Masuk</span>
                    {r.checkInTime ? (
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">{r.checkInTime} {r.checkInTime.includes(':') ? 'WIB' : ''}</span>
                        <span className={`block text-[9.5px] font-semibold ${
                          r.checkInStatus === 'terlambat' ? 'text-amber-700' :
                          r.checkInStatus === 'dispensasi_kantor' ? 'text-blue-700' :
                          r.checkInStatus === 'izin' ? 'text-indigo-700' :
                          r.checkInStatus === 'sakit' ? 'text-purple-700' : 'text-emerald-700'
                        }`}>
                          {r.checkInStatus === 'terlambat' ? 'Terlambat' :
                           r.checkInStatus === 'dispensasi_kantor' ? 'Dispensasi HP Rusak' :
                           r.checkInStatus === 'izin' ? 'Izin Dinas' :
                           r.checkInStatus === 'sakit' ? 'Sakit' : 'Tepat Waktu'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[10.5px]">Belum Hadir</span>
                    )}
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[9.5px] text-slate-500 block">Absen Pulang</span>
                    {r.checkOutTime && r.checkOutTime !== '-' ? (
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">{r.checkOutTime} WIB</span>
                        <span className="block text-[9.5px] font-semibold text-emerald-700">Selesai Dinas</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[10.5px]">Belum Pulang</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200 font-mono">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{r.checkInDistance !== undefined && !isNaN(Number(r.checkInDistance)) ? `${r.checkInDistance}m dari pos` : '-'}</span>
                  </div>
                  <div className="truncate max-w-[130px]">
                    <span>{r.checkInDeviceId ? `HP: ${r.checkInDeviceId.slice(0, 10)}...` : 'Belum Kunci'}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {attendanceViewTab !== 'belum_absen' && filteredRecords.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
              Tidak ada rekaman presensi pada filter ini.
            </div>
          )}
        </div>

        {/* Desktop & Tablet Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Waktu & Personel</th>
                <th className="py-3 px-3">Pos Tugas</th>
                <th className="py-3 px-3">Status Masuk</th>
                <th className="py-3 px-3">Jarak dari Pos</th>
                <th className="py-3 px-3">Status Pulang</th>
                <th className="py-3 px-3">Kunci Perangkat</th>
                <th className="py-3 px-3 text-right">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceViewTab === 'belum_absen' ? (
                unattendedEmployees.length > 0 ? (
                  unattendedEmployees.map((emp) => {
                    const loc = locations.find(l => l.id === emp.locationSlotId) || locations[0];
                    return (
                      <tr key={emp.id} className="hover:bg-rose-50/40 transition-colors bg-rose-50/20">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">NIP: {emp.nip} · {emp.rank}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-800 block truncate max-w-[170px]">
                            {loc?.name || `Slot ${emp.locationSlotId}`}
                          </span>
                          <span className="text-[10px] font-mono text-amber-700 font-semibold">
                            {emp.scheduleType === 'harian' ? 'Harian' : 'Shift'} · {emp.regu}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-block">
                            Belum Hadir
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">-</td>
                        <td className="py-2.5 px-3 text-slate-400 italic text-[11px]">Belum Ada Log</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                          {emp.boundDeviceId ? `✓ ${emp.boundDeviceId}` : 'Belum Kunci'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 text-xs">
                          {onNavigateToPemutihan ? (
                            <button
                              type="button"
                              onClick={onNavigateToPemutihan}
                              className="text-[10px] text-blue-700 font-bold hover:underline"
                            >
                              + Pemutihan
                            </button>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-700 text-xs font-bold bg-emerald-50/40">
                      🎉 Seluruh personel telah hadir atau memiliki catatan dispensasi dinas!
                    </td>
                  </tr>
                )
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Personel */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{r.employeeName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">NIP: {r.employeeNip}</div>
                    </td>

                    {/* Pos */}
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800 block truncate max-w-[170px]" title={r.locationName}>
                        {r.locationName}
                      </span>
                      <span className="text-[10px] font-mono text-amber-700 font-semibold">
                        {r.scheduleType === 'harian' ? 'Harian' : 'Shift (12 Jam)'}
                      </span>
                    </td>

                    {/* Status Masuk */}
                    <td className="py-2.5 px-3">
                      {r.checkInTime ? (
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-900 text-[11px]">
                            {r.checkInTime} {r.checkInTime.includes(':') ? 'WIB' : ''}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${
                            r.checkInStatus === 'tepat_waktu'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.checkInStatus === 'dispensasi_kantor'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : r.checkInStatus === 'izin'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : r.checkInStatus === 'sakit'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {r.checkInStatus === 'tepat_waktu' ? 'Tepat Waktu' :
                             r.checkInStatus === 'dispensasi_kantor' ? 'Dispensasi HP Rusak' :
                             r.checkInStatus === 'izin' ? 'Izin Dinas' :
                             r.checkInStatus === 'sakit' ? 'Sakit' : 'Terlambat'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Jarak GPS */}
                    <td className="py-2.5 px-3">
                      {r.checkInDistance !== undefined && !isNaN(Number(r.checkInDistance)) ? (
                        <div className="font-mono text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>{r.checkInDistance} meter</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Status Pulang */}
                    <td className="py-2.5 px-3">
                      {r.checkOutTime && r.checkOutTime !== '-' ? (
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-900 text-[11px]">
                            {r.checkOutTime} WIB
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700">
                            Selesai Dinas
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Belum Pulang</span>
                      )}
                    </td>

                    {/* Kunci Perangkat */}
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[10px] text-slate-700 truncate max-w-[130px] block" title={r.checkInDeviceId}>
                        {r.checkInDeviceId ? `✓ ${r.checkInDeviceId}` : "-"}
                      </span>
                    </td>

                    {/* Foto Selfie */}
                    <td className="py-2.5 px-3 text-right">
                      {r.checkInPhoto ? (
                        <button
                          onClick={() => setSelectedPhotoPreview(r.checkInPhoto || null)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:border-amber-500 transition-colors inline-block"
                        >
                          <img src={r.checkInPhoto} alt="Foto" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                  </tr>
                ))
              )}

              {attendanceViewTab !== 'belum_absen' && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Tidak ada rekaman presensi pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {selectedPhotoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">Verifikasi Foto Presensi</h4>
              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedPhotoPreview}
              alt="Bukti Kehadiran"
              className="w-full h-64 object-cover rounded-2xl border border-slate-200"
            />
            <div className="text-[11px] text-slate-500 text-center">
              Foto seragam dinas tervalidasi dengan cap waktu dan GPS digital.
            </div>
          </div>
        </div>
      )}

      {/* Reset Daily Attendance Modal */}
      {isResetDailyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>Reset Rekapitulasi Presensi Harian</span>
              </div>
              <button
                onClick={() => {
                  if (!isResetting) {
                    setIsResetDailyModalOpen(false);
                    setResetSuccessMessage('');
                  }
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{resetSuccessMessage}</span>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Tanggal Target:</span>
                    <span className="font-bold text-slate-900 font-sans">
                      {currentDate.toLocaleDateString('id-ID', { dateStyle: 'full' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Absen Terdata:</span>
                    <span className="font-bold text-amber-700">{activeDateRecords.length} Personel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Hadir / Terlambat:</span>
                    <span className="text-slate-700">{hadirCount} Tepat Waktu / {terlambatCount} Terlambat</span>
                  </div>
                </div>

                {/* Scope selection if active filter exists */}
                {(selectedSlotFilter !== 'all' || selectedScheduleFilter !== 'all' || searchQuery) && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                    <span className="font-semibold text-slate-600 block mb-1">Pilih Lingkup Reset:</span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="dailyResetScope"
                        checked={resetScope === 'all'}
                        onChange={() => setResetScope('all')}
                        className="text-rose-600"
                      />
                      <span>Reset Seluruh Presensi Tanggal Terpilih ({activeDateRecords.length} data)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="dailyResetScope"
                        checked={resetScope === 'filtered'}
                        onChange={() => setResetScope('filtered')}
                        className="text-rose-600"
                      />
                      <span>Reset Hanya Sesuai Filter Aktif ({filteredRecords.length} data)</span>
                    </label>
                  </div>
                )}

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 leading-relaxed text-[11px]">
                  <span className="font-bold block text-rose-900 mb-0.5">⚠️ Konfirmasi Penghapusan:</span>
                  Tindakan ini akan mengosongkan rekaman jam masuk, jam pulang, dan status absensi hari ini. Personel akan kembali berstatus <strong>Belum Absen</strong> sehingga dapat melakukan presensi ulang.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => setIsResetDailyModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isResetting || targetResetRecords.length === 0}
                    onClick={handleConfirmResetDaily}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {isResetting ? (
                      <span>Memproses...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Kosongkan & Reset ({targetResetRecords.length})</span>
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
