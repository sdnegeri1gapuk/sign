import React from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { VerifiedDocument, ElectronicSubMenu } from '../../types';

interface ElectronicDashboardProps {
  documents: VerifiedDocument[];
  onNavigateSubMenu: (menu: ElectronicSubMenu) => void;
  onOpenVerification: (token: string) => void;
}

export const ElectronicDashboard: React.FC<ElectronicDashboardProps> = ({
  documents,
  onNavigateSubMenu,
  onOpenVerification
}) => {
  const totalDocs = documents.length;
  const validDocs = documents.filter((d) => d.status === 'VALID').length;
  const revokedDocs = documents.filter((d) => d.status === 'DICABUT').length;
  const totalScans = documents.reduce((acc, d) => acc + (d.verificationCount || 0), 0);

  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900/50 via-slate-900 to-teal-950/40 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Sistem Pengesahan Dokumen Berbasis QR Code</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verifikasi Dokumen Elektronik
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Sematkan QR Code verifikasi unik ke dalam dokumen PDF resmi instansi atau sekolah Anda. Siapa pun dapat memindai QR Code untuk memeriksa keaslian dan status keabsahan dokumen secara real-time.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateSubMenu('create')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Buat Dokumen Sekarang</span>
            </button>

            <button
              onClick={() => onNavigateSubMenu('verify')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Cek Validitas Dokumen</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Statistics Cards (Section 16) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dokumen */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Dokumen</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalDocs}</div>
          <p className="text-[11px] text-slate-500 mt-1">Dokumen terdaftar di sistem</p>
        </div>

        {/* Dokumen Valid */}
        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium">Dokumen Valid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{validDocs}</div>
          <p className="text-[11px] text-emerald-500/80 mt-1">Status aktif & terverifikasi</p>
        </div>

        {/* Dokumen Dicabut */}
        <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium">Dokumen Dicabut</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{revokedDocs}</div>
          <p className="text-[11px] text-amber-500/80 mt-1">Ditarik oleh penerbit</p>
        </div>

        {/* Total Verifikasi */}
        <div className="bg-slate-900/90 border border-teal-900/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-teal-400 mb-2">
            <span className="text-xs font-medium">Total Verifikasi</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-300 font-mono">{totalScans}</div>
          <p className="text-[11px] text-teal-400/80 mt-1">Total pemindaian QR Code</p>
        </div>
      </div>

      {/* Recent Documents Table & How it Works */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Documents */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm">Dokumen Terbaru</h3>
            <button
              onClick={() => onNavigateSubMenu('saved')}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Belum ada dokumen yang dibuat.</p>
              <button
                onClick={() => onNavigateSubMenu('create')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Buat Dokumen Pertama
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentDocs.map((doc) => (
                <div
                  key={doc.verificationToken}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white truncate">{doc.documentName}</h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {doc.documentNumber || '-'} • {doc.issuer}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'VALID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                      }`}
                    >
                      {doc.status}
                    </span>

                    <button
                      onClick={() => onOpenVerification(doc.verificationToken)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Lihat Verifikasi"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flow Explanation Card */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs">
          <h3 className="font-bold text-white text-sm">Alur Verifikasi Dokumen</h3>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Sistem bekerja dengan 4 tahapan aman:
          </p>

          <div className="space-y-2.5 pt-1">
            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                1
              </span>
              <div>
                <strong className="text-white">Upload & Isi Data:</strong>
                <p className="text-slate-400 text-[11px]">Pilih file PDF dan lengkapi data resmi.</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                2
              </span>
              <div>
                <strong className="text-white">Generate QR Code Unik:</strong>
                <p className="text-slate-400 text-[11px]">Sistem membuat token acak yang sulit ditebak.</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                3
              </span>
              <div>
                <strong className="text-white">Atur Posisi QR:</strong>
                <p className="text-slate-400 text-[11px]">Geser dan ubah ukuran QR Code langsung di PDF.</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                4
              </span>
              <div>
                <strong className="text-white">Finalisasi & Simpan:</strong>
                <p className="text-slate-400 text-[11px]">
                  PDF baru diterbitkan dan catatan tersimpan di cloud.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
