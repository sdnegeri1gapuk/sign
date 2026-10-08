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

/**
 * Generates an authentic Indonesian Ijazah Sekolah Dasar (SD) PDF document
 * with real text layers matching the official Indonesian national diploma layout:
 * - Top-right: Nomor Ijazah: DN-01/D-SD/K13/23/0012345
 * - Title: SURAT TANDA TAMAT BELAJAR / IJAZAH SEKOLAH DASAR
 * - Student Name: Ahmad Fauzi
 * - Bottom-right: Gapuk, 15 Juni 2024 (signing date) & Kepala Sekolah signature
 */
export async function generateSampleIjazahPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const a4Width = 595.28;
  const a4Height = 841.89;

  const page = pdfDoc.addPage([a4Width, a4Height]);
  const margin = 45;

  // Outer decorative border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: a4Width - 40,
    height: a4Height - 40,
    borderColor: rgb(0.2, 0.4, 0.25),
    borderWidth: 2,
    color: rgb(0.99, 1, 0.98),
  });

  // Inner border
  page.drawRectangle({
    x: 26,
    y: 26,
    width: a4Width - 52,
    height: a4Height - 52,
    borderColor: rgb(0.3, 0.55, 0.35),
    borderWidth: 1,
  });

  // Top-Right: Nomor Ijazah Box
  const noBoxX = a4Width - margin - 220;
  const noBoxY = a4Height - margin - 35;
  page.drawRectangle({
    x: noBoxX,
    y: noBoxY,
    width: 220,
    height: 30,
    borderColor: rgb(0.2, 0.35, 0.2),
    borderWidth: 1,
    color: rgb(0.95, 0.98, 0.95),
  });
  page.drawText('No. Ijazah: 111202663419179', {
    x: noBoxX + 10,
    y: noBoxY + 10,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.1),
  });

  let y = a4Height - margin - 60;

  // Kop / Garuda / Ministry
  const kop1 = 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI';
  const kop1W = fontBold.widthOfTextAtSize(kop1, 10);
  page.drawText(kop1, {
    x: (a4Width - kop1W) / 2,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.15),
  });
  y -= 15;

  const kop2 = 'REPUBLIK INDONESIA';
  const kop2W = fontBold.widthOfTextAtSize(kop2, 11);
  page.drawText(kop2, {
    x: (a4Width - kop2W) / 2,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.1),
  });
  y -= 25;

  // Title: IJAZAH SEKOLAH DASAR
  const title = 'IJAZAH SEKOLAH DASAR';
  const titleW = fontBold.widthOfTextAtSize(title, 16);
  page.drawText(title, {
    x: (a4Width - titleW) / 2,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.35, 0.15),
  });
  y -= 16;

  const subtitle = 'TAHUN PELAJARAN 2023/2024';
  const subW = fontRegular.widthOfTextAtSize(subtitle, 10);
  page.drawText(subtitle, {
    x: (a4Width - subW) / 2,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 30;

  // Body text
  const intro = 'Dengan ini menyatakan bahwa:';
  page.drawText(intro, {
    x: margin + 15,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 30;

  // Student Info Block
  const studentRows = [
    { label: 'nama', val: 'Ahmad Fauzi' },
    { label: 'tempat dan tanggal lahir', val: 'Gapuk, 12 Mei 2012' },
    { label: 'nama orang tua', val: 'Fauzi Rahman' },
    { label: 'nomor induk siswa', val: '1234' },
    { label: 'nomor induk siswa nasional', val: '0012345678' }
  ];

  for (const row of studentRows) {
    page.drawText(row.label, {
      x: margin + 25,
      y,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    page.drawText(`:  ${row.val}`, {
      x: margin + 180,
      y,
      size: 10,
      font: row.label === 'nama' ? fontBold : fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 22;
  }
  y -= 15;

  const lulusText = 'LULUS dari satuan pendidikan setelah memenuhi seluruh kriteria kelulusan sesuai dengan ketentuan.';
  page.drawText(lulusText, {
    x: margin + 15,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.15, 0.15, 0.15),
  });

  // Bottom-Right: Date and Signature of Kepala Sekolah
  const sigX = a4Width - margin - 190;
  let sigY = y - 60;

  // Tanggal Dokumen di tandatangani
  page.drawText('Gapuk, 14 Juli 2026', {
    x: sigX,
    y: sigY,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.15, 0.15, 0.15),
  });
  sigY -= 15;

  page.drawText('Kepala Sekolah,', {
    x: sigX,
    y: sigY,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.15, 0.15, 0.15),
  });
  sigY -= 55;

  // Pejabat name & NIP
  page.drawText('H. Masrun, S.Pd', {
    x: sigX,
    y: sigY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawLine({
    start: { x: sigX, y: sigY - 2 },
    end: { x: sigX + 130, y: sigY - 2 },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });
  sigY -= 14;

  page.drawText('NIP. 19680512 199303 1 008', {
    x: sigX,
    y: sigY,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  return await pdfDoc.save();
}

/**
 * Generates an authentic Indonesian Transkrip Nilai SD PDF document
 * matching the official template from SD Negeri 1 Gapuk:
 * - Header: PEMERINTAH KABUPATEN LOMBOK TIMUR / SD NEGERI 1 GAPUK
 * - Title: TRANSRKIP NILAI
 * - Nomor: 400.3.11.3/009/SDN1GPK/VI/2026
 * - Nama Lengkap : AL-JAUZA'I
 * - Tanggal Kelulusan : 14 Juli 2026
 * - Signature: Gapuk, 14 Juli 2026 / H. MASRUN, S.Pd.
 */
export async function generateSampleTranskripPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const a4Width = 595.28;
  const a4Height = 841.89;

  const page = pdfDoc.addPage([a4Width, a4Height]);
  const margin = 45;
  let y = a4Height - 40;

  // Header / Kop
  const h1 = 'PEMERINTAH KABUPATEN LOMBOK TIMUR';
  const h1W = fontBold.widthOfTextAtSize(h1, 11);
  page.drawText(h1, {
    x: (a4Width - h1W) / 2,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  const h2 = 'UPT DINAS DIKBUD KECAMATAN SURALAGA';
  const h2W = fontBold.widthOfTextAtSize(h2, 10);
  page.drawText(h2, {
    x: (a4Width - h2W) / 2,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 16;

  const h3 = 'SD NEGERI 1 GAPUK';
  const h3W = fontBold.widthOfTextAtSize(h3, 14);
  page.drawText(h3, {
    x: (a4Width - h3W) / 2,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 13;

  const h4 = 'Alamat : Jalan Labuan Lombok - Desa Gapuk Desa Gapuk Kec. Suralaga Kab. Lombok Timur KP. 83659';
  const h4W = fontRegular.widthOfTextAtSize(h4, 7.5);
  page.drawText(h4, {
    x: (a4Width - h4W) / 2,
    y,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 8;

  // Divider line
  page.drawLine({
    start: { x: margin, y },
    end: { x: a4Width - margin, y },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });
  y -= 24;

  // Title: TRANSRKIP NILAI
  const title = 'TRANSRKIP NILAI';
  const titleW = fontBold.widthOfTextAtSize(title, 13);
  page.drawText(title, {
    x: (a4Width - titleW) / 2,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 15;

  const noStr = 'Nomor : 400.3.11.3/035/SDN1GPK/VI/2026';
  const noW = fontRegular.widthOfTextAtSize(noStr, 10);
  page.drawText(noStr, {
    x: (a4Width - noW) / 2,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Bio Info Block
  const bio = [
    { label: 'Nama Sekolah', val: 'SD NEGERI 1 GAPUK' },
    { label: 'NPSN', val: '50202149' },
    { label: 'Nama Lengkap', val: "AL-JAUZA'I" },
    { label: 'Tempat, Tanggal Lahir', val: 'GAPUK, 25 November 2013' },
    { label: 'Nomor Induk Siswa Nasional', val: '0138288565' },
    { label: 'Tanggal Kelulusan', val: '14 Juli 2026' }
  ];

  for (const b of bio) {
    page.drawText(b.label, {
      x: margin + 10,
      y,
      size: 9.5,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
    page.drawText(`:   ${b.val}`, {
      x: margin + 175,
      y,
      size: 9.5,
      font: b.label === 'Nama Lengkap' ? fontBold : fontRegular,
      color: rgb(0, 0, 0),
    });
    y -= 18;
  }
  y -= 15;

  // Grades Table Header
  const tableX = margin + 10;
  const tableW = a4Width - (margin + 10) * 2;
  page.drawRectangle({
    x: tableX,
    y: y - 20,
    width: tableW,
    height: 20,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
    color: rgb(0.95, 0.95, 0.95),
  });
  page.drawText('NO', { x: tableX + 8, y: y - 14, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText('MATA PELAJARAN', { x: tableX + 90, y: y - 14, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText('NILAI', { x: tableX + tableW - 60, y: y - 14, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  y -= 20;

  const subjects = [
    { no: '1.', name: 'Pendidikan Agama dan Budi Pekerti', val: '74,00' },
    { no: '2.', name: 'Pendidikan Pancasila', val: '77,40' },
    { no: '3.', name: 'Bahasa Indonesia', val: '74,88' },
    { no: '4.', name: 'Matematika', val: '73,88' },
    { no: '5.', name: 'Ilmu Pengetahuan Alam dan Sosial', val: '73,04' },
    { no: '6.', name: 'Seni Musik', val: '79,16' },
    { no: '7.', name: 'Pendidikan Jasmani, Olahraga dan Kesehatan', val: '78,40' },
    { no: '8.', name: 'Bahasa Inggris', val: '84,80' }
  ];

  for (const s of subjects) {
    page.drawRectangle({
      x: tableX,
      y: y - 18,
      width: tableW,
      height: 18,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.8,
    });
    page.drawText(s.no, { x: tableX + 8, y: y - 13, size: 8, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawText(s.name, { x: tableX + 40, y: y - 13, size: 8, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawText(s.val, { x: tableX + tableW - 55, y: y - 13, size: 8, font: fontRegular, color: rgb(0, 0, 0) });
    y -= 18;
  }

  // Rata-rata row
  page.drawRectangle({
    x: tableX,
    y: y - 18,
    width: tableW,
    height: 18,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.8,
    color: rgb(0.97, 0.97, 0.97),
  });
  page.drawText('Rata-rata', { x: tableX + 160, y: y - 13, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText('76,95', { x: tableX + tableW - 55, y: y - 13, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  y -= 45;

  // Signature Block Bottom-Right
  const sigX = a4Width - margin - 170;
  page.drawText('Gapuk, 14 Juli 2026', { x: sigX, y, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
  y -= 13;
  page.drawText('Kepala Sekolah,', { x: sigX, y, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
  y -= 55;
  page.drawText('H. MASRUN, S.Pd.', { x: sigX, y, size: 9.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawLine({
    start: { x: sigX, y: y - 2 },
    end: { x: sigX + 115, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 13;
  page.drawText('NIP. 196812311988031141', { x: sigX, y, size: 8, font: fontRegular, color: rgb(0, 0, 0) });

  return await pdfDoc.save();
}
