import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Upload,
  FileText,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Link as LinkIcon,
  HelpCircle,
  QrCode,
  AlertCircle,
  Eye,
  CheckCircle2,
  Building2,
  Calendar,
  Hash,
  UserCheck
} from 'lucide-react';
import { VerifiedDocument, ElectronicDocFormData } from '../../types';
import {
  saveVerifiedDocument,
  generateUniqueToken,
  generateVerificationUrl
} from '../../utils/electronicService';
import { getAppSettings } from '../../utils/appSettings';
import {
  generateSampleIjazahPdf,
  generateSampleTranskripPdf
} from '../../utils/samplePdf';
import { pdfjsLib } from '../../utils/pdfWorker';
import {
  extractIjazahMetadata,
  formatLegacyBarcodeUrl
} from '../../utils/ijazahExtractor';

interface ElectronicImportLegacyProps {
  onDocumentImported?: (newDoc: VerifiedDocument) => void;
  onGoToSavedDocs?: () => void;
  onOpenVerification?: (token: string) => void;
}

export const ElectronicImportLegacy: React.FC<ElectronicImportLegacyProps> = ({
  onDocumentImported,
  onGoToSavedDocs,
  onOpenVerification
}) => {
  // Workflow Step: 'upload' | 'form_and_preview' | 'success'
  const [step, setStep] = useState<'upload' | 'form_and_preview' | 'success'>('upload');

  // PDF File info
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Canvas Ref and element state for PDF Page Preview
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState<boolean>(false);
  const renderTaskRef = useRef<any>(null);

  // Form Data (Auto-synced with AppSettings for Instansi & Kepala Sekolah)
  const [formData, setFormData] = useState<ElectronicDocFormData>(() => {
    const settings = getAppSettings();
    return {
      documentName: 'Ijazah - Ahmad Fauzi',
      documentType: 'Ijazah',
      documentNumber: '111202663419179',
      documentDate: '14 Juli 2026',
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: 'Ijazah resmi kelulusan sekolah dengan barcode fisik eksisting.'
    };
  });

  // Legacy barcode URL (Link hasil scan barcode pada aplikasi lama)
  const [legacyBarcodeUrl, setLegacyBarcodeUrl] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState<string>('');

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedDoc, setSavedDoc] = useState<VerifiedDocument | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedRedirect, setCopiedRedirect] = useState<boolean>(false);

  // Auto-sync settings when modified in settings tab
  useEffect(() => {
    const onSettingsChange = () => {
      const settings = getAppSettings();
      setFormData((prev) => ({
        ...prev,
        issuer: settings.issuer,
        signerName: settings.signerName,
        signerPosition: settings.signerPosition
      }));
    };
    window.addEventListener('app_settings_changed', onSettingsChange);
    return () => window.removeEventListener('app_settings_changed', onSettingsChange);
  }, []);

  const handleApplySettingsProfile = () => {
    const settings = getAppSettings();
    setFormData((prev) => ({
      ...prev,
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition
    }));
  };

  // Update Token and synchronize Legacy Barcode URL & Document Type
  const handleCustomTokenChange = (val: string) => {
    setCustomToken(val);
    setLegacyBarcodeUrl(formatLegacyBarcodeUrl(val));

    const upperVal = val.trim().toUpperCase();
    if (upperVal.startsWith('TRN-') || upperVal.startsWith('TRN')) {
      setFormData((prev) => ({
        ...prev,
        documentType: 'Transkrip',
        documentName: prev.documentName.replace(/^Ijazah/i, 'Transkrip')
      }));
    } else if (upperVal.startsWith('IJZ-') || upperVal.startsWith('IJZ')) {
      setFormData((prev) => ({
        ...prev,
        documentType: 'Ijazah',
        documentName: prev.documentName.replace(/^Transkrip/i, 'Ijazah')
      }));
    }
  };

  // Attempt to extract a token/code from legacy URL automatically
  const handleLegacyUrlChange = (val: string) => {
    setLegacyBarcodeUrl(val);
    const trimmed = val.trim();
    if (trimmed) {
      try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const urlObj = new URL(trimmed);
          const qToken =
            urlObj.searchParams.get('kode') ||
            urlObj.searchParams.get('token') ||
            urlObj.searchParams.get('v') ||
            urlObj.searchParams.get('id');
          if (qToken) {
            handleCustomTokenChange(qToken.trim().toUpperCase());
            return;
          }
          const segments = urlObj.pathname.split('/').filter(Boolean);
          if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            if (lastSegment && lastSegment.length >= 4 && lastSegment.length <= 40) {
              handleCustomTokenChange(lastSegment.trim().toUpperCase());
              return;
            }
          }
        }
      } catch {
        // Not a standard URL, continue
      }
    }
  };

  // Handle PDF file upload with automatic Ijazah / Transkrip field extraction
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Mohon pilih berkas dengan format PDF (.pdf)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
      setPdfBytes(bytes);
      setFileName(file.name);
      setFileSizeStr((file.size / (1024 * 1024)).toFixed(2) + ' MB');

      const settings = getAppSettings();

      // Ekstraksi otomatis berbasis prefix Token (IJZ- vs TRN-):
      // - TRN- (Transkrip): Nama Dokumen "Transkrip - {nama siswa}" (setelah "Nama Lengkap :"), Nomor (setelah "Nomor :"), Jenis "Transkrip"
      // - IJZ- (Ijazah): Nama Dokumen "Ijazah - {nama siswa}" (setelah "Dengan ini menyatakan bahwa:"), Nomor (15 digit No. Ijazah:), Jenis "Ijazah"
      // - Tanggal Dokumen: tetap "14 Juli 2026"
      const extracted = await extractIjazahMetadata(bytes, file.name);

      setCustomToken(extracted.token);
      setLegacyBarcodeUrl(extracted.legacyBarcodeUrl);

      setFormData((prev) => ({
        ...prev,
        documentName: extracted.documentName,
        documentType: extracted.documentType,
        documentNumber: extracted.documentNumber,
        documentDate: extracted.documentDate,
        issuer: settings.issuer,
        signerName: settings.signerName,
        signerPosition: settings.signerPosition,
        description: `${extracted.documentType} kelulusan siswa an. ${extracted.studentName} dengan barcode fisik eksisting.`
      }));

      setStep('form_and_preview');
    };
    reader.readAsArrayBuffer(file);
  };

  // Load sample diploma PDF (IJZ-) and run auto-extraction
  const handleLoadSamplePdf = async () => {
    const settings = getAppSettings();
    const sample = await generateSampleIjazahPdf();
    const sampleFileName = 'IJZ-111202663419179_sign.pdf';
    setPdfBytes(sample);
    setFileName(sampleFileName);
    setFileSizeStr('74 KB');

    const extracted = await extractIjazahMetadata(sample, sampleFileName);

    setCustomToken(extracted.token); // "IJZ-111202663419179"
    setLegacyBarcodeUrl(extracted.legacyBarcodeUrl);

    setFormData({
      documentName: extracted.documentName, // "Ijazah - Ahmad Fauzi"
      documentType: extracted.documentType, // "Ijazah"
      documentNumber: extracted.documentNumber, // "111202663419179"
      documentDate: extracted.documentDate, // "14 Juli 2026"
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: 'Ijazah resmi kelulusan sekolah dasar dengan barcode fisik eksisting.'
    });

    setStep('form_and_preview');
  };

  // Load sample transkrip PDF (TRN-) and run auto-extraction
  const handleLoadSampleTranskripPdf = async () => {
    const settings = getAppSettings();
    const sample = await generateSampleTranskripPdf();
    const sampleFileName = 'TRN-035_sign.pdf';
    setPdfBytes(sample);
    setFileName(sampleFileName);
    setFileSizeStr('78 KB');

    const extracted = await extractIjazahMetadata(sample, sampleFileName);

    setCustomToken(extracted.token); // "TRN-035"
    setLegacyBarcodeUrl(extracted.legacyBarcodeUrl);

    setFormData({
      documentName: extracted.documentName, // "Transkrip - AL-JAUZA'I"
      documentType: extracted.documentType, // "Transkrip"
      documentNumber: extracted.documentNumber, // "400.3.11.3/035/SDN1GPK/VI/2026"
      documentDate: extracted.documentDate, // "14 Juli 2026"
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: `Transkrip nilai kelulusan siswa an. ${extracted.studentName} dengan barcode fisik eksisting.`
    });

    setStep('form_and_preview');
  };

  // Render current PDF page to canvas preview
  useEffect(() => {
    if (!pdfBytes || !canvasElement || step !== 'form_and_preview') return;
    const currentBytes = pdfBytes;
    let isMounted = true;

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        setIsRenderingPreview(true);

        const loadingTask = pdfjsLib.getDocument({
          data: currentBytes.slice(0),
          useSystemFonts: true
        });
        const doc = await loadingTask.promise;
        if (!isMounted) return;
        setNumPages(doc.numPages);

        const page = await doc.getPage(currentPage);
        if (!isMounted || !canvasElement) return;

        // Auto-scale to fit preview container crisply
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 380;
        const scale = Math.min(1.2, Math.max(0.65, targetWidth / unscaledViewport.width));
        const viewport = page.getViewport({ scale });

        canvasElement.width = viewport.width;
        canvasElement.height = viewport.height;

        const ctx = canvasElement.getContext('2d');
        if (!ctx || !isMounted) return;
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas: canvasElement
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Failed to preview PDF', err);
        }
      } finally {
        if (isMounted) {
          setIsRenderingPreview(false);
        }
      }
    }

    renderPage();
    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfBytes, currentPage, step, canvasElement]);

  // Handle Save Legacy Document
  const handleSaveLegacyDocument = async () => {
    if (!pdfBytes) return;

    setIsSaving(true);
    try {
      // Use clean custom token or generate unique token
      const tokenToUse = customToken.trim()
        ? customToken.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
        : generateUniqueToken();

      const verificationUrl = generateVerificationUrl(tokenToUse);
      const docId = `legacy_${tokenToUse}_${Date.now()}`;

      const newRecord: VerifiedDocument = {
        documentId: docId,
        verificationToken: tokenToUse,
        documentName: formData.documentName.trim() || 'Ijazah Kelulusan Siswa',
        documentType: formData.documentType.trim() || 'Ijazah',
        documentNumber: formData.documentNumber.trim(),
        documentDate: formData.documentDate.trim(),
        issuer: formData.issuer.trim(),
        signerName: formData.signerName.trim(),
        signerPosition: formData.signerPosition.trim(),
        description: formData.description.trim(),
        originalFileName: fileName,
        finalFileName: fileName, // File remains 100% original, NO new barcode added
        qrPage: 1,
        qrX: 0,
        qrY: 0,
        qrWidth: 0,
        qrHeight: 0,
        showLabel: false,
        status: 'VALID',
        verificationCount: 0,
        createdAt: Date.now(),
        allowView: true,
        allowDownload: true,
        verificationUrl,
        googleDriveUrl: googleDriveUrl.trim() || '',
        legacyBarcodeUrl: legacyBarcodeUrl.trim() || '',
        isLegacyDocument: true
      };

      await saveVerifiedDocument(newRecord);

      setSavedDoc(newRecord);
      setStep('success');

      if (onDocumentImported) {
        onDocumentImported(newRecord);
      }
    } catch (err: any) {
      console.error('Save error', err);
      alert('Gagal menyimpan ijazah: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!savedDoc?.verificationUrl) return;
    navigator.clipboard.writeText(savedDoc.verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyRedirectSnippet = () => {
    if (!savedDoc) return;
    const redirectInfo = `Link Hasil Scan Lama: ${savedDoc.legacyBarcodeUrl || '-'}\nDi-redirect ke Link Verifikasi Baru:\n${savedDoc.verificationUrl}`;
    navigator.clipboard.writeText(redirectInfo);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 shadow-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[11px] font-bold uppercase tracking-wider mb-1 border border-purple-500/20">
              Skenario B • Barcode Eksisting
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Upload Ijazah Lama (Barcode Eksisting)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
              Daftarkan ijazah yang sudah memiliki barcode dari sistem lama. <strong>Tidak perlu menambah barcode baru</strong> pada file PDF. Cukup sesuaikan data ijazah dan masukkan link hasil scan barcode lama agar otomatis terhubung ke sistem verifikasi ini.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[11px] text-purple-300 font-medium bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-800/60">
            ✓ Dokumen Asli Tetap Utuh
          </span>
        </div>
      </div>

      {/* STEP 1: UPLOAD DOKUMEN IJAZAH LAMA */}
      {step === 'upload' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-3xl p-10 text-center transition bg-slate-900/40 relative group flex flex-col items-center justify-center cursor-pointer shadow-xl">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition shadow-lg">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">
              Pilih atau Seret Berkas PDF Ijazah Lama
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Format: PDF (Maks. 25 MB). Dokumen tidak akan diubah atau dicap barcode baru.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs text-slate-300 border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Mempertahankan Barcode Asli yang Sudah Dicetak</span>
            </div>
          </div>

          {/* Quick Sample Option: Both IJZ- and TRN- */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <span className="text-xs text-slate-500">Uji coba simulasi otomatis:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleLoadSamplePdf}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-300 border border-purple-800/40 transition flex items-center gap-1.5 shadow-sm"
              >
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Contoh Ijazah (IJZ-)</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleTranskripPdf}
                className="px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-xs font-semibold text-indigo-300 border border-indigo-700/50 transition flex items-center gap-1.5 shadow-sm"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Contoh Transkrip (TRN-)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: EDIT DATA DOKUMEN & LINK SCAN LAMA */}
      {step === 'form_and_preview' && (
        <div className="space-y-6">
          {/* Top Info Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">{fileName}</h3>
                <p className="text-xs text-slate-400">
                  {fileSizeStr} • {numPages} Halaman • Mode Ijazah Lama (Tanpa Barcode Baru)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Ganti Berkas</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSaveLegacyDocument}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Ijazah...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Daftarkan Ijazah Ini</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Two-Column Layout: Left Form & Right PDF Preview + Redirect Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Data Dokumen & Legacy Link Input */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <h4 className="font-bold text-sm text-white">DATA IJAZAH LAMA</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplySettingsProfile}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-semibold border border-purple-500/20 transition flex items-center gap-1"
                    title="Muat nama instansi dan penandatangan dari menu Pengaturan"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Muat Profil Pengaturan</span>
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Highlight Box: LINK HASIL SCAN BARCODE LAMA & TOKEN */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/40 shadow-inner space-y-3">
                    {/* Token Identification (dari judul berkas tanpa _sign) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-purple-200 font-bold flex items-center gap-1.5 text-xs">
                          <Hash className="w-3.5 h-3.5 text-purple-400" />
                          <span>ID / Token Dokumen</span>
                        </label>
                        <span className="text-[10px] text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700/60 font-mono">
                          Dari judul berkas tanpa "_sign"
                        </span>
                      </div>
                      <input
                        type="text"
                        value={customToken}
                        onChange={(e) => handleCustomTokenChange(e.target.value)}
                        placeholder="Contoh: DN-01_D-SD_0012345"
                        className="w-full bg-slate-950 border border-purple-700/70 focus:border-purple-400 rounded-xl px-3 py-2 text-purple-200 font-mono font-bold text-xs"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Diambil otomatis dari judul file PDF dengan menghilangkan kata <code>_sign</code> di belakangnya.
                      </p>
                    </div>

                    {/* Link Hasil Scan Barcode Lama */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-purple-200 font-bold flex items-center gap-1.5 text-xs">
                          <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                          <span>Link Hasil Scan Barcode pada Aplikasi Lama</span>
                        </label>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50 font-mono">
                          Format Otomatis
                        </span>
                      </div>

                      <input
                        type="url"
                        value={legacyBarcodeUrl}
                        onChange={(e) => handleLegacyUrlChange(e.target.value)}
                        placeholder="https://sdnegeri1gapuk.github.io/verifikasi-ijazah-v2/verifikasi.html?kode=..."
                        className="w-full bg-slate-900 border border-purple-700/60 focus:border-purple-400 rounded-xl px-3 py-2.5 text-white font-mono text-[11px] placeholder-slate-500 shadow-inner"
                      />

                      <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                        💡 Otomatis diisi dengan format: <code className="text-purple-300 font-mono text-[10px]">https://sdnegeri1gapuk.github.io/verifikasi-ijazah-v2/verifikasi.html?kode=&#123;token&#125;</code>. Nilai token otomatis mengikuti judul file ijazah yang di-upload.
                      </p>
                    </div>
                  </div>

                  {/* Standard Metadata Fields */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">1. Nama Dokumen</label>
                      <span className="text-[10px] text-purple-400 font-mono">
                        {formData.documentType === 'Transkrip'
                          ? 'Format: Transkrip - {nama siswa}'
                          : 'Format: Ijazah - {nama siswa}'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formData.documentName}
                      onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                      placeholder={
                        formData.documentType === 'Transkrip'
                          ? "Contoh: Transkrip - AL-JAUZA'I"
                          : 'Contoh: Ijazah - Ahmad Fauzi'
                      }
                      className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">2. Jenis Dokumen</label>
                      <input
                        type="text"
                        value={formData.documentType}
                        onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                        placeholder="Ijazah / Transkrip"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition font-semibold text-purple-300"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 font-medium">
                          3. Nomor {formData.documentType === 'Transkrip' ? 'Transkrip' : 'Ijazah'}
                        </label>
                        <span className="text-[10px] text-purple-400 font-mono">
                          {formData.documentType === 'Transkrip'
                            ? 'Setelah "Nomor :"'
                            : '15 Digit (No. Ijazah:)'}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={formData.documentNumber}
                        onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                        placeholder={
                          formData.documentType === 'Transkrip'
                            ? 'Contoh: 400.3.11.3/035/SDN1GPK/VI/2026'
                            : 'Contoh: 111202663419179'
                        }
                        className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 font-medium">4. Tanggal Dokumen</label>
                        <span className="text-[10px] text-purple-400 font-mono">Tgl Tanda Tangan</span>
                      </div>
                      <input
                        type="text"
                        value={formData.documentDate}
                        onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                        placeholder="14 Juli 2026"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 font-medium">5. Instansi / Sekolah</label>
                        <span className="text-[10px] text-purple-400 font-mono">Pengaturan</span>
                      </div>
                      <input
                        type="text"
                        value={formData.issuer}
                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                        placeholder="SD Negeri 1 Gapuk"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 font-medium">6. Kepala Sekolah / Pejabat</label>
                        <span className="text-[10px] text-purple-400 font-mono">Pengaturan</span>
                      </div>
                      <input
                        type="text"
                        value={formData.signerName}
                        onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
                        placeholder="H. Masrun, S.Pd"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 font-medium">7. Jabatan Pejabat</label>
                        <span className="text-[10px] text-purple-400 font-mono">Pengaturan</span>
                      </div>
                      <input
                        type="text"
                        value={formData.signerPosition}
                        onChange={(e) => setFormData({ ...formData, signerPosition: e.target.value })}
                        placeholder="Kepala Sekolah"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                  </div>

                  {/* Google Drive Link */}
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-medium flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>8. Link Google Drive Dokumen Asli (Opsional)</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">Boleh Kosong</span>
                    </div>
                    <input
                      type="url"
                      value={googleDriveUrl}
                      onChange={(e) => setGoogleDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view (Dapat diisi nanti)"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-slate-400">
                      Jika diisi, pengunjung yang memindai ijazah dapat langsung mengunduh salinan berkas lewat tombol "Unduh Dokumen".
                    </p>
                  </div>

                  {/* Description / Student Details */}
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">
                      9. Keterangan / Rincian Siswa (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Catatan NISN, peminatan/jurusan, tahun ajaran, dsb."
                      className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white transition resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveLegacyDocument}
                    disabled={isSaving}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mendaftarkan Ijazah ke Database...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>SIMPAN & DAFTARKAN IJAZAH KE SISTEM VERIFIKASI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: PDF Preview & Redirection Helper Info */}
            <div className="lg:col-span-5 space-y-4">
              {/* Redirection Simulation Box */}
              <div className="bg-slate-900/90 border border-purple-800/40 rounded-2xl p-4 shadow-xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-purple-300 font-bold">
                  <ExternalLink className="w-4 h-4" />
                  <span>Simulasi Pengalihan & Verifikasi</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Link Barcode Lama:</span>
                    <span className="font-mono text-purple-300 break-all">
                      {legacyBarcodeUrl.trim() || '(Belum dimasukkan)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center text-slate-500 my-1">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      ↓ Otomatis Mengarah ke Halaman Verifikasi Baru ↓
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Status Hasil Scan:</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      DOKUMEN VALID RESMI
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-purple-950/30 p-2.5 rounded-xl border border-purple-800/30 leading-relaxed">
                  🛡️ <strong>Tanpa Perubahan Fisik:</strong> Ijazah fisik yang sudah tercetak dipegang siswa tetap sah. Siapapun yang memeriksa nomor dokumen atau link hasil scan barcode lama akan menemukan catatan verifikasi resmi di aplikasi baru ini.
                </div>
              </div>

              {/* PDF Document Preview Canvas */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium text-white">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span>Preview Berkas Asli (Hal. {currentPage}/{numPages})</span>
                  </div>
                  {numPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                        disabled={currentPage >= numPages}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-center min-h-[360px] max-h-[500px] overflow-auto">
                  {isRenderingPreview && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-xs rounded-xl z-10 text-xs text-purple-300 gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                      <span>Memuat Pratinjau Dokumen...</span>
                    </div>
                  )}
                  <canvas
                    ref={(el) => {
                      canvasRef.current = el;
                      setCanvasElement(el);
                    }}
                    className="rounded shadow-xl max-w-full max-h-[480px] bg-white object-contain border border-slate-800"
                  />
                </div>
                <p className="text-[10px] text-center text-slate-500">
                  Dokumen asli ini tidak ditempeli barcode tambahan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS & REDIRECT GUIDE */}
      {step === 'success' && savedDoc && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 border border-purple-500/20">
                PENDAFTARAN IJAZAH BERHASIL
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                ✓ IJAZAH RESMI TERDAFTAR DI SISTEM VERIFIKASI
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Ijazah lama Anda kini telah terdaftar sebagai <strong>VALID</strong> di database verifikasi baru tanpa perlu mengubah fisik atau mencap barcode baru.
              </p>
            </div>

            {/* Document Details Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Nama Dokumen:</span>
                <span className="font-semibold text-white text-sm">{savedDoc.documentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Nomor Ijazah:</span>
                <span className="font-mono font-bold text-purple-300 text-sm">
                  {savedDoc.documentNumber || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">ID / Token Verifikasi:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider">
                  {savedDoc.verificationToken}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Status Dokumen:</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  VALID
                </span>
              </div>
            </div>

            {/* Redirection Mapping Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-purple-800/40 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-purple-300 font-bold flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-purple-400" />
                  <span>Pemetaan Tautan Pengalihan (Redirect):</span>
                </span>
                <button
                  onClick={handleCopyRedirectSnippet}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                >
                  {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRedirect ? 'Disalin!' : 'Salin Info'}</span>
                </button>
              </div>

              {savedDoc.legacyBarcodeUrl && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Tautan Hasil Scan Barcode Lama:</span>
                  <span className="font-mono text-slate-300 break-all text-[11px]">
                    {savedDoc.legacyBarcodeUrl}
                  </span>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-900 border border-purple-700/50">
                <span className="text-purple-400 block text-[10px]">Tautan Verifikasi Resmi di Aplikasi Baru Ini:</span>
                <span className="font-mono text-emerald-400 font-bold break-all text-[11px]">
                  {savedDoc.verificationUrl}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCopyLink}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Tautan Disalin!' : 'Salin Link Verifikasi Baru'}</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenVerification) {
                    onOpenVerification(savedDoc.verificationToken);
                  } else {
                    window.open(savedDoc.verificationUrl, '_blank');
                  }
                }}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Halaman Verifikasi</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-center gap-4">
              <button
                onClick={() => {
                  setStep('upload');
                  setPdfBytes(null);
                  setLegacyBarcodeUrl('');
                  setCustomToken('');
                  setSavedDoc(null);
                }}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
              >
                <span>Upload Ijazah Lainnya</span>
              </button>
              {onGoToSavedDocs && (
                <button
                  onClick={onGoToSavedDocs}
                  className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1.5"
                >
                  <span>Lihat Dokumen Tersimpan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
