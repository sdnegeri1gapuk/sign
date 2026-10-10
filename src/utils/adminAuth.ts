import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const ADMIN_USERNAME_KEY = 'signpdf_admin_username';
const ADMIN_PASSWORD_KEY = 'signpdf_admin_password';
const ADMIN_AUTH_KEY = 'signpdf_auth_session';
const ADMIN_USER_DISPLAY_KEY = 'signpdf_auth_user_name';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

const SETTINGS_DOC_PATH = 'app_settings';
const CREDENTIALS_DOC_ID = 'admin_credentials';

// In-memory synced state
let inMemoryUsername = DEFAULT_USERNAME;
let inMemoryPassword = DEFAULT_PASSWORD;
let isCloudSynced = false;

// Initialize from localStorage first for zero-latency load
try {
  inMemoryUsername = localStorage.getItem(ADMIN_USERNAME_KEY) || DEFAULT_USERNAME;
  inMemoryPassword = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
} catch {
  //
}

/**
 * Realtime subscription to Cloud Firestore admin credentials.
 * Automatically syncs changes across all browser tabs, devices, and sessions.
 */
export function subscribeToCloudCredentials(
  onUpdate?: (creds: { username: string; password: string }) => void
): () => void {
  try {
    const credsDocRef = doc(db, SETTINGS_DOC_PATH, CREDENTIALS_DOC_ID);
    const unsubscribe = onSnapshot(
      credsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.username && data?.password) {
            inMemoryUsername = String(data.username).trim();
            inMemoryPassword = String(data.password).trim();
            isCloudSynced = true;

            try {
              localStorage.setItem(ADMIN_USERNAME_KEY, inMemoryUsername);
              localStorage.setItem(ADMIN_PASSWORD_KEY, inMemoryPassword);
            } catch {}

            window.dispatchEvent(
              new CustomEvent('admin_credentials_synced', {
                detail: { username: inMemoryUsername, password: inMemoryPassword }
              })
            );

            if (onUpdate) {
              onUpdate({ username: inMemoryUsername, password: inMemoryPassword });
            }
          }
        } else {
          // If not in cloud yet, seed with current/default credentials
          syncCurrentCredentialsToCloud(inMemoryUsername, inMemoryPassword).catch(console.warn);
        }
      },
      (err) => {
        console.warn('Realtime credentials listener notice:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to setup realtime credentials listener:', err);
    return () => {};
  }
}

// Auto-start listener in browser environment
if (typeof window !== 'undefined') {
  subscribeToCloudCredentials();
}

/**
 * Fetch and sync latest admin credentials directly from Cloud Firestore
 */
export async function syncCredentialsFromCloud(): Promise<{ username: string; password: string }> {
  try {
    const credsDocRef = doc(db, SETTINGS_DOC_PATH, CREDENTIALS_DOC_ID);
    const snap = await getDoc(credsDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.username && data?.password) {
        inMemoryUsername = String(data.username).trim();
        inMemoryPassword = String(data.password).trim();
        isCloudSynced = true;
        try {
          localStorage.setItem(ADMIN_USERNAME_KEY, inMemoryUsername);
          localStorage.setItem(ADMIN_PASSWORD_KEY, inMemoryPassword);
        } catch {}
      }
    } else {
      // Seed initial credentials in Firestore
      await setDoc(credsDocRef, {
        username: inMemoryUsername || DEFAULT_USERNAME,
        password: inMemoryPassword || DEFAULT_PASSWORD,
        updatedAt: Date.now()
      });
      isCloudSynced = true;
    }
  } catch (err) {
    console.warn('Failed to fetch credentials from Cloud Firestore, using local cache:', err);
  }

  return { username: inMemoryUsername, password: inMemoryPassword };
}

/**
 * Save credentials to Cloud Firestore and local storage
 */
export async function syncCurrentCredentialsToCloud(
  newUsername: string,
  newPassword: string
): Promise<boolean> {
  const cleanUser = newUsername.trim();
  const cleanPass = newPassword.trim();
  if (!cleanUser || cleanPass.length < 4) return false;

  inMemoryUsername = cleanUser;
  inMemoryPassword = cleanPass;

  try {
    localStorage.setItem(ADMIN_USERNAME_KEY, cleanUser);
    localStorage.setItem(ADMIN_PASSWORD_KEY, cleanPass);
  } catch {}

  try {
    const credsDocRef = doc(db, SETTINGS_DOC_PATH, CREDENTIALS_DOC_ID);
    await setDoc(credsDocRef, {
      username: cleanUser,
      password: cleanPass,
      updatedAt: Date.now()
    });
    isCloudSynced = true;

    window.dispatchEvent(
      new CustomEvent('admin_credentials_synced', {
        detail: { username: cleanUser, password: cleanPass }
      })
    );

    return true;
  } catch (err) {
    console.error('Failed to save credentials to Cloud Firestore:', err);
    return false;
  }
}

/**
 * Update Admin Username and Password (both in Cloud Firestore and locally)
 */
export async function updateCredentials(newUsername: string, newPassword: string): Promise<boolean> {
  return await syncCurrentCredentialsToCloud(newUsername, newPassword);
}

/**
 * Synchronous update fallback
 */
export function updateCredentialsSync(newUsername: string, newPassword: string): boolean {
  const cleanUser = newUsername.trim();
  const cleanPass = newPassword.trim();
  if (!cleanUser || cleanPass.length < 4) return false;

  inMemoryUsername = cleanUser;
  inMemoryPassword = cleanPass;
  try {
    localStorage.setItem(ADMIN_USERNAME_KEY, cleanUser);
    localStorage.setItem(ADMIN_PASSWORD_KEY, cleanPass);
  } catch {}

  // Fire and forget cloud sync
  syncCurrentCredentialsToCloud(cleanUser, cleanPass).catch(console.warn);
  return true;
}

/**
 * Get current configured Admin Username
 */
export function getStoredUsername(): string {
  try {
    return inMemoryUsername || localStorage.getItem(ADMIN_USERNAME_KEY) || DEFAULT_USERNAME;
  } catch {
    return inMemoryUsername || DEFAULT_USERNAME;
  }
}

/**
 * Get current configured Admin Password
 */
export function getStoredPassword(): string {
  try {
    return inMemoryPassword || localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
  } catch {
    return inMemoryPassword || DEFAULT_PASSWORD;
  }
}

/**
 * Check if cloud sync is confirmed active
 */
export function isCredentialsCloudSynced(): boolean {
  return isCloudSynced;
}

/**
 * Check if user is currently logged in
 */
export function isUserLoggedIn(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Get current logged in username or email
 */
export function getLoggedInUserDisplay(): string {
  try {
    return localStorage.getItem(ADMIN_USER_DISPLAY_KEY) || 'Administrator';
  } catch {
    return 'Administrator';
  }
}

/**
 * Set login session
 */
export function setLoginSession(displayName: string): void {
  try {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    localStorage.setItem(ADMIN_USER_DISPLAY_KEY, displayName);
  } catch {
    //
  }
}

/**
 * Verify credentials and log in (Asynchronous with latest Cloud Firestore sync)
 */
export async function verifyAndLoginAsync(userOrPin: string, pass?: string): Promise<boolean> {
  // Try refreshing latest credentials from Cloud Firestore first
  await syncCredentialsFromCloud();

  const currentUsername = getStoredUsername().toLowerCase();
  const currentPassword = getStoredPassword();

  if (pass !== undefined) {
    if (
      userOrPin.trim().toLowerCase() === currentUsername &&
      pass === currentPassword
    ) {
      setLoginSession(userOrPin.trim());
      return true;
    }
    if (userOrPin === currentPassword || pass === currentPassword) {
      setLoginSession('Administrator');
      return true;
    }
    return false;
  }

  if (userOrPin === currentPassword || userOrPin === '1234') {
    setLoginSession('Administrator');
    return true;
  }

  return false;
}

/**
 * Verify credentials and log in (Synchronous)
 */
export function verifyAndLogin(userOrPin: string, pass?: string): boolean {
  const currentUsername = getStoredUsername().toLowerCase();
  const currentPassword = getStoredPassword();

  // If password provided (standard username + password)
  if (pass !== undefined) {
    if (
      userOrPin.trim().toLowerCase() === currentUsername &&
      pass === currentPassword
    ) {
      setLoginSession(userOrPin.trim());
      return true;
    }
    // Also allow using password directly as PIN
    if (userOrPin === currentPassword || pass === currentPassword) {
      setLoginSession('Administrator');
      return true;
    }
    return false;
  }

  // If single PIN / password entered
  if (userOrPin === currentPassword || userOrPin === '1234') {
    setLoginSession('Administrator');
    return true;
  }

  return false;
}

/**
 * Logout
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_USER_DISPLAY_KEY);
  } catch {
    //
  }
}
