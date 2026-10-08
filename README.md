# Bimska — Frontend (GitHub Pages)

Aplikasi bimbingan skripsi UNSIKA Fasilkom. Antarmuka statis (HTML/CSS/JS) yang memanggil backend
**Google Apps Script** (REST API) lewat `fetch()`. Data tersimpan di Google Sheets & Drive milik dosen.

```
index.html              ← halaman utama (harus di root repository)
css/style.css           ← CSS siap pakai (reset + komponen + utilitas); tanpa Tailwind CDN
js/config.js            ← ★ satu-satunya berkas yang Anda edit: GAS_URL  (contoh: config.example.js)
js/api.js               ← komunikasi ke Apps Script (+ memulai sesi paling awal)
js/swr.js               ← cache cepat: tampil dulu, segarkan di belakang · prefetch · snapshot · unggah latar belakang
js/core.js              ← inti: navigasi, login, pemantau real-time
js/pages-utama.js       ← beranda, mahasiswa, tahapan, surat tugas
js/pages-bimbingan.js   ← revisi dokumen, penampil, bimbingan, diskusi, medali, token, pengaturan
js/aksi.js              ← formulir, tombol, dan penjalan aplikasi
```

## Cara kerja cepatnya
- Halaman tampil **seketika dari cache**, lalu data disegarkan di belakang layar; layar hanya berganti bila datanya berubah.
- Setelah masuk, data halaman lain dimuat di belakang dengan **satu permintaan batch**; menyentuh menu juga memanaskan datanya.
- Muat ulang (F5) langsung menampilkan halaman terakhir dari snapshot sesi (tersimpan di tab saja; dihapus saat keluar).
- Unggah berkas berjalan di latar belakang; layar langsung bebas.

## Memperbarui
```
git add .
git commit -m "Deskripsi perubahan"
git push
```
Bila perubahan tidak tampak: **Ctrl+Shift+R**, atau naikkan angka `?v=` pada tag `<script>`/`<link>` di `index.html`.
Catatan: `css/style.css` adalah hasil kompilasi. Bila kelak menambah kelas utilitas gaya-Tailwind baru pada JS, CSS-nya perlu dibangkitkan ulang.

> A little project by Siska, Fasilkom
