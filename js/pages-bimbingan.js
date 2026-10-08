'use strict';

// ════════ SIKLUS DOKUMEN (komponen bersama) ════════
const DOC_CHIP = { 'Menunggu diperiksa': ['gold', 'hourglass_top'], 'Sedang diperiksa': ['sky', 'rate_review'], 'Dikembalikan': ['rose', 'undo'], 'Selesai': ['mint', 'task_alt'], 'Digantikan': ['slate', 'history'] };
const LC = ['Dikirim', 'Menunggu', 'Diperiksa', 'Dikembalikan', 'Diperbaiki', 'Dikirim ulang', 'Selesai'];
/** Langkah aktif pada siklus: dikirim → menunggu → diperiksa → dikembalikan → diperbaiki → dikirim ulang → selesai. */
function lcStep(st, versi, tasks) {
  const rv = (tasks || []).filter(r => !r.dibawa && r.dirilis !== false);
  if (st === 'Menunggu diperiksa') return Number(versi) > 1 ? 5 : 1;
  if (st === 'Sedang diperiksa') return 2;
  if (st === 'Dikembalikan') return rv.length && rv.every(r => r.status !== 'Belum direvisi') ? 4 : 3;
  if (st === 'Selesai') return 6;
  return 5;
}
function lifecycle(st, versi, tasks) {
  const cur = lcStep(st, versi, tasks);
  return `<ol class="lc-row" aria-label="Siklus dokumen: langkah ${cur + 1} dari ${LC.length} (${LC[cur]})">${LC.map((l, i) => `<li class="lc ${i < cur || st === 'Selesai' ? 'done' : i === cur ? 'cur' : ''}"><span class="lc-dot">${i < cur || st === 'Selesai' ? icon('check', '!text-[13px]') : i + 1}</span><span class="lc-lbl">${l}</span></li>`).join('')}</ol>`;
}
const statNote = (x, dosen) => ({
  'Menunggu diperiksa': dosen ? 'Menunggu diperiksa dosen' : 'Terkirim, menunggu dosen memeriksa',
  'Sedang diperiksa': dosen ? 'Sedang kamu periksa' : 'Dosen sedang memeriksa',
  'Dikembalikan': dosen ? 'Dikembalikan, menunggu perbaikan mahasiswa' : 'Dikembalikan: perlu kamu perbaiki',
  'Selesai': 'Selesai', 'Digantikan': 'Sudah digantikan versi baru' }[x.status] || x.status);
function noteList(v) {
  const rv = v.revisi.filter(r => r.dirilis !== false || isDosen());
  return rv.length ? `<ul class="space-y-1.5">${rv.map(r => `<li><button class="check w-full text-left ${r.status === 'Disetujui' ? 'approved' : r.status === 'Sudah direvisi' ? 'done' : ''}" data-act="openDoc" data-id="${v.id}" data-task="${r.id}">${chip(LBL_CHIP, r.status === 'Belum direvisi' ? 'Belum direvisi' : r.status)}<span class="min-w-0 flex-1 text-sm">${r.rujukan ? `<span class="block clamp1 text-[11px] italic text-goldink">“${esc(r.rujukan)}”</span>` : ''}${esc(r.poin)}${r.dibawa ? ' <span class="text-[11px] text-ink2">(terbawa ke versi berikutnya)</span>' : ''}</span>${icon('near_me', '!text-base text-brandtx')}</button></li>`).join('')}</ul>` : '<p class="text-xs text-ink2">Tidak ada catatan pada versi ini.</p>';
}
function docCard(x, dosen) {
  const tasks = x.revisi.filter(r => !r.dibawa), pend = tasks.filter(r => r.status === 'Belum direvisi').length, wait = tasks.filter(r => r.status === 'Sudah direvisi').length, ok = tasks.filter(r => r.status === 'Disetujui').length;
  const canRev = !dosen && x.terbaru && x.status === 'Dikembalikan';
  const first = dosen ? (x.status === 'Menunggu diperiksa' ? 'Mulai periksa' : x.status === 'Sedang diperiksa' ? 'Lanjut periksa' : 'Buka & catat') : 'Buka dokumen';
  return `<div class="card p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2"><b>${esc(x.tahap)}</b><span class="chip chip-rose">V${x.versi}</span>${x.tipe === 'Revisi Dosen' ? `<span class="chip chip-mint">${icon('rate_review')}Hasil revisi dosen</span>` : chip(DOC_CHIP, x.status)}</div>
      <p class="mt-0.5 text-xs text-ink2">${esc(x.by)} · ${tglJam(x.tanggal)} · ${statNote(x, dosen)}</p>${x.catatan ? `<p class="mt-1 text-sm">${esc(x.catatan)}</p>` : ''}<p class="clamp1 text-[11px] text-ink2">${esc(x.file_nama)}</p>
      ${x.tipe === 'Draf' && x.status !== 'Digantikan' ? lifecycle(x.status, x.versi, tasks) : ''}
      ${tasks.length ? `<p class="mt-2 flex flex-wrap gap-1.5"><span class="chip chip-rose">${icon('edit_note')}${pend} perlu diperbaiki</span><span class="chip chip-gold">${icon('hourglass_top')}${wait} menunggu verifikasi</span><span class="chip chip-mint">${icon('verified')}${ok} disetujui</span></p>` : ''}</div>
    <div class="flex flex-wrap gap-2"><button class="btn btn-primary btn-sm" data-act="openDoc" data-id="${x.id}">${icon(dosen ? 'rate_review' : 'visibility', '!text-base')} ${first}</button>${canRev ? `<button class="btn btn-gold btn-sm" data-act="openUploadRevisi" data-id="${x.id}">${icon('upload_file', '!text-base')} Unggah revisi</button>` : ''}<button class="btn btn-ghost btn-sm" data-act="dlDok" data-id="${x.id}" aria-label="Unduh berkas">${icon('download', '!text-base')}</button></div></div></div>`;
}
function tabDokumen(d, dosen) {
  return `<div class="mb-3 flex flex-wrap items-center justify-between gap-2"><p class="text-sm text-ink2">${dosen ? 'Buka dokumen, blok teks, lalu beri catatan. Tekan Kembalikan setelah selesai memeriksa.' : 'Lihat status tiap dokumen dan catatan dosen di menu Bimbingan.'}</p>
    <div class="flex gap-2"><button class="btn btn-primary btn-sm" data-act="openUploadDok" data-uid="${d.uid}" data-tipe="Draf">${icon('upload_file', '!text-base')} ${dosen ? 'Unggah dokumen' : 'Unggah draf baru'}</button>${dosen ? `<button class="btn btn-soft btn-sm" data-act="openUploadDok" data-uid="${d.uid}" data-tipe="Revisi Dosen">${icon('rate_review', '!text-base')} Hasil revisi dosen</button>` : ''}</div></div>
    <div class="space-y-3">${d.dokumen.length ? d.dokumen.map(x => docCard(x, dosen)).join('') : `<div class="card">${empty('description', 'Belum ada dokumen', dosen ? 'Mahasiswa belum mengunggah draf.' : 'Unggah draf bab (DOCX atau PDF, maks. 10 MB).')}</div>`}</div>`;
}
// ---------- papan revisi MAHASISWA ----------
function taskRowMhs(r, dokId) {
  const on = r.status !== 'Belum direvisi', ok = r.status === 'Disetujui';
  return `<div class="check ${ok ? 'approved' : on ? 'done' : ''}"><button class="cbox ${on ? 'on' : ''}" ${ok ? 'disabled' : ''} data-act="revToggle" data-id="${r.id}" data-st="${r.status}" role="checkbox" aria-checked="${on}" aria-label="Tandai sudah diperbaiki: ${esc(r.poin)}">${icon('check', '!text-lg')}</button>
    <div class="min-w-0 flex-1 cursor-pointer" data-act="openDoc" data-id="${dokId}" data-task="${r.id}" role="button" tabindex="0">${r.rujukan ? `<p class="clamp1 text-[11px] italic text-goldink">“${esc(r.rujukan)}”</p>` : ''}<p class="text-sm font-semibold">${esc(r.poin)}</p><p class="text-[11px] font-bold text-brandtx">${icon('near_me', '!text-sm')} Lihat di dokumen${ok ? ' · disetujui' : on ? ' · menunggu verifikasi' : ''}</p></div></div>`;
}
function docCardMhs(x) {
  const tasks = x.revisi.filter(r => !r.dibawa), done = tasks.filter(r => r.status !== 'Belum direvisi').length, pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const body = x.status === 'Dikembalikan' ? `<div class="mt-3"><div class="mb-1.5 flex items-center justify-between text-xs font-bold"><span>${done} dari ${tasks.length} catatan sudah diperbaiki</span><span>${pct}%</span></div><div class="bar mb-3"><i style="width:${pct}%"></i></div><div class="space-y-2">${tasks.map(r => taskRowMhs(r, x.id)).join('')}</div><p class="mt-3 text-xs text-ink2">Centang setiap catatan yang sudah kamu perbaiki di berkas, lalu tekan <b>Unggah revisi</b>.</p></div>`
    : x.status === 'Sedang diperiksa' ? `<p class="mt-3 rounded-2xl bg-skyp p-3 text-sm text-skyink">${icon('rate_review', '!text-base')} Dosen sedang memeriksa dokumenmu. Catatan akan muncul di sini setelah dokumen dikembalikan.</p>`
    : x.status === 'Menunggu diperiksa' ? `<p class="mt-3 rounded-2xl bg-goldp p-3 text-sm text-goldink">${icon('hourglass_top', '!text-base')} ${x.versi > 1 ? 'Revisimu sudah terkirim ulang.' : 'Dokumenmu sudah terkirim.'} Menunggu dosen memeriksa${x.versi > 1 ? '; catatan lama akan diperiksa ulang' : ''}.</p>`
    : `<p class="mt-3 rounded-2xl bg-mintp p-3 text-sm text-mintink">${icon('task_alt', '!text-base')} Dosen menyatakan bagian ini selesai${tasks.length ? '' : ' (tidak ada revisi)'}. Tahapan terkait ikut tercentang.</p>`;
  return `<div class="card p-4"><div class="flex flex-wrap items-start justify-between gap-2"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><b class="text-base">${esc(x.tahap)}</b><span class="chip chip-rose">V${x.versi}</span>${chip(DOC_CHIP, x.status)}</div><p class="mt-0.5 text-xs text-ink2">${tglJam(x.tanggal)} · ${esc(x.file_nama)}</p></div>
    <div class="flex flex-wrap gap-2"><button class="btn btn-primary btn-sm" data-act="openDoc" data-id="${x.id}">${icon('visibility', '!text-base')} Buka dokumen</button>${x.status === 'Dikembalikan' ? `<button class="btn btn-gold btn-sm" data-act="openUploadRevisi" data-id="${x.id}">${icon('upload_file', '!text-base')} Unggah revisi</button>` : ''}</div></div>${lifecycle(x.status, x.versi, tasks)}${body}</div>`;
}
function riwayatRevisi(d) {
  const by = {}; d.dokumen.filter(x => x.tipe === 'Draf').forEach(x => { (by[x.tahap_id] = by[x.tahap_id] || []).push(x); });
  const keys = Object.keys(by).filter(k => by[k].length > 1 || by[k][0].status === 'Digantikan' || by[k][0].revisi.length);
  if (!keys.length) return '';
  return `<div class="mt-6"><p class="mb-2 text-lg font-extrabold">${icon('history')} Riwayat revisi</p><p class="mb-3 text-xs text-ink2">Semua versi dan catatan dosen per bab. Klik sebuah catatan untuk langsung menuju bagian dokumennya.</p><div class="space-y-2">${keys.map(k => { const list = by[k].slice().sort((a, b) => b.versi - a.versi), last = list[0];
    return `<details class="card hist"><summary class="flex items-center gap-3 p-3.5"><b class="flex-1">${esc(last.tahap)}</b><span class="chip chip-slate">${list.length} versi</span>${chip(DOC_CHIP, last.status)}${icon('expand_more', 'chev')}</summary><div class="space-y-4 border-t border-line p-3.5">${list.map(v => `<div><p class="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-bold"><span class="chip chip-rose">V${v.versi}</span>${chip(DOC_CHIP, v.status)}<span class="text-xs font-medium text-ink2">${tglJam(v.tanggal)}</span></p>${noteList(v)}</div>`).join('')}</div></details>`; }).join('')}</div></div>`;
}
function boardMhs(d) {
  const latest = d.dokumen.filter(x => x.tipe === 'Draf' && x.terbaru);
  const sec = (title, ic, tone, list) => list.length ? `<div class="mb-5"><p class="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider ${tone}">${icon(ic, '!text-base')}${title}<span class="chip chip-slate">${list.length}</span></p><div class="space-y-3">${list.map(docCardMhs).join('')}</div></div>` : '';
  const kembali = latest.filter(x => x.status === 'Dikembalikan'), proses = latest.filter(x => x.status === 'Menunggu diperiksa' || x.status === 'Sedang diperiksa'), selesai = latest.filter(x => x.status === 'Selesai');
  const nTugas = kembali.reduce((a, x) => a + x.revisi.filter(r => !r.dibawa && r.status === 'Belum direvisi').length, 0);
  return `<div class="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p class="text-lg font-extrabold">Revisi dokumen</p><p class="text-sm text-ink2">${kembali.length ? `<b class="text-brandtx">${nTugas} catatan</b> menunggu perbaikanmu.` : proses.length ? 'Dokumenmu sedang diproses dosen.' : 'Unggah draf bab untuk memulai.'}</p></div><button class="btn btn-primary" data-act="openUploadDok" data-uid="${d.uid}" data-tipe="Draf">${icon('upload_file')} Kirim draf bab</button></div>
    ${sec('Perlu kamu perbaiki', 'edit_note', 'text-brandtx', kembali)}${sec('Sedang diproses dosen', 'hourglass_top', 'text-skyink', proses)}${sec('Selesai', 'task_alt', 'text-mintink', selesai)}
    ${latest.length ? '' : `<div class="card">${empty('description', 'Belum ada dokumen', 'Pilih bab pada saat mengunggah agar progres tahapanmu ikut terbarui otomatis.')}</div>`}${riwayatRevisi(d)}`;
}
// ---------- papan pemeriksaan DOSEN ----------
const RVF = { periksa: ['Perlu diperiksa', x => x.status === 'Menunggu diperiksa'], sedang: ['Sedang diperiksa', x => x.status === 'Sedang diperiksa'], kembali: ['Menunggu perbaikan', x => x.status === 'Dikembalikan'], selesai: ['Selesai', x => x.status === 'Selesai'], semua: ['Semua', () => true] };
const RVSORT = { periksa: (a, b) => b.hari - a.hari, sedang: (a, b) => b.hari - a.hari, kembali: (a, b) => b.hari - a.hari, selesai: (a, b) => a.tanggal < b.tanggal ? 1 : -1, semua: (a, b) => (['Menunggu diperiksa', 'Sedang diperiksa', 'Dikembalikan', 'Selesai'].indexOf(a.status) - ['Menunggu diperiksa', 'Sedang diperiksa', 'Dikembalikan', 'Selesai'].indexOf(b.status)) || (b.hari - a.hari) };
function antrianCard(x) {
  const late = x.hari >= 3 && (x.status === 'Menunggu diperiksa' || x.status === 'Sedang diperiksa');
  const info = x.status === 'Menunggu diperiksa' ? `Dikirim ${lalu(x.tanggal)}${late ? ` · <b class="text-brandtx">sudah ${x.hari} hari</b>` : ''}` : x.status === 'Sedang diperiksa' ? `Mulai diperiksa · dikirim ${lalu(x.tanggal)}` : x.status === 'Dikembalikan' ? `Dikembalikan ${lalu(x.kembali)} · menunggu perbaikan mahasiswa` : x.status === 'Selesai' ? 'Dinyatakan selesai' : '';
  return `<div class="card card-hover flex flex-wrap items-center gap-3 p-4" style="border-left:5px solid rgb(var(--${x.status === 'Menunggu diperiksa' ? (late ? 'brand-btn' : 'gold') : x.status === 'Sedang diperiksa' ? 'sky' : x.status === 'Dikembalikan' ? 'brand-vivid' : 'mint'}))">${avatar({ nama: x.nama }, 46)}
    <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><b>${esc(x.nama)}</b><span class="chip chip-sky">${esc(x.tahap)} · V${x.versi}</span>${chip(DOC_CHIP, x.status)}${x.kirimUlang && x.status === 'Menunggu diperiksa' ? `<span class="chip chip-gold">${icon('replay')}Dikirim ulang</span>` : ''}</div><p class="mt-1 text-xs text-ink2">${info}</p>
      ${x.nTugas ? `<p class="mt-1.5 flex flex-wrap gap-1.5"><span class="chip chip-rose">${x.nBuka} belum diperbaiki</span><span class="chip chip-gold">${x.nTunggu} menunggu verifikasi</span><span class="chip chip-mint">${x.nOk} disetujui</span>${x.nDraf ? `<span class="chip chip-slate">${x.nDraf} draf catatan</span>` : ''}</p>` : ''}</div>
    <button class="btn ${x.status === 'Menunggu diperiksa' ? 'btn-primary' : 'btn-soft'} btn-sm" data-act="openDoc" data-id="${x.dok}">${icon(x.status === 'Menunggu diperiksa' ? 'rate_review' : 'visibility', '!text-base')} ${x.status === 'Menunggu diperiksa' ? 'Periksa' : x.status === 'Sedang diperiksa' ? 'Lanjutkan' : 'Buka'}</button></div>`;
}
async function boardDosen() {
  let rows = S.antrian;
  if (!rows || Date.now() - (S.antrianAt || 0) > 20000) { rows = await apiA('getAntrianDokumen'); S.antrian = rows; S.antrianAt = Date.now(); }
  const f = RVF[S.rvF] ? S.rvF : 'periksa', q = (S.rvQ || '').toLowerCase();
  const list = rows.filter(RVF[f][1]).filter(x => !q || (x.nama + ' ' + x.npm + ' ' + x.tahap).toLowerCase().indexOf(q) >= 0).sort(RVSORT[f]);
  const n = k => rows.filter(RVF[k][1]).length;
  return `<div class="mb-3 grid grid-cols-3 gap-3 text-center"><button class="card p-3 ${f === 'periksa' ? '!border-brandtx' : ''}" data-act="rvFilter" data-f="periksa"><b class="block text-2xl ${n('periksa') ? 'text-brandtx' : ''}">${n('periksa')}</b><span class="text-xs text-ink2">Perlu diperiksa</span></button><button class="card p-3 ${f === 'sedang' ? '!border-brandtx' : ''}" data-act="rvFilter" data-f="sedang"><b class="block text-2xl">${n('sedang')}</b><span class="text-xs text-ink2">Sedang diperiksa</span></button><button class="card p-3 ${f === 'kembali' ? '!border-brandtx' : ''}" data-act="rvFilter" data-f="kembali"><b class="block text-2xl">${n('kembali')}</b><span class="text-xs text-ink2">Menunggu perbaikan</span></button></div>
    <div class="card mb-3 p-3"><label class="search"><span class="material-symbols-outlined text-ink2" aria-hidden="true">search</span><input id="rvSearch" type="search" placeholder="Cari mahasiswa atau bab…" aria-label="Cari dokumen" value="${esc(S.rvQ || '')}" autocomplete="off"></label><div class="hscroll mt-3">${Object.keys(RVF).map(k => `<button class="fchip ${f === k ? 'on' : ''}" data-act="rvFilter" data-f="${k}">${RVF[k][0]} (${n(k)})</button>`).join('')}</div></div>
    <div id="rvList" class="space-y-3">${list.length ? list.map(antrianCard).join('') : `<div class="card">${empty(f === 'periksa' ? 'celebration' : 'inbox', f === 'periksa' ? 'Semua dokumen sudah diperiksa' : 'Tidak ada dokumen di kategori ini', f === 'periksa' ? 'Dokumen baru dari mahasiswa akan muncul di sini.' : 'Ganti kategori di atas.')}</div>`}</div>
    <p class="mt-4 text-xs text-ink2">${icon('info', '!text-sm')} Alur: mahasiswa mengirim → <b>Periksa</b> (otomatis “sedang diperiksa”) → beri catatan pada teks → <b>Kembalikan</b> ke mahasiswa, atau <b>Tandai selesai</b> bila tidak ada revisi.</p>`;
}

function revToggleOptimistic(id, cur) {
  const next = cur === 'Belum direvisi' ? 'Sudah direvisi' : 'Belum direvisi';
  const apply = () => {
    Object.keys(S.det).forEach(k => S.det[k].d.dokumen.forEach(dk => dk.revisi.forEach(r => { if (r.id === id) r.status = next; })));
    if (S.dash && S.dash.me) S.dash.me.revisiPending.forEach(r => { if (r.id === id) r.status = next; });
    if (S.viewer && S.viewer.tasks) { const t = S.viewer.tasks.find(x => x.id === id); if (t) t.status = next; }
  };
  return optimistic(apply, () => apiA('setRevisi', id, next), next === 'Sudah direvisi' ? 'Ditandai sudah diperbaiki. Dosen akan memeriksa.' : null);
}

// ════════ BAGIAN 13: PENAMPIL DOKUMEN ala Google Docs — catatan pada teks = tugas revisi ════════
function loadPdfJs() {
  if (S.pdfLib) return Promise.resolve(S.pdfLib);
  return loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', () => window.pdfjsLib).then(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    S.pdfLib = window.pdfjsLib; return S.pdfLib;
  });
}
function loadScript(url, test) {
  if (test && test()) return Promise.resolve();
  S._ls = S._ls || {}; if (S._ls[url]) return S._ls[url];
  S._ls[url] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => { delete S._ls[url]; rej(new Error('Pustaka pemuat dokumen tidak dapat diakses. Periksa koneksi internet.')); }; document.head.appendChild(s); });
  return S._ls[url];
}
function b64ToU8(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function renderPdfInto(box, b64) {
  const lib = await loadPdfJs(), pdf = await lib.getDocument({ data: b64ToU8(b64) }).promise, max = Math.min(pdf.numPages, 60);
  box.innerHTML = '';
  for (let n = 1; n <= max; n++) {
    if (!$('#pdfBox')) return;
    const page = await pdf.getPage(n), w = Math.max(280, box.clientWidth - 8), vp0 = page.getViewport({ scale: 1 }), sc = Math.min(2, w / vp0.width), vp = page.getViewport({ scale: sc });
    const wrap = document.createElement('div'); wrap.className = 'mb-3'; wrap.innerHTML = `<p class="mb-1 text-[11px] font-bold text-ink2">Halaman ${n} / ${pdf.numPages}</p>`;
    const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; cv.style.cssText = 'width:100%;height:auto;border-radius:10px;border:1px solid rgb(var(--line));background:#fff';
    wrap.appendChild(cv); box.appendChild(wrap);
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
  }
  if (pdf.numPages > max) box.insertAdjacentHTML('beforeend', `<p class="text-center text-xs text-ink2">Pratinjau dibatasi ${max} halaman pertama. Unduh untuk melihat seluruhnya.</p>`);
}
/** Bersihkan HTML hasil konversi (hapus skrip, atribut on*, tautan berbahaya). */
function cleanHtml(html) {
  const doc = new DOMParser().parseFromString('<div id="r">' + html + '</div>', 'text/html'), root = doc.getElementById('r');
  root.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea,select').forEach(n => n.remove());
  root.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(a => { const n = a.name.toLowerCase(); if (n.indexOf('on') === 0 || n === 'style' || n === 'srcdoc' || n === 'formaction') el.removeAttribute(a.name); });
    if (el.tagName === 'A') { const h = el.getAttribute('href') || ''; if (!/^(https?:|mailto:|#)/i.test(h)) el.removeAttribute('href'); else { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); } }
    if (el.tagName === 'IMG') { const s = el.getAttribute('src') || ''; if (!/^(data:image\/|https:)/i.test(s)) el.remove(); }
  });
  return root.innerHTML;
}
async function docxToHtml(b64) {
  await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js', () => window.mammoth);
  const r = await window.mammoth.convertToHtml({ arrayBuffer: b64ToU8(b64).buffer });
  return cleanHtml(r.value);
}
/** PDF → teks terstruktur per halaman (agar bisa diblok & dikomentari). */
async function pdfToHtml(b64) {
  const lib = await loadPdfJs(), pdf = await lib.getDocument({ data: b64ToU8(b64) }).promise, max = Math.min(pdf.numPages, 120);
  let out = '', chars = 0;
  for (let n = 1; n <= max; n++) {
    const tc = await (await pdf.getPage(n)).getTextContent(), lines = [];
    tc.items.forEach(it => {
      if (!it.str || !it.str.trim()) return;
      const y = Math.round(it.transform[5]); let ln = lines.find(l => Math.abs(l.y - y) <= 2);
      if (!ln) { ln = { y: y, parts: [] }; lines.push(ln); }
      ln.parts.push({ x: it.transform[4], s: it.str });
    });
    lines.sort((a, b) => b.y - a.y);
    const gaps = []; for (let i = 1; i < lines.length; i++) gaps.push(lines[i - 1].y - lines[i].y);
    const med = gaps.length ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 12;
    const paras = []; let cur = '';
    lines.forEach((l, i) => {
      const txt = l.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(' ').replace(/\s+/g, ' ').trim();
      if (i > 0 && (lines[i - 1].y - l.y) > med * 1.45 && cur) { paras.push(cur); cur = ''; }
      cur += (cur ? ' ' : '') + txt;
    });
    if (cur) paras.push(cur);
    chars += paras.join('').length;
    out += `<div class="pgh">Halaman ${n}</div>` + paras.map(p => `<p>${esc(p)}</p>`).join('');
  }
  if (chars < 20) throw new Error('PDF ini berupa gambar (tidak ada teks). Gunakan "Tampilan asli"; catatan hanya dapat berupa catatan umum.');
  return out;
}
async function docHtml(dokId, f) {
  if (S.docCache[dokId]) return S.docCache[dokId];
  const isPdf = /pdf/i.test(f.mime) || /\.pdf$/i.test(f.name);
  const h = isPdf ? await pdfToHtml(f.b64) : await docxToHtml(f.b64);
  if (!h || !h.replace(/<[^>]+>/g, '').trim()) throw new Error('Dokumen tidak berisi teks yang dapat ditampilkan.');
  S.docCache[dokId] = h; const ks = Object.keys(S.docCache); if (ks.length > 5) delete S.docCache[ks[0]];
  return h;
}
// ---- anotasi: blok, offset teks, sorot ----
const blocksOf = root => Array.from(root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote')).filter(el => !el.querySelector('p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote'));
const textNodesOf = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), a = []; let n; while ((n = w.nextNode())) a.push(n); return a; };
function wrapRange(el, start, end, cls, id) {
  let pos = 0;
  textNodesOf(el).forEach(tn => {
    const len = tn.nodeValue.length, s = Math.max(start, pos), e = Math.min(end, pos + len);
    if (s < e) {
      let node = tn; const a = s - pos, b = e - pos;
      if (b < len) node.splitText(b);
      if (a > 0) node = node.splitText(a);
      const m = document.createElement('mark'); m.className = cls; m.dataset.task = id;
      node.parentNode.insertBefore(m, node); m.appendChild(node);
    }
    pos += len;
  });
}
function selAnchor(root) {
  const sel = window.getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0); if (!root.contains(r.commonAncestorContainer)) return null;
  const elOf = n => (n.nodeType === 3 ? n.parentElement : n).closest('[data-p]');
  const sEl = elOf(r.startContainer), eEl = elOf(r.endContainer); if (!sEl || !root.contains(sEl)) return null;
  const pre = document.createRange(); pre.selectNodeContents(sEl); pre.setEnd(r.startContainer, r.startOffset);
  const s = pre.toString().length; let e;
  if (eEl === sEl) { pre.setEnd(r.endContainer, r.endOffset); e = pre.toString().length; } else e = sEl.textContent.length;
  const q = sEl.textContent.slice(s, e); if (!q.trim()) return null;
  return { p: +sEl.dataset.p, s: s, e: e, q: q.slice(0, 300) };
}
const taskCls = st => st === 'Disetujui' ? 'ok' : st === 'Sudah direvisi' ? 'done' : 'open';
function applyHighlights() {
  const root = $('#docBody'), v = S.viewer; if (!root || !v) return;
  root.querySelectorAll('mark.hl').forEach(m => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
  const blocks = blocksOf(root); blocks.forEach((b, i) => b.dataset.p = i);
  v.tasks.forEach(t => {
    t.orphan = false; const a = t.anchor; if (!a || !a.q) return;
    let b = blocks[a.p], s = a.s, e = Math.min(a.e, a.s + a.q.length);
    if (!b || b.textContent.substr(s, e - s) !== a.q.substr(0, e - s)) {     // teks bergeser (versi baru): cari ulang berdasarkan kutipan
      let fb = null, at = -1; blocks.some(bb => { const i = bb.textContent.indexOf(a.q); if (i >= 0) { fb = bb; at = i; return true; } return false; });
      if (!fb) { t.orphan = true; return; } b = fb; s = at; e = at + a.q.length;
    }
    wrapRange(b, s, Math.min(e, b.textContent.length), 'hl hl-' + taskCls(t.status), t.id);
  });
}
function docPane() {
  const v = S.viewer;
  if (v.mode === 'asli') return '<div id="pdfBox" class="rounded-2xl bg-field p-2"><div class="skel" style="height:300px"></div></div>';
  if (!v.html) return `<div class="empty card-flat">${icon('draft')}<p class="mt-2 font-bold text-ink">Pratinjau teks tidak tersedia</p><p class="text-sm">${esc(v.note || 'Berkas tidak dapat ditampilkan.')} Anda masih dapat membuat catatan umum atau mengunduh berkas.</p></div>`;
  return `<div id="docBody" class="doc-body" style="font-size:${v.fs || 16}px">${v.html}</div>`;
}
function renderSide() { const el = $('#vSide'); if (!el || !S.viewer) return; const st = el.scrollTop; el.innerHTML = sidePane(); el.scrollTop = st; const b = $$('[data-act=vTab][data-t=tugas]')[0]; if (b) b.textContent = 'Catatan (' + S.viewer.tasks.length + ')'; }
function showSelBar() {
  const b = $('#selBar'), v = S.viewer; if (!b || !v) return;
  b.innerHTML = isDosen() && v.sel && !v.composer ? `<div class="inner"><q>${esc(v.sel.q.slice(0, 140))}</q><button class="btn btn-sm" style="background:#fff;color:rgb(var(--brand-text))" data-act="vtCompose">${icon('add_comment', '!text-base')} Beri catatan</button><button class="icon-btn !h-8 !w-8" style="color:#fff" data-act="vtClearSel" aria-label="Batal pilih">${icon('close', '!text-base')}</button></div>` : '';
}
function flash(el) { if (!el) return; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1700); }
function focusTask(id) {
  const v = S.viewer; if (!v) return;
  if (window.innerWidth < 1024 && v.vTab !== 'tugas') { v.vTab = 'tugas'; renderViewer(); }
  const c = $('#tc-' + id); if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(c); }
  const m = document.querySelector('#docBody mark[data-task="' + id + '"]'); if (m && window.innerWidth >= 1024) { m.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(m); }
}
function goMark(id) {
  const v = S.viewer; if (!v) return;
  if (window.innerWidth < 1024 && v.vTab !== 'doc') { v.vTab = 'doc'; renderViewer(); }
  setTimeout(() => { const m = document.querySelector('#docBody mark[data-task="' + id + '"]'); if (m) { m.scrollIntoView({ block: 'center', behavior: 'smooth' }); document.querySelectorAll('#docBody mark[data-task="' + id + '"]').forEach(flash); } }, 60);
}
async function refreshViewer() {
  const v = S.viewer; if (!v || v.composer) return;
  try { const vw = await apiRaw({ silent: true }, 'getDokView', [S.tok, v.dokId]); if (S.viewer !== v) return; v.tasks = vw.tasks; v.dok = vw.dok; renderSide(); applyHighlights(); } catch (e) { /* abaikan */ }
}
async function taskSet(id, next, msg) {
  const v = S.viewer, t = v && v.tasks.find(x => x.id === id); if (!t) return; const old = t.status;
  t.status = next; renderSide(); applyHighlights();
  try { await apiA('setRevisi', id, next); invalidate(); if (msg) toast(msg, 'ok'); }
  catch (e) { t.status = old; renderSide(); applyHighlights(); if (e.message !== 'SESI_HABIS') toast(e.message, 'error'); }
}
function taskCard(t) {
  const dosen = isDosen(), on = t.status !== 'Belum direvisi', ok = t.status === 'Disetujui', cls = taskCls(t.status) === 'open' ? '' : taskCls(t.status);
  let act = '';
  if (t.dibawa) act = `<span class="chip chip-slate">${icon('redo')}Dibawa ke versi berikutnya</span>`;
  else if (dosen) act = (t.status === 'Sudah direvisi' ? `<button class="btn btn-primary btn-sm" data-act="vtSet" data-id="${t.id}" data-st="Disetujui">${icon('check', '!text-base')} Setujui</button><button class="btn btn-ghost btn-sm" data-act="vtSet" data-id="${t.id}" data-st="Belum direvisi">Kembalikan</button>` : ok ? `<span class="chip chip-mint">${icon('verified')}Disetujui</span><button class="btn btn-ghost btn-sm" data-act="vtSet" data-id="${t.id}" data-st="Belum direvisi">Buka lagi</button>` : `<span class="chip chip-rose">${icon('edit_note')}Belum diperbaiki</span>`) + `<button class="btn btn-danger btn-sm" data-act="vtDel" data-id="${t.id}" aria-label="Hapus catatan">${icon('delete', '!text-base')}</button>`;
  else act = ok ? `<span class="chip chip-mint">${icon('verified')}Disetujui dosen</span>` : `<button class="cbox ${on ? 'on' : ''}" data-act="vtToggle" data-id="${t.id}" data-st="${t.status}" role="checkbox" aria-checked="${on}" aria-label="Sudah saya perbaiki">${icon('check', '!text-lg')}</button><span class="text-xs font-bold">${on ? 'Menunggu verifikasi dosen' : 'Sudah saya perbaiki'}</span>`;
  return `<div class="tcard ${cls}" id="tc-${t.id}" data-act="vtGo" data-id="${t.id}">${dosen && !t.dirilis && !t.dibawa ? `<span class="chip chip-slate mb-1">${icon('edit_note')}Draf · belum dikirim ke mahasiswa</span> ` : ''}${t.rujukan ? `<button class="tquote" data-act="vtGo" data-id="${t.id}">“${esc(t.rujukan.slice(0, 140))}” <span class="font-bold not-italic">${icon('near_me', '!text-sm')} lihat di teks</span></button>` : `<span class="chip chip-slate">Catatan umum</span>`}${t.anchor && t.orphan ? '<p class="mt-1 text-[11px] text-goldink">Teks ini tidak lagi ditemukan di versi ini (sudah diubah).</p>' : ''}
    <p class="mt-1.5 text-sm font-semibold">${esc(t.poin)}</p><p class="text-[11px] text-ink2">${esc(t.penulis)} · ${lalu(t.dibuat)}${t.versi ? ' · dari V' + t.versi : ''}</p>
    ${(t.replies || []).map(r => `<div class="reply ${r.role === 'dosen' ? 'dosen' : 'mhs'}"><b>${esc(r.penulis)}</b> <span class="text-[10px] text-ink2">${r.role === 'dosen' ? 'Dosen' : 'Mahasiswa'} · ${lalu(r.tanggal)}</span><br>${esc(r.isi)}</div>`).join('')}
    <div class="mt-2 flex flex-wrap items-center gap-2">${act}</div>
    <form class="mt-2 flex gap-2" data-form="vtReply" data-id="${t.id}"><input class="input !min-h-[36px] !py-1 text-sm" name="isi" placeholder="Balas…" maxlength="800" required aria-label="Balas catatan"><button class="btn btn-soft btn-sm" type="submit">Kirim</button></form></div>`;
}
function sidePane() {
  const v = S.viewer, f = v.filter, dosen = isDosen(), st = v.dok.status, a = v.composer ? v.cAnchor : null;
  const list = v.tasks.filter(t => f === 'all' || t.status === f), draf = v.tasks.filter(t => !t.dirilis && !t.dibawa).length;
  let top = '';
  if (dosen) {
    if (v.composer) top = `<form class="composer" data-form="vtSave"><p class="text-[11px] font-extrabold uppercase tracking-wider text-brandtx">Catatan baru → tugas revisi</p>${a ? `<p class="tquote mt-1" style="cursor:default">“${esc(a.q.slice(0, 160))}”</p>` : '<span class="chip chip-slate mt-1">Catatan umum</span>'}<textarea name="poin" class="input mt-2" maxlength="600" required placeholder="Apa yang harus diperbaiki mahasiswa?"></textarea><div class="mt-2 flex gap-2"><button class="btn btn-primary btn-sm flex-1" type="submit">${icon('task_alt', '!text-base')} Simpan sebagai tugas</button><button class="btn btn-ghost btn-sm" type="button" data-act="vtCancel">Batal</button></div></form>`;
    else if (st === 'Selesai' || st === 'Digantikan') top = `<div class="mb-3 rounded-2xl bg-field p-3 text-xs text-ink2">${icon('lock', '!text-base')} ${st === 'Selesai' ? 'Dokumen ini sudah selesai.' : 'Versi ini sudah digantikan versi baru; catatan hanya dapat dibaca.'}</div>`;
    else top = `<div class="mb-3 rounded-2xl bg-goldp p-3 text-xs text-goldink">${icon('tips_and_updates', '!text-base')} <b>Blok teks</b> pada dokumen, lalu tekan <b>Beri catatan</b>. Catatan jadi tugas revisi mahasiswa dan baru terkirim saat kamu menekan <b>Kembalikan</b>.${draf ? `<br><b>${draf} catatan masih draf.</b>` : ''}<br><button class="btn btn-soft btn-sm mt-2" data-act="vtCompose" data-general="1">${icon('add_comment', '!text-base')} Catatan umum</button></div>`;
  } else top = st === 'Dikembalikan' ? `<div class="mb-3 rounded-2xl bg-brandp p-3 text-xs text-brandtx">${icon('edit_note', '!text-base')} Dosen mengembalikan dokumen ini. Klik sebuah catatan untuk melihat bagiannya di teks, centang setelah kamu perbaiki, lalu <b>Unggah revisi</b>.</div>`
    : st === 'Selesai' ? `<div class="mb-3 rounded-2xl bg-mintp p-3 text-xs text-mintink">${icon('task_alt', '!text-base')} Dokumen ini dinyatakan selesai oleh dosen.</div>`
    : st === 'Digantikan' ? `<div class="mb-3 rounded-2xl bg-field p-3 text-xs text-ink2">${icon('history', '!text-base')} Versi ini sudah kamu gantikan dengan versi baru.</div>`
    : `<div class="mb-3 rounded-2xl bg-skyp p-3 text-xs text-skyink">${icon(st === 'Sedang diperiksa' ? 'rate_review' : 'hourglass_top', '!text-base')} ${st === 'Sedang diperiksa' ? 'Dosen sedang memeriksa dokumen ini. Catatan akan muncul setelah dikembalikan.' : 'Dokumen terkirim. Menunggu dosen memeriksa.'}</div>`;
  return `${top}${list.length ? list.map(taskCard).join('') : `<div class="empty !py-6">${icon('rate_review')}<p class="mt-1 font-bold text-ink">${v.tasks.length ? 'Tidak ada catatan pada filter ini' : 'Belum ada catatan'}</p></div>`}`;
}
function viewerActions() {
  const v = S.viewer, d = v.dok, st = d.status;
  if (isDosen()) {
    if (d.tipe !== 'Draf') return '';
    if (st === 'Selesai') return `<span class="chip chip-mint">${icon('task_alt')}Selesai</span>`;
    if (st === 'Digantikan') return `<span class="chip chip-slate">${icon('history')}Versi lama</span>`;
    if (st === 'Dikembalikan') return `<span class="chip chip-rose">${icon('undo')}Menunggu perbaikan mahasiswa</span>`;
    return `<button class="btn btn-primary btn-sm" data-act="vtKembali">${icon('undo', '!text-base')} Kembalikan ke mahasiswa</button><button class="btn btn-soft btn-sm" data-act="vtSelesai">${icon('task_alt', '!text-base')} Tandai selesai</button>`;
  }
  return d.terbaru && st === 'Dikembalikan' ? `<button class="btn btn-gold btn-sm" data-act="openUploadRevisi" data-id="${d.id}">${icon('upload_file', '!text-base')} Unggah revisi</button>` : '';
}
function renderViewer() {
  const v = S.viewer, card = $('#modalRoot .modal-card'); if (!v || !card) return;
  const d = v.dok, dosen = isDosen(), isPdf = v.file && /pdf/i.test(v.file.mime);
  const flt = [['all', 'Semua'], ['Belum direvisi', 'Perlu diperbaiki'], ['Sudah direvisi', 'Menunggu verifikasi'], ['Disetujui', 'Disetujui']];
  card.innerHTML = `${modalHead(`${esc(d.tahap)} · V${d.versi}${dosen ? ' — ' + esc(d.mahasiswa) : ''}`)}
    <div class="mb-1 flex flex-wrap items-center gap-2">${chip(DOC_CHIP, d.status)}<span class="text-xs text-ink2">${statNote(d, dosen)}</span><span class="flex-1"></span>${viewerActions()}<button class="btn btn-ghost btn-sm hide-m" data-act="vFocus">${icon(v.focus ? 'view_sidebar' : 'fit_screen', '!text-base')} ${v.focus ? 'Tampilkan catatan' : 'Perluas teks'}</button><button class="btn btn-ghost btn-sm" data-act="vFs" aria-label="Ubah ukuran huruf">${icon('text_increase', '!text-base')}</button>${isPdf ? `<button class="btn btn-ghost btn-sm" data-act="vMode">${icon(v.mode === 'text' ? 'picture_as_pdf' : 'article', '!text-base')} ${v.mode === 'text' ? 'Tampilan asli' : 'Mode teks'}</button>` : ''}${v.file ? `<button class="btn btn-ghost btn-sm" data-act="dlCurrent">${icon('download', '!text-base')} Unduh</button>` : ''}</div>
    ${d.tipe === 'Draf' ? lifecycle(d.status, d.versi, v.tasks) : ''}
    <div class="mb-2 mt-3 hscroll">${flt.map(a => `<button class="fchip ${v.filter === a[0] ? 'on' : ''}" data-act="vtFilter" data-f="${a[0]}">${a[1]}</button>`).join('')}</div>
    <div class="mb-2 flex gap-2 hide-d"><button class="fchip ${v.vTab === 'doc' ? 'on' : ''}" data-act="vTab" data-t="doc">Dokumen</button><button class="fchip ${v.vTab === 'tugas' ? 'on' : ''}" data-act="vTab" data-t="tugas">Catatan (${v.tasks.length})</button></div>
    <div class="viewer-grid ${v.focus ? 'focus' : ''}"><div class="${v.vTab === 'doc' ? '' : 'hide-m'}"><div id="vDoc" class="vpane">${docPane()}</div><div id="selBar" class="selbar"></div></div><div class="${v.vTab === 'tugas' ? '' : 'hide-m'}"><div id="vSide" class="vpane">${sidePane()}</div></div></div>`;
  if (v.mode === 'asli' && v.file) renderPdfInto($('#pdfBox'), v.file.b64).catch(e => { const b = $('#pdfBox'); if (b) b.innerHTML = `<p class="p-4 text-center text-sm text-ink2">${esc(e.message)}</p>`; });
  applyHighlights(); showSelBar();
}
async function vtKembali() {
  const v = S.viewer; if (!v) return;
  const n = v.tasks.filter(t => !t.dibawa && t.status === 'Belum direvisi').length;
  if (!(await confirmBox(n ? `Kirim ${n} catatan ke mahasiswa dan kembalikan dokumen ini? Mahasiswa akan diberi tahu.` : 'Kembalikan dokumen ke mahasiswa?', 'Kembalikan'))) return;
  await safe(apiA('kembalikanDok', v.dokId).then(r => { v.dok.status = 'Dikembalikan'; v.tasks.forEach(t => { t.dirilis = true; }); invalidate(); renderViewer(); toast('Dokumen dikembalikan ke mahasiswa (' + r.n + ' catatan).', 'ok'); }));
}
async function vtSelesai() {
  const v = S.viewer; if (!v) return;
  const list = v.dok.tahap_list || []; let pil = null;
  if (list.length > 1) { pil = await pilihBab(list); if (!pil) return; }
  else if (!(await confirmBox('Tandai dokumen ini selesai? Bila bab ini punya tahapan, tahapan ikut ditandai selesai otomatis dan mahasiswa diberi tahu.', 'Tandai selesai'))) return;
  await safe(apiA('selesaiDok', v.dokId, pil || []).then(r => { v.dok.status = 'Selesai'; invalidate(); renderViewer(); toast(r.tahapSelesai ? 'Dokumen selesai · ' + r.n + ' tahapan ditandai selesai otomatis.' + (r.sisa ? ' ' + r.sisa + ' bab masih perlu revisi.' : '') : 'Dokumen dinyatakan selesai.', 'ok'); }));
}
async function openDocViewer(dokId, focusId) {
  S.viewer = { dokId: dokId, mode: 'text', filter: 'all', sel: null, composer: false, cAnchor: null, vTab: 'doc', tasks: [], html: '', note: '', file: null, dok: { status: '' }, fs: 16, focus: false };
  openModal(`${modalHead('Memuat dokumen…')}<div class="skel" style="height:55vh"></div><p class="mt-2 text-center text-xs text-ink2">Menyiapkan tampilan dokumen…</p>`, { xl: true, noFocus: true });
  try {
    const fp = S.fileCache[dokId] ? Promise.resolve(S.fileCache[dokId]) : apiA('getFileData', 'dok', dokId, false).catch(() => null);
    const [vw, f] = await Promise.all([apiA('getDokView', dokId), fp]);
    if (!S.viewer || S.viewer.dokId !== dokId || !$('#modalRoot .modal-card')) return;
    Object.assign(S.viewer, vw, { file: f });
    if (f) { S.fileCache[dokId] = f; const ks = Object.keys(S.fileCache); if (ks.length > 3) delete S.fileCache[ks[0]]; S.cur = { f: f }; try { S.viewer.html = await docHtml(dokId, f); } catch (e) { S.viewer.note = e.message; } }
    else S.viewer.note = 'Berkas tidak tersedia (mungkin data contoh).';
    if (!S.viewer || S.viewer.dokId !== dokId || !$('#modalRoot .modal-card')) return;
    if (vw.dok.status === 'Sedang diperiksa') S.dash = null;      // status berubah karena dosen membuka dokumen
    renderViewer();
    if (focusId) setTimeout(() => { goMark(focusId); flash($('#tc-' + focusId)); }, 300);
  } catch (e) { closeModal(); S.viewer = null; if (e.message !== 'SESI_HABIS') toast(e.message, 'error'); }
}

// ---- pratinjau sederhana (surat tugas, LoA) ----
async function openPreview(kind, id, title) {
  openModal(`${modalHead(esc(title))}<div class="skel" style="height:50vh"></div>`, { wide: true, noFocus: true });
  try {
    const f = await apiA('getFileData', kind, id, true); if (!$('#modalRoot .modal-card')) return;
    S.cur = { f: f };
    const isPdf = /pdf/i.test(f.mime), isImg = /^image\//.test(f.mime); let viewer;
    if (isImg) { const u = URL.createObjectURL(b64Blob(f.b64, f.mime)); S.blobUrls.push(u); viewer = `<img src="${u}" alt="${esc(title)}" class="mx-auto max-h-[62vh] rounded-2xl">`; }
    else if (isPdf) viewer = '<div id="pdfBox" class="max-h-[62vh] overflow-y-auto rounded-2xl bg-field p-2"><div class="skel" style="height:300px"></div></div>';
    else viewer = `<div class="empty card-flat">${icon('draft')}<p class="mt-2 font-bold">Pratinjau tidak tersedia</p><p class="text-sm">${esc(f.note || 'Silakan unduh untuk membukanya.')}</p></div>`;
    $('#modalRoot .modal-card').innerHTML = `${modalHead(esc(title))}${viewer}<div class="mt-3 flex flex-wrap justify-end gap-2"><button class="btn btn-ghost" data-act="closeModal">${icon('close')} Tutup</button><button class="btn btn-primary" data-act="dlCurrent">${icon('download')} Unduh</button></div>`;
    if (isPdf) renderPdfInto($('#pdfBox'), f.b64).catch(e => { const b = $('#pdfBox'); if (b) b.innerHTML = `<div class="empty">${icon('picture_as_pdf')}<p class="font-bold">Pratinjau gagal dimuat</p><p class="text-sm">${esc(e.message)} Silakan unduh berkas.</p></div>`; });
  } catch (e) { closeModal(); if (e.message !== 'SESI_HABIS') toast(e.message, 'error'); }
}

// ════════ BAGIAN 14: BIMBINGAN & KEHADIRAN (riwayat berhalaman, cetak, hapus) ════════
function sesiCard(x, dosen, showName, past) {
  const hari = x.tanggal <= todayStr(), meHadir = dosen ? x.hd : x.hm, can = hari && x.status !== 'Batal' && !meHadir && x.status !== 'Valid';
  const d = x.tanggal.split('-');
  return `<div class="card flex flex-wrap items-center gap-3 p-4 ${x.status === 'Batal' ? 'opacity-60' : ''}"><div class="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-brandp text-brandtx"><b class="text-lg leading-none">${+d[2]}</b><span class="text-[10px] font-bold uppercase">${NB[+d[1] - 1]}</span></div>
    <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><b>${esc(x.topik || 'Sesi bimbingan')}</b>${chip(SES_CHIP, x.status)}<span class="chip chip-${x.mode === 'Online' ? 'sky' : 'gold'}">${icon(x.mode === 'Online' ? 'videocam' : 'location_on')}${esc(x.mode)}</span></div>
      <p class="text-sm text-ink2">${esc(x.jam)} WIB · ${d[0]}${showName ? ` · <b class="text-ink">${esc(x.nama)}</b>` : ''}</p>
      <p class="mt-1 flex flex-wrap gap-1.5"><span class="chip ${x.hd ? 'chip-mint' : 'chip-slate'}">${icon(x.hd ? 'check_circle' : 'radio_button_unchecked')}Dosen</span><span class="chip ${x.hm ? 'chip-mint' : 'chip-slate'}">${icon(x.hm ? 'check_circle' : 'radio_button_unchecked')}Mahasiswa</span></p>${x.catatan ? `<p class="mt-1 text-xs text-ink2">${icon('notes', '!text-sm')} ${esc(x.catatan)}</p>` : ''}</div>
    <div class="flex flex-wrap justify-end gap-2">${x.mode === 'Online' && x.link && x.status === 'Dijadwalkan' ? `<a class="btn btn-primary btn-sm" href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">${icon('videocam', '!text-base')} Meet</a>` : ''}
      ${can ? `<button class="btn btn-gold btn-sm" data-act="hadir" data-id="${x.id}">${icon('how_to_reg', '!text-base')} Catat hadir</button>` : ''}
      ${dosen && x.status === 'Dijadwalkan' && hari ? `<button class="btn btn-soft btn-sm" data-act="konfirmasi" data-id="${x.id}">Konfirmasi valid</button>` : ''}
      ${x.status !== 'Batal' ? `<button class="btn btn-ghost btn-sm" data-act="catatan" data-id="${x.id}" aria-label="Catatan sesi">${icon('edit_note', '!text-base')}</button>` : ''}
      ${dosen && x.status === 'Dijadwalkan' && !hari ? `<button class="btn btn-ghost btn-sm" data-act="batalSesi" data-id="${x.id}" aria-label="Batalkan sesi">${icon('event_busy', '!text-base')}</button>` : ''}
      ${dosen && past ? `<button class="btn btn-danger btn-sm" data-act="delSesi" data-id="${x.id}" aria-label="Hapus sesi">${icon('delete', '!text-base')}</button>` : ''}</div></div>`;
}
function sesiList(list, dosen, showName) {
  const t = todayStr();
  const up = list.filter(x => x.tanggal >= t && x.status === 'Dijadwalkan').sort((a, b) => (a.tanggal + a.jam) < (b.tanggal + b.jam) ? -1 : 1);
  let hist = list.filter(x => !(x.tanggal >= t && x.status === 'Dijadwalkan'));
  const months = Array.from(new Set(hist.map(x => x.tanggal.substring(0, 7))));
  if (S.hist.month !== 'all') hist = hist.filter(x => x.tanggal.substring(0, 7) === S.hist.month);
  const shown = hist.slice(0, S.hist.n), rest = hist.length - shown.length;
  const head = `<div class="hscroll mb-3"><button class="fchip ${S.bTab === 'mendatang' ? 'on' : ''}" data-act="bTab" data-t="mendatang">Mendatang (${up.length})</button><button class="fchip ${S.bTab === 'riwayat' ? 'on' : ''}" data-act="bTab" data-t="riwayat">Riwayat (${list.length - up.length})</button></div>`;
  if (S.bTab === 'mendatang') return head + `<div class="space-y-3">${up.length ? up.map(x => sesiCard(x, dosen, showName, false)).join('') : `<div class="card">${empty('event', 'Belum ada jadwal bimbingan', dosen ? 'Buka kelas bimbingan untuk membuat jadwal.' : 'Dosen akan membuka kelas bimbingan.')}</div>`}</div>`;
  const mlabel = m => NB[+m.split('-')[1] - 1] + ' ' + m.split('-')[0];
  return head + `<div class="mb-3 flex flex-wrap items-center gap-2"><label class="sr-only" for="hMonth">Bulan</label><select id="hMonth" class="input !w-auto !min-h-[38px] !rounded-full !py-1 text-sm font-bold" data-change="histMonth"><option value="all">Semua bulan</option>${months.map(m => `<option value="${m}" ${S.hist.month === m ? 'selected' : ''}>${mlabel(m)}</option>`).join('')}</select><span class="text-xs text-ink2">Menampilkan ${shown.length} dari ${hist.length} sesi</span></div>
    <div class="space-y-3">${shown.length ? shown.map(x => sesiCard(x, dosen, showName, true)).join('') : `<div class="card">${empty('history', 'Belum ada riwayat')}</div>`}</div>
    ${rest > 0 ? `<button class="btn btn-ghost btn-block mt-3" data-act="histMore">${icon('expand_more')} Muat ${Math.min(10, rest)} lagi (sisa ${rest})</button>` : ''}`;
}
function tabBimbingan(d, dosen) { return sesiList(d.sesi.map(x => Object.assign({}, x, { nama: d.profil.nama })), dosen, false); }
function hadirOptimistic(id) {
  const dosen = isDosen();
  const apply = () => {
    const patch = x => { if (x.id === id) { if (dosen) x.hd = true; else x.hm = true; if (x.hd && x.hm) x.status = 'Valid'; } };
    Object.keys(S.det).forEach(k => S.det[k].d.sesi.forEach(patch)); (S.sesiAll || []).forEach(patch);
  };
  return optimistic(apply, () => apiA('catatHadir', id), 'Kehadiran tercatat.');
}

// ════════ BIMBINGAN: Revisi Dokumen · Online (Meet) · Diskusi ════════
async function onlineBody() {
  if (isDosen()) {
    let list = S.sesiAll;
    if (!list || Date.now() - (S.sesiAt || 0) > 30000) { list = await apiA('getSesiAll'); S.sesiAll = list; S.sesiAt = Date.now(); }
    return `<div class="mb-3 flex flex-wrap items-center justify-between gap-2"><p class="text-sm text-ink2">Jadwal & kehadiran bimbingan tatap muka / Google Meet.</p><div class="flex flex-wrap gap-2"><button class="btn btn-ghost btn-sm" data-act="openRekap">${icon('print', '!text-base')} Cetak catatan</button><button class="btn btn-ghost btn-sm" data-act="openBersihkan">${icon('cleaning_services', '!text-base')} Bersihkan</button><button class="btn btn-primary btn-sm" data-act="openKelas">${icon('add_circle', '!text-base')} Buka kelas</button></div></div>${sesiList(list, true, true)}`;
  }
  const d = await getDet();
  return `<div class="mb-3 flex flex-wrap items-center justify-between gap-2"><p class="text-sm text-ink2">Kehadiran dicatat dosen dan mahasiswa; sesi <b>valid</b> bila keduanya tercatat (atau dosen mengonfirmasi).</p><button class="btn btn-ghost btn-sm" data-act="openRekap">${icon('print', '!text-base')} Cetak catatan</button></div>${tabBimbingan(d, false)}`;
}
async function diskusiBody() {
  if (!isDosen()) return '<div id="threadBox"></div>';
  const th = await apiA('getThreads'), uid = S.params.uid;
  return `<div class="grid gap-4 md:grid-cols-[320px_1fr]"><div class="${uid ? 'hide-m' : ''} space-y-2">${th.length ? th.map(t => `<button class="card card-hover flex w-full items-center gap-3 p-3 text-left ${t.uid === uid ? '!border-brandtx' : ''}" data-act="openThread" data-uid="${t.uid}">${avatar(t, 42)}<div class="min-w-0 flex-1"><b class="clamp1 block">${esc(t.nama)}</b><span class="clamp1 block text-xs text-ink2">${esc(t.last || 'Belum ada pesan')}</span></div>${t.unread ? `<span class="chip chip-rose">${t.unread}</span>` : ''}</button>`).join('') : `<div class="card">${empty('chat', 'Belum ada mahasiswa')}</div>`}</div>
    <div class="${uid ? '' : 'hide-m'}">${uid ? `<button class="btn btn-ghost btn-sm mb-2 md:hidden" data-act="bimTab" data-t="diskusi">${icon('arrow_back', '!text-base')} Daftar</button><div id="threadBox"></div>` : `<div class="card hide-m">${empty('forum', 'Pilih percakapan', 'Pilih mahasiswa di sebelah kiri.')}</div>`}</div></div>`;
}
PAGES.bimbingan = async function (my) {
  const tab = ['revisi', 'online', 'diskusi'].indexOf(S.params.tab) >= 0 ? S.params.tab : (S.bimTab || 'revisi'); S.bimTab = tab;
  const T = [['revisi', 'Revisi Dokumen', 'description', S.badge.rev], ['online', 'Online (Meet)', 'videocam', 0], ['diskusi', 'Diskusi', 'chat', S.badge.chat]];
  const tabs = `<div class="mb-4 flex gap-1 rounded-2xl border border-line bg-field p-1" role="tablist">${T.map(t => `<button class="tab-big ${tab === t[0] ? 'on' : ''}" role="tab" aria-selected="${tab === t[0]}" data-act="bimTab" data-t="${t[0]}">${icon(t[2], '!text-lg')}<span>${t[1]}</span>${t[3] ? `<span class="nbadge">${t[3] > 9 ? '9+' : t[3]}</span>` : ''}</button>`).join('')}</div>`;
  const body = tab === 'revisi' ? (isDosen() ? await boardDosen() : boardMhs(await getDet())) : tab === 'online' ? await onlineBody() : await diskusiBody();
  if (my !== S.nav) return;
  if (!view(`<section class="px-4 pt-4 md:pt-6">${tabs}${body}</section>`, my)) return;
  if (tab === 'diskusi') { const uid = isDosen() ? S.params.uid : S.user.uid; if (uid) mountThread(uid); }
};
PAGES.token = async function (my) {
  const list = await apiA('listToken'); if (my !== S.nav) return;
  const SC = { aktif: ['mint', 'Aktif'], sebagian: ['sky', 'Sebagian terpakai'], habis: ['slate', 'Kuota habis'], kedaluwarsa: ['rose', 'Kedaluwarsa'] };
  view(`<section class="px-4 pt-4 md:pt-6">${sectionTitle('Kelola token pendaftaran')}<div class="card mb-4 p-4"><p class="mb-3 text-sm text-ink2">Mahasiswa mendaftar <b>sekali</b> memakai token, lalu membuat kata sandi sendiri. Satu token dapat dipakai beberapa mahasiswa (kuota) dan diberi masa berlaku.</p>
    <form class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.9fr_auto]" data-form="newToken"><div><label class="label" for="tCat">Catatan</label><input id="tCat" class="input" name="catatan" maxlength="80" placeholder="Mis. Angkatan 2021"></div><div><label class="label" for="tKuota">Kuota mahasiswa</label><input id="tKuota" class="input" name="kuota" type="number" min="1" max="100" value="1" required></div><div><label class="label" for="tHari">Masa berlaku</label><select id="tHari" class="input" name="hari"><option value="0">Tanpa batas</option><option value="1">1 hari</option><option value="3">3 hari</option><option value="7" selected>7 hari</option><option value="14">14 hari</option><option value="30">30 hari</option><option value="90">90 hari</option></select></div><div class="flex items-end"><button class="btn btn-primary w-full" type="submit">${icon('add_circle')} Buat token</button></div></form></div>
    <div class="space-y-2">${list.length ? list.map(t => { const sc = SC[t.status] || ['slate', t.status]; return `<div class="card p-3.5"><div class="flex flex-wrap items-center gap-3"><span class="token-box">${esc(t.token)}</span><div class="min-w-0 flex-1"><p class="clamp1 text-sm font-semibold">${esc(t.catatan || 'Tanpa catatan')}</p><p class="text-[11px] text-ink2">Dibuat ${tglJam(t.dibuat)} · ${t.berlaku ? 'berlaku s.d. ' + tgl(t.berlaku) : 'tanpa batas waktu'}</p></div><span class="chip chip-${sc[0]}">${sc[1]}</span><span class="chip chip-slate">${icon('group')}${t.terpakai}/${t.kuota}</span>
      <div class="flex gap-2">${t.status === 'aktif' || t.status === 'sebagian' ? `<button class="btn btn-soft btn-sm" data-act="copy" data-v="${esc(t.token)}" aria-label="Salin token">${icon('content_copy', '!text-base')} Salin</button>` : ''}${t.status !== 'habis' ? `<button class="btn btn-ghost btn-sm" data-act="tokenExt" data-v="${esc(t.token)}">${icon('more_time', '!text-base')} +7 hari</button>` : ''}<button class="btn btn-danger btn-sm" data-act="delToken" data-v="${esc(t.token)}" aria-label="Hapus token">${icon('delete', '!text-base')}</button></div></div>${t.pemakai.length ? `<p class="mt-2 text-xs text-ink2">${icon('how_to_reg', '!text-sm')} Dipakai: ${t.pemakai.map(esc).join(', ')}</p>` : ''}</div>`; }).join('') : `<div class="card">${empty('key', 'Belum ada token', 'Buat token untuk mahasiswa bimbingan baru.')}</div>`}</div></section>`, my);
};

// ════════ BAGIAN 15: DISKUSI (5 pesan terakhir, hapus otomatis 7 hari) ════════
function mountThread(uid) {
  const box = $('#threadBox'); if (!box) return;
  box.innerHTML = `<div class="card flex h-[68vh] flex-col p-3 md:p-4"><p class="mb-2 rounded-xl bg-field px-3 py-1.5 text-[11px] text-ink2">${icon('info', '!text-sm')} Ruang diskusi singkat: hanya <b>5 pesan terakhir</b> yang tampil, dan pesan otomatis terhapus setelah <b>7 hari</b>. Untuk catatan dokumen, gunakan penampil dokumen.</p><div id="msgs" class="flex-1 space-y-3 overflow-y-auto px-1 py-2"><div class="skel" style="height:80px"></div></div>
    <form class="mt-2 flex gap-2" data-form="sendMsg" data-uid="${uid}"><input class="input" name="isi" placeholder="Tulis pesan…" maxlength="1000" required aria-label="Pesan" autocomplete="off"><button class="btn btn-primary" type="submit" aria-label="Kirim">${icon('send')}</button></form></div>`;
  S.threadUid = uid; loadMsgs(uid);
}
async function loadMsgs(uid) {
  try {
    const r = await apiRaw({ silent: true }, 'getPesan', [S.tok, uid]), el = $('#msgs'); if (!el) return;
    const me = S.user.role;
    el.innerHTML = r.pesan.length ? r.pesan.map(m => { const mine = m.dari === me, dos = m.dari === 'dosen';
      return `<div class="flex ${mine ? 'justify-end' : ''}"><div class="msgwrap ${mine ? 'me' : ''}"><p class="mb-1 flex ${mine ? 'justify-end' : ''} flex-wrap items-center gap-1.5 text-[11px] font-bold"><span class="chip ${dos ? 'chip-rose' : 'chip-sky'}">${icon(dos ? 'school' : 'person')}${esc(m.nama)} · ${dos ? 'Dosen' : 'Mahasiswa'}</span><span class="font-medium text-ink2">${tglJam(m.tanggal)}${m.baru ? ' · baru' : ''}</span></p><div class="bubble ${dos ? 'dosen' : 'mhs'} ${mine ? 'me' : ''}">${esc(m.isi)}</div></div></div>`; }).join('') : empty('chat_bubble', 'Belum ada pesan', 'Mulai percakapan singkat di sini.');
    el.scrollTop = el.scrollHeight; S.dash = null;
  } catch (e) { if (e.message !== 'SESI_HABIS') toast(e.message, 'error'); }
}

// ════════ BAGIAN 16: MEDALI (ikon) & REKAP PROGRES ════════
function medalCatalog(unlocked, allOn) {
  const best = {}; (unlocked || []).forEach(e => { const p = parseMedal(e); best[p.id] = Math.max(best[p.id] || 0, p.tier || 1); });
  return `<div class="medals-grid">${Object.keys(MEDALS).map(id => { const m = MEDALS[id], has = allOn || best[id] !== undefined, entry = m.t ? id + ':' + (allOn ? 3 : (best[id] || 0)) : id;
    return `<div class="medal-cell">${medalIcon(entry, has, 'lg')}<span>${esc(m.n)}</span>${m.t && has && !allOn ? `<span class="tier-tag t${best[id]}">${TIER[best[id]]}</span>` : m.t && !has ? '<span class="font-medium text-ink2">3 tingkat</span>' : ''}</div>`; }).join('')}</div>`;
}
PAGES.medali = async function (my) {
  const d = await apiA('getMedali'); if (my !== S.nav) return;
  const r = d.ranking, top = r.slice(0, 3), podium = [top[1], top[0], top[2]].filter(Boolean), mine = r.find(x => x.uid === d.me), A = d.aturan || {};
  const me = mine ? { xp: mine.xp, level: d.level || mine.level || null, xpDetail: d.detail || {}, streak: d.streak, lencana: mine.lencana } : null;
  const ladder = idx => `<div class="lv-ladder">${d.levels.map((l, i) => `<div class="lv-step ${i < idx ? 'done' : i === idx ? 'cur' : ''}"><span class="lv-dot">${icon(LV_ICON[i], i <= idx ? 'ms-fill' : '')}</span><br>${esc(l.nama)}<br><span class="font-medium">${l.xp} XP</span></div>`).join('')}</div>`;
  const rows = me ? [['Tahapan selesai', 'flag', me.xpDetail.tahap], ['Bimbingan valid', 'event_available', me.xpDetail.bimbingan], ['Catatan disetujui', 'task_alt', me.xpDetail.revisi], ['Dokumen dikirim', 'upload_file', me.xpDetail.dokumen], ['Streak terbaik', 'local_fire_department', me.xpDetail.streak], ['Medali', 'military_tech', me.xpDetail.medali]] : [];
  const html = `<section class="px-4 pt-4 md:pt-6">${sectionTitle('Medali, XP & level', isDosen() ? `<button class="btn btn-soft btn-sm" data-act="nav" data-page="pengaturan">${icon('tune', '!text-base')} Atur XP</button>` : '')}
    ${me ? `<div class="mb-4 grid gap-3 md:grid-cols-2">${xpCard(me)}${streakCard(me.streak)}</div>
      <div class="card mb-4 p-4"><p class="mb-2 font-bold">${icon('stacked_bar_chart', '!text-base')} Dari mana XP-mu</p><div class="grid grid-cols-2 gap-2 sm:grid-cols-3">${rows.map(x => `<div class="card-flat flex items-center gap-2 p-2.5">${icon(x[1], '!text-lg text-brandtx')}<span class="min-w-0 flex-1 text-xs font-semibold">${x[0]}</span><b>${x[2]}</b></div>`).join('')}</div></div>` : ''}
    <div class="card mb-4 p-4"><p class="mb-3 font-bold">${icon('stairs', '!text-base')} Tangga level</p>${ladder(me && me.level ? me.level.idx : -1)}<p class="mt-3 text-xs text-ink2">XP terus bertambah dari aktivitasmu, dan level naik otomatis saat ambang terlampaui. Setiap level memberi gelar baru.</p></div>
    ${r.length ? `<div class="hero-soft p-5"><p class="mb-3 text-center text-xs font-bold uppercase tracking-wider text-ink2">Peringkat XP</p><div class="flex items-end justify-center gap-3 md:gap-8">${podium.map(x => { const h = x.rank === 1 ? 120 : x.rank === 2 ? 92 : 76; return `<div class="flex w-24 flex-col items-center text-center md:w-32">${avatar({ nama: x.nama, foto: x.foto, wisuda: x.wisuda }, x.rank === 1 ? 64 : 52)}<b class="mt-2 clamp1 w-full text-sm">${esc(x.namaPendek || x.nama)}</b>${levelChip(x.level)}<span class="mt-0.5 text-xs font-bold text-brandtx">${icon('bolt', '!text-sm')}${x.xp} XP</span><div class="mt-2 flex w-full items-center justify-center rounded-t-2xl font-extrabold text-white" style="height:${h}px;background:linear-gradient(180deg,rgb(var(--${x.rank === 1 ? 'gold' : 'brand-btn'})),rgb(var(--brand-deep)));opacity:${x.rank === 1 ? 1 : .8}">${x.rank}</div></div>`; }).join('')}</div></div>
    <div class="mt-4 space-y-2">${r.map(x => `<div class="card flex items-center gap-3 p-3.5 ${x.uid === d.me ? '!border-brandtx' : ''}"><span class="w-6 text-center font-extrabold text-ink2">${x.rank}</span>${avatar({ nama: x.nama, foto: x.foto, wisuda: x.wisuda }, 42)}<div class="min-w-0 flex-1"><b class="clamp1 block">${esc(x.nama)}${x.uid === d.me ? ' <span class="chip chip-rose">Kamu</span>' : ''}</b><div class="mt-1 flex flex-wrap items-center gap-1.5">${levelChip(x.level)}${streakChip({ sekarang: x.streak })}${medalRow(x.lencana, 10) || '<span class="text-xs text-ink2">Belum ada medali</span>'}</div></div><div class="text-right"><b class="text-brandtx">${x.xp} XP</b><p class="text-[11px] text-ink2">${x.selesai} tahap · ${x.bimbingan} bimbingan</p></div></div>`).join('')}</div>` : `<div class="card">${empty('military_tech', 'Belum ada peserta')}</div>`}
    <div class="card mt-4 p-4"><p class="mb-1 font-bold">${icon('workspace_premium', '!text-base')} Koleksi medali</p><p class="mb-3 text-xs text-ink2">Medali <b>tidak eksklusif</b>: semua mahasiswa yang memenuhi syarat mendapatkannya, dengan tingkat Perunggu, Perak, atau Emas. ${isDosen() ? 'Arahkan kursor ke ikon untuk melihat syaratnya.' : 'Arahkan kursor (atau sentuh) ikon untuk melihat syarat; ikon abu-abu belum terbuka.'}</p>${medalCatalog(mine ? mine.lencana : [], isDosen())}</div>
    <div class="card mt-4 p-4"><p class="font-bold">${icon('info', '!text-base')} Cara XP dihitung</p><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-ink2"><li><b>${A.tahap}</b> XP setiap tahapan selesai</li><li><b>${A.bimbingan}</b> XP setiap bimbingan valid</li><li><b>${A.revisi}</b> XP setiap catatan dosen yang disetujui</li><li><b>${A.dokumen}</b> XP setiap versi dokumen dikirim</li><li><b>${A.streak}</b> XP untuk tiap minggu pada rekor streak terbaik</li><li>Medali: Perunggu +25, Perak +50, Emas +100 XP; tonggak (Lolos Proposal, Mahkota, dll.) +50 XP</li></ul><p class="mt-2 text-xs text-ink2"><b>Streak</b> dihitung per minggu (Senin–Minggu): minggu aktif bila ada kirim dokumen, centang catatan revisi, atau bimbingan valid. Melewatkan satu minggu penuh memutus streak.</p></div></section>`;
  view(html, my);
};
const RK = { belum: ['Belum wisuda', x => !x.wisuda], lulus: ['Sudah wisuda', x => x.wisuda], semua: ['Semua', () => true] };
function rekapRows(sum) { const f = RK[S.rk] ? S.rk : 'belum'; return sum.students.filter(RK[f][1]).sort((a, b) => (a.wisuda - b.wisuda) || (b.progres - a.progres)); }
PAGES.rekap = async function (my) {
  const d = await getDash(); if (my !== S.nav) return;
  const st = d.sum.students, rows = rekapRows(d.sum), lulus = st.filter(x => x.wisuda), A = (x, n) => { const a = x.acara[n]; return a ? `<span class="whitespace-nowrap font-semibold">${esc(a.hari)}, ${tgl(a.tgl)}</span>${a.ket ? `<br><span class="text-[11px] text-ink2">${esc(a.ket)}</span>` : ''}` : '<span class="text-ink2">-</span>'; };
  view(`<section class="px-4 pt-4 md:pt-6">${sectionTitle('Rekap progres mahasiswa', `<div class="flex gap-2"><button class="btn btn-ghost btn-sm" data-act="rekapCsv">${icon('table_view', '!text-base')} CSV</button><button class="btn btn-primary btn-sm" data-act="rekapPdf">${icon('picture_as_pdf', '!text-base')} PDF</button></div>`)}
    <div class="mb-3 grid grid-cols-3 gap-3 text-center"><div class="card p-3"><b class="block text-2xl">${st.length}</b><span class="text-xs text-ink2">Total</span></div><div class="card p-3"><b class="block text-2xl text-brandtx">${st.length - lulus.length}</b><span class="text-xs text-ink2">Belum wisuda</span></div><div class="card p-3"><b class="block text-2xl text-mintink">${lulus.length}</b><span class="text-xs text-ink2">Sudah wisuda</span></div></div>
    <div class="hscroll mb-3">${Object.keys(RK).map(k => `<button class="fchip ${S.rk === k ? 'on' : ''}" data-act="rekapFilter" data-f="${k}">${RK[k][0]} (${st.filter(RK[k][1]).length})</button>`).join('')}</div>
    <div class="card scroll-x"><table class="tbl"><thead><tr><th>Mahasiswa</th><th>Tahap saat ini</th><th>Progres</th><th>Sidang proposal</th><th>Sidang kolokium</th><th>Publikasi</th><th>Yudisium</th><th>Daftar wisuda</th><th>Wisuda</th></tr></thead><tbody>${rows.length ? rows.map(x => `<tr class="cursor-pointer" data-act="detail" data-uid="${x.uid}"><td><b>${esc(x.nama)}</b>${x.wisuda ? ` <span class="chip chip-mint">${icon('school')}Lulus</span>` : ''}<br><span class="text-[11px] text-ink2">${esc(x.npm)}</span></td><td>${esc(x.tahap_aktif)}</td><td class="whitespace-nowrap"><b>${x.progres}%</b></td><td>${A(x, 'Sidang proposal')}</td><td>${A(x, 'Sidang kolokium')}</td><td>${x.pub ? `${esc(x.pub.jurnal)}<br>${chip(PUB_CHIP, x.pub.status)}${x.pub.loa ? '<span class="chip chip-mint">LoA</span>' : ''}` : '<span class="text-ink2">-</span>'}</td><td>${A(x, 'Pemberkasan yudisium')}</td><td>${A(x, 'Pendaftaran wisuda')}</td><td>${A(x, 'Wisuda')}</td></tr>`).join('') : `<tr><td colspan="9">${empty('table_chart', 'Tidak ada data', 'Ubah filter di atas.')}</td></tr>`}</tbody></table></div></section>`, my);
};
function rekapCsvText(sum) {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', A = (x, n) => x.acara[n] ? x.acara[n].hari + ', ' + x.acara[n].tgl : '';
  const head = ['Nama', 'NPM', 'Judul', 'Tahap saat ini', 'Progres (%)', 'Status', 'Sidang proposal', 'Sidang kolokium', 'Jurnal', 'Status publikasi', 'LoA', 'Yudisium', 'Daftar wisuda', 'Wisuda'];
  return '\ufeff' + [head.map(q).join(',')].concat(rekapRows(sum).map(x => [x.nama, x.npm, x.judul, x.tahap_aktif, x.progres, x.wisuda ? 'Sudah wisuda' : 'Belum wisuda', A(x, 'Sidang proposal'), A(x, 'Sidang kolokium'), x.pub ? x.pub.jurnal : '', x.pub ? x.pub.status : '', x.pub && x.pub.loa ? 'Ada' : '', A(x, 'Pemberkasan yudisium'), A(x, 'Pendaftaran wisuda'), A(x, 'Wisuda')].map(q).join(','))).join('\r\n');
}

// ════════ BAGIAN 17: TOKEN, PENGATURAN, PROFIL ════════
PAGES.pengaturan = async function (my) {
  const p = await apiA('getPengaturan'); if (my !== S.nav) return;
  const n = (id, l, v, h, mn, mx) => `<div><label class="label" for="${id}">${l}</label><input id="${id}" name="${id}" type="number" min="${mn}" max="${mx}" class="input" value="${esc(v)}" required>${h ? `<p class="help">${h}</p>` : ''}</div>`;
  view(`<section class="px-4 pt-4 md:pt-6">${sectionTitle('Pengaturan')}<form data-form="saveSetting" class="space-y-4">
    <div class="card space-y-3 p-4"><p class="font-extrabold">Ambang peringatan</p><div class="grid gap-3 sm:grid-cols-2">${n('ambang_urgent', 'Surat tugas segera habis (hari)', p.ambang_urgent, 'Banner, notifikasi, dan email harian muncul sejak sisa hari ini.', 1, 60)}${n('ambang_tidak_aktif', 'Dianggap pasif setelah (hari)', p.ambang_tidak_aktif, 'Memicu kutipan semangat otomatis, maksimal sekali per periode.', 3, 90)}</div></div>
    <div class="card space-y-3 p-4"><p class="font-extrabold">Aturan XP &amp; level</p><p class="text-xs text-ink2">XP menentukan peringkat dan level (${p.levels.map(l => l.nama + ' ' + l.xp).join(' → ')}). Medali bersifat tidak eksklusif.</p><div class="grid gap-3 sm:grid-cols-3">${n('x_tahap', 'XP per tahap selesai', p.xp.tahap, '', 0, 500)}${n('x_bimbingan', 'XP per bimbingan valid', p.xp.bimbingan, '', 0, 500)}${n('x_revisi', 'XP per catatan disetujui', p.xp.revisi, '', 0, 500)}${n('x_dokumen', 'XP per dokumen dikirim', p.xp.dokumen, '', 0, 500)}${n('x_streak', 'XP per minggu streak terbaik', p.xp.streak, '', 0, 500)}${n('target_hari_tahap', 'Target hari/tahap (medali Cepat Tanggap)', p.target_hari_tahap, '', 1, 120)}</div></div>
    <div class="card space-y-3 p-4"><p class="font-extrabold">Kutipan semangat</p><div><label class="label" for="kutipan">Satu kutipan per baris (dipilih acak)</label><textarea id="kutipan" name="kutipan" class="input" style="min-height:180px" required>${esc(p.kutipan.join('\n'))}</textarea></div></div>
    <div class="card space-y-3 p-4"><p class="font-extrabold">Rekap kehadiran (PDF)</p><p class="text-xs text-ink2">Kop dan catatan ini dipakai pada PDF. Format tabel dapat disesuaikan setelah format khusus dosen diterima.</p><div><label class="label" for="r_judul">Judul</label><input id="r_judul" name="r_judul" class="input" value="${esc(p.rekap.judul)}" maxlength="120"></div><div><label class="label" for="r_instansi">Instansi</label><input id="r_instansi" name="r_instansi" class="input" value="${esc(p.rekap.instansi)}" maxlength="160"></div><div><label class="label" for="r_catatan">Catatan kaki</label><input id="r_catatan" name="r_catatan" class="input" value="${esc(p.rekap.catatan)}" maxlength="300"></div></div>
    <button class="btn btn-primary btn-block" type="submit">${icon('save')} Simpan pengaturan</button></form></section>`, my);
};
PAGES.profil = async function (my) {
  let judul = '', me = null;
  if (!isDosen()) { const [d, dash] = await Promise.all([getDet(), getDash()]); judul = d.profil.judul; me = dash.me; if (my !== S.nav) return; }
  const u = S.user, dark = document.documentElement.getAttribute('data-theme') === 'dark';
  view(`<section class="px-4 pt-4 md:pt-6">${sectionTitle('Profil & tampilan')}<div class="grid gap-4 md:grid-cols-2"><div class="space-y-4"><form class="card space-y-3 p-4" data-form="saveProfil" data-uid="${u.uid}"><div class="flex items-center gap-3">${avatar({ nama: u.nama, foto: u.foto, wisuda: me && me.wisuda }, 60)}<div><b class="text-lg">${esc(u.nama)}</b><p class="text-xs text-ink2">${esc(u.email)}${u.npm ? ' · NPM ' + esc(u.npm) : ''}</p></div></div>
    <div><label class="label" for="pNama">Nama</label><input id="pNama" name="nama" class="input" value="${esc(u.nama)}" required maxlength="80"></div>
    <div><label class="label" for="pFoto">Tautan foto profil (opsional)</label><input id="pFoto" name="foto" type="url" class="input" value="${esc(u.foto)}" placeholder="https://…" maxlength="400"><p class="help">Gunakan tautan gambar https. Mahkota otomatis muncul setelah wisuda.</p></div>
    ${isDosen() ? '' : `<div><label class="label" for="pJudul">Judul skripsi</label><textarea id="pJudul" name="judul" class="input" maxlength="300">${esc(judul)}</textarea></div>`}
    <button class="btn btn-primary btn-block" type="submit">${icon('save')} Simpan profil</button></form>
    <div class="card p-4"><p class="mb-3 font-extrabold">Tampilan</p><button class="btn btn-ghost btn-block" data-act="toggleTheme">${icon(dark ? 'light_mode' : 'dark_mode')} ${dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}</button></div>
    <form class="card space-y-3 p-4" data-form="ubahSandi"><p class="font-extrabold">${icon('lock', '!text-base')} Ubah kata sandi</p>${pwField('spLama', 'lama', 'Kata sandi saat ini', 'current-password')}${pwField('spBaru', 'baru', 'Kata sandi baru', 'new-password', 'Minimal 8 karakter, memuat huruf dan angka.')}${pwField('spBaru2', 'baru2', 'Ulangi kata sandi baru', 'new-password')}<button class="btn btn-soft btn-block" type="submit">${icon('key')} Simpan kata sandi</button><p class="help">Belum punya kata sandi lama? Keluar lalu pilih "Lupa / atur kata sandi" saat masuk.</p></form>
    <div class="card p-4"><p class="mb-3 font-extrabold">Akun</p><button class="btn btn-danger btn-block" data-act="logout">${icon('logout')} Keluar</button></div></div>
    <div class="space-y-4">${!isDosen() && me ? xpCard(me) + streakCard(me.streak) : ''}${isDosen() ? `<div class="card p-4"><p class="font-extrabold">${icon('military_tech', '!text-base')} Medali mahasiswa</p><p class="mt-1 text-sm text-ink2">Medali dimiliki mahasiswa dan tampil di profil mereka. Lihat daftar lengkap & syaratnya di Papan Medali.</p><button class="btn btn-soft btn-block mt-3" data-act="nav" data-page="medali">Buka Papan Medali</button></div>` : `<div class="card p-4"><p class="font-extrabold">${icon('military_tech', '!text-base')} Medali saya <span class="chip chip-gold">${me ? me.lencana.length : 0}/${Object.keys(MEDALS).length}</span></p><p class="mb-3 mt-1 text-xs text-ink2">Arahkan kursor (atau sentuh) ikon untuk melihat nama medali dan syaratnya. Ikon abu-abu belum terbuka.</p>${medalCatalog(me ? me.lencana : [], false)}</div>`}</div></div></section>`, my);
};

// ════════ BAGIAN 18: NOTIFIKASI ════════
const NOTIF_GO = { surat_tugas: 'surat', dokumen: 'dokumen', revisi: 'dokumen', komentar: 'dokumen', bimbingan: 'bimbingan', diskusi: 'diskusi', medali: 'medali', tahapan: 'home', semangat: 'home', pendaftaran: 'mahasiswa', publikasi: 'tahapan', sistem: 'profil' };
const NOTIF_ICON = { surat_tugas: 'assignment', dokumen: 'description', revisi: 'edit_note', komentar: 'comment', bimbingan: 'forum', diskusi: 'chat', medali: 'military_tech', tahapan: 'flag', semangat: 'volunteer_activism', pendaftaran: 'person_add', publikasi: 'menu_book' };
async function openNotif() {
  openModal(`${modalHead('Notifikasi')}<div class="skel" style="height:200px"></div>`, { noFocus: true });
  try {
    const list = await apiA('getNotif'); if (!$('#modalRoot .modal-card')) return;
    $('#modalRoot .modal-card').innerHTML = `${modalHead('Notifikasi')}<div class="mb-3 flex justify-end"><button class="btn btn-soft btn-sm" data-act="readAll">${icon('done_all', '!text-base')} Tandai semua dibaca</button></div>
      <div class="space-y-2">${list.length ? list.map(n => `<button class="check w-full text-left ${n.baca ? '' : '!border-brandtx'}" data-act="notifGo" data-id="${n.id}" data-j="${n.jenis}" data-ref="${esc(n.ref)}">${icon(NOTIF_ICON[n.jenis] || 'notifications', 'text-brandtx')}<span class="min-w-0 flex-1"><span class="block text-sm ${n.baca ? '' : 'font-bold'}">${esc(n.isi)}</span><span class="text-[11px] text-ink2">${lalu(n.tanggal)}</span></span>${n.baca ? '' : '<span class="pulse-dot text-brandtx"></span>'}</button>`).join('') : empty('notifications_off', 'Belum ada notifikasi')}</div>`;
  } catch (e) { closeModal(); toast(e.message, 'error'); }
}
