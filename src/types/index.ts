export type ScheduleType = 'shift' | 'harian';
export type ReguType = 'Regu 1' | 'Regu 2' | 'Regu 3' | 'Regu 4' | 'Harian';

export interface WorkLocation {
  id: number;
  slotNumber: number; // 1 to 8
  name: string;
  code: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  nip: string;
  name: string;
  role: string; // e.g. Komandan Pleton, Anggota Regu, Danru, Provost, PTI
  rank: string; // Pangkat Satpol PP
  regu: ReguType; // 'Regu 1' | 'Regu 2' | 'Regu 3' | 'Regu 4' | 'Harian'
  scheduleType: ScheduleType; // 'shift' | 'harian'
  locationSlotId: number; // 1 to 8
  boundDeviceId: string | null;
  boundDeviceName?: string | null;
  boundAt?: string | null;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  date: string; // YYYY-MM-DD
  regu?: ReguType;
  scheduleType: ScheduleType;
  locationSlotId: number;
  locationName: string;
  
  // Check-In
  checkInTime?: string; // HH:mm:ss or '-'
  checkInTimestamp?: number;
  checkInStatus?: 'tepat_waktu' | 'terlambat' | 'ditolak_waktu' | 'ditolak_lokasi' | 'ditolak_perangkat' | 'izin' | 'sakit' | 'dispensasi_kantor';
  checkInLat?: number;
  checkInLng?: number;
  checkInDistance?: number;
  checkInDeviceId?: string;
  checkInDeviceMatched?: boolean;
  checkInPhoto?: string;
  checkInAccuracy?: number;
  
  // Check-Out
  checkOutTime?: string; // HH:mm:ss or '-'
  checkOutTimestamp?: number;
  checkOutStatus?: 'pulang_normal' | 'ditolak_waktu' | 'pulang_di_luar_radius';
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutDistance?: number;
  checkOutDeviceId?: string;
  checkOutPhoto?: string;
  
  notes?: string;
  antiSpoofingFlags?: string[];
  leaveRequestId?: string;

  // Office Dispensation (Kendala HP Rusak / Lapangan)
  isOfficeDispensation?: boolean;
  dispensationLetterNumber?: string;
  dispensationLetterPhoto?: string;
  dispensationReason?: string;
  dispensationIssuedBy?: string;
}

export type LeaveType = 'izin' | 'sakit' | 'dispensasi_kantor';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  regu: ReguType;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  reason: string;
  attachmentName?: string;
  attachmentUrl?: string; // Base64 or URL
  status: LeaveStatus;
  appliedAt: string; // YYYY-MM-DD HH:mm
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;

  // Office Dispensation Metadata
  isOfficeDispensation?: boolean;
  dispensationLetterNumber?: string;
  dispensationReason?: string;
  dispensationIssuedBy?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  employeeId: string;
  employeeName: string;
  eventType: 'device_mismatch' | 'device_reset' | 'out_of_radius' | 'mock_gps_detected' | 'device_paired';
  details: string;
  deviceId: string;
  ipMock?: string;
}

export interface TimeEvaluation {
  canCheckIn: boolean;
  canCheckOut: boolean;
  checkInReason: string;
  checkOutReason: string;
  scheduleLabel: string;
  workHoursLabel: string;
  checkInWindowLabel: string;
  checkOutWindowLabel: string;
  isLate: boolean;
  currentDayName: string;
  shiftCycleName?: 'Pagi' | 'Malam';
}

export interface NotificationItem {
  id: string;
  targetRole: 'admin' | 'employee' | 'all';
  targetEmployeeId?: string; // if targeted to specific officer
  type: 'success' | 'warning' | 'late' | 'invalid_time' | 'checkout_reminder' | 'security';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface MonthlyEmployeeReport {
  employeeId: string;
  employeeName: string;
  nip: string;
  rank: string;
  role: string;
  regu: ReguType;
  scheduleType: ScheduleType;
  locationSlotId: number;
  locationName: string;
  totalPresentDays: number;
  totalWorkHours: number;
  totalLateCount: number;
  totalIzinCount?: number;
  totalSakitCount?: number;
  totalDispensasiCount?: number;
  disciplineRate: number; // percentage 0 - 100
  attendancePattern: string; // e.g. "Disiplin Prima (100%)", "Keterlambatan Ringan (1x)", dll.
  records: AttendanceRecord[];

  // Smart Attendance Metrics (Otomatis & Dinamis)
  targetWorkDays?: number;
  totalMonthWorkDays?: number;
  hadirCount?: number;
  lateCount?: number;
  sakitCount?: number;
  izinCount?: number;
  tanpaKeteranganCount?: number;
  pemutihanCount?: number;
  liburCount?: number;
  totalHadirSah?: number;
  attendanceRate?: number; // Persentase Kehadiran Pintar (0-100%)
  dailyBreakdown?: Array<{
    date: string;
    dayNumber: number;
    dayOfWeek: number;
    dayName: string;
    isWorkDay: boolean;
    scheduleLabel: string;
    shiftCycleName?: 'Pagi' | 'Malam' | 'Libur';
    isHoliday: boolean;
    holidayName?: string;
    code: 'H' | 'T' | 'S' | 'I' | 'TK' | 'P' | 'L' | '-';
    codeLabel: string;
    notes?: string;
    workHours?: number;
    record?: AttendanceRecord;
    leaveRequest?: LeaveRequest;
  }>;
}

export interface CustomHoliday {
  id: string; // e.g. "HOL-2026-05-02" or auto-generated
  date: string; // YYYY-MM-DD
  name: string; // e.g. "HUT Kabupaten Bangka Barat"
  type: 'libur_nasional' | 'libur_daerah' | 'cuti_bersama' | 'khusus_instansi';
  appliesTo: 'all' | 'harian_only' | 'shift_only';
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export type AdminRole = 'komando_pusat' | 'danru_1' | 'danru_2' | 'danru_3' | 'danru_4';

export interface AdminAccount {
  id: string; // 'admin-komando', 'admin-danru-1', 'admin-danru-2', 'admin-danru-3', 'admin-danru-4'
  username: string; // e.g. 'komando', 'danru1', 'danru2', 'danru3', 'danru4'
  name: string; // e.g. 'Admin Komando Pusat', 'Danru Regu 1', etc.
  role: AdminRole;
  reguScope?: ReguType | 'all'; // 'all' for komando, or 'Regu 1'..'Regu 4'
  pin: string; // 6-digit PIN riêng masing-masing admin
  phone?: string;
  lastLogin?: string;
  updatedAt?: string;
}

