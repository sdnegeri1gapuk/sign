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
  QrCode,
  AlertCircle,
  Eye,
  CheckCircle2,
  Building2,
  Calendar,
  Hash,
  UserCheck,
  Move,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Download,
  Sparkles,
  Layers,
  Settings2
} from 'lucide-react';
import {
  VerifiedDocument,
  ElectronicDocFormData,
  QrPlacementSettings
} from '../../types';
import {
  saveVerifiedDocument,
  generateUniqueToken,
  generateVerificationUrl,
  generateQrCodeDataUrl
} from '../../utils/electronicService';
import { getAppSettings, saveAppSettings, QrLogoType } from '../../utils/appSettings';
import {
  generateSampleIjazahPdf,
  generateSampleTranskripPdf
} from '../../utils/samplePdf';
import { pdfjsLib } from '../../utils/pdfWorker';
import { extractIjazahMetadata } from '../../utils/ijazahExtractor';
import {
  exportOriginalWithQrCode,
  exportFlattenedWithQrCode
} from '../../utils/pdfElectronicExport';
import { ElectronicBatchSigningIjazah } from './ElectronicBatchSigningIjazah';
import { BsreLoginModal } from './BsreLoginModal';
import { BsreCertificateModal } from './BsreCertificateModal';
import {
  getActiveBsreAccount,
  isBsreAutoSignEnabled,
  setBsreAutoSignEnabled,
  signDocumentWithBsre,
  BsreAccount
} from '../../utils/bsreService';

/**
 * Posisi default barcode:
 * - Dokumen Ijazah: default X: 346, Y: 622 (posisi standar saat ini)
 * - Dokumen Transkrip: default X: 344, Y: 662 (sesuai instruksi)
 */
export const getDefaultBarcodePosition = (
  documentType: string = 'Ijazah'
): { x: number; y: number } => {
  const isTranscript = documentType?.toLowerCase().includes('transkrip');
  if (isTranscript) {
    return { x: 344, y: 662 };
  }
  return { x: 346, y: 622 };
};

interface ElectronicUploadIjazahBaruProps {
  onDocumentImported?: (newDoc: VerifiedDocument) => void;
  onGoToSavedDocs?: () => void;
  onOpenVerification?: (token: string) => void;
  mode?: 'single' | 'batch';
  onModeChange?: (mode: 'single' | 'batch') => void;
}

export const ElectronicUploadIjazahBaru: React.FC<ElectronicUploadIjazahBaruProps> = ({
  onDocumentImported,
  onGoToSavedDocs,
  onOpenVerification,
  mode: externalMode,
  onModeChange
}) => {
  // Workflow Mode: 'single' (Dokumen Satuan) | 'batch' (Batch Signing / Massal)
  const [internalMode, setInternalMode] = useState<'single' | 'batch'>('single');
  const mode = externalMode !== undefined ? externalMode : internalMode;
  const setMode = (newMode: 'single' | 'batch') => {
    setInternalMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };
  const [batchInitialFiles, setBatchInitialFiles] = useState<File[]>([]);

  // Single file upload progress state with percentage
  const [singleUploadProgress, setSingleUploadProgress] = useState<{
    isUploading: boolean;
    percent: number;
    stage: string;
    fileName: string;
    fileSizeStr: string;
    isComplete: boolean;
  }>({
    isUploading: false,
    percent: 0,
    stage: '',
    fileName: '',
    fileSizeStr: '',
    isComplete: false
  });

  // Workflow Step for single mode: 'upload' | 'editor' | 'success'
  const [step, setStep] = useState<'upload' | 'editor' | 'success'>('upload');

  // PDF File info
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [loadedPdfDoc, setLoadedPdfDoc] = useState<any>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[]>([]);

  // Canvas ref, render task and zoom (0.78 default fits full A4 page vertically in standard screen)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(0.78);

  // Form Data (Auto-filled from extraction & AppSettings)
  const [formData, setFormData] = useState<ElectronicDocFormData>(() => {
    const settings = getAppSettings();
    return {
      documentName: 'Ijazah - Siswa',
      documentType: 'Ijazah',
      documentNumber: '',
      documentDate: '14 Juli 2026',
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: 'Ijazah resmi kelulusan sekolah dengan verifikasi barcode terintegrasi.'
    };
  });

  // Token Verifikasi Acak & URL Verifikasi Web Baru (Mekanisme sama persis seperti menu Buat Dokumen)
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const [studentNameExtracted, setStudentNameExtracted] = useState<string>('');
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  // QR Code Placement Settings:
  // Sesuai permintaan:
  // - Ijazah: default x: 346, y: 622 (posisi standar yang sekarang)
  // - Transkrip: default x: 344, y: 662
  // Ukuran: 85, tampilkan label keterangan = OFF (false)
  const [qrSettings, setQrSettings] = useState<QrPlacementSettings>(() => {
    const pos = getDefaultBarcodePosition('Ijazah');
    return {
      pageNumber: 1,
      x: pos.x,
      y: pos.y,
      width: 85,
      height: 85,
      showLabel: false,
      labelText: 'Scan Verifikasi Ijazah'
    };
  });

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrGenerated, setIsQrGenerated] = useState<boolean>(false);
  const [isPreviewFinal, setIsPreviewFinal] = useState<boolean>(false);

  // Logo di tengah barcode state
  const initialSettings = getAppSettings();
  const [qrLogoEnabled, setQrLogoEnabled] = useState<boolean>(initialSettings.qrLogoEnabled);
  const [qrLogoType, setQrLogoType] = useState<QrLogoType>(initialSettings.qrLogoType);

  // Akun Resmi BSrE BSSN & Penandatanganan Digital
  const [bsreAccount, setBsreAccount] = useState<BsreAccount | null>(getActiveBsreAccount());
  const [isBsreSignEnabled, setIsBsreSignEnabled] = useState<boolean>(isBsreAutoSignEnabled());
  const [isBsreLoginModalOpen, setIsBsreLoginModalOpen] = useState<boolean>(false);
  const [isBsreCertModalOpen, setIsBsreCertModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleBsreChange = (e: any) => {
      setBsreAccount(e.detail || null);
    };
    window.addEventListener('bsre_account_changed', handleBsreChange);
    return () => window.removeEventListener('bsre_account_changed', handleBsreChange);
  }, []);

  const handleToggleLogo = async (enabled: boolean) => {
    setQrLogoEnabled(enabled);
    saveAppSettings({ qrLogoEnabled: enabled });
    if (verificationUrl) {
      const updated = await generateQrCodeDataUrl(verificationUrl, {
        enabled,
        logoType: qrLogoType
      });
      setQrDataUrl(updated);
    }
  };

  const handleChangeLogoType = async (type: QrLogoType) => {
    setQrLogoType(type);
    setQrLogoEnabled(true);
    saveAppSettings({ qrLogoType: type, qrLogoEnabled: true });
    if (verificationUrl) {
      const updated = await generateQrCodeDataUrl(verificationUrl, {
        enabled: true,
        logoType: type
      });
      setQrDataUrl(updated);
    }
  };

  // Interactive Drag & Resize State on PDF Canvas
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 346,
    y: 622,
    width: 85,
    height: 85
  });

  // Export / Finalization Modal & Process State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportMode, setExportMode] = useState<'original' | 'flattened'>('original');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [exportProgressPercent, setExportProgressPercent] = useState<number>(0);
  const [savedDoc, setSavedDoc] = useState<VerifiedDocument | null>(null);
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string>('');
  const [downloadFileName, setDownloadFileName] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Auto-sync settings when profile changes
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

  // Render current PDF page on HTML5 canvas cleanly and visibly (Pastikan isi ijazah tampil tajam)
  useEffect(() => {
    if (step !== 'editor' || !pdfBytes || !canvasElement) return;

    let isMounted = true;

    async function renderPage() {
      try {
        setIsRenderingPage(true);

        const loadingTask = pdfjsLib.getDocument({
          data: pdfBytes!.slice(0),
          useSystemFonts: true
        });
        const doc = await loadingTask.promise;
        if (!isMounted || !canvasElement) return;

        setNumPages(doc.numPages);
        const page = await doc.getPage(currentPage);
        if (!isMounted || !canvasElement) return;

        const viewport = page.getViewport({ scale: zoomScale });
        canvasElement.width = Math.round(viewport.width);
        canvasElement.height = Math.round(viewport.height);

        const ctx = canvasElement.getContext('2d');
        if (!ctx || !isMounted) return;

        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        const renderContext = {
          canvasContext: ctx,
          viewport,
          canvas: canvasElement
        };
        await page.render(renderContext).promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render Ijazah page error', err);
        }
      } finally {
        if (isMounted) {
          setIsRenderingPage(false);
        }
      }
    }

    renderPage();
    return () => {
      isMounted = false;
    };
  }, [step, pdfBytes, canvasElement, currentPage, zoomScale]);

  // Generate QR Code dengan token acak baru & link verifikasi web baru (Sama persis Buat Dokumen)
  const handleGenerateNewTokenAndQr = async () => {
    const token = generateUniqueToken();
    const url = generateVerificationUrl(token);
    try {
      const qrData = await generateQrCodeDataUrl(url);
      setVerificationToken(token);
      setVerificationUrl(url);
      setQrDataUrl(qrData);
      setIsQrGenerated(true);
    } catch (err) {
      console.error('Failed to generate QR code data URL', err);
    }
  };

  // Handle PDF file upload with full automatic Ijazah field extraction and percentage progress
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Jika pengguna memilih banyak berkas sekaligus, otomatis alihkan ke Batch Signing dan kirim berkasnya
    if (files.length > 1) {
      setBatchInitialFiles(Array.from(files));
      setMode('batch');
      return;
    }

    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Mohon pilih berkas dengan format PDF (.pdf)');
      return;
    }

    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setSingleUploadProgress({
      isUploading: true,
      percent: 5,
      stage: `Membaca berkas PDF (${sizeStr})...`,
      fileName: file.name,
      fileSizeStr: sizeStr,
      isComplete: false
    });

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const readPercent = Math.min(45, Math.round((ev.loaded / ev.total) * 45));
        setSingleUploadProgress((prev) => ({
          ...prev,
          percent: Math.max(prev.percent, readPercent),
          stage: `Mengunggah berkas (${((ev.loaded / (1024 * 1024))).toFixed(1)} MB)...`
        }));
      }
    };

    reader.onload = async (ev) => {
      const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
      setFileName(file.name);
      setFileSizeStr(sizeStr);

      setSingleUploadProgress((prev) => ({
        ...prev,
        percent: 50,
        stage: 'Mengekstrak data ijazah, nomor & nama siswa...'
      }));

      const settings = getAppSettings();

      // Ekstraksi data otomatis:
      // 1. Nama Dokumen -> "Ijazah - {nama siswa}"
      // 2. Nomor Ijazah -> dari pojok kanan atas file
      // 3. Tanggal Dokumen -> tanggal tanda tangan setelah " Kabupaten Lombok Timur,"
      const extracted = await extractIjazahMetadata(bytes, file.name);

      setStudentNameExtracted(extracted.studentName);

      setFormData((prev) => ({
        ...prev,
        documentName: extracted.documentName,
        documentType: extracted.documentType,
        documentNumber: extracted.documentNumber,
        documentDate: extracted.documentDate || '14 Juli 2026',
        issuer: settings.issuer,
        signerName: settings.signerName,
        signerPosition: settings.signerPosition,
        description: `${extracted.documentType} resmi kelulusan siswa an. ${extracted.studentName} dengan penempelan barcode verifikasi.`
      }));

      setSingleUploadProgress((prev) => ({
        ...prev,
        percent: 75,
        stage: `Menghasilkan kode verifikasi & QR untuk ${extracted.studentName || 'siswa'}...`
      }));

      // Mekanisme penandatanganan sama persis seperti menu Buat Dokumen:
      // Menggunakan link verifikasi web baru dan token acak baru
      const token = generateUniqueToken();
      const url = generateVerificationUrl(token);
      const qrData = await generateQrCodeDataUrl(url);

      setVerificationToken(token);
      setVerificationUrl(url);
      setQrDataUrl(qrData);
      setIsQrGenerated(true);

      // Default barcode:
      // Jika dokumen Ijazah: X: 346, Y: 622
      // Jika dokumen Transkrip: X: 344, Y: 662
      const isTranscript = extracted.documentType?.toLowerCase().includes('transkrip');
      const defaultBarcodePos = getDefaultBarcodePosition(extracted.documentType);

      setQrSettings({
        pageNumber: 1,
        x: defaultBarcodePos.x,
        y: defaultBarcodePos.y,
        width: 85,
        height: 85,
        showLabel: false,
        labelText: isTranscript ? 'Scan Verifikasi Transkrip' : 'Scan Verifikasi Ijazah'
      });

      setSingleUploadProgress((prev) => ({
        ...prev,
        percent: 90,
        stage: 'Memvalidasi lembar dokumen PDF...'
      }));

      // Pre-calculate page dimensions & page count
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: bytes.slice(0),
          useSystemFonts: true
        });
        const doc = await loadingTask.promise;
        setNumPages(doc.numPages);
        const dims: { width: number; height: number }[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1.0 });
          dims.push({ width: Math.round(vp.width), height: Math.round(vp.height) });
        }
        setPageDimensions(dims);
      } catch (err) {
        console.error('Failed to inspect PDF pages', err);
      }

      setSingleUploadProgress((prev) => ({
        ...prev,
        percent: 100,
        stage: 'Selesai! Berkas siap ditandatangani.',
        isComplete: true
      }));

      await new Promise((res) => setTimeout(res, 500));

      setPdfBytes(bytes);
      setCurrentPage(1);
      setStep('editor');
      setSingleUploadProgress((prev) => ({ ...prev, isUploading: false }));
    };

    reader.onerror = () => {
      alert('Gagal membaca berkas PDF');
      setSingleUploadProgress((prev) => ({ ...prev, isUploading: false }));
    };

    reader.readAsArrayBuffer(file);
  };

  // Load sample diploma PDF and run auto-extraction
  const handleLoadSamplePdf = async () => {
    const settings = getAppSettings();
    const sample = await generateSampleIjazahPdf();
    const sampleFileName = 'IJZ-111202663419179_sign.pdf';
    setFileName(sampleFileName);
    setFileSizeStr('74 KB');

    const extracted = await extractIjazahMetadata(sample, sampleFileName);

    setStudentNameExtracted(extracted.studentName);

    setFormData({
      documentName: extracted.documentName,
      documentType: extracted.documentType,
      documentNumber: extracted.documentNumber,
      documentDate: extracted.documentDate || '14 Juli 2026',
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: 'Ijazah resmi kelulusan sekolah dasar dengan barcode QR Code verifikasi terintegrasi.'
    });

    // Generate token acak baru & URL verifikasi web baru
    const token = generateUniqueToken();
    const url = generateVerificationUrl(token);
    const qrData = await generateQrCodeDataUrl(url);

    setVerificationToken(token);
    setVerificationUrl(url);
    setQrDataUrl(qrData);
    setIsQrGenerated(true);

    // Default barcode: x: 346, y: 622, width: 85, height: 85, showLabel: false
    setQrSettings({
      pageNumber: 1,
      x: 346,
      y: 622,
      width: 85,
      height: 85,
      showLabel: false,
      labelText: 'Scan Verifikasi Ijazah'
    });

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: sample.slice(0),
        useSystemFonts: true
      });
      const doc = await loadingTask.promise;
      setNumPages(doc.numPages);
      const dims: { width: number; height: number }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1.0 });
        dims.push({ width: Math.round(vp.width), height: Math.round(vp.height) });
      }
      setPageDimensions(dims);
    } catch (err) {
      console.error('Failed to inspect sample PDF', err);
    }

    setPdfBytes(sample);
    setCurrentPage(1);
    setStep('editor');
  };

  // Load sample transcript PDF and run auto-extraction
  const handleLoadSampleTranskripPdf = async () => {
    const settings = getAppSettings();
    const sample = await generateSampleTranskripPdf();
    const sampleFileName = 'TRN-111202663419179_sign.pdf';
    setFileName(sampleFileName);
    setFileSizeStr('68 KB');

    const extracted = await extractIjazahMetadata(sample, sampleFileName);

    setStudentNameExtracted(extracted.studentName);

    setFormData({
      documentName: extracted.documentName,
      documentType: extracted.documentType,
      documentNumber: extracted.documentNumber,
      documentDate: extracted.documentDate || '14 Juli 2026',
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: 'Transkrip nilai resmi kelulusan sekolah dasar dengan QR Code verifikasi terintegrasi.'
    });

    // Generate token acak baru & URL verifikasi web baru
    const token = generateUniqueToken();
    const url = generateVerificationUrl(token);
    const qrData = await generateQrCodeDataUrl(url);

    setVerificationToken(token);
    setVerificationUrl(url);
    setQrDataUrl(qrData);
    setIsQrGenerated(true);

    // Default barcode Transkrip: x: 344, y: 662, width: 85, height: 85, showLabel: false
    const pos = getDefaultBarcodePosition('Transkrip');
    setQrSettings({
      pageNumber: 1,
      x: pos.x, // 344
      y: pos.y, // 662
      width: 85,
      height: 85,
      showLabel: false,
      labelText: 'Scan Verifikasi Transkrip'
    });

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: sample.slice(0),
        useSystemFonts: true
      });
      const doc = await loadingTask.promise;
      setNumPages(doc.numPages);
      const dims: { width: number; height: number }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1.0 });
        dims.push({ width: Math.round(vp.width), height: Math.round(vp.height) });
      }
      setPageDimensions(dims);
    } catch (err) {
      console.error('Failed to inspect sample transcript PDF', err);
    }

    setPdfBytes(sample);
    setCurrentPage(1);
    setStep('editor');
  };

  // Preset placement positioning helpers
  const handlePresetPosition = (
    position: 'default-ijazah' | 'default-transkrip' | 'bottom-right' | 'bottom-left' | 'top-right' | 'bottom-center'
  ) => {
    const currentPageDim = pageDimensions[currentPage - 1] || { width: 595, height: 842 };
    const w = 85;
    const h = 85;

    let newX = 346;
    let newY = 622;

    if (position === 'default-ijazah') {
      newX = 346;
      newY = 622;
    } else if (position === 'default-transkrip') {
      newX = 344;
      newY = 662;
    } else if (position === 'bottom-right') {
      // Area ttd Kepala Sekolah (Kanan Bawah)
      newX = Math.max(20, Math.floor(currentPageDim.width - w - 45));
      newY = Math.max(20, Math.floor(currentPageDim.height - h - 65));
    } else if (position === 'bottom-left') {
      newX = 45;
      newY = Math.max(20, Math.floor(currentPageDim.height - h - 65));
    } else if (position === 'top-right') {
      newX = Math.max(20, Math.floor(currentPageDim.width - w - 45));
      newY = 45;
    } else if (position === 'bottom-center') {
      newX = Math.max(20, Math.floor((currentPageDim.width - w) / 2));
      newY = Math.max(20, Math.floor(currentPageDim.height - h - 65));
    }

    setQrSettings((prev) => ({
      ...prev,
      x: newX,
      y: newY,
      width: 85,
      height: 85,
      pageNumber: currentPage
    }));
  };

  // Drag and drop event listeners on PDF Canvas preview
  const handleMouseDownOnQr = (e: React.MouseEvent) => {
    if (isPreviewFinal) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({
      x: qrSettings.x,
      y: qrSettings.y,
      width: qrSettings.width,
      height: qrSettings.height
    });
  };

  const handleMouseDownOnResize = (e: React.MouseEvent) => {
    if (isPreviewFinal) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({
      x: qrSettings.x,
      y: qrSettings.y,
      width: qrSettings.width,
      height: qrSettings.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = (e.clientX - dragStart.x) / zoomScale;
        const dy = (e.clientY - dragStart.y) / zoomScale;
        const currentPageDim = pageDimensions[currentPage - 1] || { width: 595, height: 842 };

        setQrSettings((prev) => ({
          ...prev,
          x: Math.max(
            0,
            Math.min(currentPageDim.width - initialPos.width, Math.round(initialPos.x + dx))
          ),
          y: Math.max(
            0,
            Math.min(currentPageDim.height - initialPos.height, Math.round(initialPos.y + dy))
          )
        }));
      } else if (isResizing) {
        const dx = (e.clientX - dragStart.x) / zoomScale;
        const newSize = Math.max(45, Math.min(220, Math.round(initialPos.width + dx)));

        setQrSettings((prev) => ({
          ...prev,
          width: newSize,
          height: newSize
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, initialPos, zoomScale, pageDimensions, currentPage]);

  // Final export and stamping process (Sama seperti menu Buat Dokumen)
  const handleExecuteExportAndSave = async () => {
    if (!pdfBytes) return;

    try {
      setIsSaving(true);
      setExportProgressPercent(15);
      setExportProgressText('Mempersiapkan penempelan barcode pada berkas Ijazah...');

      const tokenToUse = verificationToken.trim() || generateUniqueToken();
      const finalVerificationUrl = generateVerificationUrl(tokenToUse);

      let finalQrData = qrDataUrl;
      if (!finalQrData || verificationUrl !== finalVerificationUrl) {
        finalQrData = await generateQrCodeDataUrl(finalVerificationUrl);
      }

      // Penandatanganan Resmi BSrE BSSN (Wajib & Otomatis untuk Semua Ijazah Sah)
      setExportProgressPercent(35);
      const activeAccount = bsreAccount || getActiveBsreAccount();
      const currentSignerName = formData.signerName.trim() || activeAccount.namaLengkap;
      setExportProgressText(
        `Menandatangani berkas ijazah secara sah dengan TTE Resmi BSrE BSSN (${currentSignerName})...`
      );
      const bsreSignature = await signDocumentWithBsre(
        pdfBytes,
        {
          documentName: formData.documentName.trim() || `Ijazah - ${studentNameExtracted || 'Siswa'}`,
          documentNumber: formData.documentNumber.trim() || '111202663419179',
          issuer: formData.issuer.trim(),
          signerName: currentSignerName,
          signerPosition: formData.signerPosition.trim() || activeAccount.jabatan
        },
        activeAccount
      );

      setExportProgressPercent(50);
      setExportProgressText(
        exportMode === 'flattened'
          ? 'Merender Flat PDF 300 DPI solid (Anti-Copy & Terkunci)...'
          : 'Menempelkan barcode pada PDF asli (Vektor Tajam)...'
      );

      let stampedPdfBytes: Uint8Array;
      if (exportMode === 'flattened') {
        stampedPdfBytes = await exportFlattenedWithQrCode(
          pdfBytes,
          finalQrData,
          qrSettings,
          (msg, percent) => {
            setExportProgressText(msg);
            setExportProgressPercent(50 + Math.round(percent * 0.4));
          },
          bsreSignature
        );
      } else {
        stampedPdfBytes = await exportOriginalWithQrCode(
          pdfBytes,
          finalQrData,
          qrSettings,
          (msg, percent) => {
            setExportProgressText(msg);
            setExportProgressPercent(50 + Math.round(percent * 0.4));
          },
          bsreSignature
        );
      }

      setExportProgressPercent(92);
      setExportProgressText('Menyimpan data ijazah ke sistem verifikasi...');

      const docId = `doc_${tokenToUse}_${Date.now()}`;
      const newVerifiedDoc: VerifiedDocument = {
        documentId: docId,
        verificationToken: tokenToUse,
        documentName: formData.documentName.trim() || `Ijazah - ${studentNameExtracted || 'Siswa'}`,
        documentType: formData.documentType.trim() || 'Ijazah',
        documentNumber: formData.documentNumber.trim() || '111202663419179',
        documentDate: formData.documentDate.trim() || '14 Juli 2026',
        issuer: formData.issuer.trim(),
        signerName: formData.signerName.trim(),
        signerPosition: formData.signerPosition.trim(),
        description: formData.description.trim(),
        originalFileName: fileName,
        finalFileName: `${formData.documentNumber || tokenToUse}_tertempel_barcode.pdf`,
        qrPage: qrSettings.pageNumber,
        qrX: qrSettings.x,
        qrY: qrSettings.y,
        qrWidth: qrSettings.width,
        qrHeight: qrSettings.height,
        showLabel: qrSettings.showLabel,
        labelText: qrSettings.labelText,
        status: 'VALID',
        verificationCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        allowView: true,
        allowDownload: true,
        qrDataUrl: finalQrData,
        verificationUrl: finalVerificationUrl,
        bsreSignature: bsreSignature
      };

      await saveVerifiedDocument(newVerifiedDoc);

      setExportProgressPercent(100);
      setExportProgressText('Selesai! Menyiapkan unduhan...');

      // Create download blob directly from Uint8Array
      const blob = new Blob([stampedPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadBlobUrl(url);

      const downloadName = `${formData.documentNumber || tokenToUse}_tertempel_barcode.pdf`;
      setDownloadFileName(downloadName);

      // Trigger instant automatic download
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSavedDoc(newVerifiedDoc);
      setIsExportModalOpen(false);
      setStep('success');

      if (onDocumentImported) {
        onDocumentImported(newVerifiedDoc);
      }
    } catch (err: any) {
      console.error('Failed to export and stamp ijazah', err);
      alert('Terjadi kesalahan saat memproses ijazah: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!savedDoc) return;
    const link = savedDoc.verificationUrl || generateVerificationUrl(savedDoc.verificationToken);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const currentPageDim = pageDimensions[currentPage - 1] || { width: 595, height: 842 };

  return (
    <div className="space-y-3">
      {/* Mode Switcher: Dokumen Tunggal vs Batch Signing (Hanya tampil jika tidak dikendalikan oleh menu atas) */}
      {externalMode === undefined && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                mode === 'single'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>Dokumen Tunggal</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                mode === 'batch'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-300" />
              <span>Batch Signing</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {mode === 'single'
                ? 'Mode Satuan: Sesuaikan posisi barcode per lembar'
                : 'Mode Batch: Ekstraksi & tanda tangani serentak'}
            </span>
          </div>
        </div>
      )}

      {mode === 'batch' ? (
        <ElectronicBatchSigningIjazah
          onDocumentImported={onDocumentImported}
          onGoToSavedDocs={onGoToSavedDocs}
          onOpenVerification={onOpenVerification}
          onSwitchToSingleMode={() => setMode('single')}
          initialFiles={batchInitialFiles}
        />
      ) : (
        <>
          {/* STEP 1: INITIAL UPLOAD VIEW */}
          {step === 'upload' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Batch Signing Prompt Banner */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Punya banyak berkas ijazah untuk ditandatangani sekaligus?
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gunakan fitur <strong>Batch Signing</strong> untuk memproses beberapa dokumen sekaligus dengan metadata siswa masing-masing secara bersamaan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition shrink-0 flex items-center gap-1.5"
                >
                  <span>Batch Signing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20">
                  <GraduationCap className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-wide">
                    Upload Ijazah Baru
                  </h3>
                  <p className="text-sm text-slate-400 max-w-lg mx-auto">
                    Unggah berkas PDF Ijazah untuk diekstrak otomatis datanya (Nomor, Tanggal Tanda Tangan, Nama Siswa), dibuatkan Barcode Verifikasi resmi, dan ditempelkan langsung pada posisi lembar ijazah.
                  </p>
                </div>

                {/* Drag & Drop File Zone */}
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const pseudoEvent = {
                        target: { files: e.dataTransfer.files }
                      } as unknown as React.ChangeEvent<HTMLInputElement>;
                      handleFileUpload(pseudoEvent);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 block transition ${
                    singleUploadProgress.isUploading
                      ? 'border-emerald-500 bg-emerald-950/20 cursor-wait'
                      : 'border-slate-700 hover:border-emerald-500 cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 group'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    disabled={singleUploadProgress.isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {singleUploadProgress.isUploading ? (
                    <div className="flex flex-col items-center gap-3 py-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner animate-pulse">
                        <Upload className="w-6 h-6 animate-bounce" />
                      </div>
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-white flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            Sedang Memproses Berkas Ijazah...
                          </span>
                          <span className="font-mono text-emerald-400 font-bold text-sm">
                            {singleUploadProgress.percent}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(5, singleUploadProgress.percent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="truncate max-w-[280px]">
                            {singleUploadProgress.stage}
                          </span>
                          <span className="shrink-0 font-mono text-slate-300">
                            {singleUploadProgress.fileSizeStr}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">
                          Klik untuk pilih berkas PDF Ijazah
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Mendukung berkas ijazah format .pdf (Pilih 1 untuk editor visual, atau beberapa untuk Batch Signing)
                        </p>
                      </div>
                    </div>
                  )}
                </label>

            {/* Quick Sample Buttons */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
              <span className="text-xs text-slate-400 block font-medium">
                Atau coba langsung dengan contoh berkas Ijazah / Transkrip resmi:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadSamplePdf}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-2 shadow"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Contoh Ijazah</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleTranskripPdf}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition flex items-center gap-2 shadow"
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Contoh Transkrip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FORM DATA & INTERACTIVE VISUAL PLACEMENT EDITOR */}
      {step === 'editor' && (
        <div className="space-y-3">
          {/* Active File Bar (Compact 1-row) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white text-xs truncate max-w-xs sm:max-w-md" title={fileName}>
                  {fileName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {numPages} Halaman • {fileSizeStr} •{' '}
                  <span className="text-emerald-400 font-semibold">Data Terbaca Otomatis</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5">
                <Upload className="w-3 h-3" />
                <span>Ganti File</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setIsPreviewFinal(!isPreviewFinal)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                  isPreviewFinal
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>{isPreviewFinal ? 'Mode Edit' : 'Preview'}</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Simpan Ijazah</span>
              </button>
            </div>
          </div>

          {/* Two-Column Layout: Form & Settings Left, Canvas Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* Left Column: Form Data & Barcode Controls */}
            <div className="lg:col-span-4 space-y-2.5 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
              {/* Form Data Card: Hanya menampilkan data utama ijazah yang terbaca otomatis */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-xs text-white">DATA IJAZAH (AUTO-FILLED)</h4>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Otomatis
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">1. Nama Dokumen</label>
                    <input
                      type="text"
                      value={formData.documentName}
                      onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                      placeholder="Ijazah - Nama Siswa"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-white font-semibold transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">2. Jenis Dokumen</label>
                      <input
                        type="text"
                        value={formData.documentType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, documentType: val });
                          const pos = getDefaultBarcodePosition(val);
                          setQrSettings((prev) => ({ ...prev, x: pos.x, y: pos.y }));
                        }}
                        placeholder="Ijazah"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-white transition text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">3. Nomor Ijazah</label>
                      <input
                        type="text"
                        value={formData.documentNumber}
                        onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                        placeholder="Contoh: 111202663419179"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white font-mono transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">4. Tanggal Tanda Tangan</label>
                      <input
                        type="text"
                        value={formData.documentDate}
                        onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                        placeholder="14 Juli 2026"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">5. Instansi / Sekolah</label>
                      <input
                        type="text"
                        value={formData.issuer}
                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                        placeholder="SD Negeri 1 Gapuk"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">6. Kepala Sekolah</label>
                      <input
                        type="text"
                        value={formData.signerName}
                        onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
                        placeholder="H. Masrun, S.Pd"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">7. Jabatan</label>
                      <input
                        type="text"
                        value={formData.signerPosition}
                        onChange={(e) => setFormData({ ...formData, signerPosition: e.target.value })}
                        placeholder="Kepala Sekolah"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition"
                      />
                    </div>
                  </div>

                  {/* Token & URL Verifikasi Web Baru (Sama persis seperti menu Buat Dokumen) */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-emerald-300 font-bold flex items-center gap-1.5 text-xs">
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Token Verifikasi Acak Baru</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateNewTokenAndQr}
                        className="px-2 py-1 rounded-md bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-200 text-[10px] font-semibold border border-emerald-600/40 transition flex items-center gap-1"
                        title="Acak token baru"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Acak Token</span>
                      </button>
                    </div>
                    <div className="bg-slate-950 border border-emerald-800/60 rounded-lg px-2.5 py-1.5 font-mono text-emerald-300 font-bold text-xs flex items-center justify-between">
                      <span>{verificationToken || 'Membuat token...'}</span>
                      <span className="text-[10px] text-emerald-400/80 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-sans">
                        Web Baru
                      </span>
                    </div>
                    {verificationUrl && (
                      <p className="text-[10px] text-slate-400 font-mono break-all line-clamp-1">
                        Tautan: <span className="text-emerald-400">{verificationUrl}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Barcode Positioning Settings */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-xs text-white">POSISI & UKURAN BARCODE</h4>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    X:{qrSettings.x} Y:{qrSettings.y}
                  </span>
                </div>

                {/* Dimension inputs: textbox input saja */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Ukuran (pt)</label>
                    <input
                      type="number"
                      min="40"
                      max="220"
                      value={qrSettings.width}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQrSettings({ ...qrSettings, width: val, height: val });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Posisi X (pt)</label>
                    <input
                      type="number"
                      value={qrSettings.x}
                      onChange={(e) =>
                        setQrSettings({ ...qrSettings, x: Number(e.target.value) })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Posisi Y (pt)</label>
                    <input
                      type="number"
                      value={qrSettings.y}
                      onChange={(e) =>
                        setQrSettings({ ...qrSettings, y: Number(e.target.value) })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Label toggle: default OFF (false) */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium text-[11px]">Tampilkan Label Keterangan Barcode</span>
                    <input
                      type="checkbox"
                      checked={qrSettings.showLabel}
                      onChange={(e) =>
                        setQrSettings({ ...qrSettings, showLabel: e.target.checked })
                      }
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>
                  {qrSettings.showLabel && (
                    <input
                      type="text"
                      value={qrSettings.labelText}
                      onChange={(e) =>
                        setQrSettings({ ...qrSettings, labelText: e.target.value })
                      }
                      placeholder="Scan Verifikasi Ijazah"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                    />
                  )}
                </div>

                {/* Multi-page selector if diploma has transcript or multiple pages */}
                {numPages > 1 && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-medium text-[11px]">Tempel pada Halaman:</span>
                    <select
                      value={qrSettings.pageNumber}
                      onChange={(e) => {
                        const p = Number(e.target.value);
                        setQrSettings({ ...qrSettings, pageNumber: p });
                        setCurrentPage(p);
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                    >
                      {Array.from({ length: numPages }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Halaman {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* BSrE Official Signature Card */}
              <div className="bg-slate-900/90 border border-sky-800/50 rounded-2xl p-5 shadow-xl space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <h4 className="font-bold text-white tracking-wide">TTE RESMI BSrE (BSSN)</h4>
                  </div>
                  {bsreAccount && bsreAccount.isLoggedIn ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Terhubung
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      Belum Login
                    </span>
                  )}
                </div>

                {/* Account Status Box */}
                {bsreAccount && bsreAccount.isLoggedIn ? (
                  <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-sky-300 font-bold uppercase">Pemilik Akun Resmi:</span>
                        </div>
                        <p className="font-bold text-white text-xs mt-0.5">{bsreAccount.namaLengkap}</p>
                        <p className="text-[11px] text-slate-300">{bsreAccount.jabatan} • {bsreAccount.instansi}</p>
                        {bsreAccount.nip && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            NIP: {bsreAccount.nip}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-sky-900/50 text-[10px] text-slate-400">
                      <span className="truncate max-w-[150px]">SN: {bsreAccount.nomorSeriSertifikat}</span>
                      <button
                        type="button"
                        onClick={() => setIsBsreLoginModalOpen(true)}
                        className="text-sky-400 hover:text-sky-300 font-semibold underline"
                      >
                        Ganti / Kelola Akun
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Akun Default BSrE</span>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                        Otomatis Aktif
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Tanda tangan digital BSrE BSSN otomatis disematkan menggunakan identitas Kepala Sekolah / Penandatangan pada formulir di atas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsBsreLoginModalOpen(true)}
                      className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Hubungkan / Ganti Akun Lain</span>
                    </button>
                  </div>
                )}

                {/* Auto Sign Status (Always Active) */}
                <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TTE Kriptografis BSrE:</span>
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 text-[10px]">
                    ✓ Aktif & Otomatis
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Canvas Preview */}
            <div className="lg:col-span-8 space-y-2.5">
              {/* Toolbar (Compact) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    Halaman {currentPage} dari {numPages}
                  </span>
                  {numPages > 1 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                            currentPage === p
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.1))}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs w-11 text-center text-slate-300">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.1))}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setZoomScale(0.78)}
                    className="px-2 py-0.5 rounded bg-emerald-800/50 hover:bg-emerald-700/60 text-emerald-200 border border-emerald-600/40 text-[10px] font-semibold transition"
                    title="Sesuaikan ukuran penuh 1 layar"
                  >
                    Pas Layar
                  </button>

                  <button
                    onClick={() => setZoomScale(1.0)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Viewport Canvas Container: Fits 1-screen height */}
              <div
                ref={containerRef}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-auto flex flex-col justify-start items-center h-[calc(100vh-175px)] min-h-[460px] shadow-2xl relative"
              >
                <div
                  className="relative shadow-2xl bg-white select-none border border-slate-700/60"
                  style={{
                    width: (currentPageDim.width || 595) * zoomScale,
                    height: (currentPageDim.height || 842) * zoomScale,
                    minWidth: (currentPageDim.width || 595) * zoomScale,
                    minHeight: (currentPageDim.height || 842) * zoomScale
                  }}
                >
                  {/* PDF Canvas: Renders crisp PDF page content */}
                  <canvas
                    ref={(el) => {
                      canvasRef.current = el;
                      setCanvasElement(el);
                    }}
                    style={{
                      width: `${(currentPageDim.width || 595) * zoomScale}px`,
                      height: `${(currentPageDim.height || 842) * zoomScale}px`
                    }}
                    className="block pointer-events-none"
                  />

                  {/* Loading overlay while rendering */}
                  {isRenderingPage && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10 text-emerald-800 text-xs font-semibold">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      <span>Memuat pratinjau ijazah...</span>
                    </div>
                  )}

                  {/* QR Code Barcode Overlay (Draggable & Resizable) */}
                  {isQrGenerated && qrSettings.pageNumber === currentPage && (
                    <div
                      onMouseDown={handleMouseDownOnQr}
                      className={`absolute select-none group transition-shadow ${
                        isPreviewFinal
                          ? 'border border-transparent'
                          : 'cursor-grab active:cursor-grabbing border-2 border-dashed border-emerald-500 hover:border-emerald-400 bg-white/95 shadow-xl'
                      }`}
                      style={{
                        left: qrSettings.x * zoomScale,
                        top: qrSettings.y * zoomScale,
                        width: qrSettings.width * zoomScale,
                        height:
                          qrSettings.height *
                          zoomScale *
                          (qrSettings.showLabel ? 680 / 600 : 1)
                      }}
                    >
                      {/* QR Barcode Image */}
                      <div className="w-full h-full p-1 flex flex-col items-center justify-center bg-white text-slate-900 overflow-hidden">
                        <img
                          src={qrDataUrl}
                          alt="Barcode Verifikasi Ijazah"
                          className="w-full aspect-square object-contain pointer-events-none"
                        />

                        {qrSettings.showLabel && (
                          <div className="w-full text-center px-1 py-0.5 mt-0.5 bg-white pointer-events-none">
                            <p className="font-semibold text-[8px] sm:text-[9px] text-slate-900 leading-tight">
                              {qrSettings.labelText}
                            </p>
                            <p className="text-[7px] text-slate-500 leading-none mt-0.5 font-medium">
                              Dokumen Resmi Terverifikasi
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Resize Handle (Bottom Right) */}
                      {!isPreviewFinal && (
                        <div
                          onMouseDown={handleMouseDownOnResize}
                          className="absolute -bottom-2 -right-2 w-5 h-5 bg-emerald-500 hover:bg-emerald-400 rounded-full cursor-se-resize flex items-center justify-center shadow-lg border-2 border-white"
                          title="Tarik untuk mengubah ukuran Barcode"
                        >
                          <Maximize2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}

                      {/* Coordinates tooltip indicator while dragging */}
                      {!isPreviewFinal && isDragging && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700 whitespace-nowrap shadow-lg">
                          X:{qrSettings.x} Y:{qrSettings.y}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-xs text-slate-400">
                💡 Geser (drag) kotak barcode untuk menyesuaikan posisi di atas lembar ijazah, atau gunakan tombol posisi cepat di sebelah kiri.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS & DOWNLOAD SCREEN */}
      {step === 'success' && savedDoc && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-wide">
                Ijazah Berhasil Ditempeli Barcode & Disimpan!
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Barcode verifikasi telah ditempelkan pada posisi lembar ijazah dan tercatat secara permanen di pangkalan data verifikasi.
              </p>
            </div>

            {/* Document Details Summary */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Nama Dokumen</span>
                <span className="font-bold text-white">{savedDoc.documentName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Nomor Ijazah</span>
                <span className="font-mono text-emerald-400 font-semibold">{savedDoc.documentNumber}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Tanggal Tanda Tangan</span>
                <span className="text-slate-200">{savedDoc.documentDate}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Posisi & Ukuran Barcode</span>
                <span className="font-mono text-purple-300">
                  X:{savedDoc.qrX} Y:{savedDoc.qrY} ({savedDoc.qrWidth}pt)
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Mode Penyimpanan</span>
                <span className="text-amber-300 font-semibold">
                  {exportMode === 'flattened' ? 'Flat PDF 300 DPI (Anti-Copy)' : 'PDF Asli + Barcode'}
                </span>
              </div>

              {/* BSrE Signature Proof in Success Summary */}
              {savedDoc.bsreSignature && (
                <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span>Tertandatangani Resmi BSrE - BSSN</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                      Sah & Terverifikasi
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <p>
                      <strong>Penandatangan:</strong> {savedDoc.bsreSignature.bsreAccountOwner} ({savedDoc.bsreSignature.signerPosition})
                    </p>
                    <p className="font-mono text-slate-400 text-[10px]">
                      {savedDoc.bsreSignature.signerNip ? `NIP: ${savedDoc.bsreSignature.signerNip} • ` : ''}SN: {savedDoc.bsreSignature.certificateSerialNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBsreCertModalOpen(true)}
                    className="w-full mt-1 py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-[11px] font-semibold transition border border-sky-700/60 flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Lihat Bukti Sertifikat Elektronik BSrE (X.509)</span>
                  </button>
                </div>
              )}

              <div>
                <span className="text-slate-400 block mb-1">Link Verifikasi Resmi (Web Baru):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={savedDoc.verificationUrl || generateVerificationUrl(savedDoc.verificationToken)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 font-mono text-[11px]"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={downloadBlobUrl}
                download={downloadFileName}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Ulang Ijazah ({downloadFileName})</span>
              </a>

              {onOpenVerification && (
                <button
                  onClick={() => onOpenVerification(savedDoc.verificationToken)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Verifikasi</span>
                </button>
              )}

              {onGoToSavedDocs && (
                <button
                  onClick={onGoToSavedDocs}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs transition"
                >
                  <span>Dokumen Tersimpan</span>
                </button>
              )}

              <button
                onClick={() => {
                  setStep('upload');
                  setPdfBytes(null);
                  setFileName('');
                  setVerificationToken('');
                  setVerificationUrl('');
                  setSavedDoc(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Lagi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT OPTIONS MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Pilih Mode Simpan Ijazah</h3>
              </div>
              <button
                onClick={() => !isSaving && setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setExportMode('original')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer block relative ${
                  exportMode === 'original'
                    ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Mode 1: PDF Asli + Barcode (Rekomendasi)</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Menempelkan barcode langsung ke atas dokumen PDF asli. Resolusi teks ijazah tetap vektor tajam dan ukuran file tetap ringan.
                    </p>
                  </div>
                </div>
              </label>

              <label
                onClick={() => setExportMode('flattened')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer block relative ${
                  exportMode === 'flattened'
                    ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/50'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Mode 2: Flat PDF 300 DPI (Solid Anti-Copy)</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Seluruh halaman ijazah beserta barcode diratakan menjadi gambar 300 DPI solid berkualitas tinggi. Mencegah manipulasi dan teks tidak dapat disalin.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Progress bar during export */}
            {isSaving && (
              <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{exportProgressText}</span>
                  <span className="text-emerald-400 font-mono font-bold">{exportProgressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                    style={{ width: `${exportProgressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleExecuteExportAndSave}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* MODAL OVERLAY: INDIKATOR PROGRES UPLOAD & EKSTRAKSI IJAZAH */}
      {singleUploadProgress.isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-emerald-950/50 space-y-5 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top glowing bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

            {/* Icon */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-30" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                {singleUploadProgress.isComplete ? (
                  <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
                ) : (
                  <Upload className="w-8 h-8 text-white animate-pulse" />
                )}
              </div>
            </div>

            {/* Title & Info */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {singleUploadProgress.isComplete
                  ? 'Upload Berhasil!'
                  : 'Sedang Mengunggah & Memproses Ijazah'}
              </h3>
              <p className="text-xs text-slate-400">
                {singleUploadProgress.isComplete
                  ? 'Berkas telah siap dan sedang dialihkan ke editor visual...'
                  : 'Mengekstrak data ijazah, nomor & menyiapkan verifikasi'}
              </p>
            </div>

            {/* Big Percent Badge */}
            <div className="py-1">
              <div className="inline-flex items-baseline gap-1.5 px-5 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 shadow-inner">
                <span className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-mono tracking-tight">
                  {singleUploadProgress.percent}%
                </span>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  {singleUploadProgress.isComplete ? 'Selesai' : 'Terunggah'}
                </span>
              </div>
            </div>

            {/* Glowing Animated Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 shadow-inner overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300 relative shadow-md shadow-emerald-500/50"
                  style={{ width: `${Math.max(4, singleUploadProgress.percent)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span className="truncate max-w-[200px]">
                  {singleUploadProgress.fileSizeStr || 'Dokumen PDF'}
                </span>
                <span className="text-emerald-400 font-bold">
                  {singleUploadProgress.percent}%
                </span>
              </div>
            </div>

            {/* Current File and Action Box */}
            <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800/80 text-left space-y-1.5">
              <div className="flex items-center gap-2 overflow-hidden text-xs text-slate-300">
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate font-mono font-medium" title={singleUploadProgress.fileName}>
                  {singleUploadProgress.fileName || 'Memproses ijazah...'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <RefreshCw
                  className={`w-3 h-3 text-teal-400 shrink-0 ${
                    singleUploadProgress.isComplete ? '' : 'animate-spin'
                  }`}
                />
                <span className="truncate text-slate-300">
                  {singleUploadProgress.stage}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOGIN PEMILIK AKUN RESMI BSrE */}
      <BsreLoginModal
        isOpen={isBsreLoginModalOpen}
        onClose={() => setIsBsreLoginModalOpen(false)}
        onLoginSuccess={(acc) => {
          setBsreAccount(acc);
          setIsBsreSignEnabled(true);
        }}
      />

      {/* MODAL SERTIFIKAT ELEKTRONIK BSrE */}
      {savedDoc?.bsreSignature && (
        <BsreCertificateModal
          isOpen={isBsreCertModalOpen}
          onClose={() => setIsBsreCertModalOpen(false)}
          signatureInfo={savedDoc.bsreSignature}
          documentName={savedDoc.documentName}
          documentNumber={savedDoc.documentNumber}
        />
      )}
    </div>
  );
};
