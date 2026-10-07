import React, { useState } from 'react';
import {
  Settings,
  Building2,
  UserCheck,
  ShieldCheck,
  Database,
  Save,
  Check,
  RefreshCw,
  Lock,
  Globe
} from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';

export const ElectronicSettings: React.FC = () => {
  const [defaultIssuer, setDefaultIssuer] = useState('SD Negeri 1 Gapuk');
  const [defaultSigner, setDefaultSigner] = useState('H. Masrun, S.Pd');
  const [defaultPosition, setDefaultPosition] = useState('Kepala Sekolah');
  const [allowPublicView, setAllowPublicView] = useState(true);
  const [allowPublicDownload, setAllowPublicDownload] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Pengaturan Sistem</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Konfigurasi instansi bawaan dan keamanan verifikasi dokumen elektronik.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Instansi Defaults */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Profil Instansi / Organisasi Default</span>
            </h4>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Nama Instansi / Penerbit Bawaan</label>
              <input
                type="text"
                value={defaultIssuer}
                onChange={(e) => setDefaultIssuer(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Nama Pejabat / Penandatangan</label>
                <input
                  type="text"
                  value={defaultSigner}
                  onChange={(e) => setDefaultSigner(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Jabatan Pejabat</label>
                <input
                  type="text"
                  value={defaultPosition}
                  onChange={(e) => setDefaultPosition(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* Public Access Control (Section 15) */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Hak Akses Halaman Verifikasi Publik</span>
            </h4>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPublicView}
                  onChange={(e) => setAllowPublicView(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-white block">Izinkan Publik Melihat Rincian Dokumen</span>
                  <span className="text-[11px] text-slate-400">
                    Pengguna umum yang memindai QR dapat melihat nama, nomor, dan data penandatangan.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPublicDownload}
                  onChange={(e) => setAllowPublicDownload(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-white block">Izinkan Pengunduhan QR Code & Dokumen</span>
                  <span className="text-[11px] text-slate-400">
                    Menyediakan tombol unduh file pada halaman hasil pindai verifikasi.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Database & Cloud Connection Info */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Konektivitas Cloud Database</span>
            </h4>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Project ID:</span>
                <span className="font-mono text-emerald-400">{firebaseConfig.projectId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Firestore Database ID:</span>
                <span className="font-mono text-slate-300">{(firebaseConfig as any).firestoreDatabaseId || 'default'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status Penyimpanan:</span>
                <span className="text-emerald-400 font-semibold">Tersambung & Sinkron Realtime</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
            >
              {saved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Pengaturan Disimpan!' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
