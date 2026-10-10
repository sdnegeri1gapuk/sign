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
 * Helper to convert Base64 Data URL to Uint8Array bytes
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
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
 * In-memory cache for signature natural dimensions and ratios
 */
const signatureDimensionCache = new Map<string, { width: number; height: number; ratio: number }>();

/**
 * Loads an HTMLImageElement safely from a dataUrl or URL.
 * Never sets crossOrigin on data: or blob: URLs to prevent browser canvas security taint.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const w = img.naturalWidth || img.width || 140;
      const h = img.naturalHeight || img.height || 60;
      signatureDimensionCache.set(src, { width: w, height: h, ratio: w / h });
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Gets cached natural dimensions of a signature image
 */
export function getCachedSignatureDimensions(dataUrl: string): { width: number; height: number; ratio: number } | null {
  return signatureDimensionCache.get(dataUrl) || null;
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

  // If the box already matches the image ratio closely (within 1.5%), keep exact box dimensions
  if (Math.abs(boxRatio - imgRatio) < 0.015) {
    return { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
  }

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
 * MODE 1: PDF Asli + Tanda Tangan (Vector & Selectable Text)
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
  await new Promise((r) => setTimeout(r, 80));

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
    const { width: mediaWidth, height: mediaHeight } = page.getSize();
    const pageRotation = page.getRotation().angle || 0;

    // Visual dimensions as viewed on screen (PDF.js automatically accounts for rotation)
    let visualWidth = mediaWidth;
    let visualHeight = mediaHeight;
    if (pageRotation === 90 || pageRotation === 270) {
      visualWidth = mediaHeight;
      visualHeight = mediaWidth;
    }

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

      // Coordinate transformation based on PDF page rotation
      let pdfX: number;
      let pdfY: number;
      let pdfW: number = fit.width;
      let pdfH: number = fit.height;
      let extraRotation = 0;

      if (pageRotation === 0) {
        // Standard unrotated page: Visual (0,0) is TOP-LEFT -> PDF (0,0) is BOTTOM-LEFT
        pdfX = fit.x;
        pdfY = visualHeight - (fit.y + fit.height);
      } else if (pageRotation === 90) {
        // Page rotated 90° clockwise in PDF viewer
        pdfX = fit.y;
        pdfY = fit.x;
        extraRotation = 90;
      } else if (pageRotation === 180) {
        pdfX = visualWidth - (fit.x + fit.width);
        pdfY = fit.y;
        extraRotation = 180;
      } else if (pageRotation === 270) {
        pdfX = visualHeight - (fit.y + fit.height);
        pdfY = visualWidth - (fit.x + fit.width);
        extraRotation = 270;
      } else {
        pdfX = fit.x;
        pdfY = visualHeight - (fit.y + fit.height);
      }

      const userRotation = sig.rotation || 0;
      const netRotation = (userRotation + extraRotation) % 360;

      if (netRotation !== 0) {
        // When rotated, draw with center rotation
        // In pdf-lib, counter-clockwise is positive, so clockwise user rotation is negative
        const pdfLibAngle = -netRotation;
        const rad = (pdfLibAngle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Center point in PDF coordinates
        const centerX = pdfX + pdfW / 2;
        const centerY = pdfY + pdfH / 2;

        // Position of origin before rotation so that center stays at (centerX, centerY)
        const drawX = centerX - (pdfW / 2) * cos + (pdfH / 2) * sin;
        const drawY = centerY - (pdfW / 2) * sin - (pdfH / 2) * cos;

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: pdfW,
          height: pdfH,
          rotate: degrees(pdfLibAngle),
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

    await new Promise((r) => setTimeout(r, 40));
  }

  onProgress('Menyelesaikan PDF...', 90);
  await new Promise((r) => setTimeout(r, 100));

  const finalBytes = await pdfDoc.save();

  onProgress('✓ PDF berhasil dibuat', 100);

  return {
    bytes: finalBytes,
    fileName: `_signed.pdf`,
  };
}

/**
 * =======================================================================
 * MODE 2: Flat PDF / PDF Gambar Solid (Terkunci & Anti-Copy)
 * =======================================================================
 * - Renders each page into high-resolution 300 DPI canvas
 * - Composites signatures permanently onto the image canvas at pixel-perfect scale
 * - Converts each page 100% into a single flat solid raster image
 * - Builds a brand new PDF with NO text stream / layer (anti-copy, text cannot be selected)
 * - Signatures preserve exact aspect ratio (tidak lonjong, 100% sama dengan preview)
 * - File naming: [NAMA_FILE_ASLI]_flatpdf_signed.pdf
 */
export async function exportFlattenedPdf(
  originalPdfBytes: Uint8Array,
  signatures: SignatureItem[],
  onProgress: ProgressCallback
): Promise<{ bytes: Uint8Array; fileName: string }> {
  onProgress('Mempersiapkan perenderan Flat PDF (Gambar Solid 300 DPI)...', 5);
  await new Promise((r) => setTimeout(r, 60));

  // Minimum 300 DPI rendering scale
  // Standard PDF 72 DPI -> 300 / 72 ≈ 4.1666667
  const DPI_SCALE = 300 / 72;

  // Load via PDF.js with system fonts enabled
  const loadingTask = pdfjsLib.getDocument({
    data: originalPdfBytes.slice(0),
    useSystemFonts: true,
  });
  const pdfJsDoc = await loadingTask.promise;
  const totalPages = pdfJsDoc.numPages;

  // Create a brand new blank PDFDocument for the flattened output
  const newPdfDoc = await PDFDocument.create();

  // Pre-load signature HTML images safely without crossOrigin taint
  const loadedSignatureImages = new Map<string, HTMLImageElement>();
  for (const sig of signatures) {
    if (!loadedSignatureImages.has(sig.dataUrl)) {
      try {
        const img = await loadImage(sig.dataUrl);
        loadedSignatureImages.set(sig.dataUrl, img);
      } catch (err) {
        console.error('Failed to preload signature image for flat pdf:', err);
      }
    }
  }

  for (let i = 1; i <= totalPages; i++) {
    onProgress(`Merender halaman ${i} dari ${totalPages} menjadi gambar solid (300 DPI)...`, 10 + Math.floor(((i - 1) / totalPages) * 75));

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
      throw new Error('Gagal menginisialisasi canvas untuk rasterisasi Flat PDF.');
    }

    // Fill clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Render PDF page to canvas: turns all fonts, vectors, and text into pure pixels
    const renderContext = {
      canvasContext: ctx,
      viewport: highResViewport,
      canvas: canvas,
    };
    await page.render(renderContext).promise;

    // 2. Composite all signatures for this page directly onto the canvas pixels
    const pageSignatures = signatures.filter((s) => s.pageNumber === i);
    const scaleX = canvas.width / originalWidth;
    const scaleY = canvas.height / originalHeight;

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

      const sigCanvasX = fit.x * scaleX;
      const sigCanvasY = fit.y * scaleY;
      const sigCanvasW = fit.width * scaleX;
      const sigCanvasH = fit.height * scaleY;

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

    // 3. Convert flattened canvas to JPEG at high quality (0.94)
    // Entire page is now 100% a single flat raster image, text cannot be selected or copied
    const flattenedJpgDataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const imgBytes = dataUrlToBytes(flattenedJpgDataUrl);

    // 4. Embed into brand new PDF as single image page
    const embeddedPageImage = await newPdfDoc.embedJpg(imgBytes);
    const newPage = newPdfDoc.addPage([originalWidth, originalHeight]);

    newPage.drawImage(embeddedPageImage, {
      x: 0,
      y: 0,
      width: originalWidth,
      height: originalHeight,
    });

    await new Promise((r) => setTimeout(r, 40));
  }

  onProgress('Menyusun berkas Flat PDF final...', 92);
  await new Promise((r) => setTimeout(r, 120));

  const finalBytes = await newPdfDoc.save();

  onProgress('✓ Flat PDF (Gambar Solid - Anti Copy) berhasil dibuat', 100);

  return {
    bytes: finalBytes,
    fileName: `_flatpdf_signed.pdf`,
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
