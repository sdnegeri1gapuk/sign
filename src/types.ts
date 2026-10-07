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
