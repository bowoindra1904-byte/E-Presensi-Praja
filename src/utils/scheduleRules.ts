import { ScheduleType, TimeEvaluation } from '../types';

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export interface EvaluatedTime {
  date: Date;
  dayIndex: number; // 0=Sunday, 5=Friday, etc.
  dayName: string;
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
  timeString: string;
}

export function parseDateToEvaluatedTime(date: Date): EvaluatedTime {
  const dayIndex = date.getDay();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const totalMinutes = hours * 60 + minutes;
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  return {
    date,
    dayIndex,
    dayName: DAY_NAMES[dayIndex],
    hours,
    minutes,
    seconds,
    totalMinutes,
    timeString
  };
}

export function evaluateAttendanceTime(
  scheduleType: ScheduleType,
  currentDate: Date = new Date()
): TimeEvaluation {
  const ev = parseDateToEvaluatedTime(currentDate);
  const m = ev.totalMinutes;
  const isFriday = ev.dayIndex === 5;
  const isWeekend = ev.dayIndex === 0 || ev.dayIndex === 6;

  if (scheduleType === 'shift') {
    // Tipe Shift Pol PP: 2 rotasi (Pagi 08.00-20.00 WIB & Malam 20.00-08.00 WIB)
    // Ditentukan oleh siklus waktu aktif:
    // Jika antara 07.30 s.d 19.29 -> Siklus Shift Pagi
    // Jika antara 19.30 s.d 07.29 -> Siklus Shift Malam
    const isMorningCycle = m >= (7 * 60 + 30) && m < (19 * 60 + 30);

    if (isMorningCycle) {
      // Shift Pagi (08.00 - 20.00 WIB)
      // Buka 30 menit sebelum masuk (07.30 WIB = 450 min)
      // Tepat waktu <= 08.00 WIB (480 min), Terlambat > 08.00 WIB
      // Pulang hanya bisa absen tepat pada jam pulangnya (>= 20.00 WIB)
      const openCheckIn = 7 * 60 + 30; // 07:30 (450)
      const officialIn = 8 * 60;       // 08:00 (480)
      const officialOut = 20 * 60;     // 20:00 (1200)

      const canCheckIn = m >= openCheckIn && m < officialOut;
      let checkInReason = "";
      if (m < openCheckIn) {
        checkInReason = `Belum waktu absen. Shift Pagi dibuka 30 menit sebelum dinas, yaitu pukul 07.30 WIB (Saat ini ${ev.timeString} WIB).`;
      } else if (m >= officialOut) {
        checkInReason = `Jam dinas Shift Pagi telah berakhir pada 20.00 WIB.`;
      } else {
        checkInReason = m > officialIn 
          ? `Absen masuk terbuka (Status: Terlambat, melewati batas 08.00 WIB).` 
          : `Absen masuk terbuka (Status: Tepat Waktu).`;
      }

      const canCheckOut = m >= officialOut;
      let checkOutReason = "";
      if (m < officialOut) {
        checkOutReason = `Belum waktu pulang! Sesuai aturan, absensi pulang Shift Pagi hanya bisa dilakukan tepat pukul 20.00 WIB atau setelahnya.`;
      } else {
        checkOutReason = `Absen pulang telah dibuka sejak pukul 20.00 WIB. Silakan tap absen pulang.`;
      }

      return {
        canCheckIn,
        canCheckOut,
        checkInReason,
        checkOutReason,
        scheduleLabel: "Shift Operasional (Siklus Pagi: 08.00 - 20.00 WIB)",
        workHoursLabel: "08.00 - 20.00 WIB",
        checkInWindowLabel: "Mulai 07.30 WIB (30 mnt sebelum masuk)",
        checkOutWindowLabel: "Tepat 20.00 WIB ke atas",
        isLate: m > officialIn,
        currentDayName: ev.dayName,
        shiftCycleName: 'Pagi'
      };
    } else {
      // Shift Malam (20.00 - 08.00 WIB hari berikutnya)
      // Buka 30 menit sebelum masuk (19.30 WIB = 1170 min)
      // Tepat waktu <= 20.00 WIB (1200 min), Terlambat > 20.00 WIB
      // Pulang hanya bisa absen tepat pada jam pulangnya (>= 08.00 WIB esok hari)
      const openCheckIn = 19 * 60 + 30; // 19:30 (1170)
      const officialIn = 20 * 60;        // 20:00 (1200)
      const officialOutMorning = 8 * 60; // 08:00 (480)

      const canCheckIn = m >= openCheckIn || m < 5 * 60;
      let checkInReason = "";
      if (m < openCheckIn && m >= 5 * 60) {
        checkInReason = `Belum waktu absen. Shift Malam dibuka 30 menit sebelum dinas, yaitu pukul 19.30 WIB (Saat ini ${ev.timeString} WIB).`;
      } else {
        const isLate = (m > officialIn && m <= 23 * 60 + 59) || (m < 5 * 60);
        checkInReason = isLate 
          ? `Absen masuk terbuka (Status: Terlambat, melewati batas 20.00 WIB).` 
          : `Absen masuk terbuka (Status: Tepat Waktu).`;
      }

      // Check-out is allowed at or after 08:00 WIB in the morning
      const canCheckOut = (m >= officialOutMorning && m < 15 * 60);
      let checkOutReason = "";
      if (!canCheckOut) {
        checkOutReason = `Belum waktu pulang! Sesuai aturan, absensi pulang Shift Malam hanya bisa dilakukan tepat pukul 08.00 WIB keesokan harinya.`;
      } else {
        checkOutReason = `Absen pulang Shift Malam terbuka (Telah mencapai pukul 08.00 WIB).`;
      }

      const isLate = (m > officialIn && m <= 23 * 60 + 59) || (m < 5 * 60);

      return {
        canCheckIn,
        canCheckOut,
        checkInReason,
        checkOutReason,
        scheduleLabel: "Shift Operasional (Siklus Malam: 20.00 - 08.00 WIB)",
        workHoursLabel: "20.00 - 08.00 WIB (H+1)",
        checkInWindowLabel: "Mulai 19.30 WIB (30 mnt sebelum masuk)",
        checkOutWindowLabel: "Tepat 08.00 WIB (Pagi hari berikutnya)",
        isLate,
        currentDayName: ev.dayName,
        shiftCycleName: 'Malam'
      };
    }
  }

  // scheduleType === 'harian'
  // Senin - Kamis: 07.30 - 16.00 WIB (absen masuk buka 07.00 WIB, pulang >= 16.00)
  // Jumat: 07.00 - 16.30 WIB (absen masuk buka 06.30 WIB, pulang >= 16.30)
  if (isFriday) {
    const openCheckIn = 6 * 60 + 30; // 06:30 (390)
    const officialIn = 7 * 60;       // 07:00 (420)
    const officialOut = 16 * 60 + 30; // 16:30 (990)

    const canCheckIn = m >= openCheckIn && m < officialOut;
    let checkInReason = "";
    if (m < openCheckIn) {
      checkInReason = `Hari Jumat: Absen masuk baru dibuka pukul 06.30 WIB (30 menit sebelum dinas 07.00 WIB). Saat ini ${ev.timeString} WIB.`;
    } else if (m >= officialOut) {
      checkInReason = `Jam dinas hari Jumat telah selesai pada pukul 16.30 WIB.`;
    } else {
      checkInReason = m > officialIn
        ? `Absen masuk terbuka (Status: Terlambat, melewati batas 07.00 WIB).`
        : `Absen masuk terbuka (Status: Tepat Waktu).`;
    }

    const canCheckOut = m >= officialOut;
    let checkOutReason = "";
    if (m < officialOut) {
      checkOutReason = `Belum waktu pulang! Khusus hari Jumat, absensi pulang baru bisa dilakukan tepat pukul 16.30 WIB atau setelahnya.`;
    } else {
      checkOutReason = `Absen pulang telah dibuka sejak pukul 16.30 WIB. Silakan tap absen pulang.`;
    }

    return {
      canCheckIn,
      canCheckOut,
      checkInReason,
      checkOutReason,
      scheduleLabel: "Harian Khusus Jumat (07.00 - 16.30 WIB)",
      workHoursLabel: "07.00 - 16.30 WIB",
      checkInWindowLabel: "Mulai 06.30 WIB (30 mnt sebelum masuk)",
      checkOutWindowLabel: "Tepat 16.30 WIB ke atas",
      isLate: m > officialIn,
      currentDayName: ev.dayName
    };
  }

  // Senin - Kamis
  const openCheckIn = 7 * 60;        // 07:00 (420)
  const officialIn = 7 * 60 + 30;   // 07:30 (450)
  const officialOut = 16 * 60;      // 16:00 (960)

  const canCheckIn = m >= openCheckIn && m < officialOut;
  let checkInReason = "";
  if (isWeekend) {
    checkInReason = `Hari ini ${ev.dayName} (Akhir Pekan/Libur Reguler Harian).`;
  } else if (m < openCheckIn) {
    checkInReason = `Hari ${ev.dayName}: Absen masuk baru dibuka pukul 07.00 WIB (30 menit sebelum masuk 07.30 WIB). Saat ini ${ev.timeString} WIB.`;
  } else if (m >= officialOut) {
    checkInReason = `Jam dinas harian telah berakhir pada pukul 16.00 WIB.`;
  } else {
    checkInReason = m > officialIn
      ? `Absen masuk terbuka (Status: Terlambat, melewati batas 07.30 WIB).`
      : `Absen masuk terbuka (Status: Tepat Waktu).`;
  }

  const canCheckOut = m >= officialOut;
  let checkOutReason = "";
  if (m < officialOut) {
    checkOutReason = `Belum waktu pulang! Sesuai aturan, absensi pulang hanya bisa dilakukan tepat pukul 16.00 WIB atau setelahnya.`;
  } else {
    checkOutReason = `Absen pulang telah dibuka sejak pukul 16.00 WIB. Silakan tap absen pulang.`;
  }

  return {
    canCheckIn: !isWeekend && canCheckIn,
    canCheckOut: !isWeekend && canCheckOut,
    checkInReason,
    checkOutReason,
    scheduleLabel: "Harian Senin - Kamis (07.30 - 16.00 WIB)",
    workHoursLabel: "07.30 - 16.00 WIB",
    checkInWindowLabel: "Mulai 07.00 WIB (30 mnt sebelum masuk)",
    checkOutWindowLabel: "Tepat 16.00 WIB ke atas",
    isLate: m > officialIn,
    currentDayName: ev.dayName
  };
}

export function formatScheduleBadge(type: ScheduleType): { label: string; bg: string; text: string } {
  switch (type) {
    case 'shift':
      return { 
        label: 'Shift (12 Jam)', 
        bg: 'bg-amber-500/15 border-amber-500/30', 
        text: 'text-amber-400' 
      };
    case 'harian':
      return { 
        label: 'Harian (Kantor/Dinas)', 
        bg: 'bg-emerald-500/15 border-emerald-500/30', 
        text: 'text-emerald-400' 
      };
  }
}
