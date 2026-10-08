'use strict';
/**
 * Lapisan data cepat — prinsip gas-instant-ux (SPA instan · optimistic UI · cache · batch):
 *  1) Halaman tampil SEKETIKA dari cache (0 ms), lalu disegarkan di belakang layar (stale-while-revalidate).
 *  2) Layar diperbarui hanya bila data benar-benar berubah (tidak ada kedip / skeleton ulang).
 *  3) Prefetch halaman berikutnya dengan SATU permintaan batch + saat kursor/jari menyentuh menu.
 *  4) Snapshot sesi disimpan di sessionStorage: muat-ulang langsung terisi, server memvalidasi sesudahnya.
 */
const DC = {};                 // cache: kunci → { v: nilai, t: waktu, p: promise sedang berjalan }
const FRESH_MS = 20000;        // data dianggap segar selama 20 detik
const SRC = {                  // sumber data tiap kunci
  dash: () => apiA('getDashboard', false).then(d => { const stale = d.role === 'dosen' ? d.sum.stale : d.stale; if (stale) setTimeout(() => refreshDash(true), 60); return d; }),
  antrian: () => apiA('getAntrianDokumen'),
  sesi: () => apiA('getSesiAll'),
  threads: () => apiA('getThreads'),
  medali: () => apiA('getMedali'),
  token: () => apiA('listToken'),
  pengaturan: () => apiA('getPengaturan'),
  notif: () => apiA('getNotif')
};
const sourceOf = key => key.indexOf('det:') === 0 ? (() => apiA('getStudentDetail', isDosen() ? key.slice(4) : S.user.uid)) : SRC[key];
function keepPointers(key, v) {   // petunjuk sinkron untuk kode yang membaca langsung (mis. filter daftar, optimistic UI)
  if (key === 'dash') S.dash = v; else if (key === 'sesi') S.sesiAll = v; else if (key === 'antrian') S.antrian = v;
  else if (key.indexOf('det:') === 0) S.det[key.slice(4)] = { t: Date.now(), d: v };
}
function putData(key, v, notify) {
  const prev = DC[key], changed = !prev || prev.v === undefined || JSON.stringify(prev.v) !== JSON.stringify(v);
  DC[key] = { v: v, t: Date.now(), p: null };
  keepPointers(key, v);
  if (changed) { saveSnapSoon(); if (notify && prev && prev.v !== undefined) dataChanged(key); }
  return changed;
}
function pull(key, opt, cold) {
  const cur = DC[key]; if (cur && cur.p) return cur.p;
  const f = (opt && opt.fetch) || sourceOf(key); if (!f) return Promise.reject(new Error('Sumber data tidak dikenal: ' + key));
  const p = f().then(v => { putData(key, v, !cold); return v; }, err => { const c = DC[key]; if (c) c.p = null; if (cold) throw err; });
  DC[key] = Object.assign(DC[key] || { v: undefined, t: 0 }, { p: p });
  return p;
}
/** Baca data: dari cache seketika bila ada (dan segarkan diam-diam bila basi); jika belum ada → tunggu server. */
function swr(key, opt) {
  opt = opt || {};
  if (!opt.quiet && S.curKeys) S.curKeys.add(key);
  const e = DC[key];
  if (e && e.v !== undefined && !opt.force) {
    if (Date.now() - e.t > (opt.fresh == null ? FRESH_MS : opt.fresh)) pull(key, opt, false);
    return Promise.resolve(e.v);
  }
  return pull(key, opt, true);
}
function markStale(prefix) { Object.keys(DC).forEach(k => { if (!prefix || k.indexOf(prefix) === 0) DC[k].t = 0; }); }
/** Segarkan semua data yang sedang dipakai halaman aktif (di belakang layar). */
function revalidateCurrent(force) {
  const ps = Array.from(S.curKeys || []).filter(k => DC[k] && sourceOf(k)).map(k => pull(k, {}, false));
  if (force) Promise.all(ps).then(() => softRefresh());
  return Promise.all(ps);
}
function dataChanged(key) { if (S.curKeys && S.curKeys.has(key)) softRefresh(); }
/** Gambar ulang halaman aktif tanpa animasi/skeleton, tanpa mengganggu yang sedang mengetik atau modal yang terbuka. */
function softRefresh() {
  clearTimeout(S._sr);
  S._sr = setTimeout(() => {
    const ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) { S.pendingRefresh = true; return; }
    if ($('#modalRoot .modal-card')) { S.needRefresh = true; return; }       // ditunda sampai dialog ditutup
    const y = window.scrollY; rerender(); setTimeout(() => window.scrollTo(0, y), 30);
  }, 40);
}
function clearData() { Object.keys(DC).forEach(k => delete DC[k]); S.dash = null; S.det = {}; S.sesiAll = null; S.antrian = null; S.docCache = {}; S.fileCache = {}; }

// ---- kunci data per halaman (untuk prefetch & penentu skeleton) ----
function pageKeys(page, params) {
  params = params || {}; const d = isDosen(), me = 'det:' + (S.user ? S.user.uid : '');
  switch (page) {
    case 'home': case 'mahasiswa': case 'rekap': return ['dash'];
    case 'surat': return d ? ['dash'] : [me];
    case 'tahapan': return [me];
    case 'detail': return params.uid ? ['det:' + params.uid] : [];
    case 'bimbingan': { const t = params.tab || S.bimTab; return t === 'revisi' ? (d ? ['antrian'] : [me]) : t === 'online' ? (d ? ['sesi'] : [me]) : (d ? ['threads'] : []); }
    case 'medali': return ['medali'];
    case 'token': return ['token'];
    case 'pengaturan': return ['pengaturan'];
    case 'profil': return d ? [] : [me, 'dash'];
    default: return [];
  }
}
const hasData = keys => keys.every(k => DC[k] && DC[k].v !== undefined);
function prefetchPage(page, params) {
  pageKeys(page, params).forEach(k => { const e = DC[k]; if (!e || e.v === undefined || Date.now() - e.t > 30000) pull(k, {}, false); });
}
/** Satu permintaan batch untuk memanaskan cache halaman-halaman berikutnya. */
async function prefetchAll() {
  if (!S.tok || !S.user) return;
  const t = S.tok, uid = S.user.uid;
  const plan = isDosen() ? [['antrian', 'getAntrianDokumen', []], ['sesi', 'getSesiAll', []], ['medali', 'getMedali', []], ['threads', 'getThreads', []]]
    : [['det:' + uid, 'getStudentDetail', [uid]], ['medali', 'getMedali', []]];
  const need = plan.filter(p => !DC[p[0]] || DC[p[0]].v === undefined || Date.now() - DC[p[0]].t > 30000);
  if (!need.length) return;
  try {
    const res = await apiRaw({ silent: true }, 'batch', [need.map(p => ({ fn: p[1], args: [t].concat(p[2]) }))]);
    need.forEach((p, i) => { const r = res[i]; if (r && r.success) putData(p[0], r.data, true); });
  } catch (e) { /* prefetch gagal: tidak masalah, halaman akan memuat sendiri */ }
}
// ---- snapshot sesi (sessionStorage) ----
function saveSnapSoon() { clearTimeout(S._ss); S._ss = setTimeout(saveSnap, 700); }
function saveSnap() {
  try {
    if (!S.user || !S.tok) return;
    const cache = {}; let n = 0;
    Object.keys(DC).forEach(k => { if ((k === 'dash' || k === 'antrian' || k === 'sesi' || k === 'medali' || k === 'threads' || k.indexOf('det:') === 0) && DC[k].v !== undefined && n++ < 8) cache[k] = DC[k].v; });
    const s = JSON.stringify({ tok: S.tok, user: S.user, meta: S.meta, badge: S.badge, notif: S.notifUnread, ver: S.ver, page: S.page, params: S.params, cache: cache });
    if (s.length < 3500000) sessionStorage.setItem('bim_snap', s);
  } catch (e) { /* kuota penuh: abaikan */ }
}
// simpan juga saat tab ditutup / dimuat ulang / disembunyikan, agar halaman terakhir pasti terekam
window.addEventListener('pagehide', () => saveSnap());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveSnap(); });
function loadSnap() { try { return JSON.parse(sessionStorage.getItem('bim_snap') || 'null'); } catch (e) { return null; } }
function clearSnap() { try { sessionStorage.removeItem('bim_snap'); } catch (e) { /* abaikan */ } }
// ---- tugas latar belakang (unggah berkas): UI tidak menunggu ----
function runJob(label, fn, done) {
  const el = $('#jobPill'); S.jobs = (S.jobs || 0) + 1;
  const show = (html, cls) => { el.className = 'job-pill on ' + (cls || ''); el.innerHTML = html; };
  const attempt = () => {
    show(`<span class="spinner"></span><span>${esc(label)}</span>`);
    return fn().then(r => {
      S.jobs = Math.max(0, S.jobs - 1);
      if (S.jobs === 0) { show(`${icon('check_circle', 'text-mintink')}<span>Selesai</span>`); setTimeout(() => { if (!S.jobs) el.className = 'job-pill'; }, 1800); }
      if (done) done(r);
    }).catch(e => {
      S.jobs = Math.max(0, S.jobs - 1);
      if (e.message === 'SESI_HABIS') { el.className = 'job-pill'; return; }
      S._jobRetry = () => { S.jobs++; attempt(); };
      show(`${icon('error')}<span>${esc(e.message)}</span><button class="btn btn-soft btn-sm" data-act="jobRetry">Coba lagi</button><button class="icon-btn !h-8 !w-8" data-act="jobClose" aria-label="Tutup">${icon('close', '!text-base')}</button>`, 'err');
    });
  };
  return attempt();
}
