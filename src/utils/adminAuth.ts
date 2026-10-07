const ADMIN_PIN_KEY = 'signpdf_admin_pin';
const ADMIN_SESSION_KEY = 'signpdf_admin_authenticated';
const DEFAULT_PIN = '1234';

/**
 * Get current configured Admin PIN
 */
export function getAdminPin(): string {
  try {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

/**
 * Update the Admin PIN
 */
export function setAdminPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 4) return false;
  try {
    localStorage.setItem(ADMIN_PIN_KEY, newPin.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the current browser session is authenticated as Admin
 */
export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Authenticate with PIN
 */
export function verifyAndLoginAdmin(inputPin: string): boolean {
  const currentPin = getAdminPin();
  if (inputPin.trim() === currentPin) {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } catch {
      // Fallback
    }
    return true;
  }
  return false;
}

/**
 * Logout admin session
 */
export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    //
  }
}
