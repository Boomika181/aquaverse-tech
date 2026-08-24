import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  updateDoc, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './config';
import { UserProfile, WaterPrediction, ContactMessage, UploadedReport } from '../types';

export async function uploadReportEvidence(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const storagePath = `evidence/${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * --- User Profiles ---
 */

// Create or update user profile in Firestore
export async function createUserProfile(uid: string, email: string, displayName: string, role: 'admin' | 'citizen'): Promise<UserProfile> {
  const profile: UserProfile = {
    uid,
    email: email.trim().toLowerCase(),
    displayName: displayName || email.split('@')[0],
    name: displayName || email.split('@')[0],
    role,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, profile, { merge: true });
    console.log('[PROFILE CREATE SUCCESS] UID:', uid, 'Role:', role);
    return profile;
  } catch (error: any) {
    console.error('[PROFILE CREATE WARNING] UID:', uid, 'Code:', error?.code || 'UNKNOWN', 'Message:', error?.message || String(error));
    return profile; // Return in-memory profile so auth session remains functional
  }
}

// Update last login timestamp for existing user
export async function updateUserLastLogin(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
  } catch (error) {
    console.warn("Failed to update last login timestamp:", error);
  }
}

// Get user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      console.log('[PROFILE READ SUCCESS] UID:', uid, 'Role:', data.role);
      return data;
    }
    console.log('[PROFILE READ NULL] UID:', uid, '- Profile document does not exist in Firestore.');
    return null;
  } catch (error: any) {
    console.error('[PROFILE READ FAILURE] UID:', uid, 'Code:', error?.code || 'permission-denied', 'Message:', error?.message || String(error));
    return null;
  }
}

// Get all users (Admin only)
export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const users: UserProfile[] = [];
    snap.forEach(doc => {
      users.push(doc.data() as UserProfile);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Update user profile details
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete user profile (Admin only)
export async function deleteUserProfile(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


/**
 * --- Predictions Log ---
 */

// Save water safety prediction to Firestore
export async function savePrediction(prediction: Omit<WaterPrediction, 'id' | 'timestamp'>): Promise<string> {
  const path = 'predictions';
  try {
    const predictionsRef = collection(db, 'predictions');
    const docRef = await addDoc(predictionsRef, {
      ...prediction,
      userId: prediction.userId,
      uid: prediction.userId,
      prediction: prediction.result,
      result: prediction.result,
      confidence: prediction.confidence,
      quality: prediction.result === 'safe' ? 'safe' : 'unsafe',
      inputs: prediction.inputs,
      inputData: prediction.inputs,
      
      // all water chemistry values at root level
      ph: prediction.inputs.ph,
      hardness: prediction.inputs.hardness,
      solids: prediction.inputs.solids,
      chloramines: prediction.inputs.chloramines,
      sulfate: prediction.inputs.sulfate,
      conductivity: prediction.inputs.conductivity,
      organicCarbon: prediction.inputs.organicCarbon,
      trihalomethanes: prediction.inputs.trihalomethanes,
      turbidity: prediction.inputs.turbidity,
      
      // location and coordinates
      location: prediction.locationName || prediction.location || "Yelahanka, Bangalore",
      locationName: prediction.locationName || prediction.location || "Yelahanka, Bangalore",
      latitude: prediction.latitude !== undefined ? prediction.latitude : 12.9716,
      longitude: prediction.longitude !== undefined ? prediction.longitude : 77.5946,
      timestamp: serverTimestamp()
    });
    
    // Log activity (non-blocking for core prediction save)
    try {
      await logActivity(prediction.userId, prediction.userEmail, `Created water quality prediction. Result: ${prediction.result.toUpperCase()}`);
    } catch (logErr) {
      console.warn('Activity log notice:', logErr);
    }
    
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Get predictions for a specific user
export async function getUserPredictions(userId: string): Promise<WaterPrediction[]> {
  const path = 'predictions';
  try {
    const predictionsRef = collection(db, 'predictions');
    const q = query(
      predictionsRef, 
      where('userId', '==', userId)
    );
    
    const snap = await getDocs(q);
    const predictions: WaterPrediction[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      predictions.push({ id: doc.id, ...data } as WaterPrediction);
    });

    // Chronological sorting (newest first)
    predictions.sort((a, b) => {
      const timeA = a.timestamp?.seconds || (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0);
      const timeB = b.timestamp?.seconds || (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0);
      return timeB - timeA;
    });

    return predictions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Get all predictions (Admin only)
export async function getAllPredictions(): Promise<WaterPrediction[]> {
  const path = 'predictions';
  try {
    const predictionsRef = collection(db, 'predictions');
    const q = query(predictionsRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const predictions: WaterPrediction[] = [];
    snap.forEach(doc => {
      predictions.push({ id: doc.id, ...doc.data() } as WaterPrediction);
    });
    return predictions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Delete a prediction log (Admin only)
export async function deletePrediction(id: string): Promise<void> {
  const path = `predictions/${id}`;
  try {
    await deleteDoc(doc(db, 'predictions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


/**
 * --- Contact Messages ---
 */

// Save contact message
export async function saveContactMessage(message: Omit<ContactMessage, 'id' | 'timestamp' | 'status'>): Promise<string> {
  const path = 'contactMessages';
  try {
    const messagesRef = collection(db, 'contactMessages');
    const docRef = await addDoc(messagesRef, {
      ...message,
      userId: auth.currentUser?.uid || message.userId || "guest",
      userEmail: auth.currentUser?.email || message.email,
      uid: auth.currentUser?.uid || message.userId || "guest",
      status: 'Pending',
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Get contact messages for a specific user
export async function getUserContactMessages(userId: string): Promise<ContactMessage[]> {
  const path = 'contactMessages';
  try {
    const messagesRef = collection(db, 'contactMessages');
    const q = query(messagesRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const messages: ContactMessage[] = [];
    snap.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() } as ContactMessage);
    });
    messages.sort((a, b) => {
      const timeA = a.timestamp?.seconds || (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0);
      const timeB = b.timestamp?.seconds || (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0);
      return timeB - timeA;
    });
    return messages;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Get all contact messages (Admin only)
export async function getAllContactMessages(): Promise<ContactMessage[]> {
  const path = 'contactMessages';
  try {
    const messagesRef = collection(db, 'contactMessages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const messages: ContactMessage[] = [];
    snap.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() } as ContactMessage);
    });
    return messages;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Update status on contact message (Admin only)
export async function updateMessageStatus(id: string, status: string): Promise<void> {
  const path = `contactMessages/${id}`;
  try {
    const msgRef = doc(db, 'contactMessages', id);
    await updateDoc(msgRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete contact message (Admin only)
export async function deleteContactMessage(id: string): Promise<void> {
  const path = `contactMessages/${id}`;
  try {
    await deleteDoc(doc(db, 'contactMessages', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


/**
 * --- Community Reports ---
 */

// Submit a community report (citizens can submit, including file uploads)
export async function submitReport(report: Omit<UploadedReport, 'id' | 'timestamp' | 'status'>): Promise<string> {
  const path = 'uploadedReports';
  try {
    const reportsRef = collection(db, 'uploadedReports');
    const docRef = await addDoc(reportsRef, {
      ...report,
      status: 'Pending',
      timestamp: serverTimestamp()
    });
    
    try {
      await logActivity(report.userId, report.userEmail, `Submitted water report: "${report.title}"`);
    } catch (logErr) {
      console.warn("Activity log skipped:", logErr);
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Get reports for a user
export async function getUserReports(userId: string): Promise<UploadedReport[]> {
  const path = 'uploadedReports';
  try {
    const reportsRef = collection(db, 'uploadedReports');
    const q = query(reportsRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const reports: UploadedReport[] = [];
    snap.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() } as UploadedReport);
    });
    reports.sort((a, b) => {
      const timeA = a.timestamp?.seconds || (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0);
      const timeB = b.timestamp?.seconds || (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0);
      return timeB - timeA;
    });
    return reports;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Get all uploaded reports (Admin sees all)
export async function getAllReports(): Promise<UploadedReport[]> {
  const path = 'uploadedReports';
  try {
    const reportsRef = collection(db, 'uploadedReports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const reports: UploadedReport[] = [];
    snap.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() } as UploadedReport);
    });
    return reports;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Update report status (Admin only)
export async function updateReportStatus(id: string, status: string): Promise<void> {
  const path = `uploadedReports/${id}`;
  try {
    const reportRef = doc(db, 'uploadedReports', id);
    await updateDoc(reportRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete report (Admin only)
export async function deleteReport(id: string): Promise<void> {
  const path = `uploadedReports/${id}`;
  try {
    await deleteDoc(doc(db, 'uploadedReports', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


/**
 * --- Activity Logs ---
 */

export async function logActivity(userId: string, userEmail: string, action: string): Promise<void> {
  const path = 'activityLogs';
  try {
    const logsRef = collection(db, 'activityLogs');
    await addDoc(logsRef, {
      userId,
      userEmail,
      action,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Non-blocking log, but let's log the error
    console.warn("Failed to save activity log:", error);
  }
}

export async function getAllActivityLogs(limitCount = 50): Promise<any[]> {
  const path = 'activityLogs';
  try {
    const logsRef = collection(db, 'activityLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    const logs: any[] = [];
    snap.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
