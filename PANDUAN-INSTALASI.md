# Panduan Instalasi — Bimska (Frontend GitHub Pages + Backend Apps Script)

> Backend (Apps Script) dan frontend (GitHub Pages) dipasang terpisah. Kerjakan **A → B → C → D** berurutan.

```
 Browser ──► GitHub Pages (index.html, css/, js/)  ──fetch POST──►  Apps Script /exec (JSON)  ──►  Google Sheets & Drive
```

## A. Backend — perbarui proyek Apps Script yang sudah ada
Data lama (Sheets/Drive) **tidak berubah**. Yang diganti hanya kodenya.
1. Buka proyek Apps Script Bimska → file **`Kode`** → hapus seluruh isi → tempel isi **`Kode.gs`** (berkas terpisah, bukan dari ZIP) → simpan.
2. Hapus file yang tidak dipakai lagi: **`Index`**, **`Stylesheet`**, **`Klien`** (titik tiga di samping nama file → Remove). Aman dilewati, tetapi sebaiknya dihapus.
3. Pilih fungsi **`setupAppEnvironment`** → Run (aman diulang; tidak membuat data ganda).
4. Pilih fungsi **`cekApi`** → Run → buka *Execution log*: pastikan baris `Uji doPost : OK` muncul, dan salin **URL Web App** yang berakhiran `/exec`.
5. **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.**
   Pengaturan wajib: *Execute as* **Me**, *Who has access* **Anyone**. URL `/exec` tetap sama.
6. Uji: buka URL `/exec` di tab baru. Harus tampil teks JSON: `"app":"Bimska API"`.

## B. Frontend — isi konfigurasi
1. Ekstrak `bimska-frontend.zip` → muncul folder **`bimska`**. Folder inilah folder kerja (tempat `git init`).
2. Buka `bimska\js\config.js` dengan Notepad → ganti `ISI_DENGAN_ID_DEPLOYMENT`… seluruh `GAS_URL` dengan URL `/exec` dari langkah A4 → simpan.

## C. Push ke GitHub
Wajib lewat terminal (jangan "Upload files" di web GitHub — struktur folder `css/` dan `js/` akan rusak).
1. Pasang Git: <https://git-scm.com/download/win> (pengaturan default). Cek: `git --version`.
2. Buat akun & repository **Public** bernama mis. `bimska` di github.com (jangan centang README/.gitignore/license).
3. Buka PowerShell **di dalam folder `bimska`** (File Explorer → klik address bar → ketik `powershell` → Enter). Cek `dir`: **`index.html` harus terlihat**, juga folder `css` dan `js`.
4. Perintah (satu per satu):
```
git config --global user.name "Nama Anda"
git config --global user.email "email@akun-github.com"
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/bimska.git
git push -u origin main
```
5. Saat diminta password: tempel **Personal Access Token** (github.com/settings/tokens → *Generate new token (classic)* → centang **repo**). Layar kosong saat paste itu normal.

## D. Aktifkan GitHub Pages
Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch **main** / **(root)** → **Save** → tunggu 1–2 menit.
Situs: `https://USERNAME.github.io/bimska/`. Masuk memakai email & kata sandi yang sama seperti sebelumnya.

## Memperbarui di kemudian hari
Frontend: edit berkas → `git add .` → `git commit -m "..."` → `git push` → **Ctrl+Shift+R**.
Backend: tempel kode baru → **Deploy → New version** (menyimpan saja tidak memperbarui `/exec`).

## Masalah umum
| Gejala | Penyebab / solusi |
|---|---|
| "GAS_URL belum diisi" | `js/config.js` belum diedit → isi URL `/exec`, lalu add/commit/push |
| "Server mengembalikan respons tak terduga" | Deploy belum *Execute as: Me* + *Anyone*, atau belum deploy versi baru |
| "Tidak dapat menghubungi server" | URL salah / koneksi putus / tab di-block ekstensi |
| Halaman 404 di GitHub Pages | `index.html` tidak di root repo (git init di folder yang salah) |
| Tampil tanpa gaya | folder `css/` & `js/` tidak ikut ter-push (jangan upload via web) |
| Perubahan tidak muncul | Ctrl+Shift+R, atau naikkan angka `?v=` di `index.html` |
| Semua pengguna diminta masuk ulang | Wajar sekali setelah pindah alamat (sesi tersimpan per alamat situs) |

## Catatan keamanan
Repository publik hanya berisi kode antarmuka dan URL API (yang memang publik). Data tetap di Google Sheets milik dosen; akses dilindungi kata sandi dan token sesi. Hanya fungsi yang terdaftar di `API_ALLOW` (Kode.gs) yang dapat dipanggil dari luar; fungsi setup, data contoh, dan trigger tidak terbuka.
