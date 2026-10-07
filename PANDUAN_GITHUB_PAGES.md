# Solusi Memperbaiki Deploy GitHub Pages (Error Merah / Failed)

Jika saat push muncul tanda **silang merah (❌ Failed)** pada tab Actions seperti gambar yang Anda kirimkan, berikut penyebab dan cara mengatasinya dalam 1 menit:

---

## 🔴 Penyebab Utama:
Secara default, GitHub mengatur pengaturan Pages ke **"Deploy from a branch"** (Bukan GitHub Actions).
Akibatnya, GitHub menolak aksi deployment otomatis dan menyebabkan proses berhenti (*Failed*).

---

## ✅ CARA MEMPERBAIKI (Pilih Cara 1 atau Cara 2)

### Cara 1: Mengaktifkan Izin GitHub Actions di Pengaturan Repo (Rekomendasi)

1. Buka repository GitHub Anda di browser: `https://github.com/sdnegeri1gapuk/[nama-repo]`
2. Klik tab **Settings** (Pengaturan di pojok kanan atas repo).
3. Di menu sidebar sebelah kiri, klik menu **Pages**.
4. Pada bagian **Build and deployment**:
   - Di bawah tulisan **Source**, klik dropdown yang awalnya bertuliskan *"Deploy from a branch"*.
   - Ubah dan pilih: **`GitHub Actions`**.
5. Di sidebar kiri, klik menu **Actions** > **General**:
   - Scroll ke bawah ke bagian **Workflow permissions**.
   - Pastikan terpilih: **`Read and write permissions`**.
   - Klik **Save**.
6. Sekarang buka tab **Actions** di atas repo:
   - Klik workflow yang gagal tadi.
   - Klik tombol **Re-run jobs** > **Re-run all jobs** (atau lakukan git push ulang).
   - Workflow akan otomatis berjalan dan berubah menjadi **Centang Hijau (Success) ✅**!

---

### Cara 2: Deploy Langsung 1-Klik via Terminal (Tanpa Perlu Setup Actions)

Kami telah menambahkan alat `gh-pages` ke dalam proyek Anda. Anda bisa langsung meng-onlinekan aplikasi langsung dari terminal laptop/komputer Anda:

Jalankan perintah ini di terminal:
```bash
npm run deploy
```

Perintah di atas akan otomatis meng-compile dan meng-upload aplikasi ke branch `gh-pages`.
Lalu di **Settings > Pages**, pilih Source: **Deploy from a branch** dan pilih branch: **`gh-pages`**. Selesai!

---

## 📦 File Workflow yang Sudah Kami Perbaiki:
File `.github/workflows/deploy.yml` telah kami perbarui dengan perbaikan berikut:
1. Menghapus ketergantungan cache lockfile yang rentan error.
2. Menggunakan Node.js 20 LTS yang stabil di runner Ubuntu GitHub.
3. Menambahkan flag `--legacy-peer-deps --no-audit --no-fund` agar instalasi dependensi tidak pernah gagal.
4. Menambahkan fallback `404.html` otomatis agar routing SPA tidak error saat halaman di-refresh.
