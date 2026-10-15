export type ExportMode = 'original' | 'flattened';

export interface SignatureItem {
  id: string;
  pageNumber: number; // 1-indexed
  x: number; // PDF points from page top-left
  y: number; // PDF points from page top-left
  width: number; // PDF points
  height: number; // PDF points
  rotation: number; // degrees
  dataUrl: string; // PNG base64
  label?: string;
  signeeName?: string;
}

export interface DocumentMeta {
  fileName: string;
  numPages: number;
  originalBytes: Uint8Array;
  pageDimensions: { width: number; height: number }[];
}

export interface ExportProgress {
  message: string;
  percent: number;
  isDone: boolean;
  downloadUrl?: string;
  finalFileName?: string;
}

export interface SignatureTemplate {
  id: string;
  dataUrl: string;
  title: string;
  createdAt: number;
  type?: 'draw' | 'type' | 'upload';
  fileSize?: number;
}

// -------------------------------------------------------------
// Electronic Document Verification Types (Verifikasi Dokumen Elektronik)
// -------------------------------------------------------------

export type DocumentStatus = 'VALID' | 'DICABUT' | 'TIDAK VALID';

export interface BsreSignatureInfo {
  isSignedWithBsre: boolean;
  bsreAccountOwner: string; // Nama Lengkap Pejabat Pemilik Akun BSrE
  signerNik: string; // NIK 16-digit terdaftar resmi di BSrE BSSN
  signerNip?: string; // NIP Pegawai
  signerPosition: string; // Jabatan Pejabat
  signerInstansi: string; // Instansi / Lembaga
  issuerCa: string; // Balai Sertifikasi Elektronik (BSrE) - Badan Siber dan Sandi Negara (BSSN)
  certificateSerialNumber: string; // Nomor Seri Sertifikat X.509
  validFrom: string; // Tanggal Terbit Sertifikat
  validUntil: string; // Tanggal Kedaluwarsa Sertifikat
  signatureTimestamp: number; // Unix Epoch timestamp penandatanganan
  documentHashSha256: string; // SHA-256 Digest berkas PDF
  signatureSealId: string; // ID Segel Digital BSrE
  tsaTimestamp?: string; // TSA Token
  integrityStatus: 'VALID_UNMODIFIED' | 'TAMPERED';
  signatureMode: 'api_besign' | 'pki_p12' | 'verified_account' | 'simulasi_resmi';
}

export interface VerifiedDocument {
  documentId: string;
  verificationToken: string;
  documentName: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  issuer: string;
  signerName: string;
  signerPosition: string;
  description?: string;
  originalFileName: string;
  finalFileName: string;
  qrPage: number;
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
  showLabel?: boolean;
  labelText?: string;
  status: DocumentStatus;
  verificationCount: number;
  createdAt: number;
  updatedAt?: number;
  allowView?: boolean;
  allowDownload?: boolean;
  revokedAt?: number | null;
  revokedReason?: string;
  qrDataUrl?: string;
  verificationUrl?: string;
  googleDriveUrl?: string;
  legacyBarcodeUrl?: string; // Link hasil scan barcode lama
  isLegacyDocument?: boolean; // Penanda dokumen impor ijazah/arsip lama
  bsreSignature?: BsreSignatureInfo; // Metadata Tanda Tangan Elektronik Resmi BSrE BSSN
}

export interface VerificationLog {
  id: string;
  verificationToken: string;
  documentId: string;
  timestamp: number;
  userAgent?: string;
}

export interface ElectronicDocFormData {
  documentName: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  issuer: string;
  signerName: string;
  signerPosition: string;
  description: string;
}

export interface QrPlacementSettings {
  pageNumber: number;
  x: number; // in PDF points
  y: number; // in PDF points
  width: number; // in PDF points (square)
  height: number; // in PDF points
  showLabel: boolean;
  labelText: string;
}

export type MainNavMenu = 'manual' | 'electronic';
export type ElectronicSubMenu = 'dashboard' | 'create' | 'upload_ijazah' | 'import_legacy' | 'saved' | 'verify' | 'settings';
