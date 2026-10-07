import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Building2,
  UserCheck,
  Calendar,
  Hash,
  Download,
  Copy,
  Check,
  QrCode,
  Clock,
  RefreshCw,
  Lock,
  KeyRound
} from 'lucide-react';
import { VerifiedDocument } from '../../types';
import {
  getVerifiedDocumentByToken,
  recordVerificationScan
} from '../../utils/electronicService';
import { verifyAndLoginAdmin } from '../../utils/adminAuth';

interface ElectronicPublicVerifyProps {
  initialToken?: string;
  onAdminUnlock?: () => void;
}

export const ElectronicPublicVerify: React.FC<ElectronicPublicVerifyProps> = ({
  initialToken = '',
  onAdminUnlock
}) => {
  const [searchToken, setSearchToken] = useState(initialToken);
  const [activeToken, setActiveToken] = useState(initialToken);
  const [docData, setDocData] = useState<VerifiedDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [scanLogged, setScanLogged] = useState<boolean>(false);

  // Admin PIN prompt state (discreet for administrator only)
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Perform lookup when activeToken changes
  useEffect(() => {
    let isMounted = true;
    async function fetchDoc() {
      if (!activeToken.trim()) {
        setDocData(null);
        setLoading(false);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      try {
        const found = await getVerifiedDocumentByToken(activeToken.trim());
        if (!isMounted) return;

        setDocData(found);

        // Record verification scan log if valid/found and not logged in this session
        if (found && !scanLogged) {
          recordVerificationScan(found.verificationToken, found.documentId);
          setScanLogged(true);
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        if (isMounted) setDocData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDoc();
    return () => {
      isMounted = false;
    };
  }, [activeToken, scanLogged]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchToken.trim()) {
      setActiveToken(searchToken.trim().toUpperCase());
      setScanLogged(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAndLoginAdmin(pinInput)) {
      setShowAdminPinModal(false);
      setPinInput('');
      setPinError(false);
      if (onAdminUnlock) {
        onAdminUnlock();
      }
    } else {
      setPinError(true);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Header - STRICTLY READ-ONLY PUBLIC PORTAL (NO ACCESS TO APP) */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base text-white leading-tight tracking-wide">
                VERIFIKASI DOKUMEN ELEKTRONIK
              </h1>
              <p className="text-[11px] text-slate-400">
                Portal Publik Pengesahan Dokumen Resmi Berbasis QR Code
              </p>
            </div>
          </div>

          {/* Official Security Badge (Replacing any back button) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Portal Publik Resmi</span>
            <span className="sm:hidden">Resmi</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {/* Token Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value.toUpperCase())}
                placeholder="Masukkan ID / Token Verifikasi (Contoh: 8F7A92KX31)..."
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-3.5 pl-11 pr-28 text-sm text-white placeholder-slate-500 transition shadow-inner font-mono tracking-wider"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={!searchToken.trim() || loading}
                className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Periksa'}
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Pindai QR Code pada dokumen fisik atau ketik kode verifikasi di atas untuk memeriksa keaslian dokumen.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">Menghubungkan ke Database Verifikasi...</p>
            <p className="text-xs text-slate-500 mt-1">Memeriksa keabsahan dan keaslian dokumen</p>
          </div>
        )}

        {/* Results Section */}
        {!loading && hasSearched && (
          <>
            {/* 1. DOKUMEN VALID */}
            {docData && docData.status === 'VALID' && (
              <div className="bg-slate-900/90 rounded-2xl border border-emerald-500/40 shadow-2xl overflow-hidden">
                {/* Banner Status Valid */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center sm:text-left sm:flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                      DOKUMEN TERVERIFIKASI RESMI
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight">✓ DOKUMEN VALID</h2>
                    <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                      Dokumen ini terdaftar dan dapat diverifikasi melalui sistem resmi.
                    </p>
                  </div>
                </div>

                {/* Details Container */}
                <div className="p-6 space-y-6">
                  {/* Grid Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nama Dokumen */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Nama Dokumen</span>
                      </div>
                      <p className="font-semibold text-white text-sm">{docData.documentName}</p>
                    </div>

                    {/* Nomor Dokumen */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Nomor Dokumen</span>
                      </div>
                      <p className="font-mono font-bold text-emerald-300 text-sm">
                        {docData.documentNumber || '-'}
                      </p>
                    </div>

                    {/* Jenis Dokumen */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <span>Jenis Dokumen</span>
                      </div>
                      <p className="font-medium text-slate-200 text-sm">{docData.documentType || '-'}</p>
                    </div>

                    {/* Tanggal Dokumen */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tanggal Dokumen</span>
                      </div>
                      <p className="font-medium text-slate-200 text-sm">{docData.documentDate || '-'}</p>
                    </div>

                    {/* Instansi / Penerbit */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Instansi / Penerbit</span>
                      </div>
                      <p className="font-semibold text-white text-sm">{docData.issuer}</p>
                    </div>

                    {/* Penandatangan & Jabatan */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Penandatangan Resmi</span>
                      </div>
                      <p className="font-semibold text-emerald-300 text-sm">{docData.signerName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{docData.signerPosition}</p>
                    </div>
                  </div>

                  {/* Keterangan */}
                  {docData.description && (
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                      <span className="text-xs text-slate-400 font-medium block mb-1">Keterangan Dokumen:</span>
                      <p className="text-xs text-slate-300 leading-relaxed">{docData.description}</p>
                    </div>
                  )}

                  {/* Audit & Security Token Information */}
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-emerald-900/50 flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">ID / Token Verifikasi:</div>
                        <div className="font-mono font-bold text-base text-emerald-300 tracking-wider">
                          {docData.verificationToken}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Diterbitkan: {formatDate(docData.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
                      <span className="text-xs text-slate-400 block">Frekuensi Pindai:</span>
                      <span className="text-sm font-bold text-white">
                        {(docData.verificationCount || 1)}x Diverifikasi
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons (Copy Link & Download QR) */}
                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Tautan Disalin!' : 'Salin Tautan Verifikasi'}</span>
                    </button>

                    {docData.qrDataUrl && (
                      <a
                        href={docData.qrDataUrl}
                        download={`QR_${docData.verificationToken}.png`}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh QR</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. DOKUMEN DICABUT */}
            {docData && docData.status === 'DICABUT' && (
              <div className="bg-slate-900/90 rounded-2xl border border-amber-500/40 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white text-center sm:text-left sm:flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg">
                    <AlertTriangle className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1">
                      STATUS PENCABUTAN
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight">⚠ DOKUMEN DICABUT</h2>
                    <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
                      Dokumen ini sebelumnya terdaftar dalam sistem tetapi status validitasnya telah dicabut oleh penerbit.
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
                    <span className="text-xs text-amber-300 font-semibold block mb-1">Alasan Pencabutan:</span>
                    <p className="text-xs text-amber-100">
                      {docData.revokedReason || 'Dokumen telah ditarik kembali oleh instansi berwenang.'}
                    </p>
                    {docData.revokedAt && (
                      <p className="text-[11px] text-amber-400/80 mt-2">
                        Waktu Pencabutan: {formatDate(docData.revokedAt)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <span className="text-slate-400 block">Nama Dokumen:</span>
                      <span className="font-medium text-white">{docData.documentName}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <span className="text-slate-400 block">Nomor Dokumen:</span>
                      <span className="font-mono text-white">{docData.documentNumber || '-'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <span className="text-slate-400 block">Instansi Penerbit:</span>
                      <span className="font-medium text-white">{docData.issuer}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <span className="text-slate-400 block">ID Verifikasi:</span>
                      <span className="font-mono font-bold text-amber-400">{docData.verificationToken}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DOKUMEN TIDAK DITEMUKAN */}
            {(!docData || docData.status === 'TIDAK VALID') && (
              <div className="bg-slate-900/90 rounded-2xl border border-red-500/40 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 text-white text-center sm:text-left sm:flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg">
                    <XCircle className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1">
                      PERINGATAN SISTEM
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight">✕ DOKUMEN TIDAK DITEMUKAN</h2>
                    <p className="text-red-100 text-xs sm:text-sm mt-0.5">
                      Dokumen dengan kode verifikasi <span className="font-mono font-bold">{activeToken}</span> tidak terdaftar dalam sistem.
                    </p>
                  </div>
                </div>

                <div className="p-6 text-center space-y-4">
                  <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                    Kemungkinan dokumen palsu, QR Code rusak, atau kode yang dimasukkan salah. Dokumen resmi wajib memiliki catatan keabsahan di server ini.
                  </p>
                  <button
                    onClick={() => {
                      setSearchToken('');
                      setActiveToken('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                  >
                    Periksa Kode Lainnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Informational Guidance if no search yet */}
        {!loading && !hasSearched && (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-white text-base">Pindai atau Masukkan Kode Dokumen</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Sistem ini memvalidasi keabsahan dokumen menggunakan identitas kriptografi unik yang dicocokkan langsung ke database instansi resmi.
            </p>
          </div>
        )}
      </main>

      {/* Footer - Isolated with Discreet Admin Login */}
      <footer className="border-t border-slate-800/80 py-5 text-center text-xs text-slate-500 max-w-4xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px]">
          © 2026 Verifikasi Dokumen Elektronik • Akses Publik Read-Only (Hanya Lihat)
        </p>

        {/* Discreet PIN Login for Administrator Only */}
        <button
          onClick={() => setShowAdminPinModal(true)}
          className="text-[11px] text-slate-600 hover:text-slate-400 transition flex items-center gap-1 cursor-pointer"
          title="Login Pengelola / Administrator"
        >
          <Lock className="w-3 h-3" />
          <span>Akses Pengelola</span>
        </button>
      </footer>

      {/* PIN Authentication Modal for Administrator */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Masukkan PIN Pengelola</h3>
              <p className="text-xs text-slate-400 mt-1">
                Akses ke aplikasi utama dibatasi dengan PIN keamanan untuk mencegah perubahan oleh publik.
              </p>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Masukkan PIN (Default: 1234)"
                autoFocus
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-white"
              />

              {pinError && (
                <p className="text-xs text-red-400 text-center font-medium">
                  PIN salah. Akses ke aplikasi ditolak.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setPinInput('');
                    setPinError(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                >
                  Buka Aplikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
