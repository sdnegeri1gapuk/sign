/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  PenTool,
  ShieldCheck,
  QrCode,
  FileSignature,
  FileText,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { MainNavMenu } from './types';
import { ManualSignApp } from './components/manual/ManualSignApp';
import { ElectronicSignApp } from './components/electronic/ElectronicSignApp';
import { ElectronicPublicVerify } from './components/electronic/ElectronicPublicVerify';

export default function App() {
  const [activeMainMenu, setActiveMainMenu] = useState<MainNavMenu>('electronic');
  const [publicVerifyToken, setPublicVerifyToken] = useState<string | null>(null);

  // Check URL hash or query params on load and hashchange
  useEffect(() => {
    const handleUrlRoute = () => {
      // 1. Check Hash: e.g. #/verifikasi/8F7A92KX31
      const hash = window.location.hash;
      if (hash && hash.includes('/verifikasi/')) {
        const parts = hash.split('/verifikasi/');
        if (parts[1]) {
          const token = parts[1].split('?')[0].trim().toUpperCase();
          if (token) {
            setPublicVerifyToken(token);
            return;
          }
        }
      }

      // 2. Check Search query params: e.g. ?v=8F7A92KX31 or ?verifikasi=8F7A92KX31
      const params = new URLSearchParams(window.location.search);
      const queryToken = params.get('v') || params.get('verifikasi');
      if (queryToken && queryToken.trim()) {
        setPublicVerifyToken(queryToken.trim().toUpperCase());
        return;
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    return () => window.removeEventListener('hashchange', handleUrlRoute);
  }, []);

  // If a verification token is opened directly via URL or QR scan
  if (publicVerifyToken) {
    return (
      <ElectronicPublicVerify
        initialToken={publicVerifyToken}
        onAdminUnlock={() => {
          setPublicVerifyToken(null);
          // Clean hash without reloading
          if (window.location.hash) {
            window.history.pushState(null, '', window.location.pathname);
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* GLOBAL TOP HEADER */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-md">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-white leading-tight tracking-wide">
              VERIFIKASI DOKUMEN ELEKTRONIK
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Sistem Pengesahan & Validasi Dokumen Berbasis QR Code
            </p>
          </div>
        </div>

        {/* Center / Right: 2 Main Navigation Menus */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            {/* Menu 1: Tanda Tangan Manual */}
            <button
              onClick={() => setActiveMainMenu('manual')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
                activeMainMenu === 'manual'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Tanda Tangan Manual</span>
            </button>

            {/* Menu 2: Tanda Tangan Elektronik */}
            <button
              onClick={() => setActiveMainMenu('electronic')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
                activeMainMenu === 'electronic'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Tanda Tangan Elektronik</span>
            </button>
          </nav>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div className="flex-1 overflow-auto bg-slate-950">
        {activeMainMenu === 'manual' && <ManualSignApp />}

        {activeMainMenu === 'electronic' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <ElectronicSignApp
              onOpenVerificationPage={(token) => setPublicVerifyToken(token)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
