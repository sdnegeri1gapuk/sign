import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, PenTool, CheckCircle, Cloud } from 'lucide-react';
import { generateSampleSKPPdf } from '../../utils/samplePdf';
import { SignatureItem, SignatureTemplate } from '../../types';
import { PdfViewer } from '../PdfViewer';
import { Sidebar } from '../Sidebar';
import { ExportModal } from '../ExportModal';
import { SignatureModal } from '../SignatureModal';
import { pdfjsLib } from '../../utils/pdfWorker';
import { getDefaultSignaturesList } from '../../utils/defaultSignatures';
import {
  loadSignatures,
  deleteSignatureOnline,
  subscribeToOnlineSignatures
} from '../../utils/signatureService';

export const ManualSignApp: React.FC = () => {
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('SKP_Saripah_Guru_SD.pdf');
  const [numPages, setNumPages] = useState<number>(2);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Signatures placed on the document
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);

  // Signature Templates loaded from Cloud Firestore / IndexedDB
  const [templates, setTemplates] = useState<SignatureTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);

  // Ref to track if initial mount has occurred
  const isInitializedRef = useRef<boolean>(false);

  // Load templates from Cloud Firestore - NEVER reset PDF document
  const refreshTemplatesFromDB = useCallback(async () => {
    try {
      const list = await loadSignatures();
      if (list && list.length > 0) {
        setTemplates(list);
        setActiveTemplateId((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0].id));
      }
    } catch (err) {
      console.error('Failed to load templates from Cloud Firestore', err);
    }
  }, []);

  // Subscribe to real-time Cloud Firestore updates
  useEffect(() => {
    const unsubscribe = subscribeToOnlineSignatures((updatedList) => {
      if (updatedList && updatedList.length > 0) {
        setTemplates(updatedList);
        setActiveTemplateId((prev) => (prev && updatedList.some((s) => s.id === prev) ? prev : updatedList[0].id));
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize strictly ONCE on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
      try {
        // 1. Load initial SKP document
        const samplePdfBytes = await generateSampleSKPPdf();
        setOriginalBytes(samplePdfBytes);
        setFileName('SKP_Saripah_Guru_SD.pdf');

        const doc = await pdfjsLib.getDocument({ data: samplePdfBytes.slice(0) }).promise;
        setNumPages(doc.numPages);

        // 2. Load templates from IndexedDB (10 default signatures)
        await refreshTemplatesFromDB();

        // 3. Pre-place Saripah's signature on page 2 in Pegawai slot
        const defaults = getDefaultSignaturesList();
        const saripahSig = defaults.find((d) => d.id === 'sig_saripah') || defaults[0];
        const kepsekSig = defaults.find((d) => d.id === 'sig_kepsek1') || defaults[1];

        setSignatures([
          {
            id: 'sig_preplaced_saripah',
            pageNumber: 2,
            x: 55, // Pegawai yang Dinilai slot
            y: 535,
            width: 145,
            height: 55,
            rotation: 0,
            dataUrl: saripahSig.dataUrl,
            label: 'Tanda Tangan Saripah, S.Pd.',
          },
          {
            id: 'sig_preplaced_kepsek',
            pageNumber: 2,
            x: 360, // Pejabat Penilai / Kepala Sekolah slot
            y: 535,
            width: 155,
            height: 55,
            rotation: 0,
            dataUrl: kepsekSig.dataUrl,
            label: 'Tanda Tangan Kepala Sekolah',
          },
        ]);
      } catch (err) {
        console.error('Failed to initialize app', err);
      }
    };

    init();
  }, [refreshTemplatesFromDB]);

  // Upload Custom PDF - Keeps document active until user uploads another file
  const handleUploadPdf = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // Verify valid PDF by inspecting page count
      const doc = await pdfjsLib.getDocument({ data: uint8.slice(0) }).promise;

      setOriginalBytes(uint8);
      setFileName(file.name);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setSignatures([]); // reset placed signatures for the new document
    } catch (err) {
      console.error('Failed to load uploaded PDF', err);
      alert('Gagal memuat file PDF. Pastikan file dalam format PDF yang valid.');
    }
  };

  // Reset to Sample Document ONLY when user explicitly clicks "Reset Contoh SKP"
  const handleResetSample = async () => {
    const samplePdfBytes = await generateSampleSKPPdf();
    setOriginalBytes(samplePdfBytes);
    setFileName('SKP_Saripah_Guru_SD.pdf');
    setNumPages(2);
    setCurrentPage(2);

    const activeTpl = templates.find((t) => t.id === activeTemplateId) || templates[0];
    if (activeTpl) {
      setSignatures([
        {
          id: `sig_${Date.now()}`,
          pageNumber: 2,
          x: 55,
          y: 535,
          width: 145,
          height: 55,
          rotation: 0,
          dataUrl: activeTpl.dataUrl,
          label: activeTpl.title,
        },
      ]);
    }
  };

  // Delete a template from Cloud Firestore & IndexedDB
  const handleDeleteTemplateFromDB = async (id: string) => {
    try {
      await deleteSignatureOnline(id);
      await refreshTemplatesFromDB();
    } catch (err) {
      console.error('Failed to delete template from Cloud Firestore', err);
    }
  };

  // Quick stamp a specific template onto current page
  const handleQuickStampToCurrentPage = (tpl: SignatureTemplate) => {
    const defaultW = 140;
    const defaultH = 60;
    const targetPage = Math.min(Math.max(1, currentPage), numPages);
    const newSig: SignatureItem = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: targetPage,
      x: 100,
      y: 200,
      width: defaultW,
      height: defaultH,
      rotation: 0,
      dataUrl: tpl.dataUrl,
      label: tpl.title,
    };
    setSignatures((prev) => [...prev, newSig]);
    setActiveTemplateId(tpl.id);
  };

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Sidebar Controls */}
      <Sidebar
        fileName={fileName}
        numPages={numPages}
        signatures={signatures}
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSelectTemplate={(id) => setActiveTemplateId(id)}
        onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
        onUploadPdf={handleUploadPdf}
        onResetSample={handleResetSample}
        onDeleteSignature={(id) => setSignatures((sigs) => sigs.filter((s) => s.id !== id))}
        onDeleteTemplateFromDB={handleDeleteTemplateFromDB}
        onJumpToPage={(p) => {
          setCurrentPage(p);
          const element = document.getElementById(`pdf-page-${p}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onQuickStampToCurrentPage={handleQuickStampToCurrentPage}
      />

      {/* Main Work Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white tracking-wide truncate max-w-sm">
              {fileName}
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-semibold">
              {numPages} Halaman
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{signatures.length} Tanda Tangan Terpasang</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-800/40 font-medium">
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloud Firestore Aktif</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSignatureModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kelola TTD Cloud</span>
            </button>

            {/* Primary "Simpan PDF" Trigger Button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Simpan PDF</span>
            </button>
          </div>
        </header>

        {/* PDF Viewer & Continuous Multi-Page Editor Canvas */}
        {originalBytes ? (
          <PdfViewer
            originalBytes={originalBytes}
            signatures={signatures}
            onUpdateSignatures={setSignatures}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            activeSignatureTemplate={activeTemplate}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            onUploadNewPdf={handleUploadPdf}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Menyiapkan dokumen PDF...
          </div>
        )}
      </main>

      {/* Signature Management & Upload Modal (IndexedDB) */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSelectSignature={(tpl) => setActiveTemplateId(tpl.id)}
        activeTemplateId={activeTemplateId}
        onRefreshTemplates={refreshTemplatesFromDB}
      />

      {/* Export Options Modal (Sections 13-22) */}
      {originalBytes && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          fileName={fileName}
          originalBytes={originalBytes}
          numPages={numPages}
          signatures={signatures}
        />
      )}
    </div>
  );
};
