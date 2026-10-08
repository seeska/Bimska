# Panduan — Bimska (Frontend GitHub Pages + Backend Apps Script)

```
Browser ──► GitHub Pages (index.html, css/, js/) ──fetch POST──► Apps Script /exec (JSON) ──► Google Sheets & Drive
```

# BAGIAN 1 — Memperbarui dari versi sebelumnya (UX instan)

## 1A. Backend (Apps Script) — tambah endpoint batch
1. Buka proyek Apps Script → file **`Kode`** → hapus seluruh isi → tempel isi **`Kode.gs`** yang baru → simpan.
2. **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.** (URL `/exec` tetap sama.)
3. Uji: buka URL `/exec` di tab baru; harus tampil JSON dengan `"versi":"v5"`.
> Frontend baru tetap berjalan tanpa langkah ini, tetapi pemuatan awal di belakang layar (prefetch) baru aktif setelah backend diperbarui.

## 1B. Frontend — timpa berkas, URL Ibu tidak berubah
ZIP pembaruan **sengaja tidak berisi `js/config.js`**, sehingga `GAS_URL` Ibu aman.
1. Ekstrak `bimska-frontend-update.zip` (klik kanan → Extract All) ke folder sementara. Akan ada folder **`bimska`**.
2. Buka folder `bimska` hasil ekstraksi → **pilih semua isinya** (Ctrl+A) → salin (Ctrl+C).
3. Buka folder kerja lama Ibu (yang berisi `index.html` & `.git`, mis. `Downloads\bimska-frontend\bimska`) → tempel (Ctrl+V) → **Replace the files in the destination**.
4. Pastikan `js\config.js` lama Ibu masih ada dan `GAS_URL`-nya terisi (berkas `config.example.js` hanya contoh).
5. Di PowerShell **di dalam folder kerja itu** (cek `dir`: ada `index.html`, `css`, `js`), jalankan satu per satu:
```
git add .
git commit -m "Percepat UX: cache, prefetch, CSS statis"
git push
```
6. Tunggu 1–2 menit, buka situs, tekan **Ctrl+Shift+R** sekali.

# BAGIAN 2 — Instalasi baru dari nol (ringkas)
**Backend:** tempel `Kode.gs` ke Apps Script → jalankan `setupAppEnvironment` (sekali) → jalankan `cekApi` (salin URL `/exec`) → Deploy → New deployment → Web app → *Execute as* **Me**, *Who has access* **Anyone**.
**Frontend:** ekstrak ZIP → di folder `bimska`, salin `js/config.example.js` menjadi `js/config.js` → tempel URL `/exec` pada `GAS_URL` → buka PowerShell di folder itu (cek `dir`: `index.html` terlihat) → `git init`, `git add .`, `git commit -m "Upload pertama"`, `git branch -M main`, `git remote add origin https://github.com/USERNAME/NAMA-REPO.git`, `git push -u origin main` (password = Personal Access Token, scope **repo**) → repo **Settings → Pages** → *Deploy from a branch* → **main** / **(root)**.

# Masalah umum
| Gejala | Penyebab / solusi |
|---|---|
| "GAS_URL belum diisi" | `js/config.js` hilang/tertimpa → isi lagi URL `/exec`, lalu add/commit/push |
| Tampilan lama / tidak berubah | Ctrl+Shift+R; atau naikkan angka `?v=` di `index.html` |
| "Server mengembalikan respons tak terduga" | Deploy belum *Execute as: Me* + *Anyone*, atau belum New version |
| Halaman 404 | `index.html` tidak di root repo (git init di folder yang salah) |
| Tanpa gaya / ikon berupa teks | folder `css/` atau `js/` tidak ikut ter-push; atau font Google diblokir jaringan |
| Data tampak lama sesaat setelah buka | Wajar: tampil dari cache lalu disegarkan otomatis dalam ±1–2 detik |
| Harus masuk ulang setelah menutup tab | Wajar: sesi & snapshot hanya disimpan selama tab terbuka (keamanan perangkat bersama) |

# Catatan keamanan
Snapshot cache hanya di `sessionStorage` tab itu dan dihapus saat keluar atau sesi berakhir. Hanya fungsi di `API_ALLOW` yang dapat dipanggil dari luar; setup, data contoh, dan trigger tidak terbuka.
