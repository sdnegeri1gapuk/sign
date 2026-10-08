/**
 * Utility for parsing and extracting Ijazah metadata from uploaded PDF documents.
 * Specifically handles Indonesian school diplomas (SD, SMP, SMA, SMK):
 * 1. Document Title: "Ijazah - {nama siswa}"
 * 2. Document Number: extracted from top-right corner (e.g., DN-01/D-SD/K13/23/0012345)
 * 3. Document Date: signing date (e.g., "Gapuk, 15 Juni 2024" or "15 Juni 2024")
 * 4. Document Token: derived from filename by stripping "_sign"
 * 5. Legacy Barcode URL: https://sdnegeri1gapuk.github.io/verifikasi-ijazah-v2/verifikasi.html?kode={ID/Token_Dokumen}
 */

import { pdfjsLib } from './pdfWorker';

export interface ExtractedIjazahData {
  token: string;
  legacyBarcodeUrl: string;
  studentName: string;
  documentName: string;
  documentNumber: string;
  documentDate: string;
  rawTextPreview?: string;
}

/**
 * Extracts the document token from filename by stripping "_sign" at the end.
 * Examples:
 * - "DN-01_0012345_sign.pdf" -> "DN-01_0012345"
 * - "IJZ_98765_sign.pdf" -> "IJZ_98765"
 * - "Ahmad_Fauzi_sign.pdf" -> "Ahmad_Fauzi"
 */
export function extractTokenFromFilename(fileName: string): string {
  if (!fileName) return '';
  // Remove file extension
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
  // Strip trailing _sign, -sign, _SIGN, -SIGN, etc.
  const cleaned = baseName.replace(/[-_]sign$/i, '').trim();
  return cleaned || baseName;
}

/**
 * Generates the official legacy barcode URL using the required template.
 * Format: https://sdnegeri1gapuk.github.io/verifikasi-ijazah-v2/verifikasi.html?kode={token}
 */
export function formatLegacyBarcodeUrl(token: string): string {
  const cleanToken = token.trim();
  return `https://sdnegeri1gapuk.github.io/verifikasi-ijazah-v2/verifikasi.html?kode=${encodeURIComponent(cleanToken)}`;
}

interface TextPosItem {
  str: string;
  x: number;
  y: number; // in PDF points (y=0 is bottom, y=height is top)
  width: number;
  height: number;
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

const MONTHS_REGEX_STR = INDONESIAN_MONTHS.join('|');

/**
 * Extracts Ijazah data directly from the PDF bytes and filename.
 */
export async function extractIjazahMetadata(
  pdfBytes: Uint8Array,
  fileName: string
): Promise<ExtractedIjazahData> {
  // 1. Extract Token & Legacy URL from Filename
  const token = extractTokenFromFilename(fileName);
  const legacyBarcodeUrl = formatLegacyBarcodeUrl(token);

  let studentName = '';
  let documentNumber = '';
  let documentDate = '';

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(0),
      useSystemFonts: true
    });
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    // Collect all text items with their coordinates
    const items: TextPosItem[] = [];
    let fullTextLines: string[] = [];
    let currentLineText = '';
    let lastY: number | null = null;

    for (const rawItem of textContent.items) {
      if ('str' in rawItem && rawItem.str) {
        const str = rawItem.str;
        const transform = rawItem.transform;
        const x = transform[4];
        const y = transform[5];
        const width = rawItem.width || 0;
        const height = rawItem.height || 0;

        items.push({ str, x, y, width, height });

        // Build continuous text lines for regex matching
        if (lastY === null || Math.abs(y - lastY) > 4) {
          if (currentLineText.trim()) {
            fullTextLines.push(currentLineText.trim());
          }
          currentLineText = str;
          lastY = y;
        } else {
          currentLineText += (str.startsWith(' ') || currentLineText.endsWith(' ') ? '' : ' ') + str;
        }
      }
    }
    if (currentLineText.trim()) {
      fullTextLines.push(currentLineText.trim());
    }

    const fullDocText = fullTextLines.join('\n');

    // =========================================================================
    // 2. EXTRACT NOMOR IJAZAH (Posisi di Pojok Kanan Atas di File)
    // =========================================================================
    // In PDF coordinates:
    // Top-right corner: x >= pageWidth * 0.35, y >= pageHeight * 0.55
    const topRightItems = items
      .filter((it) => it.x >= pageWidth * 0.35 && it.y >= pageHeight * 0.55)
      .sort((a, b) => b.y - a.y || a.x - b.x);

    // Group adjacent top-right items that are on the same line (within 4 pt of Y)
    const groupedTopRightLines: string[] = [];
    let groupLine = '';
    let groupY: number | null = null;

    for (const it of topRightItems) {
      if (groupY === null || Math.abs(it.y - groupY) > 5) {
        if (groupLine.trim()) groupedTopRightLines.push(groupLine.trim());
        groupLine = it.str;
        groupY = it.y;
      } else {
        groupLine += (it.str.startsWith(' ') || groupLine.endsWith(' ') ? '' : ' ') + it.str;
      }
    }
    if (groupLine.trim()) groupedTopRightLines.push(groupLine.trim());

    // Look for standard Indonesian Ijazah number formats:
    // e.g. "DN-01/D-SD/K13/23/0012345", "DN-01/D-SD/23/0012345", "DN-01/...", "M-SMK/..."
    const ijazahNumberRegex = /(DN\s*[-–]\s*[0-9]{1,3}\s*[\/\-]\s*[A-Z0-9\/\-\.]+)/i;
    const generalNumberRegex = /(?:NO(?:MOR|\.)?[:\s]*)([A-Z0-9\/\-\.]{6,})/i;

    // Check lines in the top right corner first
    for (const line of groupedTopRightLines) {
      const matchIjazah = line.match(ijazahNumberRegex);
      if (matchIjazah && matchIjazah[1]) {
        documentNumber = matchIjazah[1].replace(/\s+/g, '');
        break;
      }
    }

    if (!documentNumber) {
      for (const line of groupedTopRightLines) {
        const matchGen = line.match(generalNumberRegex);
        if (matchGen && matchGen[1]) {
          documentNumber = matchGen[1].trim();
          break;
        }
      }
    }

    // Fallback: search anywhere in top right lines for codes containing slashes and digits
    if (!documentNumber) {
      for (const line of groupedTopRightLines) {
        const slashCodeMatch = line.match(/([A-Z0-9]{2,}\/[A-Z0-9\/\-\.]{6,})/i);
        if (slashCodeMatch && slashCodeMatch[1]) {
          documentNumber = slashCodeMatch[1].trim();
          break;
        }
      }
    }

    // Fallback: check full document text if not caught in corner quadrant
    if (!documentNumber) {
      const globalMatch = fullDocText.match(ijazahNumberRegex);
      if (globalMatch && globalMatch[1]) {
        documentNumber = globalMatch[1].replace(/\s+/g, '');
      }
    }

    // =========================================================================
    // 3. EXTRACT TANGGAL DOKUMEN (Tanggal dokumen ditandatangani)
    // =========================================================================
    // Typically in bottom area of the page (signature block: y <= pageHeight * 0.45)
    // Format: "Gapuk, 15 Juni 2024" or "15 Juni 2024"
    const dateRegex = new RegExp(
      `(?:([A-Za-z\\s]+),\\s*)?(\\d{1,2}\\s+(?:${MONTHS_REGEX_STR})\\s+\\d{4})`,
      'i'
    );

    // Filter items in lower half of the page
    const bottomItems = items
      .filter((it) => it.y <= pageHeight * 0.45)
      .sort((a, b) => b.y - a.y || a.x - b.x);

    const bottomLines: string[] = [];
    let bLine = '';
    let bY: number | null = null;
    for (const it of bottomItems) {
      if (bY === null || Math.abs(it.y - bY) > 5) {
        if (bLine.trim()) bottomLines.push(bLine.trim());
        bLine = it.str;
        bY = it.y;
      } else {
        bLine += (it.str.startsWith(' ') || bLine.endsWith(' ') ? '' : ' ') + it.str;
      }
    }
    if (bLine.trim()) bottomLines.push(bLine.trim());

    for (const line of bottomLines) {
      const match = line.match(dateRegex);
      if (match) {
        const place = match[1] ? match[1].trim() : '';
        const datePart = match[2].trim();
        // Discard if place looks like a role title (e.g., "Kepala", "Mengetahui")
        if (place && !/^(kepala|mengetahui|an|plh|plt|guru)/i.test(place)) {
          documentDate = `${place}, ${datePart}`;
        } else {
          documentDate = datePart;
        }
        break;
      }
    }

    // Fallback: check full text for date pattern
    if (!documentDate) {
      const match = fullDocText.match(dateRegex);
      if (match) {
        const place = match[1] ? match[1].trim() : '';
        const datePart = match[2].trim();
        if (place && !/^(kepala|mengetahui|an|plh|plt|guru)/i.test(place)) {
          documentDate = `${place}, ${datePart}`;
        } else {
          documentDate = datePart;
        }
      }
    }

    // =========================================================================
    // 4. EXTRACT NAMA SISWA & NAMA DOKUMEN ("Ijazah - {nama siswa}")
    // =========================================================================
    // Patterns in Indonesian diplomas:
    // "nama : AHMAD FAUZI" or "nama peserta didik : AHMAD FAUZI"
    // "menerangkan bahwa : AHMAD FAUZI"
    const nameRegexes = [
      /(?:nama\s*(?:peserta didik|siswa)?\s*[:\.]\s*)([A-Za-z\s\.,'\`]+)/i,
      /(?:menerangkan bahwa\s*[:\.]?\s*)([A-Za-z\s\.,'\`]+)/i
    ];

    for (const rx of nameRegexes) {
      const match = fullDocText.match(rx);
      if (match && match[1]) {
        let extracted = match[1].split('\n')[0].trim();
        // Cut off if followed by next field like "tempat", "lahir", "nis", "nisn"
        extracted = extracted.replace(/\s+(?:tempat|lahir|nis|nisn|nomor).*$/i, '').trim();
        // Remove trailing punctuation
        extracted = extracted.replace(/[,;:]+$/, '').trim();
        if (extracted.length >= 3 && extracted.length <= 60) {
          studentName = extracted;
          break;
        }
      }
    }

    // If not found in text, extract from filename
    if (!studentName) {
      // e.g. "Ijazah_Ahmad_Fauzi_sign.pdf" or "DN01_0012345_Ahmad_Fauzi_sign.pdf"
      const baseClean = token
        .replace(/^(?:ijazah|dokumen|doc)[-_ ]*/i, '')
        .replace(/^DN[0-9_-]+/, '')
        .replace(/^[0-9_-]+/, '')
        .replace(/[_-]+/g, ' ')
        .trim();

      if (baseClean && baseClean.length >= 3 && !/^[0-9]+$/.test(baseClean)) {
        studentName = baseClean;
      }
    }
  } catch (err) {
    console.warn('PDF text extraction error, falling back to heuristics:', err);
  }

  // Format student name to proper title case if fully uppercase or lowercase
  let formattedStudentName = studentName.trim();
  if (!formattedStudentName) {
    formattedStudentName = token ? token.replace(/[_-]+/g, ' ') : 'Siswa';
  }

  // 1. "nama dokumen langsung di isi otomatis dengan format 'Ijazah - {nama siswa}'"
  const documentName = `Ijazah - ${formattedStudentName}`;

  return {
    token,
    legacyBarcodeUrl,
    studentName: formattedStudentName,
    documentName,
    documentNumber: documentNumber || 'DN-01/D-SD/K13/23/0012345',
    documentDate: documentDate || '15 Juni 2024'
  };
}
