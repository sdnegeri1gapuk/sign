import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Copy,
  Printer,
  Ban,
  ExternalLink,
  QrCode,
  Check,
  Building2,
  Calendar,
  Hash,
  UserCheck
} from 'lucide-react';
import { VerifiedDocument, DocumentStatus } from '../../types';
import { revokeDocument } from '../../utils/electronicService';

interface ElectronicSavedDocsProps {
  documents: VerifiedDocument[];
  onRefresh?: () => void;
  onOpenVerification?: (token: string) => void;
  onCreateNewDoc?: () => void;
}

export const ElectronicSavedDocs: React.FC<ElectronicSavedDocsProps> = ({
  documents,
  onRefresh,
  onOpenVerification,
  onCreateNewDoc
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Selected document for Detail Modal
  const [selectedDoc, setSelectedDoc] = useState<VerifiedDocument | null>(null);

  // Revoke Modal state
  const [revokingDoc, setRevokingDoc] = useState<VerifiedDocument | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('Dokumen ditarik oleh instansi penerbit');
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        doc.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.verificationToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.issuer.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'all') return matchSearch;
      return matchSearch && doc.status === statusFilter;
    });
  }, [documents, searchTerm, statusFilter]);

  const handleCopyLink = (doc: VerifiedDocument) => {
    const url = doc.verificationUrl || window.location.origin + window.location.pathname + '#/verifikasi/' + doc.verificationToken;
    navigator.clipboard.writeText(url);
    setCopiedToken(doc.verificationToken);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleConfirmRevoke = async () => {
    if (!revokingDoc) return;
    setIsRevoking(true);
    try {
      await revokeDocument(revokingDoc.verificationToken, revokeReason);
      setRevokingDoc(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert('Gagal mencabut dokumen: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsRevoking(false);
    }
  };

  const handlePrint = (doc: VerifiedDocument) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Dokumen Tersimpan</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola seluruh dokumen resmi yang telah diverifikasi dengan QR Code elektronik.
            </p>
          </div>

          {onCreateNewDoc && (
            <button
              onClick={onCreateNewDoc}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <FileText className="w-4 h-4" />
              <span>Buat Dokumen Baru</span>
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Search Box */}
          <div className="sm:col-span-8 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama dokumen, nomor dokumen, atau ID verifikasi..."
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-400 transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
            >
              <option value="all">Semua Status ({documents.length})</option>
              <option value="VALID">
                Hanya VALID ({documents.filter((d) => d.status === 'VALID').length})
              </option>
              <option value="DICABUT">
                Hanya DICABUT ({documents.filter((d) => d.status === 'DICABUT').length})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">No</th>
                <th className="py-3 px-4 font-semibold">Nama Dokumen</th>
                <th className="py-3 px-4 font-semibold">Nomor</th>
                <th className="py-3 px-4 font-semibold">Jenis</th>
                <th className="py-3 px-4 font-semibold">Tanggal</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-sm">Tidak ada dokumen ditemukan</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {searchTerm ? 'Coba ubah kata kunci pencarian Anda' : 'Belum ada dokumen yang difinalisasi'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, idx) => (
                  <tr key={doc.verificationToken} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>

                    <td className="py-3.5 px-4 font-medium text-white max-w-[200px]">
                      <div className="truncate font-semibold">{doc.documentName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{doc.issuer}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-emerald-300 text-[11px]">
                      {doc.documentNumber || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">{doc.documentType || '-'}</td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {doc.documentDate || '-'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {doc.status === 'VALID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          <CheckCircle2 className="w-3 h-3" />
                          VALID
                        </span>
                      )}
                      {doc.status === 'DICABUT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                          <AlertTriangle className="w-3 h-3" />
                          DICABUT
                        </span>
                      )}
                      {doc.status === 'TIDAK VALID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/40">
                          <XCircle className="w-3 h-3" />
                          TIDAK VALID
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Lihat Detail */}
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Lihat Detail & QR"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Buka Halaman Verifikasi */}
                        <button
                          onClick={() => onOpenVerification && onOpenVerification(doc.verificationToken)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-400 transition"
                          title="Buka Halaman Verifikasi Publik"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Salin Tautan */}
                        <button
                          onClick={() => handleCopyLink(doc)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Salin Link Verifikasi"
                        >
                          {copiedToken === doc.verificationToken ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Cetak */}
                        <button
                          onClick={() => handlePrint(doc)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition hidden md:inline-flex"
                          title="Cetak Dokumen"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Cabut Dokumen */}
                        {doc.status === 'VALID' && (
                          <button
                            onClick={() => setRevokingDoc(doc)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition"
                            title="Cabut Status Validitas Dokumen"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-base">Detail Dokumen Terverifikasi</h4>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* QR Code graphic */}
            <div className="text-center p-4 bg-white rounded-2xl shadow-inner max-w-[200px] mx-auto text-slate-900">
              <img
                src={selectedDoc.qrDataUrl}
                alt="QR Code"
                className="w-36 h-36 mx-auto object-contain"
              />
              <p className="font-mono text-xs font-bold mt-1">{selectedDoc.verificationToken}</p>
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-400">Nama Dokumen:</span>
                <span className="font-semibold text-white">{selectedDoc.documentName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-400">Nomor Dokumen:</span>
                <span className="font-mono text-emerald-300">{selectedDoc.documentNumber || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-400">Instansi Penerbit:</span>
                <span className="text-white">{selectedDoc.issuer}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-400">Penandatangan:</span>
                <span className="text-emerald-300 font-medium">{selectedDoc.signerName} ({selectedDoc.signerPosition})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-400">Status Saat Ini:</span>
                <span className={selectedDoc.status === 'VALID' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {selectedDoc.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Jumlah Verifikasi:</span>
                <span className="text-white font-bold">{selectedDoc.verificationCount || 0}x Dipindai</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  if (onOpenVerification) onOpenVerification(selectedDoc.verificationToken);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Verifikasi Publik</span>
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE CONFIRMATION MODAL (Section 18) */}
      {revokingDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-lg font-bold text-white">Cabut Status Dokumen?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Dokumen: <strong className="text-white">{revokingDoc.documentName}</strong> ({revokingDoc.verificationToken})
              </p>
              <p className="text-xs text-amber-300/80 mt-2 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40">
                Setelah dicabut, siapa pun yang memindai QR Code akan melihat status <strong>DICABUT</strong>. Catatan verifikasi tidak akan dihapus demi audit trail resmi.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-medium">Alasan Pencabutan:</label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Contoh: Dokumen ditarik karena revisi nomor dinas"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                disabled={isRevoking}
                onClick={() => setRevokingDoc(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                disabled={isRevoking}
                onClick={handleConfirmRevoke}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {isRevoking ? 'Memproses...' : 'Ya, Cabut Dokumen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
