import { Employee, ScheduleType, ReguType } from '../types';

const FIRST_NAMES = [
  "Agus", "Bambang", "Dedi", "Eko", "Fajar", "Guntur", "Hendra", "Irfan", "Joko", "Kurniawan",
  "Lukman", "Miftah", "Nurhadi", "Oki", "Prasetyo", "Rahmat", "Suryono", "Tri", "Untung", "Wahyu",
  "Yudi", "Zainal", "Asep", "Bayu", "Cahyo", "Dimas", "Edi", "Farhan", "Gilang", "Hari",
  "Imam", "Jayadi", "Kusuma", "Luthfi", "Maulana", "Noval", "Panji", "Rian", "Sigit", "Teguh",
  "Umar", "Wawan", "Yusuf", "Ahmad", "Budi", "Danang", "Erwin", "Fauzi", "Gunawan", "Hadi"
];

const LAST_NAMES = [
  "Wijaya", "Setiawan", "Prasetyo", "Hidayat", "Saputra", "Wahyudi", "Kusuma", "Suryono", "Purnomo", "Susanto",
  "Subagyo", "Wibowo", "Nugroho", "Santoso", "Priyanto", "Utomo", "Kurniawan", "Sujatmiko", "Hartanto", "Gunawan",
  "Firmansyah", "Ramadhan", "Pradana", "Mahendra", "Syahputra", "Kurnia", "Alamsyah", "Hakim", "Riyadi", "Siregar"
];

const ROLES = [
  { role: "Komandan Pleton (Danton)", rank: "Penata Muda Tk.I (III/b)" },
  { role: "Komandan Regu (Danru)", rank: "Pengatur Tk.I (II/d)" },
  { role: "Wakil Komandan Regu (Wadanru)", rank: "Pengatur (II/c)" },
  { role: "Petugas Provost Penegak Disiplin", rank: "Pengatur Muda Tk.I (II/b)" },
  { role: "Petugas Tindak Internal (PTI)", rank: "Pengatur Muda Tk.I (II/b)" },
  { role: "Anggota Unit Reaksi Cepat (URC)", rank: "Pengatur Muda (II/a)" },
  { role: "Anggota Satgas Ketertiban Umum", rank: "Pengatur Muda (II/a)" },
  { role: "Anggota Regu Patroli Wilayah", rank: "Pengatur Muda (II/a)" },
  { role: "Penyidik Pegawai Negeri Sipil (PPNS)", rank: "Penata (III/c)" },
];

export function generate150SatpolPPEmployees(): Employee[] {
  const employees: Employee[] = [];
  
  // Leadership & Officer 1 for seamless instant testing (no bound device yet -> will lock on first login!)
  employees.push({
    id: "POLPP-001",
    nip: "19880415 201001 1 002",
    name: "Hendra Wijaya, S.STP",
    role: "Komandan Regu Operasional (Danru I)",
    rank: "Penata Muda (III/a)",
    regu: "Regu 1",
    scheduleType: "shift",
    locationSlotId: 1, // Slot 1: Mako Utama
    boundDeviceId: null, // Will automatically lock to user's device on first login!
    boundDeviceName: null,
    boundAt: null,
    phone: "0812-8829-1001",
    status: "active"
  });

  employees.push({
    id: "POLPP-002",
    nip: "19850912 200801 1 005",
    name: "Bambang Suryono, S.H.",
    role: "Komandan Pleton Pengendalian Massa (Danton)",
    rank: "Penata Muda Tk.I (III/b)",
    regu: "Regu 2",
    scheduleType: "shift",
    locationSlotId: 2, // Slot 2: Balai Kota
    boundDeviceId: "DEV-POLPP-KUNCI-SAMPLE-002",
    boundDeviceName: "Samsung Galaxy A54 (Dinas)",
    boundAt: "2026-09-01 07:15:00",
    phone: "0813-1122-3344",
    status: "active"
  });

  employees.push({
    id: "POLPP-003",
    nip: "19920120 201402 1 003",
    name: "Agus Prasetyo, A.Md.",
    role: "Staf Administrasi & Logistik Regu 1",
    rank: "Pengatur Tk.I (II/d)",
    regu: "Regu 1",
    scheduleType: "harian", // Regu 1 Personel Harian
    locationSlotId: 1, // Slot 1: Mako
    boundDeviceId: "DEV-POLPP-KUNCI-SAMPLE-003",
    boundDeviceName: "Xiaomi Redmi Note 12",
    boundAt: "2026-09-05 06:45:00",
    phone: "0815-7788-9900",
    status: "active"
  });

  for (let i = 4; i <= 150; i++) {
    const idNum = String(i).padStart(3, '0');
    const fIdx = (i * 7) % FIRST_NAMES.length;
    const lIdx = (i * 13) % LAST_NAMES.length;
    const roleObj = ROLES[i % ROLES.length];
    
    // Distribute evenly among 12 slots (1 to 12)
    const locationSlotId = ((i - 1) % 12) + 1;
    
    // Distribute regu: Regu 1, Regu 2, Regu 3, Regu 4, or Harian (Mako Komando)
    // Most personnel belong to Regu 1..4 (each Danru's jurisdiction), with a portion in Mako / Komando
    const isMako = (i % 12 === 0);
    let regu: ReguType = 'Regu 1';
    let sched: ScheduleType = 'shift';

    if (isMako) {
      regu = 'Harian';
      sched = 'harian';
    } else {
      const reguNum = ((i % 4) + 1);
      regu = `Regu ${reguNum}` as ReguType;
      // In each Regu 1..4: approx 28% are 'harian' (staf/logistik/administrasi regu), 72% are 'shift' (patroli/pos)
      sched = (i % 7 === 0 || i % 7 === 3) ? 'harian' : 'shift';
    }

    // Bound device distribution
    const isBound = i % 4 !== 0; // some bound, some null for first login testing
    const deviceId = isBound ? `DEV-POLPP-${String(100000 + i * 37).slice(-6)}-A${(i % 9) + 1}` : null;
    const deviceName = isBound 
      ? (i % 2 === 0 ? `Samsung Galaxy M${20 + (i % 30)}` : `Oppo Reno ${(i % 8) + 4} Dinas`)
      : null;

    const birthYear = 1980 + (i % 18);
    const birthMonth = String((i % 12) + 1).padStart(2, '0');
    const birthDay = String((i % 28) + 1).padStart(2, '0');
    const nip = `${birthYear}${birthMonth}${birthDay} ${2010 + (i % 12)}01 1 ${String(i).padStart(3, '0')}`;

    employees.push({
      id: `POLPP-${idNum}`,
      nip: nip,
      name: `${FIRST_NAMES[fIdx]} ${LAST_NAMES[lIdx]}`,
      role: roleObj.role,
      rank: roleObj.rank,
      regu: regu,
      scheduleType: sched,
      locationSlotId: locationSlotId,
      boundDeviceId: deviceId,
      boundDeviceName: deviceName,
      boundAt: isBound ? `2026-08-${String((i % 25) + 1).padStart(2, '0')} 07:00:00` : null,
      phone: `081${(i % 8) + 1}-${String(2000 + i)}-${String(4000 + i * 2)}`,
      status: "active"
    });
  }

  return employees;
}

export const INITIAL_EMPLOYEES: Employee[] = generate150SatpolPPEmployees();
