import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Upload,
  FileText,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  QrCode,
  AlertCircle,
  Eye,
  CheckCircle2,
  Trash2,
  Edit3,
  Download,
  Sparkles,
  Archive,
  GraduationCap,
  Settings2,
  CheckCircle,
  X,
  FileCheck
} from 'lucide-react';
import JSZip from 'jszip';
import {
  VerifiedDocument,
  QrPlacementSettings
} from '../../types';
import {
  saveVerifiedDocument,
  generateUniqueToken,
  generateVerificationUrl,
  generateQrCodeDataUrl
} from '../../utils/electronicService';
import { getAppSettings, saveAppSettings, QrLogoType } from '../../utils/appSettings';
import { extractIjazahMetadata } from '../../utils/ijazahExtractor';
import {
  exportOriginalWithQrCode,
  exportFlattenedWithQrCode
} from '../../utils/pdfElectronicExport';
import { generateSampleBatchIjazahPdfs } from '../../utils/samplePdf';
import { pdfjsLib } from '../../utils/pdfWorker';
import {
  getActiveBsreAccount,
  isBsreAutoSignEnabled,
  signDocumentWithBsre
} from '../../utils/bsreService';

export interface BatchItem {
  id: string;
  file?: File;
  fileName: string;
  fileSizeStr: string;
  pdfBytes: Uint8Array;
  numPages: number;
  status: 'extracting' | 'ready' | 'signing' | 'success' | 'error';
  errorMessage?: string;

  // Metadata per berkas
  studentName: string;
  documentName: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  issuer: string;
  signerName: string;
  signerPosition: string;
  description: string;

  // Kredensial verifikasi unik per berkas
  verificationToken: string;
  verificationUrl: string;
  qrDataUrl: string;

  // Hasil penandatanganan
  signedPdfBytes?: Uint8Array;
  signedBlobUrl?: string;
  signedFileName?: string;
  verifiedDocument?: VerifiedDocument;
}

interface ElectronicBatchSigningIjazahProps {
  onDocumentImported?: (newDoc: VerifiedDocument) => void;
  onGoToSavedDocs?: () => void;
  onOpenVerification?: (token: string) => void;
  onSwitchToSingleMode?: () => void;
  initialFiles?: File[];
}

export interface BatchUploadProgressInfo {
  isUploading: boolean;
  totalFiles: number;
  currentFileIndex: number;
  currentFileName: string;
  totalBytes: number;
  loadedBytes: number;
  percent: number;
  stage: string;
  isComplete: boolean;
}

export const ElectronicBatchSigningIjazah: React.FC<ElectronicBatchSigningIjazahProps> = ({
  onDocumentImported,
  onGoToSavedDocs,
  onOpenVerification,
  onSwitchToSingleMode,
  initialFiles
}) => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Upload & Extraction Progress State
  const [uploadProgress, setUploadProgress] = useState<BatchUploadProgressInfo>({
    isUploading: false,
    totalFiles: 0,
    currentFileIndex: 0,
    currentFileName: '',
    totalBytes: 0,
    loadedBytes: 0,
    percent: 0,
    stage: '',
    isComplete: false
  });

  // Global QR Placement Settings (Default sesuai instruksi: x: 346, y: 622, ukuran: 85, label: OFF)
  const [qrSettings, setQrSettings] = useState<QrPlacementSettings>({
    pageNumber: 1,
    x: 346,
    y: 622,
    width: 85,
    height: 85,
    showLabel: false,
    labelText: 'Scan Verifikasi Ijazah'
  });

  const [exportMode, setExportMode] = useState<'original' | 'flattened'>('original');
  const [showSettingsAccordion, setShowSettingsAccordion] = useState<boolean>(false);

  // Logo di tengah barcode state
  const initialBatchSettings = getAppSettings();
  const [qrLogoEnabled, setQrLogoEnabled] = useState<boolean>(initialBatchSettings.qrLogoEnabled);
  const [qrLogoType, setQrLogoType] = useState<QrLogoType>(initialBatchSettings.qrLogoType);

  const handleToggleLogo = async (enabled: boolean) => {
    setQrLogoEnabled(enabled);
    saveAppSettings({ qrLogoEnabled: enabled });
    if (batchItems.length > 0) {
      const updated = await Promise.all(
        batchItems.map(async (it) => {
          const newQr = await generateQrCodeDataUrl(it.verificationUrl, {
            enabled,
            logoType: qrLogoType
          });
          return { ...it, qrDataUrl: newQr };
        })
      );
      setBatchItems(updated);
    }
  };

  const handleChangeLogoType = async (type: QrLogoType) => {
    setQrLogoType(type);
    setQrLogoEnabled(true);
    saveAppSettings({ qrLogoType: type, qrLogoEnabled: true });
    if (batchItems.length > 0) {
      const updated = await Promise.all(
        batchItems.map(async (it) => {
          const newQr = await generateQrCodeDataUrl(it.verificationUrl, {
            enabled: true,
            logoType: type
          });
          return { ...it, qrDataUrl: newQr };
        })
      );
      setBatchItems(updated);
    }
  };

  // Edit Metadata Modal state
  const [editingItem, setEditingItem] = useState<BatchItem | null>(null);

  // Preview Modal state
  const [previewItem, setPreviewItem] = useState<BatchItem | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Copy toast state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Handle Drag & Drop
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to read file bytes with progress tracking
  const readFileWithProgress = (
    file: File,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(e.loaded, e.total);
        }
      };
      reader.onload = (e) => {
        resolve(new Uint8Array(e.target?.result as ArrayBuffer));
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };

  // Process a single file to extract its distinct metadata and generate unique token/QR
  const processUploadedFile = async (
    file: File,
    onStepUpdate?: (subPercent: number, stageName: string) => void
  ): Promise<BatchItem> => {
    onStepUpdate?.(15, `Membaca data berkas ${file.name}...`);
    const bytes = await readFileWithProgress(file, (loaded, total) => {
      const readRatio = total > 0 ? (loaded / total) * 0.4 : 0.2;
      onStepUpdate?.(Math.round(readRatio * 100), `Membaca ${(loaded / (1024 * 1024)).toFixed(1)} MB...`);
    });

    const settings = getAppSettings();

    // 1. Ekstraksi otomatis metadata unik per dokumen
    onStepUpdate?.(55, `Mengekstrak data otomatis & nomor ijazah...`);
    const extracted = await extractIjazahMetadata(bytes, file.name);

    // 2. Generate token unik & URL verifikasi web baru (Sama persis Buat Dokumen & Ijazah Baru)
    onStepUpdate?.(75, `Menghasilkan kode verifikasi & QR unik...`);
    const token = generateUniqueToken();
    const url = generateVerificationUrl(token);
    const qrData = await generateQrCodeDataUrl(url);

    // Hitung jumlah halaman
    onStepUpdate?.(90, `Memvalidasi lembar dokumen PDF...`);
    let pageCount = 1;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: bytes.slice(0),
        useSystemFonts: true
      });
      const doc = await loadingTask.promise;
      pageCount = doc.numPages;
    } catch (e) {
      console.warn('Could not read page count for', file.name, e);
    }

    onStepUpdate?.(100, `Selesai memproses ${file.name}`);

    const fileSizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    return {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      fileName: file.name,
      fileSizeStr,
      pdfBytes: bytes,
      numPages: pageCount,
      status: 'ready',
      studentName: extracted.studentName || 'Nama Siswa',
      documentName: extracted.documentName || `Ijazah - ${file.name.replace(/\.pdf$/i, '')}`,
      documentType: extracted.documentType || 'Ijazah',
      documentNumber: extracted.documentNumber || '',
      documentDate: extracted.documentDate || '14 Juli 2026',
      issuer: settings.issuer,
      signerName: settings.signerName,
      signerPosition: settings.signerPosition,
      description: `${extracted.documentType || 'Ijazah'} resmi kelulusan siswa an. ${extracted.studentName || 'Siswa'} dengan penempelan barcode verifikasi.`,
      verificationToken: token,
      verificationUrl: url,
      qrDataUrl: qrData
    };
  };

  // Handle multiple file upload with real percentage progress
  const handleFilesSelected = async (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const rawArray = Array.isArray(fileList) ? fileList : Array.from(fileList);
    if (rawArray.length === 0) return;

    const filesArray = rawArray.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (filesArray.length === 0) {
      alert('Mohon pilih berkas dengan format PDF (.pdf)');
      return;
    }

    const totalFiles = filesArray.length;
    const totalBytes = filesArray.reduce((acc, f) => acc + f.size, 0);

    setUploadProgress({
      isUploading: true,
      totalFiles,
      currentFileIndex: 1,
      currentFileName: filesArray[0].name,
      totalBytes,
      loadedBytes: 0,
      percent: 2,
      stage: `Menyiapkan ${totalFiles} berkas ijazah untuk diunggah...`,
      isComplete: false
    });

    const newItems: BatchItem[] = [];
    let completedBytes = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = filesArray[i];
      const prevFileBytes = completedBytes;

      setUploadProgress((prev) => ({
        ...prev,
        currentFileIndex: i + 1,
        currentFileName: file.name,
        stage: `Membaca & memproses berkas ${i + 1} dari ${totalFiles}: ${file.name}`
      }));

      try {
        const item = await processUploadedFile(file, (subPercent, subStage) => {
          const fileContribution = (subPercent / 100) * file.size;
          const currentTotalLoaded = Math.min(totalBytes, prevFileBytes + fileContribution);
          const overallPercent = Math.min(98, Math.round((currentTotalLoaded / (totalBytes || 1)) * 100));

          setUploadProgress((prev) => ({
            ...prev,
            loadedBytes: currentTotalLoaded,
            percent: Math.max(prev.percent, overallPercent),
            stage: subStage
          }));
        });

        newItems.push(item);
        completedBytes += file.size;
        const currentFileDonePercent = Math.min(99, Math.round(((i + 1) / totalFiles) * 100));

        setUploadProgress((prev) => ({
          ...prev,
          loadedBytes: completedBytes,
          percent: Math.max(prev.percent, currentFileDonePercent),
          stage: `Selesai ${i + 1}/${totalFiles} (${file.name})`
        }));
      } catch (err) {
        console.error('Error processing batch item', file.name, err);
        completedBytes += file.size;
      }
    }

    // 100% Completion state
    setUploadProgress((prev) => ({
      ...prev,
      loadedBytes: totalBytes,
      percent: 100,
      stage: `Selesai! Berhasil mengunggah ${newItems.length} berkas ijazah.`,
      isComplete: true
    }));

    // Pause briefly so user clearly sees the 100% completion badge
    await new Promise((res) => setTimeout(res, 650));

    setBatchItems((prev) => [...prev, ...newItems]);
    setIsCompleted(false);
    setUploadProgress((prev) => ({ ...prev, isUploading: false }));
  };

  // Handle initial files passed from single mode redirect
  const initialFilesProcessed = useRef<boolean>(false);
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !initialFilesProcessed.current) {
      initialFilesProcessed.current = true;
      handleFilesSelected(initialFiles);
    }
  }, [initialFiles]);

  // Load sample batch (3 distinct authentic Indonesian diploma PDFs) with percentage progress
  const handleLoadSampleBatch = async () => {
    try {
      setIsGeneratingSamples(true);
      setUploadProgress({
        isUploading: true,
        totalFiles: 3,
        currentFileIndex: 1,
        currentFileName: 'IJZ-111202663419179_sign.pdf (Ahmad Fauzi)',
        totalBytes: 220 * 1024,
        loadedBytes: 0,
        percent: 15,
        stage: 'Membuat berkas contoh ijazah 1/3 (Ahmad Fauzi)...',
        isComplete: false
      });

      const samples = await generateSampleBatchIjazahPdfs();
      const settings = getAppSettings();

      const items: BatchItem[] = [];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        setUploadProgress((prev) => ({
          ...prev,
          currentFileIndex: i + 1,
          currentFileName: s.fileName,
          percent: Math.round(((i + 0.4) / samples.length) * 100),
          stage: `Mengekstrak data ijazah contoh ${i + 1}/${samples.length} (${s.studentName})...`
        }));

        const extracted = await extractIjazahMetadata(s.bytes, s.fileName);
        const token = generateUniqueToken();
        const url = generateVerificationUrl(token);
        const qrData = await generateQrCodeDataUrl(url);

        items.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          fileName: s.fileName,
          fileSizeStr: '74 KB',
          pdfBytes: s.bytes,
          numPages: 1,
          status: 'ready',
          studentName: extracted.studentName || s.studentName,
          documentName: extracted.documentName || `Ijazah - ${s.studentName}`,
          documentType: extracted.documentType || 'Ijazah',
          documentNumber: extracted.documentNumber || s.documentNumber,
          documentDate: extracted.documentDate || '14 Juli 2026',
          issuer: settings.issuer,
          signerName: settings.signerName,
          signerPosition: settings.signerPosition,
          description: `Ijazah resmi kelulusan siswa an. ${s.studentName} dengan penempelan barcode verifikasi.`,
          verificationToken: token,
          verificationUrl: url,
          qrDataUrl: qrData
        });

        setUploadProgress((prev) => ({
          ...prev,
          percent: Math.round(((i + 1) / samples.length) * 100),
          stage: `Selesai contoh ${i + 1}/${samples.length} (${s.studentName})`
        }));
      }

      setUploadProgress((prev) => ({
        ...prev,
        percent: 100,
        stage: 'Contoh batch 3 ijazah berhasil dimuat 100%!',
        isComplete: true
      }));

      await new Promise((res) => setTimeout(res, 600));

      setBatchItems((prev) => [...prev, ...items]);
      setIsCompleted(false);
    } catch (err) {
      console.error('Failed to generate sample batch', err);
      alert('Gagal memuat contoh berkas batch');
    } finally {
      setIsGeneratingSamples(false);
    }
  };

  // Remove single item from queue
  const handleRemoveItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all items
  const handleClearAll = () => {
    if (isProcessing) return;
    if (confirm('Bersihkan semua berkas dari antrian batch?')) {
      setBatchItems([]);
      setIsCompleted(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  // Save changes from Edit Metadata Modal
  const handleSaveEditedItem = (updated: BatchItem) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    setEditingItem(null);
  };

  // Execute Batch Signing for all items concurrently / sequentially
  const handleExecuteBatchSigning = async () => {
    if (batchItems.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setIsCompleted(false);
    setProgressPercent(5);
    setProgressText(`Mempersiapkan penandatanganan ${batchItems.length} dokumen...`);

    const updatedItems = [...batchItems];
    const total = updatedItems.length;

    for (let i = 0; i < total; i++) {
      setCurrentProcessingIndex(i);
      const item = updatedItems[i];
      const stepPercent = Math.round(((i + 0.2) / total) * 100);
      setProgressPercent(stepPercent);
      setProgressText(
        `Menandatangani berkas ${i + 1} dari ${total}: "${item.documentName}" (an. ${item.studentName})...`
      );

      // Update status to 'signing'
      item.status = 'signing';
      setBatchItems([...updatedItems]);

      try {
        // 1. Tempelkan QR code ke lembar PDF dengan metadata masing-masing:
        // Jika dokumen adalah Transkrip dan posisi masih menggunakan default Ijazah (346, 622),
        // otomatis gunakan posisi default Transkrip (344, 662)
        const isItemTranskrip = item.documentType?.toLowerCase().includes('transkrip');
        const itemBarcodePos =
          isItemTranskrip && qrSettings.x === 346 && qrSettings.y === 622
            ? { x: 344, y: 662 }
            : { x: qrSettings.x, y: qrSettings.y };

        const itemQrSettings: QrPlacementSettings = {
          ...qrSettings,
          x: itemBarcodePos.x,
          y: itemBarcodePos.y,
          labelText: qrSettings.showLabel
            ? isItemTranskrip
              ? 'Scan Verifikasi Transkrip'
              : 'Scan Verifikasi Ijazah'
            : qrSettings.labelText
        };

        // BSrE Official Digital Signature check for batch
        const activeBsre = getActiveBsreAccount();
        let itemBsreSignature: any = undefined;
        if (isBsreAutoSignEnabled() && activeBsre && activeBsre.isLoggedIn) {
          itemBsreSignature = await signDocumentWithBsre(
            item.pdfBytes,
            {
              documentName: item.documentName || `Ijazah - ${item.studentName}`,
              documentNumber: item.documentNumber || item.verificationToken,
              issuer: item.issuer
            },
            activeBsre
          );
        }

        let finalBytes: Uint8Array;
        if (exportMode === 'flattened') {
          finalBytes = await exportFlattenedWithQrCode(
            item.pdfBytes,
            item.qrDataUrl,
            itemQrSettings,
            undefined,
            itemBsreSignature
          );
        } else {
          finalBytes = await exportOriginalWithQrCode(
            item.pdfBytes,
            item.qrDataUrl,
            itemQrSettings,
            undefined,
            itemBsreSignature
          );
        }

        // 2. Buat objek VerifiedDocument lengkap dengan metadata unik siswa
        const docId = `doc_${item.verificationToken}_${Date.now()}`;
        const cleanStudentName = (item.studentName || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanNo = (item.documentNumber || item.verificationToken).replace(/[^a-zA-Z0-9_-]/g, '_');
        const signedFileName = `Ijazah_${cleanStudentName}_${cleanNo}_signed.pdf`;

        const verifiedDoc: VerifiedDocument = {
          documentId: docId,
          verificationToken: item.verificationToken,
          documentName: item.documentName.trim() || `Ijazah - ${item.studentName}`,
          documentType: item.documentType.trim() || 'Ijazah',
          documentNumber: item.documentNumber.trim() || item.verificationToken,
          documentDate: item.documentDate.trim() || '14 Juli 2026',
          issuer: item.issuer.trim(),
          signerName: item.signerName.trim(),
          signerPosition: item.signerPosition.trim(),
          description: item.description.trim(),
          originalFileName: item.fileName,
          finalFileName: signedFileName,
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
          qrDataUrl: item.qrDataUrl,
          verificationUrl: item.verificationUrl,
          bsreSignature: itemBsreSignature
        };

        // 3. Simpan ke database Firestore & LocalStorage
        await saveVerifiedDocument(verifiedDoc);

        // 4. Buat Blob URL untuk pengunduhan instan
        const blob = new Blob([finalBytes as any], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        item.status = 'success';
        item.signedPdfBytes = finalBytes;
        item.signedBlobUrl = blobUrl;
        item.signedFileName = signedFileName;
        item.verifiedDocument = verifiedDoc;

        // Callback parent
        onDocumentImported?.(verifiedDoc);
      } catch (err: any) {
        console.error('Failed to sign batch item:', item.fileName, err);
        item.status = 'error';
        item.errorMessage = err?.message || 'Gagal menandatangani berkas';
      }

      setBatchItems([...updatedItems]);
    }

    setProgressPercent(100);
    setProgressText(`✓ Selesai! Semua ${total} dokumen berhasil ditandatangani secara digital.`);
    setIsProcessing(false);
    setIsCompleted(true);
    setCurrentProcessingIndex(-1);
  };

  // Download all signed documents as a single ZIP file
  const handleDownloadAllZip = async () => {
    const successItems = batchItems.filter(
      (item) => item.status === 'success' && item.signedPdfBytes
    );

    if (successItems.length === 0) {
      alert('Belum ada dokumen yang berhasil ditandatangani untuk diunduh.');
      return;
    }

    try {
      setIsZipping(true);
      const zip = new JSZip();

      successItems.forEach((item, index) => {
        const cleanStudentName = (item.studentName || `Siswa_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanNo = (item.documentNumber || item.verificationToken).replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = item.signedFileName || `Ijazah_${cleanStudentName}_${cleanNo}_signed.pdf`;
        zip.file(fileName, item.signedPdfBytes!);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const zipFileName = `Ijazah_Tanda_Tangan_Digital_Batch_${dateStr}.zip`;

      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to create ZIP', err);
      alert('Gagal membuat berkas ZIP pengunduhan.');
    } finally {
      setIsZipping(false);
    }
  };

  // Copy verification link helper
  const handleCopyVerificationUrl = (item: BatchItem) => {
    navigator.clipboard.writeText(item.verificationUrl);
    setCopiedToken(item.verificationToken);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Render preview canvas when previewItem changes
  useEffect(() => {
    if (!previewItem || !previewCanvasRef.current) return;

    let isMounted = true;
    const targetBytes = previewItem.signedPdfBytes || previewItem.pdfBytes;

    async function renderPreview() {
      try {
        setPreviewLoading(true);
        const loadingTask = pdfjsLib.getDocument({
          data: targetBytes.slice(0),
          useSystemFonts: true
        });
        const doc = await loadingTask.promise;
        const page = await doc.getPage(1);

        if (!isMounted || !previewCanvasRef.current) return;

        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = previewCanvasRef.current;
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvasContext: ctx,
          viewport,
          canvas
        }).promise;
      } catch (err) {
        console.error('Preview render error', err);
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    }

    renderPreview();
    return () => {
      isMounted = false;
    };
  }, [previewItem]);

  const readyCount = batchItems.filter((i) => i.status === 'ready').length;
  const successCount = batchItems.filter((i) => i.status === 'success').length;
  const errorCount = batchItems.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* BATCH SIGNING HEADER & STATS BANNER */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  Fitur Massal
                </span>
                <span className="text-xs text-slate-400">
                  Ekstraksi Otomatis & Penandatanganan Serentak
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                Batch Signing Ijazah Baru
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                Pilih beberapa berkas PDF Ijazah sekaligus. Sistem akan mengekstrak otomatis metadata masing-masing siswa (Nama, No. Ijazah, Tanggal Tanda Tangan), membuatkan token & barcode verifikasi unik per berkas, dan menandatanganinya secara bersamaan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onSwitchToSingleMode && (
              <button
                type="button"
                onClick={onSwitchToSingleMode}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Dokumen Tunggal</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSettingsAccordion(!showSettingsAccordion)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border flex items-center gap-2 ${
                showSettingsAccordion
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>Pengaturan Barcode</span>
            </button>
          </div>
        </div>

        {/* SETTINGS ACCORDION */}
        {showSettingsAccordion && (
          <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold block">Posisi Barcode</span>
                <span className="text-[10px] text-slate-500 font-mono">X:{qrSettings.x} Y:{qrSettings.y}</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setQrSettings({ ...qrSettings, x: 346, y: 622 })}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold border transition ${
                    qrSettings.x === 346 && qrSettings.y === 622
                      ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/60'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  Ijazah (346, 622)
                </button>
                <button
                  type="button"
                  onClick={() => setQrSettings({ ...qrSettings, x: 344, y: 662 })}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold border transition ${
                    qrSettings.x === 344 && qrSettings.y === 662
                      ? 'bg-cyan-600/30 text-cyan-200 border-cyan-500/60'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  Transkrip (344, 662)
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Posisi X (pt)</label>
                  <input
                    type="number"
                    value={qrSettings.x}
                    onChange={(e) =>
                      setQrSettings({ ...qrSettings, x: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Posisi Y (pt)</label>
                  <input
                    type="number"
                    value={qrSettings.y}
                    onChange={(e) =>
                      setQrSettings({ ...qrSettings, y: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                  />
                </div>
              </div>
              <p className="text-[10px] text-emerald-400/90 leading-tight">
                ✓ Otomatis: Ijazah -&gt; X: 346, Y: 622 | Transkrip -&gt; X: 344, Y: 662
              </p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60 space-y-2">
              <span className="text-slate-400 font-semibold block">Ukuran & Halaman</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Ukuran (px)</label>
                  <input
                    type="number"
                    value={qrSettings.width}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 85;
                      setQrSettings({ ...qrSettings, width: v, height: v });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Halaman Tempel</label>
                  <input
                    type="number"
                    min="1"
                    value={qrSettings.pageNumber}
                    onChange={(e) =>
                      setQrSettings({ ...qrSettings, pageNumber: Number(e.target.value) || 1 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                  />
                </div>
              </div>
              <p className="text-[10px] text-emerald-400">
                Default: Ukuran 85 px, Halaman 1
              </p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60 space-y-2">
              <span className="text-slate-400 font-semibold block">Label Keterangan</span>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="batchShowLabel"
                  checked={qrSettings.showLabel}
                  onChange={(e) =>
                    setQrSettings({ ...qrSettings, showLabel: e.target.checked })
                  }
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-slate-900"
                />
                <label htmlFor="batchShowLabel" className="text-xs text-slate-300 cursor-pointer">
                  Tampilkan Teks Keterangan
                </label>
              </div>
              <p className="text-[10px] text-slate-400">
                Default: <strong>OFF</strong> (hanya kode QR presisi)
              </p>
            </div>

            {/* Logo Barcode card */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold block">Logo Barcode</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  Level H (30%)
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="batchShowLogo"
                  checked={qrLogoEnabled}
                  onChange={(e) => handleToggleLogo(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-slate-900"
                />
                <label htmlFor="batchShowLogo" className="text-xs text-slate-300 cursor-pointer">
                  Logo di Tengah Barcode
                </label>
              </div>

              {qrLogoEnabled && (
                <div className="grid grid-cols-3 gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => handleChangeLogoType('kemdikbud')}
                    className={`px-1.5 py-1 rounded text-[10px] font-bold border transition truncate ${
                      qrLogoType === 'kemdikbud'
                        ? 'bg-sky-600/30 border-sky-400 text-sky-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
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
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
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
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                    title="BSrE / TTE"
                  >
                    BSrE
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60 space-y-2">
              <span className="text-slate-400 font-semibold block">Format Ekspor PDF</span>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setExportMode('original')}
                  className={`px-2 py-1.5 rounded-lg font-semibold text-[11px] transition ${
                    exportMode === 'original'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Asli
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode('flattened')}
                  className={`px-2 py-1.5 rounded-lg font-semibold text-[11px] transition ${
                    exportMode === 'flattened'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Flat
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {exportMode === 'original' ? 'Teks vektor tajam & ringan' : 'Raster 300 DPI solid'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MULTI-FILE UPLOAD ZONE & SAMPLE BUTTON */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => {
            if (!uploadProgress.isUploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-7 text-center transition ${
            uploadProgress.isUploading
              ? 'border-emerald-500 bg-emerald-950/20 cursor-wait'
              : isDragOver
              ? 'border-emerald-400 bg-emerald-950/30 cursor-pointer'
              : 'border-slate-700 hover:border-emerald-500 bg-slate-950/40 hover:bg-slate-950/70 cursor-pointer'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".pdf,application/pdf"
            disabled={uploadProgress.isUploading}
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          {uploadProgress.isUploading ? (
            <div className="flex flex-col items-center gap-3 py-2 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner animate-pulse">
                <Upload className="w-6 h-6 animate-bounce" />
              </div>
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Sedang Mengunggah Dokumen...
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
                  <span className="truncate max-w-[240px]">
                    {uploadProgress.currentFileName || uploadProgress.stage}
                  </span>
                  <span className="shrink-0 font-mono text-slate-300">
                    Berkas {uploadProgress.currentFileIndex}/{uploadProgress.totalFiles}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Pilih atau Tarik Beberapa Berkas PDF Ijazah Sekaligus
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Anda dapat memilih 2, 5, 10, atau lebih berkas PDF ijazah secara bersamaan.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-emerald-300 text-[11px] font-semibold border border-slate-700">
                  Format: .PDF
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-800 text-teal-300 text-[11px] font-semibold border border-slate-700">
                  Mendukung Multi-Seleksi
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Toolbar: Sample generator & Quick actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isGeneratingSamples || isProcessing}
              onClick={handleLoadSampleBatch}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition flex items-center gap-2 shadow"
            >
              {isGeneratingSamples ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Membuat Contoh...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Contoh Batch</span>
                </>
              )}
            </button>

            {batchItems.length > 0 && !isProcessing && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-medium transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          {/* Queue Count */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Total Berkas:{' '}
              <strong className="text-white font-mono">{batchItems.length}</strong>
            </span>
            {successCount > 0 && (
              <span className="text-emerald-400">
                Selesai: <strong className="font-mono">{successCount}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BATCH PROGRESS BAR (WHEN PROCESSING OR COMPLETED) */}
      {(isProcessing || isCompleted) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold">
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-white">{progressText}</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold text-sm">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/20"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Completion summary & Bulk Download Button */}
          {isCompleted && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>{successCount}</strong> berkas telah ditandatangani secara digital & tersimpan dalam riwayat resmi.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isZipping}
                  onClick={handleDownloadAllZip}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition flex items-center gap-2"
                >
                  {isZipping ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengompresi ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      <span>Unduh ZIP</span>
                    </>
                  )}
                </button>

                {onGoToSavedDocs && (
                  <button
                    type="button"
                    onClick={onGoToSavedDocs}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                  >
                    Dokumen Tersimpan
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BATCH ITEMS TABLE / CARD LIST */}
      {batchItems.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <span>Daftar Dokumen</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Setiap dokumen memiliki nama siswa, nomor ijazah, dan token verifikasi uniknya sendiri.
              </p>
            </div>

            {/* Execute Button */}
            {!isCompleted && (
              <button
                type="button"
                disabled={isProcessing || readyCount === 0}
                onClick={handleExecuteBatchSigning}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Menandatangani...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Tanda Tangani Semua</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa & Berkas</th>
                  <th className="py-3 px-4">Nomor Ijazah</th>
                  <th className="py-3 px-4">Tanggal Tanda Tangan</th>
                  <th className="py-3 px-4">Token & Link Verifikasi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {batchItems.map((item, index) => {
                  const isCurrent = currentProcessingIndex === index;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-900/40 transition ${
                        isCurrent ? 'bg-emerald-950/20 ring-1 ring-emerald-500/30' : ''
                      }`}
                    >
                      {/* Column 1: Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {index + 1}
                      </td>

                      {/* Column 2: Siswa & Filename */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">
                          {item.studentName || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xs" title={item.fileName}>
                          {item.fileName} • {item.fileSizeStr}
                        </div>
                      </td>

                      {/* Column 3: Nomor Ijazah */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-emerald-300 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40">
                          {item.documentNumber || '—'}
                        </span>
                      </td>

                      {/* Column 4: Tanggal Tanda Tangan */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 font-medium">
                          {item.documentDate || '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Kabupaten Lombok Timur
                        </div>
                      </td>

                      {/* Column 5: Token & Link Verifikasi Unik */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-white text-xs">
                          <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {item.verificationToken}
                          </span>
                          <button
                            type="button"
                            title="Salin Tautan Verifikasi"
                            onClick={() => handleCopyVerificationUrl(item)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition"
                          >
                            {copiedToken === item.verificationToken ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5" title={item.verificationUrl}>
                          {item.verificationUrl}
                        </div>
                      </td>

                      {/* Column 6: Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.status === 'ready' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                            <span>Siap</span>
                          </span>
                        )}
                        {item.status === 'signing' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-semibold border border-emerald-700 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Menempelkan...</span>
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Ditandatangani</span>
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 text-[10px] font-semibold border border-rose-800">
                            <AlertCircle className="w-3 h-3" />
                            <span>Gagal</span>
                          </span>
                        )}
                      </td>

                      {/* Column 7: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Button */}
                          <button
                            type="button"
                            title="Pratinjau Dokumen"
                            onClick={() => setPreviewItem(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Metadata (Only before signing or if error) */}
                          {item.status !== 'success' && !isProcessing && (
                            <button
                              type="button"
                              title="Edit Metadata Dokumen"
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Individual Download if signed */}
                          {item.status === 'success' && item.signedBlobUrl && (
                            <a
                              href={item.signedBlobUrl}
                              download={item.signedFileName || `${item.documentName}.pdf`}
                              title="Unduh PDF Ijazah Bertanda Tangan"
                              className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Open Verification page */}
                          {item.status === 'success' && onOpenVerification && (
                            <button
                              type="button"
                              title="Cek Halaman Verifikasi"
                              onClick={() => onOpenVerification(item.verificationToken)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Remove button (when not processing) */}
                          {!isProcessing && (
                            <button
                              type="button"
                              title="Hapus dari antrian"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Table Bar: Quick Download All or Execute */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-400">
              Menampilkan {batchItems.length} berkas ijazah terdaftar
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {isCompleted && (
                <button
                  type="button"
                  disabled={isZipping}
                  onClick={handleDownloadAllZip}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Unduh ZIP</span>
                </button>
              )}

              {!isCompleted && (
                <button
                  type="button"
                  disabled={isProcessing || readyCount === 0}
                  onClick={handleExecuteBatchSigning}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tanda Tangani Semua</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Sesuaikan Metadata Dokumen</span>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Nama Siswa</label>
                <input
                  type="text"
                  value={editingItem.studentName}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      studentName: e.target.value,
                      documentName: `Ijazah - ${e.target.value}`
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Nomor Ijazah</label>
                <input
                  type="text"
                  value={editingItem.documentNumber}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, documentNumber: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Tanggal Tanda Tangan</label>
                <input
                  type="text"
                  value={editingItem.documentDate}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, documentDate: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">Jenis Dokumen</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {editingItem.documentType?.toLowerCase().includes('transkrip')
                      ? 'Posisi: X: 344, Y: 662'
                      : 'Posisi: X: 346, Y: 622'}
                  </span>
                </div>
                <div className="flex gap-2 mb-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        ...editingItem,
                        documentType: 'Ijazah',
                        documentName: editingItem.documentName.replace(/^Transkrip/i, 'Ijazah')
                      })
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                      !editingItem.documentType?.toLowerCase().includes('transkrip')
                        ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/60 shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                    }`}
                  >
                    Ijazah (Default 346, 622)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        ...editingItem,
                        documentType: 'Transkrip',
                        documentName: editingItem.documentName.replace(/^Ijazah/i, 'Transkrip')
                      })
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                      editingItem.documentType?.toLowerCase().includes('transkrip')
                        ? 'bg-cyan-600/30 text-cyan-200 border-cyan-500/60 shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                    }`}
                  >
                    Transkrip (Default 344, 662)
                  </button>
                </div>
                <input
                  type="text"
                  value={editingItem.documentType}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, documentType: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Judul Dokumen</label>
                <input
                  type="text"
                  value={editingItem.documentName}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, documentName: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedItem(editingItem)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">
                    Pratinjau: {previewItem.documentName}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Siswa: <strong>{previewItem.studentName}</strong> • No: {previewItem.documentNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas View */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 min-h-[400px]">
              {previewLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Memuat pratinjau halaman...</span>
                </div>
              )}
              <canvas
                ref={previewCanvasRef}
                className={`max-w-full max-h-[70vh] shadow-2xl rounded-lg border border-slate-800 ${
                  previewLoading ? 'hidden' : 'block'
                }`}
              />
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">
                Token: <strong className="text-emerald-400">{previewItem.verificationToken}</strong>
              </span>

              <div className="flex items-center gap-2">
                {previewItem.signedBlobUrl && (
                  <a
                    href={previewItem.signedBlobUrl}
                    download={previewItem.signedFileName || `${previewItem.documentName}.pdf`}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: INDIKATOR PROGRES UPLOAD & EKSTRAKSI DOKUMEN BATCH */}
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
                  ? 'Upload Selesai!'
                  : 'Sedang Mengunggah & Memproses Dokumen'}
              </h3>
              <p className="text-xs text-slate-400">
                {uploadProgress.isComplete
                  ? 'Semua berkas ijazah telah siap di dalam daftar.'
                  : `Memproses berkas ${uploadProgress.currentFileIndex} dari total ${uploadProgress.totalFiles} berkas`}
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
                <span>
                  {uploadProgress.totalBytes > 0
                    ? `${(uploadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(uploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB`
                    : `${uploadProgress.currentFileIndex}/${uploadProgress.totalFiles} berkas`}
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
                <span className="truncate font-mono font-medium" title={uploadProgress.currentFileName}>
                  {uploadProgress.currentFileName || 'Menyiapkan berkas...'}
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
