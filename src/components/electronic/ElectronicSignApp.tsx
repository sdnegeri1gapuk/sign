import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  ShieldCheck,
  Settings,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { VerifiedDocument, ElectronicSubMenu } from '../../types';
import {
  getAllVerifiedDocuments,
  subscribeToVerifiedDocuments
} from '../../utils/electronicService';
import { ElectronicDashboard } from './ElectronicDashboard';
import { ElectronicCreateDoc } from './ElectronicCreateDoc';
import { ElectronicSavedDocs } from './ElectronicSavedDocs';
import { ElectronicPublicVerify } from './ElectronicPublicVerify';
import { ElectronicSettings } from './ElectronicSettings';

interface ElectronicSignAppProps {
  onOpenVerificationPage: (token: string) => void;
}

export const ElectronicSignApp: React.FC<ElectronicSignAppProps> = ({
  onOpenVerificationPage
}) => {
  const [activeSubMenu, setActiveSubMenu] = useState<ElectronicSubMenu>('dashboard');
  const [documents, setDocuments] = useState<VerifiedDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load and subscribe in real-time to verified documents
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      setLoading(true);
      try {
        const list = await getAllVerifiedDocuments();
        if (isMounted) setDocuments(list);
      } catch (e) {
        console.error('Failed to load electronic documents', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();

    const unsub = subscribeToVerifiedDocuments((updatedList) => {
      if (isMounted) {
        setDocuments(updatedList);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const handleDocumentCreated = (newDoc: VerifiedDocument) => {
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.verificationToken !== newDoc.verificationToken)]);
  };

  return (
    <div className="space-y-6">
      {/* Sub Header Navigation Bar (Section 2) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Dashboard */}
          <button
            onClick={() => setActiveSubMenu('dashboard')}
            className={`px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubMenu === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* Buat Dokumen */}
          <button
            onClick={() => setActiveSubMenu('create')}
            className={`px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubMenu === 'create'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            <span>Buat Dokumen</span>
          </button>

          {/* Dokumen Tersimpan */}
          <button
            onClick={() => setActiveSubMenu('saved')}
            className={`px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubMenu === 'saved'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Dokumen Tersimpan</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-400 font-mono">
              {documents.length}
            </span>
          </button>

          {/* Verifikasi */}
          <button
            onClick={() => setActiveSubMenu('verify')}
            className={`px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubMenu === 'verify'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verifikasi</span>
          </button>

          {/* Pengaturan */}
          <button
            onClick={() => setActiveSubMenu('settings')}
            className={`px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubMenu === 'settings'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan</span>
          </button>
        </div>

        {/* Live sync badge */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 px-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Cloud Database Aktif</span>
        </div>
      </div>

      {/* Main Subpage Render */}
      <div>
        {activeSubMenu === 'dashboard' && (
          <ElectronicDashboard
            documents={documents}
            onNavigateSubMenu={setActiveSubMenu}
            onOpenVerification={onOpenVerificationPage}
          />
        )}

        {activeSubMenu === 'create' && (
          <ElectronicCreateDoc
            onDocumentCreated={handleDocumentCreated}
            onGoToSavedDocs={() => setActiveSubMenu('saved')}
            onOpenVerification={onOpenVerificationPage}
          />
        )}

        {activeSubMenu === 'saved' && (
          <ElectronicSavedDocs
            documents={documents}
            onRefresh={async () => {
              const list = await getAllVerifiedDocuments();
              setDocuments(list);
            }}
            onOpenVerification={onOpenVerificationPage}
            onCreateNewDoc={() => setActiveSubMenu('create')}
          />
        )}

        {activeSubMenu === 'verify' && (
          <div className="max-w-3xl mx-auto">
            <ElectronicPublicVerify />
          </div>
        )}

        {activeSubMenu === 'settings' && <ElectronicSettings />}
      </div>
    </div>
  );
};
