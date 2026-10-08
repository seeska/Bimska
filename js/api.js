'use strict';
/**
 * Transport ke backend Google Apps Script (REST via fetch).
 * - POST text/plain  → "permintaan sederhana", tidak memicu preflight CORS yang diblok Apps Script.
 * - Body: {"fn":"namaFungsi","args":[...]}  ·  Balasan: {success, data, message, ver?}
 * Tidak memakai google.script.run, iframe, maupun HtmlService.
 */
const GAS_OK = (function () {
  const u = String(typeof GAS_URL === 'undefined' ? '' : GAS_URL).trim();
  if (/ISI_DENGAN/.test(u)) return false;
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u);   // alamat lokal hanya untuk uji
})();

async function gasCall(fn, args, opt) {
  opt = opt || {};
  if (!GAS_OK) throw new Error('GAS_URL belum diisi. Buka js/config.js dan tempel URL /exec dari Apps Script.');
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), opt.timeout || 45000);
  let res;
  try {
    res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args || [] }), signal: ctl.signal, redirect: 'follow' });
  } catch (e) {
    clearTimeout(tm);
    throw new Error(e && e.name === 'AbortError' ? 'Server tidak merespons. Periksa koneksi, lalu coba lagi.' : 'Tidak dapat menghubungi server. Periksa koneksi internet dan nilai GAS_URL di js/config.js.');
  }
  clearTimeout(tm);
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('Server mengembalikan respons tak terduga. Pastikan Web App di-deploy dengan "Execute as: Me" dan "Who has access: Anyone", lalu deploy versi baru.'); }
}

/** Mulai sesi + dashboard SEKARANG (paralel dengan pemuatan skrip lain) → menghemat satu putaran ke server. */
window.__initP = (function () {
  if (!GAS_OK) return Promise.resolve({ success: false, message: 'GAS_URL belum diisi.' });
  let tok = null; try { tok = sessionStorage.getItem('bim_tok'); } catch (e) { /* abaikan */ }
  return gasCall('initApp', [tok]).catch(e => ({ success: false, message: e.message }));
})();
