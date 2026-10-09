import React, { useState, useMemo } from 'react';
import { 
  Employee, 
  WorkLocation, 
  AttendanceRecord, 
  SecurityLog,
  ReguType,
  LeaveRequest
} from '../../types';
import { calculateSmartMonthlyReport } from '../../utils/smartAttendanceCalculator';
import { SatpolPPLogo } from '../SatpolPPLogo';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  Calendar, 
  Filter, 
  Shield, 
  Radio, 
  Building2, 
  Users, 
  ShieldAlert,
  CheckCircle2,
  Clock,
  PenTool,
  MapPin,
  RotateCcw,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export type PrintMenuType = 'daily' | 'monthly' | 'locations' | 'regu' | 'security';

export interface PrintSignatureConfig {
  locationCity: string;
  customDate: string;
  signatory1Role: string;
  signatory1Name: string;
  signatory1Rank: string;
  signatory1Nip: string;
  signatory2Role: string;
  signatory2Name: string;
  signatory2Rank: string;
  signatory2Nip: string;
}

export const DEFAULT_SIGNATURE_CONFIG: PrintSignatureConfig = {
  locationCity: "Muntok",
  customDate: "30 September 2026",
  signatory1Role: "Perwira Piket / Kasubag Tata Usaha",
  signatory1Name: "AGUS PRASETYO, A.Md.",
  signatory1Rank: "Penata Muda (III/a)",
  signatory1Nip: "19920120 201402 1 003",
  signatory2Role: "KEPALA SATUAN POLISI PAMONG PRAJA KABUPATEN BANGKA BARAT",
  signatory2Name: "SIDARTA GAUTAMA, S.STP",
  signatory2Rank: "Pembina Utama Muda (IV/c)",
  signatory2Nip: "19740512 199903 1 002",
};

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMenu?: PrintMenuType;
  employees: Employee[];
  locations: WorkLocation[];
  attendanceRecords: AttendanceRecord[];
  securityLogs: SecurityLog[];
  currentDate: Date;
  leaveRequests?: LeaveRequest[];
  initialOpenEditSignConfig?: boolean;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  defaultMenu = 'daily',
  employees,
  locations,
  attendanceRecords,
  securityLogs,
  currentDate,
  leaveRequests = [],
  initialOpenEditSignConfig = false,
}) => {
  const [activeMenu, setActiveMenu] = useState<PrintMenuType>(defaultMenu);
  
  // Signature & Document Header Config
  const [signConfig, setSignConfig] = useState<PrintSignatureConfig>(() => {
    try {
      const saved = localStorage.getItem('satpolpp_print_sign_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SIGNATURE_CONFIG;
  });

  const [isEditingSignConfig, setIsEditingSignConfig] = useState<boolean>(initialOpenEditSignConfig);

  const handleUpdateSignConfig = (updates: Partial<PrintSignatureConfig>) => {
    setSignConfig(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('satpolpp_print_sign_config', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetSignConfig = () => {
    setSignConfig(DEFAULT_SIGNATURE_CONFIG);
    try {
      localStorage.setItem('satpolpp_print_sign_config', JSON.stringify(DEFAULT_SIGNATURE_CONFIG));
    } catch {}
  };

  // Filters
  const [filterDate, setFilterDate] = useState<string>(() => {
    return currentDate.toISOString().split('T')[0];
  });
  const [filterMonth, setFilterMonth] = useState<string>('2026-09');
  const [filterSlot, setFilterSlot] = useState<string>('all');
  const [filterRegu, setFilterRegu] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Sync defaultMenu when opened
  React.useEffect(() => {
    if (isOpen && defaultMenu) {
      setActiveMenu(defaultMenu);
    }
  }, [isOpen, defaultMenu]);

  if (!isOpen) return null;

  const todayStr = currentDate.toISOString().split('T')[0];
  const printTimestamp = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  // Location resolver matching string or number ID / slotNumber
  const getLocForEmployee = (slotId: number | string | undefined): WorkLocation | undefined => {
    if (slotId === undefined || slotId === null) return undefined;
    return locations.find(l => 
      String(l.id) === String(slotId) || 
      Number(l.slotNumber) === Number(slotId) || 
      Number(l.id) === Number(slotId)
    );
  };

  const getPosPenugasanLabel = (emp: Employee): string => {
    const loc = getLocForEmployee(emp.locationSlotId);
    if (loc && loc.name) {
      const cleanName = loc.name.replace(/^Slot \d+:\s*/i, '').trim();
      const slotNo = loc.slotNumber || emp.locationSlotId || 1;
      return `Slot ${slotNo}: ${cleanName}`;
    }
    return emp.locationSlotId ? `Slot ${emp.locationSlotId}` : '-';
  };

  const handlePrint = () => {
    window.print();
  };

  // CSV Export for the currently active menu
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `Laporan_Satpol_PP.csv`;

    if (activeMenu === 'daily') {
      filename = `Rekap_Presensi_Harian_${filterDate}.csv`;
      headers = ["No", "NIP", "Nama Personel", "Pangkat", "Jabatan", "Regu", "Pos Penugasan", "Jam Masuk", "Status Masuk", "Jarak GPS (m)", "Jam Pulang", "Status Pulang", "ID Perangkat"];
      const records = attendanceRecords.filter(r => r.date === filterDate);
      rows = employees
        .filter(emp => {
          const matchRegu = filterRegu === 'all' || emp.regu === filterRegu;
          const matchSlot = filterSlot === 'all' || String(emp.locationSlotId) === String(filterSlot) || Number(emp.locationSlotId) === Number(filterSlot);
          return matchRegu && matchSlot;
        })
        .map((emp, idx) => {
          const rec = records.find(r => r.employeeId === emp.id);
          const posText = getPosPenugasanLabel(emp);
          return [
            String(idx + 1),
            `"${emp.nip}"`,
            `"${emp.name}"`,
            `"${emp.rank}"`,
            `"${emp.role}"`,
            `"${emp.regu}"`,
            `"${posText}"`,
            rec?.checkInTime || "-",
            rec?.checkInStatus || "Belum Absen",
            rec?.checkInDistance !== undefined ? String(rec.checkInDistance) : "-",
            rec?.checkOutTime || "-",
            rec?.checkOutStatus || "-",
            `"${rec?.checkInDeviceId || emp.boundDeviceId || ''}"`
          ];
        });
    } else if (activeMenu === 'monthly') {
      filename = `Laporan_Bulanan_Satpol_PP_${filterMonth}.csv`;
      headers = ["No", "NIP", "Nama Personel", "Pangkat", "Jabatan", "Regu", "Pos Penugasan", "Hari Hadir", "Total Jam Kerja", "Terlambat", "Tingkat Disiplin", "Pola Absensi"];
      rows = employees
        .filter(emp => {
          const matchRegu = filterRegu === 'all' || emp.regu === filterRegu;
          const matchSlot = filterSlot === 'all' || String(emp.locationSlotId) === String(filterSlot) || Number(emp.locationSlotId) === Number(filterSlot);
          return matchRegu && matchSlot;
        })
        .map((emp, idx) => {
          const empRecords = attendanceRecords.filter(r => r.employeeId === emp.id && r.date.startsWith(filterMonth));
          const presentDays = empRecords.filter(r => !!r.checkInTime).length;
          const lateCount = empRecords.filter(r => r.checkInStatus === 'terlambat').length;
          const disciplineRate = presentDays > 0 ? Math.round(((presentDays - lateCount) / presentDays) * 100) : 100;
          const posText = getPosPenugasanLabel(emp);
          const totalHours = (presentDays * (emp.scheduleType === 'shift' ? 12 : 8.5)).toFixed(1);
          return [
            String(idx + 1),
            `"${emp.nip}"`,
            `"${emp.name}"`,
            `"${emp.rank}"`,
            `"${emp.role}"`,
            `"${emp.regu}"`,
            `"${posText}"`,
            String(presentDays),
            totalHours,
            String(lateCount),
            `${disciplineRate}%`,
            disciplineRate >= 90 ? "Sangat Baik" : disciplineRate >= 75 ? "Cukup Disiplin" : "Perlu Pembinaan"
          ];
        });
    } else if (activeMenu === 'locations') {
      filename = `Daftar_8_Pos_Lokasi_Kerja_Satpol_PP.csv`;
      headers = ["Slot", "Kode", "Nama Pos", "Kategori", "Alamat", "Latitude", "Longitude", "Radius Geofence (m)", "Jumlah Personel Terploting"];
      rows = locations.map(loc => {
        const count = employees.filter(e => String(e.locationSlotId) === String(loc.id) || Number(e.locationSlotId) === Number(loc.slotNumber)).length;
        return [
          String(loc.slotNumber),
          loc.code,
          `"${loc.name}"`,
          `"${loc.category}"`,
          `"${loc.address}"`,
          String(loc.latitude),
          String(loc.longitude),
          String(loc.radiusMeters),
          String(count)
        ];
      });
    } else if (activeMenu === 'regu') {
      filename = `Daftar_Regu_Patroli_Satpol_PP.csv`;
      headers = ["No", "ID", "NIP", "Nama Personel", "Regu", "Tipe Kerja", "Pangkat", "Jabatan", "Pos Penugasan", "Status Kunci HP", "No. Telepon / HT"];
      rows = employees
        .filter(emp => filterRegu === 'all' || emp.regu === filterRegu)
        .map((emp, idx) => {
          const posText = getPosPenugasanLabel(emp);
          return [
            String(idx + 1),
            emp.id,
            `"${emp.nip}"`,
            `"${emp.name}"`,
            emp.regu,
            emp.scheduleType,
            `"${emp.rank}"`,
            `"${emp.role}"`,
            `"${posText}"`,
            emp.boundDeviceId ? "TERKUNCI" : "BELUM",
            `"${emp.phone || '-'}"`
          ];
        });
    } else if (activeMenu === 'security') {
      filename = `Log_Audit_Keamanan_Perangkat_${todayStr}.csv`;
      headers = ["No", "Timestamp", "Nama Personel", "ID Pegawai", "Tipe Insiden", "ID Perangkat", "Rincian Investigasi"];
      rows = securityLogs.map((log, idx) => [
        String(idx + 1),
        `"${log.timestamp}"`,
        `"${log.employeeName}"`,
        log.employeeId,
        log.eventType,
        `"${log.deviceId}"`,
        `"${log.details}"`
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:h-auto print:bg-white print:text-black">
        
        {/* Modal Top Header (Screen Only) */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white print:hidden shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  Pusat Cetak Dokumen Satpol PP
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  Format cetak dinas resmi sesuai menu
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1 shadow-xs"
              title="Unduh format spreadsheet untuk menu ini"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="hidden sm:block p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Menu Tabs Bar (Screen Only - Touch Scrollable on HP) */}
        <div className="bg-slate-50/90 border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none print:hidden shrink-0">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-600" />
            Pilih Menu Cetak:
          </span>

          <button
            onClick={() => setActiveMenu('daily')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMenu === 'daily'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>1. Rekap Presensi Harian (Monitoring)</span>
          </button>

          <button
            onClick={() => setActiveMenu('monthly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMenu === 'monthly'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Laporan Evaluasi Bulanan & Disiplin</span>
          </button>

          <button
            onClick={() => setActiveMenu('locations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMenu === 'locations'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3. Penempatan {locations.length} Slot Pos Lokasi</span>
          </button>

          <button
            onClick={() => setActiveMenu('regu')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMenu === 'regu'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Daftar Regu 1, 2, 3, 4 & Harian</span>
          </button>

          <button
            onClick={() => setActiveMenu('security')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMenu === 'security'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>5. Audit Kunci Perangkat & Keamanan</span>
          </button>
        </div>

        {/* Filter Controls for Current Menu (Screen Only) */}
        <div className="bg-slate-100/70 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs print:hidden shrink-0">
          {activeMenu === 'daily' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Pilih Tanggal:</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Filter Regu:</span>
                <select
                  value={filterRegu}
                  onChange={(e) => setFilterRegu(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
                >
                  <option value="all">Semua Regu & Harian</option>
                  <option value="Regu 1">Regu 1</option>
                  <option value="Regu 2">Regu 2</option>
                  <option value="Regu 3">Regu 3</option>
                  <option value="Regu 4">Regu 4</option>
                  <option value="Harian">Harian</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Filter Pos:</span>
                <select
                  value={filterSlot}
                  onChange={(e) => setFilterSlot(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 max-w-[180px] truncate shadow-xs"
                >
                  <option value="all">Semua {locations.length} Pos Kerja</option>
                  {locations.map(l => (
                    <option key={l.id} value={String(l.id)}>Slot {l.slotNumber}: {l.name.replace(/^Slot \d+:\s*/, '')}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {activeMenu === 'monthly' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Bulan Laporan:</span>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
                >
                  <option value="2026-09">September 2026</option>
                  <option value="2026-08">Agustus 2026</option>
                  <option value="2026-07">Juli 2026</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Filter Regu:</span>
                <select
                  value={filterRegu}
                  onChange={(e) => setFilterRegu(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
                >
                  <option value="all">Semua Regu</option>
                  <option value="Regu 1">Regu 1</option>
                  <option value="Regu 2">Regu 2</option>
                  <option value="Regu 3">Regu 3</option>
                  <option value="Regu 4">Regu 4</option>
                  <option value="Harian">Harian</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Filter Pos:</span>
                <select
                  value={filterSlot}
                  onChange={(e) => setFilterSlot(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 max-w-[180px] truncate shadow-xs"
                >
                  <option value="all">Semua {locations.length} Pos Kerja</option>
                  {locations.map(l => (
                    <option key={l.id} value={String(l.id)}>Slot {l.slotNumber}: {l.name.replace(/^Slot \d+:\s*/, '')}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {activeMenu === 'regu' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">Pilihan Tampilan Regu:</span>
              <select
                value={filterRegu}
                onChange={(e) => setFilterRegu(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
              >
                <option value="all">Seluruh Personel (Regu 1 - 4 & Harian)</option>
                <option value="Regu 1">Hanya Regu 1 (Shift 12 Jam)</option>
                <option value="Regu 2">Hanya Regu 2 (Shift 12 Jam)</option>
                <option value="Regu 3">Hanya Regu 3 (Shift 12 Jam)</option>
                <option value="Regu 4">Hanya Regu 4 (Shift 12 Jam)</option>
                <option value="Harian">Hanya Staf Harian</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {activeMenu === 'monthly' && (
              <button
                type="button"
                onClick={() => setIsEditingSignConfig(!isEditingSignConfig)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-xs ${
                  isEditingSignConfig
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-amber-800 hover:text-amber-900 border-amber-300 hover:bg-amber-50'
                }`}
                title="Buka menu edit tanggal, alamat dan penanda tangan"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-600" />
                <span>{isEditingSignConfig ? 'Tutup Edit Pengesahan' : 'Edit Tanggal, Alamat & Penanda Tangan'}</span>
                {isEditingSignConfig ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
            )}

            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Total: <strong className="text-slate-900">{employees.length} Pegawai</strong>
            </span>
          </div>
        </div>

        {/* Menu Edit Tanggal, Alamat & Penanda Tangan (Khusus Laporan Bulanan & Cetak) */}
        {isEditingSignConfig && (
          <div className="bg-amber-50/50 border-b border-amber-200 p-4 sm:p-5 print:hidden space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200/80 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    Menu Edit Tanggal, Alamat & Penanda Tangan Laporan Bulanan
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                      Live Preview & Disimpan
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kop Surat resmi: SATPOL PP KABUPATEN BANGKA BARAT · Alamat dan nomor surat telah ditiadakan sesuai format baku
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSignConfig}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                  title="Kembalikan nama pejabat ke default Satpol PP Bangka Barat"
                >
                  <RotateCcw className="w-3 h-3 text-rose-500" />
                  <span>Reset Bawaan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingSignConfig(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tutup & Terapkan</span>
                </button>
              </div>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Kolom 1: Alamat (Kota) & Tanggal */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 border-b border-slate-100 pb-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>1. Alamat (Kota) & Tanggal Pengesahan</span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Alamat / Kota Tempat Pengesahan:
                  </label>
                  <input
                    type="text"
                    value={signConfig.locationCity}
                    onChange={(e) => handleUpdateSignConfig({ locationCity: e.target.value })}
                    placeholder="Contoh: Muntok / Muntok, Bangka Barat"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Format cetak: "{signConfig.locationCity}, {signConfig.customDate}"
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Tanggal Pengesahan Dokumen:
                  </label>
                  <input
                    type="text"
                    value={signConfig.customDate}
                    onChange={(e) => handleUpdateSignConfig({ customDate: e.target.value })}
                    placeholder="Contoh: 30 September 2026"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Quick Date Presets */}
                <div className="pt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateSignConfig({ customDate: '30 September 2026' })}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] rounded border border-slate-200"
                  >
                    30 Sep 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSignConfig({ customDate: '31 Oktober 2026' })}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] rounded border border-slate-200"
                  >
                    31 Okt 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSignConfig({ 
                      customDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
                    })}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] rounded border border-amber-200"
                  >
                    Hari Ini
                  </button>
                </div>
              </div>

              {/* Kolom 2: Penanda Tangan Kiri (Pemeriksa / Verifikator) */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 border-b border-slate-100 pb-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>2. Pejabat Pemeriksa (Kiri)</span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Jabatan Pemeriksa:
                  </label>
                  <input
                    type="text"
                    value={signConfig.signatory1Role}
                    onChange={(e) => handleUpdateSignConfig({ signatory1Role: e.target.value })}
                    placeholder="Perwira Piket / Kasubag Tata Usaha"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Nama Lengkap & Gelar:
                  </label>
                  <input
                    type="text"
                    value={signConfig.signatory1Name}
                    onChange={(e) => handleUpdateSignConfig({ signatory1Name: e.target.value })}
                    placeholder="AGUS PRASETYO, A.Md."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Pangkat / Gol:</label>
                    <input
                      type="text"
                      value={signConfig.signatory1Rank}
                      onChange={(e) => handleUpdateSignConfig({ signatory1Rank: e.target.value })}
                      placeholder="Penata Muda (III/a)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">NIP Pejabat:</label>
                    <input
                      type="text"
                      value={signConfig.signatory1Nip}
                      onChange={(e) => handleUpdateSignConfig({ signatory1Nip: e.target.value })}
                      placeholder="19920120 201402 1 003"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Kolom 3: Penanda Tangan Kanan (Kasatpol PP) */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 border-b border-slate-100 pb-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>3. Pejabat Pengesah / Kasatpol PP (Kanan)</span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Jabatan Pengesah:
                  </label>
                  <input
                    type="text"
                    value={signConfig.signatory2Role}
                    onChange={(e) => handleUpdateSignConfig({ signatory2Role: e.target.value })}
                    placeholder="KEPALA SATUAN POLISI PAMONG PRAJA KABUPATEN BANGKA BARAT"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Nama Pejabat & Gelar:
                  </label>
                  <input
                    type="text"
                    value={signConfig.signatory2Name}
                    onChange={(e) => handleUpdateSignConfig({ signatory2Name: e.target.value })}
                    placeholder="SIDARTA GAUTAMA, S.STP"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Pangkat / Gol:</label>
                    <input
                      type="text"
                      value={signConfig.signatory2Rank}
                      onChange={(e) => handleUpdateSignConfig({ signatory2Rank: e.target.value })}
                      placeholder="Pembina Utama Muda (IV/c)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">NIP Pejabat:</label>
                    <input
                      type="text"
                      value={signConfig.signatory2Nip}
                      onChange={(e) => handleUpdateSignConfig({ signatory2Nip: e.target.value })}
                      placeholder="19740512 199903 1 002"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Scrollable Printable Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:p-0 print:overflow-visible print:bg-white">
          
          {/* Printable White Paper Sheet */}
          <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-xl p-8 sm:p-10 shadow-xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-none print:w-full relative overflow-hidden">
            
            {/* Authentic Document Watermark Background (Satpol PP Praja Wibawa Emblem) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.08] print:opacity-[0.06] z-0">
              <div className="w-[360px] sm:w-[480px] aspect-square">
                <img
                  src="/satpol_pp_logo.png"
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain filter saturate-110"
                />
              </div>
            </div>

            {/* Document Content */}
            <div className="relative z-10">

            {/* 1. KOP SURAT RESMI: SATPOL PP KABUPATEN BANGKA BARAT (Alamat & Kontak Dihapus) */}
            <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                
                {/* Logo Perisai Satpol PP */}
                <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                  <SatpolPPLogo className="w-16 h-16 object-contain" />
                </div>

                {/* Kop Text: SATPOL PP KABUPATEN BANGKA BARAT (Alamat Dihapus Sesuai Instruksi) */}
                <div className="text-center flex-1">
                  <h4 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-700">
                    PEMERINTAH KABUPATEN BANGKA BARAT
                  </h4>
                  <h2 className="text-base sm:text-2xl font-black uppercase text-slate-900 tracking-tight leading-tight mt-0.5">
                    SATPOL PP KABUPATEN BANGKA BARAT
                  </h2>
                </div>

                {/* Semboyan Logo */}
                <div className="w-16 h-16 shrink-0 hidden sm:flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] font-black tracking-widest text-slate-800 uppercase">
                    PRAJA
                  </div>
                  <div className="text-[9px] font-bold text-slate-600 uppercase">
                    WIBAWA
                  </div>
                </div>

              </div>
            </div>

            {/* 2. JUDUL DOKUMEN BERDASARKAN MENU */}
            <div className="text-center mb-6">
              {activeMenu === 'daily' && (
                <>
                  <h3 className="text-sm sm:text-base font-black uppercase underline decoration-2 underline-offset-4 text-slate-900">
                    BERITA ACARA REKAPITULASI PRESENSI HARIAN PERSONEL
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Hari / Tanggal Dinas: <strong>{new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </p>
                </>
              )}

              {activeMenu === 'monthly' && (
                <>
                  <h3 className="text-sm sm:text-base font-black uppercase underline decoration-2 underline-offset-4 text-slate-900">
                    LAPORAN EVALUASI BULANAN REKAPITULASI JAM KERJA & DISIPLIN
                  </h3>
                  {/* Nomor surat dihapus saja sesuai instruksi user */}
                  <p className="text-[11px] text-slate-600 mt-1">
                    Periode: <strong>{filterMonth === '2026-09' ? 'September 2026' : filterMonth}</strong> · Total Formasi: 150 Personel
                  </p>
                </>
              )}

              {activeMenu === 'locations' && (
                <>
                  <h3 className="text-sm sm:text-base font-black uppercase underline decoration-2 underline-offset-4 text-slate-900">
                    DAFTAR DISTRIBUSI PENUGASAN {locations.length} SLOT POS LOKASI KERJA GEOFENCE
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Sistem Pelacak Koordinat Google Maps Presisi Tinggi & Radius Geofence Sedekat Mungkin
                  </p>
                </>
              )}

              {activeMenu === 'regu' && (
                <>
                  <h3 className="text-sm sm:text-base font-black uppercase underline decoration-2 underline-offset-4 text-slate-900">
                    SURAT PERINTAH TUGAS & DAFTAR SUSUNAN REGU OPERASIONAL
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Pembagian 150 Personel Satpol PP Berdasarkan Regu 1, Regu 2, Regu 3, Regu 4, dan Harian
                  </p>
                </>
              )}

              {activeMenu === 'security' && (
                <>
                  <h3 className="text-sm sm:text-base font-black uppercase underline decoration-2 underline-offset-4 text-slate-900">
                    BERITA ACARA AUDIT INTEGRITAS KUNCI PERANGKAT & ANTI-FAKE GPS
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Laporan Pengikatan Perangkat (Device Binding) & Deteksi Pelanggaran Koordinat
                  </p>
                </>
              )}
            </div>

            {/* 3. TABEL SPESIFIK BERDASARKAN MENU */}

            {/* Menu 1: Rekap Harian */}
            {activeMenu === 'daily' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] p-3 rounded-lg bg-slate-100 border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Total Personel:</span>
                    <strong className="text-slate-900">{employees.length} Pegawai</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hadir Tepat Waktu:</span>
                    <strong className="text-emerald-700">
                      {attendanceRecords.filter(r => r.date === filterDate && r.checkInStatus === 'tepat_waktu').length} Personel
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Terlambat:</span>
                    <strong className="text-amber-700">
                      {attendanceRecords.filter(r => r.date === filterDate && r.checkInStatus === 'terlambat').length} Personel
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dispensasi Kantor (HP Rusak):</span>
                    <strong className="text-blue-700">
                      {employees.filter(emp => {
                        const rec = attendanceRecords.find(r => r.employeeId === emp.id && r.date === filterDate);
                        const hasLeave = leaveRequests.some(lr => lr.employeeId === emp.id && lr.status === 'approved' && filterDate >= lr.startDate && filterDate <= lr.endDate && (lr.type === 'dispensasi_kantor' || lr.isOfficeDispensation));
                        return rec?.checkInStatus === 'dispensasi_kantor' || rec?.isOfficeDispensation || hasLeave;
                      }).length} Personel
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Izin & Sakit Disetujui:</span>
                    <strong className="text-purple-700">
                      {employees.filter(emp => {
                        const rec = attendanceRecords.find(r => r.employeeId === emp.id && r.date === filterDate);
                        const hasLeave = leaveRequests.some(lr => lr.employeeId === emp.id && lr.status === 'approved' && filterDate >= lr.startDate && filterDate <= lr.endDate && (lr.type === 'izin' || lr.type === 'sakit'));
                        return rec?.checkInStatus === 'izin' || rec?.checkInStatus === 'sakit' || hasLeave;
                      }).length} Personel
                    </strong>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-200 border border-slate-300 text-slate-800 font-bold uppercase">
                      <th className="p-1.5 border border-slate-300 text-center w-8">No</th>
                      <th className="p-1.5 border border-slate-300">Nama Personel & NIP</th>
                      <th className="p-1.5 border border-slate-300">Regu / Jadwal</th>
                      <th className="p-1.5 border border-slate-300">Pos Penugasan</th>
                      <th className="p-1.5 border border-slate-300 text-center">Masuk</th>
                      <th className="p-1.5 border border-slate-300 text-center">Pulang</th>
                      <th className="p-1.5 border border-slate-300 text-center">Jarak / Surat</th>
                      <th className="p-1.5 border border-slate-300 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(emp => {
                        const matchRegu = filterRegu === 'all' || emp.regu === filterRegu;
                        const matchSlot = filterSlot === 'all' || emp.locationSlotId === Number(filterSlot);
                        return matchRegu && matchSlot;
                      })
                      .map((emp, idx) => {
                        const rec = attendanceRecords.find(r => r.employeeId === emp.id && r.date === filterDate);
                        const activeLeave = leaveRequests.find(lr => 
                          lr.employeeId === emp.id && 
                          lr.status === 'approved' &&
                          !lr.id.startsWith('LEAVE-REQ-') &&
                          !['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(lr.id) &&
                          filterDate >= lr.startDate && 
                          filterDate <= lr.endDate
                        );

                        const isDisp = rec?.checkInStatus === 'dispensasi_kantor' || rec?.isOfficeDispensation || activeLeave?.type === 'dispensasi_kantor' || activeLeave?.isOfficeDispensation;
                        const isIzin = rec?.checkInStatus === 'izin' || activeLeave?.type === 'izin';
                        const isSakit = rec?.checkInStatus === 'sakit' || activeLeave?.type === 'sakit';
                        const isPresent = (!!rec?.checkInTime && rec.checkInTime !== '-') && !isIzin && !isSakit && !isDisp;
                        const isLate = rec?.checkInStatus === 'terlambat';

                        return (
                          <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-1.5 border border-slate-300 text-center font-mono">{idx + 1}</td>
                            <td className="p-1.5 border border-slate-300">
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-slate-500 text-[9px]">NIP: {emp.nip} · {emp.rank}</div>
                            </td>
                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-800">
                              {emp.regu} ({emp.scheduleType === 'shift' ? '12 Jam' : 'Harian'})
                            </td>
                            <td className="p-1.5 border border-slate-300 font-medium">
                              {getPosPenugasanLabel(emp)}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-semibold">
                              {isDisp ? (
                                <span className="text-blue-800 font-bold">
                                  {rec?.checkInTime && rec.checkInTime !== 'DISPENSASI' ? `${rec.checkInTime} (DISP)` : 'DISPENSASI'}
                                </span>
                              ) : isIzin ? (
                                <span className="text-indigo-800 font-bold">IZIN</span>
                              ) : isSakit ? (
                                <span className="text-purple-800 font-bold">SAKIT</span>
                              ) : (
                                rec?.checkInTime || "-"
                              )}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono">
                              {isDisp ? (
                                <span className="text-blue-900 font-semibold text-[9.5px]">
                                  {rec?.checkOutTime && rec.checkOutTime !== '-' ? rec.checkOutTime : "Surat Kantor"}
                                </span>
                              ) : isIzin || isSakit ? (
                                <span className="text-slate-500 text-[9px] font-mono">Disahkan</span>
                              ) : (
                                rec?.checkOutTime || "-"
                              )}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono">
                              {isDisp ? (
                                <span className="font-bold text-blue-800 text-[9px] block">
                                  {rec?.dispensationLetterNumber || activeLeave?.dispensationLetterNumber 
                                    ? `Memo: ${rec?.dispensationLetterNumber || activeLeave?.dispensationLetterNumber}` 
                                    : "Disposisi Sah"}
                                </span>
                              ) : isIzin || isSakit ? (
                                <span className="font-semibold text-purple-800 text-[9px] block truncate max-w-[120px]" title={activeLeave?.reason || 'Disetujui Admin'}>
                                  {activeLeave?.attachmentName ? `Surat: ${activeLeave.attachmentName}` : "Disposisi Sah"}
                                </span>
                              ) : rec?.checkInDistance !== undefined ? (
                                `${rec.checkInDistance}m`
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold">
                              {isDisp ? (
                                <span className="text-blue-800 font-black">PEMUTIHAN (HP RUSAK)</span>
                              ) : isIzin ? (
                                <span className="text-indigo-800">IZIN DINAS</span>
                              ) : isSakit ? (
                                <span className="text-purple-800">SAKIT</span>
                              ) : isPresent ? (
                                isLate ? (
                                  <span className="text-amber-800">TERLAMBAT</span>
                                ) : (
                                  <span className="text-emerald-800">TEPAT WAKTU</span>
                                )
                              ) : (
                                <span className="text-slate-400 italic">BELUM HADIR</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Menu 2: Laporan Bulanan (Dengan Sistem Pintar Perhitungan Otomatis: H, S, I, TK, P) */}
            {activeMenu === 'monthly' && (
              <div className="space-y-4">
                <table className="w-full text-left border-collapse text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-200 border border-slate-300 text-slate-800 font-bold uppercase text-[9px]">
                      <th className="p-1.5 border border-slate-300 text-center w-7">No</th>
                      <th className="p-1.5 border border-slate-300 min-w-[130px]">Nama Personel & NIP</th>
                      <th className="p-1.5 border border-slate-300 text-center w-14">Regu</th>
                      <th className="p-1.5 border border-slate-300 text-center w-16">Jadwal</th>
                      <th className="p-1.5 border border-slate-300">Pos Penugasan</th>
                      <th className="p-1.5 border border-slate-300 text-center w-12 bg-slate-300/60" title="Target Hari Wajib Kerja">Wajib</th>
                      <th className="p-1.5 border border-slate-300 text-center w-8 text-emerald-900 bg-emerald-100/50" title="Hadir">H</th>
                      <th className="p-1.5 border border-slate-300 text-center w-8 text-indigo-900 bg-indigo-100/50" title="Izin">I</th>
                      <th className="p-1.5 border border-slate-300 text-center w-8 text-purple-900 bg-purple-100/50" title="Sakit">S</th>
                      <th className="p-1.5 border border-slate-300 text-center w-8 text-rose-900 bg-rose-100/60 font-black" title="Tanpa Keterangan">TK</th>
                      <th className="p-1.5 border border-slate-300 text-center w-8 text-cyan-900 bg-cyan-100/50" title="Pemutihan (Disp HP / Lapangan)">P</th>
                      <th className="p-1.5 border border-slate-300 text-center w-8 text-amber-900" title="Terlambat">T</th>
                      <th className="p-1.5 border border-slate-300 text-center w-14 font-black">% Hadir</th>
                      <th className="p-1.5 border border-slate-300">Pola & Evaluasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(emp => {
                        const matchRegu = filterRegu === 'all' || emp.regu === filterRegu;
                        const matchSlot = filterSlot === 'all' || String(emp.locationSlotId) === String(filterSlot) || Number(emp.locationSlotId) === Number(filterSlot);
                        return matchRegu && matchSlot;
                      })
                      .map((emp, idx) => {
                        const smart = calculateSmartMonthlyReport(
                          emp,
                          filterMonth,
                          attendanceRecords,
                          leaveRequests,
                          locations
                        );

                        return (
                          <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-1.5 border border-slate-300 text-center font-mono">{idx + 1}</td>
                            <td className="p-1.5 border border-slate-300">
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-slate-500 text-[8.5px] font-mono">NIP: {emp.nip}</div>
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-semibold text-[9px]">{emp.regu}</td>
                            <td className="p-1.5 border border-slate-300 text-center text-[8.5px]">
                              <span className={`px-1 py-0.5 rounded font-bold ${
                                emp.scheduleType === 'shift' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {emp.scheduleType === 'shift' ? 'Shift 12J' : 'Harian'}
                              </span>
                            </td>
                            <td className="p-1.5 border border-slate-300 font-medium text-[9px]">
                              {getPosPenugasanLabel(emp)}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold bg-slate-100 text-slate-800">
                              {smart.targetWorkDays}h
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-emerald-800">
                              {smart.hadirCount > 0 ? smart.hadirCount : "-"}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-indigo-800">
                              {smart.izinCount > 0 ? smart.izinCount : "-"}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-purple-800">
                              {smart.sakitCount > 0 ? smart.sakitCount : "-"}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black text-rose-800">
                              {smart.tanpaKeteranganCount > 0 ? smart.tanpaKeteranganCount : "0"}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-cyan-800">
                              {smart.pemutihanCount > 0 ? smart.pemutihanCount : "-"}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono text-amber-800 font-semibold">
                              {smart.lateCount > 0 ? smart.lateCount : "-"}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black">
                              <span className={smart.attendanceRate >= 90 ? 'text-emerald-800' : smart.attendanceRate >= 75 ? 'text-amber-800' : 'text-rose-800'}>
                                {smart.attendanceRate}%
                              </span>
                            </td>
                            <td className="p-1.5 border border-slate-300 text-[8.5px] text-slate-700 leading-tight">
                              {smart.attendancePattern}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                {/* Legenda Resmi Cetak */}
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-[9px] text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900">Keterangan Singkatan Kode Rekapan:</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span><strong>H</strong> = Hadir Tepat Waktu</span>
                    <span><strong>T</strong> = Terlambat</span>
                    <span><strong>S</strong> = Sakit (Surat Dokter Sah)</span>
                    <span><strong>I</strong> = Izin (Dinas / Pribadi Disetujui)</span>
                    <span><strong>TK</strong> = Tanpa Keterangan (Alpha)</span>
                    <span><strong>P</strong> = Pemutihan (Dispensasi HP Rusak / Lapangan Menyesuaikan Hadir Sah)</span>
                    <span><strong>L</strong> = Libur (Weekend / Hari Besar Nasional / Off Siklus Shift)</span>
                  </div>
                  <div className="text-[8.5px] text-slate-500 italic pt-0.5 border-t border-slate-200">
                    * Catatan: Jadwal Harian beroperasi Senin-Jumat (libur Sabtu, Minggu, & Hari Libur Nasional). Jadwal Shift 12 Jam beroperasi sesuai siklus dinamis: Pagi - Malam - Libur - Libur. Perubahan jadwal pegawai otomatis memperbarui persentase kehadiran.
                  </div>
                </div>
              </div>
            )}

            {/* Menu 3: Penempatan 8 Slot Pos Lokasi */}
            {activeMenu === 'locations' && (
              <div className="space-y-4">
                <table className="w-full text-left border-collapse text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-200 border border-slate-300 text-slate-800 font-bold uppercase">
                      <th className="p-1.5 border border-slate-300 text-center w-8">Slot</th>
                      <th className="p-1.5 border border-slate-300">Nama Pos & Kode</th>
                      <th className="p-1.5 border border-slate-300">Kategori & Alamat</th>
                      <th className="p-1.5 border border-slate-300 font-mono">Koordinat Google Maps</th>
                      <th className="p-1.5 border border-slate-300 text-center font-mono">Radius Ketat</th>
                      <th className="p-1.5 border border-slate-300 text-center font-bold">Personel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => {
                      const count = employees.filter(e => e.locationSlotId === loc.id).length;
                      return (
                        <tr key={loc.id} className={loc.id % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="p-2 border border-slate-300 text-center font-bold font-mono">
                            Slot {loc.slotNumber}
                          </td>
                          <td className="p-2 border border-slate-300">
                            <div className="font-bold text-slate-900">{loc.name}</div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase">{loc.code}</div>
                          </td>
                          <td className="p-2 border border-slate-300">
                            <div className="font-semibold text-slate-800">{loc.category}</div>
                            <div className="text-[9px] text-slate-600">{loc.address}</div>
                          </td>
                          <td className="p-2 border border-slate-300 font-mono text-[9px] text-slate-700">
                            Lat: {loc.latitude.toFixed(6)}<br />
                            Lng: {loc.longitude.toFixed(6)}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-bold text-emerald-800">
                            {loc.radiusMeters} Meter
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-900">
                            {count} Pegawai
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Menu 4: Daftar Regu Patroli 1-4 & Harian */}
            {activeMenu === 'regu' && (
              <div className="space-y-4">
                <table className="w-full text-left border-collapse text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-200 border border-slate-300 text-slate-800 font-bold uppercase">
                      <th className="p-1.5 border border-slate-300 text-center w-8">No</th>
                      <th className="p-1.5 border border-slate-300">Nama Personel & NIP</th>
                      <th className="p-1.5 border border-slate-300">Pangkat / Jabatan</th>
                      <th className="p-1.5 border border-slate-300 font-bold text-slate-900">Penugasan Regu</th>
                      <th className="p-1.5 border border-slate-300">Pos Penugasan</th>
                      <th className="p-1.5 border border-slate-300 text-center">Kunci HP</th>
                      <th className="p-1.5 border border-slate-300 font-mono">No. Kontak / HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(emp => filterRegu === 'all' || emp.regu === filterRegu)
                      .map((emp, idx) => {
                        const loc = locations.find(l => l.id === emp.locationSlotId);
                        return (
                          <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-1.5 border border-slate-300 text-center font-mono">{idx + 1}</td>
                            <td className="p-1.5 border border-slate-300">
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-slate-500 text-[9px]">NIP: {emp.nip}</div>
                            </td>
                            <td className="p-1.5 border border-slate-300">
                              <div className="text-slate-800 font-medium">{emp.role}</div>
                              <div className="text-slate-500 text-[9px]">{emp.rank}</div>
                            </td>
                            <td className="p-1.5 border border-slate-300 font-bold text-slate-900">
                              {emp.regu}
                              <span className="text-[9px] block font-normal text-slate-600">
                                {emp.scheduleType === 'shift' ? 'Pola Shift 12 Jam' : 'Pola Staf Harian'}
                              </span>
                            </td>
                            <td className="p-1.5 border border-slate-300 text-[9px] font-medium">
                              {getPosPenugasanLabel(emp)}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-[9px]">
                              {emp.boundDeviceId ? (
                                <span className="text-emerald-800">TERKUNCI</span>
                              ) : (
                                <span className="text-amber-800">BELUM</span>
                              )}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-[9px] text-slate-700">
                              {emp.phone || '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Menu 5: Log Keamanan Perangkat */}
            {activeMenu === 'security' && (
              <div className="space-y-4">
                <table className="w-full text-left border-collapse text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-200 border border-slate-300 text-slate-800 font-bold uppercase">
                      <th className="p-1.5 border border-slate-300 text-center w-8">No</th>
                      <th className="p-1.5 border border-slate-300">Waktu & Tanggal</th>
                      <th className="p-1.5 border border-slate-300">Nama Personel & ID</th>
                      <th className="p-1.5 border border-slate-300">Jenis Insiden / Aksi</th>
                      <th className="p-1.5 border border-slate-300 font-mono">ID Perangkat</th>
                      <th className="p-1.5 border border-slate-300">Catatan Tindak Internal Provost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityLogs.map((log, idx) => (
                      <tr key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-1.5 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-1.5 border border-slate-300 font-mono text-[9px] text-slate-600">
                          {log.timestamp}
                        </td>
                        <td className="p-1.5 border border-slate-300 font-bold text-slate-900">
                          {log.employeeName}
                          <div className="text-[9px] font-normal text-slate-500 font-mono">{log.employeeId}</div>
                        </td>
                        <td className="p-1.5 border border-slate-300 font-semibold uppercase text-[9px]">
                          {log.eventType === 'device_paired' ? 'Kunci Perdana' :
                           log.eventType === 'device_mismatch' ? 'Percobaan HP Lain' :
                           log.eventType === 'device_reset' ? 'Reset Kunci Admin' :
                           log.eventType === 'out_of_radius' ? 'Di Luar Geofence' : log.eventType}
                        </td>
                        <td className="p-1.5 border border-slate-300 font-mono text-[9px] text-slate-700">
                          {log.deviceId}
                        </td>
                        <td className="p-1.5 border border-slate-300 text-[9px] text-slate-700 leading-snug">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. LEMBAR PENGESAHAN / TANDA TANGAN RESMI (SEJAJAR PRESISI KIRI & KANAN) */}
            <div className="mt-10 pt-6 border-t border-slate-300 text-xs break-inside-avoid print:break-inside-avoid">
              <div className="grid grid-cols-2 gap-x-12 gap-y-0 text-center max-w-3xl mx-auto">
                
                {/* Baris 1: Header Jabatan Penanda Tangan (Flex ke bawah agar baseline jabatan presisi sejajar) */}
                <div className="flex flex-col justify-end pb-1 px-2">
                  <p className="text-slate-600 text-[11px] invisible select-none leading-normal">
                    &nbsp;
                  </p>
                  <p className="text-slate-600 text-[11px] font-medium leading-normal">
                    Dibuat & Diverifikasi Oleh:
                  </p>
                  <p className="font-bold text-slate-900 mt-1 leading-snug uppercase min-h-[2.5rem] flex items-center justify-center">
                    {signConfig.signatory1Role}
                  </p>
                </div>

                <div className="flex flex-col justify-end pb-1 px-2">
                  <p className="text-slate-600 text-[11px] font-medium leading-normal">
                    {signConfig.locationCity}, {signConfig.customDate}
                  </p>
                  <p className="text-slate-600 text-[11px] font-medium leading-normal">
                    Mengetahui,
                  </p>
                  <p className="font-bold text-slate-900 mt-1 leading-snug uppercase min-h-[2.5rem] flex items-center justify-center">
                    {signConfig.signatory2Role}
                  </p>
                </div>

                {/* Baris 2: Ruang Tanda Tangan & Cap Stempel Dinas (Ketinggian Mutlak Sama) */}
                <div className="h-20 flex items-center justify-center text-slate-300 italic text-[10px]">
                  (Cap & Tanda Tangan Sah)
                </div>

                <div className="h-20 flex items-center justify-center text-slate-300 italic text-[10px]">
                  (Cap Stempel Dinas Satpol PP)
                </div>

                {/* Baris 3: Nama Lengkap Penanda Tangan, Pangkat & NIP (100% SEJAJAR HORIZONTAL) */}
                <div className="pt-0.5 px-2">
                  <p className="font-bold text-slate-900 underline underline-offset-4 text-xs tracking-wide">
                    {signConfig.signatory1Name}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium mt-1">
                    {signConfig.signatory1Rank}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono">
                    NIP. {signConfig.signatory1Nip}
                  </p>
                </div>

                <div className="pt-0.5 px-2">
                  <p className="font-bold text-slate-900 underline underline-offset-4 text-xs tracking-wide uppercase">
                    {signConfig.signatory2Name}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium mt-1">
                    {signConfig.signatory2Rank}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono">
                    NIP. {signConfig.signatory2Nip}
                  </p>
                </div>

              </div>

              {/* Security Watermark Note */}
              <div className="mt-8 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
                Dokumen resmi SATPOL PP KABUPATEN BANGKA BARAT dicetak melalui Sistem Informasi Presensi Digital SI-PRAJA pada {printTimestamp} WIB
              </div>

            </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
