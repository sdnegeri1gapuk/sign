import React, { useRef } from 'react';
import {
  FileText,
  Upload,
  PenTool,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Cloud,
  Database,
  Layers,
  Sparkles,
  Download,
  FolderOpen
} from 'lucide-react';
import { SignatureItem, SignatureTemplate } from '../types';

interface SidebarProps {
  fileName: string;
  numPages: number;
  signatures: SignatureItem[];
  templates: SignatureTemplate[];
  activeTemplateId: string | null;
  onSelectTemplate: (id: string) => void;
  onOpenSignatureModal: () => void;
  onUploadPdf: (file: File) => void;
  onResetSample: () => void;
  onDeleteSignature: (id: string) => void;
  onDeleteTemplateFromDB: (id: string) => void;
  onJumpToPage: (page: number) => void;
  onOpenExportModal: () => void;
  onQuickStampToCurrentPage: (template: SignatureTemplate) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  fileName,
  numPages,
  signatures,
  templates,
  activeTemplateId,
  onSelectTemplate,
  onOpenSignatureModal,
  onUploadPdf,
  onResetSample,
  onDeleteSignature,
  onDeleteTemplateFromDB,
  onJumpToPage,
  onOpenExportModal,
  onQuickStampToCurrentPage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPdf(file);
      e.target.value = '';
    }
  };

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden text-slate-200 shrink-0">
      {/* Top Brand & Actions */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wide">SignPDF</h1>
              <span className="text-[10px] text-indigo-400 font-medium">Digital Signature & Multi-Mode Export</span>
            </div>
          </div>
        </div>

        {/* Big "Simpan PDF" Main Trigger Button as requested */}
        <button
          onClick={onOpenExportModal}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Simpan PDF</span>
        </button>
      </div>

      {/* Scrollable Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Document Info Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Dokumen Aktif
            </span>
            <button
              onClick={onResetSample}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              title="Kembali ke Dokumen SKP Contoh"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Contoh SKP</span>
            </button>
          </div>

          <div className="flex items-start gap-2.5">
            <FileText className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <p className="font-bold text-slate-100 truncate text-xs" title={fileName}>
                {fileName}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {numPages} Halaman Dokumen
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-center transition flex items-center justify-center gap-1.5 shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File PDF Baru</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Signature Palette / Templates (IndexedDB Powered) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-200">Pilihan TTD Cloud (Online)</span>
            </div>
            <button
              onClick={onOpenSignatureModal}
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Upload TTD</span>
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="p-3 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 space-y-2">
              <p>Belum ada tanda tangan di IndexedDB.</p>
              <button
                onClick={onOpenSignatureModal}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs"
              >
                Upload Tanda Tangan
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {templates.map((tpl) => {
                const isSelected = activeTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => onSelectTemplate(tpl.id)}
                    className={`p-2.5 rounded-xl border-2 transition cursor-pointer relative group flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50 shadow-md'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Checkerboard thumbnail */}
                      <div className="w-14 h-9 bg-slate-900 rounded border border-slate-700 flex items-center justify-center p-0.5 shrink-0 relative overflow-hidden bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:4px_4px]">
                        <img
                          src={tpl.dataUrl}
                          alt="Signature thumbnail"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-white truncate text-[11px]" title={tpl.title}>
                          {tpl.title}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isSelected ? '✓ Aktif dipilih' : 'Klik untuk gunakan'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickStampToCurrentPage(tpl);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-[10px] text-slate-300 hover:text-white font-semibold transition"
                          title="Langsung bubuhkan ke halaman saat ini"
                        >
                          Bubuhkan
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDeleteTemplateFromDB(tpl.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition cursor-pointer"
                        title="Hapus dari IndexedDB"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 italic">
              Pilih tanda tangan, lalu klik di PDF untuk menempatkannya.
            </span>
            <button
              onClick={onOpenSignatureModal}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
            >
              Kelola Semua
            </button>
          </div>
        </div>

        {/* Placed Signatures on Document */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Tanda Tangan Ditempatkan ({signatures.length})
            </span>
          </div>

          {signatures.length === 0 ? (
            <div className="p-3 text-center rounded-xl bg-slate-950/30 border border-slate-800/60 text-slate-500 text-[11px]">
              Belum ada tanda tangan yang ditempatkan pada dokumen.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {signatures.map((sig, idx) => (
                <div
                  key={sig.id}
                  onClick={() => onJumpToPage(sig.pageNumber)}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition text-[11px]"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[9px]">
                      {idx + 1}
                    </span>
                    <span className="text-slate-300 truncate">
                      {sig.label || `TTD ${idx + 1}`} (Hal {sig.pageNumber})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteSignature(sig.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    title="Hapus dari dokumen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dual Mode Info */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>2 Mode Ekspor Tersedia:</span>
          </div>
          <div className="space-y-1.5 text-slate-400 text-[10px] leading-relaxed">
            <div>
              <strong className="text-slate-200">1. PDF Asli + TTD:</strong> Teks formulir tetap dapat diseleksi & dicopy (vektor utuh).
            </div>
            <div>
              <strong className="text-slate-200">2. Flat PDF (Gambar Solid):</strong> Seluruh halaman dirender menjadi gambar 300 DPI solid, anti-modifikasi & teks terkunci total (tidak dapat dicopy).
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
