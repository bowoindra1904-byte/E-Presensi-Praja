import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  WorkLocation, 
  AttendanceRecord, 
  SecurityLog,
  NotificationItem
} from '../types';
import { 
  evaluateAttendanceTime, 
  formatScheduleBadge 
} from '../utils/scheduleRules';
import { 
  getOrCreateDeviceId, 
  calculateDistanceMeters, 
  validateAntiSpoofing 
} from '../utils/deviceLock';
import { MapComponent } from './MapComponent';
import { CameraCapture } from './CameraCapture';
import { 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Navigation, 
  UserCheck, 
  Clock, 
  Camera, 
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';

interface EmployeeViewProps {
  employee: Employee; // Current logged-in officer (strictly view own profile)
  locations: WorkLocation[];
  currentDate: Date;
  attendanceRecords: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  onUpdateAttendance: (record: AttendanceRecord) => void;
  onAddSecurityLog: (log: SecurityLog) => void;
  onAddNotification: (notif: NotificationItem) => void;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  employee,
  locations,
  currentDate,
  attendanceRecords,
  onAddAttendance,
  onUpdateAttendance,
  onAddSecurityLog,
  onAddNotification,
}) => {
  const location = locations.find(l => l.id === employee.locationSlotId) || locations[0];

  // Device identifier (runs silently under the hood without showing debug boxes)
  const currentDevice = getOrCreateDeviceId();

  // Officer GPS coordinates (defaults near assigned location)
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    isRealGps: boolean;
  }>({
    latitude: location.latitude + 0.00012,
    longitude: location.longitude + 0.00008,
    accuracy: 12,
    isRealGps: false,
  });

  // Selfie capture state
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    description: string;
  } | null>(null);

  // Update default coordinates when assigned location changes
  useEffect(() => {
    if (!userCoords.isRealGps) {
      setUserCoords({
        latitude: location.latitude + 0.00012,
        longitude: location.longitude + 0.00008,
        accuracy: 12,
        isRealGps: false,
      });
    }
  }, [location.id]);

  // Compute live distance
  const currentDistance = calculateDistanceMeters(
    userCoords.latitude,
    userCoords.longitude,
    location.latitude,
    location.longitude
  );

  const isWithinGeofence = currentDistance <= location.radiusMeters;
  const antiSpoof = validateAntiSpoofing(userCoords, location);

  // Evaluate time window
  const timeEval = evaluateAttendanceTime(employee.scheduleType, currentDate);

  // Device match check (enforced silently)
  const isDeviceMatched = !employee.boundDeviceId || employee.boundDeviceId === currentDevice.deviceId;

  // Today's record for this employee
  const todayDateStr = currentDate.toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find(
    r => r.employeeId === employee.id && r.date === todayDateStr
  );

  // GPS Refresh via real device GPS
  const handleRequestRealGps = () => {
    if (!navigator.geolocation) {
      setAlertMessage({
        type: 'error',
        title: 'GPS Tidak Didukung',
        description: 'Browser tidak mendukung sensor Geolocation.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15,
          isRealGps: true,
        });
        setAlertMessage({
          type: 'success',
          title: 'Koordinat GPS Aktual Terhubung',
          description: `Akurasi sinyal satelit: ±${Math.round(pos.coords.accuracy || 15)} meter.`
        });
      },
      (err) => {
        setAlertMessage({
          type: 'warning',
          title: 'Sinyal GPS Mandiri',
          description: `Menggunakan koordinat pos terintegrasi (${err.message}).`
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Perform Clock-In
  const handleCheckIn = () => {
    // 1. Silent Device Security Validation
    if (!isDeviceMatched) {
      const errTitle = 'Absensi Ditolak: Perangkat Berbeda!';
      const errDesc = `Sistem Kunci Perangkat menolak absensi. Akun Anda terdaftar pada perangkat dinas lain. Segera lapor ke Petugas Provost / Admin Komando Satpol PP.`;
      setAlertMessage({
        type: 'error',
        title: errTitle,
        description: errDesc
      });

      // Notify Admin in Real-Time
      onAddNotification({
        id: `NOTIF-DEV-${Date.now()}`,
        targetRole: 'admin',
        type: 'security',
        title: `Pelanggaran Kunci Perangkat: ${employee.name}`,
        message: `${employee.name} (NIP: ${employee.nip}) mencoba absen masuk menggunakan perangkat tidak terdaftar (${currentDevice.deviceId}). Percobaan ditolak.`,
        timestamp: `${currentDate.toLocaleTimeString('id-ID')} WIB`,
        read: false
      });

      onAddSecurityLog({
        id: `SEC-REJECT-DEV-${Date.now()}`,
        timestamp: `${timeEval.currentDayName}, ${currentDate.toLocaleTimeString('id-ID')} WIB`,
        employeeId: employee.id,
        employeeName: employee.name,
        eventType: 'device_mismatch',
        details: `Percobaan absen masuk ditolak: ID Perangkat [${currentDevice.deviceId}] tidak cocok dengan ID Terdaftar [${employee.boundDeviceId}].`,
        deviceId: currentDevice.deviceId
      });
      return;
    }

    // 2. Time Window Check (Hanya bisa absen 30 menit dari jam masuknya)
    if (!timeEval.canCheckIn) {
      setAlertMessage({
        type: 'error',
        title: 'Absensi Ditolak: Di Luar Jendela Waktu!',
        description: timeEval.checkInReason
      });

      // Notify Admin: Absensi di luar jam yang ditentukan
      onAddNotification({
        id: `NOTIF-OUTOFTIME-${Date.now()}`,
        targetRole: 'admin',
        type: 'invalid_time',
        title: `Absensi di Luar Jam: ${employee.name}`,
        message: `${employee.name} (NIP: ${employee.nip}) mencoba melakukan absensi pada pukul ${currentDate.toLocaleTimeString('id-ID')} WIB di luar jam dinas yang ditentukan.`,
        timestamp: `${currentDate.toLocaleTimeString('id-ID')} WIB`,
        read: false
      });
      return;
    }

    // 3. GPS Geofence Check
    if (!isWithinGeofence) {
      setAlertMessage({
        type: 'error',
        title: 'Absensi Ditolak: Di Luar Radius Pos Tugas!',
        description: `Jarak Anda (${currentDistance}m) melebihi batas radius pos (${location.radiusMeters}m). Harap merapat ke lokasi penugasan.`
      });

      onAddNotification({
        id: `NOTIF-GEO-${Date.now()}`,
        targetRole: 'admin',
        type: 'invalid_time',
        title: `Di Luar Radius: ${employee.name}`,
        message: `${employee.name} mencoba absen masuk di luar radius geofence (${currentDistance}m dari ${location.name}).`,
        timestamp: `${currentDate.toLocaleTimeString('id-ID')} WIB`,
        read: false
      });

      onAddSecurityLog({
        id: `SEC-REJECT-GEO-${Date.now()}`,
        timestamp: `${timeEval.currentDayName}, ${currentDate.toLocaleTimeString('id-ID')} WIB`,
        employeeId: employee.id,
        employeeName: employee.name,
        eventType: 'out_of_radius',
        details: `Presensi ditolak di luar radius: ${currentDistance}m dari ${location.name} (Batas ${location.radiusMeters}m).`,
        deviceId: currentDevice.deviceId
      });
      return;
    }

    const checkInTimeString = currentDate.toLocaleTimeString('id-ID', { hour12: false });
    const isLate = timeEval.isLate;

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNip: employee.nip,
      date: todayDateStr,
      scheduleType: employee.scheduleType,
      locationSlotId: location.id,
      locationName: location.name,
      checkInTime: checkInTimeString,
      checkInTimestamp: Date.now(),
      checkInStatus: isLate ? 'terlambat' : 'tepat_waktu',
      checkInLat: userCoords.latitude,
      checkInLng: userCoords.longitude,
      checkInDistance: currentDistance,
      checkInDeviceId: currentDevice.deviceId,
      checkInDeviceMatched: true,
      checkInPhoto: selfiePhoto || undefined,
      checkInAccuracy: Math.round(userCoords.accuracy),
      notes: isLate ? "Hadir terlambat melewati batas jam dinas." : "Hadir tepat waktu di pos penugasan."
    };

    onAddAttendance(newRecord);

    // Confirmation notification sent to Employee
    onAddNotification({
      id: `NOTIF-CONFIRM-IN-${Date.now()}`,
      targetRole: 'employee',
      targetEmployeeId: employee.id,
      type: 'success',
      title: 'Absen Masuk Berhasil!',
      message: `Presensi kehadiran Anda berhasil tercatat pada ${checkInTimeString} WIB di ${location.name} (${isLate ? 'Status: Terlambat' : 'Status: Tepat Waktu'}). Selamat bertugas!`,
      timestamp: `${checkInTimeString} WIB`,
      read: false
    });

    // If Late, dispatch Real-Time Notification to Admin!
    if (isLate) {
      onAddNotification({
        id: `NOTIF-LATE-${Date.now()}`,
        targetRole: 'admin',
        type: 'late',
        title: `Personel Terlambat: ${employee.name}`,
        message: `${employee.name} (NIP: ${employee.nip}) melakukan absen masuk pukul ${checkInTimeString} WIB di Slot ${location.slotNumber}: ${location.name} (Terlambat).`,
        timestamp: `${checkInTimeString} WIB`,
        read: false
      });
    }

    setAlertMessage({
      type: 'success',
      title: 'Absen Masuk Berhasil Tercatat!',
      description: `Pukul ${checkInTimeString} WIB di ${location.name}. (${isLate ? 'Status: Terlambat' : 'Status: Tepat Waktu'})`
    });
  };

  // Perform Clock-Out
  const handleCheckOut = () => {
    if (!todayRecord) {
      setAlertMessage({
        type: 'warning',
        title: 'Belum Absen Masuk',
        description: 'Anda harus melakukan absen masuk terlebih dahulu sebelum absen pulang.'
      });
      return;
    }

    if (!isDeviceMatched) {
      setAlertMessage({
        type: 'error',
        title: 'Absensi Pulang Ditolak: Perangkat Berbeda!',
        description: 'Perangkat tidak sesuai dengan otorisasi akun dinas.'
      });
      return;
    }

    // "pulang hanya bisa absen tepat pada jam pulangnya"
    if (!timeEval.canCheckOut) {
      setAlertMessage({
        type: 'error',
        title: 'Absensi Pulang Ditolak: Belum Jam Pulang!',
        description: timeEval.checkOutReason
      });

      // Notify Admin
      onAddNotification({
        id: `NOTIF-EARLY-OUT-${Date.now()}`,
        targetRole: 'admin',
        type: 'invalid_time',
        title: `Percobaan Pulang Sebelum Jam: ${employee.name}`,
        message: `${employee.name} mencoba tap absen pulang sebelum jam dinas berakhir (${timeEval.workHoursLabel}). Percobaan ditolak sistem.`,
        timestamp: `${currentDate.toLocaleTimeString('id-ID')} WIB`,
        read: false
      });
      return;
    }

    if (!isWithinGeofence) {
      setAlertMessage({
        type: 'error',
        title: 'Absen Pulang Ditolak: Di Luar Pos Tugas',
        description: `Anda berada ${currentDistance}m dari pos tugas. Absen pulang harus dilakukan di pos penugasan.`
      });
      return;
    }

    const checkOutTimeString = currentDate.toLocaleTimeString('id-ID', { hour12: false });

    const updated: AttendanceRecord = {
      ...todayRecord,
      checkOutTime: checkOutTimeString,
      checkOutTimestamp: Date.now(),
      checkOutStatus: 'pulang_normal',
      checkOutLat: userCoords.latitude,
      checkOutLng: userCoords.longitude,
      checkOutDistance: currentDistance,
      checkOutDeviceId: currentDevice.deviceId,
      notes: `${todayRecord.notes || ''} | Selesai dinas pada jam pulang resmi.`
    };

    onUpdateAttendance(updated);

    // Confirmation notification sent to Employee
    onAddNotification({
      id: `NOTIF-CONFIRM-OUT-${Date.now()}`,
      targetRole: 'employee',
      targetEmployeeId: employee.id,
      type: 'success',
      title: 'Absen Pulang Berhasil!',
      message: `Dinas selesai. Absensi kepulangan Anda tercatat pukul ${checkOutTimeString} WIB. Terima kasih atas dedikasi dan pelayanan Anda.`,
      timestamp: `${checkOutTimeString} WIB`,
      read: false
    });

    setAlertMessage({
      type: 'success',
      title: 'Absen Pulang Berhasil!',
      description: `Dinas Anda selesai. Tercatat pada pukul ${checkOutTimeString} WIB.`
    });
  };

  const schedBadge = formatScheduleBadge(employee.scheduleType);

  return (
    <div className="space-y-6">
      
      {/* Officer Personal Card (Read-only, dignified & authoritative) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0 shadow-inner">
              <UserCheck className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{employee.name}</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/20 border-amber-500/40 text-amber-300">
                  {employee.regu}
                </span>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${schedBadge.bg} ${schedBadge.text}`}>
                  {schedBadge.label}
                </span>
                <span className="text-[11px] font-medium bg-slate-950 px-2.5 py-0.5 rounded-full text-slate-300 border border-slate-800">
                  {employee.rank}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                <span>NIP: <strong className="text-slate-300 font-mono">{employee.nip}</strong></span>
                <span>·</span>
                <span>Jabatan: <strong className="text-slate-300">{employee.role}</strong></span>
                <span>·</span>
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {location.name} (Radius Ketat: {location.radiusMeters}m)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-950/70 px-3.5 py-2 rounded-2xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-left text-xs">
              <span className="text-[10px] text-slate-400 block">Sistem Keamanan</span>
              <span className="font-semibold text-emerald-400">GPS & Kunci Perangkat Aktif</span>
            </div>
          </div>

        </div>
      </div>

      {/* Alert Messages */}
      {alertMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 shadow-lg animate-in fade-in duration-200 ${
            alertMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : alertMessage.type === 'warning'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          {alertMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : alertMessage.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="text-sm font-bold">{alertMessage.title}</h4>
            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{alertMessage.description}</p>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 cols): Schedule Rules & Selfie Camera */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Schedule Rules & Time Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Aturan Jam Kerja & Presensi</h3>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {timeEval.currentDayName}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Tipe Jam Kerja:</span>
                  <span className="font-bold text-white uppercase">{employee.scheduleType === 'harian' ? 'Harian' : 'Shift'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Jam Dinas Resmi:</span>
                  <span className="font-mono font-bold text-amber-400">{timeEval.workHoursLabel}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Jendela Absen Masuk:</span>
                  <span className="text-slate-200">{timeEval.checkInWindowLabel}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Ketentuan Absen Pulang:</span>
                  <span className="text-slate-200 font-semibold">{timeEval.checkOutWindowLabel}</span>
                </div>
              </div>

              {/* Status explanation */}
              <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                timeEval.canCheckIn 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="font-semibold mb-0.5 text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Status Absen Masuk:
                </div>
                {timeEval.checkInReason}
              </div>

              <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                timeEval.canCheckOut 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="font-semibold mb-0.5 text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Status Absen Pulang:
                </div>
                {timeEval.checkOutReason}
              </div>
            </div>
          </div>

          {/* Card: Selfie Photo Verification */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Verifikasi Swafoto Seragam Dinas</h3>
              </div>
              <span className="text-[11px] text-slate-400">Bukti Kehadiran</span>
            </div>

            <CameraCapture
              photoUrl={selfiePhoto}
              onPhotoCaptured={(url) => setSelfiePhoto(url)}
              onClearPhoto={() => setSelfiePhoto(null)}
            />
          </div>

        </div>

        {/* Right Column (7 cols): GPS Geofence Map, Distance Radar & Tap Actions */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: GPS Geofence Radar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Pelacak Lokasi Digital Berbasis GPS</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Peta Satelit
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pos Penugasan: <span className="font-semibold text-amber-400">{location.name}</span>
                </p>
              </div>

              {/* Distance Badge */}
              <div className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-2 shrink-0 ${
                isWithinGeofence
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${isWithinGeofence ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                <span>Jarak: {currentDistance} Meter</span>
                <span className="text-[10px] opacity-80">
                  ({isWithinGeofence ? `Dalam Radius ${location.radiusMeters}m` : `Luar Radius ${location.radiusMeters}m`})
                </span>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="mt-2">
              <MapComponent
                locations={locations}
                activeLocationId={location.id}
                userCoords={userCoords}
                height="320px"
                zoom={16}
              />
            </div>

            {/* GPS Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Radius Geofence</span>
                <span className="font-mono font-bold text-white text-sm">{location.radiusMeters} m</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Jarak Saat Ini</span>
                <span className={`font-mono font-bold text-sm ${isWithinGeofence ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currentDistance} m
                </span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Akurasi GPS</span>
                <span className="font-mono font-bold text-slate-200 text-sm">±{Math.round(userCoords.accuracy)} m</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Anti-Fake GPS</span>
                <span className={`font-bold text-sm ${antiSpoof.isValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {antiSpoof.securityScore}% Valid
                </span>
              </div>
            </div>

            {/* Refresh GPS Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleRequestRealGps}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Segarkan GPS HP</span>
              </button>
            </div>
          </div>

          {/* Card: Attendance Action Panel (Tap Presensi Masuk & Pulang) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Panel Presensi Tugas Lapangan
                </h3>
                <p className="text-xs text-slate-400">
                  Hanya bisa absen 30 menit sebelum dinas & absen pulang tepat pada jam pulangnya
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                {currentDate.toLocaleTimeString('id-ID')} WIB
              </span>
            </div>

            {/* Tap Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              
              {/* Tap Masuk */}
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={!!todayRecord?.checkInTime}
                className={`py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg text-center ${
                  todayRecord?.checkInTime
                    ? 'bg-slate-800/60 text-slate-400 border border-slate-700/50 cursor-not-allowed'
                    : timeEval.canCheckIn && isWithinGeofence
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold ring-2 ring-emerald-500/30 active:scale-95'
                    : 'bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-700/60 font-semibold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold">
                    {todayRecord?.checkInTime ? "Sudah Absen Masuk" : "TAP ABSEN MASUK"}
                  </span>
                </div>
                <span className="text-[11px] opacity-80">
                  {todayRecord?.checkInTime 
                    ? `Pukul ${todayRecord.checkInTime} WIB` 
                    : timeEval.canCheckIn 
                    ? "(Jendela waktu masuk terbuka)" 
                    : "(Dibuka 30 menit sebelum masuk)"}
                </span>
              </button>

              {/* Tap Pulang */}
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={!todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
                className={`py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg text-center ${
                  !todayRecord?.checkInTime
                    ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
                    : todayRecord?.checkOutTime
                    ? 'bg-slate-800/60 text-slate-400 border border-slate-700/50 cursor-not-allowed'
                    : timeEval.canCheckOut && isWithinGeofence
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold ring-2 ring-amber-500/30 active:scale-95'
                    : 'bg-amber-900/40 hover:bg-amber-900/60 text-amber-200 border border-amber-700/60 font-semibold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-bold">
                    {todayRecord?.checkOutTime ? "Sudah Absen Pulang" : "TAP ABSEN PULANG"}
                  </span>
                </div>
                <span className="text-[11px] opacity-80">
                  {todayRecord?.checkOutTime 
                    ? `Pukul ${todayRecord.checkOutTime} WIB` 
                    : timeEval.canCheckOut 
                    ? "(Jam pulang telah tercapai)" 
                    : "(Hanya tepat pada jam pulang)"}
                </span>
              </button>

            </div>

            {/* Today's Presensi Summary */}
            {todayRecord && (
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>Bukti Presensi Hari Ini:</span>
                  <span className="font-mono text-emerald-400">{todayRecord.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span>Masuk: </span>
                    <span className="text-white font-mono font-bold">{todayRecord.checkInTime || '-'} WIB</span>
                    <span className="ml-1 text-emerald-400 font-medium">({todayRecord.checkInStatus})</span>
                  </div>
                  <div>
                    <span>Pulang: </span>
                    <span className="text-white font-mono font-bold">{todayRecord.checkOutTime || 'Belum Pulang'} {todayRecord.checkOutTime ? 'WIB' : ''}</span>
                  </div>
                </div>
                {todayRecord.notes && (
                  <p className="text-[11px] text-slate-400 italic">
                    Catatan: {todayRecord.notes}
                  </p>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
