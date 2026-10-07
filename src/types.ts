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
export type ElectronicSubMenu = 'dashboard' | 'create' | 'saved' | 'verify' | 'settings';
