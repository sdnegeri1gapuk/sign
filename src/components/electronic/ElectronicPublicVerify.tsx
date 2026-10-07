import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
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
import { verifyAndLogin } from '../../utils/adminAuth';

interface ElectronicPublicVerifyProps {
  initialToken?: string;
  onAdminUnlock?: () => void;
}

export const ElectronicPublicVerify: React.FC<ElectronicPublicVerifyProps> = ({
  initialToken = '',
  onAdminUnlock
}) => {
  const [activeToken, setActiveToken] = useState(initialToken);
  const [docData, setDocData] = useState<VerifiedDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(initialToken.trim()));
  const [copied, setCopied] = useState<boolean>(false);
  const [scanLogged, setScanLogged] = useState<boolean>(false);

  // Admin PIN prompt state (discreet for administrator only)
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Sync activeToken if initialToken changes
  useEffect(() => {
    if (initialToken) {
      setActiveToken(initialToken.trim().toUpperCase());
    }
  }, [initialToken]);

  // Perform lookup when activeToken changes
  useEffect(() => {
    let isMounted = true;
    async function fetchDoc() {
      if (!activeToken.trim()) {
        setDocData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAndLogin(pinInput)) {
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col select-none">
      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto my-8">
            <RefreshCw className="w-9 h-9 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">Memeriksa Keaslian Dokumen...</p>
            <p className="text-xs text-slate-500 mt-1">Menghubungkan ke database verifikasi resmi</p>
          </div>
        )}

        {/* Results Section */}
        {!loading && activeToken && (
          <>
            {/* 1. DOKUMEN VALID */}
            {docData && docData.status === 'VALID' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                {/* Banner Status Valid */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-7 text-white text-center sm:text-left sm:flex items-center gap-5">
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
                      Dokumen ini terdaftar dan sah dalam sistem verifikasi instansi penerbit.
                    </p>
                  </div>
                </div>

                {/* Details Container */}
                <div className="p-6 sm:p-7 space-y-6">
                  {/* Grid Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nama Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Nama Dokumen</span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm leading-snug">{docData.documentName}</p>
                    </div>

                    {/* Nomor Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Hash className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Nomor Dokumen</span>
                      </div>
                      <p className="font-mono font-bold text-emerald-700 text-sm">
                        {docData.documentNumber || '-'}
                      </p>
                    </div>

                    {/* Jenis Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span>Jenis Dokumen</span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{docData.documentType || '-'}</p>
                    </div>

                    {/* Tanggal Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tanggal Dokumen</span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{docData.documentDate || '-'}</p>
                    </div>

                    {/* Instansi / Penerbit */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Instansi / Penerbit</span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{docData.issuer}</p>
                    </div>

                    {/* Penandatangan & Jabatan */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Penandatangan Resmi</span>
                      </div>
                      <p className="font-bold text-emerald-700 text-sm">{docData.signerName}</p>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">{docData.signerPosition}</p>
                    </div>
                  </div>

                  {/* Keterangan */}
                  {docData.description && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-500 font-semibold block mb-1">Keterangan Dokumen:</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{docData.description}</p>
                    </div>
                  )}

                  {/* Audit & Security Token Information (Frekuensi Pindai dihapus) */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">ID / Token Verifikasi Dokumen:</div>
                      <div className="font-mono font-bold text-base text-emerald-800 tracking-wider">
                        {docData.verificationToken}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Diterbitkan: {formatDate(docData.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons (Copy Link, Unduh QR, Unduh Dokumen) */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 min-w-[160px] py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 transition shadow-sm"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                      <span>{copied ? 'Tautan Disalin!' : 'Salin Tautan Verifikasi'}</span>
                    </button>

                    {docData.qrDataUrl && (
                      <a
                        href={docData.qrDataUrl}
                        download={`QR_${docData.verificationToken}.png`}
                        className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 transition shadow-sm"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        <span>Unduh QR</span>
                      </a>
                    )}

                    {Boolean(docData.googleDriveUrl && docData.googleDriveUrl.trim()) && (
                      <a
                        href={docData.googleDriveUrl!.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition hover:shadow"
                      >
                        <Download className="w-4 h-4 text-white" />
                        <span>Unduh Dokumen</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. DOKUMEN DICABUT */}
            {docData && docData.status === 'DICABUT' && (
              <div className="bg-white rounded-3xl border border-amber-300 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 sm:p-7 text-white text-center sm:text-left sm:flex items-center gap-5">
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

                <div className="p-6 sm:p-7 space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-xs text-amber-800 font-bold block mb-1">Alasan Pencabutan:</span>
                    <p className="text-xs text-amber-900">
                      {docData.revokedReason || 'Dokumen telah ditarik kembali oleh instansi berwenang.'}
                    </p>
                    {docData.revokedAt && (
                      <p className="text-[11px] text-amber-700 mt-2">
                        Waktu Pencabutan: {formatDate(docData.revokedAt)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Nama Dokumen:</span>
                      <span className="font-semibold text-slate-800">{docData.documentName}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Nomor Dokumen:</span>
                      <span className="font-mono font-bold text-slate-800">{docData.documentNumber || '-'}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Instansi Penerbit:</span>
                      <span className="font-semibold text-slate-800">{docData.issuer}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">ID Verifikasi:</span>
                      <span className="font-mono font-bold text-amber-700">{docData.verificationToken}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DOKUMEN TIDAK DITEMUKAN */}
            {(!docData || docData.status === 'TIDAK VALID') && (
              <div className="bg-white rounded-3xl border border-rose-300 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 sm:p-7 text-white text-center sm:text-left sm:flex items-center gap-5">
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

                <div className="p-6 text-center space-y-3">
                  <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Kemungkinan dokumen palsu, QR Code rusak, atau kode verifikasi tidak valid. Dokumen resmi yang sah wajib memiliki catatan di database instansi penerbit.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Informational Guidance if opened without token */}
        {!loading && !activeToken && (
          <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Pindai QR Code Dokumen</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Halaman ini menampilkan keabsahan dan keaslian dokumen secara otomatis ketika QR Code verifikasi pada dokumen fisik atau digital dipindai menggunakan smartphone.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800">Petunjuk Verifikasi:</div>
              <div>1. Arahkan kamera smartphone ke QR Code yang tertera pada dokumen.</div>
              <div>2. Ketuk tautan verifikasi yang muncul di layar smartphone Anda.</div>
              <div>3. Halaman ini akan otomatis membuka dan menampilkan rincian keaslian dokumen.</div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 max-w-4xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px]">
          © 2026 Verifikasi Dokumen Elektronik • Portal Resmi Keabsahan Dokumen
        </p>

        {/* Discreet PIN Login for Administrator */}
        <button
          onClick={() => setShowAdminPinModal(true)}
          className="text-[11px] text-slate-500 hover:text-slate-800 transition flex items-center gap-1 cursor-pointer font-medium"
          title="Login Pengelola / Administrator"
        >
          <Lock className="w-3 h-3" />
          <span>Kelola Aplikasi (Admin)</span>
        </button>
      </footer>

      {/* PIN Authentication Modal for Administrator */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Masukkan PIN Pengelola</h3>
              <p className="text-xs text-slate-500 mt-1">
                Akses ke aplikasi utama dibatasi dengan PIN keamanan.
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
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl text-slate-900 shadow-inner"
              />

              {pinError && (
                <p className="text-xs text-red-600 text-center font-medium">
                  PIN salah. Akses ditolak.
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
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
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
