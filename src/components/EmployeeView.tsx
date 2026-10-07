import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  WorkLocation, 
  AttendanceRecord, 
  SecurityLog,
  NotificationItem,
  LeaveRequest
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
import { EmployeeAttendanceRecap } from './employee/EmployeeAttendanceRecap';
import { EmployeeLeaveView } from './employee/EmployeeLeaveView';
import { 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Navigation, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  CalendarCheck, 
  HeartHandshake, 
  Fingerprint,
  RotateCcw,
  Stethoscope,
  FileText
} from 'lucide-react';

interface EmployeeViewProps {
  employee: Employee;
  locations: WorkLocation[];
  currentDate: Date;
  attendanceRecords: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  onSubmitLeaveRequest?: (request: LeaveRequest) => void;
  onAddAttendance: (record: AttendanceRecord) => void;
  onUpdateAttendance: (record: AttendanceRecord) => void;
  onAddSecurityLog: (log: SecurityLog) => void;
  onAddNotification: (notif: NotificationItem) => void;
}

export type EmployeeTab = 'presence' | 'recap' | 'leave_izin' | 'leave_sakit' | 'leave';

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  employee,
  locations,
  currentDate,
  attendanceRecords,
  leaveRequests = [],
  onSubmitLeaveRequest = () => {},
  onAddAttendance,
  onUpdateAttendance,
  onAddSecurityLog,
  onAddNotification,
}) => {
  // Navigation tab on sidebar
  const [activeTab, setActiveTab] = useState<EmployeeTab>('presence');

  const location = locations.find(l => l.id === employee.locationSlotId) || locations[0] || {
    id: 1,
    slotNumber: 1,
    name: 'Mako Utama Satpol PP',
    code: 'POS-01-MAKO',
    category: 'Markas Komando',
    address: 'Jl. Jenderal Sudirman',
    latitude: -6.1825,
    longitude: 106.8285,
    radiusMeters: 20,
    description: 'Pusat komando',
    isActive: true
  };

  // Device identifier (silently enforced)
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

  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    description: string;
  } | null>(null);

  const [isRulesExpanded, setIsRulesExpanded] = useState<boolean>(false);

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

  // Compute live distance to assigned location
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

  // Device match check
  const isDeviceMatched = !employee.boundDeviceId || employee.boundDeviceId === currentDevice.deviceId;

  // Today's record for this employee
  const todayDateStr = currentDate.toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find(
    r => r.employeeId === employee.id && r.date === todayDateStr
  );

  // Count my pending leaves
  const myPendingLeaves = leaveRequests.filter(r => r.employeeId === employee.id && r.status === 'pending').length;

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
          title: 'Koordinat GPS Terhubung',
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
    if (!isDeviceMatched) {
      const errTitle = 'Absensi Ditolak: Perangkat Berbeda!';
      const errDesc = `Sistem Kunci Perangkat menolak absensi. Akun Anda terdaftar pada perangkat dinas lain. Segera lapor ke Petugas Provost / Admin Komando Satpol PP.`;
      setAlertMessage({
        type: 'error',
        title: errTitle,
        description: errDesc
      });

      onAddSecurityLog({
        id: `SEC-MISMATCH-${Date.now()}`,
        timestamp: `${currentDate.toLocaleTimeString('id-ID')} WIB`,
        employeeId: employee.id,
        employeeName: employee.name,
        eventType: 'device_mismatch',
        details: `Upaya Presensi Masuk dari Device ID [${currentDevice.deviceId}] ditolak. Perangkat terdaftar: [${employee.boundDeviceId}].`,
        deviceId: currentDevice.deviceId
      });

      onAddNotification({
        id: `NOTIF-SEC-${Date.now()}`,
        targetRole: 'admin',
        type: 'security',
        title: `Pelanggaran Kunci HP: ${employee.name}`,
        message: `${employee.name} mencoba absen masuk dari HP tak terdaftar (ID: ${currentDevice.deviceId.slice(0, 8)}...).`,
        timestamp: `${currentDate.toLocaleTimeString('id-ID')} WIB`,
        read: false
      });
      return;
    }

    if (!isWithinGeofence) {
      const errTitle = 'Absensi Ditolak: Di Luar Radius Pos!';
      const errDesc = `Jarak Anda saat ini ${currentDistance}m dari pos (${location.name}). Batas radius toleransi resmi adalah ${location.radiusMeters}m.`;
      setAlertMessage({
        type: 'error',
        title: errTitle,
        description: errDesc
      });

      onAddSecurityLog({
        id: `SEC-RADIUS-${Date.now()}`,
        timestamp: `${currentDate.toLocaleTimeString('id-ID')} WIB`,
        employeeId: employee.id,
        employeeName: employee.name,
        eventType: 'out_of_radius',
        details: `Upaya presensi masuk di luar radius geofence: ${currentDistance} meter (Maks: ${location.radiusMeters}m) di ${location.name}.`,
        deviceId: currentDevice.deviceId
      });
      return;
    }

    if (!timeEval.canCheckIn) {
      setAlertMessage({
        type: 'warning',
        title: 'Jendela Waktu Absen Belum Dibuka',
        description: timeEval.checkInReason
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
      checkInAccuracy: Math.round(userCoords.accuracy),
      notes: isLate ? "Hadir terlambat melewati batas jam dinas." : "Hadir tepat waktu di pos penugasan."
    };

    onAddAttendance(newRecord);

    onAddNotification({
      id: `NOTIF-CONFIRM-IN-${Date.now()}`,
      targetRole: 'employee',
      targetEmployeeId: employee.id,
      type: 'success',
      title: 'Absen Masuk Berhasil!',
      message: `Presensi kehadiran Anda berhasil tercatat pukul ${checkInTimeString} WIB di ${location.name} (${isLate ? 'Status: Terlambat' : 'Status: Tepat Waktu'}). Selamat bertugas!`,
      timestamp: `${checkInTimeString} WIB`,
      read: false
    });

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
    if (!todayRecord || !todayRecord.checkInTime) {
      setAlertMessage({
        type: 'warning',
        title: 'Belum Ada Rekaman Masuk',
        description: 'Anda harus melakukan Absen Masuk terlebih dahulu sebelum dapat Absen Pulang.'
      });
      return;
    }

    if (todayRecord.checkOutTime) {
      setAlertMessage({
        type: 'warning',
        title: 'Sudah Absen Pulang',
        description: `Presensi kepulangan hari ini telah tercatat pukul ${todayRecord.checkOutTime} WIB.`
      });
      return;
    }

    if (!isDeviceMatched) {
      setAlertMessage({
        type: 'error',
        title: 'Absensi Pulang Ditolak: Perangkat Berbeda',
        description: 'Perangkat tidak sesuai dengan akun Anda.'
      });
      return;
    }

    if (!isWithinGeofence) {
      setAlertMessage({
        type: 'error',
        title: 'Absensi Pulang Ditolak: Di Luar Radius Pos',
        description: `Jarak Anda saat ini ${currentDistance}m. Absen pulang harus dilakukan tepat di pos dinas Anda (${location.name}).`
      });
      return;
    }

    if (!timeEval.canCheckOut) {
      setAlertMessage({
        type: 'warning',
        title: 'Jam Pulang Dinas Belum Tercapai',
        description: timeEval.checkOutReason
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
    <div className="space-y-4 sm:space-y-6">
      
      {/* Officer Personal Dignity Card (Compact & streamlined for mobile) */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xs relative">
        <div className="flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 font-bold shrink-0 shadow-inner">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  {employee.name}
                </h2>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 border-amber-300 text-amber-800">
                  {employee.regu}
                </span>
                <span className={`hidden sm:inline-block text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full border ${schedBadge.bg} ${schedBadge.text} border-slate-200`}>
                  {schedBadge.label}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded-full text-slate-700 border border-slate-200 truncate max-w-[110px] sm:max-w-none">
                  {employee.rank}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                <span className="font-mono text-slate-700">NIP: {employee.nip}</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline text-slate-700">{employee.role}</span>
                <span className="hidden sm:inline">·</span>
                <span className="text-amber-800 font-semibold flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">{location.name}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Security Device Lock Status */}
          <div className="shrink-0 flex items-center">
            {/* Desktop Full Box */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] text-slate-500 block leading-none">Keamanan HP</span>
                <span className="font-bold text-emerald-700 text-[11px]">GPS & Kunci Aktif</span>
              </div>
            </div>
            {/* Mobile Pill Badge */}
            <div className="md:hidden flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200 text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Kunci HP Aktif</span>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Personel Menu Tab Bar (Compact & fits 100% phone width seamlessly) */}
      <div className="lg:hidden grid grid-cols-4 gap-1 p-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('presence')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
            activeTab === 'presence'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Fingerprint className="w-4 h-4 shrink-0" />
          <span className="truncate">Presensi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recap')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
            activeTab === 'recap'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CalendarCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">Rekap</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leave_izin')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all relative ${
            activeTab === 'leave_izin' || activeTab === 'leave'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <HeartHandshake className="w-4 h-4 shrink-0" />
          <span className="truncate">Izin Dinas</span>
          {myPendingLeaves > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-2 sm:right-3 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leave_sakit')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all ${
            activeTab === 'leave_sakit'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
          }`}
        >
          <Stethoscope className="w-4 h-4 shrink-0" />
          <span className="truncate">Surat Sakit</span>
        </button>
      </div>

      {/* Main Layout with Sidebar Navigation */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
        
        {/* Left Sidebar Navigation (Desktop Only) */}
        <aside className="hidden lg:block w-72 bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 shadow-xs shrink-0 space-y-3">
          
          <div className="px-2 py-1 flex items-center justify-between">
            <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Menu Personel</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Praja Wibawa
            </span>
          </div>

          {/* Desktop Sidebar Buttons with Rich Modern Design */}
          <nav className="flex flex-col gap-2">
            
            {/* Group 1: Kehadiran */}
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
              Kehadiran Tugas
            </div>

            {/* Tab 1: Presensi Tugas */}
            <button
              type="button"
              onClick={() => setActiveTab('presence')}
              className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all text-left border ${
                activeTab === 'presence'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-600 shadow-md shadow-amber-600/25 ring-2 ring-amber-500/20'
                  : 'text-slate-700 hover:text-slate-900 bg-slate-50/60 hover:bg-amber-50/50 border-slate-200/80 hover:border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'presence' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate">Presensi Tugas</div>
                  <div className={`text-[10px] font-normal truncate ${activeTab === 'presence' ? 'text-amber-100' : 'text-slate-400'}`}>
                    Absensi Masuk & Pulang GPS
                  </div>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                todayRecord?.checkInTime 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {todayRecord?.checkInTime ? 'Hadir' : 'Absen'}
              </span>
            </button>

            {/* Tab 2: Rekap Kehadiran */}
            <button
              type="button"
              onClick={() => setActiveTab('recap')}
              className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all text-left border ${
                activeTab === 'recap'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-600 shadow-md shadow-amber-600/25 ring-2 ring-amber-500/20'
                  : 'text-slate-700 hover:text-slate-900 bg-slate-50/60 hover:bg-amber-50/50 border-slate-200/80 hover:border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'recap' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-700'
                }`}>
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate">Rekap Kehadiran</div>
                  <div className={`text-[10px] font-normal truncate ${activeTab === 'recap' ? 'text-amber-100' : 'text-slate-400'}`}>
                    Riwayat Dinas & Absensi Saya
                  </div>
                </div>
              </div>
            </button>

            {/* Group 2: Pelayanan Izin & Sakit */}
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">
              Layanan Izin & Sakit
            </div>

            {/* Tab 3: Pengajuan Izin */}
            <button
              type="button"
              onClick={() => setActiveTab('leave_izin')}
              className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all text-left border ${
                activeTab === 'leave_izin' || activeTab === 'leave'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-600 shadow-md shadow-amber-600/25 ring-2 ring-amber-500/20'
                  : 'text-slate-700 hover:text-slate-900 bg-slate-50/60 hover:bg-amber-50/50 border-slate-200/80 hover:border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'leave_izin' || activeTab === 'leave' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate">Pengajuan Izin</div>
                  <div className={`text-[10px] font-normal truncate ${activeTab === 'leave_izin' ? 'text-amber-100' : 'text-slate-400'}`}>
                    Permohonan Izin Kedinasan
                  </div>
                </div>
              </div>
              {myPendingLeaves > 0 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 animate-pulse shrink-0">
                  {myPendingLeaves} Pending
                </span>
              )}
            </button>

            {/* Tab 4: Surat Keterangan Sakit */}
            <button
              type="button"
              onClick={() => setActiveTab('leave_sakit')}
              className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all text-left border ${
                activeTab === 'leave_sakit'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border-purple-600 shadow-md shadow-purple-600/25 ring-2 ring-purple-500/20'
                  : 'text-slate-700 hover:text-purple-900 bg-slate-50/60 hover:bg-purple-50/50 border-slate-200/80 hover:border-purple-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'leave_sakit' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate">Surat Izin Sakit</div>
                  <div className={`text-[10px] font-normal truncate ${activeTab === 'leave_sakit' ? 'text-purple-100' : 'text-slate-400'}`}>
                    Keterangan Sakit & Dokter
                  </div>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                activeTab === 'leave_sakit' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
              }`}>
                Medis
              </span>
            </button>

          </nav>

          {/* Officer Status Footer Widget in Sidebar */}
          <div className="hidden lg:block pt-3 border-t border-slate-100">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span>Status Pos Hari Ini</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-[11px] text-amber-800 truncate">
                Slot {location.slotNumber}: {location.name}
              </p>
              <p className="text-[10px] text-amber-700/80">
                Radius resmi: {location.radiusMeters} meter
              </p>
            </div>
          </div>

        </aside>

        {/* Right Content Area */}
        <main className="flex-1 w-full min-w-0">
          
          {/* TAB 1: PRESENSI DINAS (STREAMLINED & MAP REMOVED) */}
          {activeTab === 'presence' && (
            <div className="space-y-4 sm:space-y-5">
              
              {/* Alert Messages */}
              {alertMessage && (
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 shadow-xs animate-in fade-in duration-200 ${
                    alertMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : alertMessage.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {alertMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : alertMessage.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold">{alertMessage.title}</h4>
                    <p className="text-[11px] sm:text-xs mt-0.5 opacity-90 leading-relaxed">{alertMessage.description}</p>
                  </div>
                  <button
                    onClick={() => setAlertMessage(null)}
                    className="text-xs opacity-70 hover:opacity-100 p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Attendance Action Panel Card */}
              <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      Panel Presensi Tugas Lapangan
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      Wajib berada dalam radius pos penugasan ({location.radiusMeters} meter)
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-amber-200 shrink-0">
                    {currentDate.toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>

                {/* Live GPS Distance Radar Banner */}
                <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-center justify-between text-xs font-semibold gap-2 ${
                  isWithinGeofence
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${isWithinGeofence ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                    <span className="truncate text-xs">
                      {isWithinGeofence
                        ? `Posisi GPS Sesuai: ${currentDistance}m dari ${location.name} (Radius toleransi: ${location.radiusMeters}m)`
                        : `Di Luar Pos: ${currentDistance}m dari ${location.name} (Maksimal: ${location.radiusMeters}m)`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestRealGps}
                    className="text-xs font-bold underline hover:text-amber-800 shrink-0 text-amber-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Segarkan GPS</span>
                  </button>
                </div>

                {/* Big Action Tap Buttons (Side-by-side on mobile for compact viewport) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-1">
                  
                  {/* Tap Masuk */}
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={!!todayRecord?.checkInTime}
                    className={`py-3 sm:py-4 px-2 sm:px-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-xs text-center ${
                      todayRecord?.checkInTime
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : timeEval.canCheckIn && isWithinGeofence
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold ring-2 ring-emerald-500/20 active:scale-98'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span className="text-xs sm:text-base font-extrabold tracking-tight sm:tracking-wide">
                        {todayRecord?.checkInTime ? "Sudah Masuk" : "TAP MASUK"}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] opacity-80 truncate max-w-full">
                      {todayRecord?.checkInTime 
                        ? `${todayRecord.checkInTime} WIB` 
                        : timeEval.canCheckIn 
                        ? "Waktu Masuk Aktif" 
                        : "Buka -30 Menit"}
                    </span>
                  </button>

                  {/* Tap Pulang */}
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={!todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
                    className={`py-3 sm:py-4 px-2 sm:px-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-xs text-center ${
                      !todayRecord?.checkInTime
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : todayRecord?.checkOutTime
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : timeEval.canCheckOut && isWithinGeofence
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold ring-2 ring-amber-500/20 active:scale-98'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span className="text-xs sm:text-base font-extrabold tracking-tight sm:tracking-wide">
                        {todayRecord?.checkOutTime ? "Sudah Pulang" : "TAP PULANG"}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] opacity-80 truncate max-w-full">
                      {todayRecord?.checkOutTime 
                        ? `${todayRecord.checkOutTime} WIB` 
                        : timeEval.canCheckOut 
                        ? "Jam Pulang Aktif" 
                        : "Tepat Jam Pulang"}
                    </span>
                  </button>

                </div>

                {/* GPS Status Badges Grid (Replaces Map cleanly) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5 pt-1 text-xs">
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 text-center">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block leading-tight">Radius Pos</span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{location.radiusMeters} m</span>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 text-center">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block leading-tight">Jarak GPS</span>
                    <span className={`font-mono font-bold text-xs sm:text-sm ${isWithinGeofence ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isNaN(currentDistance) ? 0 : currentDistance} m
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 text-center">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block leading-tight">Akurasi GPS</span>
                    <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">±{Math.round(isNaN(userCoords.accuracy) ? 10 : userCoords.accuracy)} m</span>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 text-center">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block leading-tight">Anti-Fake GPS</span>
                    <span className={`font-bold text-xs sm:text-sm ${antiSpoof.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isNaN(antiSpoof.securityScore) ? 100 : antiSpoof.securityScore}% Valid
                    </span>
                  </div>
                </div>
              </div>

              {/* Work Schedule Rules & Status */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                <div 
                  onClick={() => setIsRulesExpanded(prev => !prev)}
                  className="flex items-center justify-between pb-2 border-b border-slate-100 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Ketentuan Jam Kerja & Sanksi Keterlambatan</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      {timeEval.currentDayName}
                    </span>
                    <button type="button" className="text-slate-400 hover:text-slate-700">
                      {isRulesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className={`space-y-2.5 text-xs ${isRulesExpanded ? 'block' : 'hidden sm:block'}`}>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tipe Jam Kerja:</span>
                      <span className="font-bold text-slate-900 uppercase">{employee.scheduleType === 'harian' ? 'Harian (Kantor)' : 'Shift Operasional (12 Jam)'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Jam Dinas Resmi:</span>
                      <span className="font-mono font-bold text-amber-700">{timeEval.workHoursLabel}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Jendela Waktu Masuk:</span>
                      <span className="text-slate-800 font-medium">{timeEval.checkInWindowLabel}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ketentuan Absen Pulang:</span>
                      <span className="text-slate-800 font-medium">{timeEval.checkOutWindowLabel}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className={`p-2.5 rounded-xl border ${
                      timeEval.canCheckIn ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-bold block mb-0.5">Status Masuk:</span>
                      <span>{timeEval.checkInReason}</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      timeEval.canCheckOut ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-bold block mb-0.5">Status Pulang:</span>
                      <span>{timeEval.checkOutReason}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Record Summary Card */}
              {todayRecord && (
                <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs text-xs space-y-2 sm:space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Bukti Presensi Hari Ini:
                    </span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                      {todayRecord.date}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 text-[11px] block sm:inline">Jam Masuk: </span>
                      <strong className="text-slate-900 font-mono text-xs">{todayRecord.checkInTime || '-'} WIB</strong>
                      <span className="ml-1 text-emerald-700 font-semibold text-[10px]">({todayRecord.checkInStatus})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block sm:inline">Jam Pulang: </span>
                      <strong className="text-slate-900 font-mono text-xs">{todayRecord.checkOutTime || 'Belum'} {todayRecord.checkOutTime ? 'WIB' : ''}</strong>
                    </div>
                  </div>

                  {todayRecord.notes && (
                    <p className="text-[11px] text-slate-600 italic">
                      Catatan: {todayRecord.notes}
                    </p>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: REKAP KEHADIRAN (SIDEBAR MENU 2) */}
          {activeTab === 'recap' && (
            <EmployeeAttendanceRecap
              employee={employee}
              attendanceRecords={attendanceRecords}
              locations={locations}
              currentDate={currentDate}
              leaveRequests={leaveRequests}
            />
          )}

          {/* TAB 3: PENGAJUAN IZIN (SIDEBAR MENU 3) */}
          {activeTab === 'leave_izin' && (
            <EmployeeLeaveView
              employee={employee}
              leaveRequests={leaveRequests}
              onSubmitLeaveRequest={onSubmitLeaveRequest}
              currentDate={currentDate}
              initialType="izin"
            />
          )}

          {/* TAB 4: SURAT KETERANGAN SAKIT (SIDEBAR MENU 4) */}
          {activeTab === 'leave_sakit' && (
            <EmployeeLeaveView
              employee={employee}
              leaveRequests={leaveRequests}
              onSubmitLeaveRequest={onSubmitLeaveRequest}
              currentDate={currentDate}
              initialType="sakit"
            />
          )}

          {/* GENERAL LEAVE TAB (FALLBACK) */}
          {activeTab === 'leave' && (
            <EmployeeLeaveView
              employee={employee}
              leaveRequests={leaveRequests}
              onSubmitLeaveRequest={onSubmitLeaveRequest}
              currentDate={currentDate}
              initialType="izin"
            />
          )}

        </main>

      </div>

    </div>
  );
};
