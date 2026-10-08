# Bimska — Frontend (GitHub Pages)

```
index.html          ← halaman utama (harus berada di root repository)
css/style.css       ← gaya
js/config.js        ← ★ satu-satunya berkas yang perlu diedit: GAS_URL
js/api.js           ← komunikasi ke Apps Script
js/core.js          ← inti aplikasi, navigasi, login, pemantau real-time
js/pages-utama.js   ← beranda, daftar mahasiswa, tahapan, surat tugas
js/pages-bimbingan.js ← revisi dokumen, penampil dokumen, bimbingan, diskusi, medali, token, pengaturan
js/aksi.js          ← formulir, tombol, dan penjalan aplikasi
```

## Konfigurasi
Buka `js/config.js`, ganti `GAS_URL` dengan URL Web App Apps Script (berakhiran `/exec`), simpan, lalu push.

## Memperbarui
```
git add .
git commit -m "Deskripsi perubahan"
git push
```
Bila perubahan tidak tampak: tekan **Ctrl+Shift+R**, atau naikkan angka `?v=` pada tag `<script>`/`<link>` di `index.html`.

Panduan lengkap: `PANDUAN-INSTALASI.md`.

> A little project by Siska, Fasilkom
