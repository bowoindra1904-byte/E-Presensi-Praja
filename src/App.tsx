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
  NotificationItem
} from './types';
import { INITIAL_WORK_LOCATIONS } from './data/initialLocations';
import { INITIAL_EMPLOYEES } from './data/initialEmployees';
import { 
  generateInitialAttendanceRecords, 
  generateInitialSecurityLogs,
  generateInitialNotifications 
} from './data/initialAttendance';
import { Header } from './components/Header';
import { EmployeeView } from './components/EmployeeView';
import { LoginPortal } from './components/LoginPortal';
import { ToastNotificationOverlay } from './components/NotificationCenter';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { WorkLocationsManager } from './components/admin/WorkLocationsManager';
import { EmployeeManager } from './components/admin/EmployeeManager';
import { MonthlyReportView } from './components/admin/MonthlyReportView';
import { SecurityAuditLog } from './components/admin/SecurityAuditLog';
import { TimeSimulatorModal } from './components/TimeSimulatorModal';
import { AdminPinModal } from './components/admin/AdminPinModal';
import { PrintReportModal, PrintMenuType } from './components/admin/PrintReportModal';
import { OperationalGuideModal } from './components/OperationalGuideModal';
import { Shield, Sparkles, FileText, Printer, KeyRound, Cloud } from 'lucide-react';
import { testFirestoreConnection } from './services/firebase';
import {
  subscribeEmployees,
  subscribeLocations,
  subscribeAttendance,
  subscribeSecurityLogs,
  subscribeAdminPin,
  syncSaveEmployee,
  syncDeleteEmployee,
  syncSaveLocation,
  syncSaveAttendance,
  syncSaveSecurityLog,
  syncSaveAdminPin,
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

  // 2. State: 8 Work Location Slots
  const [locations, setLocations] = useState<WorkLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      if (saved) return JSON.parse(saved);
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

  // 8. Login status
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return true; // default logged in for seamless demo/testing
  });

  // 9. Active Admin Sub-tab
  const [activeAdminTab, setActiveAdminTab] = useState<'monitoring' | 'locations' | 'employees' | 'reports' | 'security'>('monitoring');

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

    return () => {
      unsubEmployees();
      unsubLocations();
      unsubAttendance();
      unsubSecurity();
      unsubPin();
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
      localStorage.setItem(STORAGE_KEYS.ACTIVE_OFFICER, activeEmployeeId);
      localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, currentRole);
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, JSON.stringify(isLoggedIn));
    } catch {
      // ignore
    }
  }, [activeEmployeeId, currentRole, isLoggedIn]);

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
    setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
    syncSaveLocation(updated).catch(console.error);
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
    if (window.confirm("Kembalikan seluruh data ke awal (150 Personel Satpol PP, 8 Slot Pos Lokasi, Presensi, dan Notifikasi)?")) {
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-600 selection:text-white">
      
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
        onOpenPrintModal={() => {
          const mapping: Record<string, PrintMenuType> = {
            monitoring: 'daily',
            locations: 'locations',
            employees: 'regu',
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
          <div className="mb-6 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Mode Simulasi Waktu Aktif:</strong> Jam diset ke <strong>{currentTimeString} WIB</strong>. Aturan 30 menit sebelum masuk dan jam pulang tervalidasi terhadap waktu ini.
              </span>
            </div>
            <button
              onClick={() => setSimulatedTime(null)}
              className="text-xs underline hover:text-white font-semibold ml-2 shrink-0"
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
            onAddAttendance={handleAddAttendance}
            onUpdateAttendance={handleUpdateAttendance}
            onAddSecurityLog={handleAddSecurityLog}
            onAddNotification={handleAddNotification}
          />
        ) : (
          /* ADMIN VIEW: sees Command Center, 8 Pos, 150 Pegawai, Laporan Bulanan, Kunci & Audit */
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
              />
            )}

            {activeAdminTab === 'locations' && (
              <WorkLocationsManager
                locations={locations}
                employees={employees}
                onUpdateLocation={handleUpdateLocation}
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

            {activeAdminTab === 'reports' && (
              <MonthlyReportView
                employees={employees}
                locations={locations}
                attendanceRecords={attendanceRecords}
                onOpenPrintMenu={handleOpenPrintMenu}
                onExecuteArchive={handleExecuteArchive}
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
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>
              Satuan Polisi Pamong Praja (Satpol PP) · Sistem Presensi GPS & Kunci Perangkat
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResetDemoData}
              className="text-slate-500 hover:text-amber-400 transition-colors"
            >
              Reset Data Bawaan (150 Pegawai)
            </button>
            <span>·</span>
            <span>Praja Wibawa</span>
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
