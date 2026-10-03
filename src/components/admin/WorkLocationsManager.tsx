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
  Compass, 
  Copy, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface WorkLocationsManagerProps {
  locations: WorkLocation[];
  employees: Employee[];
  onUpdateLocation: (location: WorkLocation) => void;
  onOpenPrintMenu?: (menu: 'locations') => void;
}

export const WorkLocationsManager: React.FC<WorkLocationsManagerProps> = ({
  locations,
  employees,
  onUpdateLocation,
  onOpenPrintMenu,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<number>(1);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [googleMapsInput, setGoogleMapsInput] = useState<string>('');
  const [parseStatus, setParseStatus] = useState<{ success: boolean; message: string } | null>(null);

  const selectedLoc = locations.find(l => l.id === selectedLocationId) || locations[0];

  // Headcount per slot
  const getPersonnelCount = (slotId: number) => {
    return employees.filter(e => e.locationSlotId === slotId).length;
  };

  const handleEditClick = (loc: WorkLocation) => {
    setEditingLocation({ ...loc });
    setGoogleMapsInput(`${loc.latitude}, ${loc.longitude}`);
    setParseStatus(null);
  };

  // Google Maps Coordinates Parser
  // Handles:
  // 1. "-6.182500, 106.828500" or "-6.1825 106.8285"
  // 2. Google Maps URL: https://www.google.com/maps/@-6.1825,106.8285,17z
  // 3. Google Maps Share: https://maps.google.com/?q=-6.1825,106.8285
  // 4. Place URL: https://www.google.com/maps/place/.../@-6.1825,106.8285,...
  const handleParseGoogleMaps = (rawText: string) => {
    const text = rawText.trim();
    if (!text) {
      setParseStatus({ success: false, message: 'Harap masukkan koordinat atau tautan Google Maps.' });
      return;
    }

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
      if (editingLocation) {
        setEditingLocation({
          ...editingLocation,
          latitude: lat,
          longitude: lng,
        });
      }
      setParseStatus({
        success: true,
        message: `Koordinat Google Maps Berhasil Diterapkan: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`
      });
    } else {
      setParseStatus({
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

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-500" />
            Manajemen 8 Slot Pos Lokasi Kerja Satpol PP
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi koordinat GPS dari Google Maps, radius geofence toleransi, dan kuota penempatan 150 personel
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenPrintMenu && (
            <button
              onClick={() => onOpenPrintMenu('locations')}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Daftar 8 Pos</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-amber-400">
            <Shield className="w-4 h-4" />
            <span>8 Slot Terintegrasi GPS & Geofence Sedekat Mungkin</span>
          </div>
        </div>
      </div>

      {/* Grid: 8 Slots Cards */}
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
                    0{loc.slotNumber}
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
                <span>Peta Satelit Slot {selectedLoc.slotNumber}: {selectedLoc.name}</span>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  {selectedLoc.code}
                </span>
                <h3 className="text-sm font-bold text-white">{selectedLoc.name}</h3>
              </div>
              <button
                onClick={() => handleEditClick(selectedLoc)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Koordinat & Slot
              </button>
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
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {employees
                .filter(e => e.locationSlotId === selectedLoc.id)
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{emp.role}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {emp.scheduleType === 'harian' ? 'Harian' : 'Shift'}
                    </span>
                  </div>
                ))}
            </div>
          </div>

        </div>

      </div>

      {/* Edit Slot Modal with Google Maps Coordinates Input */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Slot {editingLocation.slotNumber}: {editingLocation.name}
                </h3>
                <p className="text-xs text-slate-400">Pengaturan Titik Koordinat Google Maps & Geofence</p>
              </div>
              <button
                onClick={() => setEditingLocation(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              
              {/* Google Maps Coordinates Input Box */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/30 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Compass className="w-4 h-4" />
                    Input Koordinat Google Maps
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${editingLocation.latitude},${editingLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    Buka Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tempel koordinat dari Google Maps (contoh: <code className="text-amber-300 font-mono">-6.1825, 106.8285</code>) atau tautan URL Google Maps lokasi pos:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="-6.182500, 106.828500 atau tautan maps..."
                    value={googleMapsInput}
                    onChange={(e) => setGoogleMapsInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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

              {/* Geofence Slider & Presets Sedekat Mungkin */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-slate-200 font-bold block">Radius Geofence Kehadiran</label>
                    <span className="text-[10px] text-amber-400 font-medium">Mode Toleransi Sedekat Mungkin</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="5"
                      max="150"
                      value={editingLocation.radiusMeters}
                      onChange={(e) => setEditingLocation({ ...editingLocation, radiusMeters: Math.max(5, Number(e.target.value)) })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500 text-xs"
                    />
                    <span className="text-xs text-slate-400 font-medium">Meter</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="5"
                  max="150"
                  step="1"
                  value={editingLocation.radiusMeters}
                  onChange={(e) => setEditingLocation({ ...editingLocation, radiusMeters: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                {/* Quick Presets for Tight Radius */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center mr-1">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() => setEditingLocation({ ...editingLocation, radiusMeters: 10 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      editingLocation.radiusMeters === 10
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    10m (Super Ketat)
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
                    15m (Ketat Pos)
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
                  Simpan Perubahan Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
