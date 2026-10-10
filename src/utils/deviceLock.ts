export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  resolution: string;
  generatedAt: string;
}

const STORAGE_KEY = 'sipraja_device_fingerprint_v2';

export function getOrCreateDeviceId(): DeviceInfo {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return JSON.parse(existing) as DeviceInfo;
    }
  } catch {
    // fallback
  }

  // Generate unique device signature
  const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  
  let os = 'Android / Mobile';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Device';
  else if (/Windows/i.test(ua)) os = 'Windows PC Lapangan';
  else if (/Mac/i.test(ua)) os = 'macOS Komando';
  else if (/Linux/i.test(ua)) os = 'Linux Terminal';

  let browser = 'Chrome Mobile';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari Mobile';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const deviceId = `DEV-POLPP-${randomHash}-${timestamp}`;

  const info: DeviceInfo = {
    deviceId,
    deviceName: `${os} (${browser})`,
    browser,
    os,
    resolution: screenRes,
    generatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    // ignore
  }

  return info;
}

export function forceSetDeviceId(newDeviceId: string, deviceName = "Perangkat Lain (Simulator)"): DeviceInfo {
  const info: DeviceInfo = {
    deviceId: newDeviceId,
    deviceName,
    browser: "Simulated Browser",
    os: "Simulated OS",
    resolution: "1080x2400",
    generatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  return info;
}

/**
 * Calculates distance between two GPS coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface AntiSpoofingResult {
  isValid: boolean;
  accuracy: number;
  flags: string[];
  securityScore: number; // 0 - 100
  details: string;
  isMockSuspected?: boolean;
}

export function validateAntiSpoofing(
  coords: { 
    latitude: number; 
    longitude: number; 
    accuracy?: number; 
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
  },
  targetLocation: { latitude: number; longitude: number; radiusMeters: number }
): AntiSpoofingResult {
  const flags: string[] = [];
  const accuracy = coords.accuracy || 15;
  let securityScore = 100;
  let isMockSuspected = false;

  // 1. Accuracy Check: Fake GPS apps or mock apps often inject exact round accuracy like 0m, 1m, or 5.0000m
  if (accuracy <= 1) {
    flags.push(`Akurasi 0m-1m terdeteksi konstan (Ciri khas emulator / Fake GPS Injection).`);
    securityScore -= 40;
    isMockSuspected = true;
  } else if (accuracy > 150) {
    flags.push(`Akurasi sinyal rendah (${Math.round(accuracy)}m), risiko interferensi BTS.`);
    securityScore -= 25;
  }

  // 2. Exact Integer / Suspicious Zero Altitude Check
  // Physical outdoor GPS almost always provides an altitude with variation, whereas mock GPS often passes null, 0.0, or static round numbers
  if (coords.altitude !== undefined && coords.altitude !== null) {
    if (coords.altitude === 0) {
      flags.push(`Elevasi altitude 0m konstan (Anomali sensor GNSS).`);
      securityScore -= 15;
    }
  }

  // 3. Coordinates within realistic territory (Indonesia)
  if (coords.latitude > 6.0 || coords.latitude < -11.0 || coords.longitude < 95.0 || coords.longitude > 141.0) {
    flags.push(`Koordinat di luar wilayah kedaulatan NKRI.`);
    securityScore -= 60;
    isMockSuspected = true;
  }

  // 4. Proximity to target location
  const distance = calculateDistanceMeters(
    coords.latitude,
    coords.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );

  const isWithinGeofence = distance <= targetLocation.radiusMeters;
  if (!isWithinGeofence) {
    flags.push(`Di luar geofence pos: jarak ${distance}m (Batas maksimal ${targetLocation.radiusMeters}m).`);
    securityScore -= 30;
  }

  return {
    isValid: flags.length === 0 || (isWithinGeofence && securityScore >= 70 && !isMockSuspected),
    accuracy: Math.round(accuracy),
    flags,
    securityScore: Math.max(0, securityScore),
    details: flags.length > 0 ? flags.join(" ") : "Integritas sinyal GPS valid & terverifikasi.",
    isMockSuspected
  };
}
