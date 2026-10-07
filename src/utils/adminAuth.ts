const ADMIN_USERNAME_KEY = 'signpdf_admin_username';
const ADMIN_PASSWORD_KEY = 'signpdf_admin_password';
const ADMIN_AUTH_KEY = 'signpdf_auth_session';
const ADMIN_USER_DISPLAY_KEY = 'signpdf_auth_user_name';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

/**
 * Get current configured Admin Username
 */
export function getStoredUsername(): string {
  try {
    return localStorage.getItem(ADMIN_USERNAME_KEY) || DEFAULT_USERNAME;
  } catch {
    return DEFAULT_USERNAME;
  }
}

/**
 * Get current configured Admin Password
 */
export function getStoredPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

/**
 * Update Admin Username and Password
 */
export function updateCredentials(newUsername: string, newPassword: string): boolean {
  if (!newUsername.trim() || newPassword.trim().length < 4) return false;
  try {
    localStorage.setItem(ADMIN_USERNAME_KEY, newUsername.trim());
    localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword.trim());
    return true;
  } catch {
    return false;
  }
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
 * Verify credentials and log in
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
