import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  PenTool,
  Type,
  Cloud,
  Database,
  Trash2,
  Check,
  X,
  Palette,
  RotateCcw,
  Sparkles,
  Sliders,
  FolderOpen,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { SignatureTemplate } from '../types';
import { processSignatureImage } from '../utils/imageUtils';
import {
  loadSignatures,
  saveSignatureOnline,
  saveMultipleSignaturesOnline,
  deleteSignatureOnline
} from '../utils/signatureService';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSignature: (template: SignatureTemplate) => void;
  activeTemplateId: string | null;
  onRefreshTemplates: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSelectSignature,
  activeTemplateId,
  onRefreshTemplates,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'collection' | 'draw' | 'type'>('upload');

  // Stored signatures from IndexedDB
  const [storedSignatures, setStoredSignatures] = useState<SignatureTemplate[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(true);

  // Upload Tab States
  const [stagedUploads, setStagedUploads] = useState<
    Array<{
      id: string;
      file: File;
      title: string;
      dataUrl: string;
      removeBg: boolean;
      threshold: number;
    }>
  >([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draw Tab States
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1e3a8a');
  const [strokeWidth, setStrokeWidth] = useState(3.5);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [drawTitle, setDrawTitle] = useState('Tanda Tangan Goresan');

  // Type Tab States
  const [typedName, setTypedName] = useState('Saripah, S.Pd.');
  const [fontFamily, setFontFamily] = useState('cursive');
  const typeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load from Cloud Firestore & IndexedDB whenever modal is opened
  const loadFromDB = async () => {
    setIsLoadingDB(true);
    try {
      const list = await loadSignatures();
      setStoredSignatures(list);
    } catch (err) {
      console.error('Failed to load signatures', err);
    } finally {
      setIsLoadingDB(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFromDB();
      setStagedUploads([]);
    }
  }, [isOpen]);

  // Handle files selected for upload
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    const newItems: typeof stagedUploads = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const processed = await processSignatureImage(file, { removeBackground: true, threshold: 215 });
        newItems.push({
          id: `tpl_upload_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          file,
          title: processed.title || `Tanda Tangan ${i + 1}`,
          dataUrl: processed.dataUrl,
          removeBg: true,
          threshold: 215,
        });
      } catch (err) {
        console.error('Error processing file:', file.name, err);
      }
    }

    setStagedUploads((prev) => [...prev, ...newItems]);
    setIsProcessingFiles(false);
    e.target.value = '';
  };

  // Re-process staged upload if transparency threshold changed
  const handleUpdateThreshold = async (index: number, newThreshold: number, removeBg: boolean) => {
    const item = stagedUploads[index];
    if (!item) return;

    try {
      const processed = await processSignatureImage(item.file, { removeBackground: removeBg, threshold: newThreshold });
      setStagedUploads((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? { ...it, dataUrl: processed.dataUrl, threshold: newThreshold, removeBg }
            : it
        )
      );
    } catch (err) {
      console.error('Failed to reprocess item', err);
    }
  };

  // Save all staged uploads to IndexedDB
  const handleSaveStagedUploads = async () => {
    if (stagedUploads.length === 0) return;

    const templatesToSave: SignatureTemplate[] = stagedUploads.map((item) => ({
      id: item.id,
      title: item.title,
      dataUrl: item.dataUrl,
      createdAt: Date.now(),
      type: 'upload',
      fileSize: item.file.size,
    }));

    try {
      await saveMultipleSignaturesOnline(templatesToSave);
      await loadFromDB();
      onRefreshTemplates();

      // Automatically select the first uploaded template
      if (templatesToSave.length > 0) {
        onSelectSignature(templatesToSave[0]);
      }

      setStagedUploads([]);
      setActiveTab('collection');
    } catch (err) {
      console.error('Failed to save to Cloud Firestore', err);
      alert('Gagal menyimpan ke Cloud Firestore.');
    }
  };

  // Delete signature from Cloud Firestore & IndexedDB
  const handleDeleteFromDB = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await deleteSignatureOnline(id);
      await loadFromDB();
      onRefreshTemplates();
    } catch (err) {
      console.error('Failed to delete signature', err);
    }
  };

  // Save drawn signature to Cloud Firestore
  const handleSaveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL('image/png');
    const newTpl: SignatureTemplate = {
      id: `tpl_draw_${Date.now()}`,
      title: drawTitle || 'Tanda Tangan Goresan',
      dataUrl,
      createdAt: Date.now(),
      type: 'draw',
    };

    try {
      await saveSignatureOnline(newTpl);
      await loadFromDB();
      onRefreshTemplates();
      onSelectSignature(newTpl);
      onClose();
    } catch (err) {
      console.error('Failed to save drawn signature', err);
    }
  };

  // Save typed signature to Cloud Firestore
  const handleSaveTypedSignature = async () => {
    const canvas = typeCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const newTpl: SignatureTemplate = {
      id: `tpl_type_${Date.now()}`,
      title: `Tanda Tangan (${typedName})`,
      dataUrl,
      createdAt: Date.now(),
      type: 'type',
    };

    try {
      await saveSignatureOnline(newTpl);
      await loadFromDB();
      onRefreshTemplates();
      onSelectSignature(newTpl);
      onClose();
    } catch (err) {
      console.error('Failed to save typed signature', err);
    }
  };

  // Render Type Canvas preview
  useEffect(() => {
    if (activeTab === 'type' && typeCanvasRef.current) {
      const canvas = typeCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = strokeColor;
      ctx.font = `italic 42px ${fontFamily}, "Brush Script MT", "Segoe Script", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const label = typedName || 'Tanda Tangan';
      ctx.fillText(label, canvas.width / 2, canvas.height / 2 - 8);

      // Underline flourish
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      const metrics = ctx.measureText(label);
      const startX = Math.max(20, (canvas.width - metrics.width) / 2 - 15);
      const endX = Math.min(canvas.width - 20, (canvas.width + metrics.width) / 2 + 25);
      const lineY = canvas.height / 2 + 28;

      ctx.moveTo(startX, lineY);
      ctx.bezierCurveTo(canvas.width * 0.4, lineY + 12, canvas.width * 0.7, lineY - 8, endX, lineY);
      ctx.stroke();
    }
  }, [activeTab, typedName, fontFamily, strokeColor]);

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wide">
                Upload & Kelola Tanda Tangan
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>Penyimpanan Online Cloud Firestore (Tersimpan & Dapat Digunakan dari Mana Saja)</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File TTD (Bisa Banyak)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('collection');
              loadFromDB();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'collection'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Koleksi TTD Cloud ({storedSignatures.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'draw'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Goreskan Tangan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('type')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'type'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Ketik Nama</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: UPLOAD FILE TTD */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 bg-indigo-950/10 hover:bg-indigo-950/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-base text-white">
                  Pilih atau Tarik File Gambar Tanda Tangan ke Sini
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Mendukung upload banyak file sekaligus (PNG, JPG, JPEG, WEBP). Latar putih kertas otomatis dibersihkan menjadi transparan.
                </p>
                <span className="mt-3 text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-3 py-1 rounded-full">
                  + Klik untuk Pilih Satu atau Beberapa File TTD
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </div>

              {isProcessingFiles && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-indigo-300">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Memproses gambar & membersihkan background putih...</span>
                </div>
              )}

              {/* Staged Uploaded Signatures for Review */}
              {stagedUploads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      File yang Akan Disimpan ke IndexedDB ({stagedUploads.length}):
                    </span>
                    <button
                      onClick={() => setStagedUploads([])}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Batal Semua
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {stagedUploads.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkerboard Preview */}
                          <div className="w-24 h-16 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:8px_8px]">
                            <img
                              src={item.dataUrl}
                              alt={item.title}
                              className="max-h-full max-w-full object-contain drop-shadow"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              Nama / Label Tanda Tangan:
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const newTitle = e.target.value;
                                setStagedUploads((prev) =>
                                  prev.map((it, idx) => (idx === index ? { ...it, title: newTitle } : it))
                                );
                              }}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold truncate"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              Ukuran: {(item.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>

                        {/* Transparency sensitivity options */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.removeBg}
                              onChange={(e) =>
                                handleUpdateThreshold(index, item.threshold, e.target.checked)
                              }
                              className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-900 border-slate-700"
                            />
                            <span>Hapus Latar Putih</span>
                          </label>

                          {item.removeBg && (
                            <div className="flex items-center gap-1.5">
                              <span>Sensitivitas:</span>
                              <input
                                type="range"
                                min={150}
                                max={245}
                                value={item.threshold}
                                onChange={(e) =>
                                  handleUpdateThreshold(index, Number(e.target.value), true)
                                }
                                className="w-16 h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save to IndexedDB Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveStagedUploads}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                    >
                      <Database className="w-4 h-4" />
                      <span>Simpan Semua ke IndexedDB & Siapkan untuk Dokumen</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KOLEKSI TTD (INDEXEDDB) */}
          {activeTab === 'collection' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Daftar Tanda Tangan Tersimpan di Browser</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      IndexedDB
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih salah satu tanda tangan untuk langsung dibubuhkan ke dokumen PDF.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Upload TTD Baru</span>
                </button>
              </div>

              {isLoadingDB ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-xs gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Membaca database IndexedDB...</span>
                </div>
              ) : storedSignatures.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/50 border border-slate-800 text-center space-y-3">
                  <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    Belum ada tanda tangan yang tersimpan di IndexedDB
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Silakan upload file tanda tangan Anda atau buat baru dengan menggoreskan tanda tangan pada tab di atas.
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 shadow"
                  >
                    Mulai Upload Tanda Tangan
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {storedSignatures.map((tpl) => {
                    const isSelected = activeTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          onSelectSignature(tpl);
                          onClose();
                        }}
                        className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50'
                            : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Checkerboard thumbnail */}
                          <div className="w-20 h-14 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1 shrink-0 relative overflow-hidden bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:6px_6px]">
                            <img
                              src={tpl.dataUrl}
                              alt={tpl.title}
                              className="max-h-full max-w-full object-contain drop-shadow"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-white text-xs truncate group-hover:text-indigo-300 transition">
                              {tpl.title}
                            </h5>
                            <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {tpl.type === 'upload' ? 'File Unggahan' : tpl.type === 'draw' ? 'Goresan' : 'Ketik'}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {isSelected ? '✓ Sedang Aktif' : 'Klik untuk gunakan'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFromDB(tpl.id, e)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                            title="Hapus dari IndexedDB"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GORESKAN TANGAN */}
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Tanda Tangan:
                </label>
                <input
                  type="text"
                  value={drawTitle}
                  onChange={(e) => setDrawTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="relative border-2 border-dashed border-slate-700 rounded-xl bg-slate-950 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={580}
                  height={220}
                  onMouseDown={startDrawing}
                  onMouseMove={drawMove}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={drawMove}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500">
                    <PenTool className="w-6 h-6 mb-1 opacity-40" />
                    <span className="text-xs">Goreskan tanda tangan menggunakan mouse atau stylus</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Warna:</span>
                  {[
                    { color: '#1e3a8a', label: 'Biru Resmi' },
                    { color: '#0f172a', label: 'Hitam' },
                    { color: '#0369a1', label: 'Biru Tua' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setStrokeColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        strokeColor === c.color ? 'border-white scale-110 shadow' : 'border-slate-700 opacity-70'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Ketebalan:</span>
                    <input
                      type="range"
                      min={2}
                      max={6}
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-16 h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearDrawCanvas}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-slate-800 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveDrawnSignature}
                disabled={!hasDrawn}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition shadow"
              >
                Simpan ke IndexedDB & Gunakan Tanda Tangan
              </button>
            </div>
          )}

          {/* TAB 4: KETIK NAMA */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ketik Nama Lengkap:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cursive', name: 'Gaya Klasik' },
                  { id: '"Dancing Script", cursive', name: 'Gaya Dinamis' },
                  { id: '"Caveat", cursive', name: 'Gaya Halus' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFontFamily(s.id)}
                    className={`p-2 rounded-xl border text-center text-xs transition ${
                      fontFamily === s.id
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 font-bold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="border border-slate-700 rounded-xl bg-slate-950 p-2 flex items-center justify-center">
                <canvas ref={typeCanvasRef} width={580} height={140} className="w-full h-28" />
              </div>

              <button
                type="button"
                onClick={handleSaveTypedSignature}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow"
              >
                Simpan ke IndexedDB & Gunakan Tanda Tangan
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Semua tanda tangan tersimpan lokal di IndexedDB perangkat Anda</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
