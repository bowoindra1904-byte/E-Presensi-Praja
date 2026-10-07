import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  getDoc,
  writeBatch,
  query,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { Employee, WorkLocation, AttendanceRecord, SecurityLog, LeaveRequest } from '../types';
import { INITIAL_EMPLOYEES } from '../data/initialEmployees';
import { INITIAL_WORK_LOCATIONS } from '../data/initialLocations';
import { generateInitialLeaveRequests } from '../data/initialAttendance';

// 1. Subscribe to Employees with auto-seed of 150 personnel only if never cleared
export function subscribeEmployees(onData: (employees: Employee[]) => void) {
  const employeesCol = collection(db, 'employees');
  
  return onSnapshot(employeesCol, async (snapshot) => {
    if (snapshot.empty) {
      if (localStorage.getItem('sipraja_employees_cleared') === 'true') {
        onData([]);
        return;
      }
      try {
        const seedStateSnap = await getDoc(doc(db, 'system_settings', 'seed_state'));
        if (seedStateSnap.exists() && seedStateSnap.data()?.employeesCleared === true) {
          localStorage.setItem('sipraja_employees_cleared', 'true');
          onData([]);
          return;
        }
      } catch (e) {
        console.error('Error checking seed_state:', e);
      }
      console.log('Firestore employees empty and not marked cleared. Seeding initial 150 employees...');
      await seedInitialEmployees();
      return;
    }

    const items: Employee[] = [];
    snapshot.forEach(docSnap => {
      items.push(docSnap.data() as Employee);
    });

    // Sort by id or numeric order
    items.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    onData(items);
  }, (err) => {
    console.error('Error subscribing to employees:', err);
  });
}

// 2. Subscribe to Work Locations with auto-seed and slot sync
export function subscribeLocations(onData: (locations: WorkLocation[]) => void) {
  const locationsCol = collection(db, 'locations');
  
  return onSnapshot(locationsCol, async (snapshot) => {
    if (snapshot.empty) {
      console.log('Firestore locations empty. Seeding initial locations...');
      await seedInitialLocations();
      return;
    }

    const items: WorkLocation[] = [];
    snapshot.forEach(docSnap => {
      items.push(docSnap.data() as WorkLocation);
    });

    items.sort((a, b) => (a.slotNumber || a.id) - (b.slotNumber || b.id));
    onData(items);
  }, (err) => {
    console.error('Error subscribing to locations:', err);
  });
}

// 3. Subscribe to Attendance Records (Only real records inputted by admin or users)
export function subscribeAttendance(onData: (records: AttendanceRecord[]) => void) {
  const attendanceCol = collection(db, 'attendance');
  
  return onSnapshot(attendanceCol, (snapshot) => {
    const items: AttendanceRecord[] = [];
    const sampleIdsToDelete: string[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as AttendanceRecord;
      // Filter out application default mock records (ATT-2026-xxx, ATT-HIST-xxx, ATT-SAMPLE-xxx)
      if (
        data.id && (
          data.id.startsWith('ATT-2026-') || 
          data.id.startsWith('ATT-HIST-') ||
          data.id.startsWith('ATT-SAMPLE-')
        )
      ) {
        sampleIdsToDelete.push(data.id);
      } else {
        items.push(data);
      }
    });

    // Asynchronously purge obsolete sample records from Firestore in background
    if (sampleIdsToDelete.length > 0) {
      const batch = writeBatch(db);
      sampleIdsToDelete.slice(0, 100).forEach(id => {
        batch.delete(doc(db, 'attendance', id));
      });
      batch.commit().catch(console.error);
    }

    // Sort newest first
    items.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.checkInTime || '00:00'}:00`).getTime();
      const timeB = new Date(`${b.date}T${b.checkInTime || '00:00'}:00`).getTime();
      return timeB - timeA;
    });

    onData(items);
  }, (err) => {
    console.error('Error subscribing to attendance:', err);
  });
}

// 4. Subscribe to Security Logs (Efficient query limit for bandwidth and read savings)
export function subscribeSecurityLogs(onData: (logs: SecurityLog[]) => void) {
  const logsCol = collection(db, 'security_logs');
  const logsQuery = query(logsCol, limit(200));
  
  return onSnapshot(logsQuery, (snapshot) => {
    const items: SecurityLog[] = [];
    snapshot.forEach(docSnap => {
      items.push(docSnap.data() as SecurityLog);
    });

    items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    onData(items);
  }, (err) => {
    console.error('Error subscribing to security logs:', err);
  });
}

// 5. Subscribe to Admin PIN
export function subscribeAdminPin(onData: (pin: string) => void) {
  const pinDocRef = doc(db, 'system_settings', 'admin_pin');
  
  return onSnapshot(pinDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.adminPin) {
        onData(data.adminPin);
      }
    }
  }, (err) => {
    console.error('Error subscribing to admin pin:', err);
  });
}

// 6. Subscribe to Leave Requests (Izin & Sakit) - Only real requests, sample dummy data purged
export function subscribeLeaveRequests(onData: (requests: LeaveRequest[]) => void) {
  const leaveCol = collection(db, 'leave_requests');
  
  return onSnapshot(leaveCol, async (snapshot) => {
    const items: LeaveRequest[] = [];
    const sampleIdsToDelete: string[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as LeaveRequest;
      // Filter out application default sample requests (LEAVE-REQ-xxx, LEAVE-SAMPLE-xxx)
      if (
        data.id && (
          data.id.startsWith('LEAVE-REQ-') ||
          data.id.startsWith('LEAVE-SAMPLE-') ||
          ['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(data.id)
        )
      ) {
        sampleIdsToDelete.push(data.id);
      } else {
        items.push(data);
      }
    });

    // Asynchronously delete obsolete sample requests from Firestore in background
    if (sampleIdsToDelete.length > 0) {
      const batch = writeBatch(db);
      sampleIdsToDelete.forEach(id => {
        batch.delete(doc(db, 'leave_requests', id));
      });
      batch.commit().catch(console.error);
    }

    // Sort newest application first
    items.sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
    onData(items);
  }, (err) => {
    console.error('Error subscribing to leave requests:', err);
  });
}

// Utility to strip all `undefined` fields recursively so Firestore never throws unsupported field value error
function cleanFirestoreData<T>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj));
}

// Mutators
export async function syncSaveEmployee(employee: Employee): Promise<void> {
  const docRef = doc(db, 'employees', employee.id);
  await setDoc(docRef, cleanFirestoreData(employee), { merge: true });
}

export async function syncDeleteEmployee(employeeId: string): Promise<void> {
  const docRef = doc(db, 'employees', employeeId);
  await deleteDoc(docRef);
}

export async function syncSaveLocation(location: WorkLocation): Promise<void> {
  const docRef = doc(db, 'locations', String(location.id));
  await setDoc(docRef, cleanFirestoreData(location), { merge: true });
}

export async function syncDeleteLocation(locationId: number | string): Promise<void> {
  const docRef = doc(db, 'locations', String(locationId));
  await deleteDoc(docRef);
}

export async function syncSaveAttendance(record: AttendanceRecord): Promise<void> {
  const docRef = doc(db, 'attendance', record.id);
  await setDoc(docRef, cleanFirestoreData(record), { merge: true });
}

export async function syncSaveSecurityLog(log: SecurityLog): Promise<void> {
  const docRef = doc(db, 'security_logs', log.id);
  await setDoc(docRef, cleanFirestoreData(log), { merge: true });
}

export async function syncSaveLeaveRequest(request: LeaveRequest): Promise<void> {
  const docRef = doc(db, 'leave_requests', request.id);
  await setDoc(docRef, cleanFirestoreData(request), { merge: true });
}

export async function syncDeleteLeaveRequest(requestId: string): Promise<void> {
  const docRef = doc(db, 'leave_requests', requestId);
  await deleteDoc(docRef);
}

export async function syncSaveAdminPin(newPin: string): Promise<void> {
  const docRef = doc(db, 'system_settings', 'admin_pin');
  await setDoc(docRef, { adminPin: newPin, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function syncArchiveAndCleanupAttendance(
  recordIds: string[], 
  mode: 'photos_only' | 'delete_all'
): Promise<void> {
  const batchSize = 400;
  for (let i = 0; i < recordIds.length; i += batchSize) {
    const chunk = recordIds.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      const docRef = doc(db, 'attendance', id);
      if (mode === 'delete_all') {
        batch.delete(docRef);
      } else {
        batch.update(docRef, {
          checkInPhoto: null,
          checkOutPhoto: null,
          notes: 'Foto presensi telah diarsipkan untuk efisiensi penyimpanan'
        });
      }
    }
    await batch.commit();
  }
}

// Seeding helpers
export async function seedInitialEmployees(): Promise<void> {
  const batchSize = 100;
  for (let i = 0; i < INITIAL_EMPLOYEES.length; i += batchSize) {
    const chunk = INITIAL_EMPLOYEES.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const emp of chunk) {
      const docRef = doc(db, 'employees', emp.id);
      batch.set(docRef, cleanFirestoreData(emp), { merge: true });
    }
    await batch.commit();
  }
}

export async function seedInitialLocations(): Promise<void> {
  const batch = writeBatch(db);
  for (const loc of INITIAL_WORK_LOCATIONS) {
    const docRef = doc(db, 'locations', String(loc.id));
    batch.set(docRef, cleanFirestoreData(loc), { merge: true });
  }
  await batch.commit();
}

export async function seedInitialLeaveRequests(): Promise<void> {
  const initial = generateInitialLeaveRequests();
  const batch = writeBatch(db);
  for (const req of initial) {
    const docRef = doc(db, 'leave_requests', req.id);
    batch.set(docRef, cleanFirestoreData(req), { merge: true });
  }
  await batch.commit();
}

export async function syncClearAllEmployees(employeeIds: string[]): Promise<void> {
  const batchSize = 400;
  for (let i = 0; i < employeeIds.length; i += batchSize) {
    const chunk = employeeIds.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(db, 'employees', id));
    }
    await batch.commit();
  }

  // Record permanent cleared state so default 150 employees never auto-seed back
  try {
    await setDoc(doc(db, 'system_settings', 'seed_state'), { 
      employeesCleared: true, 
      clearedAt: new Date().toISOString() 
    }, { merge: true });
    localStorage.setItem('sipraja_employees_cleared', 'true');
  } catch (e) {
    console.error('Error saving seed_state:', e);
  }
}

export async function syncSaveOfficeDispensation(
  record: AttendanceRecord, 
  leaveRequest: LeaveRequest
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'attendance', record.id), cleanFirestoreData(record), { merge: true });
  batch.set(doc(db, 'leave_requests', leaveRequest.id), cleanFirestoreData(leaveRequest), { merge: true });
  await batch.commit();
}

export async function syncClearLeaveRequests(requestIds: string[]): Promise<void> {
  const batchSize = 400;
  for (let i = 0; i < requestIds.length; i += batchSize) {
    const chunk = requestIds.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(db, 'leave_requests', id));
    }
    await batch.commit();
  }
}
