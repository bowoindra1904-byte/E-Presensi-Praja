import { AttendanceRecord, SecurityLog, NotificationItem, LeaveRequest } from '../types';
import { INITIAL_EMPLOYEES } from './initialEmployees';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateInitialAttendanceRecords(): AttendanceRecord[] {
  // Hanya memuat data presensi riil personel terdaftar Satpol PP
  return [];
}

function _unusedLegacySampleRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = getTodayDateString();

  // 1. Today's live records for sample officers
  records.push(
    {
      id: "ATT-2026-001",
      employeeId: "POLPP-001",
      employeeName: "Hendra Wijaya, S.STP",
      employeeNip: "19880415 201001 1 002",
      date: today,
      scheduleType: "shift",
      locationSlotId: 1,
      locationName: "Slot 1: Mako Utama Satpol PP",
      checkInTime: "07:42:15",
      checkInTimestamp: Date.now() - 3600000 * 3,
      checkInStatus: "tepat_waktu",
      checkInLat: -6.18248,
      checkInLng: 106.82852,
      checkInDistance: 12,
      checkInDeviceId: "DEV-POLPP-KUNCI-HP-001",
      checkInDeviceMatched: true,
      checkInAccuracy: 8,
      notes: "Apel pagi regu operasional lengkap."
    },
    {
      id: "ATT-2026-002",
      employeeId: "POLPP-003",
      employeeName: "Agus Prasetyo, A.Md.",
      employeeNip: "19920120 201402 1 003",
      date: today,
      scheduleType: "harian",
      locationSlotId: 1,
      locationName: "Slot 1: Mako Utama Satpol PP",
      checkInTime: "07:18:04",
      checkInTimestamp: Date.now() - 3600000 * 3.5,
      checkInStatus: "tepat_waktu",
      checkInLat: -6.18251,
      checkInLng: 106.82848,
      checkInDistance: 18,
      checkInDeviceId: "DEV-POLPP-KUNCI-SAMPLE-003",
      checkInDeviceMatched: true,
      checkInAccuracy: 12,
      notes: "Piket pengawasan internal Provost."
    },
    {
      id: "ATT-2026-004",
      employeeId: "POLPP-004",
      employeeName: "Farhan Mahendra",
      employeeNip: "19890514 201101 1 004",
      date: today,
      scheduleType: "shift",
      locationSlotId: 2,
      locationName: "Slot 2: Kompleks Balai Kota",
      checkInTime: "08:14:22",
      checkInTimestamp: Date.now() - 3600000 * 2.5,
      checkInStatus: "terlambat",
      checkInLat: -6.18182,
      checkInLng: 106.82898,
      checkInDistance: 24,
      checkInDeviceId: "DEV-POLPP-100148-A5",
      checkInDeviceMatched: true,
      checkInAccuracy: 14,
      notes: "Terlambat 14 menit karena kendala lalu lintas koridor selatan."
    },
    {
      id: "ATT-2026-005",
      employeeId: "POLPP-007",
      employeeName: "Hendra Suryono",
      employeeNip: "19910928 201301 1 007",
      date: today,
      scheduleType: "shift",
      locationSlotId: 3,
      locationName: "Slot 3: Posko Terpadu Bundaran Simpang Protokol",
      checkInTime: "07:50:31",
      checkInTimestamp: Date.now() - 3600000 * 2.8,
      checkInStatus: "tepat_waktu",
      checkInLat: -6.19504,
      checkInLng: 106.82302,
      checkInDistance: 9,
      checkInDeviceId: "DEV-POLPP-100259-A8",
      checkInDeviceMatched: true,
      checkInAccuracy: 10,
      notes: "Siaga pengamanan car-free corridor."
    },
    {
      id: "ATT-2026-006",
      employeeId: "POLPP-010",
      employeeName: "Joko Santoso",
      employeeNip: "19861105 200901 1 010",
      date: today,
      scheduleType: "shift",
      locationSlotId: 4,
      locationName: "Slot 4: Pos Pengamanan Terminal Terpadu & Stasiun",
      checkInTime: "07:44:19",
      checkInTimestamp: Date.now() - 3600000 * 2.9,
      checkInStatus: "tepat_waktu",
      checkInLat: -6.17672,
      checkInLng: 106.83058,
      checkInDistance: 31,
      checkInDeviceId: "DEV-POLPP-100370-A2",
      checkInDeviceMatched: true,
      checkInAccuracy: 15,
      notes: "Penertiban jalur pejalan kaki stasiun."
    },
    {
      id: "ATT-2026-007",
      employeeId: "POLPP-015",
      employeeName: "Rahmat Wibowo",
      employeeNip: "19930218 201501 1 015",
      date: today,
      scheduleType: "shift",
      locationSlotId: 5,
      locationName: "Slot 5: Pos Ketertiban Pasar Induk & Pusat Niaga",
      checkInTime: "07:55:08",
      checkInTimestamp: Date.now() - 3600000 * 2.7,
      checkInStatus: "tepat_waktu",
      checkInLat: -6.17548,
      checkInLng: 106.84310,
      checkInDistance: 45,
      checkInDeviceId: "DEV-POLPP-100555-A7",
      checkInDeviceMatched: true,
      checkInAccuracy: 18,
      notes: "Piket sterilisasi pintu masuk barat pasar."
    },
    {
      id: "ATT-2026-008",
      employeeId: "POLPP-020",
      employeeName: "Wahyu Gunawan",
      employeeNip: "19900812 201201 1 020",
      date: today,
      scheduleType: "harian",
      locationSlotId: 6,
      locationName: "Slot 6: Pos Pengawalan Rumah Dinas Pimpinan Daerah",
      checkInTime: "07:12:44",
      checkInTimestamp: Date.now() - 3600000 * 3.7,
      checkInStatus: "tepat_waktu",
      checkInLat: -6.20048,
      checkInLng: 106.83204,
      checkInDistance: 14,
      checkInDeviceId: "DEV-POLPP-100740-A3",
      checkInDeviceMatched: true,
      checkInAccuracy: 9,
      notes: "Serah terima regu jaga rumdin."
    },
    {
      id: "ATT-2026-009",
      employeeId: "POLPP-024",
      employeeName: "Farhan Hakim",
      employeeNip: "19940715 201601 1 024",
      date: today,
      scheduleType: "shift",
      locationSlotId: 7,
      locationName: "Slot 7: Pos Penertiban Wisata, Monumen & RTH",
      checkInTime: "07:38:52",
      checkInTimestamp: Date.now() - 3600000 * 3.1,
      checkInStatus: "tepat_waktu",
      checkInLat: -6.17538,
      checkInLng: 106.82715,
      checkInDistance: 38,
      checkInDeviceId: "DEV-POLPP-100888-A7",
      checkInDeviceMatched: true,
      checkInAccuracy: 12,
      notes: "Patroli sepeda kawasan cawan monumen."
    }
  );

  // 2. Multi-day history for the month (e.g. 2026-09-01 to 2026-09-29)
  // Seeded across 150 employees so monthly report calculation has realistic hours & lates
  const dates = [
    "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-07",
    "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-14",
    "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-21",
    "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-28", "2026-09-29"
  ];

  INITIAL_EMPLOYEES.forEach((emp, empIdx) => {
    // Generate ~16-20 working days per employee in this month
    const attendedDates = dates.filter((_, dIdx) => (empIdx + dIdx) % 7 !== 0);
    
    attendedDates.forEach((dStr, dayIdx) => {
      const isShift = emp.scheduleType === 'shift';
      const isLate = (empIdx + dayIdx) % 11 === 0; // occasional late

      let inTime = isShift ? "07:48:00" : "07:18:00";
      let outTime = isShift ? "20:02:00" : "16:05:00";
      if (isLate) {
        inTime = isShift ? "08:14:00" : "07:44:00";
      }

      records.push({
        id: `ATT-HIST-${emp.id}-${dStr}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNip: emp.nip,
        date: dStr,
        scheduleType: emp.scheduleType,
        locationSlotId: emp.locationSlotId,
        locationName: `Slot ${emp.locationSlotId}`,
        checkInTime: inTime,
        checkInTimestamp: new Date(`${dStr}T${inTime}`).getTime(),
        checkInStatus: isLate ? 'terlambat' : 'tepat_waktu',
        checkInDistance: 10 + ((empIdx * 3) % 45),
        checkInDeviceId: emp.boundDeviceId || `DEV-${emp.id}`,
        checkInDeviceMatched: true,
        checkOutTime: outTime,
        checkOutTimestamp: new Date(`${dStr}T${outTime}`).getTime(),
        checkOutStatus: 'pulang_normal',
        notes: isLate ? "Terlambat hadir dinas." : "Kehadiran dinas lengkap."
      });
    });
  });

  return records;
}

export function generateInitialSecurityLogs(): SecurityLog[] {
  return [
    {
      id: "SEC-LOG-01",
      timestamp: "Hari Ini, 07:15 WIB",
      employeeId: "POLPP-012",
      employeeName: "Dedi Susanto",
      eventType: "device_mismatch",
      details: "Percobaan absen dari HP tidak dikenal (DEV-UNKNOWN-8891). Akun terkunci ke DEV-POLPP-100444-A4. Titip absen dicegah.",
      deviceId: "DEV-UNKNOWN-8891"
    },
    {
      id: "SEC-LOG-02",
      timestamp: "Hari Ini, 07:22 WIB",
      employeeId: "POLPP-019",
      employeeName: "Untung Riyadi",
      eventType: "out_of_radius",
      details: "Percobaan presensi di luar radius geofence (Jarak 480m dari Pos 5). Sistem menolak.",
      deviceId: "DEV-POLPP-100703-A2"
    },
    {
      id: "SEC-LOG-03",
      timestamp: "Kemarin, 19:40 WIB",
      employeeId: "POLPP-002",
      employeeName: "Bambang Suryono, S.H.",
      eventType: "device_paired",
      details: "Perangkat dinas Samsung Galaxy A54 berhasil diverifikasi dan dikunci ke profil Komando.",
      deviceId: "DEV-POLPP-KUNCI-SAMPLE-002"
    }
  ];
}

export function generateInitialNotifications(): NotificationItem[] {
  return [
    {
      id: "NOTIF-01",
      targetRole: "admin",
      type: "late",
      title: "Personel Terlambat Hadir",
      message: "Farhan Mahendra (NIP: 19890514 201101 1 004) melakukan absen masuk pukul 08:14 WIB di Slot 2 (Terlambat 14 menit).",
      timestamp: "Hari ini, 08:14 WIB",
      read: false
    },
    {
      id: "NOTIF-02",
      targetRole: "admin",
      type: "invalid_time",
      title: "Percobaan Absensi di Luar Jam",
      message: "Dedi Susanto mencoba absen pada 07:15 WIB di luar radius dan jam yang ditentukan.",
      timestamp: "Hari ini, 07:15 WIB",
      read: false
    },
    {
      id: "NOTIF-03",
      targetRole: "employee",
      targetEmployeeId: "POLPP-001",
      type: "success",
      title: "Presensi Masuk Berhasil",
      message: "Kehadiran Anda berhasil tercatat pada 07:42 WIB di Slot 1: Mako Utama. Selamat bertugas!",
      timestamp: "Hari ini, 07:42 WIB",
      read: false
    },
    {
      id: "NOTIF-04",
      targetRole: "employee",
      type: "checkout_reminder",
      title: "Pengingat Jam Pulang Dinas",
      message: "Jam dinas berakhir tepat pukul 16.00 WIB (Harian) / 20.00 WIB (Shift). Pastikan berada di pos tugas untuk tap absen pulang.",
      timestamp: "Hari ini, 07:00 WIB",
      read: true
    }
  ];
}

export function generateInitialLeaveRequests(): LeaveRequest[] {
  // Hanya memuat permohonan riil dari personel atau input pemutihan dari admin
  return [];
}

