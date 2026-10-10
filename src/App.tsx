/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Employee, 
  WorkLocation, 
  AttendanceRecord, 
  SecurityLog,
  NotificationItem,
  LeaveRequest,
  CustomHoliday,
  AdminAccount
} from './types';
import { INITIAL_WORK_LOCATIONS } from './data/initialLocations';
import { INITIAL_EMPLOYEES } from './data/initialEmployees';
import { INITIAL_ADMIN_ACCOUNTS } from './data/initialAdmins';
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
import { AdminTopFive } from './components/admin/AdminTopFive';
import { SecurityAuditLog } from './components/admin/SecurityAuditLog';
import { HolidayManager } from './components/admin/HolidayManager';
import { TimeSimulatorModal } from './components/TimeSimulatorModal';
import { AdminAccountModal } from './components/admin/AdminAccountModal';
import { PrintReportModal, PrintMenuType } from './components/admin/PrintReportModal';
import { OperationalGuideModal } from './components/OperationalGuideModal';
import { SatpolPPWatermarkBackground } from './components/SatpolPPWatermarkBackground';
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
  subscribeCustomHolidays,
  subscribeAdminAccounts,
  syncSaveEmployee,
  syncDeleteEmployee,
  syncSaveLocation,
  syncDeleteLocation,
  syncSaveAttendance,
  syncSaveSecurityLog,
  syncSaveAdminPin,
  syncSaveLeaveRequest,
  syncSaveCustomHoliday,
  syncDeleteCustomHoliday,
  syncSaveAdminAccount,
  seedInitialEmployees,
  seedInitialLeaveRequests,
  syncClearAllEmployees,
  syncClearLeaveRequests,
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
  CUSTOM_HOLIDAYS: 'sipraja_custom_holidays_v2',
  ADMIN_ACCOUNTS: 'sipraja_admin_accounts_v2',
  CURRENT_ADMIN_ID: 'sipraja_current_admin_id_v2',
};

export default function App() {
  // 1. State: 150 Employees (Dinamis penuh sesuai kelolaan admin & dapat dikosongkan total)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      if (localStorage.getItem('sipraja_employees_cleared') === 'true') {
        return [];
      }
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

  // 3. State: Attendance Records (Only real records inputted by admin or users)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (saved) {
        const parsed = JSON.parse(saved) as AttendanceRecord[];
        if (Array.isArray(parsed)) {
          return parsed.filter(r => 
            !r.id.startsWith('ATT-2026-') && 
            !r.id.startsWith('ATT-HIST-') &&
            !r.id.startsWith('ATT-SAMPLE-')
          );
        }
      }
    } catch {
      // ignore
    }
    return [];
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

  // 5b. State: Izin & Sakit (Leave Requests) (Only real requests, sample dummy data purged)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEAVE_REQUESTS);
      if (saved) {
        const parsed = JSON.parse(saved) as LeaveRequest[];
        if (Array.isArray(parsed)) {
          return parsed.filter(r => 
            !r.id.startsWith('LEAVE-REQ-') && 
            !r.id.startsWith('LEAVE-SAMPLE-') &&
            !['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(r.id)
          );
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // 5c. State: Hari Libur Kustom & Tanggal Merah Tambahan
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_HOLIDAYS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
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

  // 11. Multi-Admin Accounts (1 Komando Pusat + 4 Danru)
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_ADMIN_ACCOUNTS;
  });

  const [currentAdminId, setCurrentAdminId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN_ID);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return 'admin-komando';
  });

  const currentAdmin = useMemo(() => {
    return adminAccounts.find(a => a.id === currentAdminId) || adminAccounts[0];
  }, [adminAccounts, currentAdminId]);

  // Admin Security PIN (Can be customized by Admin)
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

    // 8. Subscribe to Custom Holidays
    const unsubHolidays = subscribeCustomHolidays((syncedHolidays) => {
      if (syncedHolidays) {
        setCustomHolidays(syncedHolidays);
        try {
          localStorage.setItem(STORAGE_KEYS.CUSTOM_HOLIDAYS, JSON.stringify(syncedHolidays));
        } catch {}
      }
    });

    // 9. Subscribe to Multi-Admin Accounts (1 Komando + 4 Danru)
    const unsubAdminAccounts = subscribeAdminAccounts((syncedAccounts) => {
      if (syncedAccounts && syncedAccounts.length > 0) {
        setAdminAccounts(syncedAccounts);
        try {
          localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(syncedAccounts));
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
      unsubHolidays();
      unsubAdminAccounts();
    };
  }, []);

  // Guarantee every approved leave request is synchronized to attendance records
  useEffect(() => {
    const approvedLeaves = leaveRequests.filter(
      r => r.status === 'approved' && 
           !r.id.startsWith('LEAVE-REQ-') &&
           !r.id.startsWith('LEAVE-SAMPLE-') &&
           !['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(r.id)
    );
    if (approvedLeaves.length === 0) return;

    let hasNewSync = false;
    const newRecordsToAdd: AttendanceRecord[] = [];

    approvedLeaves.forEach(req => {
      const dates = getDatesInRange(req.startDate, req.endDate);
      const targetEmp = employees.find(e => e.id === req.employeeId);
      const locId = targetEmp?.locationSlotId || 1;
      const loc = locations.find(l => l.id === locId) || locations[0];

      dates.forEach(dateStr => {
        const attendanceId = `ATT-LEAVE-${req.id}-${dateStr}`;
        const existing = attendanceRecords.find(
          a => a.id === attendanceId || 
               (a.employeeId === req.employeeId && a.date === dateStr)
        );
        
        if (!existing) {
          hasNewSync = true;
          const leaveRec: AttendanceRecord = {
            id: attendanceId,
            employeeId: req.employeeId,
            employeeName: req.employeeName,
            employeeNip: req.employeeNip,
            date: dateStr,
            regu: req.regu,
            scheduleType: targetEmp?.scheduleType || 'shift',
            locationSlotId: locId,
            locationName: loc.name,
            checkInTime: req.type === 'izin' ? 'IZIN' : req.type === 'sakit' ? 'SAKIT' : 'DISPENSASI',
            checkInStatus: req.type,
            checkOutTime: '-',
            notes: `[DISPOSISI ${req.type.toUpperCase()}] ${req.reason} (Disetujui Admin: ${req.adminNote || 'Disahkan'})`,
            leaveRequestId: req.id,
            isOfficeDispensation: req.type === 'dispensasi_kantor' || req.isOfficeDispensation,
            dispensationLetterNumber: req.dispensationLetterNumber,
            dispensationLetterPhoto: req.attachmentUrl,
            dispensationReason: req.reason,
            dispensationIssuedBy: req.dispensationIssuedBy || 'Kantor Satpol PP'
          };
          newRecordsToAdd.push(leaveRec);
        } else if (existing.checkInStatus !== req.type) {
          hasNewSync = true;
          const updatedRec: AttendanceRecord = {
            ...existing,
            checkInTime: req.type === 'izin' ? 'IZIN' : req.type === 'sakit' ? 'SAKIT' : 'DISPENSASI',
            checkInStatus: req.type,
            notes: `[DISPOSISI ${req.type.toUpperCase()}] ${req.reason} (Disetujui Admin: ${req.adminNote || 'Disahkan'})`,
            leaveRequestId: req.id,
          };
          newRecordsToAdd.push(updatedRec);
        }
      });
    });

    if (hasNewSync && newRecordsToAdd.length > 0) {
      setAttendanceRecords(prev => {
        const map = new Map<string, AttendanceRecord>();
        prev.forEach(r => map.set(r.id, r));
        newRecordsToAdd.forEach(r => map.set(r.id, r));
        return Array.from(map.values());
      });
      newRecordsToAdd.forEach(rec => syncSaveAttendance(rec).catch(console.error));
    }
  }, [leaveRequests, employees, locations]);

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
    localStorage.removeItem('sipraja_employees_cleared');
    setEmployees(prev => {
      const next = [newEmp, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
      } catch {}
      return next;
    });
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

  const handleResetOrClearEmployees = async (mode: 'reset_default' | 'clear_all' = 'reset_default') => {
    try {
      if (mode === 'clear_all') {
        const allIds = employees.map(e => e.id);
        setEmployees([]);
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
        } catch {}
        await syncClearAllEmployees(allIds);

        handleAddNotification({
          id: `NOTIF-CLEAR-ALL-EMP-${Date.now()}`,
          targetRole: 'admin',
          type: 'warning',
          title: 'Seluruh Data Pegawai Dikosongkan',
          message: `${allIds.length} data pegawai berhasil dihapus dari database sistem.`,
          timestamp: `${currentTimeString} WIB`,
          read: false
        });
      } else {
        setEmployees(INITIAL_EMPLOYEES);
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
        } catch {}
        await seedInitialEmployees();

        handleAddNotification({
          id: `NOTIF-RESET-ALL-EMP-${Date.now()}`,
          targetRole: 'admin',
          type: 'warning',
          title: 'Reset Data Personel Berhasil',
          message: 'Daftar personel berhasil dikembalikan ke data default anggota Satpol PP.',
          timestamp: `${currentTimeString} WIB`,
          read: false
        });
      }
    } catch (err) {
      console.error('Error reset/clear employees:', err);
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
    setLeaveRequests(prev => {
      const clean = prev.filter(r => 
        !r.id.startsWith('LEAVE-REQ-') &&
        !r.id.startsWith('LEAVE-SAMPLE-') &&
        !['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(r.id)
      );
      const next = [request, ...clean];
      try {
        localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(next));
      } catch {}
      return next;
    });
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
        checkInTime: req.type === 'izin' ? 'IZIN' : req.type === 'sakit' ? 'SAKIT' : 'DISPENSASI',
        checkInStatus: req.type,
        checkOutTime: '-',
        notes: `[DISPOSISI ${req.type === 'dispensasi_kantor' ? 'DISPENSASI SURAT KANTOR (HP RUSAK)' : req.type.toUpperCase()}] ${req.reason}${req.dispensationLetterNumber ? ` | No. Surat: ${req.dispensationLetterNumber}` : ''} (Disetujui Admin: ${updatedRequest.adminNote})`,
        leaveRequestId: req.id,
        isOfficeDispensation: req.type === 'dispensasi_kantor' || req.isOfficeDispensation,
        dispensationLetterNumber: req.dispensationLetterNumber,
        dispensationLetterPhoto: req.attachmentUrl,
        dispensationReason: req.reason,
        dispensationIssuedBy: req.dispensationIssuedBy || 'Kantor Satpol PP'
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

  // 4. Reset or clear leave/sick requests (Requested by User)
  const handleResetLeaveRequests = async (mode: 'completed' | 'all' | 'default') => {
    try {
      if (mode === 'completed') {
        const completed = leaveRequests.filter(r => r.status === 'approved' || r.status === 'rejected');
        const completedIds = completed.map(r => r.id);
        const remaining = leaveRequests.filter(r => r.status === 'pending');
        
        setLeaveRequests(remaining);
        try {
          localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(remaining));
        } catch {}

        await syncClearLeaveRequests(completedIds);

        handleAddNotification({
          id: `NOTIF-RESET-LEAVE-${Date.now()}`,
          targetRole: 'admin',
          type: 'warning',
          title: 'Pembersihan Data Izin & Sakit Berhasil',
          message: `${completedIds.length} berkas permohonan lama yang telah diproses berhasil dibersihkan dari sistem.`,
          timestamp: `${currentTimeString} WIB`,
          read: false
        });
      } else if (mode === 'all') {
        const allIds = leaveRequests.map(r => r.id);
        setLeaveRequests([]);
        try {
          localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify([]));
        } catch {}

        await syncClearLeaveRequests(allIds);

        handleAddNotification({
          id: `NOTIF-RESET-LEAVE-${Date.now()}`,
          targetRole: 'admin',
          type: 'warning',
          title: 'Seluruh Riwayat Izin & Sakit Dikosongkan',
          message: 'Semua permohonan izin dan sakit berhasil dihapus dari database.',
          timestamp: `${currentTimeString} WIB`,
          read: false
        });
      } else if (mode === 'default') {
        const sampleIds = ['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'];
        const remaining = leaveRequests.filter(r => 
          !sampleIds.includes(r.id) &&
          !r.id.startsWith('LEAVE-REQ-') &&
          !r.id.startsWith('LEAVE-SAMPLE-')
        );
        setLeaveRequests(remaining);
        try {
          localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(remaining));
        } catch {}

        await syncClearLeaveRequests(sampleIds);

        handleAddNotification({
          id: `NOTIF-RESET-LEAVE-${Date.now()}`,
          targetRole: 'admin',
          type: 'success',
          title: 'Data Contoh Bawaan Berhasil Dibersihkan',
          message: 'Seluruh permohonan contoh bawaan aplikasi telah dihapus. Hanya data permohonan riil yang dipertahankan.',
          timestamp: `${currentTimeString} WIB`,
          read: false
        });
      }
    } catch (err) {
      console.error('Error resetting leave requests:', err);
    }
  };

  // Direct Creation of Office Dispensation (Dispensasi Kendala HP Rusak / Pemutihan Absensi)
  const handleCreateOfficeDispensation = (data: {
    employeeId: string;
    startDate: string;
    endDate: string;
    letterNumber: string;
    issuedBy: string;
    reason: string;
    sessionMode?: 'full_day' | 'check_in_only' | 'check_out_only';
    statusMode?: 'dispensasi_kantor' | 'tepat_waktu';
    attachmentUrl?: string;
    attachmentName?: string;
  }) => {
    const targetEmp = employees.find(e => e.id === data.employeeId);
    if (!targetEmp) return;

    const totalDays = getDatesInRange(data.startDate, data.endDate).length;
    const nowStr = `${effectiveCurrentDate.toISOString().split('T')[0]} ${currentTimeString} WIB`;

    const newRequest: LeaveRequest = {
      id: `DISP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      employeeNip: targetEmp.nip,
      regu: targetEmp.regu,
      type: 'dispensasi_kantor',
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      reason: data.reason,
      attachmentName: data.attachmentName,
      attachmentUrl: data.attachmentUrl,
      status: 'approved',
      appliedAt: nowStr,
      reviewedAt: nowStr,
      reviewedBy: 'Admin Komando',
      adminNote: `Pemutihan absensi kendala HP rusak resmi No: ${data.letterNumber}. Pejabat: ${data.issuedBy}. Sesi: ${data.sessionMode || 'full_day'}.`,
      isOfficeDispensation: true,
      dispensationLetterNumber: data.letterNumber,
      dispensationReason: data.reason,
      dispensationIssuedBy: data.issuedBy,
    };

    setLeaveRequests(prev => {
      const clean = prev.filter(r => 
        !r.id.startsWith('LEAVE-REQ-') &&
        !r.id.startsWith('LEAVE-SAMPLE-') &&
        !['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(r.id)
      );
      const next = [newRequest, ...clean];
      try {
        localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(next));
      } catch {}
      return next;
    });
    syncSaveLeaveRequest(newRequest).catch(console.error);

    // Sync to attendance immediately for every day in range
    const locId = targetEmp.locationSlotId || 1;
    const loc = locations.find(l => l.id === locId) || locations[0];
    const dates = getDatesInRange(data.startDate, data.endDate);
    const sessionMode = data.sessionMode || 'full_day';
    const statusMode = data.statusMode || 'dispensasi_kantor';
    const defaultCheckIn = statusMode === 'tepat_waktu' ? '07:30' : 'DISPENSASI';
    const defaultCheckOut = targetEmp.scheduleType === 'shift' ? '19:30' : '16:00';

    dates.forEach(dateStr => {
      const attendanceId = `ATT-DISP-${newRequest.id}-${dateStr}`;
      
      const checkInTime = sessionMode === 'check_out_only' ? '-' : defaultCheckIn;
      const checkInStatus = sessionMode === 'check_out_only' ? undefined : statusMode;
      const checkOutTime = sessionMode === 'check_in_only' ? '-' : defaultCheckOut;
      const checkOutStatus = sessionMode === 'check_in_only' ? undefined : 'pulang_normal';

      const dispRecord: AttendanceRecord = {
        id: attendanceId,
        employeeId: targetEmp.id,
        employeeName: targetEmp.name,
        employeeNip: targetEmp.nip,
        date: dateStr,
        regu: targetEmp.regu,
        scheduleType: targetEmp.scheduleType,
        locationSlotId: locId,
        locationName: loc.name,
        checkInTime,
        checkInStatus,
        checkOutTime,
        checkOutStatus,
        notes: `[PEMUTIHAN HP RUSAK] No: ${data.letterNumber} | ${data.reason} (${sessionMode === 'full_day' ? 'Seharian Penuh' : sessionMode === 'check_in_only' ? 'Masuk' : 'Pulang'})`,
        leaveRequestId: newRequest.id,
        isOfficeDispensation: true,
        dispensationLetterNumber: data.letterNumber,
        dispensationLetterPhoto: data.attachmentUrl,
        dispensationReason: data.reason,
        dispensationIssuedBy: data.issuedBy,
      };

      setAttendanceRecords(prev => {
        const existingIdx = prev.findIndex(r => r.employeeId === targetEmp.id && r.date === dateStr);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            ...dispRecord,
            // If check_out_only, keep existing checkIn if present
            checkInTime: sessionMode === 'check_out_only' && updated[existingIdx].checkInTime ? updated[existingIdx].checkInTime : dispRecord.checkInTime,
            checkInStatus: sessionMode === 'check_out_only' && updated[existingIdx].checkInStatus ? updated[existingIdx].checkInStatus : dispRecord.checkInStatus,
          };
          return updated;
        } else {
          return [dispRecord, ...prev];
        }
      });
      syncSaveAttendance(dispRecord).catch(console.error);
    });

    // Add Security Audit Log for accountability
    const auditLog: SecurityLog = {
      id: `SEC-DISP-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      eventType: 'device_reset',
      details: `[PEMUTIHAN ABSENSI HP RUSAK] No: ${data.letterNumber} (${data.startDate} s/d ${data.endDate}) oleh ${data.issuedBy}. Keterangan: ${data.reason}`,
      deviceId: 'CONSOLE-ADMIN-PEMUTIHAN'
    };
    setSecurityLogs(prev => [auditLog, ...prev]);
    syncSaveSecurityLog(auditLog).catch(console.error);

    handleAddNotification({
      id: `NOTIF-DISP-${Date.now()}`,
      targetRole: 'employee',
      targetEmployeeId: targetEmp.id,
      type: 'success',
      title: 'Surat Dispensasi Kantor Diterbitkan',
      message: `Dispensasi absensi kendala HP rusak resmi diterbitkan kantor (No: ${data.letterNumber}). Rekap presensi Anda telah disinkronkan.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });

    handleAddNotification({
      id: `NOTIF-ADM-DISP-${Date.now()}`,
      targetRole: 'admin',
      type: 'success',
      title: 'Dispensasi Kantor Berhasil Disinkronkan',
      message: `Dispensasi untuk ${targetEmp.name} (No: ${data.letterNumber}) langsung masuk ke rekap absensi dan cetak laporan.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  // Handler Pembaruan Akun & PIN Mandiri Admin (Masing-masing admin mengelola akunnya sendiri)
  const handleUpdateAdminAccount = (updatedAccount: AdminAccount) => {
    // ENFORCE SECURITY ISOLATION: Admin cannot modify other admin's account!
    if (currentAdmin.id !== updatedAccount.id) {
      console.error('Pelanggaran keamanan: Anda tidak berhak mengubah akun admin lain!');
      return;
    }

    const newAccounts = adminAccounts.map(a => a.id === updatedAccount.id ? updatedAccount : a);
    setAdminAccounts(newAccounts);
    syncSaveAdminAccount(updatedAccount).catch(console.error);
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(newAccounts));
    } catch {}

    // If Komando Pusat, also sync global adminPin fallback
    if (updatedAccount.role === 'komando_pusat') {
      setAdminPin(updatedAccount.pin);
      syncSaveAdminPin(updatedAccount.pin).catch(console.error);
      try {
        localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, updatedAccount.pin);
      } catch {}
    }

    const log: SecurityLog = {
      id: `SEC-ADMIN-UPD-${Date.now()}`,
      timestamp: `Hari Ini, ${currentTimeString} WIB`,
      employeeId: updatedAccount.id,
      employeeName: updatedAccount.name,
      eventType: 'device_reset',
      details: `[KEAMANAN MANDIRI] ${updatedAccount.name} (@${updatedAccount.username}) memperbarui data profil & PIN mandiri.`,
      deviceId: 'PORTAL-ADMIN'
    };
    setSecurityLogs(prev => [log, ...prev]);
    syncSaveSecurityLog(log).catch(console.error);

    handleAddNotification({
      id: `NOTIF-ADMIN-UPD-${Date.now()}`,
      targetRole: 'admin',
      type: 'success',
      title: 'Akun Anda Berhasil Diperbarui',
      message: `Profil dan PIN login untuk ${updatedAccount.name} telah disimpan.`,
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

  // Custom Holiday Handlers
  const handleAddCustomHoliday = (holiday: CustomHoliday) => {
    setCustomHolidays(prev => {
      const updated = [holiday, ...prev.filter(h => h.id !== holiday.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_HOLIDAYS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    syncSaveCustomHoliday(holiday).catch(console.error);

    handleAddNotification({
      id: `NOTIF-HOLIDAY-${Date.now()}`,
      targetRole: 'all',
      type: 'success',
      title: `Hari Libur Resmi Ditambahkan: ${holiday.name}`,
      message: `Komando menetapkan tanggal ${holiday.date} sebagai ${holiday.name} (${holiday.appliesTo === 'all' ? 'Seluruh Personel' : holiday.appliesTo === 'harian_only' ? 'Khusus Harian' : 'Khusus Shift'}). Bebas presensi dan terhitung Libur (L).`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
  };

  const handleDeleteCustomHoliday = (holidayId: string) => {
    setCustomHolidays(prev => {
      const updated = prev.filter(h => h.id !== holidayId);
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_HOLIDAYS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    syncDeleteCustomHoliday(holidayId).catch(console.error);
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

  const handleLoginAsAdmin = (admin: AdminAccount) => {
    setCurrentAdminId(admin.id);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN_ID, admin.id);
    } catch {}
    setCurrentRole('admin');
    setIsLoggedIn(true);

    handleAddNotification({
      id: `NOTIF-ADM-LOGIN-${Date.now()}`,
      targetRole: 'admin',
      type: 'success',
      title: `Selamat Bertugas, ${admin.name.split(' (')[0]}`,
      message: `Anda masuk ke Dashboard Sistem Presensi SI-PRAJA dengan hak akses ${admin.role === 'komando_pusat' ? 'Komando Pusat (Seluruh Regu & Pengaturan)' : admin.reguScope}.`,
      timestamp: `${currentTimeString} WIB`,
      read: false
    });
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
        adminAccounts={adminAccounts}
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
    <div className="min-h-screen modern-ambient-bg text-slate-800 flex flex-col selection:bg-amber-600 selection:text-white relative">
      {/* Background Watermark with Uploaded Official Satpol PP Emblem */}
      <SatpolPPWatermarkBackground size="xl" />

      {/* Modern Ambient Visual Accents */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/6 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-indigo-500/4 rounded-full blur-3xl pointer-events-none -z-10" />
      
      {/* Top Bar Header */}
      <Header
        currentRole={currentRole}
        currentEmployee={activeEmployee}
        currentAdmin={currentAdmin}
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
        customHolidaysCount={customHolidays.length}
        onOpenPrintModal={() => {
          const mapping: Record<string, PrintMenuType> = {
            monitoring: 'daily',
            locations: 'locations',
            employees: 'regu',
            leaves: 'daily',
            holidays: 'monthly',
            reports: 'monthly',
            top_five: 'monthly',
            security: 'security'
          };
          handleOpenPrintMenu(mapping[activeAdminTab] || 'daily');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
        
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
            customHolidays={customHolidays}
            onSubmitLeaveRequest={handleSubmitLeaveRequest}
            onAddAttendance={handleAddAttendance}
            onUpdateAttendance={handleUpdateAttendance}
            onAddSecurityLog={handleAddSecurityLog}
            onAddNotification={handleAddNotification}
          />
        ) : (
          /* ADMIN VIEW: sees Command Center, Pos Lokasi, Pegawai, Izin & Sakit, Hari Libur, Laporan Bulanan, Top 5, Kunci & Audit */
          <div className="space-y-6">
            
            {/* Active Admin Tab Content */}
            {activeAdminTab === 'monitoring' && (
              <AdminDashboard
                employees={employees}
                currentAdmin={currentAdmin}
                locations={locations}
                attendanceRecords={attendanceRecords}
                securityLogs={securityLogs}
                currentDate={effectiveCurrentDate}
                leaveRequests={leaveRequests}
                onOpenPrintMenu={handleOpenPrintMenu}
                onResetDailyAttendance={(recordIds, label) => handleResetAttendance('daily', label, recordIds)}
                onNavigateToPemutihan={() => setActiveAdminTab('leaves')}
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
                currentAdmin={currentAdmin}
                locations={locations}
                onUpdateEmployee={handleUpdateEmployee}
                onAddEmployee={handleAddEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onResetDeviceLock={handleResetDeviceLock}
                onResetAllEmployees={handleResetOrClearEmployees}
                onOpenPrintMenu={handleOpenPrintMenu}
              />
            )}

            {activeAdminTab === 'leaves' && (
              <AdminLeaveApprovals
                leaveRequests={leaveRequests}
                currentAdmin={currentAdmin}
                employees={employees}
                locations={locations}
                onApproveLeaveRequest={handleApproveLeaveRequest}
                onRejectLeaveRequest={handleRejectLeaveRequest}
                onResetLeaveRequests={handleResetLeaveRequests}
                onCreateOfficeDispensation={handleCreateOfficeDispensation}
                onOpenPrintMenu={handleOpenPrintMenu}
              />
            )}

            {/* TAB HARI LIBUR KUSTOM & TANGGAL MERAH */}
            {activeAdminTab === 'holidays' && (
              <HolidayManager
                customHolidays={customHolidays}
                onAddHoliday={handleAddCustomHoliday}
                onDeleteHoliday={handleDeleteCustomHoliday}
                currentDate={effectiveCurrentDate}
                onOpenPrintMenu={() => handleOpenPrintMenu('monthly')}
              />
            )}

            {activeAdminTab === 'reports' && (
              <MonthlyReportView
                employees={employees}
                currentAdmin={currentAdmin}
                locations={locations}
                attendanceRecords={attendanceRecords}
                leaveRequests={leaveRequests}
                customHolidays={customHolidays}
                onOpenPrintMenu={handleOpenPrintMenu}
                onExecuteArchive={handleExecuteArchive}
                onResetMonthlyAttendance={(recordIds, label) => handleResetAttendance('monthly', label, recordIds)}
              />
            )}

            {activeAdminTab === 'top_five' && (
              <AdminTopFive
                employees={employees}
                currentAdmin={currentAdmin}
                locations={locations}
                attendanceRecords={attendanceRecords}
                leaveRequests={leaveRequests}
                customHolidays={customHolidays}
                onOpenPrintMenu={handleOpenPrintMenu}
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
              Hapus/Reset Data Seluruh Pegawai & Pos
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

      {/* Multi-Admin Account & PIN Management Modal (Isolated self-management) */}
      <AdminAccountModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        currentAdmin={currentAdmin}
        allAdmins={adminAccounts}
        onUpdateAdminAccount={handleUpdateAdminAccount}
      />

      {/* Official Satpol PP Document Print Center Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultMenu={printDefaultMenu}
        currentAdmin={currentAdmin}
        employees={employees}
        locations={locations}
        attendanceRecords={attendanceRecords}
        securityLogs={securityLogs}
        currentDate={effectiveCurrentDate}
        leaveRequests={leaveRequests}
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
