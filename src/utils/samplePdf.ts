import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates an authentic Indonesian SKP (Sasaran Kinerja Pegawai) PDF document
 * with real vector tables, text layers, and signature placeholders.
 */
export async function generateSampleSKPPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const a4Width = 595.28;
  const a4Height = 841.89;

  // ================= PAGE 1 =================
  const page1 = pdfDoc.addPage([a4Width, a4Height]);
  const margin = 40;
  let y = a4Height - margin;

  // Header / Kop
  page1.drawText('PEMERINTAH REPUBLIK INDONESIA', {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 14;
  page1.drawText('KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.18, 0.36),
  });
  y -= 12;
  page1.drawText('BALAI PENJAMINAN MUTU PENDIDIKAN & PENGEMBANGAN SISTEM', {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 14;

  // Divider line
  page1.drawLine({
    start: { x: margin, y },
    end: { x: a4Width - margin, y },
    thickness: 1.5,
    color: rgb(0.1, 0.2, 0.4),
  });
  y -= 20;

  // Document Title
  const title = 'SASARAN KINERJA PEGAWAI (SKP) APARATUR SIPIL NEGARA';
  const titleWidth = fontBold.widthOfTextAtSize(title, 12);
  page1.drawText(title, {
    x: (a4Width - titleWidth) / 2,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 14;

  const subtitle = 'PERIODE PENILAIAN: 01 JANUARI S.D. 31 DESEMBER 2026';
  const subWidth = fontRegular.widthOfTextAtSize(subtitle, 9);
  page1.drawText(subtitle, {
    x: (a4Width - subWidth) / 2,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 25;

  // Section 1: Pegawai yang Dinilai & Pejabat Penilai
  page1.drawRectangle({
    x: margin,
    y: y - 110,
    width: a4Width - margin * 2,
    height: 110,
    borderColor: rgb(0.7, 0.75, 0.82),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1),
  });

  // Table header line
  page1.drawText('I. PEGAWAI YANG DINILAI', {
    x: margin + 10,
    y: y - 15,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });

  const colMid = margin + (a4Width - margin * 2) / 2;
  page1.drawText('II. PEJABAT PENILAI KINERJA', {
    x: colMid + 10,
    y: y - 15,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });

  // Vertical separator
  page1.drawLine({
    start: { x: colMid, y: y },
    end: { x: colMid, y: y - 110 },
    thickness: 1,
    color: rgb(0.7, 0.75, 0.82),
  });

  const employeeData = [
    { label: 'Nama', val: 'Saripah, S.Pd.' },
    { label: 'NIP', val: '19850714 201001 2 018' },
    { label: 'Pangkat/Gol', val: 'Penata Muda Tk. I / III/b' },
    { label: 'Jabatan', val: 'Guru Kelas SD' },
    { label: 'Unit Kerja', val: 'SD Negeri Percobaan' },
  ];

  const assessorData = [
    { label: 'Nama', val: 'Mustamiuddin, M.Pd.' },
    { label: 'NIP', val: '19740312 199803 1 004' },
    { label: 'Pangkat/Gol', val: 'Pembina / IV/a' },
    { label: 'Jabatan', val: 'Kepala Sekolah' },
    { label: 'Unit Kerja', val: 'SD Negeri Percobaan' },
  ];

  let subY = y - 32;
  employeeData.forEach((item) => {
    page1.drawText(`${item.label}`, {
      x: margin + 10,
      y: subY,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    page1.drawText(`: ${item.val}`, {
      x: margin + 75,
      y: subY,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    subY -= 15;
  });

  subY = y - 32;
  assessorData.forEach((item) => {
    page1.drawText(`${item.label}`, {
      x: colMid + 10,
      y: subY,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    page1.drawText(`: ${item.val}`, {
      x: colMid + 75,
      y: subY,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    subY -= 15;
  });

  y -= 130;

  // Activities Table Header
  page1.drawText('RENCANA KINERJA UTAMA & TARGET TAHUNAN', {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 18;

  // Table header
  const tableW = a4Width - margin * 2;
  page1.drawRectangle({
    x: margin,
    y: y - 20,
    width: tableW,
    height: 20,
    color: rgb(0.15, 0.25, 0.45),
  });

  page1.drawText('No', { x: margin + 6, y: y - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page1.drawText('Rencana Hasil Kerja', { x: margin + 30, y: y - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page1.drawText('Indikator Kinerja Individu (IKI)', { x: margin + 220, y: y - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page1.drawText('Target', { x: margin + 430, y: y - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  y -= 20;

  const rows = [
    {
      no: '1',
      plan: 'Penyusunan Modul Pembelajaran Digital Interaktif Berbasis Cloud',
      indicator: 'Tersusunnya 12 modul digital terverifikasi standar kurikulum nasional',
      target: '12 Modul (100%)',
    },
    {
      no: '2',
      plan: 'Fasilitasi Pelatihan Kompetensi Guru SD & SMP se-Provinsi',
      indicator: 'Jumlah pendidik tersertifikasi literasi digital minimum 85 poin evaluasi',
      target: '450 Guru',
    },
    {
      no: '3',
      plan: 'Evaluasi Mutu dan Penerapan Media E-Learning Berkelanjutan',
      indicator: 'Laporan komprehensif audit mutu pembelajaran berbasis metrik data',
      target: '4 Laporan Triwulan',
    },
    {
      no: '4',
      plan: 'Publikasi Karya Ilmiah dan Rekomendasi Kebijakan Kurikulum Mandiri',
      indicator: 'Naskah akademik terindeks dan diterima dalam prosiding konferensi',
      target: '2 Prosiding',
    },
  ];

  rows.forEach((r, idx) => {
    const rowH = 40;
    const bg = idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.96, 0.97, 0.99);

    page1.drawRectangle({
      x: margin,
      y: y - rowH,
      width: tableW,
      height: rowH,
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 0.8,
      color: bg,
    });

    page1.drawText(r.no, { x: margin + 10, y: y - 22, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page1.drawText(r.plan.substring(0, 42), { x: margin + 30, y: y - 18, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    if (r.plan.length > 42) {
      page1.drawText(r.plan.substring(42), { x: margin + 30, y: y - 28, size: 7.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    }

    page1.drawText(r.indicator.substring(0, 48), { x: margin + 220, y: y - 18, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    if (r.indicator.length > 48) {
      page1.drawText(r.indicator.substring(48), { x: margin + 220, y: y - 28, size: 7.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    }

    page1.drawText(r.target, { x: margin + 430, y: y - 22, size: 8, font: fontBold, color: rgb(0.08, 0.4, 0.25) });

    y -= rowH;
  });

  // Footer page 1
  page1.drawText('Halaman 1 dari 2 — Dokumen Resmi Kepegawaian RI (SKP)', {
    x: margin,
    y: 25,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // ================= PAGE 2 =================
  const page2 = pdfDoc.addPage([a4Width, a4Height]);
  y = a4Height - margin;

  page2.drawText('LAMPIRAN PENGESAHAN DAN PERSETUJUAN SASARAN KINERJA PEGAWAI', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.18, 0.36),
  });
  y -= 16;
  page2.drawText('Tahun Anggaran 2026 — Dokumen Status: Siap Pengesahan & Tanda Tangan', {
    x: margin,
    y,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 14;

  page2.drawLine({
    start: { x: margin, y },
    end: { x: a4Width - margin, y },
    thickness: 1,
    color: rgb(0.75, 0.8, 0.85),
  });
  y -= 25;

  page2.drawText('PERNYATAAN KOMITMEN KERJA:', {
    x: margin,
    y,
    size: 9.5,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 18;

  const statementText = [
    '1. Saya menyatakan bahwa sasaran kinerja di atas telah didiskusikan dan disepakati bersama atasan langsung.',
    '2. Target kinerja akan dilaksanakan dengan penuh tanggung jawab, integritas, dan berorientasi pelayanan publik.',
    '3. Segala perubahan target kinerja selama periode berjalan akan dilaporkan melalui mekanisme revisi SKP resmi.',
    '4. Dokumen ini sah dan memiliki kekuatan hukum kepegawaian setelah ditandatangani oleh kedua belah pihak.',
  ];

  statementText.forEach((st) => {
    page2.drawText(st, {
      x: margin + 8,
      y,
      size: 8,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    y -= 16;
  });

  y -= 35;

  // Boxed notice
  page2.drawRectangle({
    x: margin,
    y: y - 35,
    width: tableW,
    height: 35,
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
    color: rgb(0.95, 0.97, 1),
  });
  page2.drawText('Perhatian: Harap letakkan tanda tangan digital pada area kolom tanda tangan di bawah ini.', {
    x: margin + 12,
    y: y - 18,
    size: 8,
    font: fontBold,
    color: rgb(0.12, 0.28, 0.6),
  });
  page2.drawText('Teks dalam dokumen ini adalah teks asli yang dapat dicari, dipilih, dan dicopy.', {
    x: margin + 12,
    y: y - 28,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  y -= 70;

  // Signatures Section
  const dateStr = 'Semarang, 15 Oktober 2026';
  page2.drawText(dateStr, {
    x: a4Width - margin - 180,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 25;

  // Two columns for signatures
  // Left: Pegawai yang Dinilai (Saripah, S.Pd.)
  // Right: Pejabat Penilai (Mustamiuddin, M.Pd.)
  const leftX = margin + 25;
  const rightX = a4Width - margin - 195;

  page2.drawText('Pegawai yang Dinilai,', {
    x: leftX,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page2.drawText('Pejabat Penilai Kinerja,', {
    x: rightX,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Signature box outlines (dashed guides for user placement)
  const boxW = 160;
  const boxH = 65;
  const sigBoxY = y - 75;

  page2.drawRectangle({
    x: leftX - 10,
    y: sigBoxY,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.75, 0.8, 0.88),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1),
  });
  page2.drawText('[ Area Tanda Tangan Pegawai ]', {
    x: leftX + 10,
    y: sigBoxY + 28,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.72),
  });

  page2.drawRectangle({
    x: rightX - 10,
    y: sigBoxY,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.75, 0.8, 0.88),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1),
  });
  page2.drawText('[ Area Tanda Tangan Penilai ]', {
    x: rightX + 12,
    y: sigBoxY + 28,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.72),
  });

  const nameY = sigBoxY - 20;

  // Employee name
  page2.drawText('SARIPAH, S.Pd.', {
    x: leftX,
    y: nameY,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page2.drawLine({
    start: { x: leftX, y: nameY - 2 },
    end: { x: leftX + 140, y: nameY - 2 },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });
  page2.drawText('NIP. 19850714 201001 2 018', {
    x: leftX,
    y: nameY - 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Assessor name
  page2.drawText('MUSTAMIUDDIN, M.Pd.', {
    x: rightX,
    y: nameY,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page2.drawLine({
    start: { x: rightX, y: nameY - 2 },
    end: { x: rightX + 145, y: nameY - 2 },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });
  page2.drawText('NIP. 19740312 199803 1 004', {
    x: rightX,
    y: nameY - 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Footer page 2
  page2.drawText('Halaman 2 dari 2 — Dokumen Resmi Kepegawaian RI (SKP)', {
    x: margin,
    y: 25,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

/**
 * Creates default sample signature for Saripah, S.Pd.
 * Returns a high-res transparent PNG data URL of an elegant signature.
 */
export function generateDefaultSignature(name = 'Saripah, S.Pd.'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 150;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw smooth signature curves
  ctx.strokeStyle = '#1e3a8a'; // Deep official blue ink
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Elegant cursive initial 'N'
  ctx.moveTo(40, 110);
  ctx.quadraticCurveTo(55, 30, 70, 35);
  ctx.bezierCurveTo(80, 40, 75, 115, 80, 115);
  ctx.bezierCurveTo(90, 80, 110, 45, 125, 45);
  ctx.bezierCurveTo(140, 45, 130, 105, 135, 105);

  // 'o' loop
  ctx.bezierCurveTo(145, 75, 160, 75, 160, 90);
  ctx.bezierCurveTo(160, 105, 145, 105, 155, 95);

  // 'v' & 'a'
  ctx.bezierCurveTo(165, 85, 175, 105, 185, 85);
  ctx.bezierCurveTo(195, 75, 205, 100, 215, 85);

  // Swoop flourish to 'K'
  ctx.bezierCurveTo(235, 60, 245, 40, 255, 35);
  ctx.bezierCurveTo(250, 60, 245, 110, 250, 110);
  ctx.moveTo(270, 55);
  ctx.bezierCurveTo(255, 80, 260, 85, 280, 110);

  // Tail underline flourish
  ctx.moveTo(50, 122);
  ctx.bezierCurveTo(120, 132, 260, 126, 350, 105);
  ctx.bezierCurveTo(365, 100, 370, 95, 360, 105);
  ctx.stroke();

  // Dot / flourish
  ctx.beginPath();
  ctx.arc(365, 98, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();

  return canvas.toDataURL('image/png');
}
