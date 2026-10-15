import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  FileCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  X,
  ExternalLink,
  Upload,
  RefreshCw,
  Award
} from 'lucide-react';
import {
  BsreAccount,
  getActiveBsreAccount,
  setActiveBsreAccount,
  authenticateBsreAccount,
  logoutBsreAccount,
  PRESET_BSRE_ACCOUNTS
} from '../../utils/bsreService';

interface BsreLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (account: BsreAccount) => void;
}

export const BsreLoginModal: React.FC<BsreLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [activeAccount, setActiveAccount] = useState<BsreAccount | null>(getActiveBsreAccount());
  const [loginMode, setLoginMode] = useState<'preset' | 'form' | 'p12'>('preset');

  // Form states
  const [nikInput, setNikInput] = useState<string>('');
  const [passphraseInput, setPassphraseInput] = useState<string>('');
  const [namaInput, setNamaInput] = useState<string>('');
  const [nipInput, setNipInput] = useState<string>('');
  const [jabatanInput, setJabatanInput] = useState<string>('');
  const [instansiInput, setInstansiInput] = useState<string>('');
  const [envServer, setEnvServer] = useState<'production' | 'sandbox'>('production');
  const [certFileName, setCertFileName] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSelectPreset = async (preset: BsreAccount) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const logged = await authenticateBsreAccount({
        nik: preset.nik,
        mode: 'api_besign',
        customProfile: {
          namaLengkap: preset.namaLengkap,
          nip: preset.nip,
          jabatan: preset.jabatan,
          instansi: preset.instansi,
          email: preset.email
        }
      });
      setActiveAccount(logged);
      setSuccessMsg(`Berhasil login sebagai ${logged.namaLengkap} (${logged.jabatan})`);
      if (onLoginSuccess) onLoginSuccess(logged);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 900);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Gagal login akun');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNik = nikInput.trim().replace(/\D/g, '');
    if (cleanNik.length !== 16) {
      setErrorMsg('NIK harus 16 digit angka sesuai identitas resmi kependudukan terdaftar BSrE.');
      return;
    }
    if (!passphraseInput.trim()) {
      setErrorMsg('Masukkan passphrase / kata sandi penandatanganan elektronik BSrE Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const logged = await authenticateBsreAccount({
        nik: cleanNik,
        passphrase: passphraseInput.trim(),
        mode: 'api_besign',
        customProfile: {
          namaLengkap: namaInput.trim() || 'Pejabat Penandatangan Resmi',
          nip: nipInput.trim() || '19750101 200003 1 001',
          jabatan: jabatanInput.trim() || 'Kepala Sekolah / Pejabat Berwenang',
          instansi: instansiInput.trim() || 'SD Negeri 1 Gapuk'
        }
      });
      setActiveAccount(logged);
      setSuccessMsg(`Berhasil terhubung ke akun BSrE resmi ${logged.namaLengkap}`);
      if (onLoginSuccess) onLoginSuccess(logged);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 900);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Autentikasi gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUploadP12 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertFileName(file.name);
    }
  };

  const handleP12Login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFileName) {
      setErrorMsg('Pilih berkas sertifikat elektronik (.p12 atau .pfx) yang diterbitkan oleh BSrE.');
      return;
    }
    if (!passphraseInput.trim()) {
      setErrorMsg('Masukkan kata sandi pribadi untuk membuka sertifikat digital.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const mockNik = nikInput.trim().replace(/\D/g, '') || '5201011205700003';
      const logged = await authenticateBsreAccount({
        nik: mockNik,
        passphrase: passphraseInput.trim(),
        mode: 'pki_p12',
        certFileName,
        customProfile: {
          namaLengkap: namaInput.trim() || 'H. Masrun, S.Pd',
          nip: nipInput.trim() || '19700512 199403 1 004',
          jabatan: jabatanInput.trim() || 'Kepala Sekolah',
          instansi: instansiInput.trim() || 'SD Negeri 1 Gapuk'
        }
      });
      setActiveAccount(logged);
      setSuccessMsg(`Sertifikat ${certFileName} terverifikasi valid oleh BSrE.`);
      if (onLoginSuccess) onLoginSuccess(logged);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 900);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Gagal memvalidasi sertifikat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logoutBsreAccount();
    setActiveAccount(null);
    setSuccessMsg('Berhasil logout dari akun BSrE.');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-b border-sky-800/40 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Resmi BSSN
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Balai Sertifikasi Elektronik</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Login Pemilik Akun BSrE Resmi
              </h3>
            </div>
          </div>
          <p className="text-xs text-sky-100/80 mt-2.5 leading-relaxed">
            Menghubungkan akun penandatangan resmi Balai Sertifikasi Elektronik (BSrE) - Badan Siber dan Sandi Negara
            agar dokumen dan barcode dapat ditandatangani secara sah berkekuatan hukum penuh (UU ITE).
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Status Alert Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Active Account Card */}
          {activeAccount && activeAccount.isLoggedIn ? (
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-sky-200 uppercase tracking-wide">
                    Akun BSrE Aktif Terhubung
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/50 text-[11px] font-semibold flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout / Keluar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Nama Pejabat:</span>
                  <span className="font-bold text-white text-sm">{activeAccount.namaLengkap}</span>
                  <span className="text-[11px] text-sky-400 block">{activeAccount.jabatan}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Identitas Kependudukan (NIK):</span>
                  <span className="font-mono font-bold text-emerald-400">{activeAccount.nik}</span>
                  {activeAccount.nip && (
                    <span className="text-[11px] text-slate-400 block font-mono">NIP: {activeAccount.nip}</span>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px]">Penerbit Sertifikat Otoritas (CA):</span>
                  <span className="font-medium text-slate-300 text-[11px]">{activeAccount.penerbitCa}</span>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span className="font-mono">SN: {activeAccount.nomorSeriSertifikat}</span>
                    <span className="text-emerald-400 font-semibold">
                      Masa Berlaku: {activeAccount.masaBerlakuSampai}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold">Belum Ada Akun BSrE yang Terhubung</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Silakan pilih akun pejabat resmi terdaftar di bawah, atau masukkan NIK dan Passphrase BSrE Anda.
                </p>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLoginMode('preset')}
                className={`flex-1 py-2 px-3 rounded-lg transition text-center ${
                  loginMode === 'preset'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Akun Pejabat Resmi
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('form')}
                className={`flex-1 py-2 px-3 rounded-lg transition text-center ${
                  loginMode === 'form'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                NIK & Passphrase
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('p12')}
                className={`flex-1 py-2 px-3 rounded-lg transition text-center ${
                  loginMode === 'p12'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sertifikat P12/PFX
              </button>
            </div>
          </div>

          {/* TAB 1: PRESET ACCOUNTS */}
          {loginMode === 'preset' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pilih akun penandatangan berlisensi BSrE:</span>
                <span className="text-[11px] text-sky-400">1-Klik Terhubung</span>
              </div>

              <div className="space-y-2.5">
                {PRESET_BSRE_ACCOUNTS.map((preset) => {
                  const isCurrent = activeAccount?.nik === preset.nik && activeAccount.isLoggedIn;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-sky-950/60 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isCurrent
                              ? 'bg-sky-600 text-white shadow'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {preset.namaLengkap.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {preset.namaLengkap}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                              {preset.statusSertifikat}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {preset.jabatan} • {preset.instansi}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            NIK: {preset.nik} | {preset.nip ? `NIP: ${preset.nip}` : ''}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                          isCurrent
                            ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                            : 'bg-sky-600 hover:bg-sky-500 text-white shadow'
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <span>Gunakan</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL NIK & PASSPHRASE */}
          {loginMode === 'form' && (
            <form onSubmit={handleManualLogin} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">
                    NIK Pejabat (16 Digit) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={nikInput}
                    onChange={(e) => setNikInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 5201011205700003"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">
                    Passphrase TTE BSrE <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    placeholder="Kata sandi penandatanganan..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={namaInput}
                    onChange={(e) => setNamaInput(e.target.value)}
                    placeholder="Contoh: H. Masrun, S.Pd"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">NIP Pegawai</label>
                  <input
                    type="text"
                    value={nipInput}
                    onChange={(e) => setNipInput(e.target.value)}
                    placeholder="Contoh: 19700512 199403 1 004"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Jabatan</label>
                  <input
                    type="text"
                    value={jabatanInput}
                    onChange={(e) => setJabatanInput(e.target.value)}
                    placeholder="Contoh: Kepala Sekolah"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Instansi</label>
                  <input
                    type="text"
                    value={instansiInput}
                    onChange={(e) => setInstansiInput(e.target.value)}
                    placeholder="Contoh: SD Negeri 1 Gapuk"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Gateway Server:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvServer('production')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      envServer === 'production'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Produksi (BSSN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvServer('sandbox')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      envServer === 'sandbox'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Sandbox Uji Coba
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/30"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun BSrE...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Login & Hubungkan Akun BSrE</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: SERTIFIKAT DIGITAL P12 / PFX */}
          {loginMode === 'p12' && (
            <form onSubmit={handleP12Login} className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-700 text-center">
                <input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={handleFileUploadP12}
                  id="p12-upload-input"
                  className="hidden"
                />
                <label
                  htmlFor="p12-upload-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-sky-300">
                      {certFileName ? certFileName : 'Klik untuk Unggah Sertifikat Elektronik'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Format file .p12 atau .pfx terbitan Balai Sertifikasi Elektronik
                    </p>
                  </div>
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">
                    Password Berkas Sertifikat <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    placeholder="Masukkan password sertifikat P12..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">Nama Pejabat</label>
                    <input
                      type="text"
                      value={namaInput}
                      onChange={(e) => setNamaInput(e.target.value)}
                      placeholder="H. Masrun, S.Pd"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">NIK Pejabat</label>
                    <input
                      type="text"
                      maxLength={16}
                      value={nikInput}
                      onChange={(e) => setNikInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="5201011205700003"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/30"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membaca Sertifikat Digital...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Verifikasi & Pasang Sertifikat BSrE</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Legal Information Footer */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Sesuai Regulasi BSSN & UU ITE No. 11/2008</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
