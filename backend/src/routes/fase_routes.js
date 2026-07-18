const express = require('express');
const multer = require('multer');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const {
  kirimEmailUndanganGR, kirimEmailMOM,
  kirimNotifikasiDokumenDiterima, kirimJadwalPsikotes,
  kirimUndanganPresentasi, kirimNotifikasiPilihSlot, kirimLaporan,
  kirimReminderAC, kirimReminderACAssessor, kirimReminderACRoleplayer,
  kirimReminderACPeserta, kirimReminderDokumen
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

// Helper: ambil assessor dari config
const getAssessors = (config) => {
  const result = [];
  let i = 1;
  while (config[`assessor_${i}_email`]) {
    result.push({ nama: config[`assessor_${i}_nama`], email: config[`assessor_${i}_email`] });
    i++;
  }
  return result;
};

// Helper: ambil roleplayer dari config
const getRoleplayers = (config) => {
  const result = [];
  let i = 1;
  while (config[`roleplayer_${i}_email`]) {
    result.push({ nama: config[`roleplayer_${i}_nama`], email: config[`roleplayer_${i}_email`] });
    i++;
  }
  return result;
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

// Urutan status — digunakan untuk mencegah status mundur
const STATUS_ORDER = [
  'Submitted', 'Approved', 'Menunggu GR',
  'GR Selesai - Menunggu Dokumen', 'Dokumen Diterima',
  'Psikotes Dijadwalkan', 'AC Dijadwalkan',
  'Menunggu Presentasi', 'Selesai'
];
const statusLebihMaju = (current, target) => {
  const ci = STATUS_ORDER.indexOf(current);
  const ti = STATUS_ORDER.indexOf(target);
  return ci > ti; // current sudah lebih maju dari target
};

// ============================================================
// FASE 3 ROUTER
// ============================================================
const fase3Router = express.Router();

fase3Router.post('/jadwal-gr', authMiddleware, picOnly, async (req, res) => {
  const { id_request, tanggal_gr, jam_gr, lokasi_gr } = req.body;
  if (!id_request || !tanggal_gr || !jam_gr || !lokasi_gr) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request, error } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (error || !request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  await supabase.from('requests').update({
    tanggal_gr, jam_gr, lokasi_gr,
    ...(statusLebihMaju(request.status, 'Menunggu GR') ? {} : { status: 'Menunggu GR' })
  }).eq('id_request', id_request);

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries((cfgData || []).map(c => [c.key, c.value]));

  const penerima = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null
  ].filter(Boolean);

  for (const p of penerima) {
    await kirimEmailUndanganGR({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, tanggalGR: tanggal_gr,
      jamGR: jam_gr, lokasiGR: lokasi_gr,
      namaPeserta: request.nama_peserta,
      periodeAC: config.periode_ac || ''
    });
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Jadwal GR Dikirim', detail: `${tanggal_gr} ${jam_gr} di ${lokasi_gr}` });
  res.json({ success: true, message: 'Jadwal GR berhasil dikirim' });
});

fase3Router.post('/input-mom', authMiddleware, picOnly, async (req, res) => {
  const { id_request, mom_gr, kompetensi_alc, tanggal_psikotes, jam_psikotes, tanggal_ac, lokasi_ac } = req.body;
  if (!id_request || !mom_gr) return res.status(400).json({ error: 'Field wajib belum lengkap' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  await supabase.from('requests').update({
    mom_gr,
    kompetensi_alc: kompetensi_alc || null,
    tanggal_psikotes: tanggal_psikotes || null,
    jam_psikotes: jam_psikotes || null,
    tanggal_ac: tanggal_ac || null,
    lokasi_ac: lokasi_ac || null,
    ...(statusLebihMaju(request.status, 'GR Selesai - Menunggu Dokumen') ? {} : { status: 'GR Selesai - Menunggu Dokumen' })
  }).eq('id_request', id_request);

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  await kirimEmailMOM({
    namaTo: request.pic_hc, emailTo: request.email_pic_hc,
    idRequest: id_request, namaPeserta: request.nama_peserta,
    momText: mom_gr, namaPerusahaan: request.nama_perusahaan,
    kompetensiALC: kompetensi_alc || request.kompetensi_alc || null,
    tanggalOnlineTest: tanggal_psikotes || request.tanggal_psikotes || null,
    jamOnlineTest: jam_psikotes || request.jam_psikotes || null,
    tanggalAC: tanggal_ac || request.tanggal_ac || config.tanggal_pelaksanaan_ac || null,
    lokasiAC: lokasi_ac || request.lokasi_ac || null,
    linkFormStar: config.link_form_star || null,
    linkFormDataKaryawan: config.link_form_data_karyawan || null,
    isTimPelaksana: false
  });
  await delay(400);

  const assessors = getAssessors(config);
  const roleplayers = getRoleplayers(config);
  const admins = getAdmins(config);

  for (const t of [...assessors, ...roleplayers]) {
    await kirimEmailMOM({
      namaTo: t.nama, emailTo: t.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      momText: mom_gr, isTimPelaksana: true, roleTimPelaksana: 'assessor',
      linkKeperluan: config.link_keperluan_asesmen || null
    });
    await delay(400);
  }

  for (const t of admins) {
    await kirimEmailMOM({
      namaTo: t.nama, emailTo: t.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      momText: mom_gr, isTimPelaksana: true, roleTimPelaksana: 'admin'
    });
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'MOM GR Dikirim', detail: 'MOM dikirim ke HC dan Tim Pelaksana' });
  res.json({ success: true, message: 'MOM berhasil dikirim' });
});

fase3Router.post('/kirim-reminder-dokumen', authMiddleware, picOnly, async (req, res) => {
  const { id_request } = req.body;
  if (!id_request) return res.status(400).json({ error: 'ID Request wajib diisi' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  await kirimReminderDokumen({
    namaHC: request.pic_hc,
    emailHC: request.email_pic_hc,
    idRequest: id_request,
    namaPeserta: request.nama_peserta,
    namaPerusahaan: request.nama_perusahaan,
    tanggalAC: request.tanggal_ac || null,
    urlFormDokumen: `${process.env.FRONTEND_URL}/form-dokumen?id=${id_request}`,
    linkFormDataKaryawan: config.link_form_data_karyawan || null,
    linkFormStar: config.link_form_star || null,
  });

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Reminder Dokumen Dikirim', detail: `Reminder dikirim ke ${request.email_pic_hc}` });
  res.json({ success: true, message: 'Reminder dokumen berhasil dikirim ke HC' });
});

// ============================================================
// FASE 4 ROUTER
// ============================================================
const fase4Router = express.Router();

fase4Router.post('/dokumen', async (req, res) => {
  const { id_request, link_data_karyawan, link_form_star } = req.body;
  if (!id_request || !link_data_karyawan || !link_form_star) {
    return res.status(400).json({ error: 'Semua link dokumen wajib diisi' });
  }

  const { data: request, error } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (error || !request) return res.status(404).json({ error: 'ID Request tidak ditemukan' });

  await supabase.from('requests').update({
    link_data_karyawan, link_form_star,
    status_dokumen: 'Dokumen Diterima',
    ...(statusLebihMaju(request.status, 'Dokumen Diterima') ? {} : { status: 'Dokumen Diterima' })
  }).eq('id_request', id_request);

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  const dokumen = [
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
  const statusUpdatePsikotes = statusLebihMaju(request.status, 'Psikotes Dijadwalkan') ? {} : { status: 'Psikotes Dijadwalkan' };
  const { error: updateErr } = await supabase.from('requests').update({ tanggal_psikotes, jam_psikotes, ...statusUpdatePsikotes }).eq('id_request', id_request);
  if (updateErr) {
    await supabase.from('requests').update({ tanggal_psikotes, jam_psikotes }).eq('id_request', id_request);
    if (!statusLebihMaju(request.status, 'Psikotes Dijadwalkan')) {
      await supabase.from('requests').update({ status: 'Psikotes Dijadwalkan' }).eq('id_request', id_request);
    }
  }

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
  const { id_request, ruangan_ac, penugasan_tim } = req.body;
  if (!id_request) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  await supabase.from('requests').update({
    ruangan_ac: ruangan_ac || null,
    penugasan_tim: penugasan_tim || null,
    ...(statusLebihMaju(request.status, 'AC Dijadwalkan') ? {} : { status: 'AC Dijadwalkan' })
  }).eq('id_request', id_request);

  const tanggal_ac = request.tanggal_ac;
  const lokasi_ac = request.lokasi_ac;
  const jam_ac = '08.00 – 15.00';
  const isRevisiAC = !!(request.ruangan_ac);
  const lokasiLengkap = ruangan_ac
    ? `${ruangan_ac}, ${lokasi_ac || ''}`
    : lokasi_ac || '';

  // Kirim ke HC dan User/Atasan
  const penerimaHC = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null
  ].filter(Boolean);
  for (const p of penerimaHC) {
    await kirimReminderAC({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: tanggal_ac, lokasiAC: lokasiLengkap,
      isHariH: false, attachCalendar: true, isRevisi: isRevisiAC
    });
    await delay(400);
  }

  // Kirim ke Assessor (template assessor)
  const assessors = getAssessors(config);
  for (const a of assessors) {
    await kirimReminderACAssessor({
      namaTo: a.nama, emailTo: a.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: tanggal_ac, ruanganAC: ruangan_ac || null, lokasiAC: lokasi_ac
    });
    await delay(400);
  }

  // Kirim ke Roleplayer (template roleplayer dengan tabel penugasan)
  const roleplayers = getRoleplayers(config);
  for (const r of roleplayers) {
    await kirimReminderACRoleplayer({
      namaTo: r.nama, emailTo: r.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: tanggal_ac, jamAC: jam_ac,
      penugasanTim: penugasan_tim || []
    });
    await delay(400);
  }

  // Kirim ke Admin AC
  const admins = getAdmins(config);
  for (const a of admins) {
    await kirimReminderAC({
      namaTo: a.nama, emailTo: a.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: tanggal_ac, lokasiAC: lokasiLengkap,
      isHariH: false, attachCalendar: true, isRevisi: isRevisiAC,
      linkKeperluan: config.link_keperluan_asesmen || null
    });
    await delay(400);
  }

  const aktivitasAC = isRevisiAC ? 'Penugasan Tim Direvisi' : 'Penugasan Tim Diinput';
  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: aktivitasAC, detail: `Ruangan: ${ruangan_ac || '-'}, Penugasan tim diperbarui` });
  res.json({ success: true, message: 'Penugasan tim berhasil disimpan' });
});

fase4Router.post('/kirim-reminder-manual', authMiddleware, picOnly, async (req, res) => {
  const { id_request } = req.body;
  if (!id_request) return res.status(400).json({ error: 'ID Request wajib diisi' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries((cfgData || []).map(c => [c.key, c.value]));

  await kirimReminderACPeserta({
    namaHC: request.pic_hc,
    emailHC: request.email_pic_hc,
    idRequest: id_request,
    namaPeserta: request.nama_peserta,
    tanggalAC: request.tanggal_ac,
    ruanganAC: request.ruangan_ac || null,
    lokasiAC: request.lokasi_ac || null
  });

  const assessors = getAssessors(config);
  const roleplayers = getRoleplayers(config);

  for (const a of assessors) {
    if (a.email) {
      await kirimReminderACAssessor({
        namaTo: a.nama, emailTo: a.email,
        idRequest: id_request, namaPeserta: request.nama_peserta,
        tanggalAC: request.tanggal_ac, jamAC: request.jam_ac,
        penugasanTim: request.penugasan_tim || []
      });
      await delay(300);
    }
  }

  for (const r of roleplayers) {
    if (r.email) {
      await kirimReminderACRoleplayer({
        namaTo: r.nama, emailTo: r.email,
        idRequest: id_request, namaPeserta: request.nama_peserta,
        tanggalAC: request.tanggal_ac, jamAC: request.jam_ac,
        penugasanTim: request.penugasan_tim || []
      });
      await delay(300);
    }
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Reminder Manual Terkirim', detail: `Reminder AC dikirim manual ke HC, Assessor, dan Roleplayer` });
  res.json({ success: true });
});

// ============================================================
// FASE 5 ROUTER
// ============================================================
const fase5Router = express.Router();

fase5Router.post('/kirim-reminder-booking', authMiddleware, picOnly, async (req, res) => {
  const { id_request } = req.body;
  if (!id_request) return res.status(400).json({ error: 'ID Request wajib diisi' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries((cfgData || []).map(c => [c.key, c.value]));

  const linkPilihSlot = `${process.env.FRONTEND_URL}/pilih-slot?id=${id_request}`;
  const linkCekStatus = `${process.env.FRONTEND_URL}/cek-status?id=${id_request}`;

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: `${process.env.FROM_NAME || 'Yuono Dwi Raharjo - RACD AIHO'} <noreply@lyraac.site>`,
    reply_to: process.env.REPLY_TO_EMAIL || 'yuono.raharjo@ai.astra.co.id',
    to: request.email_pic_hc,
    subject: `[RACD AIHO] Reminder: Booking Jadwal Presentasi – ${id_request}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${request.pic_hc}</p>
        <p>Sehubungan dengan telah selesainya Assessment Center untuk <strong>${request.nama_peserta}</strong> (${id_request}), kami mengingatkan Anda untuk segera <strong>melakukan booking jadwal Presentasi Hasil AC</strong>.</p>
        <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">Klik tombol berikut untuk booking jadwal:</p>
          <a href="${linkPilihSlot}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Booking Jadwal Presentasi &rarr;</a>
        </div>
        <p style="margin-top: 16px; font-size: 13px; color: #555;">Pantau status request Anda:<br/>
        <a href="${linkCekStatus}" style="color: #2563eb;">${linkCekStatus}</a></p>
        <p>Terima kasih</p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `
  });

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Reminder Booking Jadwal Terkirim', detail: `Email reminder booking presentasi dikirim ke ${request.email_pic_hc}` });
  res.json({ success: true });
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
    ...(statusLebihMaju(request.status, 'Menunggu Presentasi') ? {} : { status: 'Menunggu Presentasi' })
  }).eq('id_request', id_request);

  const { data: cfgDataP } = await supabase.from('konfigurasi').select('key, value');
  const configP = Object.fromEntries((cfgDataP || []).map(c => [c.key, c.value]));

  const penerimaP = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null,
    ...getAssessors(configP)
  ].filter(Boolean);

  for (const p of penerimaP) {
    await kirimUndanganPresentasi({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      namaPerusahaan: request.nama_perusahaan,
      tanggal: tanggal_presentasi, jam: jam_presentasi, lokasi: lokasi_presentasi
    });
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Jadwal Presentasi Dikirim', detail: `${tanggal_presentasi} ${jam_presentasi} di ${lokasi_presentasi}` });
  res.json({ success: true, message: 'Undangan presentasi berhasil dikirim' });
});

fase6Router.post('/notif-pilih-slot', authMiddleware, picOnly, async (req, res) => {
  const { id_request } = req.body;
  if (!id_request) return res.status(400).json({ error: 'ID Request wajib diisi' });

  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

  const linkPilihSlot = `${process.env.FRONTEND_URL}/pilih-slot?id=${id_request}`;
  await kirimNotifikasiPilihSlot({
    namaHC: request.pic_hc,
    emailHC: request.email_pic_hc,
    idRequest: id_request,
    namaPeserta: request.nama_peserta,
    linkPilihSlot
  });

  await supabase.from('log_aktivitas').insert({ id_request, aktivitas: 'Notifikasi Pilih Slot Dikirim', detail: `Email notifikasi pilih slot presentasi dikirim ke ${request.email_pic_hc}` });
  res.json({ success: true, message: 'Notifikasi berhasil dikirim ke HC' });
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
  const { data: files } = await supabase.storage.from('laporan-pdf').list(idRequest);
  const found = (files || []).filter(f => f.name && !f.name.includes('.emptyFolderPlaceholder'));
  res.json({ found: found.length > 0, files: found });
});

module.exports = { fase3Router, fase4Router, fase5Router, fase6Router };
