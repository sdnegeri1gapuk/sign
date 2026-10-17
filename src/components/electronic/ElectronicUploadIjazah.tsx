import React, { useState } from 'react';
import { GraduationCap, Archive, FileText, Layers } from 'lucide-react';
import { VerifiedDocument } from '../../types';
import { ElectronicUploadIjazahBaru } from './ElectronicUploadIjazahBaru';
import { ElectronicImportLegacy } from './ElectronicImportLegacy';

interface ElectronicUploadIjazahProps {
  onDocumentImported?: (newDoc: VerifiedDocument) => void;
  onGoToSavedDocs?: () => void;
  onOpenVerification?: (token: string) => void;
}

export const ElectronicUploadIjazah: React.FC<ElectronicUploadIjazahProps> = ({
  onDocumentImported,
  onGoToSavedDocs,
  onOpenVerification
}) => {
  // Tab selector: 'baru' is prioritized and shown by default when opening "Upload Ijazah"
  const [activeTab, setActiveTab] = useState<'baru' | 'lama'>('baru');
  // Mode selector: 'single' (Dokumen Tunggal) vs 'batch' (Batch Signing)
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  return (
    <div className="space-y-3">
      {/* Ultra-compact top consolidated bar: Ijazah Baru/Lama + Dokumen Tunggal/Batch */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Main Category: Ijazah Baru vs Lama */}
          <div className="bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/80 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('baru')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition flex items-center gap-1.5 ${
                activeTab === 'baru'
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
              <span>Ijazah Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lama')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition flex items-center gap-1.5 ${
                activeTab === 'lama'
                  ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-purple-300" />
              <span>Ijazah Lama</span>
            </button>
          </div>

          {/* Sub-modes for Ijazah Baru: Dokumen Tunggal vs Batch Signing */}
          {activeTab === 'baru' && (
            <>
              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
              <div className="bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/80 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5 ${
                    mode === 'single'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs shadow-emerald-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Dokumen Tunggal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs transition flex items-center gap-1.5 ${
                    mode === 'batch'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs shadow-emerald-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-teal-300" />
                  <span>Batch Signing</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Space-saving status pill */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {activeTab === 'lama'
              ? 'Mode Ijazah Lama'
              : mode === 'single'
              ? 'Mode Satuan: Barcode Interaktif'
              : 'Mode Batch: Massal'}
          </span>
        </div>
      </div>

      {/* Render Active View */}
      {activeTab === 'baru' ? (
        <ElectronicUploadIjazahBaru
          onDocumentImported={onDocumentImported}
          onGoToSavedDocs={onGoToSavedDocs}
          onOpenVerification={onOpenVerification}
          mode={mode}
          onModeChange={setMode}
        />
      ) : (
        <ElectronicImportLegacy
          onDocumentImported={onDocumentImported}
          onGoToSavedDocs={onGoToSavedDocs}
          onOpenVerification={onOpenVerification}
        />
      )}
    </div>
  );
};
