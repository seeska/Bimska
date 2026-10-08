'use strict';
/**
 * ============================================================
 * BIMSKA — Frontend (JavaScript.html)
 * SPA murni: URL tidak pernah berubah, token sesi hanya di memori
 * (sessionStorage opsional), navigasi lewat go(), data via fetch() ke Google Apps Script (lihat api.js).
 * ============================================================
 */

// ════════ BAGIAN 1: STATE & UTILITAS ════════
const S = { tok: null, user: null, page: 'home', params: {}, nav: 0, busy: 0, dash: null, dashAt: 0, det: {}, fl: { f: 'all', q: '' }, tab: 'tahapan', charts: {}, meta: { totalTahap: 16, ambang: { urgent: 7, tidakAktif: 14 } }, notifUnread: 0, ver: '', seen: {}, poll: null, polling: false, pendingRefresh: false, viewer: null, docCache: {}, fileCache: {}, hist: { n: 10, month: 'all' }, rk: 'belum', bimTab: 'revisi', rvF: 'periksa', badge: { rev: 0, chat: 0 }, stF: { jenis: 'all', status: 'all' }, bTab: 'mendatang', auth: {}, redraw: null, blobUrls: [], pdfLib: null };
const NB = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const AMP = String.fromCharCode(38);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': AMP + 'amp;', '<': AMP + 'lt;', '>': AMP + 'gt;', '"': AMP + 'quot;', "'": AMP + '#39;' }[c]));
const icon = (n, c) => `<span class="material-symbols-outlined ${c || ''}" aria-hidden="true">${n}</span>`;
const first = n => String(n || '').trim().split(/\s+/)[0] || '';
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase();
const toneOf = s => { let h = 0; String(s).split('').forEach(ch => h = (h * 31 + ch.charCodeAt(0)) % 4); return h; };
const isDosen = () => S.user && S.user.role === 'dosen';
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function tgl(s, noYear) { if (!s) return '-'; const p = String(s).substring(0, 10).split('-'); return (+p[2]) + ' ' + NB[+p[1] - 1] + (noYear ? '' : ' ' + p[0]); }
function tglJam(s) { if (!s) return '-'; const p = String(s).split(' '); return tgl(p[0], true) + (p[1] ? ', ' + p[1] : ''); }
function sisaTxt(n) { if (n == null) return '-'; if (n < 0) return 'Lewat ' + (-n) + ' hari'; if (n === 0) return 'Hari ini'; return n + ' hari lagi'; }
function lalu(s) {
  if (!s) return ''; const d = new Date(String(s).replace(' ', 'T')); const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; if (m < 1440) return Math.round(m / 60) + ' jam lalu';
  const h = Math.round(m / 1440); return h === 1 ? 'kemarin' : h + ' hari lalu';
}

const TAHAP_CHIP = { 'Selesai': ['mint', 'check_circle'], 'Sedang berjalan': ['sky', 'pulse'], 'Perlu revisi': ['rose', 'error'], 'Belum dimulai': ['slate', 'radio_button_unchecked'] };
const ST_CHIP = { 'Aktif': ['mint', 'verified'], 'Segera habis': ['gold', 'schedule'], 'Kedaluwarsa': ['rose', 'event_busy'], 'Diperbarui': ['slate', 'update'] };
const LBL_CHIP = { 'Sudah direvisi': ['mint', 'task_alt'], 'Belum direvisi': ['rose', 'edit_note'], 'Disetujui': ['mint', 'verified'] };
const PUB_CHIP = { 'Menentukan jurnal': ['slate', 'search'], 'Menulis naskah': ['sky', 'edit'], 'Sudah disubmit': ['sky', 'send'], 'Dalam review': ['gold', 'hourglass_top'], 'Revisi dari reviewer': ['rose', 'rate_review'], 'Diterima (LoA terbit)': ['mint', 'verified'], 'Terbit': ['mint', 'menu_book'] };
const SES_CHIP = { 'Valid': ['mint', 'check_circle'], 'Dijadwalkan': ['sky', 'event'], 'Batal': ['slate', 'cancel'] };
function chip(map, label, extra) {
  const m = map[label] || ['slate', 'info'];
  return `<span class="chip chip-${m[0]}">${m[1] === 'pulse' ? '<span class="pulse-dot"></span>' : icon(m[1])}${esc(label)}${extra || ''}</span>`;
}
function avatar(x, size) {
  size = size || 52;
  const inner = x.foto ? `<img src="${esc(x.foto)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : esc(initials(x.nama));
  return `<span class="avatar tone-${toneOf(x.nama)}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .32)}px">${inner}${x.wisuda ? `<span class="crown" title="Sudah wisuda">${icon('school', 'ms-fill')}</span>` : ''}</span>`;
}
function ring(p, size, col) {
  size = size || 56; const r = size / 2 - 5, c = 2 * Math.PI * r, h = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring-${col || 'brand'}" role="img" aria-label="${p}%"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="5" class="ring-bg"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="5" stroke-linecap="round" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(100, p) / 100)}" transform="rotate(-90 ${h} ${h})"/></svg>`;
}
/** Katalog medali. Medali bertingkat (Perunggu/Perak/Emas) terbuka untuk SEMUA mahasiswa yang memenuhi syarat; XP yang membedakan. */
const TIER = ['', 'Perunggu', 'Perak', 'Emas'];
const MEDALS = {
  pemula: { n: 'Langkah Pertama', i: 'flag', c: 'sky', d: 'Menyelesaikan satu tahapan pertama.' },
  proposal: { n: 'Lolos Proposal', i: 'description', c: 'mint', d: 'Tahap Sidang proposal dinyatakan selesai.' },
  kolokium: { n: 'Lolos Kolokium', i: 'school', c: 'mint', d: 'Tahap Sidang kolokium dinyatakan selesai.' },
  publikasi: { n: 'Penulis Jurnal', i: 'menu_book', c: 'gold', d: 'Mengunggah LoA publikasi jurnal.' },
  mahkota: { n: 'Mahkota Wisuda', i: 'workspace_premium', c: 'gold', d: 'Menyelesaikan tahap Wisuda.' },
  kilat: { n: 'Kilat Revisi', i: 'electric_bolt', d: 'Rata-rata waktu mengerjakan catatan revisi (min. 2 catatan).', t: ['≤ 7 hari', '≤ 4 hari', '≤ 2 hari'] },
  rajin: { n: 'Rajin Bimbingan', i: 'event_available', d: 'Jumlah sesi bimbingan yang valid.', t: ['3 sesi', '6 sesi', '10 sesi'] },
  progres: { n: 'Penuntas Tahap', i: 'checklist', d: 'Jumlah tahapan yang sudah selesai.', t: ['3 tahap', '8 tahap', '14 tahap'] },
  cepat: { n: 'Cepat Tanggap', i: 'bolt', d: 'Kecepatan menyelesaikan tahap (min. 3 tahap selesai).', t: ['skor ≥ 50', 'skor ≥ 70', 'skor ≥ 90'] },
  streak: { n: 'Konsisten', i: 'local_fire_department', d: 'Streak mingguan beruntun: aktivitas revisi, kirim dokumen, atau bimbingan setiap minggu.', t: ['2 minggu', '4 minggu', '8 minggu'] },
  tuntas: { n: 'Revisi Tuntas', i: 'task_alt', d: 'Jumlah catatan dosen yang sudah disetujui.', t: ['5 catatan', '15 catatan', '30 catatan'] }
};
const parseMedal = e => { const p = String(e).split(':'); return { id: p[0], tier: +p[1] || 0 }; };
const medalTip = (id, tier, on) => { const m = MEDALS[id]; if (!m) return ''; return (on ? '' : 'Belum terbuka. ') + m.n + (m.t && tier ? ' · ' + TIER[tier] : '') + ' — ' + m.d + (m.t ? ' Perunggu ' + m.t[0] + ' · Perak ' + m.t[1] + ' · Emas ' + m.t[2] + '.' : ''); };
/** entry: 'kilat:2' (bertingkat) atau 'mahkota' (tonggak). */
const medalIcon = (entry, on, size) => {
  const p = parseMedal(entry), m = MEDALS[p.id]; if (!m) return '';
  const tier = on ? (m.t ? Math.max(1, p.tier) : 0) : 0, tip = medalTip(p.id, tier, on);
  const cls = on ? (m.t ? 'medal-t' + tier : 'medal-' + m.c) : '';
  return `<span class="medal ${cls} ${on ? '' : 'off'} ${size === 'lg' ? 'medal-lg' : ''}" tabindex="0" role="img" aria-label="${esc(tip)}" data-tip="${esc(tip)}">${icon(on ? m.i : 'lock', on ? 'ms-fill' : '')}</span>`;
};
const medalRow = (ids, max) => (ids || []).slice(0, max || 14).map(e => medalIcon(e, true)).join('');
const LV_ICON = ['eco', 'explore', 'science', 'shield', 'workspace_premium'], LV_TONE = ['slate', 'sky', 'mint', 'gold', 'rose'];
const levelChip = lv => lv ? `<span class="chip chip-${LV_TONE[lv.idx] || 'slate'}">${icon(LV_ICON[lv.idx] || 'eco')}${esc(lv.nama)}</span>` : '';
const streakChip = s => s && s.sekarang ? `<span class="chip chip-gold">${icon('local_fire_department')}${s.sekarang} mgg</span>` : '';
function xpCard(me) {
  if (!me || !me.level) return '';
  const lv = me.level, d = me.xpDetail || {};
  return `<div class="card p-4"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3"><span class="avatar tone-${[1, 1, 3, 2, 0][lv.idx]}" style="width:48px;height:48px;border-radius:1rem">${icon(LV_ICON[lv.idx], 'ms-fill')}</span><div><p class="text-[11px] font-bold uppercase tracking-wider text-ink2">Level kamu</p><b class="text-lg">${esc(lv.nama)}</b></div></div><div class="text-right"><b class="text-2xl text-brandtx">${me.xp}</b><span class="text-xs font-bold text-ink2"> XP</span></div></div>
    <div class="xp-bar mt-3" role="progressbar" aria-valuenow="${lv.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Kemajuan menuju level berikutnya"><i style="width:${lv.pct}%"></i></div>
    <p class="mt-1.5 text-xs text-ink2">${lv.next ? `${lv.sisa} XP lagi menuju <b>${esc(lv.next)}</b>` : 'Level tertinggi tercapai. Luar biasa!'}</p></div>`;
}
function streakCard(st) {
  if (!st) return '';
  const msg = st.aktifIni ? `Minggu ini sudah aktif. Pertahankan!` : st.sekarang > 0 ? `Minggu ini belum ada aktivitas. Kirim dokumen/revisi atau hadiri bimbingan sebelum Minggu agar streak tidak putus.` : 'Mulai streak-mu: lakukan satu aktivitas (kirim dokumen, centang revisi, atau bimbingan) minggu ini.';
  return `<div class="card p-4"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-3"><span class="avatar tone-2" style="width:48px;height:48px;border-radius:1rem">${icon('local_fire_department', 'ms-fill')}</span><div><p class="text-[11px] font-bold uppercase tracking-wider text-ink2">Streak mingguan</p><b class="text-lg">${st.sekarang} minggu beruntun</b></div></div><span class="chip chip-slate">Rekor ${st.terbaik}</span></div>
    <div class="wk-dots mt-3" role="img" aria-label="Aktivitas 8 minggu terakhir">${st.minggu.map((w, i) => `<span class="wk-dot ${w.on ? 'on' : ''} ${i === 7 ? 'now' : ''}" title="Minggu ${esc(tgl(w.k, true))}${w.on ? ' · aktif' : ''}"></span>`).join('')}</div><p class="mt-1.5 text-xs text-ink2">${msg}</p></div>`;
}
/** Label ringkas beberapa bab, mis. "Proposal · Bab 1–3". */
function tahapLabel(names) {
  names = (names || []).filter(Boolean); if (names.length <= 1) return names[0] || '-';
  const m = names.map(n => /^Bimbingan (proposal|skripsi): Bab (\d)$/.exec(n));
  if (m.every(Boolean) && m.every(x => x[1] === m[0][1])) {
    const nums = m.map(x => +x[2]).sort((a, b) => a - b), parts = []; let s = nums[0], p = nums[0];
    for (let i = 1; i <= nums.length; i++) { if (nums[i] === p + 1) { p = nums[i]; continue; } parts.push(s === p ? 'Bab ' + s : 'Bab ' + s + '–' + p); s = nums[i]; p = nums[i]; }
    return (m[0][1] === 'proposal' ? 'Proposal' : 'Skripsi') + ' · ' + parts.join(', ');
  }
  return names.join(' + ');
}
const skeleton = (n) => '<div class="px-4 pt-6 space-y-4">' + Array.from({ length: n || 4 }, (_, i) => `<div class="skel" style="height:${i ? 96 : 150}px"></div>`).join('') + '</div>';
const empty = (ic, t, s) => `<div class="empty">${icon(ic)}<p class="mt-2 font-bold text-ink">${esc(t)}</p>${s ? `<p class="text-sm">${s}</p>` : ''}</div>`;
const errBox = m => `<div class="px-4 pt-8"><div class="card p-6 text-center">${icon('cloud_off', '!text-5xl text-brandtx')}<p class="mt-2 font-bold">Oops, ada kendala</p><p class="text-sm text-ink2 mt-1">${esc(m)}</p><button class="btn btn-primary mt-4" data-act="reload">${icon('refresh')} Coba lagi</button></div></div>`;
const sectionTitle = (t, right) => `<div class="mb-3 flex items-center justify-between gap-3"><h2 class="text-lg font-extrabold">${t}</h2>${right || ''}</div>`;

// ════════ BAGIAN 2: API, TOAST, MODAL ════════
function busy(d) { S.busy = Math.max(0, S.busy + d); $('#loadBar').classList.toggle('on', S.busy > 0); }
function apiRaw(opt, fn, args) {
  if (!opt.silent) busy(1);
  const fin = () => { if (!opt.silent) busy(-1); };
  return gasCall(fn, args, { timeout: 45000 }).then(r => {
    fin();
    if (r && r.ver) S.ver = r.ver;      // versi data dari mutasi sendiri → tidak memicu pembaruan ganda
    if (r && r.success) return r.data;
    const m = (r && r.message) || 'Terjadi kesalahan.';
    if (m === 'SESI_HABIS') { forceLogout('Sesi berakhir. Silakan masuk kembali.'); throw new Error(m); }
    throw new Error(m);
  }, e => { fin(); throw e; });
}
function api(fn, ...args) { return apiRaw({}, fn, args); }
const apiA = (fn, ...a) => api(fn, S.tok, ...a);
/** Jalankan promise; tampilkan galat sebagai toast (bukan hanya console). */
const safe = p => p.catch(e => { if (e.message !== 'SESI_HABIS') toast(e.message, 'error'); });
function toast(msg, type) {
  const r = $('#toastRoot');
  r.innerHTML = `<div class="toast ${type || ''}" role="status">${icon(type === 'error' ? 'error' : type === 'ok' ? 'check_circle' : 'info')}<span>${esc(msg)}</span></div>`;
  clearTimeout(toast.t); toast.t = setTimeout(() => r.innerHTML = '', type === 'error' ? 5200 : 3200);
}
function openModal(html, o) {
  o = o || {};
  $('#modalRoot').innerHTML = `<div class="modal-back ${o.xl ? 'xl' : ''}" data-modal-back="1"><div class="modal-card ${o.xl ? 'xl' : o.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add('no-scroll');
  const f = $('#modalRoot input:not([type=hidden]):not([type=file]),#modalRoot textarea'); if (f && !o.noFocus) setTimeout(() => f.focus(), 60);
}
function closeModal() {
  $('#modalRoot').innerHTML = ''; document.body.classList.remove('no-scroll'); S.viewer = null;
  S.blobUrls.forEach(u => URL.revokeObjectURL(u)); S.blobUrls = [];
}
const modalHead = t => `<div class="modal-head"><h3>${t}</h3><button class="icon-btn" data-act="closeModal" aria-label="Tutup">${icon('close')}</button></div>`;
function confirmBox(msg, ok, danger) {
  return new Promise(res => {
    const r = $('#confirmRoot');
    r.innerHTML = `<div class="modal-back" style="z-index:150" data-confirm-back="1"><div class="modal-card" style="max-width:430px" role="alertdialog" aria-modal="true"><div class="modal-head"><h3>Konfirmasi</h3></div><p class="mb-4 text-ink2">${esc(msg)}</p><div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="cfNo">Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="cfYes">${esc(ok || 'Ya')}</button></div></div></div>`;
    S._cf = v => { r.innerHTML = ''; res(v); };
  });
}
async function withBtn(btn, fn) {
  const h = btn ? btn.innerHTML : ''; if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Memproses…'; }
  try { return await fn(); } finally { if (btn) { btn.disabled = false; btn.innerHTML = h; } }
}
function readFile(inp) {
  return new Promise((res, rej) => {
    const f = inp && inp.files && inp.files[0];
    if (!f) return rej(new Error('Pilih berkas terlebih dahulu.'));
    if (f.size > 10 * 1024 * 1024) return rej(new Error('Ukuran berkas melebihi 10 MB.'));
    const r = new FileReader();
    r.onload = () => res({ name: f.name, mime: f.type, b64: String(r.result).split(',')[1] });
    r.onerror = () => rej(new Error('Gagal membaca berkas.'));
    r.readAsDataURL(f);
  });
}
function b64Blob(b64, mime) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
function downloadFile(d) {
  const url = URL.createObjectURL(b64Blob(d.b64, d.mime)); const a = document.createElement('a');
  a.href = url; a.download = d.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function copyText(t) {
  const done = () => toast('Disalin ke papan klip.', 'ok');
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done));
  fallbackCopy(t, done);
}
function fallbackCopy(t, done) { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Salin manual: ' + t); } a.remove(); }

// ════════ BAGIAN 3: TEMA ════════
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('bim_theme', t); } catch (e) { /* storage dapat diblokir di iframe */ }
  const ic = $('#themeIcon'); if (ic) ic.textContent = t === 'dark' ? 'light_mode' : 'dark_mode';
  if (S.redraw) setTimeout(S.redraw, 50);
}
function initTheme() {
  let t = null; try { t = localStorage.getItem('bim_theme'); } catch (e) { /* abaikan */ }
  if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(t);
}

// ════════ BAGIAN 4: ROUTER SPA ════════
const PAGES = {};
const TITLES = { home: 'Home', mahasiswa: 'Mahasiswa', detail: 'Detail Mahasiswa', tahapan: 'Tahapan Wisuda', surat: 'Surat Tugas', rekap: 'Rekap Progres', dokumen: 'Dokumen & Revisi', bimbingan: 'Bimbingan', diskusi: 'Diskusi', medali: 'Papan Medali', token: 'Kelola Token', pengaturan: 'Pengaturan', profil: 'Profil' };
const NAV = {
  dosen: { main: [['home', 'Home', 'home'], ['mahasiswa', 'Mahasiswa', 'groups'], ['bimbingan', 'Bimbingan', 'forum'], ['rekap', 'Rekap', 'table_chart']], more: [['surat', 'Surat Tugas', 'assignment'], ['medali', 'Papan Medali', 'military_tech'], ['token', 'Kelola Token', 'key'], ['pengaturan', 'Pengaturan', 'settings'], ['profil', 'Profil & Tampilan', 'person']] },
  mahasiswa: { main: [['home', 'Home', 'home'], ['bimbingan', 'Bimbingan', 'forum'], ['tahapan', 'Tahapan', 'flag'], ['surat', 'Surat Tugas', 'assignment']], more: [['medali', 'Papan Medali', 'military_tech'], ['profil', 'Profil & Tampilan', 'person']] }
};
/** SATU-SATUNYA cara berpindah halaman. Tidak memakai window.location / ?page=. */
function go(page, params) {
  if (page === 'dokumen') { page = 'bimbingan'; params = Object.assign({ tab: 'revisi' }, params || {}); }          // menu lama digabung ke Bimbingan
  if (page === 'diskusi') { page = 'bimbingan'; params = Object.assign({ tab: 'diskusi' }, params || {}); }
  S.page = page; S.params = params || {}; const my = ++S.nav;
  if (S.redraw) { S.redraw = null; destroyCharts(); }
  renderNav();
  $('#pageTitle').textContent = TITLES[page] || '';
  $('#app-container').innerHTML = skeleton();
  window.scrollTo(0, 0);
  runPage(my);
}
function runPage(my) {
  const p = PAGES[S.page]; if (!p) { view(errBox('Halaman "' + S.page + '" belum tersedia.'), my); return; }
  Promise.resolve(p(my)).catch(e => { if (my === S.nav && e.message !== 'SESI_HABIS') $('#app-container').innerHTML = errBox(e.message); });
}
/** Render ulang halaman aktif dari cache (tanpa skeleton) — dipakai untuk optimistic UI. */
function rerender() { const my = ++S.nav; runPage(my); }
function view(html, my) {
  if (my !== undefined && my !== S.nav) return false;
  $('#app-container').innerHTML = `<div class="fade-in">${html}</div>`; return true;
}
function badgeFor(id) { return id === 'bimbingan' ? (S.badge.rev + S.badge.chat) : 0; }
function renderNav() {
  if (!S.user) return;
  const cfg = NAV[S.user.role], cur = S.page === 'detail' ? (isDosen() ? 'mahasiswa' : 'home') : S.page;
  const inMore = cfg.more.some(m => m[0] === cur), bd = n => n > 0 ? `<span class="nbadge">${n > 9 ? '9+' : n}</span>` : '';
  $('#navTop').innerHTML = cfg.main.map(m => `<button class="navbtn ${cur === m[0] ? 'on' : ''}" data-act="nav" data-page="${m[0]}" ${cur === m[0] ? 'aria-current="page"' : ''}>${esc(m[1])}${bd(badgeFor(m[0]))}</button>`).join('') + `<button class="navbtn ${inMore ? 'on' : ''}" data-act="more">Lainnya ${icon('expand_more', '!text-base')}</button>`;
  $('#navBottomInner').innerHTML = cfg.main.map(m => `<button class="bnav ${cur === m[0] ? 'on' : ''}" data-act="nav" data-page="${m[0]}" aria-label="${esc(m[1])}" ${cur === m[0] ? 'aria-current="page"' : ''}><span class="ico">${icon(m[2])}${bd(badgeFor(m[0]))}</span><span>${esc(m[1])}</span></button>`).join('') + `<button class="bnav ${inMore ? 'on' : ''}" data-act="more" aria-label="Menu lainnya"><span class="ico">${icon('apps')}</span><span>Lainnya</span></button>`;
}
function openMore() {
  const cfg = NAV[S.user.role];
  openModal(`${modalHead('Menu lainnya')}<div class="grid grid-cols-2 gap-3">${cfg.more.map(m => `<button class="card-flat flex items-center gap-3 p-4 text-left font-bold card-hover" data-act="navClose" data-page="${m[0]}">${icon(m[2], 'text-brandtx')}<span>${esc(m[1])}</span></button>`).join('')}
    <button class="card-flat flex items-center gap-3 p-4 text-left font-bold card-hover text-brandtx" data-act="logout">${icon('logout')}<span>Keluar</span></button></div>`, { noFocus: true });
}
function updateNotifDot() { const d = $('#notifDot'); d.style.display = S.notifUnread > 0 ? '' : 'none'; d.textContent = S.notifUnread > 9 ? '9+' : S.notifUnread; }
function showShell() {
  $('#appbar').style.display = ''; $('#navBottom').style.display = '';
  $('#avatarBtn').innerHTML = avatar({ nama: S.user.nama, foto: S.user.foto }, 36);
  $('#avatarBtn .avatar').style.borderRadius = '9999px';
  updateNotifDot(); renderNav();
}

// ════════ BAGIAN 5: AUTENTIKASI (Masuk / Daftar dengan token + OTP email) ════════
const LOGO = `<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-lg" style="background:linear-gradient(135deg,rgb(var(--brand-btn)),rgb(var(--gold)))">${icon('school', 'ms-fill !text-4xl')}</div>`;
function forceLogout(msg) {
  stopPolling();
  S.tok = null; S.user = null; S.dash = null; S.det = {};
  try { sessionStorage.removeItem('bim_tok'); } catch (e) { /* abaikan */ }
  renderAuth(msg);
}
function renderAuth(msg) {
  S.nav++; if (S.redraw) { S.redraw = null; destroyCharts(); }
  stopPolling(); $('#appbar').style.display = 'none'; $('#navBottom').style.display = 'none'; closeModal();
  view(`<div class="mx-auto max-w-md px-4 pb-6 pt-10">
    <div class="mb-6 text-center">${LOGO}<h1 class="mt-3 text-3xl font-extrabold tracking-tight text-brandtx">Bimska</h1><p class="mt-1 text-ink2">Bimbingan skripsi yang hangat, terarah, dan tercatat rapi.<br><span class="text-xs font-semibold">UNSIKA · Fasilkom</span></p></div>
    ${msg ? `<div class="mb-3 rounded-2xl bg-goldp p-3 text-sm font-semibold text-goldink" role="alert">${esc(msg)}</div>` : ''}
    <div class="card p-5 md:p-6"><div class="topnav-pill mb-5" role="tablist"><button class="navbtn on flex-1 justify-center" data-act="authTab" data-t="masuk" id="tabMasuk">Masuk</button><button class="navbtn flex-1 justify-center" data-act="authTab" data-t="daftar" id="tabDaftar">Daftar</button></div><div id="authBody"></div></div>
    <p class="mt-4 text-center text-xs text-ink2">Pendaftaran pertama kali memerlukan <b>token dari dosen</b>. Setelah itu cukup masuk dengan email dan kata sandi.</p></div>`);
  authBody('masuk', 1);
}
const pwField = (id, name, label, auto, help) => `<div><label class="label" for="${id}">${label}</label><div class="relative"><input id="${id}" name="${name}" type="password" class="input !pr-12" autocomplete="${auto}" required minlength="8" maxlength="72"><button type="button" class="icon-btn absolute right-0 top-0" data-act="togglePw" aria-label="Tampilkan atau sembunyikan kata sandi">${icon('visibility')}</button></div>${help ? `<p class="help">${help}</p>` : ''}</div>`;
function authBody(tab, step) {
  S.auth.tab = tab; S.auth.step = step;
  $('#tabMasuk').classList.toggle('on', tab !== 'daftar'); $('#tabDaftar').classList.toggle('on', tab === 'daftar');
  let h = '';
  if (tab === 'daftar') {
    h = `<form data-form="daftar" class="space-y-3"><div><label class="label" for="rTok">Token dari dosen</label><input id="rTok" name="token" class="input uppercase tracking-widest" required placeholder="BIM-XXXX-XXXX" autocomplete="off"></div>
      <div><label class="label" for="rNama">Nama lengkap</label><input id="rNama" name="nama" class="input" required maxlength="80" autocomplete="name"></div>
      <div><label class="label" for="rNpm">NPM</label><input id="rNpm" name="npm" class="input" required inputmode="numeric" pattern="\\d{8,16}" title="Angka 8–16 digit" placeholder="2110631170000"></div>
      <div><label class="label" for="rEmail">Email</label><input id="rEmail" name="email" type="email" class="input" required autocomplete="email"></div>
      ${pwField('rPw', 'pw', 'Buat kata sandi', 'new-password', 'Minimal 8 karakter, memuat huruf dan angka.')}${pwField('rPw2', 'pw2', 'Ulangi kata sandi', 'new-password')}
      <button class="btn btn-primary btn-block" type="submit">${icon('how_to_reg')} Daftar &amp; masuk</button><p class="help text-center">Satu token dapat dipakai oleh beberapa mahasiswa sesuai kuota dan masa berlakunya.</p></form>`;
  } else if (tab === 'reset' && step === 2) {
    h = `<form data-form="resetVer" class="space-y-3"><p class="text-sm text-ink2">Jika email terdaftar, kode 6 digit dikirim ke <b class="text-ink">${esc(S.auth.email)}</b> (berlaku 10 menit; cek juga folder spam).</p>
      <div><label class="label" for="aCode">Kode dari email</label><input id="aCode" name="code" class="input text-center text-xl font-extrabold tracking-[.4em]" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required placeholder="••••••"></div>
      ${pwField('nPw', 'pw', 'Kata sandi baru', 'new-password', 'Minimal 8 karakter, memuat huruf dan angka.')}${pwField('nPw2', 'pw2', 'Ulangi kata sandi baru', 'new-password')}
      <button class="btn btn-primary btn-block" type="submit">${icon('lock_reset')} Simpan &amp; masuk</button><button class="btn btn-ghost btn-block" type="button" data-act="authTab" data-t="masuk">Batal</button></form>`;
  } else if (tab === 'reset') {
    h = `<form data-form="resetReq" class="space-y-3"><p class="text-sm text-ink2">Lupa kata sandi, atau akunmu belum punya kata sandi? Kami kirim kode ke email untuk membuat yang baru.</p>
      <div><label class="label" for="aEmail">Email terdaftar</label><input id="aEmail" name="email" type="email" class="input" autocomplete="email" required value="${esc(S.auth.email || '')}"></div>
      <button class="btn btn-primary btn-block" type="submit">${icon('mail')} Kirim kode</button><button class="btn btn-ghost btn-block" type="button" data-act="authTab" data-t="masuk">Kembali masuk</button></form>`;
  } else {
    h = `<form data-form="loginPw" class="space-y-3"><div><label class="label" for="aEmail">Email</label><input id="aEmail" name="email" type="email" class="input" autocomplete="username" required placeholder="nama@email.com" value="${esc(S.auth.email || '')}"></div>
      ${pwField('aPw', 'pw', 'Kata sandi', 'current-password')}
      <button class="btn btn-primary btn-block" type="submit">${icon('login')} Masuk</button><button class="btn btn-ghost btn-block" type="button" data-act="authReset">Lupa / atur kata sandi</button></form>`;
  }
  $('#authBody').innerHTML = h;
}
async function enterApp(tok, pre) {
  S.tok = tok; try { sessionStorage.setItem('bim_tok', tok); } catch (e) { /* abaikan */ }
  if (!pre) { pre = await api('initApp', tok); if (!pre || !pre.ok) throw new Error('Sesi tidak valid.'); S.tok = pre.token || tok; try { sessionStorage.setItem('bim_tok', S.tok); } catch (e) { /* abaikan */ } }
  const b = pre.boot;
  S.user = b.user; S.meta = b; S.notifUnread = b.notifUnread; S.ver = b.ver; S.badge = b.badge || { rev: 0, chat: 0 }; S.seen = {}; (b.unreadIds || []).forEach(id => S.seen[id] = 1);
  S.dash = pre.dash; S.dashAt = Date.now(); S.det = {}; S.sesiAll = null;
  showShell(); startPolling(); go('home');
  const stale = pre.dash.role === 'dosen' ? pre.dash.sum.stale : pre.dash.stale;
  if (stale) setTimeout(() => refreshDash(true), 400);
}
async function boot() {
  window.__bimskaBooted = true;
  initTheme();
  if (!GAS_OK) { __showFatal('GAS_URL belum diisi. Buka berkas js/config.js, tempel URL Web App Apps Script (berakhiran /exec), simpan, lalu push ulang ke GitHub.'); return; }
  $('#app-container').innerHTML = '<div class="px-4 pt-16 text-center text-ink2"><span class="spinner"></span><p class="mt-3 font-semibold">Menyambungkan ke server…</p></div>';
  try {
    const r = await (window.__initP || Promise.resolve(null));   // dimulai paralel di Index (menghemat satu putaran ke server)
    if (r && r.success && r.data && r.data.ok) { await enterApp(r.data.token, r.data); return; }
  } catch (e) { /* lanjut ke formulir masuk */ }
  renderAuth();
}
// ════════ PEMANTAU REAL-TIME (ping ringan tiap 15 dtk selagi tab terlihat) ════════
function startPolling() {
  stopPolling();
  S.poll = setInterval(pollTick, typeof POLL_MS === 'number' ? POLL_MS : 20000);
}
function stopPolling() { if (S.poll) clearInterval(S.poll); S.poll = null; }
async function pollTick() {
  if (!S.tok || S.polling || document.visibilityState !== 'visible') return;
  S.polling = true;
  try {
    const r = await apiRaw({ silent: true }, 'ping', [S.tok, S.ver]);
    const changed = r.changed && r.ver !== S.ver;
    S.ver = r.ver;
    if (!r.changed) return;
    S.notifUnread = r.unread; updateNotifDot(); if (r.badge) { S.badge = r.badge; renderNav(); }
    const fresh = (r.items || []).filter(it => !S.seen[it.id]);
    fresh.forEach(it => S.seen[it.id] = 1);
    if (fresh.length) toast(fresh[0].isi + (fresh.length > 1 ? `  (+${fresh.length - 1} lagi)` : ''), 'ok');
    if (changed || fresh.length) refreshAfterChange();
  } catch (e) { /* diam: koneksi sesaat putus */ }
  finally { S.polling = false; }
}
function refreshAfterChange() {
  S.dash = null; S.det = {}; S.sesiAll = null;
  const ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) { S.pendingRefresh = true; return; }   // jangan ganggu yang sedang mengetik
  if ($('#modalRoot .modal-card')) { if (S.viewer && S.viewer.dokId) refreshViewer(); return; }
  if (S.page === 'bimbingan' && (S.params.tab || S.bimTab) === 'diskusi') { if (S.threadUid && $('#msgs')) loadMsgs(S.threadUid); else rerender(); return; }
  if (['home', 'mahasiswa', 'surat', 'bimbingan', 'dokumen', 'detail', 'tahapan', 'medali', 'rekap', 'profil'].indexOf(S.page) >= 0) rerender();
}
document.addEventListener('focusout', () => { if (S.pendingRefresh) setTimeout(() => { if (S.pendingRefresh && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { S.pendingRefresh = false; refreshAfterChange(); } }, 400); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pollTick(); });
