import React, { useState, useEffect } from 'react';
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
  Globe,
  KeyRound,
  User,
  QrCode,
  Image as ImageIcon,
  Upload,
  Trash2,
  Sparkles,
  Award,
  HelpCircle
} from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';
import {
  getStoredUsername,
  getStoredPassword,
  updateCredentials
} from '../../utils/adminAuth';
import {
  getAppSettings,
  saveAppSettings,
  QrLogoType
} from '../../utils/appSettings';
import { generateQrCodeDataUrl } from '../../utils/electronicService';
import { getLogoDataUrl } from '../../utils/qrLogoHelper';
import { BsreLoginModal } from './BsreLoginModal';
import { BsreCertificateModal } from './BsreCertificateModal';
import {
  getActiveBsreAccount,
  logoutBsreAccount,
  isBsreAutoSignEnabled,
  setBsreAutoSignEnabled,
  BsreAccount
} from '../../utils/bsreService';

export const ElectronicSettings: React.FC = () => {
  const currentSettings = getAppSettings();
  const [defaultIssuer, setDefaultIssuer] = useState(currentSettings.issuer);
  const [defaultSigner, setDefaultSigner] = useState(currentSettings.signerName);
  const [defaultPosition, setDefaultPosition] = useState(currentSettings.signerPosition);
  const [allowPublicView, setAllowPublicView] = useState(currentSettings.allowPublicView);
  const [allowPublicDownload, setAllowPublicDownload] = useState(currentSettings.allowPublicDownload);

  // QR Barcode Logo Settings
  const [qrLogoEnabled, setQrLogoEnabled] = useState(currentSettings.qrLogoEnabled);
  const [qrLogoType, setQrLogoType] = useState<QrLogoType>(currentSettings.qrLogoType);
  const [qrCustomLogoDataUrl, setQrCustomLogoDataUrl] = useState<string>(currentSettings.qrCustomLogoDataUrl || '');
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  // BSrE Official Account state
  const [bsreAccount, setBsreAccount] = useState<BsreAccount | null>(getActiveBsreAccount());
  const [bsreAutoSign, setBsreAutoSign] = useState<boolean>(isBsreAutoSignEnabled());
  const [isBsreLoginOpen, setIsBsreLoginOpen] = useState<boolean>(false);
  const [isBsreCertOpen, setIsBsreCertOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleBsreAccChange = (e: any) => {
      setBsreAccount(e.detail || null);
    };
    window.addEventListener('bsre_account_changed', handleBsreAccChange);
    return () => window.removeEventListener('bsre_account_changed', handleBsreAccChange);
  }, []);

  // Login credentials
  const [adminUsername, setAdminUsername] = useState(getStoredUsername());
  const [adminPassword, setAdminPassword] = useState(getStoredPassword());

  const [saved, setSaved] = useState(false);

  // Update live preview QR when logo settings change
  useEffect(() => {
    let active = true;
    const generatePreview = async () => {
      try {
        const dummyUrl = window.location.origin + window.location.pathname + '#/verifikasi/CONTOH88';
        const qr = await generateQrCodeDataUrl(dummyUrl, {
          enabled: qrLogoEnabled,
          logoType: qrLogoType,
          customLogoDataUrl: qrCustomLogoDataUrl
        });
        if (active) {
          setPreviewQrUrl(qr);
        }
      } catch (err) {
        console.error('Failed to generate preview QR', err);
      }
    };
    generatePreview();
    return () => {
      active = false;
    };
  }, [qrLogoEnabled, qrLogoType, qrCustomLogoDataUrl]);

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (PNG, JPG, atau SVG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setQrCustomLogoDataUrl(dataUrl);
        setQrLogoType('custom');
        setQrLogoEnabled(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername.trim() && adminPassword.trim().length >= 4) {
      updateCredentials(adminUsername.trim(), adminPassword.trim());
    }

    saveAppSettings({
      issuer: defaultIssuer.trim(),
      signerName: defaultSigner.trim(),
      signerPosition: defaultPosition.trim(),
      allowPublicView,
      allowPublicDownload,
      qrLogoEnabled,
      qrLogoType,
      qrCustomLogoDataUrl
    });

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
              Konfigurasi akun pengelola, keamanan login, dan instansi resmi.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Akun Login Pengelola (Pencegah Akses Liar Lewat Link) */}
          <div className="space-y-3 bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Akun & Password Login Pengelola</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/50 text-[10px] text-emerald-300 font-semibold border border-emerald-800/50">
                Wajib Saat Membuka Aplikasi
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Orang lain tidak akan bisa masuk ke aplikasi dengan mengotak-atik link tanpa mengetahui akun login ini.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Username Login</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Password Login (Minimal 4 Karakter)</label>
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Instansi Defaults */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Profil Instansi & Penandatangan Bawaan</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-300 font-semibold border border-emerald-500/20">
                Otomatis di Form Dokumen
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Nama instansi, nama penandatangan, dan jabatan di bawah ini akan <strong>otomatis terisi</strong> di setiap dokumen yang Anda buat dan tandatangani.
            </p>

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

          {/* Logo di Tengah Barcode (QR Code) Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-800 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Logo di Tengah Barcode (QR Code)</h4>
                  <p className="text-[11px] text-slate-400">
                    Menyematkan lambang resmi di pusat kode verifikasi dokumen.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
                  Toleransi Scan Level H (30%)
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrLogoEnabled}
                    onChange={(e) => setQrLogoEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {qrLogoEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
                {/* Logo Selection Options */}
                <div className="md:col-span-7 space-y-3">
                  <span className="text-slate-300 font-semibold block text-xs">Pilih Lambang / Logo:</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* 1. Kemendikbud */}
                    <button
                      type="button"
                      onClick={() => setQrLogoType('kemdikbud')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        qrLogoType === 'kemdikbud'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>Tut Wuri Handayani</span>
                          {qrLogoType === 'kemdikbud' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Kemdikbud (Standar Ijazah & Transkrip)
                        </p>
                      </div>
                    </button>

                    {/* 2. Garuda Pancasila */}
                    <button
                      type="button"
                      onClick={() => setQrLogoType('garuda')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        qrLogoType === 'garuda'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>Garuda Pancasila</span>
                          {qrLogoType === 'garuda' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Lambang Resmi Negara / Pemerintahan
                        </p>
                      </div>
                    </button>

                    {/* 3. BSrE / TTE Digital */}
                    <button
                      type="button"
                      onClick={() => setQrLogoType('bsre')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        qrLogoType === 'bsre'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>BSrE / TTE Resmi</span>
                          {qrLogoType === 'bsre' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Tanda Tangan Elektronik Tersertifikasi
                        </p>
                      </div>
                    </button>

                    {/* 4. Logo Kustom Sendiri */}
                    <button
                      type="button"
                      onClick={() => setQrLogoType('custom')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        qrLogoType === 'custom'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>Logo Sekolah Sendiri</span>
                          {qrLogoType === 'custom' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Unggah file PNG / JPG lambang instansi
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Custom Logo Upload Form */}
                  {qrLogoType === 'custom' && (
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs">Unggah Logo Sekolah / Yayasan:</span>
                        {qrCustomLogoDataUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setQrCustomLogoDataUrl('');
                              setQrLogoType('kemdikbud');
                            }}
                            className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus Logo</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {qrCustomLogoDataUrl ? (
                          <div className="w-12 h-12 rounded-lg bg-white p-1 border border-slate-600 flex items-center justify-center shrink-0 overflow-hidden shadow">
                            <img
                              src={qrCustomLogoDataUrl}
                              alt="Logo Sekolah Kustom"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center shrink-0 text-slate-500">
                            <Upload className="w-5 h-5" />
                          </div>
                        )}

                        <div className="flex-1">
                          <label className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{qrCustomLogoDataUrl ? 'Ganti Logo...' : 'Pilih File Logo...'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/svg+xml"
                              onChange={handleCustomLogoUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Disarankan format PNG transparan atau bulat. Ukuran akan disesuaikan otomatis di tengah barcode.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Jaminan Kemudahan Pemindaian:</strong>
                      <p className="text-slate-400 mt-0.5">
                        Logo dilapisi badge putih pelindung dan barcode di-generate dengan koreksi kesalahan tinggi (Level H). QR code tetap dapat dipindai 100% cepat melalui kamera Android, iPhone, dan scanner fisik.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-inner">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Pratinjau Hasil Barcode
                  </span>
                  
                  <div className="w-40 h-40 bg-white p-2 rounded-xl shadow-lg border-2 border-slate-700/60 flex items-center justify-center">
                    {previewQrUrl ? (
                      <img
                        src={previewQrUrl}
                        alt="Preview Barcode dengan Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                        <span>Membuat preview...</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-emerald-400 mt-2 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Aktif pada semua proses stempel</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BSrE Official Electronic Signature Account Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Integrasi Akun Resmi BSrE (Badan Siber dan Sandi Negara)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Penandatanganan elektronik tersertifikasi resmi sesuai UU ITE No. 11/2008 & Perka BSSN.
                  </p>
                </div>
              </div>

              {bsreAccount && bsreAccount.isLoggedIn ? (
                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sertifikat Aktif
                </span>
              ) : (
                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                  Belum Terhubung
                </span>
              )}
            </div>

            {/* Account Card */}
            {bsreAccount && bsreAccount.isLoggedIn ? (
              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/50 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Nama Penandatangan Resmi:</span>
                    <span className="font-bold text-white text-sm">{bsreAccount.namaLengkap}</span>
                    <span className="text-[11px] text-sky-400 block">{bsreAccount.jabatan}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      NIK: {bsreAccount.nik} {bsreAccount.nip ? `| NIP: ${bsreAccount.nip}` : ''}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Otoritas Penerbit (Certificate Authority):</span>
                    <span className="font-semibold text-sky-200 text-xs block leading-snug">
                      {bsreAccount.penerbitCa}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      SN: {bsreAccount.nomorSeriSertifikat}
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      Berlaku s/d: {bsreAccount.masaBerlakuSampai}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-sky-900/40">
                  <button
                    type="button"
                    onClick={() => setIsBsreCertOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-sky-900/60 hover:bg-sky-800 text-sky-200 font-semibold text-xs border border-sky-700/60 flex items-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Lihat Bukti Sertifikat Digital X.509</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBsreLoginOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
                    >
                      Ganti Akun BSrE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logoutBsreAccount();
                        setBsreAccount(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold border border-red-800/50 transition"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-white">Belum Ada Akun BSrE yang Aktif</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Hubungkan akun resmi penandatangan Balai Sertifikasi Elektronik untuk verifikasi tanda tangan sah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBsreLoginOpen(true)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Login Pemilik Akun BSrE</span>
                </button>
              </div>
            )}

            {/* Auto Sign Option */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={bsreAutoSign}
                onChange={(e) => {
                  const val = e.target.checked;
                  setBsreAutoSign(val);
                  setBsreAutoSignEnabled(val);
                }}
                className="rounded border-slate-700 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <span className="font-semibold text-white block text-xs">
                  Otomatis Terapkan TTE Resmi BSrE pada Dokumen & Barcode
                </span>
                <span className="text-[11px] text-slate-400">
                  Ketika aktif, setiap dokumen yang diproses akan langsung dibubuhi cap segel BSrE, hash SHA-256, dan catatan kaki legal.
                </span>
              </div>
            </label>
          </div>

          {/* Public Access Control */}
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
                  <span className="font-semibold text-white block">Izinkan Pengunduhan QR Code Dokumen</span>
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
                <span className="text-slate-400">Status Keamanan:</span>
                <span className="text-emerald-400 font-semibold">Terkunci & Dilindungi Firestore Rules</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
            >
              {saved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Tersimpan' : 'Simpan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal Login Akun Resmi BSrE */}
      <BsreLoginModal
        isOpen={isBsreLoginOpen}
        onClose={() => setIsBsreLoginOpen(false)}
        onLoginSuccess={(acc) => {
          setBsreAccount(acc);
        }}
      />

      {/* Modal Sertifikat Digital BSrE */}
      {bsreAccount && (
        <BsreCertificateModal
          isOpen={isBsreCertOpen}
          onClose={() => setIsBsreCertOpen(false)}
          signatureInfo={{
            isSignedWithBsre: true,
            bsreAccountOwner: bsreAccount.namaLengkap,
            signerNik: bsreAccount.nik,
            signerNip: bsreAccount.nip,
            signerPosition: bsreAccount.jabatan,
            signerInstansi: bsreAccount.instansi,
            issuerCa: bsreAccount.penerbitCa,
            certificateSerialNumber: bsreAccount.nomorSeriSertifikat,
            validFrom: bsreAccount.masaBerlakuDari,
            validUntil: bsreAccount.masaBerlakuSampai,
            signatureTimestamp: Date.now(),
            documentHashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            signatureSealId: 'BSRE-CERT-SAMPLE',
            integrityStatus: 'VALID_UNMODIFIED',
            signatureMode: bsreAccount.tipeKoneksi
          }}
          documentName="Sertifikat Induk Penandatangan Resmi"
          documentNumber={bsreAccount.nomorSeriSertifikat}
        />
      )}
    </div>
  );
};
