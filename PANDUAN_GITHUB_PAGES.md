# Panduan Deploy ke GitHub Pages (SignPDF)

Aplikasi **SignPDF** telah disesuaikan 100% untuk berjalan secara online menggunakan **GitHub Pages**.

---

## 🛠️ Penyesuaian yang Sudah Dilakukan di Aplikasi

1. **Base URL Relatif (`base: './'`)**:
   Dikonfigurasi di `vite.config.ts` sehingga seluruh file CSS, Javascript, dan PDF Worker dapat dimuat dengan baik di `https://username.github.io/nama-repo/` maupun custom domain.
2. **Koneksi Firebase Firestore Cloud**:
   Konfigurasi Firebase terintegrasi otomatis di sisi client (frontend), sehingga database tanda tangan online tetap sinkron dan dapat diakses dari mana saja tanpa perlu server terpisah.
3. **Workflow GitHub Actions Otomatis (`.github/workflows/deploy.yml`)**:
   Setiap kali Anda melakukan push ke branch `main` atau `master`, GitHub akan otomatis meng-compile dan meng-onlinekan aplikasi Anda secara gratis.

---

## 🚀 Langkah-langkah Mengonlinekan via GitHub Pages

### Langkah 1: Buat Repository di GitHub
1. Buka [github.com](https://github.com) dan login ke akun Anda.
2. Klik tombol **New** (atau **+** di pojok kanan atas) untuk membuat repository baru.
3. Beri nama repository, misalnya: `signpdf` atau `tanda-tangan-pdf`.
4. Pilih **Public**.
5. Klik **Create repository**.

---

### Langkah 2: Upload / Push Kode ke GitHub
Buka terminal/command prompt di komputer Anda pada folder proyek ini, lalu jalankan perintah:

```bash
# 1. Inisialisasi git (jika belum)
git init

# 2. Tambahkan semua file
git add .

# 3. Commit
git commit -m "feat: inisialisasi aplikasi signpdf siap deploy ke github pages"

# 4. Ganti branch utama ke main
git branch -M main

# 5. Hubungkan ke repository GitHub Anda (ganti username dan nama-repo)
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git

# 6. Push kode ke GitHub
git push -u origin main
```

---

### Langkah 3: Aktifkan GitHub Actions untuk Pages
1. Di halaman repository GitHub Anda, buka tab **Settings** (Pengaturan).
2. Di menu sebelah kiri, klik **Pages**.
3. Pada bagian **Build and deployment**:
   - Di dropdown **Source**, pilih: **`GitHub Actions`** (Bukan "Deploy from a branch").
4. Selesai!

---

### Langkah 4: Tunggu Proses Deploy Selesai
1. Buka tab **Actions** di bagian atas repository GitHub Anda.
2. Anda akan melihat workflow **Deploy to GitHub Pages** sedang berjalan.
3. Tunggu sekitar 1–2 menit sampai muncul centang hijau (Success).
4. Klik workflow tersebut atau kembali ke tab **Settings > Pages** untuk melihat URL website Anda, contohnya:
   **`https://username.github.io/nama-repo/`**

---

### (Opsional) Langkah 5: Daftarkan Domain di Firebase (Jika Menggunakan Google Sign-in)
Jika Anda menggunakan fitur login Google pada Firebase:
1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Pilih project Anda (`gen-lang-client-0620141478`).
3. Masuk ke **Authentication** > tab **Settings** > **Authorized domains**.
4. Klik **Add domain**, lalu masukkan: `username.github.io`.
5. Klik **Save**.
*(Catatan: Untuk penyimpanan tanda tangan Firestore biasa, fitur sudah langsung aktif tanpa perlu setting tambahan).*
