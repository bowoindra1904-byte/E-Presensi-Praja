import React, { useState, useMemo } from 'react';
import { Employee, WorkLocation, ScheduleType, ReguType, AdminAccount } from '../../types';
import { formatScheduleBadge } from '../../utils/scheduleRules';
import { 
  Users, 
  Search, 
  Filter, 
  RotateCcw, 
  Edit2, 
  Plus, 
  Smartphone, 
  CheckCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet,
  MapPin,
  Check,
  Printer,
  Trash2,
  X,
  Shield,
  ShieldCheck,
  Lock
} from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  currentAdmin?: AdminAccount;
  locations: WorkLocation[];
  onUpdateEmployee: (emp: Employee) => void;
  onAddEmployee: (emp: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onResetDeviceLock: (employeeId: string) => void;
  onResetAllEmployees?: (mode?: 'reset_default' | 'clear_all') => void;
  onOpenPrintMenu?: (menu: 'regu') => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  currentAdmin,
  locations,
  onUpdateEmployee,
  onAddEmployee,
  onDeleteEmployee,
  onResetDeviceLock,
  onResetAllEmployees,
  onOpenPrintMenu,
}) => {
  const isDanru = Boolean(currentAdmin && currentAdmin.role !== 'komando_pusat' && currentAdmin.reguScope !== 'all');
  const adminRegu = isDanru ? (currentAdmin?.reguScope as ReguType) : null;

  // Danru strictly manages their own regu's personnel (both shift and harian)
  const scopedEmployees = useMemo(() => {
    if (isDanru && adminRegu) {
      return employees.filter(emp => emp.regu === adminRegu);
    }
    return employees;
  }, [employees, isDanru, adminRegu]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterSlot, setFilterSlot] = useState<string>('all');
  const [filterRegu, setFilterRegu] = useState<string>(isDanru && adminRegu ? adminRegu : 'all');
  const [filterSchedule, setFilterSchedule] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');

  // Reset all modal state
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [selectedResetAllMode, setSelectedResetAllMode] = useState<'reset_default' | 'clear_all'>('clear_all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Edit / Add / Delete Modal state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: '',
    nip: '',
    role: 'Anggota Regu Operasional',
    rank: 'Pengatur Muda (II/a)',
    regu: adminRegu || 'Regu 1',
    scheduleType: 'shift',
    locationSlotId: 1,
    status: 'active'
  });

  // Filtered dataset
  const filteredList = useMemo(() => {
    return scopedEmployees.filter(emp => {
      const matchSearch = 
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.nip.includes(search) ||
        emp.role.toLowerCase().includes(search.toLowerCase()) ||
        emp.id.toLowerCase().includes(search.toLowerCase());

      const matchSlot = filterSlot === 'all' || emp.locationSlotId === Number(filterSlot);
      const matchRegu = isDanru ? true : (filterRegu === 'all' || emp.regu === filterRegu);
      const matchSchedule = filterSchedule === 'all' || emp.scheduleType === filterSchedule;
      const matchDevice = 
        filterDevice === 'all' || 
        (filterDevice === 'locked' && !!emp.boundDeviceId) || 
        (filterDevice === 'unlocked' && !emp.boundDeviceId);

      return matchSearch && matchSlot && matchRegu && matchSchedule && matchDevice;
    });
  }, [scopedEmployees, search, filterSlot, filterRegu, filterSchedule, filterDevice, isDanru]);

  // Pagination slice
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Reset to page 1 on filter changes
  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  // Quick Inline Change for Slot
  const handleSlotChange = (emp: Employee, newSlotId: number) => {
    onUpdateEmployee({
      ...emp,
      locationSlotId: newSlotId
    });
  };

  // Quick Inline Change for Regu (synchronizes scheduleType)
  const handleReguChange = (emp: Employee, newRegu: ReguType) => {
    if (isDanru) return; // Danru tidak diizinkan memindahkan regu
    onUpdateEmployee({
      ...emp,
      regu: newRegu,
    });
  };

  // Quick Inline Change for Schedule
  const handleScheduleChange = (emp: Employee, newSchedule: ScheduleType) => {
    onUpdateEmployee({
      ...emp,
      scheduleType: newSchedule
    });
  };

  // Save Modal Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      onUpdateEmployee(editingEmployee);
      setEditingEmployee(null);
    }
  };

  // Save Add New
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const maxIdNum = employees.reduce((max, emp) => {
      const match = emp.id.match(/\d+/);
      const val = match ? parseInt(match[0], 10) : 0;
      return val > max ? val : max;
    }, 0);
    const nextNum = Math.max(employees.length + 1, maxIdNum + 1);
    const id = `POLPP-${String(nextNum).padStart(3, '0')}`;
    const regu: ReguType = isDanru && adminRegu ? adminRegu : (newEmployee.regu || 'Regu 1');
    const sched: ScheduleType = newEmployee.scheduleType || 'shift';

    const emp: Employee = {
      id,
      nip: newEmployee.nip || `19950101 202001 1 ${String(nextNum).padStart(3, '0')}`,
      name: newEmployee.name || 'Anggota Baru',
      role: newEmployee.role || 'Anggota Regu Operasional',
      rank: newEmployee.rank || 'Pengatur Muda (II/a)',
      regu: regu,
      scheduleType: sched,
      locationSlotId: newEmployee.locationSlotId || 1,
      boundDeviceId: null,
      status: 'active'
    };
    onAddEmployee(emp);
    setIsAddingNew(false);
    setNewEmployee({
      name: '',
      nip: '',
      role: 'Anggota Regu Operasional',
      rank: 'Pengatur Muda (II/a)',
      regu: adminRegu || 'Regu 1',
      scheduleType: 'shift',
      locationSlotId: 1,
      status: 'active'
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["ID", "NIP", "Nama Pegawai", "Pangkat", "Jabatan", "Regu", "Slot Lokasi", "Nama Lokasi", "Tipe Kerja", "Status Kunci Device", "ID Device"];
    const rows = employees.map(e => {
      const loc = locations.find(l => l.id === e.locationSlotId);
      return [
        e.id,
        `"${e.nip}"`,
        `"${e.name}"`,
        `"${e.rank}"`,
        `"${e.role}"`,
        `"${e.regu}"`,
        e.locationSlotId,
        `"${loc?.name || ''}"`,
        e.scheduleType,
        e.boundDeviceId ? "TERKUNCI" : "BELUM",
        `"${e.boundDeviceId || ''}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daftar_150_Pegawai_Satpol_PP.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Authority Banner (Danru vs Komando Pusat) */}
      {isDanru ? (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-sm text-amber-950 flex items-center gap-2">
                <span>Otoritas Komandan {adminRegu}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                  Khusus {adminRegu}
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                Anda hanya memiliki wewenang mengelola data <strong>{scopedEmployees.length} personel {adminRegu}</strong> (baik yang bertugas <strong>Shift</strong> maupun <strong>Harian</strong>). Hak akses data seluruh 150 pegawai hanya ada pada <strong>Admin Komando Pusat</strong>.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
            <span className="text-[11px] font-bold bg-white/80 border border-amber-300 px-3 py-1 rounded-xl text-amber-900 shadow-2xs">
              {scopedEmployees.filter(e => e.scheduleType === 'shift').length} Shift · {scopedEmployees.filter(e => e.scheduleType === 'harian').length} Harian
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md border border-slate-800">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-sm text-amber-300 flex items-center gap-2">
                <span>Otoritas Penuh Admin Komando Pusat</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                  Seluruh Pegawai
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Memegang kendali penuh data seluruh personel Satpol PP ({employees.length} orang) lintas Regu 1, Regu 2, Regu 3, Regu 4, dan Markas Komando (Harian).
              </p>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <span className="text-[11px] font-mono bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl text-amber-400 font-bold">
              {employees.length} Personel Terdata
            </span>
          </div>
        </div>
      )}

      {/* Title & Overview Banner */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>
              {isDanru 
                ? `Personel Dinas ${adminRegu} (Total: ${scopedEmployees.length} Pegawai)`
                : `Data Seluruh Pegawai Satpol PP (Total: ${employees.length} Pegawai)`
              }
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isDanru 
              ? `Kelola daftar nama, pangkat, penempatan pos, kunci HP, serta jadwal Shift & Harian personel ${adminRegu}`
              : `Atur pembagian Regu 1, 2, 3, 4 atau Harian, penempatan ${locations.length} slot pos lokasi, dan audit perangkat seluruh personel`
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isDanru && onResetAllEmployees && (
            <button
              type="button"
              onClick={() => setIsResetAllModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Hapus atau reset data seluruh pegawai Satpol PP"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus / Reset Data Seluruh Pegawai</span>
            </button>
          )}
          {onOpenPrintMenu && (
            <button
              onClick={() => onOpenPrintMenu('regu')}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>{isDanru ? `Cetak Daftar ${adminRegu}` : 'Cetak Daftar Regu'}</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Ekspor CSV
          </button>
          <button
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Personel {isDanru ? adminRegu : ''}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, regu..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter Regu (Regu 1, 2, 3, 4, Harian) */}
          <div>
            {isDanru ? (
              <div className="w-full bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-amber-950 font-bold flex items-center justify-between">
                <span>{adminRegu}</span>
                <span className="text-[9px] font-mono bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black">
                  Terkunci Danru
                </span>
              </div>
            ) : (
              <select
                value={filterRegu}
                onChange={(e) => handleFilterChange(setFilterRegu, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="all">Semua Regu (1-4 & Harian)</option>
                <option value="Regu 1">Regu 1 (Shift)</option>
                <option value="Regu 2">Regu 2 (Shift)</option>
                <option value="Regu 3">Regu 3 (Shift)</option>
                <option value="Regu 4">Regu 4 (Shift)</option>
                <option value="Harian">Harian (Mako)</option>
              </select>
            )}
          </div>

          {/* Filter 8 Slot Lokasi */}
          <div>
            <select
              value={filterSlot}
              onChange={(e) => handleFilterChange(setFilterSlot, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Slot Pos Lokasi ({locations.length} Pos)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Jadwal (Shift, Harian) */}
          <div>
            <select
              value={filterSchedule}
              onChange={(e) => handleFilterChange(setFilterSchedule, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="all">Semua Tipe Jadwal (Shift & Harian)</option>
              <option value="shift">Khusus Shift (12 Jam)</option>
              <option value="harian">Khusus Harian (Jam Kantor)</option>
            </select>
          </div>

          {/* Filter Status Kunci Perangkat */}
          <div>
            <select
              value={filterDevice}
              onChange={(e) => handleFilterChange(setFilterDevice, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status Kunci HP</option>
              <option value="locked">Terkunci (Device Bound)</option>
              <option value="unlocked">Belum Terkunci</option>
            </select>
          </div>

        </div>

        {/* Status Count & Summary & Reset Filter */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-3">
            <span>
              Menampilkan <strong className="text-slate-900">{filteredList.length}</strong> dari total {employees.length} personel Satpol PP
            </span>
            {(search || filterSlot !== 'all' || filterRegu !== 'all' || filterSchedule !== 'all' || filterDevice !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterSlot('all');
                  setFilterRegu(isDanru && adminRegu ? adminRegu : 'all');
                  setFilterSchedule('all');
                  setFilterDevice('all');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 text-xs text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                title="Kembalikan semua filter dan pencarian ke awal"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-700"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={150}>Semua (150)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Mobile Card View + Desktop Table */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        
        {/* Mobile View (HP Card List) */}
        <div className="sm:hidden p-3 space-y-3">
          {paginatedList.map((emp) => {
            const assignedLoc = locations.find(l => l.id === emp.locationSlotId);

            return (
              <div key={emp.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIP: {emp.nip} · {emp.id}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{emp.role} · {emp.rank}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    emp.regu === 'Harian' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {emp.regu}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Pos Lokasi Kerja:</label>
                    <select
                      value={emp.locationSlotId}
                      onChange={(e) => handleSlotChange(emp, Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Regu & Jadwal Kerja:</label>
                    {isDanru ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100/80 text-amber-950 font-bold border border-amber-300 text-xs">
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>{emp.regu}</span>
                        </div>
                        <select
                          value={emp.scheduleType}
                          onChange={(e) => handleScheduleChange(emp, e.target.value as ScheduleType)}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-2 py-1 text-xs font-semibold focus:outline-none focus:border-amber-500"
                        >
                          <option value="shift">Shift (12 Jam)</option>
                          <option value="harian">Harian (Kantor)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <select
                          value={emp.regu}
                          onChange={(e) => handleReguChange(emp, e.target.value as ReguType)}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-500"
                        >
                          <option value="Regu 1">Regu 1</option>
                          <option value="Regu 2">Regu 2</option>
                          <option value="Regu 3">Regu 3</option>
                          <option value="Regu 4">Regu 4</option>
                          <option value="Harian">Harian (Mako)</option>
                        </select>
                        <select
                          value={emp.scheduleType}
                          onChange={(e) => handleScheduleChange(emp, e.target.value as ScheduleType)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2 py-1 text-[11px] font-medium focus:outline-none focus:border-amber-500"
                        >
                          <option value="shift">Shift (12 Jam)</option>
                          <option value="harian">Harian (Jam Kantor)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {emp.boundDeviceId ? (
                      <span className="text-emerald-700 font-mono truncate max-w-[120px]" title={emp.boundDeviceId}>
                        ✓ Kunci: {emp.boundDeviceId.slice(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-amber-700">Belum Ada Kunci HP</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onResetDeviceLock(emp.id)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-medium border border-amber-200"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEmployee({ ...emp })}
                      className="p-1 bg-white text-slate-600 rounded-lg text-xs hover:text-slate-900 border border-slate-200"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(emp)}
                      className="p-1 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {paginatedList.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tidak ada personel yang sesuai kriteria pencarian / filter.
            </div>
          )}
        </div>

        {/* Desktop & Tablet Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Personel</th>
                <th className="py-3 px-4">Pangkat / Jabatan</th>
                <th className="py-3 px-4">Penempatan Lokasi Kerja</th>
                <th className="py-3 px-4">Penugasan Regu & Jadwal</th>
                <th className="py-3 px-4">Kunci ID Perangkat</th>
                <th className="py-3 px-4 text-right">Aksi Personel (Reset & Hapus)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.map((emp) => {
                const assignedLoc = locations.find(l => l.id === emp.locationSlotId);

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Personnel Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{emp.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-amber-800 font-bold">{emp.regu}</span>
                        <span>·</span>
                        <span>{emp.id}</span>
                        <span>·</span>
                        <span>NIP: {emp.nip}</span>
                      </div>
                    </td>

                    {/* Role & Rank */}
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{emp.role}</div>
                      <div className="text-[11px] text-slate-500">{emp.rank}</div>
                    </td>

                    {/* Penempatan Slot Lokasi (Dropdown langsung untuk admin) */}
                    <td className="py-3 px-4">
                      <select
                        value={emp.locationSlotId}
                        onChange={(e) => handleSlotChange(emp, Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 font-medium max-w-[210px] truncate"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Radius Geofence: {assignedLoc?.radiusMeters}m</span>
                      </div>
                    </td>

                    {/* Penugasan Regu & Jadwal Kerja (Shift & Harian) */}
                    <td className="py-3 px-4">
                      {isDanru ? (
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 text-amber-950 font-bold border border-amber-300 text-xs">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>{emp.regu}</span>
                          </div>
                          <div>
                            <select
                              value={emp.scheduleType}
                              onChange={(e) => handleScheduleChange(emp, e.target.value as ScheduleType)}
                              className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-amber-500 shadow-2xs"
                              title="Ubah tipe jadwal personel: Shift atau Harian"
                            >
                              <option value="shift">Shift 12 Jam</option>
                              <option value="harian">Harian (Kantor)</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <select
                            value={emp.regu}
                            onChange={(e) => handleReguChange(emp, e.target.value as ReguType)}
                            className={`border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-500 ${
                              emp.regu === 'Harian' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}
                          >
                            <option value="Regu 1">Regu 1</option>
                            <option value="Regu 2">Regu 2</option>
                            <option value="Regu 3">Regu 3</option>
                            <option value="Regu 4">Regu 4</option>
                            <option value="Harian">Harian (Mako)</option>
                          </select>
                          <div>
                            <select
                              value={emp.scheduleType}
                              onChange={(e) => handleScheduleChange(emp, e.target.value as ScheduleType)}
                              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-0.5 text-[10px] font-medium focus:outline-none focus:border-amber-500"
                            >
                              <option value="shift">Shift (12 Jam)</option>
                              <option value="harian">Harian (Jam Kantor)</option>
                            </select>
                          </div>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">
                        {emp.scheduleType === 'harian' ? '07.30 - 16.00 WIB' : 'Rotasi 08.00-20.00 / 20.00-08.00'}
                      </div>
                    </td>

                    {/* Device Lock Status & ID */}
                    <td className="py-3 px-4">
                      {emp.boundDeviceId ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Terkunci</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]" title={emp.boundDeviceId}>
                            {emp.boundDeviceId}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-700 font-medium text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Belum Ada Kunci HP</span>
                        </div>
                      )}
                    </td>

                    {/* Actions: Tombol Reset, Tombol Hapus, dan Edit */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Tombol Reset Kunci Perangkat */}
                        <button
                          type="button"
                          onClick={() => onResetDeviceLock(emp.id)}
                          title={
                            emp.boundDeviceId
                              ? `Reset Kunci Perangkat: Buka ikatan HP ${emp.boundDeviceId} agar pegawai bisa daftar HP baru`
                              : `Reset Status Perangkat untuk ${emp.name}`
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 shadow-xs ${
                            emp.boundDeviceId
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset</span>
                        </button>

                        {/* Tombol Hapus Personel */}
                        <button
                          type="button"
                          onClick={() => setEmployeeToDelete(emp)}
                          title={`Hapus Personel ${emp.name} dari sistem`}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hapus</span>
                        </button>

                        {/* Tombol Edit Lengkap */}
                        <button
                          type="button"
                          onClick={() => setEditingEmployee({ ...emp })}
                          title="Edit Lengkap Pegawai"
                          className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-amber-800 rounded-lg transition-colors border border-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}

              {paginatedList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada personel yang sesuai dengan kriteria pencarian / filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Halaman <strong className="text-slate-900">{currentPage}</strong> dari <strong className="text-slate-900">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-700 px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Data Personel: {editingEmployee.id}</h3>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">NIP / NRPTT</label>
                  <input
                    type="text"
                    value={editingEmployee.nip}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, nip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Pangkat Satpol PP</label>
                  <input
                    type="text"
                    value={editingEmployee.rank}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, rank: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Jabatan / Penugasan</label>
                <input
                  type="text"
                  value={editingEmployee.role}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Slot Penempatan & Penugasan Regu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Penempatan Slot Lokasi</label>
                  <select
                    value={editingEmployee.locationSlotId}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, locationSlotId: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Regu Penugasan</label>
                  {isDanru ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-950 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>{adminRegu} (Otoritas Danru)</span>
                    </div>
                  ) : (
                    <select
                      value={editingEmployee.regu}
                      onChange={(e) => {
                        const newRegu = e.target.value as ReguType;
                        setEditingEmployee({ 
                          ...editingEmployee, 
                          regu: newRegu,
                          scheduleType: newRegu === 'Harian' ? 'harian' : editingEmployee.scheduleType
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
                    >
                      <option value="Regu 1">Regu 1</option>
                      <option value="Regu 2">Regu 2</option>
                      <option value="Regu 3">Regu 3</option>
                      <option value="Regu 4">Regu 4</option>
                      <option value="Harian">Harian (Mako)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Tipe Jadwal Kerja (Shift vs Harian) */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tipe Jadwal Kerja</label>
                <select
                  value={editingEmployee.scheduleType}
                  onChange={(e) => {
                    setEditingEmployee({
                      ...editingEmployee,
                      scheduleType: e.target.value as ScheduleType
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="shift">Shift (12 Jam: Pagi 08.00-20.00 / Malam 20.00-08.00 WIB)</option>
                  <option value="harian">Harian (Jam Kantor: 07.30-16.00 / Jumat 07.00-16.30 WIB)</option>
                </select>
                <div className="text-[10px] text-slate-500 mt-1">
                  {editingEmployee.scheduleType === 'harian' 
                    ? 'Personel Harian: Jam kantor normal dengan validasi apel pagi dan hari kerja Senin-Jumat' 
                    : `Personel Shift: Jam dinas 12 jam bergantian sesuai siklus regu`}
                </div>
              </div>

              {/* Device lock status in modal */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Kunci ID Perangkat:</span>
                  <span className="font-mono text-amber-800 font-bold">
                    {editingEmployee.boundDeviceId || "Belum Terkunci"}
                  </span>
                </div>
                {editingEmployee.boundDeviceId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmployee({ ...editingEmployee, boundDeviceId: null });
                      onResetDeviceLock(editingEmployee.id);
                    }}
                    className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Buka Kunci Perangkat (Reset Binding)
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = editingEmployee;
                    setEditingEmployee(null);
                    setEmployeeToDelete(target);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 bg-rose-50/50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
                  title="Hapus personel ini dari sistem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Personel</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Employee Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Tambah Personel Satpol PP Baru</h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nama Lengkap Personel</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.H."
                  value={newEmployee.name || ''}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">NIP / NRPTT</label>
                  <input
                    type="text"
                    placeholder="19950101 202001 1 001"
                    value={newEmployee.nip || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, nip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Pangkat</label>
                  <input
                    type="text"
                    placeholder="Pengatur Muda (II/a)"
                    value={newEmployee.rank || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, rank: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Jabatan / Regu</label>
                <input
                  type="text"
                  placeholder="Anggota Regu Operasional / Danru"
                  value={newEmployee.role || ''}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Penempatan Slot Lokasi</label>
                  <select
                    value={newEmployee.locationSlotId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, locationSlotId: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Regu Penugasan</label>
                  {isDanru ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-950 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>{adminRegu} (Otoritas Danru)</span>
                    </div>
                  ) : (
                    <select
                      value={newEmployee.regu || 'Regu 1'}
                      onChange={(e) => {
                        const newRegu = e.target.value as ReguType;
                        setNewEmployee({ 
                          ...newEmployee, 
                          regu: newRegu,
                          scheduleType: newRegu === 'Harian' ? 'harian' : (newEmployee.scheduleType || 'shift')
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
                    >
                      <option value="Regu 1">Regu 1</option>
                      <option value="Regu 2">Regu 2</option>
                      <option value="Regu 3">Regu 3</option>
                      <option value="Regu 4">Regu 4</option>
                      <option value="Harian">Harian (Mako)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Tipe Jadwal Kerja Baru */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tipe Jadwal Kerja</label>
                <select
                  value={newEmployee.scheduleType || 'shift'}
                  onChange={(e) => {
                    setNewEmployee({
                      ...newEmployee,
                      scheduleType: e.target.value as ScheduleType
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="shift">Shift (12 Jam: Pagi 08.00-20.00 / Malam 20.00-08.00 WIB)</option>
                  <option value="harian">Harian (Jam Kantor: 07.30-16.00 / Jumat 07.00-16.30 WIB)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Tambahkan Personel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-rose-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Data Personel?</h3>
                <p className="text-xs text-slate-500">Data anggota Satpol PP akan dihapus dari sistem</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Lengkap:</span>
                <strong className="text-slate-900">{employeeToDelete.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NIP / ID:</span>
                <span className="font-mono text-slate-700">{employeeToDelete.nip} ({employeeToDelete.id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penugasan Regu:</span>
                <span className="font-semibold text-amber-800">{employeeToDelete.regu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pos Penempatan:</span>
                <span className="text-slate-700">Slot {employeeToDelete.locationSlotId}</span>
              </div>
              {employeeToDelete.boundDeviceId && (
                <div className="flex justify-between text-rose-600">
                  <span>Kunci Perangkat:</span>
                  <span className="font-mono">{employeeToDelete.boundDeviceId}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 leading-relaxed">
              Peringatan: Tindakan ini akan menghapus personel dan melepaskan seluruh penugasan slot pos serta status perangkat yang terkait.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEmployee(employeeToDelete.id);
                  setEmployeeToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Personel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus / Reset Data Seluruh Pegawai */}
      {isResetAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Hapus / Reset Data Seluruh Pegawai
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih opsi pemulihan data personel Satpol PP (Total saat ini: {employees.length} Pegawai)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetAllModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Option 1: Kosongkan / Hapus Semua (Permintaan User: Data Benar-benar Kosong) */}
              <label 
                className={`p-3.5 rounded-2xl border cursor-pointer block transition-all ${
                  selectedResetAllMode === 'clear_all'
                    ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="resetAllEmployeeMode"
                    checked={selectedResetAllMode === 'clear_all'}
                    onChange={() => setSelectedResetAllMode('clear_all')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-bold text-sm text-rose-700">
                        Hapus & Kosongkan Seluruh Data Pegawai Secara Total
                      </strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Data Kosong (0 Pegawai)
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Menghapus seluruh database pegawai secara total ({employees.length} personel), termasuk data bawaan standar aplikasi, sehingga data menjadi benar-benar kosong untuk diisi mandiri oleh admin.
                    </p>
                  </div>
                </div>
              </label>

              {/* Option 2: Reset Default */}
              <label 
                className={`p-3.5 rounded-2xl border cursor-pointer block transition-all ${
                  selectedResetAllMode === 'reset_default'
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="resetAllEmployeeMode"
                    checked={selectedResetAllMode === 'reset_default'}
                    onChange={() => setSelectedResetAllMode('reset_default')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-bold text-sm">
                        Kembalikan ke Data Formasi Bawaan Satpol PP
                      </strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Standar Formasi
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Mengembalikan seluruh daftar personel ke formasi bawaan baku Satpol PP lengkap dengan nama, NIP, pangkat, pembagian Regu 1, 2, 3, 4, dan Harian.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-2xl border border-amber-200 leading-relaxed">
              💡 <strong>Catatan:</strong> Data personel akan langsung tersinkronisasi ke Cloud Firestore dan dapat diakses kembali oleh admin.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetAllModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetAllEmployees) {
                    onResetAllEmployees(selectedResetAllMode);
                  }
                  setIsResetAllModalOpen(false);
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                  selectedResetAllMode === 'clear_all'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {selectedResetAllMode === 'clear_all'
                    ? "Ya, Kosongkan Seluruh Pegawai"
                    : "Ya, Reset ke Data Default"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
