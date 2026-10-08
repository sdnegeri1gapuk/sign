import { PDFDocument, degrees } from 'pdf-lib';
import { pdfjsLib } from './pdfWorker';
import { SignatureItem } from '../types';

export interface ProgressCallback {
  (stepText: string, percent: number): void;
}

/**
 * Helper to get clean base filename without .pdf extension
 */
export function getBaseFileName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '');
}

/**
 * Loads an HTMLImageElement from a dataUrl
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Calculates the exact fitted drawing rectangle (equivalent to CSS object-contain)
 * so that any signature placed maintains its true natural aspect ratio inside its box,
 * perfectly matching what is displayed in the preview screen without distortion (tidak lonjong).
 */
export function getFittedSignatureBounds(
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number
) {
  if (!imageNaturalWidth || !imageNaturalHeight || !boxWidth || !boxHeight) {
    return { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
  }

  const imgRatio = imageNaturalWidth / imageNaturalHeight;
  const boxRatio = boxWidth / boxHeight;

  let drawW: number;
  let drawH: number;
  let offsetX = 0;
  let offsetY = 0;

  if (boxRatio > imgRatio) {
    // Box is wider than image aspect ratio: constrained by height
    drawH = boxHeight;
    drawW = boxHeight * imgRatio;
    offsetX = (boxWidth - drawW) / 2;
  } else {
    // Box is taller than image aspect ratio: constrained by width
    drawW = boxWidth;
    drawH = boxWidth / imgRatio;
    offsetY = (boxHeight - drawH) / 2;
  }

  return {
    x: boxX + offsetX,
    y: boxY + offsetY,
    width: drawW,
    height: drawH,
  };
}

/**
 * =======================================================================
 * MODE 1: PDF Asli + Tanda Tangan
 * =======================================================================
 * - Preserves original PDF vector streams, fonts, original text layers, metadata
 * - Embeds signature as native image object at exact PDF coordinate points
 * - Uses getFittedSignatureBounds to match object-contain aspect ratio
 * - Zero rasterization of document pages
 * - Text remains 100% selectable and copyable
 * - File naming: [NAMA_FILE_ASLI]_signed.pdf
 */
export async function exportOriginalWithSignature(
  originalPdfBytes: Uint8Array,
  signatures: SignatureItem[],
  onProgress: ProgressCallback
): Promise<{ bytes: Uint8Array; fileName: string }> {
  onProgress('Mempersiapkan PDF...', 10);
  await new Promise((r) => setTimeout(r, 120));

  // Load existing PDF document without altering existing contents
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Cache embedded signature images to avoid duplicate embedding
  const embeddedImageCache = new Map<string, any>();

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    onProgress(`Memproses halaman ${pageNum} dari ${totalPages}...`, 10 + Math.floor((i / totalPages) * 75));

    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Find all signatures assigned to this specific page
    const pageSignatures = signatures.filter((s) => s.pageNumber === pageNum);

    for (const sig of pageSignatures) {
      let embeddedImage = embeddedImageCache.get(sig.dataUrl);
      if (!embeddedImage) {
        if (sig.dataUrl.startsWith('data:image/jpeg') || sig.dataUrl.startsWith('data:image/jpg')) {
          embeddedImage = await pdfDoc.embedJpg(sig.dataUrl);
        } else {
          embeddedImage = await pdfDoc.embedPng(sig.dataUrl);
        }
        embeddedImageCache.set(sig.dataUrl, embeddedImage);
      }

      // Calculate fitted signature bounds matching CSS object-contain in preview
      const imgNaturalW = embeddedImage.width;
      const imgNaturalH = embeddedImage.height;
      const fit = getFittedSignatureBounds(
        sig.x,
        sig.y,
        sig.width,
        sig.height,
        imgNaturalW,
        imgNaturalH
      );

      // Convert coordinate system:
      // Visual Editor: (0,0) is TOP-LEFT, y increases downwards
      // PDF-Lib / PDF standard: (0,0) is BOTTOM-LEFT, y increases upwards
      const pdfX = fit.x;
      const pdfY = pageHeight - (fit.y + fit.height);
      const pdfW = fit.width;
      const pdfH = fit.height;

      if (sig.rotation && sig.rotation !== 0) {
        // When rotated, draw with center rotation
        const rad = (sig.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Calculate center point in PDF coordinates
        const centerX = pdfX + pdfW / 2;
        const centerY = pdfY + pdfH / 2;

        // Origin of drawing before rotation is bottom-left relative to center
        const drawX = centerX - (pdfW / 2) * cos + (pdfH / 2) * sin;
        const drawY = centerY - (pdfW / 2) * sin - (pdfH / 2) * cos;

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: pdfW,
          height: pdfH,
          rotate: degrees(-sig.rotation), // pdf-lib rotates counter-clockwise
        });
      } else {
        page.drawImage(embeddedImage, {
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
        });
      }
    }

    // Small yield for smooth UI animation
    await new Promise((r) => setTimeout(r, 60));
  }

  onProgress('Menyelesaikan PDF...', 90);
  await new Promise((r) => setTimeout(r, 150));

  const finalBytes = await pdfDoc.save();

  onProgress('✓ PDF berhasil dibuat', 100);

  return {
    bytes: finalBytes,
    fileName: `_signed.pdf`,
  };
}

/**
 * =======================================================================
 * MODE 2: PDF Gambar / Flattened (flatpdf)
 * =======================================================================
 * - Renders each page to high-res raster image at minimum 300 DPI
 * - Merges signature image permanently into the page canvas raster
 * - Builds a completely brand-new PDF with ONE FLATTENED IMAGE PER PAGE
 * - Text layer is 100% destroyed / absent (non-selectable, non-copyable)
 * - Signatures preserve exact aspect ratio (tidak lonjong)
 * - File naming: [NAMA_FILE_ASLI]_flattened_signed.pdf
 */
export async function exportFlattenedPdf(
  originalPdfBytes: Uint8Array,
  signatures: SignatureItem[],
  onProgress: ProgressCallback
): Promise<{ bytes: Uint8Array; fileName: string }> {
  onProgress('Mempersiapkan perenderan gambar PDF...', 5);
  await new Promise((r) => setTimeout(r, 80));

  // Minimum 300 DPI rendering scale
  // Standard PDF 72 DPI -> 300 / 72 ≈ 4.1666667
  const DPI_SCALE = 300 / 72;

  // Load via PDF.js with system fonts enabled
  const loadingTask = pdfjsLib.getDocument({
    data: originalPdfBytes.slice(0),
    useSystemFonts: true
  });
  const pdfJsDoc = await loadingTask.promise;
  const totalPages = pdfJsDoc.numPages;

  // Create a brand new blank PDFDocument for the flattened output
  const newPdfDoc = await PDFDocument.create();

  // Pre-load signature HTML images
  const loadedSignatureImages = new Map<string, HTMLImageElement>();
  for (const sig of signatures) {
    if (!loadedSignatureImages.has(sig.dataUrl)) {
      try {
        const img = await loadImage(sig.dataUrl);
        loadedSignatureImages.set(sig.dataUrl, img);
      } catch (err) {
        console.error('Failed to preload signature image', err);
      }
    }
  }

  for (let i = 1; i <= totalPages; i++) {
    onProgress(`Merender halaman ${i} dari ${totalPages} menjadi gambar...`, 10 + Math.floor(((i - 1) / totalPages) * 80));

    const page = await pdfJsDoc.getPage(i);
    const originalViewport = page.getViewport({ scale: 1.0 });
    const originalWidth = originalViewport.width;
    const originalHeight = originalViewport.height;

    // Viewport at 300 DPI
    const highResViewport = page.getViewport({ scale: DPI_SCALE });

    // Offscreen canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(highResViewport.width);
    canvas.height = Math.round(highResViewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Gagal menginisialisasi canvas untuk rasterisasi PDF.');
    }

    // Fill clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Render PDF page to canvas (convert all text/vectors to pure pixels)
    const renderContext = {
      canvasContext: ctx,
      viewport: highResViewport,
      canvas: canvas,
    };
    await page.render(renderContext).promise;

    // 2. Composite all signatures for this page directly onto the canvas pixels
    const pageSignatures = signatures.filter((s) => s.pageNumber === i);
    const scaleRatio = canvas.width / originalWidth;

    for (const sig of pageSignatures) {
      const img = loadedSignatureImages.get(sig.dataUrl);
      if (!img) continue;

      const imgNaturalW = img.naturalWidth || img.width;
      const imgNaturalH = img.naturalHeight || img.height;
      const fit = getFittedSignatureBounds(
        sig.x,
        sig.y,
        sig.width,
        sig.height,
        imgNaturalW,
        imgNaturalH
      );

      const sigCanvasX = fit.x * scaleRatio;
      const sigCanvasY = fit.y * scaleRatio;
      const sigCanvasW = fit.width * scaleRatio;
      const sigCanvasH = fit.height * scaleRatio;

      ctx.save();
      if (sig.rotation && sig.rotation !== 0) {
        const cx = sigCanvasX + sigCanvasW / 2;
        const cy = sigCanvasY + sigCanvasH / 2;
        ctx.translate(cx, cy);
        ctx.rotate((sig.rotation * Math.PI) / 180);
        ctx.drawImage(img, -sigCanvasW / 2, -sigCanvasH / 2, sigCanvasW, sigCanvasH);
      } else {
        ctx.drawImage(img, sigCanvasX, sigCanvasY, sigCanvasW, sigCanvasH);
      }
      ctx.restore();
    }

    // 3. Convert flattened canvas to JPEG at high quality (0.92)
    // Entire page is now 100% a single flat raster image, text cannot be selected or copied
    const flattenedJpgDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // 4. Embed into brand new PDF as single image page
    const embeddedPageImage = await newPdfDoc.embedJpg(flattenedJpgDataUrl);
    const newPage = newPdfDoc.addPage([originalWidth, originalHeight]);

    newPage.drawImage(embeddedPageImage, {
      x: 0,
      y: 0,
      width: originalWidth,
      height: originalHeight,
    });

    await new Promise((r) => setTimeout(r, 60));
  }

  onProgress('Menyelesaikan berkas PDF gambar final...', 95);
  await new Promise((r) => setTimeout(r, 150));

  const finalBytes = await newPdfDoc.save();

  onProgress('✓ PDF Gambar (Flattened) berhasil dibuat', 100);

  return {
    bytes: finalBytes,
    fileName: `_flattened_signed.pdf`,
  };
}

/**
 * Downloads generated Uint8Array file to user's computer
 */
export function triggerFileDownload(bytes: Uint8Array, fileName: string): string {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return url;
}
