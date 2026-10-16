import { Employee, AttendanceRecord, LeaveRequest } from '../types';

/**
 * Membersihkan format NIP untuk perbandingan akurat (menghilangkan spasi, tanda titik, strip).
 */
export function normalizeNip(nip?: string | null): string {
  if (!nip) return '';
  return nip.replace(/[\s.-]/g, '').trim();
}

/**
 * Membersihkan nama untuk perbandingan (lowercase, hilangkan spasi berlebih).
 */
export function normalizeName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Menentukan apakah sebuah catatan presensi (AttendanceRecord) benar-benar milik pegawai target.
 * 
 * Prinsip Keamanan & Anti Salah Kamar (Zero-Cross-Pollution):
 * 1. Prioritas NIP: Jika NIP pegawai dan record sama-sama ada dan valid (>= 5 digit),
 *    perbandingan NIP menjadi penentu utama.
 * 2. Prioritas Nama: Jika nama record terisi dan nama pegawai terisi, keduanya dibandingkan.
 *    Jika nama jelas berbeda (misal "Hani Aulia" vs "Indra Wibowo"), record DITOLAK MUTLAK
 *    dan TIDAK PERNAH diasosiasikan, meskipun secara kebetulan employeeId-nya sama
 *    (misal karena pergeseran/pengurutan ID POLPP).
 * 3. Fallback ID: Jika nama dan NIP record tidak bertentangan, baru periksa kecocokan employeeId.
 */
export function isRecordForEmployee(
  record: AttendanceRecord,
  employee: Employee
): boolean {
  if (!record || !employee) return false;

  const empName = normalizeName(employee.name);
  const recName = normalizeName(record.employeeName);

  const empNip = normalizeNip(employee.nip);
  const recNip = normalizeNip(record.employeeNip);

  // 1. Cek NIP jika kedua pihak memiliki NIP valid
  const hasValidEmpNip = empNip.length >= 6 && empNip !== '123' && empNip !== '123456';
  const hasValidRecNip = recNip.length >= 6 && recNip !== '123' && recNip !== '123456';

  if (hasValidEmpNip && hasValidRecNip) {
    if (empNip === recNip) return true;
    // NIP valid berbeda secara tegas -> bukan pegawai ini
    return false;
  }

  // 2. Cek Nama Lengkap
  if (recName && empName) {
    if (recName === empName) return true;
    
    // Periksa apakah nama satu merupakan bagian dari nama lain (misal singkatan gelar "Indra, ST" vs "Indra")
    const isNameSubset = 
      (recName.length >= 4 && empName.startsWith(recName)) ||
      (empName.length >= 4 && recName.startsWith(empName));

    if (isNameSubset) return true;

    // Jika nama terisi dan JELAS BEDA (misal "Hani Aulia" vs "Indra Wibowo"):
    // JANGAN PERNAH COCOKKAN MESKIPUN employeeId SAMA!
    return false;
  }

  // 3. Fallback jika nama record kosong: Cocokkan ID
  return record.employeeId === employee.id;
}

/**
 * Menentukan apakah sebuah permohonan/surat izin/dispensasi (LeaveRequest) benar-benar milik pegawai target.
 */
export function isLeaveForEmployee(
  leave: LeaveRequest,
  employee: Employee
): boolean {
  if (!leave || !employee) return false;

  const empName = normalizeName(employee.name);
  const leaveName = normalizeName(leave.employeeName);

  const empNip = normalizeNip(employee.nip);
  const leaveNip = normalizeNip(leave.employeeNip);

  const hasValidEmpNip = empNip.length >= 6 && empNip !== '123' && empNip !== '123456';
  const hasValidLeaveNip = leaveNip.length >= 6 && leaveNip !== '123' && leaveNip !== '123456';

  if (hasValidEmpNip && hasValidLeaveNip) {
    if (empNip === leaveNip) return true;
    return false;
  }

  if (leaveName && empName) {
    if (leaveName === empName) return true;
    const isNameSubset = 
      (leaveName.length >= 4 && empName.startsWith(leaveName)) ||
      (empName.length >= 4 && leaveName.startsWith(empName));
    if (isNameSubset) return true;
    return false;
  }

  return leave.employeeId === employee.id;
}

/**
 * Filter seluruh records presensi milik seorang pegawai dengan aman.
 */
export function filterRecordsForEmployee(
  records: AttendanceRecord[],
  employee: Employee
): AttendanceRecord[] {
  if (!records || !employee) return [];
  return records.filter(r => isRecordForEmployee(r, employee));
}

/**
 * Filter seluruh permohonan cuti/dispensasi milik seorang pegawai dengan aman.
 */
export function filterLeavesForEmployee(
  leaves: LeaveRequest[],
  employee: Employee
): LeaveRequest[] {
  if (!leaves || !employee) return [];
  return leaves.filter(l => isLeaveForEmployee(l, employee));
}

/**
 * Mencari catatan presensi seorang pegawai pada tanggal spesifik.
 * Prioritas Cerdas: Jika terdapat lebih dari satu rekaman (misal rekaman izin otomatis dan
 * rekaman presensi fisik hadir), utamakan rekaman fisik agar jam dinas & kehadiran pegawai tidak hangus.
 */
export function findRecordForEmployeeAndDate(
  records: AttendanceRecord[],
  employee: Employee,
  dateStr: string
): AttendanceRecord | undefined {
  if (!records || !employee) return undefined;
  const matching = records.filter(r => r.date === dateStr && isRecordForEmployee(r, employee));
  if (matching.length === 0) return undefined;
  if (matching.length === 1) return matching[0];

  // 1. Utamakan presensi fisik nyata (tepat waktu / terlambat) dengan jam masuk riil
  const physicalRecord = matching.find(r => 
    (r.checkInStatus === 'tepat_waktu' || r.checkInStatus === 'terlambat') &&
    r.checkInTime && r.checkInTime !== '-' && r.checkInTime !== 'IZIN' && r.checkInTime !== 'SAKIT'
  );
  if (physicalRecord) return physicalRecord;

  // 2. Utamakan dispensasi resmi kantor
  const dispRecord = matching.find(r => r.checkInStatus === 'dispensasi_kantor' || r.isOfficeDispensation);
  if (dispRecord) return dispRecord;

  return matching[0];
}
