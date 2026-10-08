import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Download,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ExportMode, SignatureItem } from '../types';
import {
  exportOriginalWithSignature,
  exportFlattenedPdf,
  getBaseFileName,
  triggerFileDownload
} from '../utils/pdfExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  originalBytes: Uint8Array;
  numPages: number;
  signatures: SignatureItem[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  fileName,
  originalBytes,
  numPages,
  signatures,
}) => {
  // Step 1: 'choose' | Step 2: 'confirm' | Step 3: 'exporting' | Step 4: 'done'
  const [step, setStep] = useState<'choose' | 'confirm' | 'exporting' | 'done'>('choose');
  const [selectedMode, setSelectedMode] = useState<ExportMode>('original');
  const [showComparisonTable, setShowComparisonTable] = useState(false);

  // Progress state
  const [progressText, setProgressText] = useState('Mempersiapkan PDF...');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadedUrl, setDownloadedUrl] = useState<string | null>(null);
  const [savedBytes, setSavedBytes] = useState<Uint8Array | null>(null);
  const [savedFileName, setSavedFileName] = useState('');

  // Reset states when modal opened
  useEffect(() => {
    if (isOpen) {
      setStep('choose');
      setSelectedMode('original'); // Requirement 19: Default pilihan "PDF Asli + Tanda Tangan"
      setProgressPercent(0);
      setProgressText('Mempersiapkan PDF...');
      setErrorMsg(null);
      setDownloadedUrl(null);
      setSavedBytes(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseName = getBaseFileName(fileName);
  const outputFileName =
    selectedMode === 'original'
      ? `${baseName}_signed.pdf`
      : `${baseName}_flattened_signed.pdf`;

  const handleStartExport = async () => {
    setStep('exporting');
    setErrorMsg(null);
    setProgressPercent(5);
    setProgressText('Mempersiapkan PDF...');

    try {
      let resultBytes: Uint8Array;
      let finalName = outputFileName;

      if (selectedMode === 'original') {
        const res = await exportOriginalWithSignature(
          originalBytes,
          signatures,
          (msg, pct) => {
            setProgressText(msg);
            setProgressPercent(pct);
          }
        );
        resultBytes = res.bytes;
      } else {
        const res = await exportFlattenedPdf(
          originalBytes,
          signatures,
          (msg, pct) => {
            setProgressText(msg);
            setProgressPercent(pct);
          }
        );
        resultBytes = res.bytes;
      }

      setSavedBytes(resultBytes);
      setSavedFileName(finalName);

      // Trigger auto download
      const objectUrl = triggerFileDownload(resultBytes, finalName);
      setDownloadedUrl(objectUrl);

      // Brief delay to showcase completion state
      setTimeout(() => {
        setStep('done');
      }, 400);
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err?.message || 'Terjadi kesalahan saat memproses ekspor PDF.');
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-semibold text-xs border border-indigo-500/30">
                PDF
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {step === 'choose' && 'PILIH FORMAT PENYIMPANAN'}
                {step === 'confirm' && 'Konfirmasi Penyimpanan'}
                {step === 'exporting' && 'Memproses Ekspor Dokumen'}
                {step === 'done' && '✓ PDF Berhasil Dibuat'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {step === 'choose' && 'Bagaimana Anda ingin menyimpan PDF ini?'}
              {step === 'confirm' && 'Periksa ringkasan dokumen sebelum diunduh ke komputer Anda.'}
              {step === 'exporting' && 'Harap tunggu, sistem sedang merender dokumen Anda...'}
              {step === 'done' && `File otomatis diunduh dengan nama: ${savedFileName}`}
            </p>
          </div>

          {step !== 'exporting' && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-700/60 rounded-xl text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Proses Gagal</p>
                <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* STEP 1: CHOOSE MODE */}
          {step === 'choose' && (
            <div className="space-y-4">
              {/* Option 1: PDF ASLI + TANDA TANGAN */}
              <div
                onClick={() => setSelectedMode('original')}
                className={`group relative p-4.5 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedMode === 'original'
                    ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="exportMode"
                      checked={selectedMode === 'original'}
                      onChange={() => setSelectedMode('original')}
                      className="w-5 h-5 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-base text-white">
                        PDF Asli + Tanda Tangan
                      </h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Rekomendasi
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">
                      Pertahankan dokumen asli. Hanya tambahkan tanda tangan. Teks tetap dapat dipilih dan di-copy.
                    </p>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Teks tetap dapat dipilih</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Teks tetap dapat di-copy</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Kualitas teks tetap asli</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Struktur PDF dipertahankan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: PDF GAMBAR / FLATTENED */}
              <div
                onClick={() => setSelectedMode('flattened')}
                className={`group relative p-4.5 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedMode === 'flattened'
                    ? 'border-amber-500 bg-amber-950/30 shadow-lg shadow-amber-500/10'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="exportMode"
                      checked={selectedMode === 'flattened'}
                      onChange={() => setSelectedMode('flattened')}
                      className="w-5 h-5 text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-base text-white">
                        PDF Gambar / Flattened
                      </h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Terkunci / 300 DPI
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">
                      Gabungkan seluruh halaman menjadi gambar. Tanda tangan dan isi dokumen menjadi bagian permanen dari gambar.
                    </p>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Tanda tangan menyatu permanen</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <X className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>Teks tidak dapat dipilih</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <X className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>Teks tidak dapat di-copy</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Tanpa layer terpisah / aman</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Comparison Table Button */}
              <button
                type="button"
                onClick={() => setShowComparisonTable(!showComparisonTable)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Lihat Tabel Perbandingan Mode Export Lengkap</span>
                </div>
                {showComparisonTable ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Section 18: Comparison Table */}
              {showComparisonTable && (
                <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/60 text-xs animate-fade-in">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/90 text-slate-200 border-b border-slate-700">
                        <th className="p-2.5 font-bold">Fitur</th>
                        <th className="p-2.5 font-bold text-indigo-300">PDF Asli + TTD</th>
                        <th className="p-2.5 font-bold text-amber-300">PDF Gambar / Flattened</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Tanda tangan terlihat</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Teks dapat dipilih</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                        <td className="p-2.5 text-rose-400 font-semibold">✗</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Teks dapat di-copy</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                        <td className="p-2.5 text-rose-400 font-semibold">✗</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Text layer asli</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                        <td className="p-2.5 text-rose-400 font-semibold">✗</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Kualitas teks asli</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                        <td className="p-2.5 text-slate-400">Tidak berupa text layer</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Tanda tangan editable</td>
                        <td className="p-2.5 text-slate-400">Tidak boleh</td>
                        <td className="p-2.5 text-rose-400 font-semibold">✗</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Annotation</td>
                        <td className="p-2.5 text-slate-400">Hindari jika memungkinkan</td>
                        <td className="p-2.5 text-rose-400 font-semibold">✗</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Halaman menjadi gambar</td>
                        <td className="p-2.5 text-slate-400">✗</td>
                        <td className="p-2.5 text-amber-400 font-semibold">✓ (300 DPI)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Ukuran file</td>
                        <td className="p-2.5 text-slate-300">Cenderung lebih kecil</td>
                        <td className="p-2.5 text-slate-300">Dapat lebih besar</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Cocok dokumen tetap editable</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                        <td className="p-2.5 text-rose-400 font-semibold">✗</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-200">Cocok dokumen final terkunci</td>
                        <td className="p-2.5 text-slate-300">Bisa</td>
                        <td className="p-2.5 text-emerald-400 font-semibold">✓</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONFIRMATION (Section 15) */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-sm">
                  <span className="text-slate-400 font-medium">Nama Dokumen Asli:</span>
                  <span className="font-semibold text-white truncate max-w-[280px]">{fileName}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-sm">
                  <span className="text-slate-400 font-medium">Mode Penyimpanan:</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                    selectedMode === 'original'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedMode === 'original'
                      ? 'PDF Asli + Tanda Tangan'
                      : 'PDF Gambar / Flattened'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-sm">
                  <span className="text-slate-400 font-medium">Jumlah Halaman:</span>
                  <span className="font-medium text-slate-200">{numPages} Halaman</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-sm">
                  <span className="text-slate-400 font-medium">Kualitas Output:</span>
                  <span className="font-medium text-slate-200">
                    {selectedMode === 'original'
                      ? 'Asli (Vektor & Text Layer Preserved)'
                      : '300 DPI (One Flattened Image Per Page)'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-sm">
                  <span className="text-slate-400 font-medium">Tanda Tangan Ditempatkan:</span>
                  <span className="font-medium text-slate-200">
                    {signatures.length > 0 ? `${signatures.length} tanda tangan` : 'Tidak ada (ekspor dokumen murni)'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-slate-400 font-medium">Nama File Unduhan:</span>
                  <span className="font-mono text-emerald-400 text-xs font-semibold bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40">
                    {outputFileName}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200/90 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  {selectedMode === 'original'
                    ? 'Mode ini mempertahankan dokumen asli secara utuh. Tanda tangan disisipkan sebagai objek gambar pada koordinat PDF. Teks dalam file tetap dapat diblok dan disalin.'
                    : 'Mode ini merasterisasi setiap halaman menjadi satu gambar solid 300 DPI. Teks dan tanda tangan menyatu permanen ke dalam gambar sehingga dokumen tidak dapat dimanipulasi.'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: EXPORTING PROGRESS (Section 22) */}
          {step === 'exporting' && (
            <div className="py-8 space-y-6 text-center">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-indigo-300">
                  {progressPercent}%
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-base font-bold text-white tracking-wide">
                  {progressText}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedMode === 'original'
                    ? 'Menyisipkan tanda tangan ke layer PDF dokumen asli...'
                    : 'Merender halaman 300 DPI dan menyatukan elemen ke gambar...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60 max-w-md mx-auto">
                <div
                  className={`h-full transition-all duration-300 ${
                    selectedMode === 'original'
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  }`}
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: DONE */}
          {step === 'done' && (
            <div className="py-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">
                  ✓ PDF Berhasil Dibuat!
                </h3>
                <p className="text-sm text-slate-300">
                  File <span className="font-mono text-emerald-400 font-semibold">{savedFileName}</span> telah otomatis diunduh ke perangkat Anda.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 text-left text-xs space-y-2 max-w-lg mx-auto">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  Cara Memverifikasi Hasil Dokumen:
                </p>
                {selectedMode === 'original' ? (
                  <p className="text-slate-300 leading-relaxed">
                    Buka file <strong className="text-white">{savedFileName}</strong> di Google Chrome, Edge, atau Adobe Acrobat. Coba blok / pilih teks formulir SKP dan tekan <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">Ctrl + C</code>. Teks tetap dapat disalin secara sempurna karena struktur vektor dipertahankan!
                  </p>
                ) : (
                  <p className="text-slate-300 leading-relaxed">
                    Buka file <strong className="text-white">{savedFileName}</strong>. Halaman telah dirender pada resolusi tajam 300 DPI, dan teks tidak dapat diblok/disalin karena seluruh elemen telah digabungkan menjadi gambar solid yang terkunci.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                {downloadedUrl && (
                  <a
                    href={downloadedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka Pratinjau di Tab Baru
                  </a>
                )}
                {savedBytes && (
                  <button
                    onClick={() => triggerFileDownload(savedBytes, savedFileName)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Ulang File
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          {step === 'choose' && (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Batal
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition hidden sm:inline-flex items-center gap-1.5"
                >
                  <span>Lihat Rincian</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleStartExport}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition hover:scale-[1.02] active:scale-[0.98] ${
                    selectedMode === 'original'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/30'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-600/30'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Simpan PDF ({selectedMode === 'original' ? 'Asli + TTD' : 'Gambar / Flattened'})
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition hover:scale-[1.02] ${
                  selectedMode === 'original'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Simpan PDF</span>
              </button>
            </>
          )}

          {step === 'exporting' && (
            <div className="w-full flex justify-center text-xs text-slate-400">
              Jangan menutup jendela ini saat dokumen sedang diproses.
            </div>
          )}

          {step === 'done' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition"
              >
                Selesai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
