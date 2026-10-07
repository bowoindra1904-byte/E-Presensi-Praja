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

  const handleQuickAddSlot = () => {
    if (!onAddLocation) return;
    const nextSlot = (locations.length > 0 ? Math.max(...locations.map(l => l.slotNumber || l.id)) : 0) + 1;
    const nextId = (locations.length > 0 ? Math.max(...locations.map(l => l.id)) : 0) + 1;

    const lastLoc = locations[locations.length - 1];
    const baseLat = lastLoc ? lastLoc.latitude + (Math.random() * 0.002 - 0.001) : -6.1825;
    const baseLng = lastLoc ? lastLoc.longitude + (Math.random() * 0.002 - 0.001) : 106.8285;

    const newLoc: WorkLocation = {
      id: nextId,
      slotNumber: nextSlot,
      name: `Slot ${nextSlot}: Pos Operasional ${nextSlot}`,
      code: `POS-${String(nextSlot).padStart(2, '0')}-UNIT`,
      category: 'Pos Pengamanan & Penertiban',
      address: 'Wilayah Penugasan Operasional Satpol PP',
      latitude: Number(baseLat.toFixed(6)),
      longitude: Number(baseLng.toFixed(6)),
      radiusMeters: 20,
      description: 'Pengawasan ketertiban umum dan perlindungan masyarakat oleh personel Satpol PP.',
      isActive: true,
    };

    onAddLocation(newLoc);
    setSelectedLocationId(newLoc.id);
  };

  const handleReduceLastSlot = () => {
    if (locations.length <= 1) {
      alert("Minimal harus ada 1 pos lokasi tugas yang aktif.");
      return;
    }
    const lastLoc = locations[locations.length - 1];
    setLocationToDelete(lastLoc);
  };

  const handleRenumberSlots = () => {
    if (!window.confirm(`Rapikan penomoran slot agar berurutan rapi dari Slot 01 sampai Slot ${String(locations.length).padStart(2, '0')}?`)) return;
    
    locations.forEach((loc, index) => {
      const newSlotNo = index + 1;
      if (loc.slotNumber !== newSlotNo) {
        const updatedName = loc.name.replace(/^Slot \d+:\s*/i, `Slot ${newSlotNo}: `);
        const updatedCode = loc.code.replace(/POS-\d+-/i, `POS-${String(newSlotNo).padStart(2, '0')}-`);
        onUpdateLocation({
          ...loc,
          slotNumber: newSlotNo,
          name: updatedName.startsWith(`Slot ${newSlotNo}:`) ? updatedName : `Slot ${newSlotNo}: ${loc.name}`,
          code: updatedCode
        });
      }
    });
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
      
      {/* Header Info & Dynamic Slot Controls */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-600" />
              <span>Manajemen Pos Lokasi Kerja ({locations.length} Slot Pos Aktif)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Jumlah slot pos sepenuhnya dinamis: Anda dapat menambah atau mengurangi pos sesuai kebutuhan penugasan lapangan
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold bg-amber-50 px-3.5 py-2 rounded-2xl border border-amber-200 text-amber-800 shrink-0">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>{locations.length} Pos Terintegrasi GPS & Geofence</span>
          </div>
        </div>

        {/* Dynamic Slot Quick Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          {/* Quick Slot Stepper */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 px-2.5">
              Total Pos: <strong className="text-amber-700 font-mono text-sm">{locations.length}</strong> Pos
            </span>

            {onDeleteLocation && (
              <button
                type="button"
                onClick={handleReduceLastSlot}
                disabled={locations.length <= 1}
                className="px-2.5 py-1 text-xs font-bold bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                title="Kurangi 1 Slot Pos (Hapus slot terakhir)"
              >
                <span>− Kurangi Slot</span>
              </button>
            )}

            {onAddLocation && (
              <button
                type="button"
                onClick={handleQuickAddSlot}
                className="px-2.5 py-1 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1"
                title="Tambah 1 Slot Pos baru secara cepat"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Tambah 1 Slot</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onAddLocation && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-2xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Input pos baru dengan koordinat Google Maps"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Input Pos Baru (Maps)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRenumberSlots}
              className="px-3 py-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-colors"
              title="Rapikan penomoran slot agar berurutan 1 sampai N"
            >
              <span>Rapikan Nomor Slot</span>
            </button>

            {onOpenPrintMenu && (
              <button
                type="button"
                onClick={() => onOpenPrintMenu('locations')}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Cetak Daftar {locations.length} Pos</span>
              </button>
            )}
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
                  ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white/92 backdrop-blur-md border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 font-mono font-bold text-xs flex items-center justify-center">
                    {String(loc.slotNumber).padStart(2, '0')}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                      {loc.category}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(loc);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                      title="Edit Pos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteLocation && locations.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocationToDelete(loc);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={`Hapus Pos ${loc.slotNumber}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                  {loc.name.replace(/^Slot \d+:\s*/, '')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {loc.address}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold text-slate-900">{count}</span>
                  <span className="text-[10px] text-slate-400">Personel</span>
                </div>
                
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono">
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
        <div className="lg:col-span-7 bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Peta Satelit Pos {selectedLoc.slotNumber}: {selectedLoc.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Citra Satelit
                </span>
              </h3>
            </div>
            
            {/* Open in Google Maps */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedLoc.latitude},${selectedLoc.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 self-start sm:self-auto transition-colors font-medium"
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

          <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between pt-1 gap-2">
            <span className="font-mono">Koordinat GPS: {Number(selectedLoc.latitude || 0).toFixed(6)}, {Number(selectedLoc.longitude || 0).toFixed(6)}</span>
            <span className="text-amber-800 font-medium">Batas Geofence: Radius {selectedLoc.radiusMeters} Meter</span>
          </div>
        </div>

        {/* Right: Slot Configuration & Assigned Officers Preview */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Slot Detail Card */}
          <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider block">
                  {selectedLoc.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 truncate">{selectedLoc.name}</h3>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleEditClick(selectedLoc)}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Pos</span>
                </button>

                {onDeleteLocation && locations.length > 1 && (
                  <button
                    onClick={() => setLocationToDelete(selectedLoc)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors flex items-center gap-1"
                    title="Hapus Pos Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">Kategori Pos:</span>
                <span className="font-semibold text-slate-800">{selectedLoc.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Alamat Penugasan:</span>
                <span className="font-semibold text-slate-800">{selectedLoc.address}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Latitude GPS:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLoc.latitude}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Longitude GPS:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLoc.longitude}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Radius Geofence Maksimal:</span>
                <span className="font-mono font-bold text-amber-700 text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {selectedLoc.radiusMeters} Meter
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed italic bg-amber-50/40 p-2.5 rounded-xl border border-amber-100">
                {selectedLoc.description || 'Pengawasan ketertiban umum dan perlindungan masyarakat.'}
              </p>
            </div>
          </div>

          {/* Assigned Officers List in this Slot */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  Daftar Personel di Pos Ini ({getPersonnelCount(selectedLoc.id)} Anggota)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedLoc.code}
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
              {employees
                .filter(e => e.locationSlotId === selectedLoc.id)
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 block">{emp.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">NIP: {emp.nip} • {emp.role}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                      emp.regu === 'Harian' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {emp.regu}
                    </span>
                  </div>
                ))}
              
              {getPersonnelCount(selectedLoc.id) === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs">
                  Belum ada personel yang ditugaskan ke pos ini.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Edit Slot Location */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  Edit Pos {editingLocation.slotNumber}: {editingLocation.name}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Kode Pos: {editingLocation.code}
                </span>
              </div>
              <button
                onClick={() => setEditingLocation(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              
              {/* Google Maps Coordinates Importer */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    Ambil Koordinat dari Google Maps
                  </label>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>Buka Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                
                <p className="text-[11px] text-slate-600">
                  Cari pos di Google Maps, klik kanan titik lokasi lalu pilih <strong>Salin Koordinat</strong>, atau tempel tautan/link share:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={googleMapsInput}
                    onChange={(e) => setGoogleMapsInput(e.target.value)}
                    placeholder="Contoh: -6.1825, 106.8285 atau tempel link Maps"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleParseGoogleMaps(googleMapsInput)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shrink-0 shadow-xs"
                  >
                    Terapkan
                  </button>
                </div>

                {parseStatus && (
                  <div className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    parseStatus.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}>
                    {parseStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{parseStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Pos Name & Category */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nama Pos Lokasi Kerja</label>
                <input
                  type="text"
                  value={editingLocation.name}
                  onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Kategori Pos</label>
                <input
                  type="text"
                  value={editingLocation.category}
                  onChange={(e) => setEditingLocation({ ...editingLocation, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Alamat Penugasan</label>
                <textarea
                  rows={2}
                  value={editingLocation.address}
                  onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Direct Lat / Lng inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Latitude (Lintang)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingLocation.latitude}
                    onChange={(e) => setEditingLocation({ ...editingLocation, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Longitude (Bujur)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingLocation.longitude}
                    onChange={(e) => setEditingLocation({ ...editingLocation, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Geofence Slider & Presets */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-800">Radius Toleransi Geofence GPS:</label>
                  <span className="font-mono font-bold text-amber-700 text-sm bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
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
                  className="w-full accent-amber-600 cursor-pointer"
                />

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 10 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 10 
                        ? 'bg-amber-600 text-white border-amber-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'
                    }`}
                  >
                    10m (Sangat Ketat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 15 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 15 
                        ? 'bg-amber-600 text-white border-amber-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'
                    }`}
                  >
                    15m (Pintu Pos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 20 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 20 
                        ? 'bg-amber-600 text-white border-amber-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'
                    }`}
                  >
                    20m (Halaman Pos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 25 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 25 
                        ? 'bg-amber-600 text-white border-amber-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'
                    }`}
                  >
                    25m (Batas Gerbang)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 50 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 50 
                        ? 'bg-amber-600 text-white border-amber-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'
                    }`}
                  >
                    50m (Standar)
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 block leading-relaxed">
                  Pegawai di luar batas radius ini otomatis ditolak oleh sistem GPS anti-pemalsuan lokasi. Mode 10m - 25m memastikan pegawai tepat di pos dinas.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-600" />
                  Tambah Pos Lokasi Kerja Baru
                </h3>
                <span className="text-xs text-slate-500">
                  Pos ke-{(locations.length > 0 ? Math.max(...locations.map(l => l.slotNumber || l.id)) : 0) + 1} dalam sistem Satpol PP
                </span>
              </div>
              <button
                onClick={() => setIsAddingLocation(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              
              {/* Google Maps Coordinates Importer */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    Ambil Koordinat dari Google Maps
                  </label>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>Buka Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                
                <p className="text-[11px] text-slate-600">
                  Cari pos di Google Maps, klik kanan titik lokasi lalu pilih <strong>Salin Koordinat</strong>, atau tempel link Maps:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocMapsInput}
                    onChange={(e) => setNewLocMapsInput(e.target.value)}
                    placeholder="Contoh: -6.1825, 106.8285 atau tempel link Maps"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleParseGoogleMapsNew(newLocMapsInput)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shrink-0 shadow-xs"
                  >
                    Terapkan
                  </button>
                </div>

                {newLocParseStatus && (
                  <div className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    newLocParseStatus.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}>
                    {newLocParseStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{newLocParseStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Pos Name & Category */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nama Pos Lokasi Kerja</label>
                <input
                  type="text"
                  value={newLocationForm.name}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, name: e.target.value })}
                  placeholder="Contoh: Slot 13: Pos Kawasan Simpang Tiga"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={newLocationForm.code}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, code: e.target.value })}
                    placeholder="Contoh: POS-13-SIMPANG"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono uppercase focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Kategori Pos</label>
                  <input
                    type="text"
                    value={newLocationForm.category}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, category: e.target.value })}
                    placeholder="Contoh: Titik Simpul / Obvit"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Alamat Penugasan Lengkap</label>
                <textarea
                  rows={2}
                  value={newLocationForm.address}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, address: e.target.value })}
                  placeholder="Contoh: Jl. Protokol No. 45, Kecamatan..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Direct Lat / Lng inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Latitude (Lintang)</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocationForm.latitude}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Longitude (Bujur)</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocationForm.longitude}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Geofence Presets */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-800">Radius Toleransi Geofence GPS:</label>
                  <span className="font-mono font-bold text-amber-700 text-sm bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
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
                  className="w-full accent-amber-600 cursor-pointer"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[10, 15, 20, 25, 50].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewLocationForm({ ...newLocationForm, radiusMeters: r })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                        newLocationForm.radiusMeters === r 
                          ? 'bg-amber-600 text-white border-amber-600' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingLocation(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Pos Lokasi?</h3>
                <span className="text-xs text-rose-600 font-mono">{locationToDelete.code}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Apakah Anda yakin ingin menghapus <strong className="text-slate-900">{locationToDelete.name}</strong>?
              {getPersonnelCount(locationToDelete.id) > 0 && (
                <span className="block mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  Peringatan: Sebanyak <strong>{getPersonnelCount(locationToDelete.id)} personel</strong> yang saat ini bertugas di pos ini akan otomatis dialihkan ke Pos 1 (Mako Utama).
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLocationToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
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
