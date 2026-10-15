import { Employee, AttendanceRecord, LeaveRequest, WorkLocation, ReguType, ScheduleType, CustomHoliday, MonthlyShiftCalibration } from '../types';
import { 
  isRecordForEmployee, 
  isLeaveForEmployee, 
  filterRecordsForEmployee, 
  filterLeavesForEmployee, 
  findRecordForEmployeeAndDate 
} from './employeeMatcher';

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
 * Cek apakah suatu tanggal adalah hari libur nasional / cuti bersama / libur custom daerah
 */
export function isIndonesianHoliday(
  dateStr: string, 
  customHolidays?: CustomHoliday[],
  scheduleType?: ScheduleType
): { isHoliday: boolean; name?: string; holidayType?: string } {
  // 1. Cek custom holidays dari database / admin jika ada
  if (customHolidays && customHolidays.length > 0) {
    const custom = customHolidays.find(h => h.date === dateStr);
    if (custom) {
      // Periksa apakah berlaku untuk tipe jadwal ini
      if (
        custom.appliesTo === 'all' || 
        !scheduleType || 
        (custom.appliesTo === 'harian_only' && scheduleType === 'harian') ||
        (custom.appliesTo === 'shift_only' && scheduleType === 'shift')
      ) {
        return { isHoliday: true, name: custom.name, holidayType: custom.type };
      }
    }
  }

  // 2. Cek hari libur nasional resmi kalender 2026
  const holidayName = INDONESIAN_HOLIDAYS_2026[dateStr];
  if (holidayName) {
    return { isHoliday: true, name: holidayName, holidayType: 'libur_nasional' };
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

export interface LateCategoryDetails {
  minutesLate: number;
  category: 'TL1' | 'TL2' | 'TL3' | 'TL4' | null;
  label: string;
}

export function getLateCategoryDetails(
  record: AttendanceRecord,
  employee: Employee
): LateCategoryDetails {
  if (record.checkInStatus !== 'terlambat' || !record.checkInTime || record.checkInTime === '-') {
    return { minutesLate: 0, category: null, label: 'Tepat Waktu' };
  }

  // Parse checkInTime (format could be HH:mm:ss or HH:mm or HH.mm)
  const parts = record.checkInTime.replace(/\./g, ':').split(':');
  if (parts.length < 2) {
    return { minutesLate: 15, category: 'TL1', label: 'TL 1 (1-30 mnt)' };
  }
  const checkInHours = parseInt(parts[0], 10);
  const checkInMins = parseInt(parts[1], 10);
  if (isNaN(checkInHours) || isNaN(checkInMins)) {
    return { minutesLate: 15, category: 'TL1', label: 'TL 1 (1-30 mnt)' };
  }
  const checkInTotalMins = checkInHours * 60 + checkInMins;

  // Determine official scheduled in time in minutes
  let officialInMins = 7 * 60 + 30; // default 07:30
  if (employee.scheduleType === 'harian') {
    // Check day of week from record.date (YYYY-MM-DD)
    const recDate = new Date(record.date + 'T00:00:00');
    const isFriday = recDate.getDay() === 5;
    officialInMins = isFriday ? 7 * 60 : (7 * 60 + 30);
  } else if (employee.scheduleType === 'shift') {
    if (checkInTotalMins >= 18 * 60 || checkInTotalMins < 5 * 60) {
      officialInMins = 20 * 60; // 20:00 WIB
    } else {
      officialInMins = 8 * 60;  // 08:00 WIB
    }
  }

  let diff = 0;
  if (officialInMins === 20 * 60 && checkInTotalMins < 5 * 60) {
    diff = (24 * 60 - officialInMins) + checkInTotalMins;
  } else {
    diff = checkInTotalMins - officialInMins;
  }

  const minutesLate = Math.max(1, diff);

  let category: 'TL1' | 'TL2' | 'TL3' | 'TL4' = 'TL1';
  let label = 'TL 1 (1-30 mnt)';
  if (minutesLate <= 30) {
    category = 'TL1';
    label = 'TL 1 (1-30 mnt)';
  } else if (minutesLate <= 60) {
    category = 'TL2';
    label = 'TL 2 (31-60 mnt)';
  } else if (minutesLate <= 90) {
    category = 'TL3';
    label = 'TL 3 (61-90 mnt)';
  } else {
    // Diatas 90 menit dikategorikan sebagai TL 4
    category = 'TL4';
    label = 'TL 4 (>90 mnt)';
  }

  return { minutesLate, category, label };
}

export interface DayAttendanceStatus extends DayScheduleInfo {
  code: AttendanceStatusCode;
  codeLabel: string;
  record?: AttendanceRecord;
  leaveRequest?: LeaveRequest;
  notes?: string;
  workHours?: number;
  isMissingCheckOut?: boolean; // True jika pegawai hadir tapi tidak melakukan absen pulang pada hari/jam dinas yang telah selesai
  lateDetails?: LateCategoryDetails;
}

// ============================================================================
// KALKULASI PINTAR ROTASI SHIFT DINAMIS (PENYESUAIAN AWAL BULAN TIAP REGU)
// ============================================================================
export const SHIFT_CALIBRATION_STORAGE_KEY = 'satpol_pp_monthly_shift_calibrations';

let cachedStoredShiftCalibrations: MonthlyShiftCalibration[] | null = null;
const reguMonthlyCalibrationCache = new Map<string, MonthlyShiftCalibration>();

export function invalidateStoredShiftCalibrationsCache(): void {
  cachedStoredShiftCalibrations = null;
  reguMonthlyCalibrationCache.clear();
}

export function getStoredShiftCalibrations(): MonthlyShiftCalibration[] {
  if (cachedStoredShiftCalibrations !== null) {
    return cachedStoredShiftCalibrations;
  }
  try {
    const raw = localStorage.getItem(SHIFT_CALIBRATION_STORAGE_KEY);
    cachedStoredShiftCalibrations = raw ? JSON.parse(raw) : [];
    return cachedStoredShiftCalibrations || [];
  } catch {
    cachedStoredShiftCalibrations = [];
    return [];
  }
}

export function saveStoredShiftCalibration(calibration: MonthlyShiftCalibration): void {
  try {
    const existing = getStoredShiftCalibrations();
    const filtered = existing.filter(c => !(c.month === calibration.month && c.regu === calibration.regu));
    filtered.push(calibration);
    cachedStoredShiftCalibrations = filtered;
    reguMonthlyCalibrationCache.clear();
    localStorage.setItem(SHIFT_CALIBRATION_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save calibration:', err);
  }
}

export function removeStoredShiftCalibration(month: string, regu: ReguType | string): void {
  try {
    const existing = getStoredShiftCalibrations();
    const filtered = existing.filter(c => !(c.month === month && c.regu === regu));
    cachedStoredShiftCalibrations = filtered;
    reguMonthlyCalibrationCache.clear();
    localStorage.setItem(SHIFT_CALIBRATION_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to remove calibration:', err);
  }
}

/**
 * Deteksi pintar awal shift tiap regu dari presensi perdana di awal bulan.
 * Karena untuk shift tidak ada jadwal baku kalender kaku, sistem kalkulasi pintar
 * aplikasi menyesuaikan siklus tiap regu dari pertama kali absen di awal tiap bulan.
 */
export function detectReguMonthlyShiftCalibration(
  regu: ReguType | string,
  monthStr: string, // YYYY-MM
  records: AttendanceRecord[],
  employees?: Employee[],
  specificEmployeeId?: string
): MonthlyShiftCalibration {
  // Check memory cache for non-specific regu lookups
  const cacheKey = !specificEmployeeId ? `${monthStr}:${regu}` : null;
  if (cacheKey && reguMonthlyCalibrationCache.has(cacheKey)) {
    return reguMonthlyCalibrationCache.get(cacheKey)!;
  }

  // 1. Cek apakah ada penyesuaian manual yang tersimpan di sistem oleh Admin / Danru
  const storedList = getStoredShiftCalibrations();
  const manualConfig = storedList.find(c => c.month === monthStr && c.regu === regu && !c.isAutoDetected);
  if (manualConfig) {
    if (cacheKey) reguMonthlyCalibrationCache.set(cacheKey, manualConfig);
    return manualConfig;
  }

  // 2. Evaluasi presensi di bulan ini
  const validRecordsInMonth = records.filter(r => 
    r.date.startsWith(monthStr) && 
    (r.checkInTime || r.checkInStatus === 'tepat_waktu' || r.checkInStatus === 'terlambat')
  );

  // Jika spesifik untuk 1 personel, cek apakah personel ini sudah memiliki absen perdana di bulan ini
  if (specificEmployeeId) {
    const targetEmp = employees?.find(e => e.id === specificEmployeeId);
    const personalRecords = targetEmp 
      ? filterRecordsForEmployee(validRecordsInMonth, targetEmp)
      : validRecordsInMonth.filter(r => r.employeeId === specificEmployeeId);
    if (personalRecords.length > 0) {
      personalRecords.sort((a, b) => a.date.localeCompare(b.date) || (a.checkInTime || '').localeCompare(b.checkInTime || ''));
      const first = personalRecords[0];
      const hour = first.checkInTime ? parseInt(first.checkInTime.split(':')[0], 10) : 8;
      const cycle: 'Pagi' | 'Malam' = (hour >= 6 && hour < 17) ? 'Pagi' : 'Malam';

      return {
        month: monthStr,
        regu: (regu as ReguType) || 'Regu 1',
        anchorDate: first.date,
        anchorCycle: cycle,
        isAutoDetected: true,
        firstAttendanceDate: first.date,
        firstShiftCycle: cycle,
        detectedEmployeeName: first.employeeName,
        detectedEmployeeId: first.employeeId,
        detectedCheckInTime: first.checkInTime,
        notes: `Menyesuaikan presensi perdana ${first.employeeName} (${first.date} - ${first.checkInTime || '-'} WIB)`
      };
    }
  }

  // Cek apakah ada rekan satu regu yang sudah absen di bulan ini
  const reguEmpIds = employees 
    ? new Set(employees.filter(e => e.regu === regu).map(e => e.id))
    : null;

  const reguRecords = validRecordsInMonth.filter(r => 
    r.regu === regu || (reguEmpIds && reguEmpIds.has(r.employeeId))
  );

  if (reguRecords.length > 0) {
    reguRecords.sort((a, b) => a.date.localeCompare(b.date) || (a.checkInTime || '').localeCompare(b.checkInTime || ''));
    const first = reguRecords[0];
    const hour = first.checkInTime ? parseInt(first.checkInTime.split(':')[0], 10) : 8;
    const cycle: 'Pagi' | 'Malam' = (hour >= 6 && hour < 17) ? 'Pagi' : 'Malam';

    return {
      month: monthStr,
      regu: (regu as ReguType) || 'Regu 1',
      anchorDate: first.date,
      anchorCycle: cycle,
      isAutoDetected: true,
      firstAttendanceDate: first.date,
      firstShiftCycle: cycle,
      detectedEmployeeName: first.employeeName,
      detectedEmployeeId: first.employeeId,
      detectedCheckInTime: first.checkInTime,
      notes: `Menyesuaikan presensi perdana regu oleh ${first.employeeName} (${first.date} - ${first.checkInTime || '-'} WIB)`
    };
  }

  // 3. Jika belum ada yang absen di bulan ini, gunakan baseline staggered default awal bulan
  const defaultDay1 = `${monthStr}-01`;
  if (regu === 'Regu 1') {
    return {
      month: monthStr,
      regu: 'Regu 1',
      anchorDate: defaultDay1,
      anchorCycle: 'Pagi',
      isAutoDetected: false,
      notes: 'Proyeksi baseline awal bulan: Regu 1 (Mulai Pagi Tgl 01)'
    };
  } else if (regu === 'Regu 2') {
    return {
      month: monthStr,
      regu: 'Regu 2',
      anchorDate: defaultDay1,
      anchorCycle: 'Malam',
      isAutoDetected: false,
      notes: 'Proyeksi baseline awal bulan: Regu 2 (Mulai Malam Tgl 01)'
    };
  } else if (regu === 'Regu 3') {
    return {
      month: monthStr,
      regu: 'Regu 3',
      anchorDate: `${monthStr}-03`,
      anchorCycle: 'Pagi',
      isAutoDetected: false,
      notes: 'Proyeksi baseline awal bulan: Regu 3 (Libur Tgl 01-02, Mulai Pagi Tgl 03)'
    };
  } else if (regu === 'Regu 4') {
    return {
      month: monthStr,
      regu: 'Regu 4',
      anchorDate: `${monthStr}-04`,
      anchorCycle: 'Pagi',
      isAutoDetected: false,
      notes: 'Proyeksi baseline awal bulan: Regu 4 (Libur Tgl 01-03, Mulai Pagi Tgl 04)'
    };
  } else {
    return {
      month: monthStr,
      regu: 'Harian',
      anchorDate: defaultDay1,
      anchorCycle: 'Pagi',
      isAutoDetected: false,
      notes: 'Jadwal Harian Reguler Mako'
    };
  }
}

/**
 * Mendapatkan kalibrasi shift awal bulan untuk seluruh regu
 */
export function getAllReguMonthlyShiftCalibrations(
  monthStr: string,
  records: AttendanceRecord[],
  employees?: Employee[]
): Record<ReguType, MonthlyShiftCalibration> {
  const regus: ReguType[] = ['Regu 1', 'Regu 2', 'Regu 3', 'Regu 4', 'Harian'];
  const result = {} as Record<ReguType, MonthlyShiftCalibration>;
  for (const regu of regus) {
    result[regu] = detectReguMonthlyShiftCalibration(regu, monthStr, records, employees);
  }
  return result;
}

/**
 * Menghitung posisi siklus 4 hari untuk Jadwal Shift 12 Jam:
 * Siklus: Pagi (08.00-20.00) -> Malam (20.00-08.00) -> Libur -> Libur
 * 
 * Menggunakan sistem kalibrasi pintar aplikasi yang menyesuaikan personil tiap regu
 * dari pertama absen diawal tiap bulan.
 */
export function getShiftCycleForDate(
  regu: ReguType | string,
  dateStr: string,
  calibration?: MonthlyShiftCalibration | null
): { shiftCycle: 'Pagi' | 'Malam' | 'Libur'; isWorkDay: boolean; label: string } {
  if (calibration && calibration.anchorDate) {
    const anchorDate = calibration.anchorDate;
    const anchorCycle = calibration.anchorCycle || 'Pagi';

    // Tanggal sebelum absen perdana di awal bulan:
    // Personil dinyatakan Lepas Dinas / Libur Shift (Menunggu Giliran Piket Awal Bulan)
    // dan TIDAK dihitung sebagai Alpa / TK.
    if (dateStr < anchorDate) {
      return {
        shiftCycle: 'Libur',
        isWorkDay: false,
        label: 'Libur Shift (Menunggu Giliran Dinas Awal Bulan)'
      };
    }

    // Tanggal pada atau setelah absen perdana
    const [y1, m1, d1] = anchorDate.split('-').map(Number);
    const [y2, m2, d2] = dateStr.split('-').map(Number);
    const t1 = new Date(y1, m1 - 1, d1).getTime();
    const t2 = new Date(y2, m2 - 1, d2).getTime();
    const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));

    const baseIndex = anchorCycle === 'Malam' ? 1 : 0;
    const cycleIndex = ((diffDays + baseIndex) % 4 + 4) % 4;

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

  // Fallback jika tidak ada calibration (default distribution 4 Regu awal bulan)
  const [y, m, d] = dateStr.split('-').map(Number);
  const diffDays = d - 1;

  let offset = 0;
  if (regu === 'Regu 2') offset = 1;
  else if (regu === 'Regu 3') offset = 2;
  else if (regu === 'Regu 4') offset = 3;

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
  dateStr: string,
  customHolidays?: CustomHoliday[],
  calibration?: MonthlyShiftCalibration | null
): DayScheduleInfo {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const dayName = INDONESIAN_DAY_NAMES[dayOfWeek];
  const holidayCheck = isIndonesianHoliday(dateStr, customHolidays, scheduleType);

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
        scheduleLabel: `Hari Libur: ${holidayCheck.name}`,
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
    // SHIFT 12 JAM: Disesuaikan pintar dari absen perdana di awal bulan
    const shiftInfo = getShiftCycleForDate(regu, dateStr, calibration);
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
 * Evaluasi status presensi per hari untuk seorang pegawai (Versi Teroptimasi O(1))
 */
export function evaluateEmployeeDayAttendanceFast(
  employee: Employee,
  dateStr: string,
  record: AttendanceRecord | undefined,
  approvedLeave: LeaveRequest | undefined,
  todayStr: string,
  customHolidays?: CustomHoliday[],
  calibration?: MonthlyShiftCalibration | null,
  currentTotalMinutes?: number,
  isFridayToday?: boolean
): DayAttendanceStatus {
  const schedule = getEmployeeDaySchedule(employee.scheduleType, employee.regu, dateStr, customHolidays, calibration);

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

    // Evaluasi Kedisiplinan Opsi A: Apakah dinas sudah selesai dan pegawai tidak absen pulang?
    let isDutyEnded = dateStr < todayStr;
    if (dateStr === todayStr) {
      const totalM = currentTotalMinutes !== undefined ? currentTotalMinutes : (new Date().getHours() * 60 + new Date().getMinutes());
      const isFri = isFridayToday !== undefined ? isFridayToday : (new Date().getDay() === 5);
      const endOfDayMinutes = employee.scheduleType === 'harian'
        ? (isFri ? 16 * 60 + 30 : 16 * 60)
        : 20 * 60; // Shift Pagi selesai 20:00 WIB
      if (totalM >= endOfDayMinutes) {
        isDutyEnded = true;
      }
    }

    const isMissingCheckOut = isDutyEnded && (!record.checkOutTime || record.checkOutTime === '-');
    const workHours = isMissingCheckOut 
      ? 4 
      : (employee.scheduleType === 'shift' ? 12 : 8.5);

    let notes = isLate ? `Terlambat (Masuk ${record.checkInTime || '-'})` : `Tepat Waktu (${record.checkInTime || '-'})`;
    if (isMissingCheckOut) {
      notes += ' · TAP (Tanpa Tap Pulang - Sanksi Jam: 4 Jam)';
    }

    return {
      ...schedule,
      code: isLate ? 'T' : 'H',
      codeLabel: isMissingCheckOut 
        ? `${isLate ? 'Hadir Terlambat' : 'Hadir Tepat Waktu'} (Tanpa Pulang - Sanksi 4 Jam)`
        : (isLate ? 'Hadir Terlambat' : 'Hadir Tepat Waktu'),
      record,
      notes,
      workHours,
      isMissingCheckOut
    };
  }

  // Jika TIDAK ADA absensi dan TIDAK ADA izin/sakit/pemutihan
  if (!schedule.isWorkDay) {
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
    return {
      ...schedule,
      code: 'TK',
      codeLabel: 'Tanpa Keterangan (Alpha / Tidak Hadir)',
      notes: 'Tidak melakukan absensi dan tidak ada izin/sakit sah',
      workHours: 0
    };
  } else {
    return {
      ...schedule,
      code: '-',
      codeLabel: 'Belum Berlangsung',
      notes: 'Jadwal mendatang',
      workHours: 0
    };
  }
}

/**
 * Evaluasi status presensi per hari untuk seorang pegawai (Kompatibel penuh)
 */
export function evaluateEmployeeDayAttendance(
  employee: Employee,
  dateStr: string,
  records: AttendanceRecord[],
  leaveRequests: LeaveRequest[],
  todayStr: string,
  customHolidays?: CustomHoliday[],
  calibration?: MonthlyShiftCalibration | null
): DayAttendanceStatus {
  // 1. Cari record presensi di tanggal ini secara aman & anti salah kamar
  const record = findRecordForEmployeeAndDate(records, employee, dateStr);

  // 2. Cari izin / sakit / dispensasi kantor yang disetujui (approved) pada rentang tanggal ini
  const approvedLeave = leaveRequests.find(l => {
    if (!isLeaveForEmployee(l, employee) || l.status !== 'approved') return false;
    return dateStr >= l.startDate && dateStr <= l.endDate;
  });

  return evaluateEmployeeDayAttendanceFast(
    employee,
    dateStr,
    record,
    approvedLeave,
    todayStr,
    customHolidays,
    calibration
  );
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
  
  // Rincian Keterlambatan Resmi:
  // TL 1: 1 - 30 menit
  // TL 2: 31 - 60 menit
  // TL 3: 61 - 90 menit
  // TL 4: > 90 menit (Keterlambatan di atas 90 menit)
  tl1Count: number;
  tl2Count: number;
  tl3Count: number;
  tl4Count: number;
  totalTlCount: number;

  sakitCount: number; // S (Sakit)
  izinCount: number; // I (Izin)
  tanpaKeteranganCount: number; // TK (Tanpa Keterangan)
  pemutihanCount: number; // P (Pemutihan HP Rusak / Penugasan Sah)
  tidakTapPulangCount: number; // TAP (Tanpa Absen Pulang - Sanksi Jam 4 Jam & Disiplin)
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

  // Kalibrasi Shift Pintar Awal Bulan (Berdasarkan absen pertama tiap regu)
  shiftCalibration?: MonthlyShiftCalibration;
}

/**
 * Menghitung Laporan Rekapan Bulanan Pegawai Secara Pintar & Otomatis
 * Menghitung dari awal bulan pegawai melakukan absensi.
 * Menghitung secara dinamis saat admin mengubah jadwal harian <-> shift 12 jam.
 * Mengadaptasi siklus shift 12 jam dari absen pertama di awal bulan untuk tiap regu.
 */
export function calculateSmartMonthlyReport(
  employee: Employee,
  selectedMonth: string, // YYYY-MM (misal: '2026-10')
  allAttendanceRecords: AttendanceRecord[],
  allLeaveRequests: LeaveRequest[],
  locations: WorkLocation[],
  currentDateOverride?: string, // opsional tanggal acuan
  customHolidays?: CustomHoliday[],
  allEmployees?: Employee[],
  customCalibration?: MonthlyShiftCalibration | null
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

  // Menentukan kalibrasi shift rotasi untuk pegawai / regu ini di bulan ini
  const calibration = customCalibration !== undefined 
    ? customCalibration 
    : (employee.scheduleType === 'shift' 
        ? detectReguMonthlyShiftCalibration(employee.regu, selectedMonth, allAttendanceRecords, allEmployees, employee.id)
        : null);

  // Filter records & leaves untuk pegawai ini secara aman & anti salah kamar
  const empRecords = filterRecordsForEmployee(allAttendanceRecords, employee).filter(
    r => r.date.startsWith(selectedMonth)
  );

  const empLeaves = filterLeavesForEmployee(allLeaveRequests, employee).filter(
    l => l.status === 'approved' && !l.id.startsWith('LEAVE-SAMPLE-')
  );

  // Pre-index empRecords by date for O(1) instant lookup
  const recordByDate = new Map<string, AttendanceRecord>();
  for (let i = 0; i < empRecords.length; i++) {
    recordByDate.set(empRecords[i].date, empRecords[i]);
  }

  // Pre-index empLeaves by date for O(1) instant lookup
  const leaveByDate = new Map<string, LeaveRequest>();
  for (let i = 0; i < empLeaves.length; i++) {
    const l = empLeaves[i];
    if (l.startDate && l.endDate && l.startDate <= l.endDate) {
      let cur = l.startDate;
      while (cur <= l.endDate && cur.slice(0, 7) <= selectedMonth) {
        if (cur.startsWith(selectedMonth) && !leaveByDate.has(cur)) {
          leaveByDate.set(cur, l);
        }
        const [cy, cm, cd] = cur.split('-').map(Number);
        const nextD = new Date(cy, cm - 1, cd + 1);
        const ny = nextD.getFullYear();
        const nm = String(nextD.getMonth() + 1).padStart(2, '0');
        const nd = String(nextD.getDate()).padStart(2, '0');
        cur = `${ny}-${nm}-${nd}`;
      }
    }
  }

  // Ambil lokasi
  const loc = locations.find(l => 
    String(l.id) === String(employee.locationSlotId) || 
    Number(l.slotNumber) === Number(employee.locationSlotId) || 
    Number(l.id) === Number(employee.locationSlotId)
  ) || locations[0];

  // Pre-compute current time for the duty-ended evaluation once per employee
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const isFridayToday = now.getDay() === 5;

  // Susun rincian harian 1 s/d daysInMonth
  const dailyBreakdown: DayAttendanceStatus[] = [];
  let targetWorkDays = 0;
  let totalMonthWorkDays = 0;
  let hadirCount = 0;
  let onTimeCount = 0;
  let lateCount = 0;
  let tl1Count = 0;
  let tl2Count = 0;
  let tl3Count = 0;
  let tl4Count = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let tanpaKeteranganCount = 0;
  let pemutihanCount = 0;
  let tidakTapPulangCount = 0;
  let liburCount = 0;
  let totalWorkHours = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const status = evaluateEmployeeDayAttendanceFast(
      employee, 
      dayStr, 
      recordByDate.get(dayStr), 
      leaveByDate.get(dayStr), 
      todayStr, 
      customHolidays,
      calibration,
      currentTotalMinutes,
      isFridayToday
    );
    dailyBreakdown.push(status);

    if (status.isWorkDay) {
      totalMonthWorkDays++;
      if (dayStr <= todayStr) {
        targetWorkDays++;
      }
    }

    if (status.isMissingCheckOut) {
      tidakTapPulangCount++;
    }

    if (status.code === 'H') {
      hadirCount++;
      onTimeCount++;
      totalWorkHours += status.workHours !== undefined ? status.workHours : (employee.scheduleType === 'shift' ? 12 : 8.5);
    } else if (status.code === 'T') {
      hadirCount++;
      lateCount++;
      const lateDet = status.record 
        ? getLateCategoryDetails(status.record, employee) 
        : { minutesLate: 15, category: 'TL1' as const, label: 'TL 1 (1-30 mnt)' };
      status.lateDetails = lateDet;
      if (lateDet.category === 'TL1') tl1Count++;
      else if (lateDet.category === 'TL2') tl2Count++;
      else if (lateDet.category === 'TL3') tl3Count++;
      else if (lateDet.category === 'TL4') tl4Count++;
      else tl1Count++;

      totalWorkHours += status.workHours !== undefined ? status.workHours : (employee.scheduleType === 'shift' ? 12 : 8.5);
    } else if (status.code === 'P') {
      pemutihanCount++;
      totalWorkHours += status.workHours !== undefined ? status.workHours : (employee.scheduleType === 'shift' ? 12 : 8.5);
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

  // Cek apakah bulan yang dipilih berada di masa depan
  const currentMonthYear = todayStr.substring(0, 7);
  const isFutureMonth = selectedMonth > currentMonthYear;

  // Persentase Kehadiran Pintar Otomatis
  // Dihitung berdasarkan target hari kerja yang telah berlangsung dari awal bulan s.d hari ini
  const evaluatedTargetDays = isFutureMonth 
    ? 0 
    : (targetWorkDays > 0 ? targetWorkDays : (selectedMonth === currentMonthYear ? targetWorkDays : totalMonthWorkDays));

  let attendanceRate = 100;
  if (!isFutureMonth && evaluatedTargetDays > 0) {
    const rawAttendanceRate = Math.round((totalHadirSah / evaluatedTargetDays) * 100);
    attendanceRate = Math.min(100, Math.max(0, isNaN(rawAttendanceRate) ? 100 : rawAttendanceRate));
  }

  // Tingkat Disiplin Ketepatan Waktu & Kepatuhan Absen Pulang (Opsi A)
  // Kehadiran yang benar-benar tertib adalah tepat waktu (bukan terlambat) DAN tertib tap pulang (bukan TAP)
  const penalizedDays = lateCount + tidakTapPulangCount;
  const fullDisciplineDays = Math.max(0, hadirCount - penalizedDays);
  const rawDisciplineRate = hadirCount > 0 
    ? Math.round((fullDisciplineDays / hadirCount) * 100) 
    : 100;
  const disciplineRate = Math.min(100, Math.max(0, isNaN(rawDisciplineRate) ? 100 : rawDisciplineRate));

  // Pola Evaluasi
  let attendancePattern = "Disiplin Prima (100% Hadir Tepat Waktu & Tertib Pulang)";
  if (isFutureMonth) {
    attendancePattern = "Jadwal Penugasan Mendatang";
  } else if (tanpaKeteranganCount > 0) {
    attendancePattern = `Tindakan Disiplin (${tanpaKeteranganCount} Hari TK/Alpha)`;
  } else if (tidakTapPulangCount > 0 && lateCount > 0) {
    attendancePattern = `Sanksi Disiplin (${tidakTapPulangCount}x Tanpa Pulang, ${lateCount}x Terlambat)`;
  } else if (tidakTapPulangCount > 0) {
    attendancePattern = `Peringatan Disiplin (${tidakTapPulangCount}x Tanpa Pulang - Sanksi 4 Jam)`;
  } else if (attendanceRate === 100 && lateCount === 0) {
    attendancePattern = "Sempurna (100% Hadir Tepat Waktu & Tertib Pulang)";
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
    tl1Count,
    tl2Count,
    tl3Count,
    tl4Count,
    totalTlCount: tl1Count + tl2Count + tl3Count + tl4Count,
    sakitCount,
    izinCount,
    tanpaKeteranganCount,
    pemutihanCount,
    tidakTapPulangCount,
    liburCount,
    totalHadirSah,
    attendanceRate,
    disciplineRate,
    totalWorkHours: Math.round(totalWorkHours * 10) / 10,
    attendancePattern,
    dailyBreakdown,
    shiftCalibration: calibration || undefined,
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
