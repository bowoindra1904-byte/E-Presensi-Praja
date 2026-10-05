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
  checkInStatus?: 'tepat_waktu' | 'terlambat' | 'ditolak_waktu' | 'ditolak_lokasi' | 'ditolak_perangkat' | 'izin' | 'sakit';
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
}

export type LeaveType = 'izin' | 'sakit';
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
  disciplineRate: number; // percentage 0 - 100
  attendancePattern: string; // e.g. "Disiplin Prima (100%)", "Keterlambatan Ringan (1x)", dll.
  records: AttendanceRecord[];
}

