import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { WorkLocation } from '../types';
import { Layers, Crosshair, Sparkles } from 'lucide-react';

export type MapViewType = 'satellite' | 'street';

interface MapComponentProps {
  locations: WorkLocation[];
  activeLocationId?: number;
  userCoords?: { latitude: number; longitude: number; accuracy?: number } | null;
  height?: string;
  zoom?: number;
  interactive?: boolean;
  defaultMapType?: MapViewType;
  onSelectLocation?: (location: WorkLocation) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  locations,
  activeLocationId,
  userCoords,
  height = "380px",
  zoom = 16,
  interactive = true,
  defaultMapType = 'satellite',
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  // Map type state: DEFAULT IS SATELLITE (Tampilan Peta Satelit)
  const [mapType, setMapType] = useState<MapViewType>(defaultMapType);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const activeLoc = locations.find(l => l.id === activeLocationId) || locations[0];
      const initialCenter: [number, number] = userCoords
        ? [userCoords.latitude, userCoords.longitude]
        : activeLoc
        ? [activeLoc.latitude, activeLoc.longitude]
        : [-6.1825, 106.8285];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: zoom,
        zoomControl: false, // Custom placed zoom control
        dragging: interactive,
        scrollWheelZoom: interactive,
        attributionControl: false,
      });

      // Add zoom control at bottomright so top-right is clean for satellite switcher
      if (interactive) {
        L.control.zoom({ position: 'bottomright' }).addTo(map);
      }

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer based on mapType (Satellite vs Street)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
      currentTileLayerRef.current = null;
    }

    let tileLayer: L.TileLayer;
    if (mapType === 'satellite') {
      // Google Hybrid Satellite Imagery with street & landmark overlays in Indonesian
      tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '© Google Maps Citra Satelit',
      });
    } else {
      // Clean CartoDB Voyager street map
      tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '© CartoDB Voyager',
      });
    }

    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;
  }, [mapType]);

  // Update Layers (Work Locations, Geofence Circles, User GPS Marker)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Render Work Locations & Geofence Circles
    locations.forEach((loc) => {
      const isSelected = loc.id === activeLocationId;
      const isPostActive = loc.isActive;

      // Geofence Circle with high-contrast styling for satellite imagery
      const circle = L.circle([loc.latitude, loc.longitude], {
        radius: loc.radiusMeters,
        color: isSelected ? '#fbbf24' : isPostActive ? '#38bdf8' : '#94a3b8',
        fillColor: isSelected ? '#f59e0b' : isPostActive ? '#0284c7' : '#64748b',
        fillOpacity: isSelected ? 0.35 : 0.18,
        weight: isSelected ? 3 : 2,
        dashArray: isSelected ? undefined : '5, 5',
      });

      circle.bindTooltip(
        `<div class="p-1 font-sans bg-slate-900 text-white rounded-md border border-slate-700 shadow-xl">
          <div class="font-bold text-xs text-amber-400">${loc.name}</div>
          <div class="text-[11px] text-slate-300 mt-0.5">Radius Geofence: <strong class="text-white">${loc.radiusMeters} meter</strong></div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">Koordinat: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</div>
        </div>`,
        { permanent: false, direction: 'top', className: 'custom-leaflet-tooltip' }
      );

      layerGroup.addLayer(circle);

      // Post Marker Pin with high-contrast ring for satellite backdrop
      const pinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-8 h-8 rounded-full ${
              isSelected 
                ? 'bg-amber-500 ring-4 ring-amber-300 ring-offset-2 ring-offset-slate-950 scale-110' 
                : 'bg-slate-900 border-2 border-white ring-2 ring-amber-400/90 shadow-2xl'
            } shadow-2xl flex items-center justify-center text-white transition-transform group-hover:scale-115">
              <span class="text-[11px] font-mono font-black">${loc.slotNumber}</span>
            </div>
            <div class="absolute -bottom-6 whitespace-nowrap bg-slate-950/95 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded shadow-xl pointer-events-none">
              Slot ${loc.slotNumber}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: pinIcon });
      marker.on('click', () => {
        if (onSelectLocation) onSelectLocation(loc);
      });

      layerGroup.addLayer(marker);
    });

    // Render User Live Position (Officer)
    if (userCoords) {
      const userAccuracy = userCoords.accuracy || 15;

      // Accuracy Circle
      const accCircle = L.circle([userCoords.latitude, userCoords.longitude], {
        radius: userAccuracy,
        color: '#10b981',
        fillColor: '#34d399',
        fillOpacity: 0.25,
        weight: 1.5,
      });
      layerGroup.addLayer(accCircle);

      // Officer Pulse Radar Pin
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-10 h-10 rounded-full bg-emerald-400/40 animate-ping"></span>
            <span class="absolute w-6 h-6 rounded-full bg-emerald-500/30"></span>
            <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-300 shadow-2xl flex items-center justify-center text-white">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 2v3m0 14v3m10-10h-3M5 12H2"></path>
              </svg>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const userMarker = L.marker([userCoords.latitude, userCoords.longitude], {
        icon: userIcon,
        zIndexOffset: 1000,
      });

      userMarker.bindTooltip(
        `<div class="font-sans text-xs p-1 bg-slate-900 text-white rounded border border-emerald-500 shadow-xl">
          <div class="font-bold text-emerald-400 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Posisi Anda (GPS Aktif)
          </div>
          <div class="text-[10px] text-slate-300">Akurasi GPS: ±${Math.round(userAccuracy)} meter</div>
        </div>`,
        { permanent: true, direction: 'bottom', offset: [0, 10] }
      );

      layerGroup.addLayer(userMarker);
    }

    // Auto fit or center
    const activeLoc = locations.find(l => l.id === activeLocationId);
    if (userCoords && activeLoc) {
      const bounds = L.latLngBounds([
        [userCoords.latitude, userCoords.longitude],
        [activeLoc.latitude, activeLoc.longitude]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    } else if (activeLoc) {
      map.panTo([activeLoc.latitude, activeLoc.longitude]);
    }
  }, [locations, activeLocationId, userCoords, onSelectLocation]);

  // Recenter handler
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeLoc = locations.find(l => l.id === activeLocationId) || locations[0];
    if (userCoords && activeLoc) {
      const bounds = L.latLngBounds([
        [userCoords.latitude, userCoords.longitude],
        [activeLoc.latitude, activeLoc.longitude]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    } else if (userCoords) {
      map.setView([userCoords.latitude, userCoords.longitude], 17);
    } else if (activeLoc) {
      map.setView([activeLoc.latitude, activeLoc.longitude], 17);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950">
      
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="relative z-0"
      />

      {/* Consolidated Non-Overlapping Floating Controls (Top Right) */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-2xl">
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mapType === 'satellite'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Tampilkan peta menggunakan citra satelit"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Satelit</span>
        </button>

        <button
          type="button"
          onClick={() => setMapType('street')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mapType === 'street'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Tampilkan peta jalan standar"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Peta Jalan</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={handleRecenter}
          className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
          title="Pusatkan peta ke posisi pos dan GPS"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
