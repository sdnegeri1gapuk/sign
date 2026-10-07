import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SignatureTemplate } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on initialization
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Please check network connection.');
    }
  }
}
testConnection();

// Section 3: Structured Error Handling conforming to FirestoreErrorInfo
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Auth Helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Google Sign-in failed', err);
    throw err;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Firestore Signatures Collection Operations
const SIGNATURES_COLLECTION = 'signatures';

/**
 * Fetch all signatures from Cloud Firestore
 */
export async function getAllSignaturesFromFirestore(): Promise<SignatureTemplate[]> {
  try {
    const querySnapshot = await getDocs(collection(db, SIGNATURES_COLLECTION));
    const list: SignatureTemplate[] = [];
    querySnapshot.forEach((d) => {
      list.push(d.data() as SignatureTemplate);
    });
    // Sort descending by createdAt
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SIGNATURES_COLLECTION);
    return [];
  }
}

/**
 * Save signature to Cloud Firestore
 */
export async function saveSignatureToFirestore(sig: SignatureTemplate): Promise<void> {
  const docPath = `${SIGNATURES_COLLECTION}/${sig.id}`;
  try {
    const payload: any = {
      id: sig.id,
      title: sig.title,
      dataUrl: sig.dataUrl,
      createdAt: sig.createdAt || Date.now(),
      type: sig.type || 'upload',
    };
    if (auth.currentUser?.uid) {
      payload.userId = auth.currentUser.uid;
    }
    await setDoc(doc(db, SIGNATURES_COLLECTION, sig.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Save multiple signatures to Cloud Firestore
 */
export async function saveMultipleSignaturesToFirestore(sigs: SignatureTemplate[]): Promise<void> {
  for (const sig of sigs) {
    await saveSignatureToFirestore(sig);
  }
}

/**
 * Delete signature from Cloud Firestore
 */
export async function deleteSignatureFromFirestore(id: string): Promise<void> {
  const docPath = `${SIGNATURES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, SIGNATURES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Real-time listener for signatures from Cloud Firestore
 */
export function subscribeToSignaturesFromFirestore(
  onData: (signatures: SignatureTemplate[]) => void,
  onError?: (err: any) => void
): () => void {
  const unsubscribe = onSnapshot(
    collection(db, SIGNATURES_COLLECTION),
    (snapshot) => {
      const list: SignatureTemplate[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as SignatureTemplate);
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(list);
    },
    (error) => {
      console.warn('Realtime snapshot notice:', error);
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, SIGNATURES_COLLECTION);
    }
  );
  return unsubscribe;
}
