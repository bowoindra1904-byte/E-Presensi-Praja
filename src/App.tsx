/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Employee, 
  WorkLocation, 
  AttendanceRecord, 
  SecurityLog,
  NotificationItem,
  LeaveRequest
} from './types';
import { INITIAL_WORK_LOCATIONS } from './data/initialLocations';
import { INITIAL_EMPLOYEES } from './data/initialEmployees';
import { 
  generateInitialAttendanceRecords, 
  generateInitialSecurityLogs,
  generateInitialNotifications,
  generateInitialLeaveRequests
} from './data/initialAttendance';
import { Header, AdminTabType } from './components/Header';
import { EmployeeView } from './components/EmployeeView';
import { LoginPortal } from './components/LoginPortal';
import { ToastNotificationOverlay } from './components/NotificationCenter';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { WorkLocationsManager } from './components/admin/WorkLocationsManager';
import { EmployeeManager } from './components/admin/EmployeeManager';
import { AdminLeaveApprovals } from './components/admin/AdminLeaveApprovals';
import { MonthlyReportView } from './components/admin/MonthlyReportView';
import { SecurityAuditLog } from './components/admin/SecurityAuditLog';
import { TimeSimulatorModal } from './components/TimeSimulatorModal';
import { AdminPinModal } from './components/admin/AdminPinModal';
import { PrintReportModal, PrintMenuType } from './components/admin/PrintReportModal';
import { OperationalGuideModal } from './components/OperationalGuideModal';
import { Shield, Sparkles, FileText, Printer, KeyRound, Cloud } from 'lucide-react';
import { testFirestoreConnection } from './services/firebase';
import { getOrCreateDeviceId } from './utils/deviceLock';
import {
  subscribeEmployees,
  subscribeLocations,
  subscribeAttendance,
  subscribeSecurityLogs,
  subscribeAdminPin,
  subscribeLeaveRequests,
  syncSaveEmployee,
  syncDeleteEmployee,
  syncSaveLocation,
  syncDeleteLocation,
  syncSaveAttendance,
  syncSaveSecurityLog,
  syncSaveAdminPin,
  syncSaveLeaveRequest,
  seedInitialEmployees,
  syncArchiveAndCleanupAttendance
} from './services/firestoreSync';

const STORAGE_KEYS = {
  EMPLOYEES: 'sipraja_employees_v2',
  LOCATIONS: 'sipraja_locations_v2',
  ATTENDANCE: 'sipraja_attendance_v2',
  SECURITY: 'sipraja_security_logs_v2',
  NOTIFICATIONS: 'sipraja_notifications_v2',
  ACTIVE_OFFICER: 'sipraja_active_officer_v2',
  CURRENT_ROLE: 'sipraja_current_role_v2',
  IS_LOGGED_IN: 'sipraja_is_logged_in_v2',
  ADMIN_PIN: 'sipraja_admin_pin_v2',
  LEAVE_REQUESTS: 'sipraja_leave_requests_v2',
};

export default function App() {
  // 1. State: 150 Employees
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_EMPLOYEES;
  });

  // 2. State: Work Location Slots (Dinamis sesuai inputan/kelolaan admin)
  const [locations, setLocations] = useState<WorkLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      if (saved) {
        const parsed = JSON.parse(saved) as WorkLocation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (a.slotNumber || a.id) - (b.slotNumber || b.id));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_WORK_LOCATIONS;
  });

  // 3. State: Attendance Records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return generateInitialAttendanceRecords();
  });

  // 4. State: Security Logs
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SECURITY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return generateInitialSecurityLogs();
  });

  // 5. State: Real-Time Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return generateInitialNotifications();
  });

  // 5b. State: Izin & Sakit (Leave Requests)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEAVE_REQUESTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return generateInitialLeaveRequests();
  });

  // Active floating toasts for immediate popup
  const [toasts, setToasts] = useState<NotificationItem[]>([]);

  // 6. Active Selected Officer
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_OFFICER);
      if (saved && INITIAL_EMPLOYEES.some(e => e.id === saved)) return saved;
    } catch {
      // ignore
    }
    return 'POLPP-001';
  });

  // 7. Role: 'pegawai' or 'admin'
  const [currentRole, setCurrentRole] = useState<'pegawai' | 'admin'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE);
      if (saved === 'admin' || saved === 'pegawai') return saved;
    } catch {
      // ignore
    }
    return 'pegawai';
  });

  // 8. Login status (Must default to false so any new device lands on LoginPortal)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return false; // Perangkat baru wajib login terlebih dahulu
  });

  // 9. Active Admin Sub-tab
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabType>('monitoring');

  // 10. Simulated Time (Optional override for schedule validation testing)
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const [isTimeSimulatorOpen, setIsTimeSimulatorOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  // 11. Admin Security PIN (Can be customized by Admin)
  const [adminPin, setAdminPin] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_PIN);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return '123456';
  });

  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [printDefaultMenu, setPrintDefaultMenu] = useState<PrintMenuType>('daily');

  // Ref to track if reminder was already dispatched today
  const reminderSentRef = useRef<boolean>(false);

  // State for Cloud Connection Status
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    // 1. Test connection
    testFirestoreConnection().then(connected => {
      setIsCloudConnected(connected);
    });

    // 2. Subscribe to Employees (Live multi-device sync)
    const unsubEmployees = subscribeEmployees((syncedEmployees) => {
      setEmployees(syncedEmployees);
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(syncedEmployees));
      } catch {}
    });

    // 3. Subscribe to 8 Pos Locations
    const unsubLocations = subscribeLocations((syncedLocations) => {
      setLocations(syncedLocations);
      try {
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(syncedLocations));
      } catch {}
    });

    // 4. Subscribe to Attendance Records (Live check-in & check-out)
    const unsubAttendance = subscribeAttendance((syncedAttendance) => {
      setAttendanceRecords(syncedAttendance);
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(syncedAttendance));
      } catch {}
    });

    // 5. Subscribe to Security Logs (Live device-lock violation & spoof alerts)
    const unsubSecurity = subscribeSecurityLogs((syncedLogs) => {
      setSecurityLogs(syncedLogs);
      try {
        localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(syncedLogs));
      } catch {}
    });

    // 6. Subscribe to Admin PIN
    const unsubPin = subscribeAdminPin((syncedPin) => {
      setAdminPin(syncedPin);
      try {
        localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, syncedPin);
      } catch {}
    });

    // 7. Subscribe to Leave Requests (Izin & Sakit)
    const unsubLeaves = subscribeLeaveRequests((syncedLeaves) => {
      if (syncedLeaves) {
        setLeaveRequests(syncedLeaves);
        try {
          localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(syncedLeaves));
        } catch {}
      }
    });

    return () => {
      unsubEmployees();
      unsubLocations();
      unsubAttendance();
      unsubSecurity();
      unsubPin();
      unsubLeaves();
    };
  }, []);

  // Clock Ticker (Runs every second)
  useEffect(() => {
    const timer = setInterval(() => {
      if (simulatedTime) {
        setSimulatedTime(prev => prev ? new Date(prev.getTime() + 1000) : null);
      } else {
        setCurrentDateTime(new Date());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [simulatedTime]);

  const effectiveCurrentDate = simulatedTime || currentDateTime;
  const currentTimeString = effectiveCurrentDate.toLocaleTimeString('id-ID', { hour12: false });

  // Automatic Check-out Reminder Check for Employee
  useEffect(() => {
    const hours = effectiveCurrentDate.getHours();
    const minutes = effectiveCurrentDate.getMinutes();

    // Trigger reminder at 16:00 (Harian) or 20:00 (Shift Pagi)
    const isClosingTime = (hours === 16 && minutes >= 0 && minutes <= 5) || (hours === 20 && minutes >= 0 && minutes <= 5);

    if (isClosingTime && !reminderSentRef.current) {
      reminderSentRef.current = true;
      const reminderNotif: NotificationItem = {
        id: `REMINDER-OUT-${Date.now()}`,
        targetRole: 'employee',
        type: 'checkout_reminder',
        title: 'Pengingat Waktu Pulang Dinas',
        message: `Jam dinas resmi telah berakhir pada pukul ${hours === 16 ? '16.00' : '20.00'} WIB. Silakan lakukan tap absen pulang di pos tugas Anda.`,
        timestamp: `${currentTimeString} WIB`,
        read: false
      };
      handleAddNotification(reminderNotif);
    }
  }, [effectiveCurrentDate, currentTimeString]);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    } catch {
      // ignore
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    } catch {
      // ignore
    }
  }, [locations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
    } catch {
      // ignore
    }
  }, [attendanceRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(securityLogs));
    } catch {
      // ignore
    }
  }, [securityLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(leaveRequests));
    } catch {
      // ignore
    }
  }, [leaveRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_OFFICER, activeEmployeeId);
      localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, currentRole);
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, JSON.stringify(isLoggedIn));
    } catch {
      // ignore
    }
  }, [activeEmployeeId, currentRole, isLoggedIn]);

  // Real-time device lock enforcement:
  // If an officer is in 'pegawai' mode, ensure their boundDeviceId strictly matches the current physical device fingerprint.
  // If their account was locked to another phone, immediately revoke access and return to LoginPortal with security alert.
  useEffect(() => {
    if (isLoggedIn && currentRole === 'pegawai') {
      const currentDev = getOrCreateDeviceId();
      const currentEmp = employees.find(e => e.id === activeEmployeeId);
      if (currentEmp && currentEmp.boundDeviceId && currentEmp.boundDeviceId !== currentDev.deviceId) {
        setIsLoggedIn(false);
        try {
          localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false');
        } catch {}

        const evictLog: SecurityLog = {
          id: `SEC-EVICT-${Date.now()}`,
          timestamp: `Hari Ini, ${currentTimeString} WIB`,
          employeeId: currentEmp.id,
          employeeName: currentEmp.name,
          eventType: 'device_mismatch',
          details: `AKSES DIPUTUS: Sesi personel ${currentEmp.name} (NIP: ${currentEmp.nip}) diputus otomatis karena akun terikat pada perangkat resmi [${currentEmp.boundDeviceId}], sedangkan perangkat saat ini adalah [${currentDev.deviceId}].`,
          deviceId: currentDev.deviceId
        };
        setSecurityLogs(prev => [evictLog, ...prev]);
        syncSaveSecurityLog(evictLog).catch(console.error);

        handleAddNotification({
          id: `NOTIF-EVICT-${Date.now()}`,
          targetRole: 'admin',
          type: 'security',
          title: `Akses HP Lain Diputus: ${currentEmp.name}`,
          message: `Sesi ${currentEmp.name} diputus paksa di perangkat [${currentDev.deviceName}] karena akun telah terkunci di perangkat dinas resmi lain.`,
          timestamp: `${currentTimeString} WIB`,
          read: false
        });
      }
    }
  }, [isLoggedIn, currentRole, activeEmployeeId, employees, currentTimeString]);

  // Handlers
  const handleAddNotification = (notif: NotificationItem) => {
    setNotifications(prev => [notif, ...prev]);
    // Pop up floating toast
    setToasts(prev => [notif, ...prev.slice(0, 3)]);
    // Auto-dismiss toast after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== notif.id));
    }, 6000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleUpdateEmployee = (updated: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    syncSaveEmployee(updated).catch(console.error);
  };

  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees(prev => [newEmp, ...prev]);
    syncSaveEmployee(newEmp).catch(console.error);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const target = employees.find(e => e.id === employeeId);
    if (!target) return;

    setEmployees(prev => prev.filter(e => e.id !== employeeId));
    syncDeleteEmployee(employeeId).catch(console.error);

    // Add security audit log
    const log: SecurityLog = {
      id: `SEC-DEL-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: target.id,
      employeeName: target.name,
      eventType: 'device_reset',
      details: `Data personel ${target.name} (NIP: ${target.nip}) telah dihapus dari sistem oleh Admin Komando.`,
      deviceId: 'CONSOLE-ADMIN'
    };
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);

    // Dispatch Notification
    handleAddNotification({
      id: `NOTIF-DEL-${Date.now()}`,
      targetRole: 'admin',
      type: 'warning',
      title: 'Data Personel Dihapus',
      message: `Personel ${target.name} (NIP: ${target.nip}) telah dihapus dari sistem data Satpol PP.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  const handleResetEmployeesToDefault = () => {
    if (window.confirm("Kembalikan seluruh daftar personel ke data bawaan awal (150 Personel Satpol PP)?")) {
      setEmployees(INITIAL_EMPLOYEES);
      seedInitialEmployees().catch(console.error);
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
      } catch {}

      handleAddNotification({
        id: `NOTIF-RESET-ALL-EMP-${Date.now()}`,
        targetRole: 'admin',
        type: 'warning',
        title: 'Reset Daftar Personel Berhasil',
        message: 'Daftar personel berhasil dikembalikan ke data default 150 anggota Satpol PP.',
        timestamp: `${currentTimeString} WIB`,
        read: false
      });
    }
  };

  const handleResetDeviceLock = (employeeId: string) => {
    const target = employees.find(e => e.id === employeeId);
    if (!target) return;

    const unlocked: Employee = {
      ...target,
      boundDeviceId: null,
      boundDeviceName: undefined,
      boundAt: undefined,
    };

    setEmployees(prev => prev.map(e => e.id === employeeId ? unlocked : e));
    syncSaveEmployee(unlocked).catch(console.error);

    // Add security audit log
    const log: SecurityLog = {
      id: `SEC-RESET-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: target.id,
      employeeName: target.name,
      eventType: 'device_reset',
      details: `Kunci ID Perangkat [${target.boundDeviceId || 'N/A'}] di-reset oleh Admin Komando. Pegawai diizinkan memasangkan perangkat baru.`,
      deviceId: target.boundDeviceId || 'N/A'
    };
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);

    // Dispatch Notification
    handleAddNotification({
      id: `NOTIF-RESET-${Date.now()}`,
      targetRole: 'admin',
      type: 'warning',
      title: 'Reset Kunci Perangkat Personel',
      message: `Kunci ID perangkat untuk ${target.name} (NIP: ${target.nip}) telah di-reset oleh Admin.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  const handleUpdateLocation = (updated: WorkLocation) => {
    setLocations(prev => {
      const next = prev.map(l => l.id === updated.id ? updated : l);
      try {
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(next));
      } catch {}
      return next;
    });
    syncSaveLocation(updated).catch(console.error);
  };

  const handleAddLocation = (newLoc: WorkLocation) => {
    setLocations(prev => {
      const next = [...prev, newLoc].sort((a, b) => (a.slotNumber || a.id) - (b.slotNumber || b.id));
      try {
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(next));
      } catch {}
      return next;
    });
    syncSaveLocation(newLoc).catch(console.error);

    handleAddNotification({
      id: `NOTIF-LOC-ADD-${Date.now()}`,
      targetRole: 'admin',
      type: 'success',
      title: 'Pos Lokasi Baru Ditambahkan',
      message: `Pos ${newLoc.name} (${newLoc.code}) berhasil ditambahkan ke daftar pos tugas.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  const handleDeleteLocation = (locationId: number) => {
    const locToDelete = locations.find(l => l.id === locationId);
    if (!locToDelete) return;

    const remaining = locations.filter(l => l.id !== locationId);
    setLocations(remaining);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(remaining));
    } catch {}
    syncDeleteLocation(locationId).catch(console.error);

    // If any employees were assigned to this location, reassign them to the first remaining location
    const fallbackLocId = remaining[0]?.id || 1;
    setEmployees(prev => {
      let changed = false;
      const updated = prev.map(e => {
        if (e.locationSlotId === locationId) {
          changed = true;
          const updatedEmp = { ...e, locationSlotId: fallbackLocId };
          syncSaveEmployee(updatedEmp).catch(console.error);
          return updatedEmp;
        }
        return e;
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    handleAddNotification({
      id: `NOTIF-LOC-DEL-${Date.now()}`,
      targetRole: 'admin',
      type: 'warning',
      title: 'Pos Lokasi Dihapus',
      message: `Pos ${locToDelete.name} telah dihapus dari sistem. Personel terkait telah dialihkan.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  const handleAddAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => [record, ...prev]);
    syncSaveAttendance(record).catch(console.error);
  };

  const handleUpdateAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => prev.map(r => r.id === record.id ? record : r));
    syncSaveAttendance(record).catch(console.error);
  };

  const handleAddSecurityLog = (log: SecurityLog) => {
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);
  };

  // Helper to generate dates between startDate and endDate (inclusive)
  const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    const current = new Date(startDateStr);
    const end = new Date(endDateStr);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates.length > 0 ? dates : [startDateStr];
  };

  // 1. Submit new leave/sick request (Employee -> Admin live sync)
  const handleSubmitLeaveRequest = (request: LeaveRequest) => {
    setLeaveRequests(prev => [request, ...prev]);
    syncSaveLeaveRequest(request).catch(console.error);

    // Notify admin
    handleAddNotification({
      id: `NOTIF-LEAVE-${Date.now()}`,
      targetRole: 'admin',
      type: 'warning',
      title: `Pengajuan ${request.type === 'izin' ? 'Izin Dinas' : 'Surat Sakit'} Baru`,
      message: `${request.employeeName} (${request.regu}) mengajukan permohonan ${request.type === 'izin' ? 'izin' : 'sakit'} untuk periode ${request.startDate} s/d ${request.endDate} (${request.totalDays} hari).`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  // 2. Approve leave/sick request (Admin -> Automatically reflected in daily/monthly attendance)
  const handleApproveLeaveRequest = (requestId: string, adminNote?: string) => {
    const req = leaveRequests.find(r => r.id === requestId);
    if (!req) return;

    const nowStr = `${effectiveCurrentDate.toISOString().split('T')[0]} ${currentTimeString} WIB`;
    const updatedRequest: LeaveRequest = {
      ...req,
      status: 'approved',
      reviewedAt: nowStr,
      reviewedBy: 'Admin Komando',
      adminNote: adminNote || 'Disetujui oleh Komando Satpol PP.'
    };

    setLeaveRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
    syncSaveLeaveRequest(updatedRequest).catch(console.error);

    // Find assigned location for the employee
    const targetEmp = employees.find(e => e.id === req.employeeId);
    const locId = targetEmp?.locationSlotId || 1;
    const loc = locations.find(l => l.id === locId) || locations[0];

    // Automatically synchronize into Attendance Records for each date in range!
    const dates = getDatesInRange(req.startDate, req.endDate);
    dates.forEach(dateStr => {
      const attendanceId = `ATT-LEAVE-${req.id}-${dateStr}`;
      const leaveRecord: AttendanceRecord = {
        id: attendanceId,
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        employeeNip: req.employeeNip,
        date: dateStr,
        regu: req.regu,
        scheduleType: targetEmp?.scheduleType || 'shift',
        locationSlotId: locId,
        locationName: loc.name,
        checkInTime: req.type === 'izin' ? 'IZIN' : 'SAKIT',
        checkInStatus: req.type,
        checkOutTime: '-',
        notes: `[DISPOSISI ${req.type.toUpperCase()}] ${req.reason} (Disetujui Admin: ${updatedRequest.adminNote})`,
        leaveRequestId: req.id
      };

      setAttendanceRecords(prev => {
        const existingIdx = prev.findIndex(r => r.employeeId === req.employeeId && r.date === dateStr);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...leaveRecord };
          return updated;
        } else {
          return [leaveRecord, ...prev];
        }
      });
      syncSaveAttendance(leaveRecord).catch(console.error);
    });

    // Notify employee
    handleAddNotification({
      id: `NOTIF-LEAVE-APP-${Date.now()}`,
      targetRole: 'employee',
      targetEmployeeId: req.employeeId,
      type: 'success',
      title: `Pengajuan ${req.type === 'izin' ? 'Izin' : 'Sakit'} Disetujui`,
      message: `Permohonan ${req.type} Anda (${req.startDate} s/d ${req.endDate}) telah DISETUJUI oleh Admin Komando dan tersinkron otomatis ke rekap absensi.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });

    // Audit log
    const log: SecurityLog = {
      id: `SEC-LEAVE-APP-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      eventType: 'device_reset',
      details: `PERSETUJUAN DISPOSISI: Permohonan ${req.type.toUpperCase()} personel ${req.employeeName} (${req.totalDays} hari) disetujui Admin. Rekapitulasi absensi diperbarui otomatis.`,
      deviceId: 'PORTAL-KOMANDO'
    };
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);
  };

  // 3. Reject leave/sick request
  const handleRejectLeaveRequest = (requestId: string, adminNote?: string) => {
    const req = leaveRequests.find(r => r.id === requestId);
    if (!req) return;

    const nowStr = `${effectiveCurrentDate.toISOString().split('T')[0]} ${currentTimeString} WIB`;
    const updatedRequest: LeaveRequest = {
      ...req,
      status: 'rejected',
      reviewedAt: nowStr,
      reviewedBy: 'Admin Komando',
      adminNote: adminNote || 'Permohonan ditolak karena kebutuhan operasional lapangan.'
    };

    setLeaveRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
    syncSaveLeaveRequest(updatedRequest).catch(console.error);

    // If there were any attendance records generated for this leaveRequestId, remove them
    setAttendanceRecords(prev => prev.filter(r => r.leaveRequestId !== req.id));

    // Notify employee
    handleAddNotification({
      id: `NOTIF-LEAVE-REJ-${Date.now()}`,
      targetRole: 'employee',
      targetEmployeeId: req.employeeId,
      type: 'warning',
      title: `Pengajuan ${req.type === 'izin' ? 'Izin' : 'Sakit'} Ditolak`,
      message: `Permohonan ${req.type} Anda (${req.startDate} s/d ${req.endDate}) TIDAK DISETUJUI oleh Admin. Alasan: ${updatedRequest.adminNote}`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  // Admin PIN configuration handler
  const handleUpdateAdminPin = (newPin: string) => {
    setAdminPin(newPin);
    syncSaveAdminPin(newPin).catch(console.error);
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, newPin);
    } catch {
      // ignore
    }

    const log: SecurityLog = {
      id: `SEC-PIN-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: 'ADMIN-KOMANDO',
      employeeName: 'Admin Komando',
      eventType: 'device_reset',
      details: 'PIN Keamanan Komando Admin berhasil diperbarui oleh Administrator.',
      deviceId: 'PORTAL-KOMANDO'
    };
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);

    handleAddNotification({
      id: `NOTIF-PIN-${Date.now()}`,
      targetRole: 'admin',
      type: 'security',
      title: 'Pembaruan PIN Keamanan Admin',
      message: 'PIN Keamanan akses Komando Admin berhasil diperbarui.',
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  // Archive and Cleanup Handler
  const handleExecuteArchive = async (
    recordIds: string[], 
    mode: 'photos_only' | 'delete_all',
    cutoffLabel: string
  ) => {
    // 1. Sync to Cloud Firestore
    await syncArchiveAndCleanupAttendance(recordIds, mode);

    // 2. Update local state
    if (mode === 'delete_all') {
      setAttendanceRecords(prev => prev.filter(r => !recordIds.includes(r.id)));
    } else {
      setAttendanceRecords(prev => prev.map(r => {
        if (recordIds.includes(r.id)) {
          return {
            ...r,
            checkInPhoto: undefined,
            checkOutPhoto: undefined,
            notes: 'Foto presensi telah diarsipkan untuk efisiensi penyimpanan'
          };
        }
        return r;
      }));
    }

    // 3. Security Audit Log
    const log: SecurityLog = {
      id: `SEC-ARCHIVE-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: 'ADMIN-KOMANDO',
      employeeName: 'Admin Komando',
      eventType: 'device_reset',
      details: mode === 'delete_all'
        ? `ARSIP & BERSIHKAN TOTAL: ${recordIds.length} rekaman presensi periode ${cutoffLabel} telah dihapus dari Cloud Firestore setelah pencadangan CSV.`
        : `OPTIMASI KUOTA CLOUD: Foto selfie dari ${recordIds.length} rekaman presensi (${cutoffLabel}) telah dibersihkan. Catatan kehadiran teks tetap tersimpan utuh.`,
      deviceId: 'PORTAL-KOMANDO'
    };
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);

    // 4. Notification
    handleAddNotification({
      id: `NOTIF-ARCHIVE-${Date.now()}`,
      targetRole: 'admin',
      type: 'success',
      title: 'Arsip & Pembersihan Database Berhasil',
      message: `${recordIds.length} data presensi (${cutoffLabel}) berhasil diproses. Kuota penyimpanan Cloud Firebase kembali lega.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  // Reset Attendance Handler (Daily or Monthly)
  const handleResetAttendance = async (
    scope: 'daily' | 'monthly',
    label: string,
    recordIds: string[]
  ) => {
    if (recordIds.length === 0) return;

    // 1. Delete records from Cloud Firestore in batch
    await syncArchiveAndCleanupAttendance(recordIds, 'delete_all');

    // 2. Remove from local state
    setAttendanceRecords(prev => prev.filter(r => !recordIds.includes(r.id)));

    // 3. Security Audit Log
    const log: SecurityLog = {
      id: `SEC-RESET-ATT-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: 'ADMIN-KOMANDO',
      employeeName: 'Admin Komando',
      eventType: 'device_reset',
      details: scope === 'daily'
        ? `RESET REKAP HARIAN: ${recordIds.length} rekaman presensi tanggal ${label} telah dihapus/dikosongkan oleh Admin Komando.`
        : `RESET REKAP BULANAN: ${recordIds.length} rekaman presensi periode bulan ${label} telah dihapus/dikosongkan oleh Admin Komando.`,
      deviceId: 'PORTAL-KOMANDO'
    };
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);

    // 4. Notification
    handleAddNotification({
      id: `NOTIF-RESET-ATT-${Date.now()}`,
      targetRole: 'admin',
      type: 'warning',
      title: scope === 'daily' ? 'Reset Rekap Harian Berhasil' : 'Reset Rekap Bulanan Berhasil',
      message: `${recordIds.length} data presensi (${label}) berhasil dikosongkan. Hasil rekapitulasi telah di-reset ke 0.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  // Open specific print menu
  const handleOpenPrintMenu = (menu: PrintMenuType) => {
    setPrintDefaultMenu(menu);
    setIsPrintModalOpen(true);
  };

  // Login Handlers
  const handleLoginAsEmployee = (emp: Employee, isFirstBinding = false) => {
    setActiveEmployeeId(emp.id);
    setCurrentRole('pegawai');
    setIsLoggedIn(true);

    if (isFirstBinding) {
      syncSaveEmployee(emp).catch(console.error);

      const log: SecurityLog = {
        id: `SEC-FIRST-LOCK-${Date.now()}`,
        timestamp: `Hari Ini, ${currentTimeString} WIB`,
        employeeId: emp.id,
        employeeName: emp.name,
        eventType: 'device_paired',
        details: `KUNCI PERANGKAT PERDANA: Perangkat [${emp.boundDeviceName || 'Smartphone'}] dengan ID [${emp.boundDeviceId}] berhasil didaftarkan dan DIKUNCI secara permanen pada login pertama personel ${emp.name}.`,
        deviceId: emp.boundDeviceId || 'N/A'
      };
      setSecurityLogs(prev => [log, ...prev]);
      syncSaveSecurityLog(log).catch(console.error);

      handleAddNotification({
        id: `NOTIF-FIRST-LOCK-${Date.now()}`,
        targetRole: 'all',
        targetEmployeeId: emp.id,
        type: 'success',
        title: 'Kunci Perangkat Permanen Berhasil (Login Pertama)',
        message: `Perangkat Anda (${emp.boundDeviceName || emp.boundDeviceId}) telah berhasil dikunci permanen pada akun ${emp.name} (${emp.regu}). Absensi tidak dapat dilakukan dari HP lain tanpa izin Komando.`,
        timestamp: `${currentTimeString} WIB`,
        read: false
      });
    } else {
      handleAddNotification({
        id: `NOTIF-LOGIN-${Date.now()}`,
        targetRole: 'employee',
        targetEmployeeId: emp.id,
        type: 'success',
        title: 'Selamat Datang di Portal Presensi',
        message: `Halo, ${emp.name}. Anda terdaftar di ${emp.regu} · Slot ${emp.locationSlotId} (${emp.scheduleType === 'harian' ? 'Harian' : 'Shift'}).`,
        timestamp: `${currentTimeString} WIB`,
        read: false
      });
    }
  };

  const handleLoginAsAdmin = () => {
    setCurrentRole('admin');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Reset demo data back to default initial dataset
  const handleResetDemoData = () => {
    if (window.confirm("Kembalikan seluruh data ke awal (150 Personel Satpol PP, 12 Slot Pos Lokasi, Presensi, dan Notifikasi)?")) {
      setEmployees(INITIAL_EMPLOYEES);
      setLocations(INITIAL_WORK_LOCATIONS);
      setAttendanceRecords(generateInitialAttendanceRecords());
      setSecurityLogs(generateInitialSecurityLogs());
      setNotifications(generateInitialNotifications());
      setActiveEmployeeId('POLPP-001');
      setAdminPin('123456');
      try {
        localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, '123456');
      } catch {}
      setSimulatedTime(null);
    }
  };

  const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

  // If logged out: Show Login Portal (Separate gateway for employee vs admin)
  if (!isLoggedIn) {
    return (
      <LoginPortal
        employees={employees}
        onLoginAsEmployee={handleLoginAsEmployee}
        onLoginAsAdmin={handleLoginAsAdmin}
        configuredAdminPin={adminPin}
        onResetDeviceLock={handleResetDeviceLock}
        onUpdateEmployee={handleUpdateEmployee}
        onAddSecurityLog={handleAddSecurityLog}
        onAddNotification={handleAddNotification}
      />
    );
  }

  const pendingLeavesCount = leaveRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col selection:bg-amber-500 selection:text-white">
      
      {/* Top Bar Header */}
      <Header
        currentRole={currentRole}
        currentEmployee={activeEmployee}
        activeAdminTab={activeAdminTab}
        onAdminTabChange={setActiveAdminTab}
        onLogout={handleLogout}
        simulatedTime={simulatedTime}
        onOpenTimeSimulator={() => setIsTimeSimulatorOpen(true)}
        currentTimeString={currentTimeString}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onOpenAdminPinModal={() => setIsAdminPinModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        locationsCount={locations.length}
        employeesCount={employees.length}
        pendingLeavesCount={pendingLeavesCount}
        onOpenPrintModal={() => {
          const mapping: Record<string, PrintMenuType> = {
            monitoring: 'daily',
            locations: 'locations',
            employees: 'regu',
            leaves: 'daily',
            reports: 'monthly',
            security: 'security'
          };
          handleOpenPrintMenu(mapping[activeAdminTab] || 'daily');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Simulation Banner Notice (if active - Admin only) */}
        {simulatedTime && currentRole === 'admin' && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs text-amber-900 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Mode Simulasi Waktu Aktif:</strong> Jam diset ke <strong>{currentTimeString} WIB</strong>. Aturan 30 menit sebelum masuk dan jam pulang tervalidasi terhadap waktu ini.
              </span>
            </div>
            <button
              onClick={() => setSimulatedTime(null)}
              className="text-xs underline hover:text-amber-700 font-bold ml-2 shrink-0 text-amber-800"
            >
              Kembalikan ke Waktu Nyata
            </button>
          </div>
        )}

        {/* Dynamic View by Role */}
        {currentRole === 'pegawai' ? (
          /* PEGAWAI VIEW: strictly sees their own personal portal, no admin links, no device lock box, read-only data */
          <EmployeeView
            employee={activeEmployee}
            locations={locations}
            currentDate={effectiveCurrentDate}
            attendanceRecords={attendanceRecords}
            leaveRequests={leaveRequests}
            onSubmitLeaveRequest={handleSubmitLeaveRequest}
            onAddAttendance={handleAddAttendance}
            onUpdateAttendance={handleUpdateAttendance}
            onAddSecurityLog={handleAddSecurityLog}
            onAddNotification={handleAddNotification}
          />
        ) : (
          /* ADMIN VIEW: sees Command Center, Pos Lokasi, Pegawai, Izin & Sakit, Laporan Bulanan, Kunci & Audit */
          <div className="space-y-6">
            
            {/* Active Admin Tab Content */}
            {activeAdminTab === 'monitoring' && (
              <AdminDashboard
                employees={employees}
                locations={locations}
                attendanceRecords={attendanceRecords}
                securityLogs={securityLogs}
                currentDate={effectiveCurrentDate}
                onOpenPrintMenu={handleOpenPrintMenu}
                onResetDailyAttendance={(recordIds, label) => handleResetAttendance('daily', label, recordIds)}
              />
            )}

            {activeAdminTab === 'locations' && (
              <WorkLocationsManager
                locations={locations}
                employees={employees}
                onUpdateLocation={handleUpdateLocation}
                onAddLocation={handleAddLocation}
                onDeleteLocation={handleDeleteLocation}
                onOpenPrintMenu={handleOpenPrintMenu}
              />
            )}

            {activeAdminTab === 'employees' && (
              <EmployeeManager
                employees={employees}
                locations={locations}
                onUpdateEmployee={handleUpdateEmployee}
                onAddEmployee={handleAddEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onResetDeviceLock={handleResetDeviceLock}
                onResetAllEmployees={handleResetEmployeesToDefault}
                onOpenPrintMenu={handleOpenPrintMenu}
              />
            )}

            {activeAdminTab === 'leaves' && (
              <AdminLeaveApprovals
                leaveRequests={leaveRequests}
                onApproveLeaveRequest={handleApproveLeaveRequest}
                onRejectLeaveRequest={handleRejectLeaveRequest}
              />
            )}

            {activeAdminTab === 'reports' && (
              <MonthlyReportView
                employees={employees}
                locations={locations}
                attendanceRecords={attendanceRecords}
                onOpenPrintMenu={handleOpenPrintMenu}
                onExecuteArchive={handleExecuteArchive}
                onResetMonthlyAttendance={(recordIds, label) => handleResetAttendance('monthly', label, recordIds)}
              />
            )}

            {activeAdminTab === 'security' && (
              <SecurityAuditLog
                logs={securityLogs}
                onOpenPrintMenu={handleOpenPrintMenu}
              />
            )}

          </div>
        )}

      </main>

      {/* Floating Real-Time Toast Overlay */}
      <ToastNotificationOverlay
        toasts={toasts}
        onDismiss={handleDismissToast}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-5 text-xs text-slate-500 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-slate-600 font-medium">
              Satuan Polisi Pamong Praja (Satpol PP) · Sistem Presensi GPS & Kunci Perangkat
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResetDemoData}
              className="text-slate-500 hover:text-amber-700 transition-colors font-medium"
            >
              Reset Data Bawaan (150 Pegawai)
            </button>
            <span>·</span>
            <span className="font-semibold text-slate-700">Praja Wibawa</span>
          </div>
        </div>
      </footer>

      {/* Time Simulator Modal */}
      <TimeSimulatorModal
        isOpen={isTimeSimulatorOpen}
        onClose={() => setIsTimeSimulatorOpen(false)}
        currentSimulatedTime={simulatedTime}
        onApplySimulatedTime={setSimulatedTime}
      />

      {/* Admin PIN Configuration Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        currentPin={adminPin}
        onUpdatePin={handleUpdateAdminPin}
      />

      {/* Official Satpol PP Document Print Center Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultMenu={printDefaultMenu}
        employees={employees}
        locations={locations}
        attendanceRecords={attendanceRecords}
        securityLogs={securityLogs}
        currentDate={effectiveCurrentDate}
      />

      {/* Petunjuk Operasional & SOP Dinas Modal */}
      <OperationalGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        currentRole={currentRole}
      />

    </div>
  );
}
