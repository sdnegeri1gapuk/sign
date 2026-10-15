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
  Upload,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Info,
  CheckCircle,
  FileSearch,
  Sparkles
} from 'lucide-react';
import { VerifiedDocument } from '../../types';
import {
  getVerifiedDocumentByToken,
  recordVerificationScan,
  getAllVerifiedDocuments
} from '../../utils/electronicService';
import { verifyAndLogin } from '../../utils/adminAuth';
import { BsreCertificateModal } from './BsreCertificateModal';
import {
  inspectAndValidatePdfSignature,
  PdfSignatureValidationResult
} from '../../utils/bsrePadesSigner';

interface ElectronicPublicVerifyProps {
  initialToken?: string;
  onAdminUnlock?: () => void;
}

export const ElectronicPublicVerify: React.FC<ElectronicPublicVerifyProps> = ({
  initialToken = '',
  onAdminUnlock
}) => {
  const [activeTab, setActiveTab] = useState<'token' | 'pdf_audit'>('token');
  const [activeToken, setActiveToken] = useState(initialToken);
  const [searchInput, setSearchInput] = useState(initialToken);
  const [docData, setDocData] = useState<VerifiedDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(initialToken.trim()));
  const [copied, setCopied] = useState<boolean>(false);
  const [scanLogged, setScanLogged] = useState<boolean>(false);
  const [showBsreModal, setShowBsreModal] = useState<boolean>(false);

  // PDF Audit / Validation State
  const [isAuditingPdf, setIsAuditingPdf] = useState<boolean>(false);
  const [pdfAuditResult, setPdfAuditResult] = useState<PdfSignatureValidationResult | null>(null);
  const [auditedFileName, setAuditedFileName] = useState<string>('');

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

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Harap pilih berkas dokumen dalam format PDF.');
      return;
    }

    setAuditedFileName(file.name);
    setIsAuditingPdf(true);
    setPdfAuditResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const result = await inspectAndValidatePdfSignature(bytes);
      setPdfAuditResult(result);
    } catch (err) {
      console.error('Gagal memeriksa berkas PDF:', err);
    } finally {
      setIsAuditingPdf(false);
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
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col select-none">
      {/* Top Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                Portal Validasi & Keabsahan Dokumen Resmi
              </h1>
              <p className="text-[11px] text-slate-500">
                Terhubung dengan Balai Sertifikasi Elektronik (BSrE) - BSSN
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('token')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'token'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Verifikasi Token/QR</span>
            </button>
            <button
              onClick={() => setActiveTab('pdf_audit')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'pdf_audit'
                  ? 'bg-white text-sky-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5 text-sky-600" />
              <span>Uji Berkas PDF (TTE BSrE)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: VERIFIKASI TOKEN / QR CODE                              */}
        {/* ============================================================== */}
        {activeTab === 'token' && (
          <div className="space-y-6">
            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Masukkan Token Verifikasi atau Nomor Dokumen / Ijazah..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 text-slate-900"
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

                      {/* Tanda Tangan Elektronik Resmi BSrE BSSN Verification Banner */}
                      {docData.bsreSignature && docData.bsreSignature.isSignedWithBsre && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/95 via-slate-900 to-sky-900 text-white border border-sky-500/40 shadow-lg space-y-3.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-800/60 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0 text-sky-300">
                                <ShieldCheck className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                                  Sertifikasi Digital Republik Indonesia
                                </span>
                                <h4 className="font-bold text-white text-sm">
                                  Tanda Tangan Elektronik Resmi BSrE - BSSN
                                </h4>
                              </div>
                            </div>

                            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              Sah & Terdaftar di BSSN
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                              <span className="text-slate-400 block text-[11px]">Pemilik Akun Resmi BSrE:</span>
                              <span className="font-bold text-white">{docData.bsreSignature.bsreAccountOwner}</span>
                              <span className="text-[11px] text-sky-300 block font-mono mt-0.5">
                                NIK: {docData.bsreSignature.signerNik}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                              <span className="text-slate-400 block text-[11px]">Penerbit Sertifikat (CA):</span>
                              <span className="font-semibold text-slate-200">{docData.bsreSignature.issuerCa}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 font-mono text-[11px]">
                              <span className="text-slate-400 block">No. Seri Sertifikat:</span>
                              <span className="text-sky-300 break-all">{docData.bsreSignature.certificateSerialNumber}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                              <span className="text-slate-400 block text-[11px]">Integritas Dokumen:</span>
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Utuh & Belum Pernah Dimodifikasi
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-sky-800/40">
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-sky-400" />
                              <span>Ditandatangani: {formatDate(docData.bsreSignature.signatureTimestamp)}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowBsreModal(true)}
                              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Lihat Sertifikat X.509</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Info Timestamp & Audit Scan */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-slate-600">
                            Terdaftar: <strong className="text-slate-800">{formatDate(docData.createdAt)}</strong>
                          </span>
                        </div>
                        <div className="text-emerald-700 font-medium">
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
                <h3 className="font-bold text-slate-900 text-lg">Pindai QR Code atau Masukkan Token</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Halaman ini menampilkan keabsahan dan keaslian dokumen secara otomatis ketika QR Code verifikasi dipindai atau kode token dimasukkan pada kolom pencarian di atas.
                </p>
                <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
                  <div className="font-semibold text-slate-800">Petunjuk Verifikasi:</div>
                  <div>1. Arahkan kamera smartphone ke QR Code yang tertera pada dokumen.</div>
                  <div>2. Ketuk tautan verifikasi yang muncul di layar smartphone Anda.</div>
                  <div>3. Atau masukkan Token / Nomor Ijazah pada kolom pencarian di atas.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: AUDIT & VALIDASI BERKAS PDF TTE BSrE (UJI KRIPTOGRAFIS)  */}
        {/* ============================================================== */}
        {activeTab === 'pdf_audit' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 p-6 rounded-3xl text-white border border-sky-600/40 shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Validator Kriptografis TTE BSrE BSSN & ISO 32000-1
                  </h2>
                  <p className="text-xs text-sky-200">
                    Memeriksa langsung struktur byte kamus digital signature (/Type /Sig) dan sertifikat X.509
                  </p>
                </div>
              </div>

              {/* Upload Box */}
              <div className="mt-4 pt-3 border-t border-sky-800/60">
                <label className="block p-6 rounded-2xl border-2 border-dashed border-sky-400/40 hover:border-sky-300 bg-sky-900/30 hover:bg-sky-900/50 cursor-pointer text-center transition group">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-sky-400 group-hover:text-white mx-auto mb-2 transition" />
                  <span className="text-sm font-bold text-white block">
                    Pilih atau Tarik Berkas Dokumen PDF ke Sini
                  </span>
                  <span className="text-xs text-sky-300 mt-1 block">
                    Unggah berkas ijazah atau dokumen bertanda tangan elektronik untuk diuji
                  </span>
                </label>
              </div>
            </div>

            {/* Loading Indicator */}
            {isAuditingPdf && (
              <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-800">
                  Memeriksa Struktur Kriptografi Berkas PDF...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Menganalisis ByteRange, kamus /Type /Sig, dan sertifikat X.509 BSrE
                </p>
              </div>
            )}

            {/* Audit Results */}
            {!isAuditingPdf && pdfAuditResult && (
              <div className="space-y-4">
                {/* Result Card: VALID & DETECTED */}
                {pdfAuditResult.hasDigitalSignature && (
                  <div className="bg-white rounded-3xl border border-sky-200 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-sky-700 via-blue-800 to-indigo-900 p-6 text-white sm:flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-9 h-9 text-emerald-300" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            TTE DIGITAL TERDETEKSI & SAH
                          </div>
                          <h3 className="text-xl font-extrabold text-white">
                            ✓ Tanda Tangan Elektronik ISO 32000-1 Valid
                          </h3>
                          <p className="text-xs text-sky-100 mt-0.5 font-mono">
                            Berkas: {auditedFileName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-0 text-right">
                        <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold block text-center sm:text-right">
                          Standar: Adobe.PPKLite / PAdES
                        </span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="p-6 space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[11px] font-semibold">Penandatangan Resmi:</span>
                          <span className="text-sm font-bold text-slate-900 block mt-0.5">
                            {pdfAuditResult.signerName}
                          </span>
                          <span className="text-slate-600 block text-[11px] mt-0.5">
                            NIK: {pdfAuditResult.signerNik}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[11px] font-semibold">Penerbit Sertifikat Otoritas:</span>
                          <span className="text-xs font-bold text-sky-900 block mt-0.5">
                            {pdfAuditResult.issuer}
                          </span>
                          <span className="text-slate-600 block text-[11px] mt-0.5">
                            Masa Berlaku: {pdfAuditResult.validFrom} s/d {pdfAuditResult.validUntil}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[11px] font-semibold">Integritas Dokumen (ByteRange):</span>
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Dokumen Utuh & Belum Pernah Dimodifikasi
                          </span>
                          <span className="text-slate-500 block font-mono text-[10px] mt-1 break-all">
                            SHA-256: {pdfAuditResult.sha256Hash}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[11px] font-semibold">Kamus Objek PDF:</span>
                          <span className="font-mono text-slate-800 font-semibold block mt-0.5">
                            /Type /Sig • SubFilter: {pdfAuditResult.rawDetails.subFilter || 'adbe.pkcs7.detached'}
                          </span>
                          <span className="text-slate-500 text-[11px] block mt-0.5">
                            Filter: {pdfAuditResult.rawDetails.filter || 'Adobe.PPKLite'}
                          </span>
                        </div>
                      </div>

                      {/* Adobe Acrobat Reader Guidance */}
                      <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span>Cara Membaca Tanda Tangan Ini di Adobe Acrobat Reader:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-blue-800">
                          Buka berkas PDF ini di <strong>Adobe Acrobat Reader</strong>. Di bagian atas akan muncul bilah pesan resmi:{' '}
                          <span className="font-semibold text-emerald-800">"Signed and all signatures are valid"</span>. Anda dapat mengklik panel <em>Signatures</em> di sisi kiri Adobe untuk melihat hierarki sertifikat resmi BSrE BSSN Republik Indonesia.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Card: NO SIGNATURE FOUND */}
                {!pdfAuditResult.hasDigitalSignature && (
                  <div className="bg-white rounded-3xl border border-rose-300 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-rose-600 to-red-700 p-6 text-white sm:flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-9 h-9 text-white" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-1">
                          HASIL PEMERIKSAAN BERKAS
                        </div>
                        <h3 className="text-xl font-extrabold text-white">
                          ✕ Tidak Ada Objek Tanda Tangan Digital (/Type /Sig)
                        </h3>
                        <p className="text-xs text-rose-100 mt-0.5 font-mono">
                          Berkas: {auditedFileName}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 space-y-4 text-xs">
                      {/* Detailed Diagnostic Explanation */}
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Mengapa Sebelumnya Muncul "Tidak Ada Tanda Tangan Dokumen" di BSrE?</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-slate-700">
                          Portal verifikasi resmi BSrE BSSN (<code className="bg-amber-100 px-1 rounded font-mono">tte.kominfo.go.id</code> / <code className="bg-amber-100 px-1 rounded font-mono">verify.bsre.bssn.go.id</code>) serta Adobe Acrobat Reader melakukan validasi dengan mencari <strong>Kamus Kriptografis Digital Signature (/Type /Sig, /ByteRange, dan blok PKCS#7 SignedData)</strong> di dalam struktur biner berkas PDF, bukan sekadar melihat gambar QR code atau teks stempel di atas halaman.
                        </p>
                        <p className="text-[12px] leading-relaxed text-slate-700">
                          Berkas yang Anda periksa saat ini tidak memiliki objek kriptografi tersebut (kemungkinan diekspor sebelum pembaruan sistem TTE PAdES ISO 32000-1 atau diekspor dalam keadaan akun BSrE nonaktif).
                        </p>
                      </div>

                      {/* Solution Steps */}
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-slate-800">
                        <div className="font-bold text-xs text-emerald-900 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Solusi Agar Dokumen Langsung Terdeteksi Sah di BSrE & Adobe:</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                          <li>Buka menu <strong>Upload Ijazah</strong> atau <strong>Buat Dokumen</strong>.</li>
                          <li>Pastikan status <strong>Akun BSrE</strong> terhubung (terdapat centang hijau pejabat resmi, contoh: <em>H. Masrun, S.Pd</em>).</li>
                          <li>Pastikan opsi <strong>"Bubuhkan TTE Resmi BSrE"</strong> dalam keadaan aktif.</li>
                          <li>Klik <strong>Simpan & Ekspor PDF</strong> — sistem secara otomatis akan menyematkan kamus <code>/Type /Sig</code>, <code>/ByteRange</code>, dan kontainer <code>PKCS#7 Detached</code> standar ISO 32000-1 ke dalam berkas PDF.</li>
                          <li>Unduh berkas PDF baru tersebut dan uji kembali — tanda tangan akan langsung terdeteksi 100% sah!</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* External Portals Guidance */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-800 block text-xs">
                Portal Verifikasi Eksternal Resmi Pemerintah Republik Indonesia:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://tte.kominfo.go.id/verifyPDF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center justify-between text-slate-700 hover:text-slate-900 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Portal Verifikasi TTE Kominfo RI</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <a
                  href="https://bsre.bssn.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center justify-between text-slate-700 hover:text-slate-900 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-sky-600" />
                    <span>Layanan Balai Sertifikasi Elektronik (BSrE)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
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
          <span>Admin</span>
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
