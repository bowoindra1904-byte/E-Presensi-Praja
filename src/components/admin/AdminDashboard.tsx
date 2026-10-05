import React, { useState, useMemo } from 'react';
import { 
  Employee, 
  WorkLocation, 
  AttendanceRecord, 
  SecurityLog 
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
  HeartHandshake
} from 'lucide-react';

interface AdminDashboardProps {
  employees: Employee[];
  locations: WorkLocation[];
  attendanceRecords: AttendanceRecord[];
  securityLogs: SecurityLog[];
  currentDate: Date;
  onOpenPrintMenu?: (menu: 'daily') => void;
  onResetDailyAttendance?: (recordIds: string[], dateLabel: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  locations,
  attendanceRecords,
  securityLogs,
  currentDate,
  onOpenPrintMenu,
  onResetDailyAttendance,
}) => {
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>('all');
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  // Reset Daily Attendance State
  const [isResetDailyModalOpen, setIsResetDailyModalOpen] = useState(false);
  const [resetScope, setResetScope] = useState<'all' | 'filtered'>('all');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const todayStr = currentDate.toISOString().split('T')[0];

  // Records for today
  const todayRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.date === todayStr);
  }, [attendanceRecords, todayStr]);

  // Metric Computations
  const totalEmployees = employees.length;
  const hadirCount = todayRecords.filter(r => r.checkInStatus === 'tepat_waktu').length;
  const terlambatCount = todayRecords.filter(r => r.checkInStatus === 'terlambat').length;
  const totalHadir = hadirCount + terlambatCount;
  const izinCount = todayRecords.filter(r => r.checkInStatus === 'izin').length;
  const sakitCount = todayRecords.filter(r => r.checkInStatus === 'sakit').length;
  const totalIzinSakit = izinCount + sakitCount;
  const belumAbsenCount = Math.max(0, totalEmployees - totalHadir - totalIzinSakit);
  const securityIncidentCount = securityLogs.length;

  // Filtered log records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      const matchSlot = selectedSlotFilter === 'all' || record.locationSlotId === Number(selectedSlotFilter);
      const matchSchedule = selectedScheduleFilter === 'all' || record.scheduleType === selectedScheduleFilter;
      const matchSearch = 
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeNip.includes(searchQuery) ||
        record.locationName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSlot && matchSchedule && matchSearch;
    });
  }, [attendanceRecords, selectedSlotFilter, selectedScheduleFilter, searchQuery]);

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
    link.setAttribute("download", `Rekap_Presensi_Satpol_PP_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTodayRecords = useMemo(() => {
    return filteredRecords.filter(r => r.date === todayStr);
  }, [filteredRecords, todayStr]);

  const targetResetRecords = resetScope === 'filtered' ? filteredTodayRecords : todayRecords;

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
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Personel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">{terlambatCount}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Lewat jam dinas</span>
          </div>
        </div>

        {/* Izin & Sakit Disetujui */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Izin & Sakit</span>
            <HeartHandshake className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">{totalIzinSakit}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">{izinCount} Izin · {sakitCount} Sakit</span>
          </div>
        </div>

        {/* Belum Absen */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Belum Hadir</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-700 font-mono">{belumAbsenCount}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Piket shift berikutnya</span>
          </div>
        </div>

        {/* Insiden Keamanan & Kunci HP */}
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
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
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
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
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden space-y-4 p-5">
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

        {/* Filter Controls */}
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
              <option value="all">Semua Slot Pos</option>
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
          {filteredRecords.map((r) => (
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
                        r.checkInStatus === 'izin' ? 'text-blue-700' :
                        r.checkInStatus === 'sakit' ? 'text-purple-700' : 'text-emerald-700'
                      }`}>
                        {r.checkInStatus === 'terlambat' ? 'Terlambat' :
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
                  <span>{r.checkInDistance !== undefined ? `${r.checkInDistance}m dari pos` : '-'}</span>
                </div>
                <div className="truncate max-w-[130px]">
                  <span>{r.checkInDeviceId ? `HP: ${r.checkInDeviceId.slice(0, 10)}...` : 'Belum Kunci'}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
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
              {filteredRecords.map((r) => (
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
                            : r.checkInStatus === 'izin'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : r.checkInStatus === 'sakit'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {r.checkInStatus === 'tepat_waktu' ? 'Tepat Waktu' :
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
                    {r.checkInDistance !== undefined ? (
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
              ))}

              {filteredRecords.length === 0 && (
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
                    <span className="font-bold text-amber-700">{todayRecords.length} Personel</span>
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
                      <span>Reset Seluruh Presensi Hari Ini ({todayRecords.length} data)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="dailyResetScope"
                        checked={resetScope === 'filtered'}
                        onChange={() => setResetScope('filtered')}
                        className="text-rose-600"
                      />
                      <span>Reset Hanya Sesuai Filter Aktif ({filteredTodayRecords.length} data)</span>
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
