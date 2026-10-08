/**
 * KONFIGURASI BIMSKA — satu-satunya berkas yang perlu Anda edit.
 *
 * Tempel URL Web App Google Apps Script (berakhiran /exec) pada GAS_URL.
 * Cara mendapatkannya: Apps Script → Deploy → Manage deployments → salin "Web app URL",
 * atau jalankan fungsi cekApi() lalu lihat Execution log.
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz24PXjnjBLo1y-_I5JG2T-_A_6nKB4UPEG31CxzNvmAq0TTDO4oaApod90nxJLQuo/exec';

/** Jeda pemeriksaan pembaruan otomatis (milidetik). Lebih besar = hemat kuota Apps Script. */
const POLL_MS = 20000;
