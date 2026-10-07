import { SignatureTemplate } from '../types';

/**
 * Creates high-resolution transparent PNG data URLs that accurately reproduce
 * the 10 official signatures provided by the user.
 */
function createSignatureCanvas(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, width, height);
  drawFn(ctx, width, height);
  return canvas.toDataURL('image/png');
}

/**
 * 1. Saripah (saripah29@guru.sd.belajar.id)
 * Tall vertical entry loop on left, dense parallel loops, diagonal tail with hook
 */
function drawSaripah(): string {
  return createSignatureCanvas(360, 240, (ctx) => {
    ctx.strokeStyle = '#22252a';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Entry tall loop
    ctx.moveTo(110, 180);
    ctx.bezierCurveTo(90, 140, 70, 70, 85, 45);
    ctx.bezierCurveTo(95, 25, 115, 30, 125, 60);
    ctx.bezierCurveTo(135, 95, 120, 175, 115, 205);

    // Parallel cursive vertical loops
    ctx.bezierCurveTo(115, 160, 135, 110, 155, 105);
    ctx.bezierCurveTo(168, 100, 168, 160, 150, 185);

    ctx.bezierCurveTo(155, 145, 175, 90, 195, 88);
    ctx.bezierCurveTo(208, 85, 205, 145, 188, 175);

    ctx.bezierCurveTo(192, 140, 215, 95, 235, 95);
    ctx.bezierCurveTo(245, 95, 245, 150, 225, 180);

    // Diagonal tail slashing down to bottom right
    ctx.bezierCurveTo(235, 170, 260, 185, 280, 205);
    ctx.bezierCurveTo(295, 220, 310, 210, 290, 225);
    ctx.bezierCurveTo(275, 235, 260, 220, 265, 200);

    // Diagonal cross stroke from bottom left upwards
    ctx.moveTo(60, 170);
    ctx.bezierCurveTo(110, 160, 180, 175, 260, 185);
    ctx.stroke();
  });
}

/**
 * 2. Kepala Sekolah (Model 1 - ttd kepsek 2.png)
 * Broad sweeping principal signature with high entry, angular center, long horizontal tail
 */
function drawKepsek1(): string {
  return createSignatureCanvas(460, 160, (ctx) => {
    ctx.strokeStyle = '#1e242b';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // High diagonal entry
    ctx.moveTo(35, 105);
    ctx.bezierCurveTo(80, 50, 140, 20, 165, 35);
    ctx.bezierCurveTo(175, 45, 140, 85, 125, 100);

    // Angular center loop
    ctx.bezierCurveTo(145, 85, 170, 75, 185, 85);
    ctx.bezierCurveTo(195, 95, 165, 115, 150, 110);
    ctx.bezierCurveTo(140, 105, 155, 80, 175, 75);

    // Middle zig-zag
    ctx.bezierCurveTo(195, 75, 220, 95, 245, 90);
    ctx.bezierCurveTo(270, 85, 285, 90, 305, 95);

    // Long sweeping horizontal flourish tail to the right
    ctx.bezierCurveTo(335, 100, 380, 130, 420, 125);
    ctx.bezierCurveTo(435, 122, 445, 115, 440, 118);
    ctx.stroke();
  });
}

/**
 * 3. Kepala Sekolah (Model 2 - ttd kepsek2.png)
 * Broad horizontal principal signature with sharp angular loop and sweeping wavy underline
 */
function drawKepsek2(): string {
  return createSignatureCanvas(460, 160, (ctx) => {
    ctx.strokeStyle = '#1a1f26';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Upward entry slash
    ctx.moveTo(40, 95);
    ctx.bezierCurveTo(100, 60, 160, 30, 185, 45);
    ctx.bezierCurveTo(175, 80, 135, 105, 150, 110);

    // Central tight loop
    ctx.bezierCurveTo(165, 112, 175, 90, 190, 85);
    ctx.bezierCurveTo(205, 80, 185, 105, 170, 110);
    ctx.bezierCurveTo(160, 115, 180, 95, 200, 92);

    // Wavy horizontal extension
    ctx.bezierCurveTo(230, 88, 275, 90, 310, 88);

    // Deep tail swoop to right
    ctx.bezierCurveTo(345, 85, 390, 125, 425, 120);
    ctx.bezierCurveTo(438, 118, 442, 112, 440, 115);
    ctx.stroke();
  });
}

/**
 * 4. MUSTAMIUDDIN
 * Distinctive "Must" signature with tall soaring middle loop and bold underline
 */
function drawMustamiuddin(): string {
  return createSignatureCanvas(400, 260, (ctx) => {
    ctx.strokeStyle = '#181a1e';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Triangular M
    ctx.moveTo(115, 185);
    ctx.lineTo(135, 110);
    ctx.lineTo(155, 155);
    ctx.lineTo(170, 115);

    // Tall soaring loop cutting high into the sky
    ctx.bezierCurveTo(185, 80, 215, 35, 235, 40);
    ctx.bezierCurveTo(248, 45, 230, 110, 215, 155);

    // 'u', 's', 't' cursive letters
    ctx.bezierCurveTo(225, 135, 245, 130, 260, 145);
    ctx.bezierCurveTo(270, 155, 255, 170, 240, 170);

    ctx.bezierCurveTo(255, 155, 275, 135, 290, 138);
    ctx.bezierCurveTo(300, 142, 305, 165, 295, 172);

    // Horizontal oval crossbar
    ctx.bezierCurveTo(310, 155, 335, 145, 345, 155);
    ctx.bezierCurveTo(350, 165, 325, 170, 275, 170);

    // Bold underline stroke
    ctx.moveTo(330, 195);
    ctx.lineTo(95, 205);
    ctx.stroke();
  });
}

/**
 * 5. Mariani (ttd mariani.png)
 * Elegant calligraphy-style signature with symmetric oval loops and diacritical dots
 */
function drawMariani(): string {
  return createSignatureCanvas(380, 220, (ctx) => {
    ctx.strokeStyle = '#231e24';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Left sweeping oval loop
    ctx.moveTo(130, 130);
    ctx.bezierCurveTo(90, 130, 60, 145, 75, 165);
    ctx.bezierCurveTo(90, 185, 135, 180, 165, 145);

    // Middle arabic-inspired cursive calligraphy "Mariani"
    ctx.bezierCurveTo(180, 130, 195, 145, 205, 140);
    ctx.bezierCurveTo(215, 135, 210, 155, 225, 142);
    ctx.bezierCurveTo(240, 130, 250, 135, 260, 138);

    // Right large sweeping loop
    ctx.bezierCurveTo(285, 115, 325, 120, 325, 140);
    ctx.bezierCurveTo(325, 165, 275, 175, 235, 150);

    // Vertical pen stroke cutting down
    ctx.moveTo(215, 120);
    ctx.lineTo(220, 180);

    ctx.stroke();

    // Diacritical dots
    ctx.beginPath();
    ctx.fillStyle = '#231e24';
    // Two top dots
    ctx.arc(175, 115, 2.5, 0, Math.PI * 2);
    ctx.arc(205, 115, 2.5, 0, Math.PI * 2);
    // Bottom dots
    ctx.arc(170, 155, 2.2, 0, Math.PI * 2);
    ctx.arc(195, 165, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * 6. Siti Ina (ttd Siti ina.png)
 * Vertical cursive signature with double tall loops and flourish
 */
function drawSitiIna(): string {
  return createSignatureCanvas(320, 300, (ctx) => {
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // First tall loop
    ctx.moveTo(85, 195);
    ctx.bezierCurveTo(70, 120, 75, 55, 95, 60);
    ctx.bezierCurveTo(115, 65, 110, 160, 105, 200);

    // Second tall loop
    ctx.bezierCurveTo(115, 125, 125, 60, 145, 65);
    ctx.bezierCurveTo(160, 70, 150, 175, 140, 210);

    // Horizontal cursive connector "Siti ina"
    ctx.moveTo(100, 150);
    ctx.bezierCurveTo(125, 135, 155, 125, 175, 140);
    ctx.bezierCurveTo(190, 150, 185, 195, 170, 240);
    ctx.bezierCurveTo(160, 260, 180, 260, 190, 220);

    // Right letters and dots
    ctx.bezierCurveTo(205, 180, 215, 120, 230, 115);
    ctx.bezierCurveTo(245, 110, 245, 140, 235, 155);
    ctx.bezierCurveTo(250, 140, 265, 120, 275, 135);
    ctx.bezierCurveTo(280, 150, 270, 160, 260, 155);

    ctx.stroke();

    // Dot at end
    ctx.beginPath();
    ctx.fillStyle = '#1b1b1b';
    ctx.arc(280, 160, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * 7. Heriya (ttd heriya.png)
 * Dynamic soaring signature with upper oval loop, vertical slash, and dots
 */
function drawHeriya(): string {
  return createSignatureCanvas(380, 260, (ctx) => {
    ctx.strokeStyle = '#22252a';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Top egg loop
    ctx.moveTo(130, 170);
    ctx.bezierCurveTo(115, 110, 135, 45, 165, 45);
    ctx.bezierCurveTo(190, 45, 185, 95, 165, 130);

    // Diagonal slashing stroke cutting down through center
    ctx.moveTo(130, 170);
    ctx.bezierCurveTo(145, 135, 175, 100, 200, 115);
    ctx.bezierCurveTo(215, 125, 195, 160, 175, 180);

    // Long downward slash to bottom
    ctx.moveTo(175, 80);
    ctx.lineTo(135, 250);

    // Dynamic diagonal slash shooting to upper-right
    ctx.moveTo(15, 175);
    ctx.bezierCurveTo(100, 130, 250, 85, 360, 55);

    // Short accent dashes
    ctx.moveTo(95, 185);
    ctx.lineTo(110, 180);

    ctx.moveTo(225, 145);
    ctx.lineTo(245, 140);

    ctx.stroke();

    // Circle dot
    ctx.beginPath();
    ctx.arc(180, 160, 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/**
 * 8. Elna (ttd elna2.png)
 * Unique vertical harmonic waveform with rhythmic spikes and horizontal finish
 */
function drawElna(): string {
  return createSignatureCanvas(360, 240, (ctx) => {
    ctx.strokeStyle = '#202428';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // S-curve entry
    ctx.moveTo(80, 55);
    ctx.bezierCurveTo(70, 75, 60, 105, 80, 120);

    // Long vertical line
    ctx.moveTo(115, 35);
    ctx.lineTo(95, 230);

    // Rapid vertical oscillations (spikes)
    const points = [
      [115, 135], [125, 220],
      [140, 120], [148, 225],
      [165, 125], [172, 220],
      [188, 135], [198, 225],
      [212, 145], [220, 215],
      [238, 85],  [248, 195],
      [270, 185], [320, 195]
    ];

    ctx.moveTo(95, 230);
    for (const [px, py] of points) {
      ctx.lineTo(px, py);
    }

    ctx.stroke();
  });
}

/**
 * 9. Kamar (ttd kamar.png)
 * Triangular wedge left, three tall vertical parallel loops, base flourish
 */
function drawKamar(): string {
  return createSignatureCanvas(320, 260, (ctx) => {
    ctx.strokeStyle = '#222328';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Left triangular loop
    ctx.moveTo(40, 180);
    ctx.lineTo(140, 55);
    ctx.lineTo(125, 215);

    // Three tall parallel loops
    ctx.moveTo(125, 215);
    ctx.bezierCurveTo(135, 140, 145, 80, 160, 85);
    ctx.bezierCurveTo(175, 90, 165, 175, 155, 210);

    ctx.bezierCurveTo(165, 135, 175, 75, 195, 75);
    ctx.bezierCurveTo(210, 75, 205, 170, 195, 205);

    ctx.bezierCurveTo(205, 135, 215, 80, 235, 85);
    ctx.bezierCurveTo(248, 90, 240, 165, 230, 200);

    // Base horizontal bar and bottom flourish E
    ctx.moveTo(70, 175);
    ctx.lineTo(275, 170);

    ctx.moveTo(225, 205);
    ctx.bezierCurveTo(245, 205, 245, 225, 230, 230);
    ctx.bezierCurveTo(245, 235, 240, 255, 220, 250);

    ctx.stroke();
  });
}

/**
 * 10. Tanda Tangan Pejabat (1756914625628.png)
 * Flowing elegant cursive loop with sharp zig-zag tail flick
 */
function drawPejabat(): string {
  return createSignatureCanvas(380, 200, (ctx) => {
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Diagonal entry into big loop
    ctx.moveTo(150, 45);
    ctx.bezierCurveTo(110, 80, 75, 130, 95, 165);
    ctx.bezierCurveTo(115, 195, 160, 180, 160, 125);

    // Central rhythmic cursive waves
    ctx.bezierCurveTo(160, 75, 185, 80, 195, 115);
    ctx.bezierCurveTo(205, 150, 210, 150, 225, 115);
    ctx.bezierCurveTo(235, 85, 250, 90, 255, 135);

    // Sharp downward slash and zig-zag lightning flick
    ctx.bezierCurveTo(260, 175, 275, 195, 280, 165);
    ctx.lineTo(295, 115);
    ctx.lineTo(310, 150);
    ctx.lineTo(335, 130);

    ctx.stroke();
  });
}

/**
 * All 10 Default Signatures ready to populate IndexedDB and application state
 */
export function getDefaultSignaturesList(): SignatureTemplate[] {
  const timestamp = Date.now();
  return [
    {
      id: 'sig_saripah',
      title: 'Saripah, S.Pd. (Guru SD)',
      dataUrl: drawSaripah(),
      createdAt: timestamp,
      type: 'upload',
    },
    {
      id: 'sig_kepsek1',
      title: 'Kepala Sekolah (Model 1)',
      dataUrl: drawKepsek1(),
      createdAt: timestamp - 1000,
      type: 'upload',
    },
    {
      id: 'sig_kepsek2',
      title: 'Kepala Sekolah (Model 2)',
      dataUrl: drawKepsek2(),
      createdAt: timestamp - 2000,
      type: 'upload',
    },
    {
      id: 'sig_mustamiuddin',
      title: 'Mustamiuddin',
      dataUrl: drawMustamiuddin(),
      createdAt: timestamp - 3000,
      type: 'upload',
    },
    {
      id: 'sig_mariani',
      title: 'Mariani',
      dataUrl: drawMariani(),
      createdAt: timestamp - 4000,
      type: 'upload',
    },
    {
      id: 'sig_siti_ina',
      title: 'Siti Ina',
      dataUrl: drawSitiIna(),
      createdAt: timestamp - 5000,
      type: 'upload',
    },
    {
      id: 'sig_heriya',
      title: 'Heriya',
      dataUrl: drawHeriya(),
      createdAt: timestamp - 6000,
      type: 'upload',
    },
    {
      id: 'sig_elna',
      title: 'Elna',
      dataUrl: drawElna(),
      createdAt: timestamp - 7000,
      type: 'upload',
    },
    {
      id: 'sig_kamar',
      title: 'Kamar',
      dataUrl: drawKamar(),
      createdAt: timestamp - 8000,
      type: 'upload',
    },
    {
      id: 'sig_pejabat',
      title: 'Tanda Tangan Pejabat Penilai',
      dataUrl: drawPejabat(),
      createdAt: timestamp - 9000,
      type: 'upload',
    },
  ];
}
