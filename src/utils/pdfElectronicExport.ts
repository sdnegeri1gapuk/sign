import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from './pdfWorker';
import { QrPlacementSettings } from '../types';

export interface ExportElectronicProgressCallback {
  (stepText: string, percent: number): void;
}

/**
 * Helper to convert Base64 Data URL to Uint8Array bytes
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates an image data URL with the QR Code and the optional label text beneath it.
 * This guarantees the label and QR are rendered as a single crisp unit with consistent typography.
 */
export async function createCompositeQrImage(
  qrDataUrl: string,
  showLabel: boolean,
  labelText = 'Scan untuk verifikasi dokumen'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const qrSize = 600;
      const labelHeight = showLabel ? 80 : 0;
      const canvas = document.createElement('canvas');
      canvas.width = qrSize;
      canvas.height = qrSize + labelHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(qrDataUrl);
        return;
      }

      // Clean white background with padding
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR image
      ctx.drawImage(img, 0, 0, qrSize, qrSize);

      if (showLabel) {
        // Draw subtitle label
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, qrSize / 2, qrSize + 32);

        // Subtext indication
        ctx.fillStyle = '#64748b';
        ctx.font = '500 18px system-ui, -apple-system, sans-serif';
        ctx.fillText('Dokumen Terverifikasi Resmi', qrSize / 2, qrSize + 60);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load QR code image'));
    img.src = qrDataUrl;
  });
}

/**
 * MODE 1: PDF Asli + QR Code Verifikasi
 * Preserves the original PDF structure, vector paths, and selectable text layers.
 * Embeds the QR Code object directly into the target page.
 */
export async function exportOriginalWithQrCode(
  originalPdfBytes: Uint8Array,
  qrDataUrl: string,
  settings: QrPlacementSettings,
  onProgress?: ExportElectronicProgressCallback
): Promise<Uint8Array> {
  onProgress?.('Mempersiapkan dokumen PDF asli...', 15);
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  const targetPageIndex = settings.pageNumber - 1;
  if (targetPageIndex < 0 || targetPageIndex >= pages.length) {
    throw new Error(`Halaman ${settings.pageNumber} tidak ditemukan.`);
  }

  const targetPage = pages[targetPageIndex];
  const { height: pageHeight } = targetPage.getSize();

  onProgress?.('Membuat grafis QR Code verifikasi...', 40);
  const compositeDataUrl = await createCompositeQrImage(
    qrDataUrl,
    settings.showLabel,
    settings.labelText
  );

  const qrImageBytes = dataUrlToBytes(compositeDataUrl);
  const embeddedImage = await pdfDoc.embedPng(qrImageBytes);

  onProgress?.('Menempatkan QR Code pada koordinat dokumen...', 70);

  // Calculate height including label ratio
  const aspectMultiplier = settings.showLabel ? 680 / 600 : 1;
  const qrRenderHeight = settings.height * aspectMultiplier;

  // Convert top-left coordinates to PDF bottom-left coordinates
  const pdfX = settings.x;
  const pdfY = pageHeight - settings.y - qrRenderHeight;

  targetPage.drawImage(embeddedImage, {
    x: pdfX,
    y: pdfY,
    width: settings.width,
    height: qrRenderHeight
  });

  onProgress?.('Menyelesaikan berkas PDF final terverifikasi...', 90);
  const finalBytes = await pdfDoc.save();
  onProgress?.('✓ PDF verifikasi elektronik berhasil dibuat', 100);

  return finalBytes;
}

/**
 * MODE 2: PDF Gambar / Flattened + QR Code
 * Renders each page into high-resolution 300 DPI canvas,
 * flattens the QR code onto the canvas, and builds a fresh PDF from flattened images.
 */
export async function exportFlattenedWithQrCode(
  originalPdfBytes: Uint8Array,
  qrDataUrl: string,
  settings: QrPlacementSettings,
  onProgress?: ExportElectronicProgressCallback
): Promise<Uint8Array> {
  onProgress?.('Memuat dokumen untuk perenderan resolusi tinggi...', 10);

  const loadingTask = pdfjsLib.getDocument({
    data: originalPdfBytes.slice(0),
    useSystemFonts: true
  });
  const pdfJsDoc = await loadingTask.promise;
  const totalPages = pdfJsDoc.numPages;

  const newPdfDoc = await PDFDocument.create();

  // Load composite QR image
  const compositeDataUrl = await createCompositeQrImage(
    qrDataUrl,
    settings.showLabel,
    settings.labelText
  );
  const qrImageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = compositeDataUrl;
  });

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pct = Math.round(15 + (pageNum / totalPages) * 75);
    onProgress?.(`Memproses & merender halaman ${pageNum} dari ${totalPages}...`, pct);

    const page = await pdfJsDoc.getPage(pageNum);
    const originalViewport = page.getViewport({ scale: 1.0 });

    // 300 DPI render scale (72 pt * 4.166 ~= 300 dpi)
    const renderScale = 300 / 72;
    const highResViewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(highResViewport.width);
    canvas.height = Math.floor(highResViewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context initialization failed');

    // White base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: ctx,
      viewport: highResViewport,
      canvas
    };
    await page.render(renderContext).promise;

    // Stamp QR if on target page
    if (pageNum === settings.pageNumber) {
      const scaleFactor = canvas.width / originalViewport.width;
      const qrCanvasX = settings.x * scaleFactor;
      const qrCanvasY = settings.y * scaleFactor;
      const qrCanvasWidth = settings.width * scaleFactor;
      const aspectMultiplier = settings.showLabel ? 680 / 600 : 1;
      const qrCanvasHeight = settings.height * aspectMultiplier * scaleFactor;

      ctx.save();
      ctx.drawImage(qrImageElement, qrCanvasX, qrCanvasY, qrCanvasWidth, qrCanvasHeight);
      ctx.restore();
    }

    // Convert high-res canvas to compressed JPEG
    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const imgBytes = dataUrlToBytes(imgDataUrl);
    const embeddedImg = await newPdfDoc.embedJpg(imgBytes);

    const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height
    });
  }

  onProgress?.('Menyusun PDF final...', 95);
  const finalBytes = await newPdfDoc.save();
  onProgress?.('✓ PDF Gambar / Flattened terverifikasi selesai', 100);

  return finalBytes;
}

/**
 * Triggers browser download for a PDF file
 */
export function triggerPdfDownload(bytes: Uint8Array, fileName: string): string {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}

/**
 * Triggers browser download for a PNG image (e.g. QR Code)
 */
export function triggerImageDownload(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
