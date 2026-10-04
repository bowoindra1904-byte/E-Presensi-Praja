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
  X
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
  const belumAbsenCount = Math.max(0, totalEmployees - totalHadir);
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Personel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Personel</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{totalEmployees}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Personel Siaga</span>
          </div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tepat Waktu</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{hadirCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Sesuai jendela jadwal</span>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{terlambatCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Lewat jam masuk dinas</span>
          </div>
        </div>

        {/* Belum Absen */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Belum Absen</span>
            <XCircle className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-300 font-mono">{belumAbsenCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Piket shift berikutnya</span>
          </div>
        </div>

        {/* Insiden Keamanan & Kunci HP */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Audit Keamanan</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">{securityIncidentCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Percobaan beda HP / GPS</span>
          </div>
        </div>

      </div>

      {/* Map Overview Section: All 8 Slots Live */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-500" />
              Monitoring Peta Lapangan {locations.length} Slot Pos Satpol PP
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pusat komando pemantauan radius geofence pos dan sebaran personel
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {locations.slice(0, 4).map((l) => (
              <span key={l.id} className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300 font-mono">
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Rekapitulasi Presensi Digital Personel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Log kehadiran real-time dengan verifikasi GPS, kunci perangkat, dan foto dinas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onResetDailyAttendance && (
              <button
                onClick={() => {
                  setIsResetDailyModalOpen(true);
                  setResetSuccessMessage('');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 hover:text-white rounded-xl border border-rose-800/60 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Reset dan kosongkan data presensi masuk & pulang hari ini"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset Rekap Harian</span>
              </button>
            )}
            {onOpenPrintMenu && (
              <button
                onClick={() => onOpenPrintMenu('daily')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap Harian</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedSlotFilter}
              onChange={(e) => setSelectedSlotFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Slot Pos (1-8)</option>
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
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
            <div key={r.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs truncate">{r.employeeName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">NIP: {r.employeeNip}</div>
                </div>
                {r.checkInPhoto ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoPreview(r.checkInPhoto || null)}
                    className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 hover:border-amber-500 shrink-0 shadow"
                  >
                    <img src={r.checkInPhoto} alt="Foto" className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="truncate max-w-[190px] font-medium">{r.locationName}</span>
                <span className="text-[9.5px] font-mono text-amber-400 shrink-0 font-semibold">
                  {r.scheduleType === 'harian' ? 'Harian' : 'Shift'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9.5px] text-slate-400 block">Absen Masuk</span>
                  {r.checkInTime ? (
                    <div>
                      <span className="font-mono font-bold text-white text-[11px]">{r.checkInTime} WIB</span>
                      <span className={`block text-[9.5px] font-semibold ${
                        r.checkInStatus === 'terlambat' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {r.checkInStatus === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-[10.5px]">Belum Hadir</span>
                  )}
                </div>

                <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[9.5px] text-slate-400 block">Absen Pulang</span>
                  {r.checkOutTime ? (
                    <div>
                      <span className="font-mono font-bold text-white text-[11px]">{r.checkOutTime} WIB</span>
                      <span className="block text-[9.5px] font-semibold text-emerald-400">Selesai Dinas</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-[10.5px]">Belum Pulang</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{r.checkInDistance !== undefined ? `${r.checkInDistance}m dari pos` : '-'}</span>
                </div>
                <div className="truncate max-w-[130px]">
                  <span>{r.checkInDeviceId ? `HP: ${r.checkInDeviceId.slice(0, 10)}...` : 'Belum Kunci'}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
              Tidak ada rekaman presensi pada filter ini.
            </div>
          )}
        </div>

        {/* Desktop & Tablet Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  
                  {/* Personel */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-white">{r.employeeName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIP: {r.employeeNip}</div>
                  </td>

                  {/* Pos */}
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-slate-200 block truncate max-w-[170px]" title={r.locationName}>
                      {r.locationName}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">
                      {r.scheduleType === 'harian' ? 'Harian' : 'Shift (12 Jam)'}
                    </span>
                  </td>

                  {/* Status Masuk */}
                  <td className="py-2.5 px-3">
                    {r.checkInTime ? (
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-white text-[11px]">
                          {r.checkInTime} WIB
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block ${
                          r.checkInStatus === 'tepat_waktu'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {r.checkInStatus === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Jarak GPS */}
                  <td className="py-2.5 px-3">
                    {r.checkInDistance !== undefined ? (
                      <div className="font-mono text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span>{r.checkInDistance} meter</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Status Pulang */}
                  <td className="py-2.5 px-3">
                    {r.checkOutTime ? (
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-white text-[11px]">
                          {r.checkOutTime} WIB
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400">
                          Selesai Dinas
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">Belum Pulang</span>
                    )}
                  </td>

                  {/* Kunci Perangkat */}
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-[10px] text-slate-300 truncate max-w-[130px] block" title={r.checkInDeviceId}>
                      {r.checkInDeviceId ? `✓ ${r.checkInDeviceId}` : "-"}
                    </span>
                  </td>

                  {/* Foto Selfie */}
                  <td className="py-2.5 px-3 text-right">
                    {r.checkInPhoto ? (
                      <button
                        onClick={() => setSelectedPhotoPreview(r.checkInPhoto || null)}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-500 transition-colors inline-block"
                      >
                        <img src={r.checkInPhoto} alt="Foto" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 ml-auto">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white">Verifikasi Foto Presensi</h4>
              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedPhotoPreview}
              alt="Bukti Kehadiran"
              className="w-full h-64 object-cover rounded-xl border border-slate-700"
            />
            <div className="text-[11px] text-slate-400 text-center">
              Foto seragam dinas tervalidasi dengan cap waktu dan GPS digital.
            </div>
          </div>
        </div>
      )}

      {/* Reset Daily Attendance Modal */}
      {isResetDailyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <RotateCcw className="w-5 h-5 text-rose-500" />
                <span>Reset Rekapitulasi Presensi Harian</span>
              </div>
              <button
                onClick={() => {
                  if (!isResetting) {
                    setIsResetDailyModalOpen(false);
                    setResetSuccessMessage('');
                  }
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccessMessage ? (
              <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">{resetSuccessMessage}</span>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Tanggal Target:</span>
                    <span className="font-bold text-white font-sans">
                      {currentDate.toLocaleDateString('id-ID', { dateStyle: 'full' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Total Absen Terdata:</span>
                    <span className="font-bold text-amber-400">{todayRecords.length} Personel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Hadir / Terlambat:</span>
                    <span className="text-slate-200">{hadirCount} Tepat Waktu / {terlambatCount} Terlambat</span>
                  </div>
                </div>

                {/* Scope selection if active filter exists */}
                {(selectedSlotFilter !== 'all' || selectedScheduleFilter !== 'all' || searchQuery) && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px]">
                    <span className="font-semibold text-slate-400 block mb-1">Pilih Lingkup Reset:</span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="dailyResetScope"
                        checked={resetScope === 'all'}
                        onChange={() => setResetScope('all')}
                        className="text-rose-500"
                      />
                      <span>Reset Seluruh Presensi Hari Ini ({todayRecords.length} data)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="dailyResetScope"
                        checked={resetScope === 'filtered'}
                        onChange={() => setResetScope('filtered')}
                        className="text-rose-500"
                      />
                      <span>Reset Hanya Sesuai Filter Aktif ({filteredTodayRecords.length} data)</span>
                    </label>
                  </div>
                )}

                <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-200 leading-relaxed text-[11px]">
                  <span className="font-bold block text-rose-300 mb-0.5">⚠️ Konfirmasi Penghapusan:</span>
                  Tindakan ini akan mengosongkan rekaman jam masuk, jam pulang, dan status absensi hari ini. Personel akan kembali berstatus <strong>Belum Absen</strong> sehingga dapat melakukan presensi ulang.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => setIsResetDailyModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isResetting || targetResetRecords.length === 0}
                    onClick={handleConfirmResetDaily}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40"
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
