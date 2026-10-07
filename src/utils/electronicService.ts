import QRCode from 'qrcode';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { VerifiedDocument, VerificationLog, DocumentStatus } from '../types';

const VERIFIED_DOCS_COLLECTION = 'verified_documents';
const VERIFICATION_LOGS_COLLECTION = 'verification_logs';
const LOCAL_STORAGE_KEY = 'signpdf_verified_documents_cache';

/**
 * Generate a cryptographically random, unpredictable 10-character uppercase alphanumeric token.
 * Example: '8F7A92KX31'
 */
export function generateUniqueToken(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like 0, O, 1, I
  let token = '';
  const cryptoObj = window.crypto || (window as any).msCrypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint8Array(10);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < 10; i++) {
      token += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return token;
}

/**
 * Constructs the canonical public verification URL.
 * Works on any origin, custom domain, GitHub Pages subpaths, or cloud run.
 * Both Hash (#/verifikasi/TOKEN) and query (?v=TOKEN) are supported.
 */
export function generateVerificationUrl(token: string): string {
  if (typeof window === 'undefined') return `/verifikasi/${token}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname.replace(/\/+$/, '');
  // Using hash routing guarantees compatibility with static hosts like GitHub Pages
  return `${origin}${pathname}/#/verifikasi/${token}`;
}

/**
 * Generates a high-resolution, high-contrast QR Code with Error Correction Level 'H'
 * and safe quiet-zone border.
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 600,
    color: {
      dark: '#0f172a', // Deep slate for sharp ink scan
      light: '#ffffff'
    }
  });
}

// -------------------------------------------------------------
// Local Storage Cache Helpers
// -------------------------------------------------------------

function getLocalCache(): Record<string, VerifiedDocument> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setLocalCache(token: string, docData: VerifiedDocument) {
  try {
    const cache = getLocalCache();
    cache[token] = docData;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('LocalStorage save error', e);
  }
}

// -------------------------------------------------------------
// Firestore Database Operations
// -------------------------------------------------------------

/**
 * Removes any undefined properties so Firestore doesn't reject them with
 * "Unsupported field value: undefined" errors.
 */
function cleanForFirestore(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Saves a finalized verified document to Cloud Firestore
 */
export async function saveVerifiedDocument(docData: VerifiedDocument): Promise<void> {
  // Normalize googleDriveUrl to empty string instead of undefined
  const normalizedDoc: VerifiedDocument = {
    ...docData,
    googleDriveUrl: (docData.googleDriveUrl || '').trim()
  };

  // Update local cache immediately
  setLocalCache(normalizedDoc.verificationToken, normalizedDoc);

  const docPath = `${VERIFIED_DOCS_COLLECTION}/${normalizedDoc.verificationToken}`;
  try {
    const payload = cleanForFirestore({
      ...normalizedDoc,
      updatedAt: Date.now()
    });
    await setDoc(doc(db, VERIFIED_DOCS_COLLECTION, normalizedDoc.verificationToken), payload);
  } catch (err) {
    console.warn('Failed to save to Firestore, cached locally:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } catch (fsErr) {
      // Don't crash user workflow if local cache saved successfully
      console.error('Firestore save failed, fallback to local cache:', fsErr);
    }
  }
}

/**
 * Fetch a verified document by verificationToken or legacyBarcodeUrl (public query, no auth needed)
 */
export async function getVerifiedDocumentByToken(token: string): Promise<VerifiedDocument | null> {
  const cleanRaw = token.trim();
  if (!cleanRaw) return null;
  const cleanToken = cleanRaw.toUpperCase();

  try {
    const docRef = doc(db, VERIFIED_DOCS_COLLECTION, cleanToken);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as VerifiedDocument;
      setLocalCache(cleanToken, data);
      return data;
    }
  } catch (err) {
    console.warn('Firestore fetch failed, checking local cache:', err);
  }

  // Fallback to local cache if direct token lookup matches
  const cached = getLocalCache();
  if (cached[cleanToken]) {
    return cached[cleanToken];
  }

  // Look across all cached and Firestore documents for matching legacyBarcodeUrl or token
  try {
    const allDocs = await getAllVerifiedDocuments();
    const matched = allDocs.find((docItem) => {
      if (docItem.verificationToken.toUpperCase() === cleanToken) return true;
      if (docItem.legacyBarcodeUrl) {
        const legacy = docItem.legacyBarcodeUrl.trim();
        if (legacy === cleanRaw) return true;
        if (legacy.toLowerCase() === cleanRaw.toLowerCase()) return true;
        // If query is contained in legacy URL or legacy URL is contained in query
        if (legacy.includes(cleanRaw) || cleanRaw.includes(legacy)) return true;
        // Check if query token is in the legacy URL pathname
        try {
          const parsed = new URL(legacy);
          if (parsed.pathname.includes(cleanRaw) || parsed.search.includes(cleanRaw)) return true;
        } catch {
          // not a full url
        }
      }
      return false;
    });

    if (matched) {
      return matched;
    }
  } catch (e) {
    console.warn('Error during legacy barcode search:', e);
  }

  return null;
}

/**
 * Fetch all verified documents for the admin list / saved docs table
 */
export async function getAllVerifiedDocuments(): Promise<VerifiedDocument[]> {
  const list: VerifiedDocument[] = [];
  try {
    const snap = await getDocs(collection(db, VERIFIED_DOCS_COLLECTION));
    snap.forEach((d) => {
      const item = d.data() as VerifiedDocument;
      list.push(item);
      setLocalCache(item.verificationToken, item);
    });
  } catch (err) {
    console.warn('Failed to fetch from Firestore, using local cache:', err);
    const cached = getLocalCache();
    list.push(...Object.values(cached));
  }

  // Sort descending by createdAt
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

/**
 * Revoke a document's validity status
 */
export async function revokeDocument(token: string, reason = 'Dicabut oleh instansi penerbit'): Promise<void> {
  const docPath = `${VERIFIED_DOCS_COLLECTION}/${token}`;
  const now = Date.now();

  // Update local cache
  const cached = getLocalCache();
  if (cached[token]) {
    cached[token].status = 'DICABUT';
    cached[token].revokedAt = now;
    cached[token].revokedReason = reason;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
  }

  try {
    await updateDoc(doc(db, VERIFIED_DOCS_COLLECTION, token), {
      status: 'DICABUT' as DocumentStatus,
      revokedAt: now,
      revokedReason: reason,
      updatedAt: now
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

/**
 * Update document details, especially Google Drive URL and metadata
 */
export async function updateVerifiedDocument(
  token: string,
  partial: Partial<VerifiedDocument>
): Promise<void> {
  const docPath = `${VERIFIED_DOCS_COLLECTION}/${token}`;
  const now = Date.now();

  const normalizedPartial: Record<string, any> = { ...partial };
  if ('googleDriveUrl' in normalizedPartial) {
    normalizedPartial.googleDriveUrl = (normalizedPartial.googleDriveUrl || '').trim();
  }

  // Update local cache
  const cached = getLocalCache();
  if (cached[token]) {
    cached[token] = { ...cached[token], ...normalizedPartial, updatedAt: now };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
  }

  try {
    const payload = cleanForFirestore({
      ...normalizedPartial,
      updatedAt: now
    });
    await updateDoc(doc(db, VERIFIED_DOCS_COLLECTION, token), payload);
  } catch (err) {
    console.warn('Firestore update failed, cached locally:', err);
    try {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    } catch (fsErr) {
      console.error('Firestore update error, fallback to local cache:', fsErr);
    }
  }
}

/**
 * Permanently delete a verified document from Firestore and local cache
 */
export async function deleteVerifiedDocument(token: string): Promise<void> {
  const docPath = `${VERIFIED_DOCS_COLLECTION}/${token}`;

  // Remove from local cache
  const cached = getLocalCache();
  if (cached[token]) {
    delete cached[token];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
  }

  try {
    await deleteDoc(doc(db, VERIFIED_DOCS_COLLECTION, token));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

/**
 * Record a public verification scan event & increment verificationCount
 */
export async function recordVerificationScan(token: string, documentId: string): Promise<void> {
  const now = Date.now();
  const logId = `log_${token}_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const logPath = `${VERIFICATION_LOGS_COLLECTION}/${logId}`;

  // 1. Increment document counter
  try {
    await updateDoc(doc(db, VERIFIED_DOCS_COLLECTION, token), {
      verificationCount: increment(1),
      updatedAt: now
    });
  } catch (e) {
    console.warn('Could not increment verification count:', e);
  }

  // 2. Add audit log
  try {
    const logData: VerificationLog = {
      id: logId,
      verificationToken: token,
      documentId,
      timestamp: now,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 250) : 'unknown'
    };
    await setDoc(doc(db, VERIFICATION_LOGS_COLLECTION, logId), logData);
  } catch (err) {
    console.warn('Could not record verification log:', err);
  }
}

/**
 * Subscribe in real time to verified documents
 */
export function subscribeToVerifiedDocuments(
  onData: (docs: VerifiedDocument[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, VERIFIED_DOCS_COLLECTION),
      (snap) => {
        const list: VerifiedDocument[] = [];
        snap.forEach((d) => {
          const item = d.data() as VerifiedDocument;
          list.push(item);
          setLocalCache(item.verificationToken, item);
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onData(list);
      },
      (err) => {
        console.warn('Snapshot error on verified_documents:', err);
        onError?.(err);
      }
    );
    return unsub;
  } catch (e) {
    console.warn('Failed to subscribe:', e);
    return () => {};
  }
}
