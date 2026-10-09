import { Employee, AttendanceRecord, LeaveRequest, WorkLocation, ReguType, ScheduleType } from '../types';

// ============================================================================
// DAFTAR HARI LIBUR NASIONAL RESMI INDONESIA (HARI BESAR LAINNYA) TAHUN 2026
// ============================================================================
export const INDONESIAN_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-20': 'Hari Raya Idul Fitri 1447 H (Hari ke-1)',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H (Hari ke-2)',
  '2026-03-22': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-03-23': 'Hari Suci Nyepi Tahun Baru Saka 1948',
  '2026-04-03': 'Wafat Isa Al Masih',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Isa Al Masih',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-17': 'Hari Raya Idul Adha 1447 H',
  '2026-07-07': 'Tahun Baru Islam 1448 Hijriah',
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-81',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Hari Raya Natal',
  '2026-12-26': 'Cuti Bersama Hari Raya Natal',
};

export const INDONESIAN_DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Cek apakah suatu tanggal adalah hari libur nasional / hari besar lainnya
 */
export function isIndonesianHoliday(dateStr: string): { isHoliday: boolean; name?: string } {
  const holidayName = INDONESIAN_HOLIDAYS_2026[dateStr];
  if (holidayName) {
    return { isHoliday: true, name: holidayName };
  }
  return { isHoliday: false };
}

/**
 * Kode Keterangan Presensi Sesuai Ketentuan User:
 * S   = Sakit
 * I   = Izin
 * TK  = Tanpa Keterangan (Alpha)
 * P   = Pemutihan (Dispensasi Kantor / HP Rusak - Menyesuaikan Hadir Sah)
 * H   = Hadir (Tepat Waktu)
 * T   = Terlambat (Bagian dari Hadir)
 * L   = Libur (Weekend / Tanggal Merah untuk Harian, atau Off Siklus untuk Shift)
 * -   = Belum Berlangsung (Hari di masa depan)
 */
export type AttendanceStatusCode = 'H' | 'T' | 'S' | 'I' | 'TK' | 'P' | 'L' | '-';

export interface DayScheduleInfo {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1 to 31
  dayOfWeek: number; // 0=Minggu, 1=Senin, ... 6=Sabtu
  dayName: string;
  isWorkDay: boolean; // Apakah hari ini jadwal dinas / hari wajib kerja
  scheduleLabel: string;
  shiftCycleName?: 'Pagi' | 'Malam' | 'Libur';
  isHoliday: boolean;
  holidayName?: string;
}

export interface DayAttendanceStatus extends DayScheduleInfo {
  code: AttendanceStatusCode;
  codeLabel: string;
  record?: AttendanceRecord;
  leaveRequest?: LeaveRequest;
  notes?: string;
  workHours?: number;
}

/**
 * Menghitung posisi siklus 4 hari untuk Jadwal Shift 12 Jam:
 * Siklus: Pagi (08.00-20.00) -> Malam (20.00-08.00) -> Libur -> Libur
 * 
 * Untuk 4 Regu Satpol PP, rotasi di-offset agar setiap hari selalu ada regu pagi, regu malam, dan regu cadangan/libur.
 */
export function getShiftCycleForDate(
  regu: ReguType | string,
  dateStr: string
): { shiftCycle: 'Pagi' | 'Malam' | 'Libur'; isWorkDay: boolean; label: string } {
  // Anchor date: 2026-01-01
  const anchor = new Date(2026, 0, 1);
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const diffDays = Math.round((targetDate.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));

  // Offset per regu (0=Regu 1, 1=Regu 2, 2=Regu 3, 3=Regu 4)
  let offset = 0;
  if (regu === 'Regu 2') offset = 1;
  else if (regu === 'Regu 3') offset = 2;
  else if (regu === 'Regu 4') offset = 3;

  // Siklus 4 hari: [0: Pagi, 1: Malam, 2: Libur, 3: Libur]
  const cycleIndex = ((diffDays + offset) % 4 + 4) % 4;

  if (cycleIndex === 0) {
    return {
      shiftCycle: 'Pagi',
      isWorkDay: true,
      label: 'Shift Pagi (08.00 - 20.00 WIB)'
    };
  } else if (cycleIndex === 1) {
    return {
      shiftCycle: 'Malam',
      isWorkDay: true,
      label: 'Shift Malam (20.00 - 08.00 WIB)'
    };
  } else if (cycleIndex === 2) {
    return {
      shiftCycle: 'Libur',
      isWorkDay: false,
      label: 'Libur Shift (Lepas Piket Malam)'
    };
  } else {
    return {
      shiftCycle: 'Libur',
      isWorkDay: false,
      label: 'Libur Shift (Cadangan / Istirahat)'
    };
  }
}

/**
 * Menentukan jadwal kerja pegawai pada tanggal tertentu berdasarkan tipe jadwalnya (Harian vs Shift)
 */
export function getEmployeeDaySchedule(
  scheduleType: ScheduleType,
  regu: ReguType,
  dateStr: string
): DayScheduleInfo {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const dayName = INDONESIAN_DAY_NAMES[dayOfWeek];
  const holidayCheck = isIndonesianHoliday(dateStr);

  if (scheduleType === 'harian') {
    // HARIAN: Senin-Jumat kecuali Sabtu, Minggu dan Hari Besar Lainnya
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      return {
        date: dateStr,
        dayNumber: d,
        dayOfWeek,
        dayName,
        isWorkDay: false,
        scheduleLabel: dayOfWeek === 0 ? 'Libur Akhir Pekan (Minggu)' : 'Libur Akhir Pekan (Sabtu)',
        isHoliday: false
      };
    }

    if (holidayCheck.isHoliday) {
      return {
        date: dateStr,
        dayNumber: d,
        dayOfWeek,
        dayName,
        isWorkDay: false,
        scheduleLabel: `Hari Libur Nasional: ${holidayCheck.name}`,
        isHoliday: true,
        holidayName: holidayCheck.name
      };
    }

    // Hari Kerja Senin-Jumat
    const isFriday = dayOfWeek === 5;
    return {
      date: dateStr,
      dayNumber: d,
      dayOfWeek,
      dayName,
      isWorkDay: true,
      scheduleLabel: isFriday ? 'Harian Jumat (07.00 - 16.30 WIB)' : 'Harian Senin-Kamis (07.30 - 16.00 WIB)',
      isHoliday: false
    };
  } else {
    // SHIFT 12 JAM: Pagi - Malam - Libur - Libur dinamis
    const shiftInfo = getShiftCycleForDate(regu, dateStr);
    return {
      date: dateStr,
      dayNumber: d,
      dayOfWeek,
      dayName,
      isWorkDay: shiftInfo.isWorkDay,
      scheduleLabel: shiftInfo.label,
      shiftCycleName: shiftInfo.shiftCycle,
      isHoliday: holidayCheck.isHoliday,
      holidayName: holidayCheck.name
    };
  }
}

/**
 * Evaluasi status presensi per hari untuk seorang pegawai
 */
export function evaluateEmployeeDayAttendance(
  employee: Employee,
  dateStr: string,
  records: AttendanceRecord[],
  leaveRequests: LeaveRequest[],
  todayStr: string
): DayAttendanceStatus {
  const schedule = getEmployeeDaySchedule(employee.scheduleType, employee.regu, dateStr);

  // 1. Cari record presensi di tanggal ini
  const record = records.find(r => r.employeeId === employee.id && r.date === dateStr);

  // 2. Cari izin / sakit / dispensasi kantor yang disetujui (approved) pada rentang tanggal ini
  const approvedLeave = leaveRequests.find(l => {
    if (l.employeeId !== employee.id || l.status !== 'approved') return false;
    return dateStr >= l.startDate && dateStr <= l.endDate;
  });

  // Apakah hari ini sudah berlangsung atau masih di masa depan
  const isPastOrToday = dateStr <= todayStr;

  // Cek apakah ada pemutihan kantor (HP Rusak / Penugasan Khusus)
  const isDispensation = 
    record?.checkInStatus === 'dispensasi_kantor' || 
    record?.isOfficeDispensation || 
    approvedLeave?.isOfficeDispensation || 
    approvedLeave?.type === 'dispensasi_kantor';

  // Evaluasi Kode S, I, TK, P, H, T, L, -
  if (isDispensation) {
    // PEMUTIHAN: Menyesuaikan sebagai kehadiran sah!
    return {
      ...schedule,
      code: 'P',
      codeLabel: 'Pemutihan (Dispensasi HP Rusak / Lapangan Sah)',
      record,
      leaveRequest: approvedLeave,
      notes: record?.dispensationReason || approvedLeave?.reason || 'Dispensasi Surat Kantor Sah',
      workHours: employee.scheduleType === 'shift' ? 12 : 8.5
    };
  }

  if (approvedLeave?.type === 'sakit' || record?.checkInStatus === 'sakit') {
    return {
      ...schedule,
      code: 'S',
      codeLabel: 'Sakit (Surat Dokter / Izin Sakit Resmi)',
      record,
      leaveRequest: approvedLeave,
      notes: approvedLeave?.reason || 'Surat Keterangan Dokter',
      workHours: 0
    };
  }

  if (approvedLeave?.type === 'izin' || record?.checkInStatus === 'izin') {
    return {
      ...schedule,
      code: 'I',
      codeLabel: 'Izin (Permohonan Izin Kedinasan / Pribadi Disetujui)',
      record,
      leaveRequest: approvedLeave,
      notes: approvedLeave?.reason || 'Izin Resmi Disetujui',
      workHours: 0
    };
  }

  // Jika ada record absensi hadir
  if (record && (record.checkInTime || record.checkInStatus === 'tepat_waktu' || record.checkInStatus === 'terlambat')) {
    const isLate = record.checkInStatus === 'terlambat';
    return {
      ...schedule,
      code: isLate ? 'T' : 'H',
      codeLabel: isLate ? 'Hadir Terlambat' : 'Hadir Tepat Waktu',
      record,
      notes: isLate ? `Terlambat (Masuk ${record.checkInTime || '-'})` : `Tepat Waktu (${record.checkInTime || '-'})`,
      workHours: employee.scheduleType === 'shift' ? 12 : 8.5
    };
  }

  // Jika TIDAK ADA absensi dan TIDAK ADA izin/sakit/pemutihan
  if (!schedule.isWorkDay) {
    // Memang hari libur (Sabtu/Minggu/Tanggal Merah untuk Harian, atau Off Siklus untuk Shift)
    return {
      ...schedule,
      code: 'L',
      codeLabel: schedule.scheduleLabel || 'Hari Libur Kedinasan',
      notes: schedule.holidayName ? `Libur Nasional: ${schedule.holidayName}` : 'Off / Lepas Dinas',
      workHours: 0
    };
  }

  // Jadwal dinas / Hari Kerja tapi TIDAK ABSEN
  if (isPastOrToday) {
    // Sudah lewat / hari ini dan tidak ada absen -> TANPA KETERANGAN (TK / ALPHA)
    return {
      ...schedule,
      code: 'TK',
      codeLabel: 'Tanpa Keterangan (Alpha / Tidak Hadir)',
      notes: 'Tidak melakukan absensi dan tidak ada izin/sakit sah',
      workHours: 0
    };
  } else {
    // Belum berlangsung (tanggal di masa mendatang)
    return {
      ...schedule,
      code: '-',
      codeLabel: 'Belum Berlangsung',
      notes: 'Jadwal mendatang',
      workHours: 0
    };
  }
}

export interface SmartMonthlyReportResult {
  employeeId: string;
  employeeName: string;
  nip: string;
  rank: string;
  role: string;
  regu: ReguType;
  scheduleType: ScheduleType;
  locationSlotId: number;
  locationName: string;
  monthString: string; // YYYY-MM

  // Hari Wajib Kerja
  targetWorkDays: number; // Jumlah hari wajib kerja dari awal bulan s.d hari ini
  totalMonthWorkDays: number; // Total hari wajib kerja 1 bulan penuh

  // Rekapitulasi Kode
  hadirCount: number; // H (Hadir Tepat Waktu + Hadir Terlambat)
  onTimeCount: number; // H Tepat Waktu
  lateCount: number; // T (Terlambat)
  sakitCount: number; // S (Sakit)
  izinCount: number; // I (Izin)
  tanpaKeteranganCount: number; // TK (Tanpa Keterangan)
  pemutihanCount: number; // P (Pemutihan HP Rusak / Penugasan Sah)
  liburCount: number; // L (Libur)

  // Kehadiran Sah (Hadir + Pemutihan disesuaikan)
  totalHadirSah: number;

  // Persentase Kehadiran Pintar Otomatis:
  // Rumus: (Hadir Sah / Hari Wajib Kerja) * 100%
  attendanceRate: number; // 0 - 100%

  // Tingkat Ketepatan Waktu (Disiplin Jam)
  disciplineRate: number; // 0 - 100%

  // Total Jam Kerja
  totalWorkHours: number;

  // Predikat / Pola Evaluasi Kehadiran
  attendancePattern: string;

  // Rincian Lengkap Seluruh Hari di Bulan Berjalan (1 s/d 28/30/31)
  dailyBreakdown: DayAttendanceStatus[];
}

/**
 * Menghitung Laporan Rekapan Bulanan Pegawai Secara Pintar & Otomatis
 * Menghitung dari awal bulan pegawai melakukan absensi.
 * Menghitung secara dinamis saat admin mengubah jadwal harian <-> shift 12 jam.
 */
export function calculateSmartMonthlyReport(
  employee: Employee,
  selectedMonth: string, // YYYY-MM (misal: '2026-10')
  allAttendanceRecords: AttendanceRecord[],
  allLeaveRequests: LeaveRequest[],
  locations: WorkLocation[],
  currentDateOverride?: string // opsional tanggal acuan
): SmartMonthlyReportResult {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Jumlah hari di bulan yang dipilih
  const daysInMonth = new Date(year, month, 0).getDate();

  // Tanggal hari ini
  const today = new Date();
  const todayStr = currentDateOverride || (
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  // Filter records & leaves untuk pegawai ini
  const empRecords = allAttendanceRecords.filter(
    r => r.employeeId === employee.id && r.date.startsWith(selectedMonth)
  );

  const empLeaves = allLeaveRequests.filter(
    l => l.employeeId === employee.id && l.status === 'approved' &&
      !l.id.startsWith('LEAVE-SAMPLE-')
  );

  // Ambil lokasi
  const loc = locations.find(l => 
    String(l.id) === String(employee.locationSlotId) || 
    Number(l.slotNumber) === Number(employee.locationSlotId) || 
    Number(l.id) === Number(employee.locationSlotId)
  ) || locations[0];

  // Susun rincian harian 1 s/d daysInMonth
  const dailyBreakdown: DayAttendanceStatus[] = [];
  let targetWorkDays = 0;
  let totalMonthWorkDays = 0;
  let hadirCount = 0;
  let onTimeCount = 0;
  let lateCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let tanpaKeteranganCount = 0;
  let pemutihanCount = 0;
  let liburCount = 0;
  let totalWorkHours = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const status = evaluateEmployeeDayAttendance(employee, dayStr, empRecords, empLeaves, todayStr);
    dailyBreakdown.push(status);

    if (status.isWorkDay) {
      totalMonthWorkDays++;
      if (dayStr <= todayStr) {
        targetWorkDays++;
      }
    }

    if (status.code === 'H') {
      hadirCount++;
      onTimeCount++;
      totalWorkHours += status.workHours || (employee.scheduleType === 'shift' ? 12 : 8.5);
    } else if (status.code === 'T') {
      hadirCount++;
      lateCount++;
      totalWorkHours += status.workHours || (employee.scheduleType === 'shift' ? 12 : 8.5);
    } else if (status.code === 'P') {
      pemutihanCount++;
      totalWorkHours += status.workHours || (employee.scheduleType === 'shift' ? 12 : 8.5);
    } else if (status.code === 'S') {
      sakitCount++;
    } else if (status.code === 'I') {
      izinCount++;
    } else if (status.code === 'TK') {
      tanpaKeteranganCount++;
    } else if (status.code === 'L') {
      liburCount++;
    }
  }

  // Pemutihan menyesuaikan sebagai kehadiran sah
  const totalHadirSah = hadirCount + pemutihanCount;

  // Persentase Kehadiran Pintar Otomatis
  // Dihitung berdasarkan target hari kerja yang telah berlangsung dari awal bulan
  const evaluatedTargetDays = targetWorkDays > 0 ? targetWorkDays : Math.max(1, totalMonthWorkDays);
  const rawAttendanceRate = evaluatedTargetDays > 0 
    ? Math.round((totalHadirSah / evaluatedTargetDays) * 100) 
    : 100;
  const attendanceRate = Math.min(100, Math.max(0, isNaN(rawAttendanceRate) ? 100 : rawAttendanceRate));

  // Tingkat Disiplin Ketepatan Waktu (antara yang hadir)
  const rawDisciplineRate = hadirCount > 0 
    ? Math.round((onTimeCount / hadirCount) * 100) 
    : 100;
  const disciplineRate = Math.min(100, Math.max(0, isNaN(rawDisciplineRate) ? 100 : rawDisciplineRate));

  // Pola Evaluasi
  let attendancePattern = "Disiplin Prima (100% Hadir Tepat Waktu)";
  if (tanpaKeteranganCount > 0) {
    attendancePattern = `Tindakan Disiplin (${tanpaKeteranganCount} Hari TK/Alpha)`;
  } else if (attendanceRate === 100 && lateCount === 0) {
    attendancePattern = "Sempurna (100% Hadir Tepat Waktu)";
  } else if (attendanceRate === 100 && lateCount > 0) {
    attendancePattern = `Hadir Lengkap (${lateCount}x Terlambat)`;
  } else if (sakitCount > 0 || izinCount > 0) {
    attendancePattern = `Kepatuhan Baik (${sakitCount > 0 ? `${sakitCount}S ` : ''}${izinCount > 0 ? `${izinCount}I ` : ''}${pemutihanCount > 0 ? `${pemutihanCount}P` : ''})`;
  } else if (attendanceRate >= 85) {
    attendancePattern = "Tingkat Kehadiran Baik";
  } else {
    attendancePattern = "Perlu Pembinaan Provost";
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    nip: employee.nip,
    rank: employee.rank,
    role: employee.role,
    regu: employee.regu,
    scheduleType: employee.scheduleType,
    locationSlotId: employee.locationSlotId,
    locationName: loc.name,
    monthString: selectedMonth,
    targetWorkDays: evaluatedTargetDays,
    totalMonthWorkDays,
    hadirCount,
    onTimeCount,
    lateCount,
    sakitCount,
    izinCount,
    tanpaKeteranganCount,
    pemutihanCount,
    liburCount,
    totalHadirSah,
    attendanceRate,
    disciplineRate,
    totalWorkHours: Math.round(totalWorkHours * 10) / 10,
    attendancePattern,
    dailyBreakdown,
  };
}

/**
 * Format badge warna untuk kode presensi:
 * S = Sakit (Ungu)
 * I = Izin (Biru)
 * TK = Tanpa Keterangan (Merah)
 * P = Pemutihan (Cyan / Biru Langit)
 * H = Hadir Tepat Waktu (Hijau)
 * T = Hadir Terlambat (Kuning/Amber)
 * L = Libur (Abu-abu Slate)
 * - = Belum Berlangsung (Abu-abu Lembut)
 */
export function getStatusCodeBadge(code: AttendanceStatusCode): {
  bg: string;
  text: string;
  border: string;
  shortLabel: string;
  tooltip: string;
} {
  switch (code) {
    case 'H':
      return {
        bg: 'bg-emerald-100 text-emerald-800',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        shortLabel: 'H',
        tooltip: 'Hadir Tepat Waktu'
      };
    case 'T':
      return {
        bg: 'bg-amber-100 text-amber-900',
        text: 'text-amber-900',
        border: 'border-amber-300',
        shortLabel: 'T',
        tooltip: 'Hadir Terlambat'
      };
    case 'S':
      return {
        bg: 'bg-purple-100 text-purple-800 font-bold',
        text: 'text-purple-800',
        border: 'border-purple-300',
        shortLabel: 'S',
        tooltip: 'Sakit (Surat Dokter / Izin Sakit Sah)'
      };
    case 'I':
      return {
        bg: 'bg-indigo-100 text-indigo-800 font-bold',
        text: 'text-indigo-800',
        border: 'border-indigo-300',
        shortLabel: 'I',
        tooltip: 'Izin (Permohonan Dinas/Pribadi Disetujui)'
      };
    case 'TK':
      return {
        bg: 'bg-rose-100 text-rose-800 font-black',
        text: 'text-rose-800',
        border: 'border-rose-300',
        shortLabel: 'TK',
        tooltip: 'Tanpa Keterangan (Alpha / Tidak Hadir Wajib Kerja)'
      };
    case 'P':
      return {
        bg: 'bg-cyan-100 text-cyan-900 font-bold',
        text: 'text-cyan-900',
        border: 'border-cyan-300',
        shortLabel: 'P',
        tooltip: 'Pemutihan (Dispensasi Kantor / HP Rusak Sah)'
      };
    case 'L':
      return {
        bg: 'bg-slate-100 text-slate-500',
        text: 'text-slate-500',
        border: 'border-slate-200',
        shortLabel: 'L',
        tooltip: 'Libur (Akhir Pekan / Hari Besar / Lepas Dinas)'
      };
    case '-':
    default:
      return {
        bg: 'bg-slate-50 text-slate-300',
        text: 'text-slate-400',
        border: 'border-slate-200',
        shortLabel: '-',
        tooltip: 'Belum Berlangsung'
      };
  }
}
