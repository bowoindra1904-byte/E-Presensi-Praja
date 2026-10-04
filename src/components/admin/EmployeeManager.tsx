import React, { useState, useMemo } from 'react';
import { Employee, WorkLocation, ScheduleType, ReguType } from '../../types';
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
  Trash2
} from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  locations: WorkLocation[];
  onUpdateEmployee: (emp: Employee) => void;
  onAddEmployee: (emp: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onResetDeviceLock: (employeeId: string) => void;
  onResetAllEmployees?: () => void;
  onOpenPrintMenu?: (menu: 'regu') => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  locations,
  onUpdateEmployee,
  onAddEmployee,
  onDeleteEmployee,
  onResetDeviceLock,
  onResetAllEmployees,
  onOpenPrintMenu,
}) => {
  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterSlot, setFilterSlot] = useState<string>('all');
  const [filterRegu, setFilterRegu] = useState<string>('all');
  const [filterSchedule, setFilterSchedule] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');

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
    regu: 'Regu 1',
    scheduleType: 'shift',
    locationSlotId: 1,
    status: 'active'
  });

  // Filtered dataset
  const filteredList = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = 
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.nip.includes(search) ||
        emp.role.toLowerCase().includes(search.toLowerCase()) ||
        emp.id.toLowerCase().includes(search.toLowerCase());

      const matchSlot = filterSlot === 'all' || emp.locationSlotId === Number(filterSlot);
      const matchRegu = filterRegu === 'all' || emp.regu === filterRegu;
      const matchSchedule = filterSchedule === 'all' || emp.scheduleType === filterSchedule;
      const matchDevice = 
        filterDevice === 'all' || 
        (filterDevice === 'locked' && !!emp.boundDeviceId) || 
        (filterDevice === 'unlocked' && !emp.boundDeviceId);

      return matchSearch && matchSlot && matchRegu && matchSchedule && matchDevice;
    });
  }, [employees, search, filterSlot, filterRegu, filterSchedule, filterDevice]);

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
    onUpdateEmployee({
      ...emp,
      regu: newRegu,
      scheduleType: newRegu === 'Harian' ? 'harian' : 'shift'
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
    const id = `POLPP-${String(employees.length + 1).padStart(3, '0')}`;
    const regu: ReguType = newEmployee.regu || 'Regu 1';
    const sched: ScheduleType = regu === 'Harian' ? 'harian' : 'shift';

    const emp: Employee = {
      id,
      nip: newEmployee.nip || `19950101 202001 1 ${String(employees.length + 1).padStart(3, '0')}`,
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
      regu: 'Regu 1',
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
      
      {/* Title & Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Pengaturan Personel Satpol PP (Total: {employees.length} Pegawai)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Atur pembagian Regu 1, 2, 3, 4 atau Harian, penempatan {locations.length} slot pos lokasi, dan audit perangkat
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetAllEmployees && (
            <button
              onClick={onResetAllEmployees}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Reset seluruh data personel ke default 150 anggota"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset 150 Pegawai</span>
            </button>
          )}
          {onOpenPrintMenu && (
            <button
              onClick={() => onOpenPrintMenu('regu')}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Daftar Regu</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Ekspor CSV
          </button>
          <button
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Personel
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter Regu (Regu 1, 2, 3, 4, Harian) */}
          <div>
            <select
              value={filterRegu}
              onChange={(e) => handleFilterChange(setFilterRegu, e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="all">Semua Regu (1-4 & Harian)</option>
              <option value="Regu 1">Regu 1 (Shift)</option>
              <option value="Regu 2">Regu 2 (Shift)</option>
              <option value="Regu 3">Regu 3 (Shift)</option>
              <option value="Regu 4">Regu 4 (Shift)</option>
              <option value="Harian">Harian (Staf)</option>
            </select>
          </div>

          {/* Filter 8 Slot Lokasi */}
          <div>
            <select
              value={filterSlot}
              onChange={(e) => handleFilterChange(setFilterSlot, e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Slot Lokasi (1 - 8)</option>
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Tipe Jadwal</option>
              <option value="shift">Shift (12 Jam)</option>
              <option value="harian">Harian (Kantor/Dinas)</option>
            </select>
          </div>

          {/* Filter Status Kunci Perangkat */}
          <div>
            <select
              value={filterDevice}
              onChange={(e) => handleFilterChange(setFilterDevice, e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status Kunci HP</option>
              <option value="locked">Terkunci (Device Bound)</option>
              <option value="unlocked">Belum Terkunci</option>
            </select>
          </div>

        </div>

        {/* Status Count & Summary & Reset Filter */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 gap-2">
          <div className="flex items-center gap-3">
            <span>
              Menampilkan <strong className="text-white">{filteredList.length}</strong> dari total {employees.length} personel Satpol PP
            </span>
            {(search || filterSlot !== 'all' || filterRegu !== 'all' || filterSchedule !== 'all' || filterDevice !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterSlot('all');
                  setFilterRegu('all');
                  setFilterSchedule('all');
                  setFilterDevice('all');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 rounded-lg transition-colors flex items-center gap-1 font-semibold"
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
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-white"
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Mobile View (HP Card List) */}
        <div className="sm:hidden p-3 space-y-3">
          {paginatedList.map((emp) => {
            const assignedLoc = locations.find(l => l.id === emp.locationSlotId);

            return (
              <div key={emp.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-xs truncate">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIP: {emp.nip} · {emp.id}</div>
                    <div className="text-[10px] text-slate-300 mt-0.5">{emp.role} · {emp.rank}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    emp.regu === 'Harian' 
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
                      : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                  }`}>
                    {emp.regu}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Pos Lokasi Kerja:</label>
                    <select
                      value={emp.locationSlotId}
                      onChange={(e) => handleSlotChange(emp, Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Regu & Shift:</label>
                    <select
                      value={emp.regu}
                      onChange={(e) => handleReguChange(emp, e.target.value as ReguType)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                    >
                      <option value="Regu 1">Regu 1 (Shift 12 Jam)</option>
                      <option value="Regu 2">Regu 2 (Shift 12 Jam)</option>
                      <option value="Regu 3">Regu 3 (Shift 12 Jam)</option>
                      <option value="Regu 4">Regu 4 (Shift 12 Jam)</option>
                      <option value="Harian">Harian (Kantor / Staf)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {emp.boundDeviceId ? (
                      <span className="text-emerald-400 font-mono truncate max-w-[120px]" title={emp.boundDeviceId}>
                        ✓ Kunci: {emp.boundDeviceId.slice(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-amber-400">Belum Ada Kunci HP</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onResetDeviceLock(emp.id)}
                      className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-300 rounded-lg text-xs font-medium border border-amber-600/40"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEmployee({ ...emp })}
                      className="p-1 bg-slate-800 text-slate-300 rounded-lg text-xs hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(emp)}
                      className="p-1 bg-rose-950/60 text-rose-300 rounded-lg text-xs border border-rose-800/50"
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
            <div className="py-8 text-center text-slate-500 text-xs">
              Tidak ada personel yang sesuai kriteria pencarian / filter.
            </div>
          )}
        </div>

        {/* Desktop & Tablet Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Personel</th>
                <th className="py-3 px-4">Pangkat / Jabatan</th>
                <th className="py-3 px-4">Penempatan Lokasi Kerja</th>
                <th className="py-3 px-4">Penugasan Regu & Jadwal</th>
                <th className="py-3 px-4">Kunci ID Perangkat</th>
                <th className="py-3 px-4 text-right">Aksi Personel (Reset & Hapus)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedList.map((emp) => {
                const assignedLoc = locations.find(l => l.id === emp.locationSlotId);

                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    
                    {/* Personnel Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white text-sm">{emp.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400 font-bold">{emp.regu}</span>
                        <span>·</span>
                        <span>{emp.id}</span>
                        <span>·</span>
                        <span>NIP: {emp.nip}</span>
                      </div>
                    </td>

                    {/* Role & Rank */}
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{emp.role}</div>
                      <div className="text-[11px] text-slate-400">{emp.rank}</div>
                    </td>

                    {/* Penempatan Slot Lokasi (Dropdown langsung untuk admin) */}
                    <td className="py-3 px-4">
                      <select
                        value={emp.locationSlotId}
                        onChange={(e) => handleSlotChange(emp, Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 font-medium max-w-[210px] truncate"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Radius Geofence: {assignedLoc?.radiusMeters}m</span>
                      </div>
                    </td>

                    {/* Penugasan Regu (Dropdown langsung untuk admin: Regu 1, 2, 3, 4, Harian) */}
                    <td className="py-3 px-4">
                      <select
                        value={emp.regu}
                        onChange={(e) => handleReguChange(emp, e.target.value as ReguType)}
                        className={`border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-500 ${
                          emp.regu === 'Harian' 
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                            : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        <option value="Regu 1" className="bg-slate-900 text-amber-400">Regu 1 (Shift 12 Jam)</option>
                        <option value="Regu 2" className="bg-slate-900 text-amber-400">Regu 2 (Shift 12 Jam)</option>
                        <option value="Regu 3" className="bg-slate-900 text-amber-400">Regu 3 (Shift 12 Jam)</option>
                        <option value="Regu 4" className="bg-slate-900 text-amber-400">Regu 4 (Shift 12 Jam)</option>
                        <option value="Harian" className="bg-slate-900 text-emerald-400">Harian (Kantor / Staf)</option>
                      </select>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {emp.regu === 'Harian' ? 'Senin-Kamis & Jumat' : 'Rotasi Shift 12 Jam (Pagi/Malam)'}
                      </div>
                    </td>

                    {/* Device Lock Status & ID */}
                    <td className="py-3 px-4">
                      {emp.boundDeviceId ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Terkunci</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-300 truncate max-w-[140px]" title={emp.boundDeviceId}>
                            {emp.boundDeviceId}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px]">
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
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 shadow-sm ${
                            emp.boundDeviceId
                              ? 'bg-amber-950/70 hover:bg-amber-900 text-amber-300 border-amber-600/50 hover:border-amber-500'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reset</span>
                        </button>

                        {/* Tombol Hapus Personel */}
                        <button
                          type="button"
                          onClick={() => setEmployeeToDelete(emp)}
                          title={`Hapus Personel ${emp.name} dari sistem`}
                          className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white rounded-lg text-xs font-semibold border border-rose-800/60 hover:border-rose-600 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Hapus</span>
                        </button>

                        {/* Tombol Edit Lengkap */}
                        <button
                          type="button"
                          onClick={() => setEditingEmployee({ ...emp })}
                          title="Edit Lengkap Pegawai"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg transition-colors border border-slate-700 hover:border-amber-500/40"
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
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    Tidak ada personel yang sesuai dengan kriteria pencarian / filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Edit Data Personel: {editingEmployee.id}</h3>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">NIP / NRPTT</label>
                  <input
                    type="text"
                    value={editingEmployee.nip}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, nip: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Pangkat Satpol PP</label>
                  <input
                    type="text"
                    value={editingEmployee.rank}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, rank: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Jabatan / Penugasan</label>
                <input
                  type="text"
                  value={editingEmployee.role}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Slot Penempatan & Penugasan Regu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Penempatan Slot Lokasi</label>
                  <select
                    value={editingEmployee.locationSlotId}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, locationSlotId: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Penugasan Regu / Jam Kerja</label>
                  <select
                    value={editingEmployee.regu}
                    onChange={(e) => {
                      const newRegu = e.target.value as ReguType;
                      setEditingEmployee({ 
                        ...editingEmployee, 
                        regu: newRegu,
                        scheduleType: newRegu === 'Harian' ? 'harian' : 'shift'
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Regu 1">Regu 1 (Shift 12 Jam)</option>
                    <option value="Regu 2">Regu 2 (Shift 12 Jam)</option>
                    <option value="Regu 3">Regu 3 (Shift 12 Jam)</option>
                    <option value="Regu 4">Regu 4 (Shift 12 Jam)</option>
                    <option value="Harian">Harian (Kantor / Staf)</option>
                  </select>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 -mt-2">
                {editingEmployee.regu === 'Harian' 
                  ? 'Pegawai Harian: Masuk 07.30 (Jumat 07.00) & Pulang 16.00 (Jumat 16.30 WIB)' 
                  : `Personel ${editingEmployee.regu}: Rotasi Shift 12 Jam (Pagi 08.00-20.00 / Malam 20.00-08.00 WIB)`}
              </div>

              {/* Device lock status in modal */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Kunci ID Perangkat:</span>
                  <span className="font-mono text-amber-400 font-bold">
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
                    className="w-full py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Buka Kunci Perangkat (Reset Binding)
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const target = editingEmployee;
                    setEditingEmployee(null);
                    setEmployeeToDelete(target);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition-colors flex items-center gap-1.5"
                  title="Hapus personel ini dari sistem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Personel</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Tambah Personel Satpol PP Baru</h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap Personel</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.H."
                  value={newEmployee.name || ''}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">NIP / NRPTT</label>
                  <input
                    type="text"
                    placeholder="19950101 202001 1 001"
                    value={newEmployee.nip || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, nip: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Pangkat</label>
                  <input
                    type="text"
                    placeholder="Pengatur Muda (II/a)"
                    value={newEmployee.rank || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, rank: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Jabatan / Regu</label>
                <input
                  type="text"
                  placeholder="Anggota Regu Operasional / Danru"
                  value={newEmployee.role || ''}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Penempatan Slot Lokasi</label>
                  <select
                    value={newEmployee.locationSlotId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, locationSlotId: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        Slot {loc.slotNumber}: {loc.name.replace(/^Slot \d+:\s*/, '')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Penugasan Regu / Jam Kerja</label>
                  <select
                    value={newEmployee.regu || 'Regu 1'}
                    onChange={(e) => {
                      const newRegu = e.target.value as ReguType;
                      setNewEmployee({ 
                        ...newEmployee, 
                        regu: newRegu,
                        scheduleType: newRegu === 'Harian' ? 'harian' : 'shift'
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Regu 1">Regu 1 (Shift 12 Jam)</option>
                    <option value="Regu 2">Regu 2 (Shift 12 Jam)</option>
                    <option value="Regu 3">Regu 3 (Shift 12 Jam)</option>
                    <option value="Regu 4">Regu 4 (Shift 12 Jam)</option>
                    <option value="Harian">Harian (Kantor / Staf)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Data Personel?</h3>
                <p className="text-xs text-slate-400">Data anggota Satpol PP akan dihapus dari sistem</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Lengkap:</span>
                <strong className="text-white">{employeeToDelete.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NIP / ID:</span>
                <span className="font-mono text-slate-300">{employeeToDelete.nip} ({employeeToDelete.id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Penugasan Regu:</span>
                <span className="font-semibold text-amber-400">{employeeToDelete.regu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pos Penempatan:</span>
                <span className="text-slate-300">Slot {employeeToDelete.locationSlotId}</span>
              </div>
              {employeeToDelete.boundDeviceId && (
                <div className="flex justify-between text-rose-400">
                  <span>Kunci Perangkat:</span>
                  <span className="font-mono">{employeeToDelete.boundDeviceId}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-rose-300/80 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60 leading-relaxed">
              Peringatan: Tindakan ini akan menghapus personel dan melepaskan seluruh penugasan slot pos serta status perangkat yang terkait.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEmployee(employeeToDelete.id);
                  setEmployeeToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Personel</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
