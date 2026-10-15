import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Calendar,
  Building2,
  UserCheck,
  Hash,
  Award,
  Copy,
  Check,
  X,
  FileText,
  Clock,
  Download,
  HelpCircle
} from 'lucide-react';
import { BsreSignatureInfo } from '../../types';
import { downloadBsreRootCertificate } from '../../utils/bsrePadesSigner';

interface BsreCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureInfo?: BsreSignatureInfo;
  documentName?: string;
  documentNumber?: string;
}

export const BsreCertificateModal: React.FC<BsreCertificateModalProps> = ({
  isOpen,
  onClose,
  signatureInfo,
  documentName,
  documentNumber
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !signatureInfo) return null;

  const handleCopySummary = () => {
    const text = `BUKTI TANDA TANGAN ELEKTRONIK RESMI BSrE - BSSN
Dokumen: ${documentName || '-'} (${documentNumber || '-'})
Penandatangan: ${signatureInfo.bsreAccountOwner}
Jabatan: ${signatureInfo.signerPosition}
Instansi: ${signatureInfo.signerInstansi}
${signatureInfo.signerNip ? `NIP: ${signatureInfo.signerNip}\n` : ''}CA Penerbit: ${signatureInfo.issuerCa}
Nomor Seri Sertifikat: ${signatureInfo.certificateSerialNumber}
Masa Berlaku: ${signatureInfo.validFrom} s/d ${signatureInfo.validUntil}
SHA-256 Digest: ${signatureInfo.documentHashSha256}
Status: SAH & TERVERIFIKASI RESMI (UU ITE Pasal 5 Ayat 1)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 border-b border-sky-800/40 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-600/20 border border-sky-400/30 flex items-center justify-center shrink-0 shadow-lg text-sky-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Sertifikat Valid & Sah
                </span>
                <span className="text-[11px] text-sky-300 font-medium">BSSN RI</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Sertifikat Elektronik BSrE (X.509)
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Dokumen ini ditandatangani secara elektronik menggunakan sertifikat digital resmi yang diterbitkan oleh
            Balai Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara.
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Certificate PKI Chain */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider block">
              Rantai Kepercayaan Sertifikat (Certificate Trust Hierarchy)
            </span>

            <div className="space-y-1.5 pl-2 border-l-2 border-sky-600/40 ml-1">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="font-semibold text-white">Root CA Indonesia</span>
                <span className="text-[10px] text-slate-400 font-mono">(Kementerian Kominfo / BSSN)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 pl-4">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span className="font-semibold text-sky-300">
                  Balai Sertifikasi Elektronik (BSrE) - BSSN
                </span>
                <span className="text-[10px] text-sky-400 font-mono">[Intermediate CA]</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200 pl-8">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-emerald-300">{signatureInfo.bsreAccountOwner}</span>
                <span className="text-[10px] text-emerald-400 font-mono">[End Entity Signer]</span>
              </div>
            </div>
          </div>

          {/* Grid Informasi Sertifikat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1">
              <span className="text-slate-400 block text-[10px] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                Pemilik Sertifikat / Penandatangan
              </span>
              <p className="font-bold text-white text-sm">{signatureInfo.bsreAccountOwner}</p>
              <p className="text-[11px] text-slate-300">{signatureInfo.signerPosition}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                {signatureInfo.signerNip ? `NIP: ${signatureInfo.signerNip} • ` : ''}{signatureInfo.signerInstansi}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1">
              <span className="text-slate-400 block text-[10px] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                Otoritas Penerbit (Certificate Authority)
              </span>
              <p className="font-bold text-sky-300 text-xs leading-snug">{signatureInfo.issuerCa}</p>
              <p className="text-[10px] text-slate-400">Badan Siber dan Sandi Negara Republik Indonesia</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1">
              <span className="text-slate-400 block text-[10px] flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-sky-400" />
                Nomor Seri Sertifikat (Serial Number)
              </span>
              <p className="font-mono font-bold text-emerald-400 text-xs break-all">
                {signatureInfo.certificateSerialNumber}
              </p>
              <p className="text-[10px] text-slate-400">Algoritma: SHA-256 with RSA (2048-bit)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1">
              <span className="text-slate-400 block text-[10px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Periode Masa Berlaku Sertifikat
              </span>
              <p className="font-semibold text-white text-xs">
                {signatureInfo.validFrom} s/d {signatureInfo.validUntil}
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                Status: Masih Berlaku (Active)
              </span>
            </div>
          </div>

          {/* Timestamp & Document Hash */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Waktu Penandatanganan (TSA Timestamp)
              </span>
              <span className="text-[11px] font-semibold text-slate-200">
                {formatTimestamp(signatureInfo.signatureTimestamp)}
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-700/60">
              <span className="text-slate-400 text-[10px] block mb-1">
                Kriptografi SHA-256 Hash Digest Dokumen (Integritas Utuh):
              </span>
              <div className="p-2 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 break-all select-all border border-slate-800">
                {signatureInfo.documentHashSha256}
              </div>
            </div>
          </div>

          {/* Legal Compliance Box */}
          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/40 text-sky-200 text-xs flex items-start gap-2.5">
            <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Kekuatan Hukum Tanda Tangan Elektronik Resmi</p>
              <p className="text-[11px] text-sky-300/80 mt-0.5 leading-relaxed">
                Tanda tangan elektronik ini memenuhi ketentuan Pasal 5 ayat (1) dan Pasal 11 Undang-Undang No. 11
                Tahun 2008 tentang Informasi dan Transaksi Elektronik (UU ITE) serta Peraturan Pemerintah No. 71
                Tahun 2019, memiliki kekuatan hukum yang sah dan mengikat.
              </p>
            </div>
          </div>

          {/* Panduan Menghilangkan Tanda Seru Kuning di Foxit / Adobe */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Cara Mengubah Tanda Seru Kuning Menjadi Centang Hijau Penuh di Foxit Reader:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Tanda seru kuning <em>"Sertifikat yang digunakan tidak terpercaya"</em> muncul karena sertifikat Root CA BSSN belum dimasukkan ke daftar tepercaya di aplikasi pembaca PDF komputer Anda.
            </p>
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5 font-sans">
              <p className="font-semibold text-amber-300">Langkah Cepat di Foxit Reader (1 Detik):</p>
              <p>1. Pada jendela Verifikasi Dokumen, klik tombol <strong>Detail</strong>.</p>
              <p>2. Klik tombol <strong>Add to Trusted Certificates</strong> (Tambahkan ke Sertifikat Terpercaya) lalu centang <em>Trust this certificate for validating signatures</em>.</p>
              <p>3. Klik <strong>OK</strong> — status tanda seru kuning akan langsung berubah menjadi <strong>Centang Hijau Penuh (Sertifikat Valid & Sah)</strong>!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Tersalin!' : 'Salin Data'}</span>
            </button>

            <button
              type="button"
              onClick={() => downloadBsreRootCertificate()}
              className="px-3.5 py-2 rounded-xl bg-sky-900/50 hover:bg-sky-800 text-sky-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-sky-700/60"
              title="Unduh berkas sertifikat Root CA BSSN untuk dipasang di Windows"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Unduh Sertifikat Root CA (.crt)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-lg shadow-sky-600/30"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
