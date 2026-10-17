import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  FileText,
  QrCode,
  Sparkles,
  Move,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  AlertCircle,
  Eye,
  Download,
  Share2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Layers,
  ArrowRight,
  Settings2,
  RefreshCw,
  Building2,
  Calendar,
  Hash,
  UserCheck,
  CheckCircle2,
  Link as LinkIcon
} from 'lucide-react';
import {
  ElectronicDocFormData,
  QrPlacementSettings,
  VerifiedDocument,
  ExportMode
} from '../../types';
import { pdfjsLib } from '../../utils/pdfWorker';
import { generateSampleSKPPdf } from '../../utils/samplePdf';
import {
  generateUniqueToken,
  generateVerificationUrl,
  generateQrCodeDataUrl,
  saveVerifiedDocument
} from '../../utils/electronicService';
import {
  exportOriginalWithQrCode,
  exportFlattenedWithQrCode,
  triggerPdfDownload,
  triggerImageDownload
} from '../../utils/pdfElectronicExport';
import { getAppSettings, saveAppSettings, QrLogoType } from '../../utils/appSettings';
import { extractNomorSuratFromPdf } from '../../utils/documentNumberExtractor';
import {
  getActiveBsreAccount,
  isBsreAutoSignEnabled,
  signDocumentWithBsre
} from '../../utils/bsreService';

interface ElectronicCreateDocProps {
  onDocumentCreated?: (doc: VerifiedDocument) => void;
  onGoToSavedDocs?: () => void;
  onOpenVerification?: (token: string) => void;
}

export const ElectronicCreateDoc: React.FC<ElectronicCreateDocProps> = ({
  onDocumentCreated,
  onGoToSavedDocs,
  onOpenVerification
}) => {
  // Wizard steps: 'upload' | 'form_and_editor' | 'finalized_success'
  const [step, setStep] = useState<'upload' | 'form_and_editor' | 'finalized_success'>('upload');

  // PDF File state
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('Surat_Keterangan_Resmi.pdf');
  const [fileSizeStr, setFileSizeStr] = useState<string>('124 KB');
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[]>([]);

  // Form Data (Automatically follows Settings for issuer, signerName, and signerPosition)
  const [formData, setFormData] = useState<ElectronicDocFormData>(() => {
    const settings = getAppSettings();
    return {
      documentName: 'Surat Keterangan Pengesahan Resmi',
      documentType: 'Surat Keterangan',
      documentNumber: '421.2/089/DISDIK/X/2026',
      documentDate: new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date()),
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: 'Dokumen elektronik dengan QR Code verifikasi keabsahan resmi.'
    };
  });

  // Re-sync with settings if settings are updated
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

  const [googleDriveUrl, setGoogleDriveUrl] = useState<string>('');

  // QR Generation state
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrGenerated, setIsQrGenerated] = useState<boolean>(false);

  // QR Placement settings
  const [qrSettings, setQrSettings] = useState<QrPlacementSettings>({
    pageNumber: 1,
    x: 380, // Default bottom right corner
    y: 650,
    width: 130,
    height: 130,
    showLabel: true,
    labelText: 'Scan untuk verifikasi dokumen'
  });

  // Logo di tengah barcode state
  const initialSettings = getAppSettings();
  const [qrLogoEnabled, setQrLogoEnabled] = useState<boolean>(initialSettings.qrLogoEnabled);
  const [qrLogoType, setQrLogoType] = useState<QrLogoType>(initialSettings.qrLogoType);

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

  // Final preview mode toggle
  const [isPreviewFinal, setIsPreviewFinal] = useState<boolean>(false);

  // Finalize Modal state
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [selectedExportMode, setSelectedExportMode] = useState<ExportMode>('original');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [exportPercent, setExportPercent] = useState<number>(0);

  // Upload Progress State
  const [uploadProgress, setUploadProgress] = useState<{
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

  // Finalized Result
  const [finalizedDoc, setFinalizedDoc] = useState<VerifiedDocument | null>(null);
  const [finalPdfBytes, setFinalPdfBytes] = useState<Uint8Array | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Canvas Refs & Rendering State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drag & Resize state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; initialWidth: number }>({
    x: 0,
    y: 0,
    initialWidth: 130
  });

  // Load PDF info when pdfBytes changes
  useEffect(() => {
    if (!pdfBytes) return;
    const currentBytes = pdfBytes;

    let isMounted = true;
    async function loadPdf() {
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: currentBytes.slice(0),
          useSystemFonts: true
        });
        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setNumPages(doc.numPages);
        const dims: { width: number; height: number }[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1.0 });
          dims.push({ width: vp.width, height: vp.height });
        }
        setPageDimensions(dims);

        // Adjust default QR coordinates to bottom-right of target page
        if (dims.length > 0) {
          const firstPage = dims[0];
          setQrSettings((prev) => ({
            ...prev,
            x: Math.max(20, Math.floor(firstPage.width - 170)),
            y: Math.max(20, Math.floor(firstPage.height - 180))
          }));
        }
      } catch (err) {
        console.error('Failed to parse PDF', err);
      }
    }

    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [pdfBytes]);

  // Render current PDF page to canvas with high sharpness
  useEffect(() => {
    if (step !== 'form_and_editor' || !pdfBytes || !canvasElement) return;
    const currentBytes = pdfBytes;

    let isMounted = true;
    let renderTask: any = null;

    async function renderPage() {
      setIsRenderingPage(true);
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: currentBytes.slice(0),
          useSystemFonts: true
        });
        const doc = await loadingTask.promise;
        const page = await doc.getPage(currentPage);
        if (!isMounted || !canvasElement) {
          setIsRenderingPage(false);
          return;
        }

        const viewport = page.getViewport({ scale: zoomScale });
        const canvas = canvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsRenderingPage(false);
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport,
          canvas
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render page error', err);
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
      if (renderTask && typeof renderTask.cancel === 'function') {
        try {
          renderTask.cancel();
        } catch {
          // ignore cancel error
        }
      }
    };
  }, [step, pdfBytes, canvasElement, currentPage, zoomScale]);

  // Handle file upload with progress tracking
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Mohon pilih berkas dengan format PDF (.pdf)');
      return;
    }

    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setUploadProgress({
      isUploading: true,
      percent: 10,
      stage: `Membaca berkas PDF (${sizeStr})...`,
      fileName: file.name,
      fileSizeStr: sizeStr,
      isComplete: false
    });

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const percent = Math.min(60, Math.round((ev.loaded / ev.total) * 60));
        setUploadProgress((prev) => ({
          ...prev,
          percent: Math.max(prev.percent, percent),
          stage: `Mengunggah berkas (${((ev.loaded / 1024)).toFixed(0)} KB)...`
        }));
      }
    };

    reader.onload = async (ev) => {
      const arrBuffer = ev.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(arrBuffer);

      setUploadProgress((prev) => ({
        ...prev,
        percent: 75,
        stage: 'Menganalisis konten & nomor dokumen...'
      }));

      setPdfBytes(bytes);
      setOriginalFileName(file.name);
      setFileSizeStr(sizeStr);

      // Auto-fill document name from file name if blank and ensure settings defaults
      const settings = getAppSettings();
      setFormData((prev) => ({
        ...prev,
        documentName: (!prev.documentName || prev.documentName.includes('Pengesahan'))
          ? file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
          : prev.documentName,
        issuer: settings.issuer,
        signerName: settings.signerName,
        signerPosition: settings.signerPosition
      }));

      // Auto-detect letter number (Nomor Surat) from PDF content after "Nomor:"
      try {
        const detectedNo = await extractNomorSuratFromPdf(bytes);
        if (detectedNo) {
          setFormData((prev) => ({
            ...prev,
            documentNumber: detectedNo
          }));
        }
      } catch {
        //
      }

      // Auto-generate verification token & QR code immediately so preview & save are ready
      try {
        const token = generateUniqueToken();
        const url = generateVerificationUrl(token);
        const qrData = await generateQrCodeDataUrl(url);

        setVerificationToken(token);
        setVerificationUrl(url);
        setQrDataUrl(qrData);
        setIsQrGenerated(true);
      } catch (qrErr) {
        console.error('Failed to auto-generate QR code', qrErr);
      }

      setUploadProgress((prev) => ({
        ...prev,
        percent: 100,
        stage: 'Selesai! Berkas siap ditandatangani.',
        isComplete: true
      }));

      await new Promise((res) => setTimeout(res, 500));

      setStep('form_and_editor');
      setUploadProgress((prev) => ({ ...prev, isUploading: false }));
    };

    reader.onerror = () => {
      alert('Gagal membaca berkas PDF');
      setUploadProgress((prev) => ({ ...prev, isUploading: false }));
    };

    reader.readAsArrayBuffer(file);
  };

  // Load sample official document
  const handleLoadSamplePdf = async () => {
    const settings = getAppSettings();
    const sample = await generateSampleSKPPdf();
    setPdfBytes(sample);
    setOriginalFileName('Surat_Keterangan_Resmi_Sekolah.pdf');
    setFileSizeStr('86 KB');
    setFormData({
      documentName: 'Surat Keterangan Resmi Instansi',
      documentType: 'Surat Keterangan',
      documentNumber: '421.2/123/SDN1GPK/X/2026',
      documentDate: new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date()),
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: 'Dokumen resmi sekolah dengan verifikasi tanda tangan elektronik QR Code.'
    });

    // Auto-detect letter number (Nomor Surat) from sample PDF content
    extractNomorSuratFromPdf(sample).then((detectedNo) => {
      if (detectedNo) {
        setFormData((prev) => ({
          ...prev,
          documentNumber: detectedNo
        }));
      }
    });

    // Auto-generate verification token & QR code for sample
    try {
      const token = generateUniqueToken();
      const url = generateVerificationUrl(token);
      const qrData = await generateQrCodeDataUrl(url);

      setVerificationToken(token);
      setVerificationUrl(url);
      setQrDataUrl(qrData);
      setIsQrGenerated(true);
    } catch (qrErr) {
      console.error('Failed to generate sample QR code', qrErr);
    }

    setStep('form_and_editor');
  };

  // Generate QR Code
  const handleGenerateQr = async () => {
    const token = generateUniqueToken();
    const url = generateVerificationUrl(token);
    const qrData = await generateQrCodeDataUrl(url);

    setVerificationToken(token);
    setVerificationUrl(url);
    setQrDataUrl(qrData);
    setIsQrGenerated(true);
  };

  // Drag handler on PDF Viewer overlay
  const handleMouseDownOnQr = (e: React.MouseEvent) => {
    if (isPreviewFinal) return;
    e.stopPropagation();
    setIsDragging(true);

    const clientX = e.clientX;
    const clientY = e.clientY;
    setDragOffset({
      x: clientX - qrSettings.x * zoomScale,
      y: clientY - qrSettings.y * zoomScale
    });
  };

  const handleMouseDownOnResize = (e: React.MouseEvent) => {
    if (isPreviewFinal) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      initialWidth: qrSettings.width
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const currentPageDim = pageDimensions[currentPage - 1] || { width: 595, height: 842 };

      if (isDragging) {
        const newX = (e.clientX - dragOffset.x) / zoomScale;
        const newY = (e.clientY - dragOffset.y) / zoomScale;

        // Keep inside bounds
        const clampedX = Math.max(0, Math.min(newX, currentPageDim.width - qrSettings.width));
        const clampedY = Math.max(0, Math.min(newY, currentPageDim.height - qrSettings.height));

        setQrSettings((prev) => ({
          ...prev,
          x: Math.round(clampedX),
          y: Math.round(clampedY)
        }));
      } else if (isResizing) {
        const deltaX = (e.clientX - resizeStart.x) / zoomScale;
        const newWidth = Math.max(60, Math.min(300, resizeStart.initialWidth + deltaX));

        setQrSettings((prev) => ({
          ...prev,
          width: Math.round(newWidth),
          height: Math.round(newWidth)
        }));
      }
    },
    [isDragging, isResizing, dragOffset, resizeStart, zoomScale, pageDimensions, currentPage, qrSettings.width, qrSettings.height]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Center QR button on the target page
  const handleCenterQr = () => {
    const targetDim = pageDimensions[qrSettings.pageNumber - 1] || { width: 595, height: 842 };
    setQrSettings((prev) => ({
      ...prev,
      x: Math.round((targetDim.width - prev.width) / 2),
      y: Math.round((targetDim.height - prev.height) / 2)
    }));
  };

  // Reset QR Position on the target page
  const handleResetPosition = () => {
    const targetDim = pageDimensions[qrSettings.pageNumber - 1] || { width: 595, height: 842 };
    setQrSettings((prev) => ({
      ...prev,
      x: Math.max(20, Math.round(targetDim.width - prev.width - 30)),
      y: Math.max(20, Math.round(targetDim.height - prev.height - 40))
    }));
  };

  // Explicitly place QR on whatever page is currently being viewed
  const handlePlaceQrOnCurrentPage = () => {
    const targetDim = pageDimensions[currentPage - 1] || { width: 595, height: 842 };
    setQrSettings((prev) => ({
      ...prev,
      pageNumber: currentPage,
      x: Math.min(prev.x, Math.max(20, targetDim.width - prev.width - 20)),
      y: Math.min(prev.y, Math.max(20, targetDim.height - prev.height - 20))
    }));
  };

  // Finalize Process
  const handleFinalizeDocument = async () => {
    if (!pdfBytes || !qrDataUrl) return;

    setIsExporting(true);
    setExportPercent(10);
    setExportProgressText('Mempersiapkan dokumen dan data verifikasi...');

    try {
      const finalName = originalFileName.replace(/\.pdf$/i, '') + '_terverifikasi.pdf';

      // BSrE Official Electronic Signature (Wajib & Otomatis)
      const activeBsre = getActiveBsreAccount();
      const currentSignerName = (formData.signerName || '').trim() || activeBsre.namaLengkap;
      setExportProgressText(`Menandatangani dokumen dengan akun resmi BSrE (${currentSignerName})...`);
      setExportPercent(30);
      const bsreSignature = await signDocumentWithBsre(
        pdfBytes,
        {
          documentName: formData.documentName,
          documentNumber: formData.documentNumber,
          issuer: formData.issuer,
          signerName: currentSignerName,
          signerPosition: formData.signerPosition || activeBsre.jabatan
        },
        activeBsre
      );

      let outputBytes: Uint8Array;
      if (selectedExportMode === 'original') {
        outputBytes = await exportOriginalWithQrCode(
          pdfBytes,
          qrDataUrl,
          qrSettings,
          (msg, pct) => {
            setExportProgressText(msg);
            setExportPercent(30 + Math.round(pct * 0.6));
          },
          bsreSignature
        );
      } else {
        outputBytes = await exportFlattenedWithQrCode(
          pdfBytes,
          qrDataUrl,
          qrSettings,
          (msg, pct) => {
            setExportProgressText(msg);
            setExportPercent(30 + Math.round(pct * 0.6));
          },
          bsreSignature
        );
      }

      setExportProgressText('Menyimpan data identitas ke database verifikasi...');
      setExportPercent(92);

      const docId = `doc_${verificationToken}_${Date.now()}`;
      const newDocRecord: VerifiedDocument = {
        documentId: docId,
        verificationToken,
        documentName: formData.documentName,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        documentDate: formData.documentDate,
        issuer: formData.issuer,
        signerName: formData.signerName,
        signerPosition: formData.signerPosition,
        description: formData.description,
        originalFileName,
        finalFileName: finalName,
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
        allowView: true,
        allowDownload: true,
        qrDataUrl,
        verificationUrl,
        googleDriveUrl: googleDriveUrl.trim(),
        bsreSignature
      };

      await saveVerifiedDocument(newDocRecord);

      setExportProgressText('✓ Selesai! Mengunduh dokumen final...');
      setExportPercent(100);

      // Auto-trigger download of final verified PDF
      triggerPdfDownload(outputBytes, finalName);

      setFinalizedDoc(newDocRecord);
      setFinalPdfBytes(outputBytes);
      setIsFinalizeModalOpen(false);
      setStep('finalized_success');

      if (onDocumentCreated) {
        onDocumentCreated(newDocRecord);
      }
    } catch (err: any) {
      console.error('Finalize error', err);
      alert('Gagal memproses dokumen: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (!verificationUrl) return;
    navigator.clipboard.writeText(verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentPageDim = pageDimensions[currentPage - 1] || { width: 595, height: 842 };

  return (
    <div className="space-y-6">
      {/* STEP 1: UPLOAD PDF */}
      {step === 'upload' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Upload Dokumen PDF</h2>
            <p className="text-sm text-slate-400">
              Pilih dokumen resmi yang ingin disematkan identitas tanda tangan elektronik berbasis QR Code.
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                const fakeEvent = {
                  target: { files }
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleFileUpload(fakeEvent);
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-10 text-center transition bg-slate-900/40 relative group flex flex-col items-center justify-center shadow-xl ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-950/30 ring-4 ring-emerald-500/20 scale-[1.01]'
                : uploadProgress.isUploading
                ? 'border-emerald-500 bg-emerald-950/20 cursor-wait'
                : 'border-slate-700 hover:border-emerald-500 cursor-pointer'
            }`}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={uploadProgress.isUploading}
              onClick={(e) => {
                // allow selecting the same file again
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {uploadProgress.isUploading ? (
              <div className="flex flex-col items-center gap-3 py-2 max-w-md w-full mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner animate-pulse">
                  <Upload className="w-7 h-7 animate-bounce" />
                </div>
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      Sedang Memproses Dokumen...
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      {uploadProgress.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, uploadProgress.percent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[260px]">
                      {uploadProgress.stage}
                    </span>
                    <span className="shrink-0 font-mono text-slate-300">
                      {uploadProgress.fileSizeStr}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">Seret file PDF ke sini atau klik untuk memilih file</h3>
                <p className="text-xs text-slate-400 mt-1">Format yang diperbolehkan: PDF (Maks. 25 MB)</p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs text-slate-300 border border-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dokumen asli Anda tetap aman & tidak diubah</span>
                </div>
              </>
            )}
          </div>

          {/* Quick Sample Option */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-xs text-slate-500">Atau uji coba langsung:</span>
            <button
              onClick={handleLoadSamplePdf}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Contoh Surat</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FORM DATA + PREVIEW & QR PLACEMENT EDITOR */}
      {step === 'form_and_editor' && (
        <div
          className="space-y-6 select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Top Bar Status */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">{originalFileName}</h3>
                <p className="text-xs text-slate-400">
                  {fileSizeStr} • {numPages} Halaman • Halaman {currentPage} aktif
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Ganti File</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isQrGenerated && (
                <button
                  onClick={() => setIsPreviewFinal(!isPreviewFinal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                    isPreviewFinal
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isPreviewFinal ? 'Mode Edit' : 'Preview'}</span>
                </button>
              )}

              {isQrGenerated && (
                <button
                  onClick={() => setIsFinalizeModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Simpan</span>
                </button>
              )}
            </div>
          </div>

          {/* Two-Column Editor Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Data Dokumen & QR Generation */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-sm text-white">DATA DOKUMEN</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">1. Nama Dokumen</label>
                    <input
                      type="text"
                      value={formData.documentName}
                      onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                      placeholder="Contoh: Surat Keterangan Pindah Sekolah"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">2. Jenis Dokumen</label>
                      <input
                        type="text"
                        value={formData.documentType}
                        onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                        placeholder="Contoh: Surat Keterangan"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">3. Nomor Dokumen</label>
                      <input
                        type="text"
                        value={formData.documentNumber}
                        onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                        placeholder="Contoh: 421.2/123/SDN1GPK/X/2026"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">4. Tanggal Dokumen</label>
                      <input
                        type="text"
                        value={formData.documentDate}
                        onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                        placeholder="07 Oktober 2026"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">5. Instansi/Penerbit</label>
                      <input
                        type="text"
                        value={formData.issuer}
                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                        placeholder="Contoh: SD Negeri 1 Gapuk"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">6. Penandatangan</label>
                      <input
                        type="text"
                        value={formData.signerName}
                        onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
                        placeholder="Contoh: H. Masrun, S.Pd"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">7. Jabatan Pejabat</label>
                      <input
                        type="text"
                        value={formData.signerPosition}
                        onChange={(e) => setFormData({ ...formData, signerPosition: e.target.value })}
                        placeholder="Contoh: Kepala Sekolah"
                        className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white transition font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Generate QR Button */}
                <div className="pt-2">
                  <button
                    onClick={handleGenerateQr}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{isQrGenerated ? 'Perbarui QR' : 'Generate QR'}</span>
                  </button>
                  {isQrGenerated && (
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center justify-between">
                      <span className="font-mono font-bold">ID: {verificationToken}</span>
                      <span className="text-emerald-400">✓ QR Aktif di Preview</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Placement Settings Panel */}
              {isQrGenerated && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-white">PENGATURAN QR CODE</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">Presisi Posisi</span>
                  </div>

                  {/* Dedicated Page Selection Section */}
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-white font-bold flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>Halaman Penempatan Barcode:</span>
                      </label>
                      <span className="text-emerald-400 font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        Hal. {qrSettings.pageNumber} dari {numPages}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={qrSettings.pageNumber}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setQrSettings({ ...qrSettings, pageNumber: p });
                          setCurrentPage(p);
                        }}
                        className="flex-1 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-white font-medium"
                      >
                        {Array.from({ length: numPages }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Tempatkan di Halaman {i + 1} {i + 1 === qrSettings.pageNumber ? '(Dipilih)' : ''}
                          </option>
                        ))}
                      </select>

                      {qrSettings.pageNumber !== currentPage && (
                        <button
                          type="button"
                          onClick={handlePlaceQrOnCurrentPage}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] whitespace-nowrap shadow transition"
                          title={`Pindahkan posisi barcode ke halaman ${currentPage}`}
                        >
                          Pindah ke Hal. {currentPage}
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 <strong>Catatan:</strong> Barcode hanya akan muncul dan dicetak pada <span className="text-emerald-300 font-medium">Halaman {qrSettings.pageNumber}</span>. Halaman lainnya tidak akan memiliki barcode.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Ukuran (pt)</label>
                      <input
                        type="number"
                        min="60"
                        max="250"
                        value={qrSettings.width}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setQrSettings({ ...qrSettings, width: val, height: val });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Positioning Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCenterQr}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition"
                    >
                      Posisikan Tengah
                    </button>
                    <button
                      onClick={handleResetPosition}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition"
                    >
                      Reset Posisi
                    </button>
                  </div>

                  {/* Label Checkbox */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qrSettings.showLabel}
                        onChange={(e) =>
                          setQrSettings({ ...qrSettings, showLabel: e.target.checked })
                        }
                        className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-300 font-medium">Tampilkan label di bawah QR</span>
                    </label>

                    {qrSettings.showLabel && (
                      <input
                        type="text"
                        value={qrSettings.labelText}
                        onChange={(e) =>
                          setQrSettings({ ...qrSettings, labelText: e.target.value })
                        }
                        placeholder="Scan untuk verifikasi dokumen"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-[11px]"
                      />
                    )}
                  </div>

                  {/* Logo di Tengah Barcode */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 font-medium text-xs">Logo di Tengah Barcode</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                          Resmi
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={qrLogoEnabled}
                        onChange={(e) => handleToggleLogo(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </div>

                    {qrLogoEnabled && (
                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleChangeLogoType('kemdikbud')}
                          className={`px-1.5 py-1 rounded text-[10px] font-bold border transition truncate ${
                            qrLogoType === 'kemdikbud'
                              ? 'bg-sky-600/30 border-sky-400 text-sky-200 ring-1 ring-sky-500/30'
                              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                          }`}
                          title="Tut Wuri Handayani (Kemendikbud)"
                        >
                          Kemdikbud
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeLogoType('garuda')}
                          className={`px-1.5 py-1 rounded text-[10px] font-bold border transition truncate ${
                            qrLogoType === 'garuda'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 ring-1 ring-amber-500/30'
                              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                          }`}
                          title="Garuda Pancasila"
                        >
                          Garuda
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeLogoType('bsre')}
                          className={`px-1.5 py-1 rounded text-[10px] font-bold border transition truncate ${
                            qrLogoType === 'bsre'
                              ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 ring-1 ring-emerald-500/30'
                              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                          }`}
                          title="BSrE / TTE"
                        >
                          BSrE
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: PDF Viewer with Drag-and-Drop QR Overlay */}
            <div className="lg:col-span-8 space-y-3">
              {/* Toolbar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium">
                    Halaman <span className="text-white font-bold">{currentPage}</span> dari <span className="text-white font-bold">{numPages}</span>
                  </span>
                  <button
                    disabled={currentPage >= numPages}
                    onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                    className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Quick Page Jump Pills (if multi-page) */}
                  {numPages > 1 && (
                    <div className="flex items-center gap-1 ml-2 border-l border-slate-800 pl-2.5 overflow-x-auto max-w-[240px] py-0.5">
                      {Array.from({ length: numPages }, (_, i) => {
                        const pageNum = i + 1;
                        const hasQr = isQrGenerated && qrSettings.pageNumber === pageNum;
                        const isViewing = currentPage === pageNum;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                              isViewing
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : hasQr
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                            title={`Lihat Halaman ${pageNum}${hasQr ? ' (Barcode ditempatkan di halaman ini)' : ''}`}
                          >
                            <span>{pageNum}</span>
                            {hasQr && <span className="text-[10px]">🏷️</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Page Barcode Placement Action */}
                {isQrGenerated && numPages > 1 && (
                  <div className="flex items-center gap-2">
                    {qrSettings.pageNumber === currentPage ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                        <Check className="w-3.5 h-3.5" />
                        Barcode aktif di Hal. {currentPage}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePlaceQrOnCurrentPage}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow transition"
                      >
                        <span>Pindah ke Hal. {currentPage}</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.1))}
                      className="p-1 rounded hover:bg-slate-800"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs w-12 text-center">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.1))}
                      className="p-1 rounded hover:bg-slate-800"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setZoomScale(1.0)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]"
                  >
                    Fit Width
                  </button>
                </div>
              </div>

              {/* Viewport Canvas Container */}
              <div
                ref={containerRef}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-auto flex flex-col justify-start items-center min-h-[550px] shadow-2xl relative"
              >
                {/* Multipage Status Banner */}
                {isQrGenerated && numPages > 1 && (
                  qrSettings.pageNumber !== currentPage ? (
                    <div className="w-full max-w-2xl mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Barcode <strong>TIDAK DITEMPATKAN</strong> pada Halaman {currentPage}. Barcode saat ini berada di <strong>Halaman {qrSettings.pageNumber}</strong>.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(qrSettings.pageNumber)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-medium text-[11px] transition"
                        >
                          Lihat Hal. {qrSettings.pageNumber}
                        </button>
                        <button
                          type="button"
                          onClick={handlePlaceQrOnCurrentPage}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow transition"
                        >
                          Pindahkan ke Hal. {currentPage}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl mb-3 px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
                      <span className="flex items-center gap-2 font-medium">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Barcode ditempatkan pada <strong>Halaman {currentPage}</strong> ini saja (dari {numPages} halaman). Halaman lain tidak memiliki barcode.
                        </span>
                      </span>
                      <span className="text-[11px] text-emerald-400 font-mono font-bold">
                        Hal {currentPage}/{numPages}
                      </span>
                    </div>
                  )
                )}

                <div
                  className="relative shadow-2xl bg-white"
                  style={{
                    width: (currentPageDim.width || 595) * zoomScale,
                    height: (currentPageDim.height || 842) * zoomScale
                  }}
                >
                  {/* PDF Canvas */}
                  <canvas
                    ref={(el) => {
                      canvasRef.current = el;
                      setCanvasElement(el);
                    }}
                    className="block w-full h-full pointer-events-none"
                  />

                  {/* Rendering Loading Spinner */}
                  {isRenderingPage && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-20 pointer-events-none transition-opacity">
                      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                      <span className="text-xs font-semibold text-slate-800 bg-white/90 px-3 py-1 rounded-full shadow border border-slate-200">
                        Memuat Pratinjau Dokumen...
                      </span>
                    </div>
                  )}

                  {/* QR Code Overlay (Shown on target page) */}
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
                      {/* QR Image */}
                      <div className="w-full h-full p-1 flex flex-col items-center justify-center bg-white text-slate-900 overflow-hidden">
                        <img
                          src={qrDataUrl}
                          alt="QR Code Verifikasi"
                          className="w-full aspect-square object-contain pointer-events-none"
                        />

                        {qrSettings.showLabel && (
                          <div className="w-full text-center px-1 py-0.5 mt-0.5 bg-white pointer-events-none">
                            <p className="font-semibold text-[8px] sm:text-[9px] text-slate-900 leading-tight">
                              {qrSettings.labelText}
                            </p>
                            <p className="text-[7px] text-slate-500 leading-none mt-0.5 font-medium">
                              Dokumen Terverifikasi Resmi
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Resize Handle (Bottom Right) */}
                      {!isPreviewFinal && (
                        <div
                          onMouseDown={handleMouseDownOnResize}
                          className="absolute -bottom-2 -right-2 w-5 h-5 bg-emerald-500 hover:bg-emerald-400 rounded-full cursor-se-resize flex items-center justify-center shadow-lg border-2 border-white"
                          title="Tarik untuk mengubah ukuran QR Code"
                        >
                          <Maximize2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}

                      {/* Position Tooltip indicator while dragging */}
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
                {!isQrGenerated ? (
                  <span>👈 Silakan isi data dokumen di panel kiri lalu tekan <strong>GENERATE QR CODE</strong></span>
                ) : (
                  <span>💡 Tarik (drag) QR Code untuk memindahkan posisi, dan tarik sudut bulat untuk memperbesar/memperkecil.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS & DOWNLOAD SCREEN */}
      {step === 'finalized_success' && finalizedDoc && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/20">
                PROSES PENGESAHAN SELESAI
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                ✓ DOKUMEN BERHASIL DIFINALISASI
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Identitas QR Code verifikasi telah disematkan secara visual ke dalam PDF dan terdaftar di database publik.
              </p>
            </div>

            {/* Document Card Overview */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Nama Dokumen:</span>
                <span className="font-semibold text-white text-sm">{finalizedDoc.documentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">ID Verifikasi Dokumen:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider">
                  {finalizedDoc.verificationToken}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Status Dokumen:</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  VALID
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Penandatangan Resmi:</span>
                <span className="font-medium text-slate-200">{finalizedDoc.signerName}</span>
              </div>
            </div>

            {/* QR Code Graphic Preview */}
            <div className="p-4 rounded-2xl bg-white text-slate-900 inline-block shadow-xl">
              <img
                src={finalizedDoc.qrDataUrl}
                alt="QR Code"
                className="w-36 h-36 mx-auto object-contain"
              />
              <p className="text-[10px] text-slate-600 font-bold mt-1 font-mono">
                {finalizedDoc.verificationToken}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {finalPdfBytes && (
                <button
                  onClick={() => triggerPdfDownload(finalPdfBytes, finalizedDoc.finalFileName)}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              )}

              {finalizedDoc.qrDataUrl && (
                <button
                  onClick={() =>
                    triggerImageDownload(
                      finalizedDoc.qrDataUrl!,
                      `QR_${finalizedDoc.verificationToken}.png`
                    )
                  }
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR</span>
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenVerification) {
                    onOpenVerification(finalizedDoc.verificationToken);
                  } else {
                    window.open(finalizedDoc.verificationUrl, '_blank');
                  }
                }}
                className="py-3 px-4 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-semibold text-xs border border-emerald-800/50 transition flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Verifikasi</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-center gap-4">
              <button
                onClick={() => {
                  setStep('upload');
                  setIsQrGenerated(false);
                  setPdfBytes(null);
                }}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
              >
                <span>Buat Baru</span>
              </button>
              {onGoToSavedDocs && (
                <button
                  onClick={onGoToSavedDocs}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5"
                >
                  <span>Dokumen Tersimpan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION & EXPORT FORMAT MODAL */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                KONFIRMASI FINALISASI DOKUMEN
              </div>
              <h3 className="text-xl font-bold text-white">
                Apakah Anda yakin ingin memfinalisasi dokumen ini?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Setelah difinalisasi, QR Code akan ditanamkan ke dalam PDF dan status dokumen akan terdaftar sebagai <strong>VALID</strong> di sistem.
              </p>
            </div>

            {/* Document Summary Info */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Dokumen:</span>
                <span className="font-semibold text-white">{formData.documentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Dokumen:</span>
                <span className="font-mono text-emerald-300">{formData.documentNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID Verifikasi:</span>
                <span className="font-mono font-bold text-emerald-400">{verificationToken}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Halaman Barcode:</span>
                <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Halaman {qrSettings.pageNumber} dari {numPages} (Hanya 1 Halaman ini)
                </span>
              </div>
              {numPages > 1 && (
                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                  ℹ️ Barcode <strong>hanya</strong> akan dicetak pada Halaman {qrSettings.pageNumber}. Halaman lainnya tetap bersih dari barcode.
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Koordinat QR:</span>
                <span className="font-mono text-slate-300">X: {qrSettings.x} pt, Y: {qrSettings.y} pt</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Link Google Drive:</span>
                <span className="text-slate-300 text-[11px]">
                  {googleDriveUrl.trim() ? (
                    <span className="text-emerald-400 font-mono">Tersambung ✓</span>
                  ) : (
                    <span className="text-slate-400 italic">Boleh kosong (Dapat diisi nanti)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Choice of Storage Format (Section 11) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-white block">PILIH FORMAT PENYIMPANAN PDF:</label>
              
              <div
                onClick={() => setSelectedExportMode('original')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  selectedExportMode === 'original'
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  checked={selectedExportMode === 'original'}
                  onChange={() => setSelectedExportMode('original')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-xs text-white">Opsi 1 — PDF sebagai Dokumen Asli (Rekomendasi)</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    QR Code disematkan langsung ke dokumen asli. Teks PDF tetap asli, dapat diseleksi dan dicopy.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSelectedExportMode('flattened')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  selectedExportMode === 'flattened'
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  checked={selectedExportMode === 'flattened'}
                  onChange={() => setSelectedExportMode('flattened')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-xs text-white">Opsi 2 — PDF sebagai Gambar / Flattened</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Setiap halaman dirender menjadi gambar 300 DPI dengan QR Code terintegrasi permanen. Teks tidak dapat dicopy.
                  </p>
                </div>
              </div>
            </div>

            {/* Export Progress Indicator */}
            {isExporting && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{exportProgressText}</span>
                  <span className="font-mono font-bold text-emerald-400">{exportPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                    style={{ width: `${exportPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isExporting}
                onClick={() => setIsFinalizeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={isExporting}
                onClick={handleFinalizeDocument}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: INDIKATOR PROGRES UPLOAD DOKUMEN */}
      {uploadProgress.isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-emerald-950/50 space-y-5 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top glowing bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

            {/* Icon */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-30" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                {uploadProgress.isComplete ? (
                  <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
                ) : (
                  <Upload className="w-8 h-8 text-white animate-pulse" />
                )}
              </div>
            </div>

            {/* Title & Info */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {uploadProgress.isComplete
                  ? 'Upload Berhasil!'
                  : 'Sedang Mengunggah & Memproses Dokumen'}
              </h3>
              <p className="text-xs text-slate-400">
                {uploadProgress.isComplete
                  ? 'Berkas telah siap dan sedang dialihkan ke editor visual...'
                  : 'Menganalisis lembar dokumen PDF & menyiapkan penandatanganan'}
              </p>
            </div>

            {/* Big Percent Badge */}
            <div className="py-1">
              <div className="inline-flex items-baseline gap-1.5 px-5 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 shadow-inner">
                <span className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-mono tracking-tight">
                  {uploadProgress.percent}%
                </span>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  {uploadProgress.isComplete ? 'Selesai' : 'Terunggah'}
                </span>
              </div>
            </div>

            {/* Glowing Animated Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 shadow-inner overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300 relative shadow-md shadow-emerald-500/50"
                  style={{ width: `${Math.max(4, uploadProgress.percent)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span className="truncate max-w-[200px]">
                  {uploadProgress.fileSizeStr || 'Dokumen PDF'}
                </span>
                <span className="text-emerald-400 font-bold">
                  {uploadProgress.percent}%
                </span>
              </div>
            </div>

            {/* Current File and Action Box */}
            <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800/80 text-left space-y-1.5">
              <div className="flex items-center gap-2 overflow-hidden text-xs text-slate-300">
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate font-mono font-medium" title={uploadProgress.fileName}>
                  {uploadProgress.fileName || 'Memproses dokumen...'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <RefreshCw
                  className={`w-3 h-3 text-teal-400 shrink-0 ${
                    uploadProgress.isComplete ? '' : 'animate-spin'
                  }`}
                />
                <span className="truncate text-slate-300">
                  {uploadProgress.stage}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
