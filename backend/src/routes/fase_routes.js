const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const {
  kirimEmailUndanganGR, kirimEmailMOM,
  kirimNotifikasiDokumenDiterima, kirimJadwalPsikotes,
  kirimUndanganPresentasi, kirimLaporan
} = require('../services/emailService');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// FASE 3 ROUTER
// ============================================================
const fase3Router = express.Router();

fase3Router.post('/jadwal-gr', authMiddleware, picOnly, async (req, res) => {
  const { id_request, tanggal_gr, jam_gr, lokasi_gr, tanggal_ac, lokasi_ac } = req.body;
  if (!id_request || !tanggal_gr || !jam_gr || !lokasi_gr) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request, error } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (error || !request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  await supabase.from('requests').update({
    tanggal_gr, jam_gr, lokasi_gr,
    tanggal_ac: tanggal_ac || request.tanggal_ac,
    lokasi_ac: lokasi_ac || request.lokasi_ac,
    status: 'Menunggu GR'
  }).eq('id_request', id_request);

  const penerima = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null
  ].filter(Boolean);

  for (const p of penerima) {
    await kirimEmailUndanganGR({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, tanggalGR: tanggal_gr,
      jamGR: jam_gr, lokasiGR: lokasi_gr,
      namaPeserta: request.nama_peserta
    });
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Jadwal GR Dikirim', detail: `${tanggal_gr} ${jam_gr} di ${lokasi_gr}` });
  res.json({ success: true, message: 'Jadwal GR berhasil dikirim' });
});

fase3Router.post('/input-mom', authMiddleware, picOnly, async (req, res) => {
  const { id_request, mom_gr } = req.body;
  if (!id_request || !mom_gr) return res.status(400).json({ error: 'Field wajib belum lengkap' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  await supabase.from('requests').update({ mom_gr, status: 'GR Selesai - Menunggu Dokumen' }).eq('id_request', id_request);

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  await kirimEmailMOM({ namaTo: request.pic_hc, emailTo: request.email_pic_hc, idRequest: id_request, namaPeserta: request.nama_peserta, momText: mom_gr, isTimPelaksana: false });
  await delay(400);

  const tim = [
    config.assessor_1_email ? { nama: config.assessor_1_nama, email: config.assessor_1_email } : null,
    config.assessor_2_email ? { nama: config.assessor_2_nama, email: config.assessor_2_email } : null,
    config.admin_ac_1_email ? { nama: config.admin_ac_1_nama, email: config.admin_ac_1_email } : null,
    config.roleplayer_1_email ? { nama: config.roleplayer_1_nama, email: config.roleplayer_1_email } : null,
  ].filter(Boolean);

  for (const t of tim) {
    await kirimEmailMOM({ namaTo: t.nama, emailTo: t.email, idRequest: id_request, namaPeserta: request.nama_peserta, momText: mom_gr, isTimPelaksana: true });
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'MOM GR Dikirim', detail: 'MOM dikirim ke HC dan Tim Pelaksana' });
  res.json({ success: true, message: 'MOM berhasil dikirim' });
});

// ============================================================
// FASE 4 ROUTER
// ============================================================
const fase4Router = express.Router();

fase4Router.post('/dokumen', async (req, res) => {
  const { id_request, link_form_potrev, link_data_karyawan, link_form_star } = req.body;
  if (!id_request || !link_form_potrev || !link_data_karyawan || !link_form_star) {
    return res.status(400).json({ error: 'Semua link dokumen wajib diisi' });
  }

  const { data: request, error } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (error || !request) return res.status(404).json({ error: 'ID Request tidak ditemukan' });

  await supabase.from('requests').update({
    link_form_potrev, link_data_karyawan, link_form_star,
    status_dokumen: 'Dokumen Diterima',
    status: 'Dokumen Diterima'
  }).eq('id_request', id_request);

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  const dokumen = [
    { jenis: 'Form Potential Review', link: link_form_potrev },
    { jenis: 'Data Karyawan', link: link_data_karyawan },
    { jenis: 'Form STAR', link: link_form_star }
  ];

  const tim = [
    config.assessor_1_email ? { nama: config.assessor_1_nama, email: config.assessor_1_email } : null,
    config.assessor_2_email ? { nama: config.assessor_2_nama, email: config.assessor_2_email } : null,
    config.admin_ac_1_email ? { nama: config.admin_ac_1_nama, email: config.admin_ac_1_email } : null,
    config.roleplayer_1_email ? { nama: config.roleplayer_1_nama, email: config.roleplayer_1_email } : null,
  ].filter(Boolean);

  for (const t of tim) {
    for (const dok of dokumen) {
      await kirimNotifikasiDokumenDiterima({
        namaTo: t.nama, emailTo: t.email,
        idRequest: id_request, namaPeserta: request.nama_peserta,
        linkDokumen: dok.link, jenisDokumen: dok.jenis
      });
      await delay(400);
    }
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Dokumen Diterima', detail: 'Dokumen lanjutan berhasil diupload oleh HC' });
  res.json({ success: true, message: 'Dokumen berhasil diterima dan dikirim ke tim pelaksana' });
});

fase4Router.post('/psikotes', authMiddleware, picOnly, async (req, res) => {
  const { id_request, tanggal_psikotes, jam_psikotes, link_platform_psikotes } = req.body;
  if (!id_request || !tanggal_psikotes || !jam_psikotes || !link_platform_psikotes) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  await supabase.from('requests').update({ tanggal_psikotes, jam_psikotes, link_platform_psikotes }).eq('id_request', id_request);

  const penerima = [
    config.admin_ac_1_email ? { nama: config.admin_ac_1_nama, email: config.admin_ac_1_email } : null,
    request.email_peserta ? { nama: request.nama_peserta, email: request.email_peserta } : null
  ].filter(Boolean);

  for (const p of penerima) {
    await kirimJadwalPsikotes({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggal: tanggal_psikotes, jam: jam_psikotes,
      linkPlatform: link_platform_psikotes, isReminder: false
    });
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Jadwal Psikotes Dikirim', detail: `${tanggal_psikotes} ${jam_psikotes}` });
  res.json({ success: true, message: 'Jadwal psikotes berhasil dikirim' });
});

// POST /api/fase4/jadwal-ac - Input jadwal AC
fase4Router.post('/jadwal-ac', authMiddleware, picOnly, async (req, res) => {
  const { id_request, tanggal_ac, jam_ac, lokasi_ac } = req.body;
  if (!id_request || !tanggal_ac || !jam_ac || !lokasi_ac) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  await supabase.from('requests').update({ tanggal_ac, jam_ac, lokasi_ac }).eq('id_request', id_request);

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Jadwal AC Diinput', detail: `${tanggal_ac} ${jam_ac} di ${lokasi_ac}` });
  res.json({ success: true, message: 'Jadwal AC berhasil disimpan' });
});

// ============================================================
// FASE 6 ROUTER
// ============================================================
const fase6Router = express.Router();

fase6Router.post('/jadwal-presentasi', authMiddleware, picOnly, async (req, res) => {
  const { id_request, tanggal_presentasi, jam_presentasi, lokasi_presentasi } = req.body;
  if (!id_request || !tanggal_presentasi || !jam_presentasi || !lokasi_presentasi) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  await supabase.from('requests').update({
    tanggal_presentasi, jam_presentasi, lokasi_presentasi,
    status: 'Menunggu Presentasi'
  }).eq('id_request', id_request);

  const penerima = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null
  ].filter(Boolean);

  for (const p of penerima) {
    await kirimUndanganPresentasi({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggal: tanggal_presentasi, jam: jam_presentasi, lokasi: lokasi_presentasi
    });
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Jadwal Presentasi Dikirim', detail: `${tanggal_presentasi} ${jam_presentasi} di ${lokasi_presentasi}` });
  res.json({ success: true, message: 'Undangan presentasi berhasil dikirim' });
});

fase6Router.post('/kirim-laporan', authMiddleware, picOnly, async (req, res) => {
  const { id_request, path_laporan } = req.body;
  if (!id_request || !path_laporan) return res.status(400).json({ error: 'ID Request dan path laporan wajib diisi' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: fileData, error: fileError } = await supabase.storage.from('laporan-pdf').download(path_laporan);
  if (fileError) return res.status(404).json({ error: 'File PDF tidak ditemukan di storage' });

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());
  const namaPDF = `Laporan_AC_${request.nama_peserta.replace(/\s/g, '_')}_${id_request}.pdf`;

  const penerima = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null
  ].filter(Boolean);

  for (const p of penerima) {
    await kirimLaporan({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      pdfBuffer, namaPDF
    });
    await delay(400);
  }

  await supabase.from('requests').update({ status_laporan: 'Laporan Dikirim', path_laporan, status: 'Selesai' }).eq('id_request', id_request);
  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Laporan Dikirim', detail: `PDF dikirim ke ${penerima.map(p => p.email).join(', ')}` });

  res.json({ success: true, message: 'Laporan berhasil dikirim' });
});

fase6Router.get('/cek-file/:idRequest', authMiddleware, picOnly, async (req, res) => {
  const idRequest = req.params.idRequest;
  const { data: files } = await supabase.storage.from('laporan-pdf').list('', { search: idRequest });
  const found = files?.filter(f => f.name.includes(idRequest)) || [];
  res.json({ found: found.length > 0, files: found });
});

module.exports = { fase3Router, fase4Router, fase6Router };
