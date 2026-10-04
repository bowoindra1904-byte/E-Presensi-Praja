import React, { useState } from 'react';
import { WorkLocation, Employee } from '../../types';
import { MapComponent } from '../MapComponent';
import { 
  MapPin, 
  Edit3, 
  Check, 
  X, 
  Shield, 
  Users, 
  Radio, 
  ExternalLink, 
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface WorkLocationsManagerProps {
  locations: WorkLocation[];
  employees: Employee[];
  onUpdateLocation: (location: WorkLocation) => void;
  onAddLocation?: (location: WorkLocation) => void;
  onDeleteLocation?: (locationId: number) => void;
  onOpenPrintMenu?: (menu: 'locations') => void;
}

export const WorkLocationsManager: React.FC<WorkLocationsManagerProps> = ({
  locations,
  employees,
  onUpdateLocation,
  onAddLocation,
  onDeleteLocation,
  onOpenPrintMenu,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<number>(() => {
    return locations[0]?.id || 1;
  });
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [googleMapsInput, setGoogleMapsInput] = useState<string>('');
  const [parseStatus, setParseStatus] = useState<{ success: boolean; message: string } | null>(null);

  // New location modal state
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    name: '',
    code: '',
    category: 'Pos Lapangan',
    address: '',
    latitude: -6.1825,
    longitude: 106.8285,
    radiusMeters: 20,
    description: '',
  });
  const [newLocMapsInput, setNewLocMapsInput] = useState('');
  const [newLocParseStatus, setNewLocParseStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Delete confirmation modal state
  const [locationToDelete, setLocationToDelete] = useState<WorkLocation | null>(null);

  const selectedLoc = locations.find(l => l.id === selectedLocationId) || locations[0] || {
    id: 1,
    slotNumber: 1,
    name: 'Mako Utama',
    code: 'POS-01-MAKO',
    category: 'Markas Komando',
    address: 'Jl. Utama',
    latitude: -6.1825,
    longitude: 106.8285,
    radiusMeters: 20,
    description: '',
    isActive: true,
  };

  // Headcount per slot
  const getPersonnelCount = (slotId: number) => {
    return employees.filter(e => e.locationSlotId === slotId).length;
  };

  const handleEditClick = (loc: WorkLocation) => {
    setEditingLocation({ ...loc });
    setGoogleMapsInput(`${loc.latitude}, ${loc.longitude}`);
    setParseStatus(null);
  };

  const handleOpenAddModal = () => {
    const nextSlot = (locations.length > 0 ? Math.max(...locations.map(l => l.slotNumber || l.id)) : 0) + 1;
    setNewLocationForm({
      name: `Slot ${nextSlot}: Pos Pengamanan Baru`,
      code: `POS-${String(nextSlot).padStart(2, '0')}-UNIT`,
      category: 'Pos Pengamanan & Penertiban',
      address: '',
      latitude: -6.1825,
      longitude: 106.8285,
      radiusMeters: 20,
      description: 'Pengawasan ketertiban umum dan perlindungan masyarakat oleh personel Satpol PP.',
    });
    setNewLocMapsInput('');
    setNewLocParseStatus(null);
    setIsAddingLocation(true);
  };

  // Google Maps Coordinates Parser helper
  const parseGoogleMapsHelper = (rawText: string): { lat: number; lng: number } | null => {
    const text = rawText.trim();
    if (!text) return null;

    let lat: number | null = null;
    let lng: number | null = null;

    // Pattern 1: URL with @lat,lng
    const atMatch = text.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    // Pattern 2: URL with ?q=lat,lng or query=lat,lng
    if (lat === null) {
      const qMatch = text.match(/[?&](?:q|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      }
    }

    // Pattern 3: Raw coordinates pair (e.g. -6.182500, 106.828500 or -6.182500 106.828500)
    if (lat === null) {
      const coordMatch = text.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  };

  const handleParseGoogleMaps = (rawText: string) => {
    const res = parseGoogleMapsHelper(rawText);
    if (res) {
      if (editingLocation) {
        setEditingLocation({
          ...editingLocation,
          latitude: res.lat,
          longitude: res.lng,
        });
      }
      setParseStatus({
        success: true,
        message: `Koordinat Google Maps Berhasil Diterapkan: Lat ${res.lat.toFixed(6)}, Lng ${res.lng.toFixed(6)}`
      });
    } else {
      setParseStatus({
        success: false,
        message: 'Format tidak dikenali. Salin koordinat dari Google Maps (contoh: -6.1825, 106.8285) atau tempel tautan maps.'
      });
    }
  };

  const handleParseGoogleMapsNew = (rawText: string) => {
    const res = parseGoogleMapsHelper(rawText);
    if (res) {
      setNewLocationForm(prev => ({
        ...prev,
        latitude: res.lat,
        longitude: res.lng,
      }));
      setNewLocParseStatus({
        success: true,
        message: `Koordinat Google Maps Berhasil Diterapkan: Lat ${res.lat.toFixed(6)}, Lng ${res.lng.toFixed(6)}`
      });
    } else {
      setNewLocParseStatus({
        success: false,
        message: 'Format tidak dikenali. Salin koordinat dari Google Maps (contoh: -6.1825, 106.8285) atau tempel tautan maps.'
      });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      onUpdateLocation(editingLocation);
      setEditingLocation(null);
    }
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddLocation) return;
    const nextSlot = (locations.length > 0 ? Math.max(...locations.map(l => l.slotNumber || l.id)) : 0) + 1;
    const nextId = (locations.length > 0 ? Math.max(...locations.map(l => l.id)) : 0) + 1;

    const newLoc: WorkLocation = {
      id: nextId,
      slotNumber: nextSlot,
      name: newLocationForm.name.trim() || `Slot ${nextSlot}: Pos Operasional Baru`,
      code: newLocationForm.code.trim().toUpperCase() || `POS-${String(nextSlot).padStart(2, '0')}-UNIT`,
      category: newLocationForm.category.trim() || 'Pos Lapangan',
      address: newLocationForm.address.trim() || 'Wilayah Penugasan Kedinasan',
      latitude: Number(newLocationForm.latitude) || -6.1825,
      longitude: Number(newLocationForm.longitude) || 106.8285,
      radiusMeters: Number(newLocationForm.radiusMeters) || 20,
      description: newLocationForm.description.trim() || 'Penugasan personel operasional Satpol PP.',
      isActive: true,
    };

    onAddLocation(newLoc);
    setSelectedLocationId(newLoc.id);
    setIsAddingLocation(false);
  };

  const handleConfirmDelete = () => {
    if (!locationToDelete || !onDeleteLocation) return;
    if (locations.length <= 1) {
      alert("Minimal harus ada 1 pos lokasi tugas yang aktif.");
      setLocationToDelete(null);
      return;
    }
    const idToDelete = locationToDelete.id;
    onDeleteLocation(idToDelete);
    setLocationToDelete(null);
    const remaining = locations.filter(l => l.id !== idToDelete);
    if (remaining.length > 0) {
      setSelectedLocationId(remaining[0].id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-500" />
            Manajemen {locations.length} Pos Lokasi Kerja Satpol PP
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi koordinat GPS dari Google Maps, radius geofence toleransi, dan kuota penempatan {employees.length} personel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onAddLocation && (
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-2xl shadow transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Pos Baru</span>
            </button>
          )}

          {onOpenPrintMenu && (
            <button
              onClick={() => onOpenPrintMenu('locations')}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Daftar {locations.length} Pos</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-amber-400">
            <Shield className="w-4 h-4" />
            <span>{locations.length} Pos Terintegrasi GPS & Geofence</span>
          </div>
        </div>
      </div>

      {/* Grid: Slots Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {locations.map((loc) => {
          const count = getPersonnelCount(loc.id);
          const isSelected = loc.id === selectedLocationId;

          return (
            <div
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-xl'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                    {String(loc.slotNumber).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
                    {loc.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-1">
                  {loc.name.replace(/^Slot \d+:\s*/, '')}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {loc.address}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-white">{count}</span>
                  <span className="text-[10px] text-slate-400">Personel</span>
                </div>
                
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                  <span>Geofence:</span>
                  <span className="font-bold">{loc.radiusMeters}m</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Slot Detailed Panel & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Location Map Preview */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Peta Satelit Pos {selectedLoc.slotNumber}: {selectedLoc.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Citra Satelit
                </span>
              </h3>
            </div>
            
            {/* Open in Google Maps */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedLoc.latitude},${selectedLoc.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 self-start sm:self-auto transition-colors"
            >
              <span>Buka di Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <MapComponent
            locations={locations}
            activeLocationId={selectedLoc.id}
            height="360px"
            zoom={16}
          />

          <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between pt-1 gap-2">
            <span className="font-mono">Koordinat GPS: {selectedLoc.latitude.toFixed(6)}, {selectedLoc.longitude.toFixed(6)}</span>
            <span className="text-amber-400 font-medium">Batas Geofence: Radius {selectedLoc.radiusMeters} Meter</span>
          </div>
        </div>

        {/* Right: Slot Configuration & Assigned Officers Preview */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Slot Detail Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  {selectedLoc.code}
                </span>
                <h3 className="text-sm font-bold text-white truncate">{selectedLoc.name}</h3>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleEditClick(selectedLoc)}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Pos</span>
                </button>

                {onDeleteLocation && locations.length > 1 && (
                  <button
                    onClick={() => setLocationToDelete(selectedLoc)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl shadow transition-colors flex items-center gap-1"
                    title="Hapus Pos Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block text-[11px]">Kategori Pos:</span>
                <span className="font-medium text-white">{selectedLoc.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Alamat Penugasan:</span>
                <span className="font-medium text-white">{selectedLoc.address}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Latitude GPS:</span>
                  <span className="font-mono font-bold text-slate-200">{selectedLoc.latitude}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Longitude GPS:</span>
                  <span className="font-mono font-bold text-slate-200">{selectedLoc.longitude}</span>
                </div>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Radius Geofence Maksimal:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{selectedLoc.radiusMeters} Meter</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                {selectedLoc.description}
              </p>
            </div>
          </div>

          {/* Assigned Officers List in this Slot */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-white">
                  Daftar Personel di Pos Ini ({getPersonnelCount(selectedLoc.id)} Anggota)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedLoc.code}
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
              {employees
                .filter(e => e.locationSlotId === selectedLoc.id)
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-white block">{emp.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">NIP: {emp.nip} • {emp.role}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                      emp.regu === 'Harian' 
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
                        : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                    }`}>
                      {emp.regu}
                    </span>
                  </div>
                ))}
              
              {getPersonnelCount(selectedLoc.id) === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Belum ada personel yang ditugaskan ke pos ini.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Edit Slot Location */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  Edit Pos {editingLocation.slotNumber}: {editingLocation.name}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Kode Pos: {editingLocation.code}
                </span>
              </div>
              <button
                onClick={() => setEditingLocation(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              
              {/* Google Maps Coordinates Importer */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Ambil Koordinat dari Google Maps
                  </label>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Buka Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                
                <p className="text-[11px] text-slate-300">
                  Cari pos di Google Maps, klik kanan titik lokasi lalu pilih <strong>Salin Koordinat</strong>, atau tempel tautan/link share:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={googleMapsInput}
                    onChange={(e) => setGoogleMapsInput(e.target.value)}
                    placeholder="Contoh: -6.1825, 106.8285 atau tempel link Maps"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleParseGoogleMaps(googleMapsInput)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shrink-0 shadow-sm"
                  >
                    Terapkan
                  </button>
                </div>

                {parseStatus && (
                  <div className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    parseStatus.success ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                  }`}>
                    {parseStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{parseStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Pos Name & Category */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Pos Lokasi Kerja</label>
                <input
                  type="text"
                  value={editingLocation.name}
                  onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Kategori Pos</label>
                <input
                  type="text"
                  value={editingLocation.category}
                  onChange={(e) => setEditingLocation({ ...editingLocation, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Alamat Penugasan</label>
                <textarea
                  rows={2}
                  value={editingLocation.address}
                  onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Direct Lat / Lng inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Latitude (Lintang)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingLocation.latitude}
                    onChange={(e) => setEditingLocation({ ...editingLocation, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Longitude (Bujur)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingLocation.longitude}
                    onChange={(e) => setEditingLocation({ ...editingLocation, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Geofence Slider & Presets */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-white">Radius Toleransi Geofence GPS:</label>
                  <span className="font-mono font-bold text-amber-400 text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                    {editingLocation.radiusMeters} Meter
                  </span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={editingLocation.radiusMeters}
                  onChange={(e) => setEditingLocation({ ...editingLocation, radiusMeters: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 10 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 10 
                        ? 'bg-amber-600 text-white border-amber-500' 
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    10m (Sangat Ketat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 15 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 15 
                        ? 'bg-amber-600 text-white border-amber-500' 
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    15m (Pintu Pos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 20 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 20 
                        ? 'bg-amber-600 text-white border-amber-500' 
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    20m (Halaman Pos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 25 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 25 
                        ? 'bg-amber-600 text-white border-amber-500' 
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    25m (Batas Gerbang)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 50 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 50 
                        ? 'bg-amber-600 text-white border-amber-500' 
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    50m (Standar)
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 block leading-relaxed">
                  Pegawai di luar batas radius ini otomatis ditolak oleh sistem GPS anti-pemalsuan lokasi. Mode 10m - 25m memastikan pegawai tepat di pos dinas.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan Perubahan Pos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Pos Baru */}
      {isAddingLocation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-500" />
                  Tambah Pos Lokasi Kerja Baru
                </h3>
                <span className="text-xs text-slate-400">
                  Pos ke-{(locations.length > 0 ? Math.max(...locations.map(l => l.slotNumber || l.id)) : 0) + 1} dalam sistem Satpol PP
                </span>
              </div>
              <button
                onClick={() => setIsAddingLocation(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              
              {/* Google Maps Coordinates Importer */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Ambil Koordinat dari Google Maps
                  </label>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Buka Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                
                <p className="text-[11px] text-slate-300">
                  Cari pos di Google Maps, klik kanan titik lokasi lalu pilih <strong>Salin Koordinat</strong>, atau tempel link Maps:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocMapsInput}
                    onChange={(e) => setNewLocMapsInput(e.target.value)}
                    placeholder="Contoh: -6.1825, 106.8285 atau tempel link Maps"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleParseGoogleMapsNew(newLocMapsInput)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shrink-0 shadow-sm"
                  >
                    Terapkan
                  </button>
                </div>

                {newLocParseStatus && (
                  <div className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    newLocParseStatus.success ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                  }`}>
                    {newLocParseStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{newLocParseStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Pos Name & Category */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Pos Lokasi Kerja</label>
                <input
                  type="text"
                  value={newLocationForm.name}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, name: e.target.value })}
                  placeholder="Contoh: Slot 13: Pos Kawasan Simpang Tiga"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={newLocationForm.code}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, code: e.target.value })}
                    placeholder="Contoh: POS-13-SIMPANG"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Kategori Pos</label>
                  <input
                    type="text"
                    value={newLocationForm.category}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, category: e.target.value })}
                    placeholder="Contoh: Titik Simpul / Obvit"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Alamat Penugasan Lengkap</label>
                <textarea
                  rows={2}
                  value={newLocationForm.address}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, address: e.target.value })}
                  placeholder="Contoh: Jl. Protokol No. 45, Kecamatan..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Direct Lat / Lng inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Latitude (Lintang)</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocationForm.latitude}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Longitude (Bujur)</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocationForm.longitude}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Geofence Presets */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-white">Radius Toleransi Geofence GPS:</label>
                  <span className="font-mono font-bold text-amber-400 text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                    {newLocationForm.radiusMeters} Meter
                  </span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={newLocationForm.radiusMeters}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, radiusMeters: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[10, 15, 20, 25, 50].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewLocationForm({ ...newLocationForm, radiusMeters: r })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                        newLocationForm.radiusMeters === r 
                          ? 'bg-amber-600 text-white border-amber-500' 
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingLocation(false)}
                  className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Pos Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hapus Pos Confirmation */}
      {locationToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Pos Lokasi?</h3>
                <span className="text-xs text-rose-400 font-mono">{locationToDelete.code}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Apakah Anda yakin ingin menghapus <strong className="text-white">{locationToDelete.name}</strong>?
              {getPersonnelCount(locationToDelete.id) > 0 && (
                <span className="block mt-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px]">
                  Peringatan: Sebanyak <strong>{getPersonnelCount(locationToDelete.id)} personel</strong> yang saat ini bertugas di pos ini akan otomatis dialihkan ke Pos 1 (Mako Utama).
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setLocationToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Ya, Hapus Pos Ini
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
