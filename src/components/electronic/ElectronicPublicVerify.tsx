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
  KeyRound,
  Award,
  Search,
  ExternalLink,
  Shield,
  FileCheck
} from 'lucide-react';
import { VerifiedDocument } from '../../types';
import {
  getVerifiedDocumentByToken,
  recordVerificationScan,
  getAllVerifiedDocuments
} from '../../utils/electronicService';
import { verifyAndLogin } from '../../utils/adminAuth';
import { BsreCertificateModal } from './BsreCertificateModal';
import { downloadBsreRootCertificate } from '../../utils/bsrePadesSigner';

interface ElectronicPublicVerifyProps {
  initialToken?: string;
  onAdminUnlock?: () => void;
}

export const ElectronicPublicVerify: React.FC<ElectronicPublicVerifyProps> = ({
  initialToken = '',
  onAdminUnlock
}) => {
  const [activeToken, setActiveToken] = useState(initialToken);
  const [searchInput, setSearchInput] = useState(initialToken);
  const [docData, setDocData] = useState<VerifiedDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(initialToken.trim()));
  const [copied, setCopied] = useState<boolean>(false);
  const [scanLogged, setScanLogged] = useState<boolean>(false);
  const [showBsreModal, setShowBsreModal] = useState<boolean>(false);

  // Admin PIN prompt state (discreet for administrator only)
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Sync activeToken if initialToken changes
  useEffect(() => {
    if (initialToken) {
      setActiveToken(initialToken.trim().toUpperCase());
      setSearchInput(initialToken.trim().toUpperCase());
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

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const term = searchInput.trim().toUpperCase();
    setActiveToken(term);

    // Also check if user typed a document number instead of token
    const allDocs = await getAllVerifiedDocuments();
    const matchedByNumber = allDocs.find(
      (d) =>
        d.documentNumber.toUpperCase() === term ||
        d.documentNumber.replace(/\s+/g, '').toUpperCase() === term.replace(/\s+/g, '')
    );
    if (matchedByNumber) {
      setActiveToken(matchedByNumber.verificationToken);
    }
  };

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
    }) + ' WIB';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col select-none">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Portal Validasi & Keabsahan Dokumen Resmi
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Balai Sertifikasi Elektronik (BSrE) • Badan Siber dan Sandi Negara
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sistem Terhubung BSSN</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Search Input Box */}
        <form onSubmit={handleSearchSubmit} className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Masukkan Token Verifikasi atau Nomor Ijazah / Dokumen..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Periksa</span>
          </button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto my-8">
            <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">Memeriksa Keaslian Dokumen...</p>
            <p className="text-xs text-slate-500 mt-1">Menghubungkan ke basis data verifikasi resmi</p>
          </div>
        )}

        {/* Results Section */}
        {!loading && activeToken && (
          <>
            {/* 1. DOKUMEN VALID */}
            {docData && docData.status === 'VALID' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
                {/* Banner Status Valid */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 p-6 sm:p-7 text-white text-center sm:text-left sm:flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                      DOKUMEN TERVERIFIKASI RESMI
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">✓ DOKUMEN VALID</h2>
                    <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                      Dokumen ini terdaftar sah dan keasliannya terjamin dalam database instansi penerbit.
                    </p>
                  </div>
                </div>

                {/* Details Container */}
                <div className="p-6 sm:p-7 space-y-5">
                  {/* Grid Metadata Dokumen */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Nama Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">Nama Dokumen</span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm leading-snug">{docData.documentName}</p>
                    </div>

                    {/* Nomor Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Hash className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">Nomor Dokumen / Ijazah</span>
                      </div>
                      <p className="font-mono font-bold text-emerald-700 text-sm">
                        {docData.documentNumber || '-'}
                      </p>
                    </div>

                    {/* Jenis Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">Jenis Dokumen</span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{docData.documentType || 'Ijazah Resmi'}</p>
                    </div>

                    {/* Tanggal Dokumen */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">Tanggal Dokumen</span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{docData.documentDate || '-'}</p>
                    </div>

                    {/* Instansi / Penerbit */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">Instansi / Penerbit</span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{docData.issuer}</p>
                    </div>

                    {/* Penandatangan Resmi (TIDAK MENAMPILKAN NIK DEMI PRIVASI) */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">Penandatangan Resmi</span>
                      </div>
                      <p className="font-bold text-emerald-800 text-sm">{docData.signerName}</p>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">{docData.signerPosition}</p>
                    </div>
                  </div>

                  {/* Keterangan */}
                  {docData.description && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-500 font-semibold block mb-1">Keterangan:</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{docData.description}</p>
                    </div>
                  )}

                  {/* TANDA TANGAN ELEKTRONIK RESMI BSrE BSSN CARD (FORMAT SERTIFIKAT RESMI PEMERINTAH) */}
                  {docData.bsreSignature && docData.bsreSignature.isSignedWithBsre && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950 via-slate-900 to-sky-950 text-white border border-sky-500/40 shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-sky-800/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0 text-sky-300 shadow-sm">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                              Sertifikasi Digital Republik Indonesia
                            </span>
                            <h4 className="font-bold text-white text-sm sm:text-base">
                              Tanda Tangan Elektronik Resmi BSrE - BSSN
                            </h4>
                          </div>
                        </div>

                        <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 uppercase tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Sah & Terdaftar di BSSN
                        </span>
                      </div>

                      {/* Detail Sertifikat (Sesuai Standar BSrE - TANPA NIK) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                          <span className="text-slate-400 block text-[11px] font-semibold">Pemilik Sertifikat / Akun:</span>
                          <span className="font-bold text-white text-sm block">{docData.bsreSignature.bsreAccountOwner}</span>
                          <span className="text-[11px] text-sky-300 block font-medium">
                            {docData.bsreSignature.signerPosition} • {docData.bsreSignature.signerInstansi}
                          </span>
                          {/* Hanya tampilkan NIP, TANPA NIK */}
                          {docData.bsreSignature.signerNip && (
                            <span className="text-[10px] text-slate-300 block font-mono mt-1">
                              NIP: {docData.bsreSignature.signerNip}
                            </span>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                          <span className="text-slate-400 block text-[11px] font-semibold">Otoritas Penerbit Sertifikat:</span>
                          <span className="font-bold text-sky-300 block text-xs leading-snug">{docData.bsreSignature.issuerCa}</span>
                          <span className="text-[10px] text-slate-400 block">Badan Siber dan Sandi Negara Republik Indonesia</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 font-mono text-[11px]">
                          <span className="text-slate-400 block font-sans text-[11px] font-semibold">Nomor Seri Sertifikat:</span>
                          <span className="text-emerald-400 font-bold break-all mt-0.5 block">{docData.bsreSignature.certificateSerialNumber}</span>
                          <span className="text-[10px] text-slate-400 font-sans block mt-0.5">Standar Kriptografi: SHA-256 with RSA (2048-bit)</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                          <span className="text-slate-400 block text-[11px] font-semibold">Integritas Dokumen:</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            Utuh & Belum Pernah Dimodifikasi
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Kekuatan Hukum: UU ITE No. 11/2008 & PP No. 71/2019
                          </span>
                        </div>
                      </div>

                      {/* Baris Timestamp & Tombol Sertifikat X.509 */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-sky-800/40">
                        <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Ditandatangani secara elektronik: <strong className="text-white">{formatDate(docData.bsreSignature.signatureTimestamp)}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadBsreRootCertificate()}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 border border-slate-700"
                            title="Unduh Sertifikat Root CA BSSN"
                          >
                            <Download className="w-3.5 h-3.5 text-sky-400" />
                            <span className="hidden sm:inline">Root CA (.crt)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowBsreModal(true)}
                            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md shadow-sky-600/30"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Lihat Sertifikat X.509</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Timestamp & Audit Scan */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-slate-600">
                        Tanggal Terdaftar di Sistem: <strong className="text-slate-800">{formatDate(docData.createdAt)}</strong>
                      </span>
                    </div>
                    <div className="text-emerald-700 font-semibold">
                      Total Pemindaian Terverifikasi: <strong className="font-bold">{docData.verificationCount || 1}x</strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                      <span>{copied ? 'Tautan Tersalin' : 'Salin Tautan'}</span>
                    </button>

                    {Boolean(docData.qrDataUrl && docData.qrDataUrl.trim()) && (
                      <a
                        href={docData.qrDataUrl}
                        download={`QR_${docData.verificationToken}.png`}
                        className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-300 transition shadow-xs"
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
                        <span>Unduh Berkas Dokumen</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. DOKUMEN DICABUT */}
            {docData && docData.status === 'DICABUT' && (
              <div className="bg-white rounded-3xl border border-amber-300 shadow-xl overflow-hidden animate-fadeIn">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 sm:p-7 text-white text-center sm:text-left sm:flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg">
                    <AlertTriangle className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1">
                      STATUS PENCABUTAN
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight">⚠ DOKUMEN DICABUT</h2>
                    <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
                      Dokumen ini sebelumnya terdaftar dalam sistem tetapi status validitasnya telah dicabut oleh instansi penerbit.
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-7 space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-xs text-amber-800 font-bold block mb-1">Alasan Pencabutan:</span>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      {docData.revokedReason || 'Dokumen telah ditarik kembali oleh instansi berwenang.'}
                    </p>
                    {docData.revokedAt && (
                      <p className="text-[11px] text-amber-700 mt-2 font-medium">
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
                      <span className="text-slate-500 block">Kode Token:</span>
                      <span className="font-mono font-bold text-amber-700">{docData.verificationToken}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DOKUMEN TIDAK DITEMUKAN */}
            {(!docData || docData.status === 'TIDAK VALID') && (
              <div className="bg-white rounded-3xl border border-rose-300 shadow-xl overflow-hidden animate-fadeIn">
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 sm:p-7 text-white text-center sm:text-left sm:flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg">
                    <XCircle className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1">
                      HASIL PEMERIKSAAN
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight">✕ DOKUMEN TIDAK DITEMUKAN</h2>
                    <p className="text-red-100 text-xs sm:text-sm mt-0.5">
                      Dokumen dengan kode verifikasi <span className="font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">{activeToken}</span> tidak terdaftar dalam sistem resmi.
                    </p>
                  </div>
                </div>

                <div className="p-6 text-center space-y-3">
                  <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Mohon periksa kembali kode token atau nomor dokumen yang dimasukkan. Setiap dokumen resmi yang sah tercatat dan terdaftar dalam basis data instansi penerbit.
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
            <h3 className="font-bold text-slate-900 text-lg">Pindai QR Code atau Masukkan Token</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Halaman ini menampilkan status validitas dan keabsahan dokumen resmi secara otomatis ketika QR Code dipindai dengan smartphone atau nomor token dicari pada kolom di atas.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-800">Petunjuk Validasi Dokumen:</div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Arahkan kamera smartphone ke QR Code / Barcode yang tertera pada ijazah atau dokumen.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>Buka tautan verifikasi yang muncul pada layar untuk melihat sertifikat digital resmi.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span>Atau ketik langsung Token / Nomor Ijazah pada kolom pencarian di bagian atas.</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 max-w-3xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px]">
          © 2026 Balai Sertifikasi Elektronik (BSrE) • Portal Keabsahan Dokumen Resmi
        </p>

        {/* Discreet PIN Login for Administrator */}
        <button
          onClick={() => setShowAdminPinModal(true)}
          className="text-[11px] text-slate-500 hover:text-slate-800 transition flex items-center gap-1 cursor-pointer font-medium"
          title="Login Pengelola / Administrator"
        >
          <Lock className="w-3 h-3" />
          <span>Pengelola</span>
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
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sertifikat Digital BSrE */}
      {docData?.bsreSignature && (
        <BsreCertificateModal
          isOpen={showBsreModal}
          onClose={() => setShowBsreModal(false)}
          signatureInfo={docData.bsreSignature}
          documentName={docData.documentName}
          documentNumber={docData.documentNumber}
        />
      )}
    </div>
  );
};
