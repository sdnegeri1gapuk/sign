/**
 * Utility for persisting and retrieving organizational settings
 * (Instansi, Pejabat Penandatangan, Jabatan, Hak Akses Publik)
 */

export type QrLogoType = 'kemdikbud' | 'garuda' | 'bsre' | 'custom';

export interface AppSettings {
  issuer: string;
  signerName: string;
  signerPosition: string;
  allowPublicView: boolean;
  allowPublicDownload: boolean;
  qrLogoEnabled: boolean; // Menampilkan logo resmi/kustom di tengah barcode
  qrLogoType: QrLogoType; // 'kemdikbud' | 'garuda' | 'bsre' | 'custom'
  qrCustomLogoDataUrl?: string; // Data URL logo kustom sekolah/instansi
}

const SETTINGS_KEY = 'verifikasi_app_settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  issuer: 'SD Negeri 1 Gapuk',
  signerName: 'H. Masrun, S.Pd',
  signerPosition: 'Kepala Sekolah',
  allowPublicView: true,
  allowPublicDownload: true,
  qrLogoEnabled: true,
  qrLogoType: 'kemdikbud',
  qrCustomLogoDataUrl: ''
};

/**
 * Get the current application settings
 */
export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      issuer: (parsed.issuer || DEFAULT_APP_SETTINGS.issuer).trim(),
      signerName: (parsed.signerName || DEFAULT_APP_SETTINGS.signerName).trim(),
      signerPosition: (parsed.signerPosition || DEFAULT_APP_SETTINGS.signerPosition).trim(),
      allowPublicView: typeof parsed.allowPublicView === 'boolean' ? parsed.allowPublicView : DEFAULT_APP_SETTINGS.allowPublicView,
      allowPublicDownload: typeof parsed.allowPublicDownload === 'boolean' ? parsed.allowPublicDownload : DEFAULT_APP_SETTINGS.allowPublicDownload,
      qrLogoEnabled: typeof parsed.qrLogoEnabled === 'boolean' ? parsed.qrLogoEnabled : DEFAULT_APP_SETTINGS.qrLogoEnabled,
      qrLogoType: parsed.qrLogoType || DEFAULT_APP_SETTINGS.qrLogoType,
      qrCustomLogoDataUrl: parsed.qrCustomLogoDataUrl || ''
    };
  } catch (err) {
    console.error('Failed to read app settings from localStorage', err);
    return { ...DEFAULT_APP_SETTINGS };
  }
}

/**
 * Save updated application settings
 */
export function saveAppSettings(updates: Partial<AppSettings>): AppSettings {
  try {
    const current = getAppSettings();
    const updated: AppSettings = {
      ...current,
      ...updates
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('app_settings_changed', { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Failed to save app settings to localStorage', err);
    return { ...DEFAULT_APP_SETTINGS, ...updates };
  }
}
