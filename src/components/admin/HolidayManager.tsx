import React, { useState, useMemo } from 'react';
import { CustomHoliday } from '../../types';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  CalendarDays, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ShieldAlert,
  Sparkles,
  Printer
} from 'lucide-react';
import { INDONESIAN_HOLIDAYS_2026 } from '../../utils/smartAttendanceCalculator';

interface HolidayManagerProps {
  customHolidays: CustomHoliday[];
  onAddHoliday: (holiday: CustomHoliday) => void;
  onDeleteHoliday: (holidayId: string) => void;
  currentDate?: Date;
  onOpenPrintMenu?: () => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  customHolidays,
  onAddHoliday,
  onDeleteHoliday,
  currentDate = new Date(),
  onOpenPrintMenu
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'custom' | 'national'>('custom');

  // Form states for new custom holiday
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'libur_daerah' as CustomHoliday['type'],
    appliesTo: 'all' as CustomHoliday['appliesTo'],
    notes: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Convert INDONESIAN_HOLIDAYS_2026 object to array
  const nationalHolidaysList = useMemo(() => {
    return Object.entries(INDONESIAN_HOLIDAYS_2026).map(([date, name]) => {
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayName = dayNames[dateObj.getDay()];
      return {
        date,
        name,
        dayName,
        isPast: dateObj < new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [currentDate]);

  // Filtered Custom Holidays
  const filteredCustomHolidays = useMemo(() => {
    return customHolidays.filter(h => {
      const matchSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.date.includes(searchQuery) ||
                          (h.notes && h.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchType = filterType === 'all' || h.type === filterType;
      return matchSearch && matchType;
    });
  }, [customHolidays, searchQuery, filterType]);

  const handleOpenAddModal = (initialDate?: string) => {
    setFormData({
      date: initialDate || new Date().toISOString().split('T')[0],
      name: '',
      type: 'libur_daerah',
      appliesTo: 'all',
      notes: ''
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date) {
      setFormError('Tanggal libur wajib dipilih.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Nama / keterangan hari libur wajib diisi.');
      return;
    }

    // Check duplicate custom holiday
    const exists = customHolidays.some(h => h.date === formData.date);
    if (exists) {
      setFormError(`Tanggal ${formData.date} sudah terdaftar dalam daftar hari libur kustom.`);
      return;
    }

    const newHoliday: CustomHoliday = {
      id: `HOL-${Date.now()}`,
      date: formData.date,
      name: formData.name.trim(),
      type: formData.type,
      appliesTo: formData.appliesTo,
      notes: formData.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: 'Komando Admin Satpol PP'
    };

    onAddHoliday(newHoliday);
    setIsAddModalOpen(false);
    setSuccessToast(`Hari Libur "${newHoliday.name}" (${newHoliday.date}) berhasil ditambahkan dan disinkronkan ke seluruh sistem presensi!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDelete = (holiday: CustomHoliday) => {
    if (window.confirm(`Yakin ingin menghapus Hari Libur "${holiday.name}" (${holiday.date})? Rekapan kehadiran pegawai akan kembali dihitung otomatis sesuai jadwal semula.`)) {
      onDeleteHoliday(holiday.id);
      setSuccessToast(`Hari Libur "${holiday.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const getTypeName = (type: CustomHoliday['type']) => {
    switch (type) {
      case 'libur_daerah': return 'Libur Daerah / Pemda';
      case 'cuti_bersama': return 'Cuti Bersama Khusus';
      case 'khusus_instansi': return 'Hari Khusus / HUT Satpol PP';
      case 'libur_nasional': return 'Libur Nasional Tambahan';
    }
  };

  const getTypeBadgeClass = (type: CustomHoliday['type']) => {
    switch (type) {
      case 'libur_daerah': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cuti_bersama': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'khusus_instansi': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'libur_nasional': return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <CalendarDays className="w-5 h-5 text-amber-600" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Manajemen Hari Libur & Tanggal Merah
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Kelola hari libur kustom (HUT Daerah, Cuti Bersama Khusus, Pilkada, Hari Satpol PP). Pegawai pada tanggal libur otomatis dibebaskan dari presensi dan dihitung <strong>L (Libur)</strong> tanpa mengurangi persentase kehadiran sah.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Hari Libur</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Custom vs Kalender Nasional */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hari Libur Kustom / Daerah</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'custom' ? 'bg-amber-800 text-amber-100' : 'bg-slate-100 text-slate-700'}`}>
              {customHolidays.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('national')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'national'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Hari Libur Nasional Resmi (2026)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'national' ? 'bg-amber-800 text-amber-100' : 'bg-slate-100 text-slate-700'}`}>
              {nationalHolidaysList.length}
            </span>
          </button>
        </div>

        {/* Operational info callout */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Tersinkronisasi otomatis ke Laporan Bulanan & Top 5 Presensi</span>
        </div>
      </div>

      {/* TAB 1: Custom Holidays */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari hari libur kustom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="all">Semua Kategori</option>
                <option value="libur_daerah">Libur Daerah / Pemda</option>
                <option value="cuti_bersama">Cuti Bersama Khusus</option>
                <option value="khusus_instansi">Hari Khusus Satpol PP</option>
                <option value="libur_nasional">Libur Nasional Tambahan</option>
              </select>
            </div>
          </div>

          {/* List or Empty State */}
          {filteredCustomHolidays.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {customHolidays.length === 0 
                  ? 'Belum Ada Hari Libur Kustom yang Ditambahkan' 
                  : 'Tidak Ada Hari Libur yang Cocok dengan Filter'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Klik tombol <strong>"Tambah Hari Libur"</strong> di atas untuk menetapkan tanggal merah khusus daerah Bangka Barat atau hari cuti bersama insidental.
              </p>
              {customHolidays.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Hari Libur Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCustomHolidays.map((holiday) => {
                const [y, m, d] = holiday.date.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const monthNames = [
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                const dayName = dayNames[dateObj.getDay()];
                const formattedDate = `${d} ${monthNames[m - 1]} ${y}`;

                return (
                  <div
                    key={holiday.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeBadgeClass(holiday.type)}`}>
                          {getTypeName(holiday.type)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(holiday)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Hari Libur Kustom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 mt-2 line-clamp-2">
                        {holiday.name}
                      </h4>

                      <div className="flex items-center gap-2 mt-2 text-xs font-mono font-bold text-amber-700">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{dayName}, {formattedDate}</span>
                      </div>

                      {holiday.notes && (
                        <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                          "{holiday.notes}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Berlaku untuk:</span>
                      <span className="font-bold text-slate-700">
                        {holiday.appliesTo === 'all' 
                          ? 'Semua Jadwal (Harian & Shift)' 
                          : holiday.appliesTo === 'harian_only'
                          ? 'Harian Saja'
                          : 'Shift Saja'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: National Official Calendar 2026 */}
      {activeTab === 'national' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Hari Libur Nasional Resmi Tahun 2026 (SKB 3 Menteri)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Secara otomatis telah terintegrasi ke dalam seluruh algoritma kalkulasi kehadiran SI-PRAJA.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {nationalHolidaysList.map((item, idx) => {
              const [y, m, d] = item.date.split('-').map(Number);
              const monthNames = [
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ];
              const formattedDate = `${d} ${monthNames[m - 1]} ${y}`;

              return (
                <div
                  key={item.date}
                  className={`p-3 sm:px-4 flex items-center justify-between gap-3 text-xs ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center font-mono text-[11px] text-slate-400 font-semibold">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                      <span className="text-[11px] text-slate-500">{item.dayName}, {formattedDate}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shrink-0">
                    Nasional Sah
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Tambah Hari Libur Kustom */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-slate-900">Tambah Hari Libur Kustom</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveHoliday} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Libur <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Hari Libur / Acara <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: HUT Kabupaten Bangka Barat / Hari Satpol PP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Libur
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="libur_daerah">Libur Daerah / Pemda</option>
                    <option value="cuti_bersama">Cuti Bersama Khusus</option>
                    <option value="khusus_instansi">Hari Khusus Satpol PP</option>
                    <option value="libur_nasional">Libur Nasional Tambahan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Berlaku Untuk
                  </label>
                  <select
                    value={formData.appliesTo}
                    onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="all">Semua Jadwal (Harian & Shift)</option>
                    <option value="harian_only">Khusus Harian (Senin-Jumat)</option>
                    <option value="shift_only">Khusus Regu Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Nomor Surat Keputusan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SK Bupati No. 188.45/2026"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Ketentuan Otomatis:</strong> Pada hari libur yang didaftarkan, pegawai jadwal harian bebas absen masuk & pulang. Presensi akan terkunci secara aman dengan label <em>"Hari Libur"</em> dan rekapan bulanan otomatis menghitungnya sebagai status <strong>L (Libur)</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  Simpan & Sinkronkan
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
