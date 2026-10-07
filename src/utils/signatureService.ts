import { SignatureTemplate } from '../types';
import { getDefaultSignaturesList } from './defaultSignatures';
import {
  getAllSignaturesFromFirestore,
  saveSignatureToFirestore,
  saveMultipleSignaturesToFirestore,
  deleteSignatureFromFirestore,
  subscribeToSignaturesFromFirestore
} from './firebase';
import {
  getAllSignaturesFromDB,
  saveSignatureToDB,
  saveMultipleSignaturesToDB,
  deleteSignatureFromDB
} from './indexedDb';

/**
 * Loads signatures from Cloud Firestore with IndexedDB fallback/cache.
 * If Firestore is empty, seeds the 10 official signatures to Cloud Firestore!
 */
export async function loadSignatures(): Promise<SignatureTemplate[]> {
  try {
    // 1. Try to fetch from Cloud Firestore
    const cloudSignatures = await getAllSignaturesFromFirestore();

    if (cloudSignatures && cloudSignatures.length > 0) {
      // Sync local cache
      await saveMultipleSignaturesToDB(cloudSignatures);
      return cloudSignatures;
    }

    // 2. If Cloud Firestore is empty, seed with the 10 official signatures
    const defaults = getDefaultSignaturesList();
    await saveMultipleSignaturesToFirestore(defaults);
    await saveMultipleSignaturesToDB(defaults);
    return defaults;
  } catch (err) {
    console.warn('Failed to load from Cloud Firestore, falling back to local IndexedDB', err);
    // Fallback to local IndexedDB
    const local = await getAllSignaturesFromDB();
    if (local && local.length > 0) return local;
    return getDefaultSignaturesList();
  }
}

/**
 * Saves signature to Cloud Firestore and local IndexedDB
 */
export async function saveSignatureOnline(sig: SignatureTemplate): Promise<void> {
  // Save local first for instant UI response
  await saveSignatureToDB(sig);

  // Sync to Cloud Firestore so it's accessible anywhere
  try {
    await saveSignatureToFirestore(sig);
  } catch (err) {
    console.error('Failed to sync signature to Cloud Firestore:', err);
  }
}

/**
 * Saves multiple signatures to Cloud Firestore and IndexedDB
 */
export async function saveMultipleSignaturesOnline(sigs: SignatureTemplate[]): Promise<void> {
  await saveMultipleSignaturesToDB(sigs);
  try {
    await saveMultipleSignaturesToFirestore(sigs);
  } catch (err) {
    console.error('Failed to sync multiple signatures to Cloud Firestore:', err);
  }
}

/**
 * Deletes signature from Cloud Firestore and local IndexedDB
 */
export async function deleteSignatureOnline(id: string): Promise<void> {
  await deleteSignatureFromDB(id);
  try {
    await deleteSignatureFromFirestore(id);
  } catch (err) {
    console.error('Failed to delete signature from Cloud Firestore:', err);
  }
}

/**
 * Subscribes to real-time Cloud Firestore updates
 */
export function subscribeToOnlineSignatures(
  onUpdate: (signatures: SignatureTemplate[]) => void
): () => void {
  return subscribeToSignaturesFromFirestore(
    (cloudList) => {
      if (cloudList && cloudList.length > 0) {
        onUpdate(cloudList);
        // update local cache in background
        saveMultipleSignaturesToDB(cloudList).catch(() => {});
      }
    },
    (err) => {
      console.warn('Cloud realtime subscription warning:', err);
    }
  );
}
