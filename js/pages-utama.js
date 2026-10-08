'use strict';

// ════════ BAGIAN 6: DATA (cache ringan + optimistic UI) ════════
async function getDash(force) {
  if (!force && S.dash && Date.now() - S.dashAt < 45000) return S.dash;
  const d = await apiA('getDashboard', !!force);
  S.dash = d; S.dashAt = Date.now();
  const stale = d.role === 'dosen' ? d.sum.stale : d.stale;
  if (stale && !force) setTimeout(() => refreshDash(true), 60); // pembaruan di belakang layar
  return d;
}
async function refreshDash(silent) {
  try { await getDash(true); if (S.page === 'home' || S.page === 'mahasiswa' || S.page === 'surat' || S.page === 'dokumen') rerender(); if (!silent) toast('Dashboard diperbarui.', 'ok'); }
  catch (e) { if (!silent) toast(e.message, 'error'); }
}
async function getDet(uid, force) {
  const k = uid || S.user.uid, c = S.det[k];
  if (!force && c && Date.now() - c.t < 60000) return c.d;
  const d = await apiA('getStudentDetail', isDosen() ? uid : S.user.uid);
  S.det[k] = { t: Date.now(), d: d }; return d;
}
function invalidate(uid) { if (uid) delete S.det[uid]; else S.det = {}; S.dash = null; S.sesiAll = null; S.antrian = null; }
/** Terapkan perubahan langsung di layar, sinkronkan ke server, kembalikan bila gagal. */
async function optimistic(mutate, call, okMsg) {
  mutate(); rerender();
  try { const r = await call(); S.dash = null; if (okMsg) toast(okMsg, 'ok'); return r; }
  catch (e) { if (e.message !== 'SESI_HABIS') toast(e.message, 'error'); invalidate(); rerender(); }
}

// ════════ BAGIAN 7: HOME ════════
PAGES.home = async function (my) {
  const d = await getDash();
  if (my !== S.nav) return;
  if (d.role === 'dosen') homeDosen(d.sum, my); else homeMhs(d, my);
};
const FILTERS = {
  all: ['Semua', x => true],
  st: ['Surat tugas segera habis', x => x.st && (x.st.status === 'Segera habis' || x.st.status === 'Kedaluwarsa') && !x.wisuda],
  pasif: ['Belum bimbingan 2 minggu', x => x.pasif],
  dok: ['Mengirim dokumen', x => x.dokTerakhir && x.dokTerakhir.status === 'Menunggu diperiksa'],
  sidang: ['Siap sidang / yudisium', x => /^Sidang|yudisium|wisuda/i.test(x.tahap_aktif) && !x.wisuda]
};
const dokChip = x => x.dokTerakhir && x.dokTerakhir.status === 'Menunggu diperiksa' ? `<span class="chip chip-gold">${icon('upload_file')}Kirim ${esc(x.dokTerakhir.tahap.replace(/^Bimbingan (proposal|skripsi): /, ''))}</span>` : '';
function studentRow(x) {
  const urgent = x.st && (x.st.status === 'Segera habis' || x.st.status === 'Kedaluwarsa') && !x.wisuda;
  const bd = x.wisuda ? 'mint' : urgent ? 'brand' : x.pasif ? 'gold' : 'sky';
  const stc = x.st && !x.wisuda ? chip(ST_CHIP, x.st.status, x.st.sisa != null ? ' · ' + (x.st.sisa < 0 ? 'lewat' : x.st.sisa + ' hr') : '') : '';
  const right = x.wisuda ? `<span class="chip chip-mint">${icon('workspace_premium')}Lulus</span>` :
    (x.pasif ? `<button class="btn btn-gold btn-sm" data-act="sapa" data-uid="${x.uid}" aria-label="Sapa ${esc(x.nama)}">${icon('campaign', '!text-base')} Sapa</button>` : '');
  return `<div class="card card-hover flex cursor-pointer items-center gap-3 p-3.5 md:p-4" style="border-left:5px solid rgb(var(--${bd === 'brand' ? 'brand-btn' : bd}))" data-act="detail" data-uid="${x.uid}" role="button" tabindex="0" aria-label="Buka detail ${esc(x.nama)}">
    ${avatar(x, 50)}
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1"><b class="text-base">${esc(x.nama)}</b><span class="chip chip-sky">${esc(x.npm)}</span>${stc}${dokChip(x)}${levelChip(x.level)}${streakChip(x.streak)}${x.pasif && !x.wisuda ? `<span class="chip chip-gold">${icon('hotel')}${x.hariTanpa} hari pasif</span>` : ''}</div>
      <p class="clamp1 text-sm text-ink2">${esc(x.judul || 'Judul belum diisi')}</p>
      <p class="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink2"><span>${icon('flag', '!text-sm')} ${esc(x.tahap_aktif)}</span><span>${icon('history', '!text-sm')} Bimbingan ke-${x.bimbinganKe}</span>${x.revisiCount ? `<span class="text-brandtx font-bold">${icon('edit_note', '!text-sm')} ${x.revisiCount} revisi</span>` : ''}</p>
    </div>
    <div class="flex flex-shrink-0 items-center gap-2"><div class="hide-m text-right leading-tight"><b class="text-base">${x.progres}%</b><br><span class="text-[11px] text-ink2">${x.selesai}/${x.total}</span></div>
      <div class="relative">${ring(x.progres, 52, x.wisuda ? 'mint' : urgent ? 'brand' : x.pasif ? 'gold' : 'sky')}<span class="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold md:hidden">${x.progres}%</span></div>
      ${right || `<span class="icon-btn tonal" aria-hidden="true">${icon('chevron_right')}</span>`}</div></div>`;
}
function studentListHtml(sum) {
  const counts = {}; Object.keys(FILTERS).forEach(k => counts[k] = sum.students.filter(FILTERS[k][1]).length);
  return `<div class="card p-3.5 md:p-4"><label class="search"><span class="material-symbols-outlined text-ink2" aria-hidden="true">search</span><input id="stuSearch" type="search" placeholder="Cari nama, NPM, atau topik skripsi…" aria-label="Cari mahasiswa" value="${esc(S.fl.q)}" autocomplete="off"></label>
    <div class="hscroll mt-3" role="group" aria-label="Filter">${Object.keys(FILTERS).map(k => `<button class="fchip ${S.fl.f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${FILTERS[k][0]} (${counts[k]})</button>`).join('')}</div></div>
    <div id="stuList" class="mt-3 space-y-3"></div>`;
}
function fillStudentList() {
  const sum = S.dash && S.dash.sum, el = $('#stuList'); if (!sum || !el) return;
  const q = S.fl.q.trim().toLowerCase();
  const rows = sum.students.filter(FILTERS[S.fl.f][1]).filter(x => !q || (x.nama + ' ' + x.npm + ' ' + x.judul).toLowerCase().indexOf(q) >= 0);
  el.innerHTML = rows.length ? rows.map(studentRow).join('') : `<div class="card">${empty('person_search', S.dash.sum.students.length ? 'Tidak ada mahasiswa yang cocok' : 'Belum ada mahasiswa', S.dash.sum.students.length ? 'Coba ubah kata kunci atau filter.' : 'Buat token di menu <b>Kelola Token</b>, lalu bagikan ke mahasiswa bimbingan.')}</div>`;
  $$('.fchip').forEach(b => b.classList.toggle('on', b.dataset.f === S.fl.f));
  const cnt = {}; Object.keys(FILTERS).forEach(k => cnt[k] = sum.students.filter(FILTERS[k][1]).length);
  $$('.fchip').forEach(b => b.textContent = FILTERS[b.dataset.f][0] + ' (' + cnt[b.dataset.f] + ')');
}
function kpiCard(ic, tone, chipTxt, label, val, sub) {
  return `<div class="card card-hover p-4"><div class="flex items-start justify-between"><span class="avatar tone-${tone}" style="width:44px;height:44px;border-radius:1rem">${icon(ic)}</span>${chipTxt ? `<span class="chip chip-${['sky', 'rose', 'gold', 'mint'][tone]}">${chipTxt}</span>` : ''}</div><p class="mt-3 text-[11px] font-bold uppercase tracking-wider text-ink2">${label}</p><p class="text-2xl font-extrabold leading-tight md:text-[28px]">${val}</p><p class="text-xs text-ink2">${sub}</p></div>`;
}
function homeDosen(sum, my) {
  const k = sum.kpi, nm = first(S.user.nama);
  const alerts = [];
  if (k.stKritis) alerts.push(`${k.stKritis} surat tugas segera habis (≤ ${S.meta.ambang.urgent} hari) atau kedaluwarsa`);
  if (k.pasif) alerts.push(`${k.pasif} mahasiswa perlu disemangati (≥ ${S.meta.ambang.tidakAktif} hari tanpa bimbingan)`);
  const jd = sum.jadwal[0];
  const html = `
  <section class="px-4 pt-4 md:pt-6"><div class="hero-soft flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-8">
    <div class="relative z-10 min-w-0"><span class="chip chip-mint bg-white/70" style="background:rgb(var(--card)/.75)"><span class="pulse-dot"></span>Semester berjalan</span>
      <h1 class="mt-3 text-[26px] font-extrabold leading-tight tracking-tight text-brandtx md:text-4xl">Selamat datang kembali, Bu ${esc(nm)}! 👋</h1>
      <p class="mt-2 max-w-xl text-ink2">Pantau ${k.aktif} mahasiswa bimbingan menuju toga &amp; wisuda dengan ceria, terarah, dan minim beban administratif.</p>
      <div class="mt-4 flex flex-wrap gap-2"><button class="btn btn-primary" data-act="openKelas">${icon('add_circle')} Buka Kelas Bimbingan</button><button class="btn btn-ghost" data-act="nav" data-page="token">${icon('key')} Buat Token</button><button class="btn btn-ghost" data-act="refreshDash" aria-label="Segarkan data">${icon('sync')} Segarkan</button></div></div>
    <div class="card relative z-10 w-full flex-shrink-0 p-4 md:w-72"><p class="text-sm font-bold">Rata-rata progres menuju wisuda</p><p class="text-xs text-ink2">${k.aktif} mahasiswa aktif</p><div class="bar mt-3"><i style="width:${k.avgProgres}%"></i></div><div class="mt-2 flex justify-between text-xs font-bold"><span>${k.avgProgres}% tercapai</span><span class="text-ink2">${k.lulus} lulus</span></div><p class="mt-2 text-[11px] text-ink2">Diperbarui ${esc(tglJam(sum.diperbarui))}</p></div></div></section>

  ${k.dokMenunggu ? `<section class="px-4 pt-4"><button class="card flex w-full items-center gap-3 p-4 text-left card-hover" style="border-left:5px solid rgb(var(--brand-btn))" data-act="goBim" data-tab="revisi"><span class="avatar tone-0" style="width:46px;height:46px;border-radius:1rem">${icon('rate_review')}</span><span class="min-w-0 flex-1"><b class="block text-base">${k.dokMenunggu} dokumen menunggu diperiksa</b><span class="text-xs text-ink2">${k.dokSedang ? k.dokSedang + ' sedang diperiksa · ' : ''}${k.dokKembali} menunggu perbaikan mahasiswa</span></span><span class="chip chip-rose">Periksa sekarang</span></button></section>` : ''}
  ${alerts.length ? `<section class="px-4 pt-4"><div class="flex items-start gap-3 rounded-2xl bg-goldp p-3.5 text-goldink" role="alert"><span class="avatar" style="width:34px;height:34px;border-radius:9999px;background:rgb(var(--gold)/.25)">${icon('warning', '!text-lg')}</span><div class="min-w-0 flex-1 text-sm"><b>Perhatian</b><br>${alerts.join('. ')}.</div><button class="icon-btn !h-9 !w-9" data-act="dismiss" aria-label="Tutup">${icon('close', '!text-lg')}</button></div></section>` : ''}

  <section class="grid grid-cols-2 gap-3 px-4 pt-4 lg:grid-cols-4">
    ${kpiCard('school', 0, `Rata-rata ${k.avgProgres}%`, 'Mahasiswa aktif', k.aktif, `${k.skripsi} Skripsi · ${k.proposal} Proposal`)}
    ${kpiCard('assignment_late', 1, k.stKritis ? 'Segera habis' : 'Aman', 'Surat tugas kritis', `${k.stKritis} <span class="text-base font-bold">surat</span>`, k.stKritis ? `Perlu perpanjangan ≤ ${S.meta.ambang.urgent} hari` : 'Tidak ada yang mendesak')}
    ${kpiCard('volunteer_activism', 2, `${S.meta.ambang.tidakAktif} hari pasif`, 'Butuh disemangati', `${k.pasif} <span class="text-base font-bold">mahasiswa</span>`, 'Kutipan semangat otomatis aktif')}
    ${kpiCard('emoji_events', 3, 'Top progres', 'Siap sidang / lulus', `${k.siapSidang + k.yudisium + k.lulus} <span class="text-base font-bold">mahasiswa</span>`, `${k.lulus} lulus · ${k.yudisium} yudisium · ${k.siapSidang} sidang`)}
  </section>

  <section class="grid gap-4 px-4 pt-5 lg:grid-cols-12">
    <div class="lg:col-span-8">${sectionTitle('Mahasiswa bimbingan', `<span class="chip chip-rose">${sum.students.length} aktif</span>`)}${studentListHtml(sum)}</div>
    <aside class="space-y-4 lg:col-span-4">
      <div class="card p-4">${sectionTitle('Jadwal terdekat', `<button class="btn btn-soft btn-sm" data-act="goBim" data-tab="online">Semua</button>`)}
        ${jd ? `<div class="card-flat p-3.5"><div class="flex items-start justify-between gap-2"><b>${esc(jd.topik || 'Bimbingan')}</b><span class="chip chip-${jd.mode === 'Online' ? 'sky' : 'gold'}">${esc(jd.mode)}</span></div><p class="mt-1 text-sm text-ink2">${tgl(jd.tanggal)} · ${esc(jd.jam)} WIB</p><p class="mt-1 text-xs text-ink2">${jd.n} mahasiswa: ${esc(jd.peserta.join(', '))}</p>
          <div class="mt-3 flex gap-2">${jd.mode === 'Online' && jd.link ? `<a class="btn btn-primary btn-sm flex-1" href="${esc(jd.link)}" target="_blank" rel="noopener noreferrer">${icon('videocam', '!text-base')} Buka Meet</a>` : ''}<button class="btn btn-ghost btn-sm flex-1" data-act="goBim" data-tab="online">${icon('how_to_reg', '!text-base')} Presensi</button></div></div>` : `<p class="py-4 text-center text-sm text-ink2">Belum ada kelas terjadwal.</p><button class="btn btn-primary btn-block" data-act="openKelas">${icon('add_circle')} Buka kelas</button>`}</div>
      <div class="card p-4">${sectionTitle('Dokumen menunggu diperiksa', `<button class="btn btn-soft btn-sm" data-act="goBim" data-tab="revisi">Semua (${k.dokMenunggu || 0})</button>`)}
        ${sum.verifikasi.length ? `<div class="space-y-2">${sum.verifikasi.slice(0, 5).map(v => `<button class="card-flat flex w-full items-center justify-between gap-2 p-3 text-left" data-act="openDoc" data-id="${v.dok}" data-task="${v.tipe === 'revisi' ? v.id : ''}"><span class="min-w-0"><b class="clamp1 block text-sm">${esc(first(v.nama))} · ${esc(v.teks)}</b><span class="text-[11px] text-ink2">${lalu(v.tanggal)}${v.kirimUlang ? ' · dikirim ulang' : ''}</span></span><span class="chip chip-${v.hari >= 3 ? 'rose' : 'gold'}">${v.aksi}</span></button>`).join('')}</div>` : `<p class="py-3 text-center text-sm text-ink2">Semua dokumen sudah diperiksa. Mantap!</p>`}</div>
      <div class="rounded-3xl p-4" style="background:linear-gradient(135deg,rgb(var(--gold-pastel)),rgb(var(--brand-pastel)))"><p class="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-goldink">${icon('mood', '!text-base')} Catatan pagi Bu ${esc(first(S.user.nama))}</p><p class="mt-2 text-base font-semibold italic leading-snug text-ink">“${esc(sum.kutipan)}”</p></div>
    </aside></section>

  <section class="px-4 pt-6">${sectionTitle('Insight & laporan', '<span class="chip chip-slate">otomatis</span>')}
    <div class="grid gap-4 lg:grid-cols-12">
      <div class="insight lg:col-span-4"><p class="relative z-10 mb-3 flex items-center gap-2 font-extrabold">${icon('auto_awesome')} Analisis otomatis</p><ul class="relative z-10 list-none p-0 text-sm">${sum.insights.map(i => `<li class="flex gap-2">${icon('arrow_right_alt', '!text-base mt-0.5')}<span>${esc(i)}</span></li>`).join('')}</ul>
        <div class="relative z-10 mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div class="rounded-xl bg-white/15 p-2"><b class="block text-lg">${sum.charts.hadirPct}%</b>kehadiran</div><div class="rounded-xl bg-white/15 p-2"><b class="block text-lg">${sum.charts.avgGap || '-'}</b>hr antar sesi</div><div class="rounded-xl bg-white/15 p-2"><b class="block text-lg">${sum.charts.revPending}</b>revisi tertunda</div></div></div>
      <div class="card p-4 lg:col-span-4"><p class="mb-2 font-bold">Progres tiap mahasiswa (%)</p><div style="height:240px"><canvas id="chProg" aria-label="Grafik progres mahasiswa" role="img"></canvas></div></div>
      <div class="card p-4 lg:col-span-4"><p class="mb-2 font-bold">Mahasiswa per tahapan</p><div style="height:240px"><canvas id="chTahap" aria-label="Diagram jumlah mahasiswa per tahapan" role="img"></canvas></div></div>
      <div class="card p-4 lg:col-span-12"><p class="mb-2 font-bold">Bimbingan valid per bulan</p><div style="height:180px"><canvas id="chHadir" aria-label="Statistik bimbingan per bulan" role="img"></canvas></div></div>
    </div></section>`;
  if (!view(html, my)) return;
  fillStudentList(); drawCharts(sum);
}
function homeMhs(d, my) {
  const m = d.me;
  if (!m) { view(`<div class="px-4 pt-8">${empty('hourglass_top', 'Menyiapkan dashboard…', 'Data Anda sedang disinkronkan. Sebentar lagi muncul.')}</div>`, my); return; }
  const nx = m.next, isToday = nx && nx.tanggal === todayStr();
  const stWarn = m.st && (m.st.status === 'Segera habis' || m.st.status === 'Kedaluwarsa');
  const html = `
  <section class="hero px-4 pb-9 pt-6"><div class="relative z-10 flex items-start justify-between gap-4">
      <div class="min-w-0"><span class="chip" style="background:rgb(255 255 255/.18);color:#FEF3C7">${icon('school')} Mahasiswa Bimbingan</span><h1 class="mt-2 text-2xl font-extrabold tracking-tight md:text-4xl">Halo, ${esc(first(m.nama))}! 👋</h1>
        <p class="mt-1 text-sm opacity-90 md:text-base">${esc(m.judul || 'Judul skripsi belum diisi')}</p><p class="mt-2 text-sm font-bold" style="color:#FEF3C7">${icon('flag', '!text-base')} ${esc(m.tahap_aktif)}</p></div>
      <div class="relative flex-shrink-0 ring-on-dark">${ring(m.progres, 84, 'gold')}<span class="absolute inset-0 flex flex-col items-center justify-center leading-none"><b class="text-xl">${m.progres}%</b><span class="text-[10px] opacity-80">${m.selesai}/${m.total}</span></span></div></div></section>
  <div class="relative z-20 -mt-5 space-y-3 px-4 pb-2">
    ${!m.judul ? `<div class="card flex items-center justify-between gap-3 p-4"><div><b>Lengkapi judul skripsi</b><p class="text-xs text-ink2">Agar dosen mudah mengenali topikmu.</p></div><button class="btn btn-soft btn-sm" data-act="nav" data-page="profil">Isi judul</button></div>` : ''}
    <div class="card flex items-center justify-between gap-3 p-4"><div class="min-w-0"><span class="chip chip-gold">${nx ? `Jadwal berikutnya: ${tgl(nx.tanggal, true)} · ${esc(nx.jam)}` : 'Jadwal bimbingan'}</span><h2 class="mt-1 text-base font-extrabold">${nx ? esc(nx.topik || 'Sesi bimbingan') : 'Belum ada jadwal'}</h2><p class="text-xs text-ink2">${nx ? esc(nx.mode) + (isToday ? ' · hari ini, jangan lupa catat kehadiran' : ' · dijadwalkan dosen') : 'Dosen akan membuka kelas bimbingan, kamu akan diberi tahu.'}</p></div>
      <div class="flex flex-shrink-0 flex-col gap-2">${nx && nx.mode === 'Online' && nx.link ? `<a class="btn btn-primary btn-sm" href="${esc(nx.link)}" target="_blank" rel="noopener noreferrer">${icon('videocam', '!text-base')} Meet</a>` : ''}${nx ? (isToday ? `<button class="btn btn-gold btn-sm" data-act="hadir" data-id="${nx.id}">${icon('how_to_reg', '!text-base')} Hadir</button>` : '') : `<button class="btn btn-soft btn-sm" data-act="goBim" data-tab="online">Lihat</button>`}</div></div>
    ${stWarn ? `<div class="flex items-start gap-3 rounded-2xl bg-goldp p-3.5 text-goldink" role="alert">${icon('warning')}<div class="flex-1 text-sm"><b>Surat tugas ${esc(m.st.jenis)} ${m.st.status === 'Kedaluwarsa' ? 'sudah kedaluwarsa' : 'segera habis'}</b><br>${m.st.status === 'Kedaluwarsa' ? 'Berakhir ' + tgl(m.st.berakhir) : 'Berakhir ' + tgl(m.st.berakhir) + ' (' + sisaTxt(m.st.sisa) + ')'}. Unggah surat tugas perpanjangan.</div><button class="btn btn-gold btn-sm" data-act="openUploadST" data-uid="${m.uid}">Unggah</button></div>` : ''}
    <div class="grid gap-3 md:grid-cols-2">
      <div class="card p-4">${sectionTitle('Catatan yang harus diperbaiki', `<span class="chip chip-${m.revisiCount ? 'rose' : 'mint'}">${m.revisiCount}</span>`)}
        ${m.dokTerakhir ? `<div class="mb-3 rounded-2xl bg-field p-3"><p class="text-[11px] font-bold uppercase tracking-wider text-ink2">Dokumen terakhir</p><p class="mt-0.5 flex flex-wrap items-center gap-2 font-bold">${esc(m.dokTerakhir.tahap)} <span class="chip chip-rose">V${m.dokTerakhir.versi}</span>${chip(DOC_CHIP, m.dokTerakhir.status)}</p></div>` : ''}
        ${m.revisiPending.length ? `<div class="space-y-2">${m.revisiPending.map(r => revisiRow(r, false, true)).join('')}</div>${m.revisiCount > m.revisiPending.length ? `<p class="mt-2 text-xs text-ink2">+${m.revisiCount - m.revisiPending.length} poin lainnya di Dokumen &amp; Revisi.</p>` : ''}` : `<p class="py-3 text-center text-sm text-ink2">Tidak ada revisi tertunda. Keren!</p>`}
        <button class="btn btn-soft btn-block mt-3" data-act="goBim" data-tab="revisi">${icon('description')} Buka Revisi Dokumen</button></div>
      <div class="space-y-3"><div class="card p-4">${sectionTitle('Pesan dari dosen', `<button class="btn btn-soft btn-sm" data-act="goBim" data-tab="diskusi">Balas</button>`)}${m.pesanDosen ? `<p class="clamp2 italic">“${esc(m.pesanDosen.isi)}”</p><p class="mt-1 text-[11px] text-ink2">${lalu(m.pesanDosen.tanggal)}</p>` : '<p class="text-sm text-ink2">Belum ada pesan baru dari dosen.</p>'}</div>
        <div class="card p-4"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><span class="avatar tone-2" style="width:44px;height:44px;border-radius:1rem">${icon('military_tech', 'ms-fill')}</span><div><b>Papan Medali</b><p class="text-xs text-ink2">Peringkat ${m.rank} dari ${d.totalRank} · ${m.xp} XP</p></div></div><button class="btn btn-soft btn-sm" data-act="nav" data-page="medali">Lihat</button></div>${m.lencana.length ? `<div class="mt-3 flex flex-wrap gap-2">${medalRow(m.lencana, 8)}</div>` : '<p class="mt-2 text-xs text-ink2">Belum ada medali. Selesaikan tahap pertamamu untuk membuka yang pertama!</p>'}</div></div></div>
    <div class="grid gap-3 md:grid-cols-2">${xpCard(m)}${streakCard(m.streak)}</div>
    <div class="rounded-3xl p-4" style="background:linear-gradient(135deg,rgb(var(--gold-pastel)),rgb(var(--brand-pastel)))"><p class="text-center text-base font-semibold italic leading-snug">“${esc(d.kutipan)}” 🎓</p></div>
  </div>`;
  view(html, my);
}
function revisiRow(r, dosen, compact) {
  const on = r.status !== 'Belum direvisi', ok = r.status === 'Disetujui';
  return `<div class="check ${ok ? 'approved' : on ? 'done' : ''}"><button class="cbox ${on ? 'on' : ''}" ${ok ? 'disabled' : ''} data-act="revToggle" data-id="${r.id}" data-st="${r.status}" role="checkbox" aria-checked="${on}" aria-label="Tandai sudah diperbaiki: ${esc(r.poin)}">${icon('check', '!text-lg')}</button>
    <div class="min-w-0 flex-1">${r.rujukan ? `<p class="clamp1 text-[11px] italic text-goldink">“${esc(r.rujukan)}”</p>` : ''}<p class="text-sm font-semibold">${esc(r.poin)}</p>
      <div class="mt-1.5 flex flex-wrap items-center gap-2"><button class="btn btn-soft btn-sm" data-act="openDoc" data-id="${r.dok_id}" data-task="${r.id}">${icon('open_in_new', '!text-base')} Buka di dokumen</button>${ok ? `<span class="chip chip-mint">${icon('verified')}Disetujui</span>` : on ? `<span class="chip chip-mint">${icon('hourglass_top')}Menunggu dosen</span>` : ''}</div></div></div>`;
}
// ════════ BAGIAN 8: CHART ════════
function destroyCharts() { Object.keys(S.charts).forEach(k => { try { S.charts[k].destroy(); } catch (e) { /* abaikan */ } }); S.charts = {}; }
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim().split(/\s+/).join(',');
const rgba = (n, a) => `rgba(${css(n)},${a == null ? 1 : a})`;
function loadChartJs() {
  if (typeof Chart !== 'undefined') return Promise.resolve();
  if (S.chartP) return S.chartP;
  S.chartP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'; s.onload = res; s.onerror = () => { S.chartP = null; rej(new Error('Chart.js tidak dapat dimuat')); }; document.head.appendChild(s); });
  return S.chartP;
}
function drawCharts(sum) {
  destroyCharts();
  S.redraw = () => drawCharts(sum);
  if (typeof Chart === 'undefined') { loadChartJs().then(() => { if (S.redraw) drawCharts(sum); }).catch(() => { $$('canvas').forEach(c => { const p = c.parentElement; if (p) p.innerHTML = '<p class="py-8 text-center text-xs text-ink2">Grafik tidak dapat dimuat (periksa koneksi).</p>'; }); }); return; }
  const txt = rgba('--ink2'), grid = rgba('--line', .7), c = sum.charts;
  Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';
  const axis = { ticks: { color: txt, precision: 0 }, grid: { color: grid }, border: { display: false } };
  const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const mk = (id, cfg) => { const el = document.getElementById(id); if (el) S.charts[id] = new Chart(el, cfg); };
  mk('chProg', { type: 'bar', data: { labels: c.progres.labels, datasets: [{ data: c.progres.values, backgroundColor: rgba('--brand-btn', .85), borderRadius: 8, maxBarThickness: 18 }] }, options: Object.assign({}, base, { indexAxis: 'y', scales: { x: Object.assign({}, axis, { max: 100, beginAtZero: true }), y: { ticks: { color: txt }, grid: { display: false }, border: { display: false } } } }) });
  const pal = [rgba('--brand-btn'), rgba('--gold'), rgba('--mint'), rgba('--sky'), rgba('--brand-text', .6), rgba('--ink2', .6)];
  mk('chTahap', { type: 'doughnut', data: { labels: c.tahap.labels, datasets: [{ data: c.tahap.values, backgroundColor: c.tahap.labels.map((_, i) => pal[i % pal.length]), borderWidth: 2, borderColor: rgba('--card') }] }, options: Object.assign({}, base, { cutout: '62%', plugins: { legend: { display: true, position: 'bottom', labels: { color: txt, boxWidth: 10, font: { size: 10 } } } } }) });
  mk('chHadir', { type: 'bar', data: { labels: c.hadir.labels, datasets: [{ data: c.hadir.values, backgroundColor: rgba('--gold', .9), borderRadius: 8, maxBarThickness: 36 }] }, options: Object.assign({}, base, { scales: { x: { ticks: { color: txt }, grid: { display: false }, border: { display: false } }, y: Object.assign({}, axis, { beginAtZero: true }) } }) });
}

// ════════ BAGIAN 9: DAFTAR MAHASISWA & DETAIL (dosen) ════════
PAGES.mahasiswa = async function (my) {
  const d = await getDash(); if (my !== S.nav) return;
  if (!view(`<section class="px-4 pt-4 md:pt-6">${sectionTitle('Daftar mahasiswa bimbingan', `<span class="chip chip-rose">${d.sum.students.length} aktif</span>`)}${studentListHtml(d.sum)}</section>`, my)) return;
  fillStudentList();
};
PAGES.detail = async function (my) {
  const uid = S.params.uid, d = await getDet(uid); if (my !== S.nav) return;
  const tab = S.params.tab || S.tab, p = d.profil, st = d.stat;
  const tabs = [['tahapan', 'Tahapan', 'flag'], ['surat', 'Surat Tugas', 'assignment'], ['dokumen', 'Dokumen & Revisi', 'description'], ['bimbingan', 'Bimbingan', 'forum'], ['diskusi', 'Diskusi', 'chat']];
  const html = `<section class="px-4 pt-4 md:pt-6"><button class="btn btn-ghost btn-sm mb-3" data-act="nav" data-page="mahasiswa">${icon('arrow_back', '!text-base')} Semua mahasiswa</button>
    <div class="card flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5"><div class="flex min-w-0 flex-1 items-center gap-3">${avatar({ nama: p.nama, foto: p.foto, wisuda: st.wisuda }, 64)}<div class="min-w-0"><h1 class="text-xl font-extrabold">${esc(p.nama)}</h1><p class="text-sm text-ink2">NPM ${esc(p.npm)} · ${esc(p.email)}</p><p class="mt-1 text-sm font-semibold">${esc(p.judul || 'Judul belum diisi')}</p><div class="mt-2 flex flex-wrap gap-1.5"><span class="chip chip-sky">${icon('flag')}${esc(st.tahap_aktif)}</span>${levelChip(st.level)}${streakChip(st.streak)}<span class="chip chip-slate">${st.xp} XP</span>${st.st ? chip(ST_CHIP, st.st.status) : ''}${st.pasif ? `<span class="chip chip-gold">${st.hariTanpa} hari pasif</span>` : ''}</div></div></div>
      <div class="flex items-center gap-4"><div class="relative">${ring(st.progres, 76, st.wisuda ? 'mint' : 'brand')}<span class="absolute inset-0 flex items-center justify-center text-sm font-extrabold">${st.progres}%</span></div><div class="flex flex-col gap-2"><button class="btn btn-soft btn-sm" data-act="sapa" data-uid="${uid}">${icon('campaign', '!text-base')} Kirim semangat</button><button class="btn btn-ghost btn-sm" data-act="editJudul" data-uid="${uid}">${icon('edit', '!text-base')} Ubah profil</button><button class="btn btn-ghost btn-sm" data-act="resetPw" data-uid="${uid}">${icon('lock_reset', '!text-base')} Atur ulang sandi</button></div></div></div>
    <div class="hscroll mt-4" role="tablist">${tabs.map(t => `<button class="fchip ${tab === t[0] ? 'on' : ''}" role="tab" data-act="detailTab" data-tab="${t[0]}">${icon(t[2], '!text-base mr-1')}${t[1]}</button>`).join('')}</div>
    <div class="mt-4" id="tabBody">${tab === 'tahapan' ? tabTahapan(d, true) : tab === 'surat' ? tabSurat(d, true) : tab === 'dokumen' ? tabDokumen(d, true) : tab === 'bimbingan' ? tabBimbingan(d, true) : '<div id="threadBox"></div>'}</div></section>`;
  if (!view(html, my)) return;
  if (tab === 'diskusi') mountThread(uid);
};

// ════════ BAGIAN 10: TAHAPAN ════════
const GRUP_URUT = ['Persiapan', 'Proposal', 'Skripsi', 'Publikasi', 'Menuju wisuda'];
function acaraLine(t) {
  if (!t.perluTanggal) return '';
  const a = t.acara, btn = `<button class="btn btn-ghost btn-sm" data-act="openJadwal" data-id="${t.id}">${icon('event', '!text-base')} ${a ? 'Ubah' : 'Isi'} tanggal</button>`;
  return `<div class="mt-1.5 flex flex-wrap items-center gap-2">${a ? `<span class="chip chip-sky">${icon('event')}${esc(a.hari)}, ${tgl(a.tgl)}</span>${a.ket ? `<span class="text-[11px] text-ink2">${esc(a.ket)}</span>` : ''}<span class="text-[11px] text-ink2">· diisi ${a.oleh === 'dosen' ? 'dosen' : 'mahasiswa'}</span>` : `<span class="chip chip-gold">${icon('event_busy')}Tanggal &amp; hari belum diisi</span>`}${btn}</div>`;
}
function pubCard(d, dosen) {
  const p = d.pub;
  return `<div class="card-flat mb-3 mt-2 p-3.5"><div class="flex flex-wrap items-center justify-between gap-2"><b>${icon('menu_book', '!text-lg text-brandtx')} Data publikasi &amp; LoA</b><button class="btn btn-primary btn-sm" data-act="openPublikasi" data-uid="${d.uid}">${icon(p ? 'edit' : 'add', '!text-base')} ${p ? 'Perbarui' : 'Isi data publikasi'}</button></div>
    ${p ? `<div class="mt-2 space-y-1 text-sm"><p><b>${esc(p.jurnal)}</b>${p.judul ? ' — ' + esc(p.judul) : ''}</p><p class="flex flex-wrap items-center gap-2">${chip(PUB_CHIP, p.status)}${p.loa ? `<span class="chip chip-mint">${icon('verified')}LoA diunggah ${tgl(p.loa_tgl, true)}</span><button class="btn btn-soft btn-sm" data-act="viewLoa" data-id="${p.id}">${icon('visibility', '!text-base')} Lihat LoA</button>` : `<span class="chip chip-gold">${icon('warning')}LoA belum diunggah</span>`}${p.link ? `<a class="chip chip-sky" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${icon('open_in_new')}Tautan jurnal</a>` : ''}</p>${p.catatan ? `<p class="text-xs text-ink2">${esc(p.catatan)}</p>` : ''}</div>` : `<p class="mt-1 text-sm text-ink2">Wajib diisi sebelum berkas yudisium: jurnal yang dituju, progres naskah, dan unggah LoA setelah diterima.</p>`}</div>`;
}
function tabTahapan(d, dosen) {
  const st = d.stat;
  const row = t => {
    const done = t.status === 'Selesai';
    let act = '';
    if (dosen) act = `<select class="input !min-h-[36px] !w-auto !rounded-full !py-1 text-xs font-bold" data-change="setTahap" data-id="${t.id}" aria-label="Status ${esc(t.nama)}">${['Belum dimulai', 'Sedang berjalan', 'Perlu revisi', 'Selesai'].map(o => `<option ${o === t.status ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    else if (t.status === 'Belum dimulai' || t.status === 'Perlu revisi') act = `<button class="btn btn-soft btn-sm" data-act="setTahap" data-id="${t.id}" data-st="Sedang berjalan">${icon('play_arrow', '!text-base')} Ajukan berjalan</button>`;
    return `<div class="py-3"><div class="flex flex-wrap items-center gap-3"><span class="avatar ${done ? 'tone-3' : 'tone-1'}" style="width:36px;height:36px;border-radius:9999px;font-size:13px">${done ? icon('check', '!text-lg') : t.urutan}</span>
      <div class="min-w-0 flex-1"><p class="font-bold ${done ? 'opacity-80' : ''}">${esc(t.nama)}</p><p class="text-[11px] text-ink2">${t.mulai ? 'Mulai ' + tgl(t.mulai, true) : 'Belum dimulai'}${t.selesai ? ' · Selesai ' + tgl(t.selesai, true) : ''}</p></div>
      <div class="flex items-center gap-2">${dosen ? '' : chip(TAHAP_CHIP, t.status)}${act}</div></div>${acaraLine(t)}</div>`;
  };
  return `<div class="card mb-4 flex items-center gap-4 p-4"><div class="relative">${ring(st.progres, 72, st.wisuda ? 'mint' : 'brand')}<span class="absolute inset-0 flex items-center justify-center font-extrabold">${st.progres}%</span></div><div><p class="text-lg font-extrabold">${st.selesai} dari ${st.total} tahap selesai</p><p class="text-sm text-ink2">Saat ini: <b>${esc(st.tahap_aktif)}</b></p><p class="text-xs text-ink2">Sidang, yudisium, pendaftaran wisuda, dan wisuda wajib diisi <b>tanggal &amp; hari</b> sebelum ditandai selesai (dapat diisi mahasiswa maupun dosen).</p></div></div>
    <div class="space-y-4">${GRUP_URUT.map(g => { const rows = d.tahapan.filter(t => t.grup === g); if (!rows.length) return ''; return `<div class="card px-4 pb-1 pt-3"><p class="text-[11px] font-extrabold uppercase tracking-wider text-brandtx">${g}</p>${g === 'Publikasi' ? pubCard(d, dosen) : ''}<div class="divide-y">${rows.map(row).join('')}</div></div>`; }).join('')}</div>`;
}
PAGES.tahapan = async function (my) {
  const d = await getDet(); if (my !== S.nav) return;
  view(`<section class="px-4 pt-4 md:pt-6">${sectionTitle('Tahapan menuju wisuda')}${tabTahapan(d, false)}</section>`, my);
};
function setTahapOptimistic(id, status) {
  const uid = isDosen() ? S.params.uid : S.user.uid, d = S.det[uid] && S.det[uid].d;
  const t0 = d && d.tahapan.find(x => x.id === id);
  if (t0 && status === 'Selesai') {
    if (t0.perluTanggal && !t0.acara) { toast('Isi tanggal & hari pelaksanaan "' + t0.nama + '" dulu.', 'error'); rerender(); openJadwal(id); return; }
    if (t0.nama === 'Publikasi jurnal' && !(d.pub && d.pub.loa)) { toast('Publikasi belum selesai: unggah LoA & isi status diterima/terbit dulu.', 'error'); rerender(); return; }
  }
  return optimistic(() => {
    if (!d) return; const t = d.tahapan.find(x => x.id === id); if (!t) return;
    t.status = status; const sel = d.tahapan.filter(x => x.status === 'Selesai').length;
    d.stat.selesai = sel; d.stat.progres = Math.round(sel / d.tahapan.length * 100);
    const a = d.tahapan.find(x => x.status !== 'Selesai'); d.stat.tahap_aktif = a ? a.nama : 'Lulus · Wisuda selesai';
  }, () => apiA('setTahap', id, status), 'Status tahapan diperbarui.');
}
// ════════ BAGIAN 11: SURAT TUGAS ════════
function stCard(x, dosen, showName) {
  const warn = x.latest && (x.status === 'Segera habis' || x.status === 'Kedaluwarsa');
  return `<div class="card flex flex-wrap items-center gap-3 p-4 ${x.status === 'Diperbarui' ? 'opacity-70' : ''}"><span class="avatar ${warn ? 'tone-2' : 'tone-3'}" style="width:46px;height:46px;border-radius:1rem">${icon('description')}</span>
    <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><b>Surat Tugas ${esc(x.jenis)}</b>${chip(ST_CHIP, x.status)}${showName ? `<span class="chip chip-sky">${esc(x.nama)}</span>` : ''}</div>
      <p class="text-sm text-ink2">${tgl(x.mulai)} → ${tgl(x.berakhir)}${x.latest ? ` · <b class="${warn ? 'text-brandtx' : ''}">${sisaTxt(x.sisa)}</b>` : ''}</p><p class="clamp1 text-[11px] text-ink2">${esc(x.file_nama)} · diunggah ${lalu(x.diunggah)}</p></div>
    <button class="btn btn-soft btn-sm" data-act="previewST" data-id="${x.id}" data-title="Surat Tugas ${esc(x.jenis)}">${icon('visibility', '!text-base')} Lihat</button></div>`;
}
function tabSurat(d, dosen) {
  const list = d.surat;
  return `<div class="mb-3 flex items-center justify-between gap-2"><p class="text-sm text-ink2">Peringatan muncul ${S.meta.ambang.urgent} hari sebelum habis dan email dikirim harian sampai surat baru diunggah.</p><button class="btn btn-primary btn-sm flex-shrink-0" data-act="openUploadST" data-uid="${d.uid}">${icon('upload_file', '!text-base')} Unggah</button></div>
    <div class="space-y-3">${list.length ? list.map(x => stCard(x, dosen, false)).join('') : `<div class="card">${empty('assignment', 'Belum ada surat tugas', 'Unggah PDF surat tugas proposal atau skripsi.')}</div>`}</div>`;
}
PAGES.surat = async function (my) {
  if (isDosen()) return suratDosen(my);
  const d = await getDet(); if (my !== S.nav) return;
  view(`<section class="px-4 pt-4 md:pt-6">${sectionTitle('Surat tugas')}${tabSurat(d, false)}</section>`, my);
};
async function suratDosen(my) {
  const dsh = await getDash(); if (my !== S.nav) return;
  const all = dsh.sum.stAll, f = S.stF;
  const rows = all.filter(x => (f.jenis === 'all' || x.jenis === f.jenis) && (f.status === 'all' || x.status === f.status))
    .sort((a, b) => (a.status === 'Diperbarui') - (b.status === 'Diperbarui') || (a.sisa == null ? 9999 : a.sisa) - (b.sisa == null ? 9999 : b.sisa));
  const live = rows.filter(x => x.status !== 'Diperbarui');
  let tl = '';
  if (live.length) {
    const ms = s => new Date(s + 'T00:00:00').getTime(), now = ms(todayStr());
    const lo = Math.min(now - 15 * 864e5, ...live.map(x => ms(x.mulai))), hi = Math.max(now + 30 * 864e5, ...live.map(x => ms(x.berakhir))), sp = hi - lo;
    const pct = t => Math.max(0, Math.min(100, (t - lo) / sp * 100));
    const col = x => x.status === 'Kedaluwarsa' ? '--brand-btn' : x.status === 'Segera habis' ? '--gold' : x.jenis === 'Proposal' ? '--sky' : '--mint';
    tl = `<div class="card p-4"><p class="mb-1 font-bold">Timeline masa berlaku</p><p class="mb-3 text-xs text-ink2">Garis tegak = hari ini. Merah: kedaluwarsa · Kuning: segera habis · Biru: proposal · Hijau: skripsi.</p><div class="space-y-2.5">${live.map(x => `<div class="tl-row"><span class="clamp1 text-xs font-bold" title="${esc(x.nama)}">${esc(first(x.nama))} <span class="text-ink2">· ${x.jenis === 'Proposal' ? 'Prop' : 'Skrip'}</span></span><div class="tl-track" role="img" aria-label="${esc(x.nama)} ${esc(x.jenis)} ${tgl(x.mulai)} sampai ${tgl(x.berakhir)}"><div class="tl-bar" style="left:${pct(ms(x.mulai))}%;width:${Math.max(1, pct(ms(x.berakhir)) - pct(ms(x.mulai)))}%;background:rgb(var(${col(x)}))"></div><div class="tl-today" style="left:${pct(now)}%"></div></div></div>`).join('')}</div></div>`;
  }
  const html = `<section class="px-4 pt-4 md:pt-6">${sectionTitle('Rekap & timeline surat tugas', `<button class="btn btn-primary btn-sm" data-act="openUploadST" data-uid="">${icon('upload_file', '!text-base')} Unggah mewakili</button>`)}
    <div class="hscroll mb-3">${[['all', 'Semua jenis'], ['Proposal', 'Proposal'], ['Skripsi', 'Skripsi']].map(a => `<button class="fchip ${f.jenis === a[0] ? 'on' : ''}" data-act="stFilter" data-k="jenis" data-v="${a[0]}">${a[1]}</button>`).join('')}<span class="mx-1 w-px bg-line"></span>${[['all', 'Semua status'], ['Aktif', 'Aktif'], ['Segera habis', 'Segera habis'], ['Kedaluwarsa', 'Kedaluwarsa'], ['Diperbarui', 'Diperbarui']].map(a => `<button class="fchip ${f.status === a[0] ? 'on' : ''}" data-act="stFilter" data-k="status" data-v="${a[0]}">${a[1]}</button>`).join('')}</div>
    <div class="space-y-4">${tl}
    <div class="card scroll-x"><table class="tbl"><thead><tr><th>Mahasiswa</th><th>Jenis</th><th>Berlaku</th><th>Sisa</th><th>Status</th><th></th></tr></thead><tbody>${rows.length ? rows.map(x => `<tr class="${x.status === 'Diperbarui' ? 'opacity-60' : ''}"><td><b>${esc(x.nama)}</b><br><span class="text-[11px] text-ink2">${esc(x.npm)}</span></td><td>${esc(x.jenis)}</td><td class="whitespace-nowrap">${tgl(x.mulai, true)} → ${tgl(x.berakhir)}</td><td class="whitespace-nowrap">${x.latest ? sisaTxt(x.sisa) : '-'}</td><td>${chip(ST_CHIP, x.status)}</td><td class="text-right"><button class="btn btn-soft btn-sm" data-act="previewST" data-id="${x.id}" data-title="Surat Tugas ${esc(x.jenis)} · ${esc(first(x.nama))}">${icon('visibility', '!text-base')}</button></td></tr>`).join('') : `<tr><td colspan="6">${empty('assignment', 'Tidak ada data', 'Ubah filter atau tunggu mahasiswa mengunggah surat tugas.')}</td></tr>`}</tbody></table></div></div></section>`;
  view(html, my);
}
