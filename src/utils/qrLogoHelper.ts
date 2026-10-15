/**
 * Utility for embedding official institutional logos and emblems in the center of QR codes.
 * Uses high-error-correction (Level H) QR codes, which allow up to 30% obstruction
 * while retaining instant, robust scanability across all devices.
 */

export type QrLogoType = 'kemdikbud' | 'garuda' | 'bsre' | 'custom';

// 1. Kemdikbud / Tut Wuri Handayani (Official Indonesian Education Logo)
export const KEMDIKBUD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="kemdikbudGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>

  <!-- Clean Circle Base -->
  <circle cx="100" cy="100" r="96" fill="url(#kemdikbudGlow)" stroke="#0369a1" stroke-width="7"/>
  <circle cx="100" cy="100" r="88" fill="none" stroke="#fbbf24" stroke-width="2.5"/>

  <!-- Segilima Luar (Pentagon Shield of Indonesian Education) -->
  <polygon points="100,24 172,74 144,158 56,158 28,74" fill="none" stroke="#0284c7" stroke-width="4.5" stroke-linejoin="round"/>

  <!-- Sayap Kiri dan Kanan (Wings of Learning) -->
  <path d="M100 85 C80 65 42 75 38 102 C48 100 60 106 72 120 C82 108 92 98 100 85 Z" fill="url(#blueGrad)" opacity="0.95"/>
  <path d="M100 85 C120 65 158 75 162 102 C152 100 140 106 128 120 C118 108 108 98 100 85 Z" fill="url(#blueGrad)" opacity="0.95"/>

  <!-- Api / Belimbing Keemasan di Puncak (Golden Torch & Flame) -->
  <path d="M100 36 C92 48 94 62 100 70 C106 62 108 48 100 36 Z" fill="url(#goldGrad)"/>
  <circle cx="100" cy="56" r="4.5" fill="#ef4444"/>

  <!-- Buku Terbuka (Open Book of Knowledge) -->
  <path d="M100 120 C88 114 68 115 54 126 C54 142 86 142 100 148 C114 142 146 142 146 126 C132 115 112 114 100 120 Z" fill="#ffffff" stroke="#0369a1" stroke-width="3.5" stroke-linejoin="round"/>
  <line x1="100" y1="120" x2="100" y2="148" stroke="#0369a1" stroke-width="3"/>

  <!-- Pita & Teks Tut Wuri Handayani -->
  <path d="M48 165 Q100 182 152 165" fill="none" stroke="#0369a1" stroke-width="8" stroke-linecap="round"/>
  <path d="M52 165 Q100 181 148 165" fill="none" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
  <text x="100" y="174" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="9" fill="#0f172a" letter-spacing="1">TUT WURI HANDAYANI</text>
</svg>`;

// 2. Garuda Pancasila (Lambang Resmi Negara / Pemerintahan)
export const GARUDA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="garudaGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <radialGradient id="garudaBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#fefce8"/>
    </radialGradient>
  </defs>

  <circle cx="100" cy="100" r="96" fill="url(#garudaBg)" stroke="#b45309" stroke-width="7"/>
  <circle cx="100" cy="100" r="88" fill="none" stroke="#eab308" stroke-width="2"/>

  <!-- Sayap Garuda -->
  <path d="M100 68 C80 32 34 50 25 88 C45 92 65 105 78 126 C88 110 94 90 100 68 Z" fill="url(#garudaGold)" stroke="#78350f" stroke-width="2.5"/>
  <path d="M100 68 C120 32 166 50 175 88 C155 92 135 105 122 126 C112 110 106 90 100 68 Z" fill="url(#garudaGold)" stroke="#78350f" stroke-width="2.5"/>

  <!-- Kepala Garuda -->
  <path d="M96 28 C96 24 104 24 104 28 C108 34 118 36 122 42 C116 46 112 48 108 55 C96 55 94 45 96 28 Z" fill="url(#garudaGold)" stroke="#78350f" stroke-width="2"/>
  <circle cx="104" cy="38" r="2.5" fill="#78350f"/>

  <!-- Ekor Garuda (8 helai bulu) -->
  <path d="M85 140 L82 170 L100 162 L118 170 L115 140 Z" fill="url(#garudaGold)" stroke="#78350f" stroke-width="2"/>

  <!-- Perisai Pancasila di Dada -->
  <path d="M80 78 L120 78 L120 108 C120 125 100 136 100 136 C100 136 80 125 80 108 Z" fill="#b91c1c" stroke="#fef08a" stroke-width="3"/>
  <!-- Belahan perisai -->
  <path d="M81 79 L99 79 L99 106 L81 106 Z" fill="#b91c1c"/>
  <path d="M101 79 L119 79 L119 106 L101 106 Z" fill="#ffffff"/>
  <path d="M81 106 L99 106 L99 130 C90 123 83 115 81 106 Z" fill="#ffffff"/>
  <path d="M101 106 L119 106 C117 115 110 123 101 130 Z" fill="#b91c1c"/>
  <!-- Bintang Emas di Tengah Perisai -->
  <circle cx="100" cy="106" r="10" fill="#1e293b"/>
  <polygon points="100,98 102.5,103 108,103.5 104,107 105.5,112.5 100,109.5 94.5,112.5 96,107 92,103.5 97.5,103" fill="#fde047"/>

  <!-- Pita Cengkeraman Kaki -->
  <path d="M60 162 Q100 156 140 162 L142 174 Q100 168 58 174 Z" fill="#ffffff" stroke="#78350f" stroke-width="2"/>
  <text x="100" y="169" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="6.5" fill="#78350f" letter-spacing="0.5">BHINNEKA TUNGGAL IKA</text>
</svg>`;

// 3. Sertifikasi Digital / BSrE / TTE (Tanda Tangan Elektronik)
export const BSRE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bsreBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="bsreGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>

  <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#0284c7" stroke-width="7"/>
  <circle cx="100" cy="100" r="88" fill="none" stroke="#10b981" stroke-width="2"/>

  <!-- Perisai Keamanan Digital -->
  <path d="M100 32 L152 56 C152 108 128 142 100 156 C72 142 48 108 48 56 Z" fill="url(#bsreBlue)"/>

  <!-- Gembok Keamanan & Centang Verifikasi Emas -->
  <circle cx="100" cy="90" r="30" fill="url(#bsreGreen)" stroke="#ffffff" stroke-width="3"/>
  <path d="M88 90 L96 98 L114 78" fill="none" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Teks Tanda Tangan Elektronik -->
  <rect x="58" y="148" width="84" height="20" rx="10" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
  <text x="100" y="162" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="10.5" fill="#38bdf8" letter-spacing="1">TTE RESMI</text>
</svg>`;

/**
 * Returns data URL for the specified logo type
 */
export function getLogoDataUrl(type: QrLogoType = 'kemdikbud', customUrl?: string): string {
  if (type === 'custom' && customUrl && customUrl.trim()) {
    return customUrl;
  }
  let svgString = KEMDIKBUD_SVG;
  if (type === 'garuda') {
    svgString = GARUDA_SVG;
  } else if (type === 'bsre') {
    svgString = BSRE_SVG;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

/**
 * Embeds a crisp institutional emblem or custom logo right in the center of the QR code canvas.
 * Error correction level 'H' ensures 100% scan reliability even with the logo in place.
 */
export async function embedCenterLogoInQr(
  baseQrDataUrl: string,
  logoDataUrl: string
): Promise<string> {
  return new Promise((resolve) => {
    if (!baseQrDataUrl) {
      resolve(baseQrDataUrl);
      return;
    }

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';

    qrImg.onload = () => {
      const canvas = document.createElement('canvas');
      const size = qrImg.naturalWidth || 600;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(baseQrDataUrl);
        return;
      }

      // 1. Draw base QR code
      ctx.drawImage(qrImg, 0, 0, size, size);

      // 2. Prepare center logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';

      logoImg.onload = () => {
        const center = size / 2;
        // The logo should be ~21% of the QR code width (leaves ~79% data surface untouched)
        const logoDimension = Math.round(size * 0.22); // e.g. 132px for a 600px QR
        const badgeRadius = Math.round(logoDimension / 2 + size * 0.016); // padding around logo

        // Draw clean white circular backing badge with soft border
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
        ctx.shadowBlur = Math.round(size * 0.015);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.fill();

        // Border stroke for high definition
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = Math.max(2, Math.round(size * 0.007));
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        // Clip and draw the logo centered
        ctx.beginPath();
        ctx.arc(center, center, Math.round(logoDimension / 2), 0, Math.PI * 2);
        ctx.clip();

        // Calculate aspect-ratio fit
        const imgW = logoImg.naturalWidth || logoDimension;
        const imgH = logoImg.naturalHeight || logoDimension;
        const aspect = imgW / imgH;

        let drawW = logoDimension;
        let drawH = logoDimension;
        if (aspect > 1) {
          drawH = logoDimension / aspect;
        } else {
          drawW = logoDimension * aspect;
        }

        const drawX = center - drawW / 2;
        const drawY = center - drawH / 2;

        ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Return composited PNG
        resolve(canvas.toDataURL('image/png'));
      };

      logoImg.onerror = (e) => {
        console.warn('Failed to load center logo image, returning plain QR code', e);
        resolve(baseQrDataUrl);
      };

      logoImg.src = logoDataUrl;
    };

    qrImg.onerror = (e) => {
      console.warn('Failed to load base QR code image', e);
      resolve(baseQrDataUrl);
    };

    qrImg.src = baseQrDataUrl;
  });
}
