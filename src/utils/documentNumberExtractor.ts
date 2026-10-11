import { pdfjsLib } from './pdfWorker';

/**
 * Extracts official document/letter number (Nomor Surat) from PDF.
 * Specifically looks for text following words like "Nomor:", "NOMOR :", "No.:", etc.
 * Examples found in official Indonesian school/government correspondence:
 * - "Nomor: 421.2/089/DISDIK/X/2026"
 * - "Nomor : 400.3.11.3/035/SDN1GPK/VI/2026"
 * - "NOMOR: 800/123/SD/2026"
 * - "No. : 421.1/045/DP/2026"
 * - "Nomor: 111202663419179"
 */

interface TextPosItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisualLine {
  y: number;
  text: string;
  items: TextPosItem[];
}

/**
 * Clean extracted letter number string:
 * Strips any trailing labels like "Lampiran:", "Hal:", "Perihal:", "Sifat:", "Tanggal:"
 * that might appear on the same visual line in multi-column tables.
 */
export function cleanDocumentNumber(raw: string): string {
  if (!raw) return '';

  let cleaned = raw.trim();

  // Remove common prefix markers if accidentally included (e.g. "Nomor:", "No. :", "NOMOR :")
  cleaned = cleaned.replace(/^(?:Nomor|NOMOR|No|NO)(?:\.|\s)*[:\.]\s*/i, '').trim();

  // Remove trailing delimiter labels often found on header lines (e.g. "Lampiran: 1", "Perihal: ...")
  const stopKeywords = [
    'Lampiran',
    'Lamp',
    'Perihal',
    'Hal',
    'Sifat',
    'Tanggal',
    'Tgl',
    'Tentang',
    'Klasifikasi',
    'Kepada',
    'Yth'
  ];

  for (const kw of stopKeywords) {
    const reg = new RegExp(`\\s*(?:${kw}|${kw.toLowerCase()})\\s*[:\\.].*$`, 'i');
    cleaned = cleaned.replace(reg, '').trim();
  }

  // Remove trailing dots, commas, semicolons
  cleaned = cleaned.replace(/[,\.;:\s]+$/, '').trim();

  return cleaned;
}

/**
 * Inspects PDF bytes (starting with Page 1) to find and extract the document/letter number.
 */
export async function extractNomorSuratFromPdf(pdfBytes: Uint8Array): Promise<string> {
  if (!pdfBytes || pdfBytes.length === 0) return '';

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(0),
      useSystemFonts: true
    });
    const doc = await loadingTask.promise;
    const maxPages = Math.min(doc.numPages, 2); // Letter numbers are almost always on Page 1 or 2

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const rawItems: TextPosItem[] = [];
      for (const rawItem of textContent.items) {
        if ('str' in rawItem && rawItem.str) {
          const str = rawItem.str;
          const transform = rawItem.transform;
          const x = transform[4];
          const y = transform[5];
          const width = (rawItem as any).width || 0;
          const height = (rawItem as any).height || 0;
          rawItems.push({ str, x, y, width, height });
        }
      }

      if (rawItems.length === 0) continue;

      // Group items into visual lines (same vertical level within 4.5pt)
      const sortedByY = [...rawItems].sort((a, b) => b.y - a.y);
      const visualLines: VisualLine[] = [];

      for (const item of sortedByY) {
        const existingLine = visualLines.find((l) => Math.abs(l.y - item.y) <= 4.5);
        if (existingLine) {
          existingLine.items.push(item);
        } else {
          visualLines.push({
            y: item.y,
            text: '',
            items: [item]
          });
        }
      }

      // Reconstruct horizontal order and text
      for (const line of visualLines) {
        line.items.sort((a, b) => a.x - b.x);
        let lineStr = '';
        for (let i = 0; i < line.items.length; i++) {
          const cur = line.items[i];
          if (i === 0) {
            lineStr = cur.str;
          } else {
            const prev = line.items[i - 1];
            const gap = cur.x - (prev.x + prev.width);
            const needSpace = gap > 2.0 && !prev.str.endsWith(' ') && !cur.str.startsWith(' ');
            lineStr += (needSpace ? ' ' : '') + cur.str;
          }
        }
        line.text = lineStr.trim();
      }

      // Sort lines top to bottom
      visualLines.sort((a, b) => b.y - a.y);

      // Strategy 1: Find pattern in joined visual lines
      // Matches "Nomor : 421.2/089/..." or "NOMOR: ..." or "No. : ..."
      for (let i = 0; i < visualLines.length; i++) {
        const line = visualLines[i];
        const text = line.text;

        // Regex pattern specifically for "Nomor:" or "NOMOR :" or "No. :"
        const match = text.match(/(?:Nomor|NOMOR|No|NO)(?:\.|\s)*[:\.]\s*([^,\n\r]+)/i);
        if (match && match[1]) {
          const extracted = cleanDocumentNumber(match[1]);
          // Must have some digits or valid characters
          if (extracted.length >= 3 && /[0-9A-Za-z]/.test(extracted)) {
            return extracted;
          }
        }

        // Strategy 2: If the line ends with "Nomor:" and the number is on the next line
        if (/^(?:Nomor|NOMOR|No|NO)(?:\.|\s)*[:\.]?\s*$/i.test(text) && i + 1 < visualLines.length) {
          const nextText = visualLines[i + 1].text.trim();
          const cleanedNext = cleanDocumentNumber(nextText);
          if (cleanedNext.length >= 3 && /[0-9A-Za-z]/.test(cleanedNext)) {
            return cleanedNext;
          }
        }
      }

      // Strategy 3: Check raw items adjacent horizontally (if "Nomor:" was in one span and number in next)
      for (const line of visualLines) {
        for (let k = 0; k < line.items.length; k++) {
          const item = line.items[k];
          if (/^(?:Nomor|NOMOR|No|NO)\s*[:\.]?$/i.test(item.str.trim())) {
            // Find items on the same line to the right of this item
            const rightItems = line.items.slice(k + 1);
            if (rightItems.length > 0) {
              const joinedRight = rightItems.map((it) => it.str).join(' ').trim();
              const cleaned = cleanDocumentNumber(joinedRight);
              if (cleaned.length >= 3 && /[0-9A-Za-z]/.test(cleaned)) {
                return cleaned;
              }
            }
          }
        }
      }

      // Strategy 4: Fallback to simple full text regex
      const fullText = visualLines.map((l) => l.text).join('\n');
      const broadMatch = fullText.match(/(?:Nomor|NOMOR)\s*[:\.]\s*([^\n\r]+)/i);
      if (broadMatch && broadMatch[1]) {
        const cleaned = cleanDocumentNumber(broadMatch[1]);
        if (cleaned.length >= 3) {
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to extract document number from PDF:', err);
  }

  return '';
}
