'use strict';

// ════════ BAGIAN 19: MODAL FORMULIR ════════
const fld = (id, label, inner, help) => `<div><label class="label" for="${id}">${label}</label>${inner}${help ? `<p class="help">${help}</p>` : ''}</div>`;
async function studentOptions(sel) {
  const d = await getDash(); const list = d.role === 'dosen' ? d.sum.students : [];
  return list.map(s => `<option value="${s.uid}" ${s.uid === sel ? 'selected' : ''}>${esc(s.nama)} — ${esc(s.npm)}</option>`).join('');
}
async function openUploadST(uid) {
  const pick = isDosen() && !uid ? fld('stUid', 'Mahasiswa', `<select id="stUid" name="uid" class="input" required><option value="">Pilih mahasiswa…</option>${await studentOptions('')}</select>`) : `<input type="hidden" name="uid" value="${esc(uid || S.user.uid)}">`;
  openModal(`${modalHead('Unggah surat tugas')}<form data-form="upST" class="space-y-3">${pick}
    ${fld('stJenis', 'Jenis', '<select id="stJenis" name="jenis" class="input" required><option value="Proposal">Bimbingan proposal</option><option value="Skripsi">Bimbingan skripsi</option></select>')}
    <div class="grid grid-cols-2 gap-3">${fld('stMulai', 'Tanggal mulai', '<input id="stMulai" name="mulai" type="date" class="input" required>')}${fld('stAkhir', 'Tanggal berakhir', '<input id="stAkhir" name="berakhir" type="date" class="input" required>')}</div>
    ${fld('stFile', 'Berkas PDF (maks. 10 MB)', '<input id="stFile" name="file" type="file" accept="application/pdf,.pdf" class="input" required>', 'Surat tugas lama otomatis berstatus “Diperbarui” dan email pengingat berhenti.')}
    <button class="btn btn-primary btn-block" type="submit">${icon('upload')} Unggah</button></form>`);
}
async function openUploadDok(uid, tipe) {
  const d = await getDet(uid || S.user.uid, true);
  const doc = d.tahapan.filter(t => TAHAP_NAMES.indexOf(t.nama) >= 0), open = doc.filter(t => t.status !== 'Selesai' || tipe === 'Revisi Dosen'), list = open.length ? open : doc;
  const isBab = t => /Bab \d/.test(t.nama);
  const pre = list.find(t => t.status === 'Perlu revisi') || list.find(t => t.status === 'Sedang berjalan' && isBab(t)) || list.find(t => isBab(t)) || list.find(t => t.status === 'Sedang berjalan') || list[0];   // utamakan bab yang sedang dikerjakan
  S._dkNames = {}; list.forEach(t => S._dkNames[t.id] = t.nama);
  openModal(`${modalHead(tipe === 'Revisi Dosen' ? 'Unggah hasil revisi dosen' : 'Kirim draf dokumen')}<form data-form="upDok" class="space-y-3"><input type="hidden" name="uid" value="${esc(d.uid)}"><input type="hidden" name="tipe" value="${esc(tipe || 'Draf')}">
    <div><p class="label">Dokumen ini mencakup bab / tahap (boleh lebih dari satu)</p><div class="grid gap-2 sm:grid-cols-2">${list.map(t => `<label class="check cursor-pointer !items-center"><input type="checkbox" name="tahap_ids" value="${t.id}" data-change="dkPick" ${t.id === pre.id ? 'checked' : ''} class="h-5 w-5 flex-shrink-0 accent-[#9F1239]"><span class="text-sm font-semibold">${esc(t.nama.replace(/^Bimbingan /, ''))}</span></label>`).join('')}</div>
      <p id="dkLabel" class="mt-2 text-sm font-bold text-brandtx"></p><p class="help">Mengirim Bab 1–3 sekaligus? Centang ketiganya. Semua bab yang dicentang otomatis “Sedang berjalan”, lalu diperiksa, direvisi, dan diselesaikan bersama.</p></div>
    ${fld('dkFile', 'Berkas DOCX atau PDF (maks. 10 MB)', '<input id="dkFile" name="file" type="file" accept=".pdf,.docx,.doc,application/pdf" class="input" required>', 'Tiap unggahan menjadi versi baru; versi lama tersimpan sebagai riwayat.')}
    ${fld('dkCat', 'Catatan untuk dosen (opsional)', '<textarea id="dkCat" name="catatan" class="input" maxlength="300" placeholder="Mis. Bab 1–3 sudah lengkap dengan daftar pustaka"></textarea>')}
    <button class="btn btn-primary btn-block" type="submit">${icon('upload')} Kirim</button></form>`);
  updDkLabel();
}
function updDkLabel() {
  const el = $('#dkLabel'); if (!el) return;
  const ids = $$('#modalRoot input[name=tahap_ids]:checked').map(i => i.value);
  el.textContent = ids.length ? 'Dokumen mencakup: ' + tahapLabel(ids.map(i => (S._dkNames || {})[i])) : 'Pilih minimal satu bab.';
}
function pilihBab(list) {
  return new Promise(res => {
    const r = $('#confirmRoot');
    r.innerHTML = `<div class="modal-back" style="z-index:150" data-confirm-back="1"><div class="modal-card" style="max-width:460px" role="dialog" aria-modal="true"><div class="modal-head"><h3>Tandai selesai</h3></div><p class="mb-3 text-sm text-ink2">Dokumen ini mencakup beberapa bab. Centang bab yang dinyatakan <b>selesai</b>; bab yang tidak dicentang tetap “Perlu revisi”.</p><div class="mb-4 space-y-2">${list.map(t => `<label class="check cursor-pointer !items-center"><input type="checkbox" name="pb" value="${esc(t.id)}" checked class="h-5 w-5 accent-[#9F1239]"><span class="text-sm font-semibold">${esc(t.nama)}</span></label>`).join('')}</div><div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="cfNo">Batal</button><button class="btn btn-primary" data-act="pbYes">${icon('task_alt')} Tandai selesai</button></div></div></div>`;
    S._cf = v => { r.innerHTML = ''; res(Array.isArray(v) ? v : null); };
  });
}
async function openKelas() {
  const d = await getDash(), list = d.sum.students.filter(s => !s.wisuda);
  openModal(`${modalHead('Buka kelas bimbingan')}<form data-form="kelas" class="space-y-3">
    <div class="grid grid-cols-2 gap-3">${fld('kTgl', 'Tanggal', `<input id="kTgl" name="tanggal" type="date" class="input" value="${todayStr()}" required>`)}${fld('kJam', 'Jam', '<input id="kJam" name="jam" type="time" class="input" value="14:00" required>')}</div>
    ${fld('kMode', 'Mode', '<select id="kMode" name="mode" class="input"><option>Online</option><option>Offline</option></select>')}
    ${fld('kLink', 'Tautan Google Meet (jika online)', '<input id="kLink" name="link" type="url" class="input" placeholder="https://meet.google.com/…">', 'Hanya tautan jadwal; tidak ada integrasi otomatis.')}
    ${fld('kTopik', 'Topik', '<input id="kTopik" name="topik" class="input" maxlength="200" placeholder="Mis. Bimbingan Bab 4 & 5">')}
    ${fld('kTahap', 'Terkait tahapan (opsional)', `<select id="kTahap" name="tahap" class="input"><option value="">Tidak terkait</option>${TAHAP_NAMES.map(n => `<option>${esc(n)}</option>`).join('')}</select>`, 'Saat sesi valid (dosen & mahasiswa hadir), tahapan ini otomatis menjadi “Sedang berjalan”.')}
    <div><p class="label">Peserta</p><div class="max-h-44 space-y-1.5 overflow-y-auto rounded-2xl border border-line bg-field p-2">${list.length ? list.map(s => `<label class="flex min-h-[44px] items-center gap-2 rounded-xl px-2 hover:bg-brandp/40"><input type="checkbox" name="uids" value="${s.uid}" checked class="h-5 w-5 accent-[#9F1239]"><span class="text-sm font-semibold">${esc(s.nama)}</span></label>`).join('') : '<p class="p-2 text-sm text-ink2">Belum ada mahasiswa aktif.</p>'}</div></div>
    <button class="btn btn-primary btn-block" type="submit">${icon('event_available')} Buka kelas &amp; beri tahu mahasiswa</button></form>`);
}
async function openRekap() {
  const dosen = isDosen();
  openModal(`${modalHead('Cetak catatan bimbingan (PDF)')}<form data-form="rekap" class="space-y-3">${dosen ? fld('rMhs', 'Mahasiswa', `<select id="rMhs" name="uid" class="input"><option value="">Semua mahasiswa</option>${await studentOptions('')}</select>`) : ''}<div class="grid grid-cols-2 gap-3">${fld('rDari', 'Dari tanggal', '<input id="rDari" name="dari" type="date" class="input">')}${fld('rSampai', 'Sampai tanggal', '<input id="rSampai" name="sampai" type="date" class="input">')}</div><p class="help">Berisi tanggal, topik, dan catatan hasil bimbingan beserta kehadiran, lengkap dengan kolom tanda tangan. ${dosen ? 'Kop dapat diubah di Pengaturan.' : 'Hanya memuat bimbinganmu sendiri.'}</p><button class="btn btn-primary btn-block" type="submit">${icon('picture_as_pdf')} Buat PDF</button></form>`);
}
const TAHAP_NAMES = ['Pengajuan judul', 'Bimbingan proposal: Bab 1', 'Bimbingan proposal: Bab 2', 'Bimbingan proposal: Bab 3', 'Revisi sidang proposal', 'Bimbingan skripsi: Bab 1', 'Bimbingan skripsi: Bab 2', 'Bimbingan skripsi: Bab 3', 'Bimbingan skripsi: Bab 4', 'Bimbingan skripsi: Bab 5', 'Revisi sidang kolokium'];
const PUB_STATUS = ['Menentukan jurnal', 'Menulis naskah', 'Sudah disubmit', 'Dalam review', 'Revisi dari reviewer', 'Diterima (LoA terbit)', 'Terbit'];
async function openUploadRevisi(dokId) {
  const d = await getDet(isDosen() ? S.params.uid : S.user.uid, true), doc = d.dokumen.find(x => x.id === dokId);
  if (!doc) throw new Error('Dokumen tidak ditemukan.');
  const open = doc.revisi.filter(r => !r.dibawa && r.status !== 'Disetujui');
  closeModal();
  openModal(`${modalHead('Unggah revisi · ' + esc(doc.tahap))}<form data-form="upDok" class="space-y-3"><input type="hidden" name="uid" value="${esc(d.uid)}"><input type="hidden" name="tipe" value="Draf">${(doc.tahap_ids || [doc.tahap_id]).map(i => `<input type="hidden" name="tahap_ids" value="${esc(i)}">`).join('')}
    <p class="text-sm text-ink2">Ini akan menjadi <b>versi ${Number(doc.versi) + 1}</b>. Centang catatan dosen yang <b>sudah kamu perbaiki</b> di berkas baru; yang tidak dicentang otomatis terbawa ke versi ini.</p>
    ${open.length ? `<div class="space-y-2">${open.map(r => `<label class="check cursor-pointer"><input type="checkbox" name="fixed" value="${r.id}" ${r.status === 'Sudah direvisi' ? 'checked' : ''} class="mt-1 h-5 w-5 flex-shrink-0 accent-[#9F1239]"><span class="min-w-0 text-sm">${r.rujukan ? `<span class="block text-[11px] italic text-goldink">“${esc(r.rujukan.slice(0, 90))}”</span>` : ''}<b>${esc(r.poin)}</b></span></label>`).join('')}</div>` : '<p class="rounded-2xl bg-mintp p-3 text-sm text-mintink">Tidak ada catatan yang tertunda.</p>'}
    ${fld('rvFile', 'Berkas revisi (DOCX atau PDF, maks. 10 MB)', '<input id="rvFile" name="file" type="file" accept=".pdf,.docx,.doc,application/pdf" class="input" required>')}
    ${fld('rvCat', 'Catatan untuk dosen (opsional)', '<textarea id="rvCat" name="catatan" class="input" maxlength="300" placeholder="Mis. latar belakang sudah ditambah sitasi"></textarea>')}
    <button class="btn btn-gold btn-block" type="submit">${icon('upload')} Unggah revisi</button></form>`);
}
async function openJadwal(tahapId) {
  const uid = isDosen() ? S.params.uid : S.user.uid, d = await getDet(uid), t = d.tahapan.find(x => x.id === tahapId);
  if (!t) throw new Error('Tahapan tidak ditemukan.');
  const a = t.acara || {};
  openModal(`${modalHead('Jadwal · ' + esc(t.nama))}<form data-form="jadwal" data-id="${tahapId}" class="space-y-3"><p class="text-sm text-ink2">Tanggal & hari pelaksanaan wajib diisi sebelum tahap ini dapat ditandai selesai. Dapat diisi mahasiswa atau dosen; pihak lain langsung melihatnya.</p>
    ${fld('jTgl', 'Tanggal pelaksanaan', `<input id="jDate" name="tanggal" type="date" class="input" value="${esc(a.tgl || '')}" required>`)}<p class="-mt-1 ml-1 text-sm font-bold text-brandtx" id="jHari">${a.hari ? 'Hari: ' + esc(a.hari) : ''}</p>
    ${fld('jKet', 'Keterangan (jam / ruang / tautan, opsional)', `<input id="jKet" name="ket" class="input" maxlength="120" value="${esc(a.ket || '')}" placeholder="Mis. 09.00 WIB, Ruang Sidang Fasilkom">`)}
    <button class="btn btn-primary btn-block" type="submit">${icon('event_available')} Simpan jadwal</button></form>`);
}
async function openPublikasi(uid) {
  const d = await getDet(uid || S.user.uid, true), p = d.pub || {};
  openModal(`${modalHead('Data publikasi jurnal')}<form data-form="publikasi" data-uid="${esc(d.uid)}" class="space-y-3">
    ${fld('pJur', 'Jurnal yang dituju', `<input id="pJur" name="jurnal" class="input" required maxlength="150" value="${esc(p.jurnal || '')}" placeholder="Nama jurnal / prosiding">`)}
    ${fld('pJud', 'Judul artikel', `<input id="pJud" name="judul" class="input" maxlength="250" value="${esc(p.judul || '')}">`)}
    ${fld('pSt', 'Progres saat ini', `<select id="pSt" name="status" class="input" required>${PUB_STATUS.map(s => `<option ${s === (p.status || 'Menentukan jurnal') ? 'selected' : ''}>${s}</option>`).join('')}</select>`)}
    ${fld('pLink', 'Tautan jurnal / artikel (opsional)', `<input id="pLink" name="link" type="url" class="input" maxlength="300" value="${esc(p.link || '')}" placeholder="https://…">`)}
    ${fld('pLoa', 'Unggah LoA (PDF/JPG/PNG, maks. 10 MB)', '<input id="pLoa" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" class="input">', p.loa ? 'LoA sudah diunggah (' + esc(p.loa_nama) + '). Pilih berkas baru hanya bila ingin menggantinya.' : 'Wajib diunggah saat status “Diterima (LoA terbit)” atau “Terbit”.')}
    ${fld('pCat', 'Catatan progres (opsional)', `<textarea id="pCat" name="catatan" class="input" maxlength="500" placeholder="Mis. menunggu keputusan reviewer 2">${esc(p.catatan || '')}</textarea>`)}
    <button class="btn btn-primary btn-block" type="submit">${icon('save')} Simpan</button></form>`);
}
function openBersihkan() {
  openModal(`${modalHead('Bersihkan riwayat bimbingan')}<form data-form="bersihkan" class="space-y-3"><p class="text-sm text-ink2">Menghapus <b>permanen</b> riwayat sesi yang lebih lama dari periode di bawah agar daftar tidak menumpuk. Jadwal ke depan tidak ikut terhapus. Sebaiknya <b>cetak catatan</b> dulu sebagai arsip.</p>
    ${fld('bMonths', 'Hapus sesi yang lebih lama dari', '<select id="bMonths" name="bulan" class="input"><option value="3">3 bulan</option><option value="6" selected>6 bulan</option><option value="12">12 bulan</option></select>')}
    <div class="flex gap-2"><button class="btn btn-ghost flex-1" type="button" data-act="openRekap">${icon('print')} Cetak dulu</button><button class="btn btn-danger flex-1" type="submit">${icon('delete')} Hapus</button></div></form>`);
}
function downloadText(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime || 'text/csv;charset=utf-8' })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function openCatatan(id) {
  let s = (S.sesiAll || []).find(x => x.id === id);
  Object.keys(S.det).forEach(k => { const f = S.det[k].d.sesi.find(x => x.id === id); if (f) s = f; });
  if (!s) return;
  openModal(`${modalHead('Catatan sesi bimbingan')}<form data-form="catatan" data-id="${id}" class="space-y-3">${fld('cTopik', 'Topik', `<input id="cTopik" name="topik" class="input" maxlength="200" value="${esc(s.topik)}">`)}${fld('cIsi', 'Hasil & catatan bimbingan', `<textarea id="cIsi" name="catatan" class="input" style="min-height:140px" maxlength="1500" placeholder="Poin pembahasan, keputusan, tugas berikutnya…">${esc(s.catatan)}</textarea>`)}<button class="btn btn-primary btn-block" type="submit">${icon('save')} Simpan</button></form>`);
}
async function openEditMhs(uid) {
  const d = await getDet(uid), p = d.profil;
  openModal(`${modalHead('Ubah profil mahasiswa')}<form data-form="saveProfil" data-uid="${esc(uid)}" data-modal="1" class="space-y-3">${fld('eNama', 'Nama', `<input id="eNama" name="nama" class="input" value="${esc(p.nama)}" required maxlength="80">`)}${fld('eJudul', 'Judul skripsi', `<textarea id="eJudul" name="judul" class="input" maxlength="300">${esc(p.judul)}</textarea>`)}${fld('eFoto', 'Tautan foto (opsional)', `<input id="eFoto" name="foto" type="url" class="input" value="${esc(p.foto)}" maxlength="400" placeholder="https://…">`)}<button class="btn btn-primary btn-block" type="submit">${icon('save')} Simpan</button></form>`);
}

// ════════ BAGIAN 20: HANDLER FORMULIR ════════
const FORMS = {
  async loginPw(f, fd, b) { S.auth.email = String(fd.get('email')).trim(); await safe(withBtn(b, async () => { const r = await api('loginPassword', S.auth.email, String(fd.get('pw'))); await enterApp(r.token); })); },
  async daftar(f, fd, b) {
    if (fd.get('pw') !== fd.get('pw2')) { toast('Kata sandi dan ulangannya tidak sama.', 'error'); return; }
    const v = n => String(fd.get(n)).trim();
    await safe(withBtn(b, async () => { const r = await api('daftarMahasiswa', v('token'), v('nama'), v('npm'), v('email'), String(fd.get('pw'))); await enterApp(r.token); toast('Pendaftaran berhasil. Selamat datang di Bimska!', 'ok'); }));
  },
  async resetReq(f, fd, b) { const em = String(fd.get('email')).trim(); await safe(withBtn(b, async () => { await api('resetRequest', em); S.auth.email = em; toast('Jika email terdaftar, kode telah dikirim.', 'ok'); authBody('reset', 2); })); },
  async resetVer(f, fd, b) {
    if (fd.get('pw') !== fd.get('pw2')) { toast('Kata sandi dan ulangannya tidak sama.', 'error'); return; }
    await safe(withBtn(b, async () => { const r = await api('resetVerify', S.auth.email, String(fd.get('code')), String(fd.get('pw'))); await enterApp(r.token); toast('Kata sandi disimpan. Selamat datang!', 'ok'); }));
  },
  async ubahSandi(f, fd, b) {
    if (fd.get('baru') !== fd.get('baru2')) { toast('Kata sandi baru dan ulangannya tidak sama.', 'error'); return; }
    await safe(withBtn(b, async () => { await apiA('ubahPassword', String(fd.get('lama')), String(fd.get('baru'))); f.reset(); toast('Kata sandi berhasil diubah.', 'ok'); }));
  },
  async upST(f, fd, b) {
    await safe(withBtn(b, async () => {
      const file = await readFile(f.querySelector('input[type=file]'));
      await apiA('uploadSuratTugas', { uid: fd.get('uid'), jenis: fd.get('jenis'), mulai: fd.get('mulai'), berakhir: fd.get('berakhir'), file: file });
      closeModal(); invalidate(); toast('Surat tugas berhasil diunggah.', 'ok'); rerender();
    }));
  },
  async upDok(f, fd, b) {
    await safe(withBtn(b, async () => {
      const ids = fd.getAll('tahap_ids'); if (!ids.length) throw new Error('Pilih minimal satu bab/tahap.');
      const file = await readFile(f.querySelector('input[type=file]'));
      const r = await apiA('uploadDokumen', { uid: fd.get('uid'), tipe: fd.get('tipe'), tahap_ids: ids, catatan: fd.get('catatan'), fixed: fd.getAll('fixed'), file: file });
      closeModal(); invalidate(); S.docCache = {}; toast((r.n > 1 ? r.label + ' · ' : '') + 'Versi ' + r.versi + ' diunggah' + (r.fixed ? ` · ${r.fixed} catatan menunggu verifikasi` : '') + (r.carried ? ` · ${r.carried} catatan terbawa` : '') + '.', 'ok'); rerender();
    }));
  },
  async vtSave(f, fd, b) {
    const v = S.viewer; if (!v) return; const a = v.cAnchor;
    await safe(withBtn(b, async () => {
      const t = await apiA('addRevisi', v.dokId, { poin: String(fd.get('poin')), anchor: a ? JSON.stringify(a) : '', rujukan: a ? a.q : '' });
      v.tasks.push(t); v.tasks.sort((x, y) => ((x.anchor ? x.anchor.p : 9e6) - (y.anchor ? y.anchor.p : 9e6)) || (x.dibuat < y.dibuat ? -1 : 1));
      v.composer = false; v.cAnchor = null; renderSide(); applyHighlights(); showSelBar(); invalidate(); toast('Catatan disimpan sebagai tugas revisi mahasiswa.', 'ok'); setTimeout(() => focusTask(t.id), 120);
    }));
  },
  async vtReply(f, fd, b) {
    const v = S.viewer, id = f.dataset.id; if (!v) return;
    await safe(withBtn(b, async () => {
      const r = await apiA('balasRevisi', id, String(fd.get('isi'))), t = v.tasks.find(x => x.id === id);
      if (t) { t.replies = t.replies || []; t.replies.push({ id: r.id, isi: r.isi, penulis: r.penulis, role: r.role, tanggal: r.tanggal }); }
      renderSide(); invalidate();
    }));
  },
  async jadwal(f, fd, b) {
    const id = f.dataset.id;
    await safe(withBtn(b, async () => {
      const r = await apiA('setJadwalTahap', id, String(fd.get('tanggal')), String(fd.get('ket') || ''));
      invalidate(); closeModal(); toast('Jadwal tersimpan: ' + r.hari + ', ' + tgl(r.tgl) + '.', 'ok'); rerender();
    }));
  },
  async publikasi(f, fd, b) {
    await safe(withBtn(b, async () => {
      const inp = f.querySelector('input[type=file]'); let file = null;
      if (inp && inp.files && inp.files[0]) file = await readFile(inp);
      await apiA('simpanPublikasi', { uid: f.dataset.uid, jurnal: fd.get('jurnal'), judul: fd.get('judul'), status: fd.get('status'), link: fd.get('link'), catatan: fd.get('catatan'), file: file });
      invalidate(); closeModal(); toast('Data publikasi tersimpan.', 'ok'); rerender();
    }));
  },
  async bersihkan(f, fd, b) {
    if (!(await confirmBox('Hapus permanen riwayat bimbingan yang lebih lama dari ' + fd.get('bulan') + ' bulan?', 'Ya, hapus', true))) return;
    await safe(withBtn(b, async () => { const r = await apiA('bersihkanRiwayat', Number(fd.get('bulan'))); invalidate(); closeModal(); toast(r.n + ' sesi lama dihapus.', 'ok'); rerender(); }));
  },
  async sendMsg(f, fd, b) {
    const isi = String(fd.get('isi')).trim(); if (!isi) return; const uid = f.dataset.uid;
    f.reset(); const el = $('#msgs');
    if (el) { el.insertAdjacentHTML('beforeend', `<div class="flex"><div class="bubble me">${esc(isi)}<small>mengirim…</small></div></div>`); el.scrollTop = el.scrollHeight; }
    try { await apiA('kirimPesan', uid, isi); S.dash = null; await loadMsgs(uid, ''); } catch (e) { toast(e.message, 'error'); loadMsgs(uid, ''); }
  },
  async newToken(f, fd, b) {
    await safe(withBtn(b, async () => {
      const r = await apiA('buatToken', { catatan: String(fd.get('catatan') || ''), kuota: Number(fd.get('kuota')), hari: Number(fd.get('hari')) });
      openModal(`${modalHead('Token dibuat')}<p class="text-sm text-ink2">Bagikan token ini kepada mahasiswa. Bisa dipakai oleh <b>${r.kuota} mahasiswa</b>, ${r.berlaku ? 'berlaku sampai <b>' + tgl(r.berlaku) + '</b>' : 'tanpa batas waktu'}.</p><p class="my-4 text-center"><span class="token-box !text-2xl">${esc(r.token)}</span></p><div class="flex gap-2"><button class="btn btn-primary flex-1" data-act="copy" data-v="${esc(r.token)}">${icon('content_copy')} Salin</button><button class="btn btn-ghost flex-1" data-act="closeModal">Tutup</button></div>`, { noFocus: true });
      rerender();
    }));
  },
  async saveSetting(f, fd, b) {
    await safe(withBtn(b, async () => {
      const g = n => fd.get(n);
      await apiA('simpanPengaturan', { ambang_urgent: g('ambang_urgent'), ambang_tidak_aktif: g('ambang_tidak_aktif'), target_hari_tahap: g('target_hari_tahap'), xp: { tahap: g('x_tahap'), bimbingan: g('x_bimbingan'), revisi: g('x_revisi'), dokumen: g('x_dokumen'), streak: g('x_streak') }, kutipan: String(g('kutipan')).split('\n'), rekap: { judul: g('r_judul'), instansi: g('r_instansi'), catatan: g('r_catatan') } });
      const bm = await apiA('getBootstrap'); S.meta = bm; invalidate(); toast('Pengaturan disimpan.', 'ok');
    }));
  },
  async saveProfil(f, fd, b) {
    await safe(withBtn(b, async () => {
      const payload = { nama: String(fd.get('nama')), foto: String(fd.get('foto') || '') }; if (fd.has('judul')) payload.judul = String(fd.get('judul'));
      const u = await apiA('simpanProfil', f.dataset.uid, payload);
      if (u.uid === S.user.uid) { S.user = u; showShell(); }
      invalidate(); if (f.dataset.modal) closeModal(); toast('Profil disimpan.', 'ok'); rerender();
    }));
  },
  async kelas(f, fd, b) {
    await safe(withBtn(b, async () => {
      const r = await apiA('bukaKelas', { tanggal: fd.get('tanggal'), jam: fd.get('jam'), mode: fd.get('mode'), link: fd.get('link'), topik: fd.get('topik'), tahap: fd.get('tahap') || '', uids: fd.getAll('uids') });
      closeModal(); invalidate(); toast('Kelas dibuka untuk ' + r.n + ' mahasiswa.', 'ok'); if (S.page === 'bimbingan' || S.page === 'home') go(S.page, S.params);
    }));
  },
  async rekap(f, fd, b) {
    await safe(withBtn(b, async () => {
      const r = await apiA('cetakRekapPdf', { uid: fd.get('uid') || '', dari: fd.get('dari'), sampai: fd.get('sampai') });
      downloadFile(r); closeModal(); toast('PDF catatan bimbingan (' + r.n + ' sesi) diunduh.', 'ok');
    }));
  },
  async catatan(f, fd, b) {
    const id = f.dataset.id;
    await safe(withBtn(b, async () => {
      await apiA('simpanCatatan', id, String(fd.get('topik')), String(fd.get('catatan')));
      const patch = x => { if (x.id === id) { x.topik = String(fd.get('topik')); x.catatan = String(fd.get('catatan')); } };
      (S.sesiAll || []).forEach(patch); Object.keys(S.det).forEach(k => S.det[k].d.sesi.forEach(patch));
      closeModal(); toast('Catatan tersimpan.', 'ok'); rerender();
    }));
  }
};
function fillRv() {
  const el = $('#rvList'); if (!el || !S.antrian) return;
  const f = RVF[S.rvF] ? S.rvF : 'periksa', q = (S.rvQ || '').toLowerCase();
  const list = S.antrian.filter(RVF[f][1]).filter(x => !q || (x.nama + ' ' + x.npm + ' ' + x.tahap).toLowerCase().indexOf(q) >= 0).sort(RVSORT[f]);
  el.innerHTML = list.length ? list.map(antrianCard).join('') : `<div class="card">${empty('search_off', 'Tidak ada yang cocok', 'Ubah kata kunci atau kategori.')}</div>`;
}
// ════════ BAGIAN 21: AKSI KLIK (delegasi; tanpa href/window.location) ════════
const ACT = {
  nav: d => go(d.page),
  navClose: d => { closeModal(); go(d.page); },
  more: () => openMore(),
  closeModal: () => closeModal(),
  cfYes: () => S._cf && S._cf(true), cfNo: () => S._cf && S._cf(false),
  toggleTheme: () => { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); if (S.page === 'profil') rerender(); },
  openNotif: () => openNotif(),
  readAll: async () => { await safe(apiA('bacaNotif', 'all').then(r => { S.notifUnread = r.unread; updateNotifDot(); openNotif(); })); },
  notifGo: async (d) => {
    try { const r = await apiA('bacaNotif', d.id); S.notifUnread = r.unread; updateNotifDot(); } catch (e) { /* abaikan */ }
    closeModal();
    if (['dokumen', 'revisi', 'komentar'].indexOf(d.j) >= 0 && d.ref) { openDocViewer(d.ref); return; }
    if (d.j === 'publikasi') { if (isDosen() && d.ref) go('detail', { uid: d.ref, tab: 'tahapan' }); else go('tahapan'); return; }
    if (d.j === 'diskusi' && isDosen() && d.ref) { go('diskusi', { uid: d.ref }); return; }
    go(d.j === 'tahapan' ? (isDosen() ? 'mahasiswa' : 'tahapan') : (NOTIF_GO[d.j] || 'home'));
  },
  reload: () => go(S.page, S.params),
  refreshDash: () => refreshDash(false),
  filter: d => { S.fl.f = d.f; fillStudentList(); },
  detail: d => { S.tab = d.tab || 'tahapan'; go('detail', { uid: d.uid, tab: d.tab || 'tahapan' }); },
  detailTab: d => { S.tab = d.tab; go('detail', { uid: S.params.uid, tab: d.tab }); },
  dismiss: (d, el) => { const s = el.closest('section'); if (s) s.remove(); },
  sapa: async (d) => { if (await confirmBox('Kirim notifikasi semangat (kutipan acak) ke mahasiswa ini?', 'Kirim')) await safe(apiA('sapaMahasiswa', d.uid).then(() => toast('Semangat terkirim.', 'ok'))); },
  openKelas: () => safe(openKelas()),
  openUploadST: d => safe(openUploadST(d.uid)),
  openUploadDok: d => safe(openUploadDok(d.uid, d.tipe)),
  openRekap: () => safe(openRekap()),
  editJudul: d => safe(openEditMhs(d.uid)),
  previewST: d => openPreview('st', d.id, d.title),
  openDoc: d => openDocViewer(d.id, d.task || ''),
  openUploadRevisi: d => safe(openUploadRevisi(d.id)),
  openJadwal: d => safe(openJadwal(d.id)),
  openPublikasi: d => safe(openPublikasi(d.uid)),
  viewLoa: d => openPreview('loa', d.id, 'Letter of Acceptance (LoA)'),
  histMore: () => { S.hist.n += 10; rerender(); },
  delSesi: async d => { if (await confirmBox('Hapus sesi ini dari riwayat? Tindakan ini tidak dapat dibatalkan.', 'Hapus', true)) optimistic(() => { const p = x => x.id !== d.id; S.sesiAll = (S.sesiAll || []).filter(p); Object.keys(S.det).forEach(k => S.det[k].d.sesi = S.det[k].d.sesi.filter(p)); }, () => apiA('hapusSesi', d.id), 'Sesi dihapus.'); },
  openBersihkan: () => openBersihkan(),
  rekapFilter: d => { S.rk = d.f; rerender(); },
  rekapPdf: async () => { await safe(apiA('cetakProgresPdf', S.rk).then(r => { downloadFile(r); toast('PDF rekap progres diunduh.', 'ok'); })); },
  rekapCsv: async () => { await safe(getDash().then(d => { downloadText('Rekap-Progres-Mahasiswa.csv', rekapCsvText(d.sum)); toast('CSV diunduh.', 'ok'); })); },
  vTab: d => { if (S.viewer) { S.viewer.vTab = d.t; renderViewer(); } },
  vMode: () => { const v = S.viewer; if (v) { v.mode = v.mode === 'text' ? 'asli' : 'text'; renderViewer(); } },
  vtFilter: d => { if (S.viewer) { S.viewer.filter = d.f; renderViewer(); } },
  vtCompose: d => { const v = S.viewer; if (!v) return; v.cAnchor = d.general ? null : v.sel; v.sel = null; v.composer = true; if (window.innerWidth < 1024) { v.vTab = 'tugas'; renderViewer(); } else { renderSide(); showSelBar(); } setTimeout(() => { const t = $('#vSide textarea'); if (t) t.focus(); }, 60); },
  vtCancel: () => { const v = S.viewer; if (v) { v.composer = false; v.cAnchor = null; renderSide(); } },
  vtClearSel: () => { if (S.viewer) { S.viewer.sel = null; showSelBar(); const s = window.getSelection(); if (s) s.removeAllRanges(); } },
  vtGo: d => { goMark(d.id); flash($('#tc-' + d.id)); },
  vtSet: d => taskSet(d.id, d.st, d.st === 'Disetujui' ? 'Revisi disetujui.' : d.st === 'Belum direvisi' ? 'Dikembalikan ke mahasiswa.' : ''),
  vtToggle: d => taskSet(d.id, d.st === 'Belum direvisi' ? 'Sudah direvisi' : 'Belum direvisi', d.st === 'Belum direvisi' ? 'Ditandai sudah diperbaiki. Dosen akan memeriksa.' : ''),
  vtDel: async d => { if (!(await confirmBox('Hapus catatan ini beserta balasannya?', 'Hapus', true))) return; await safe(apiA('hapusRevisi', d.id).then(() => { const v = S.viewer; if (v) { v.tasks = v.tasks.filter(t => t.id !== d.id); renderSide(); applyHighlights(); invalidate(); toast('Catatan dihapus.', 'ok'); } })); },
  dlDok: async d => { await safe(apiA('getFileData', 'dok', d.id, false).then(downloadFile)); },
  dlCurrent: () => { if (S.cur) downloadFile(S.cur.f); },
  revToggle: d => revToggleOptimistic(d.id, d.st),
  revStatus: d => optimistic(() => { Object.keys(S.det).forEach(k => S.det[k].d.dokumen.forEach(dk => dk.revisi.forEach(r => { if (r.id === d.id) r.status = d.st; }))); }, () => apiA('setRevisi', d.id, d.st), d.st === 'Disetujui' ? 'Revisi disetujui.' : 'Revisi dikembalikan ke mahasiswa.'),
  setTahap: d => setTahapOptimistic(d.id, d.st),
  hadir: async d => { await hadirOptimistic(d.id); if (S.page === 'home') rerender(); },
  konfirmasi: d => optimistic(() => { const p = x => { if (x.id === d.id) { x.status = 'Valid'; x.hd = true; } }; (S.sesiAll || []).forEach(p); Object.keys(S.det).forEach(k => S.det[k].d.sesi.forEach(p)); }, () => apiA('konfirmasiSesi', d.id), 'Sesi dikonfirmasi valid.'),
  batalSesi: async d => { if (await confirmBox('Batalkan sesi ini? Mahasiswa akan diberi tahu.', 'Batalkan sesi', true)) optimistic(() => { const p = x => { if (x.id === d.id) x.status = 'Batal'; }; (S.sesiAll || []).forEach(p); Object.keys(S.det).forEach(k => S.det[k].d.sesi.forEach(p)); }, () => apiA('batalSesi', d.id), 'Sesi dibatalkan.'); },
  catatan: d => openCatatan(d.id),
  bTab: d => { S.bTab = d.t; rerender(); },
  stFilter: d => { S.stF[d.k] = d.v; rerender(); },
  openThread: d => go('diskusi', { uid: d.uid }),
  copy: d => copyText(d.v),
  delToken: async d => { if (await confirmBox('Hapus token ' + d.v + '? Token yang dihapus tidak dapat dipakai mendaftar.', 'Hapus', true)) await safe(apiA('hapusToken', d.v).then(() => { toast('Token dihapus.', 'ok'); rerender(); })); },
  logout: async () => { closeModal(); try { await api('logout', S.tok); } catch (e) { /* tetap keluar */ } forceLogout(); },
  authTab: d => { S.auth.email = ''; authBody(d.t, 1); },
  authBack: () => authBody(S.auth.tab, 1),
  authReset: () => authBody('reset', 1),
  togglePw: (d, el) => { const i = el.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.innerHTML = icon(show ? 'visibility_off' : 'visibility'); },
  goBim: d => go('bimbingan', { tab: d.tab }),
  bimTab: d => { S.bimTab = d.t; go('bimbingan', { tab: d.t }); },
  rvFilter: d => { S.rvF = d.f; rerender(); },
  tokenExt: async d => { await safe(apiA('perpanjangToken', d.v, 7).then(r => { toast('Berlaku sampai ' + tgl(r.berlaku) + '.', 'ok'); rerender(); })); },
  resetPw: async d => { if (!(await confirmBox('Buat kata sandi sementara untuk mahasiswa ini? Kata sandi lamanya tidak berlaku lagi.', 'Buat sandi sementara', true))) return; await safe(apiA('resetPasswordMhs', d.uid).then(r => openModal(`${modalHead('Kata sandi sementara')}<p class="text-sm text-ink2">Berikan kepada <b>${esc(r.nama)}</b> dan minta segera menggantinya di menu Profil.</p><p class="my-4 text-center"><span class="token-box !text-2xl">${esc(r.password)}</span></p><div class="flex gap-2"><button class="btn btn-primary flex-1" data-act="copy" data-v="${esc(r.password)}">${icon('content_copy')} Salin</button><button class="btn btn-ghost flex-1" data-act="closeModal">Tutup</button></div>`, { noFocus: true }))); },
  vFocus: () => { const v = S.viewer; if (v) { v.focus = !v.focus; renderViewer(); } },
  vFs: () => { const v = S.viewer; if (v) { v.fs = v.fs >= 20 ? 15 : v.fs + 2; renderViewer(); } },
  pbYes: () => { const ids = $$('#confirmRoot input[name=pb]:checked').map(i => i.value); if (!ids.length) { toast('Pilih minimal satu bab.', 'error'); return; } if (S._cf) S._cf(ids); },
  vtKembali: () => vtKembali(),
  vtSelesai: () => vtSelesai()
};

// ════════ BAGIAN 22: PEMASANG EVENT & INISIALISASI ════════
document.addEventListener('click', e => {
  if (e.target.dataset && e.target.dataset.confirmBack) { if (S._cf) S._cf(false); return; }
  if (e.target.dataset && e.target.dataset.modalBack) { closeModal(); return; }
  const mk = e.target.closest && e.target.closest('mark.hl');
  if (mk && S.viewer && window.getSelection().isCollapsed) { focusTask(mk.dataset.task); return; }
  const t = e.target.closest('[data-act]'); if (!t) return;
  if (t.dataset.act === 'vtGo' && t.classList.contains('tcard') && e.target.closest('input,textarea,select,form,button,a')) return;   // klik kartu = lompat ke teks, kecuali pada kontrol di dalamnya
  const fn = ACT[t.dataset.act]; if (fn) { e.preventDefault(); fn(t.dataset, t, e); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); const fn = FORMS[f.dataset.form];
  if (fn) fn(f, new FormData(f), f.querySelector('[type=submit]'));
});
document.addEventListener('change', e => {
  const t = e.target.closest('[data-change]'); if (!t) return;
  if (t.dataset.change === 'setTahap') setTahapOptimistic(t.dataset.id, t.value);
  if (t.dataset.change === 'dkPick') { updDkLabel(); return; }
  if (t.dataset.change === 'histMonth') { S.hist.month = t.value; S.hist.n = 10; rerender(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'stuSearch') { S.fl.q = e.target.value; fillStudentList(); }
  if (e.target.id === 'rvSearch') { S.rvQ = e.target.value; clearTimeout(S.rvT); S.rvT = setTimeout(fillRv, 150); }
  if (e.target.id === 'jDate') { const h = $('#jHari'), v = e.target.value; h.textContent = v ? 'Hari: ' + ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(v + 'T00:00:00').getDay()] : ''; }
});
document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('#selBar')) e.preventDefault(); });   // jaga agar blok teks tidak hilang saat menekan tombol
document.addEventListener('selectionchange', () => {
  if (!S.viewer || !isDosen()) return;
  clearTimeout(S.selT);
  S.selT = setTimeout(() => { const root = $('#docBody'); if (!root || !S.viewer || S.viewer.composer) return; const a = selAnchor(root); if (a) { S.viewer.sel = a; showSelBar(); } }, 140);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#confirmRoot .modal-card')) { if (S._cf) S._cf(false); } else if ($('#modalRoot .modal-card')) closeModal(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
});
window.__bimskaLoaded = true;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
