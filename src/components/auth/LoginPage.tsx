import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  QrCode,
  KeyRound,
  FileSignature,
  RefreshCw
} from 'lucide-react';
import {
  verifyAndLogin,
  verifyAndLoginAsync,
  getStoredUsername,
  setLoginSession,
  syncCredentialsFromCloud,
  subscribeToCloudCredentials
} from '../../utils/adminAuth';
import { signInWithGoogle } from '../../utils/firebase';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onOpenPublicVerify: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onOpenPublicVerify
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  // Sync latest cloud credentials when login page appears
  useEffect(() => {
    syncCredentialsFromCloud().catch(console.warn);
    const unsub = subscribeToCloudCredentials();
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Harap masukkan username dan password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Authenticate with Cloud Firestore credentials
      const success = await verifyAndLoginAsync(username.trim(), password);
      if (success) {
        onLoginSuccess();
      } else {
        setErrorMsg('Username atau Password salah! Periksa kembali data login Anda.');
      }
    } catch {
      // Fallback check against memory/local storage
      const fallbackSuccess = verifyAndLogin(username.trim(), password);
      if (fallbackSuccess) {
        onLoginSuccess();
      } else {
        setErrorMsg('Username atau Password salah! Periksa kembali data login Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        setLoginSession(user.displayName || user.email || 'Pengelola Google');
        onLoginSuccess();
      }
    } catch (err: any) {
      console.warn('Google login failed:', err);
      setErrorMsg(
        'Login Google dibatalkan atau terjadi kendala. Anda dapat masuk menggunakan Username & Password pengelola.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 select-none relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -top-32 -left-32"></div>
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -bottom-32 -right-32"></div>

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur relative z-10 space-y-6">
        {/* App Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 font-bold mx-auto mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            VERIFIKASI DOKUMEN ELEKTRONIK
          </h1>
          <p className="text-xs text-slate-400">
            Sistem Pengesahan Dokumen & Tanda Tangan Digital Resmi
          </p>
        </div>

        {/* Security Gate Badge */}
        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-white block">Akses Pengelola Terlindungi</span>
            <span className="text-[10px] text-slate-400 block leading-tight">
              Wajib login untuk membuat, mengedit, atau mengelola dokumen.
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1 font-semibold">Username Pengelola</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                autoComplete="username"
                className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-3 text-white transition text-sm"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-semibold">Password Pengelola</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                autoComplete="current-password"
                className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-10 text-white transition text-sm"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memverifikasi Akun Cloud...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Sistem</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider shrink-0 font-medium">
            atau
          </span>
        </div>

        {/* Google Sign-in Alternative */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2.5 shadow disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleLoading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
        </button>

        {/* Public Verification Shortcut */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={onOpenPublicVerify}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition inline-flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Hanya ingin memeriksa/memverifikasi surat? Klik di sini</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 Verifikasi Dokumen Elektronik • Akses Terbatas Pengelola Resmi</p>
      </footer>
    </div>
  );
};
