import React, { useState } from 'react';
import { GraduationCap, QrCode, FileText, Sparkles, Archive } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Tab Switcher Header (Ijazah Baru vs Ijazah Lama) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Ijazah Baru (Prioritized / Default) */}
          <button
            type="button"
            onClick={() => setActiveTab('baru')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2.5 ${
              activeTab === 'baru'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-400/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-300" />
            <div className="text-left">
              <span className="block font-bold">Ijazah Baru (Dengan Barcode / QR)</span>
              <span className="block text-[10px] text-emerald-200/80 font-normal">
                Ekstrak Data & Tempel Barcode Baru
              </span>
            </div>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[9px] font-bold uppercase tracking-wider">
              Prioritas
            </span>
          </button>

          {/* Tab 2: Ijazah Lama (Existing Barcode) */}
          <button
            type="button"
            onClick={() => setActiveTab('lama')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2.5 ${
              activeTab === 'lama'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 ring-1 ring-purple-400/30'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-800/30'
            }`}
          >
            <Archive className="w-4 h-4 text-purple-300" />
            <div className="text-left">
              <span className="block font-bold">Ijazah Lama (Barcode Eksisting)</span>
              <span className="block text-[10px] text-purple-200/80 font-normal">
                Sudah Ada Barcode Fisik • Tanpa Tempel Baru
              </span>
            </div>
          </button>
        </div>

        {/* Tab Indicator Pill */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 px-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {activeTab === 'baru'
              ? 'Mode Ijazah Baru: Buat & Tempel Barcode Digital'
              : 'Mode Ijazah Lama: Input Tautan Barcode Eksisting'}
          </span>
        </div>
      </div>

      {/* Render Active View */}
      {activeTab === 'baru' ? (
        <ElectronicUploadIjazahBaru
          onDocumentImported={onDocumentImported}
          onGoToSavedDocs={onGoToSavedDocs}
          onOpenVerification={onOpenVerification}
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
