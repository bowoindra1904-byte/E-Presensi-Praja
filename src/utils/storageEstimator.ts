/**
 * Utilitas untuk mengestimasi pemakaian kapasitas penyimpanan data sistem (Cache Browser & Database)
 */

export interface StorageStats {
  usedBytes: number;
  usedFormatted: string;
  maxBytes: number;
  maxFormatted: string;
  percentage: number;
  firestoreQuotaPercent: number;
  attendanceCount: number;
  employeeCount: number;
  locationCount: number;
  healthStatus: 'optimal' | 'warning' | 'critical';
}

// Batas alokasi cache penyimpanan browser aman standar (10 MB)
const STANDARD_BROWSER_CACHE_LIMIT = 10 * 1024 * 1024;
// Kuota Cloud Firestore Gratis (1 GB = 1024 MB)
const CLOUD_FIRESTORE_LIMIT = 1024 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function calculateStorageStats(
  attendanceCount = 0,
  employeeCount = 0,
  locationCount = 0
): StorageStats {
  let usedBytes = 0;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          // String JS di memori/localStorage menggunakan 2 byte per karakter (UTF-16)
          usedBytes += (key.length + val.length) * 2;
        }
      }
    }
  } catch {
    // Fallback jika akses localStorage dibatasi
    usedBytes = attendanceCount * 25000 + employeeCount * 1200 + locationCount * 800;
  }

  // Jika data lokal masih sangat minim, berikan estimasi proporsional
  if (usedBytes === 0 && (attendanceCount > 0 || employeeCount > 0)) {
    usedBytes = attendanceCount * 25000 + employeeCount * 1200 + locationCount * 800;
  }

  const percentage = Math.min(100, Math.max(0.1, parseFloat(((usedBytes / STANDARD_BROWSER_CACHE_LIMIT) * 100).toFixed(1))));
  const firestoreQuotaPercent = parseFloat(((usedBytes / CLOUD_FIRESTORE_LIMIT) * 100).toFixed(3));

  let healthStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
  if (percentage >= 85) {
    healthStatus = 'critical';
  } else if (percentage >= 65) {
    healthStatus = 'warning';
  }

  return {
    usedBytes,
    usedFormatted: formatBytes(usedBytes),
    maxBytes: STANDARD_BROWSER_CACHE_LIMIT,
    maxFormatted: formatBytes(STANDARD_BROWSER_CACHE_LIMIT),
    percentage,
    firestoreQuotaPercent,
    attendanceCount,
    employeeCount,
    locationCount,
    healthStatus,
  };
}
