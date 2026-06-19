const express = require('express');
const multer = require('multer');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const {
  kirimEmailUndanganGR, kirimEmailMOM,
  kirimNotifikasiDokumenDiterima, kirimJadwalPsikotes,
  kirimUndanganPresentasi, kirimLaporan, kirimReminderAC
} = require('../services/emailService');

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: ambil semua tim pelaksana dari config secara dinamis
const getTimPelaksana = (config) => {
  const assessors = [];
  let i = 1;
  while (config[`assessor_${i}_email`]) {
    assessors.push({ nama: config[`assessor_${i}_nama`], email: config[`assessor_${i}_email`] });
    i++;
  }

  const admins = [];
  let j = 1;
  while (config[`admin_ac_${j}_email`]) {
    admins.push({ nama: config[`admin_ac_${j}_nama`], email: config[`admin_ac_${j}_email`] });
    j++;
  }

  const roleplayers = [];
  let k = 1;
  while (config[`roleplayer_${k}_email`]) {
    roleplayers.push({ nama: config[`roleplayer_${k}_nama`], email: config[`roleplayer_${k}_email`] });
    k++;
  }

  return [...assessors, ...admins, ...roleplayers];
};

// Helper: ambil semua admin dari config secara dinamis
const getAdmins = (config) => {
  const admins = [];
  let i = 1;
  while (config[`admin_ac_${i}_email`]) {
    admins.push({ nama: config[`admin_ac_${i}_nama`], email: config[`admin_ac_${i}_email`] });
    i++;
  }
  return admins;
};

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

  const tim = getTimPelaksana(config);
  for (const t of tim) {
    await kirimEmailMOM({ namaTo: t.nama, emailTo: t.email, idRequest: id_request, namaPeserta: request.nama_peserta, momText: mom_gr, isTimPelaksana: true, linkKeperluan: config.link_keperluan_asesmen || null });
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

  const tim = getTimPelaksana(config);
  for (const t of tim) {
    for (const dok of dokumen) {
      await kirimNotifikasiDokumenDiterima({
        namaTo: t.nama, emailTo: t.email,
        idRequest: id_request, namaPeserta: request.nama_peserta,
        linkDokumen: dok.link, jenisDokumen: dok.jenis,
        linkKeperluan: config.link_keperluan_asesmen || null
      });
      await delay(400);
    }
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Dokumen Diterima', detail: 'Dokumen lanjutan berhasil diupload oleh HC' });
  res.json({ success: true, message: 'Dokumen berhasil diterima dan dikirim ke tim pelaksana' });
});

fase4Router.post('/psikotes', authMiddleware, picOnly, async (req, res) => {
  const { id_request, tanggal_psikotes, jam_psikotes } = req.body;
  if (!id_request || !tanggal_psikotes || !jam_psikotes) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  const isRevisi = !!(request.tanggal_psikotes);
  await supabase.from('requests').update({ tanggal_psikotes, jam_psikotes, status: 'Psikotes Dijadwalkan' }).eq('id_request', id_request);

  // Kirim ke HC, User/Atasan, dan semua Admin AC
  const admins = getAdmins(config);
  const penerima = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null,
    ...admins
  ].filter(Boolean);

  for (const p of penerima) {
    await kirimJadwalPsikotes({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggal: tanggal_psikotes, jam: jam_psikotes,
      isReminder: false, isRevisi
    });
    await delay(400);
  }

  const aktivitas = isRevisi ? 'Jadwal Psikotes Direvisi' : 'Jadwal Psikotes Dikirim';
  await supabase.from('log_aktivitas').insert({ id_request, aktivitas, detail: `${tanggal_psikotes} ${jam_psikotes}` });
  res.json({ success: true, message: isRevisi ? 'Jadwal psikotes berhasil diperbarui dan dikirim ulang' : 'Jadwal psikotes berhasil dikirim' });
});

fase4Router.post('/jadwal-ac', authMiddleware, picOnly, async (req, res) => {
  const { id_request, tanggal_ac, jam_ac, lokasi_ac } = req.body;
  if (!id_request || !tanggal_ac || !jam_ac || !lokasi_ac) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  const isRevisiAC = !!(request.tanggal_ac && request.jam_ac);
  await supabase.from('requests').update({ tanggal_ac, jam_ac, lokasi_ac, status: 'AC Dijadwalkan' }).eq('id_request', id_request);

  // Kirim notifikasi jadwal AC ke HC, User/Atasan, dan seluruh tim pelaksana
  const tim = getTimPelaksana(config);
  const penerimaHC = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null
  ].filter(Boolean);
  const lokasiLengkap = `${lokasi_ac} pukul ${jam_ac} WIB`;

  for (const p of penerimaHC) {
    await kirimReminderAC({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: tanggal_ac, lokasiAC: lokasiLengkap,
      isHariH: false, attachCalendar: true, isRevisi: isRevisiAC
    });
    await delay(400);
  }
  for (const t of tim) {
    await kirimReminderAC({
      namaTo: t.nama, emailTo: t.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: tanggal_ac, lokasiAC: lokasiLengkap,
      isHariH: false, attachCalendar: true, isRevisi: isRevisiAC,
      linkKeperluan: config.link_keperluan_asesmen || null
    });
    await delay(400);
  }

  const aktivitasAC = isRevisiAC ? 'Jadwal AC Direvisi' : 'Jadwal AC Diinput';
  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: aktivitasAC, detail: `${tanggal_ac} ${jam_ac} di ${lokasi_ac}` });
  res.json({ success: true, message: isRevisiAC ? 'Jadwal AC berhasil diperbarui dan notifikasi revisi dikirim' : 'Jadwal AC berhasil disimpan dan notifikasi dikirim' });
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

fase6Router.post('/kirim-laporan', authMiddleware, picOnly, upload.single('pdf'), async (req, res) => {
  const { id_request } = req.body;
  if (!id_request) return res.status(400).json({ error: 'ID Request wajib diisi' });
  if (!req.file) return res.status(400).json({ error: 'File PDF wajib diupload' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const fileBuffer = req.file.buffer;
  const filePath = `${id_request}/laporan_${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('laporan-pdf')
    .upload(filePath, fileBuffer, { contentType: 'application/pdf', upsert: true });
  if (uploadError) return res.status(500).json({ error: 'Gagal upload PDF ke storage: ' + uploadError.message });

  const { data: urlData } = supabase.storage.from('laporan-pdf').getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  const pdfBuffer = fileBuffer;
  const namaPDF = `Laporan_AC_${request.nama_peserta.replace(/\s/g, '_')}_${id_request}.pdf`;
  const path_laporan = publicUrl;

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
