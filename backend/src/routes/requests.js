const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const { kirimEmailApprover } = require('../services/emailService');
const { generatePDFPengajuan } = require('../services/pdfService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const generateIdRequests = async (jumlah) => {
  const now = new Date();
  const prefix = `REQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data } = await supabase.from('requests').select('id_request').like('id_request', `${prefix}-%`).order('id_request', { ascending: false }).limit(1);
  let lastNum = data?.[0]?.id_request ? parseInt(data[0].id_request.split('-')[2]) : 0;
  const ids = [];
  for (let i = 0; i < jumlah; i++) {
    lastNum++;
    ids.push(`${prefix}-${String(lastNum).padStart(3, '0')}`);
  }
  return ids;
};

// POST /api/requests/submit
router.post('/submit', upload.any(), async (req, res) => {
  const { nama_perusahaan, pic_hc, email_pic_hc, user_atasan, email_user } = req.body;
  let peserta;
  try {
    peserta = typeof req.body.peserta === 'string' ? JSON.parse(req.body.peserta) : req.body.peserta;
  } catch {
    return res.status(400).json({ error: 'Data peserta tidak valid' });
  }

  if (!nama_perusahaan || !pic_hc || !email_pic_hc) {
    return res.status(400).json({ error: 'Field wajib HC belum lengkap' });
  }

  if (!peserta || !Array.isArray(peserta) || peserta.length === 0) {
    return res.status(400).json({ error: 'Minimal 1 peserta harus diisi' });
  }

  for (let i = 0; i < peserta.length; i++) {
    const p = peserta[i];
    if (!p.nama_peserta || !p.jenis_assessment) {
      return res.status(400).json({ error: 'Nama peserta dan jenis assessment wajib diisi untuk semua peserta' });
    }
    const file = req.files?.find(f => f.fieldname === `dokumen_pdf_${i}`);
    if (!file) {
      return res.status(400).json({ error: `Dokumen PDF untuk peserta ${p.nama_peserta} wajib diupload` });
    }
  }

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  // Cek rentang tanggal pendaftaran
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (config.tanggal_buka && config.tanggal_tutup) {
    const tglBuka = new Date(config.tanggal_buka);
    const tglTutup = new Date(config.tanggal_tutup);
    tglTutup.setHours(23, 59, 59, 999);
    if (today < tglBuka || today > tglTutup) {
      return res.status(400).json({ error: 'Pendaftaran sudah ditutup. Silakan hubungi PIC Asesmen.' });
    }
  }

  const approvers = [
    { nama: config.approver_1_nama, email: config.approver_1_email },
    { nama: config.approver_2_nama, email: config.approver_2_email }
  ].filter(a => a.email);

  const dataHC = { nama_perusahaan, pic_hc, email_pic_hc, user_atasan, email_user };

  const resultIds = [];
  const statusList = [];
  const generatedIds = await generateIdRequests(peserta.length);

  for (let idx = 0; idx < peserta.length; idx++) {
    const p = peserta[idx];
    const idRequest = generatedIds[idx];

    // Upload dokumen PDF peserta ke Supabase Storage
    const dokumenFile = req.files?.find(f => f.fieldname === `dokumen_pdf_${idx}`);
    const namaClean = p.nama_peserta.replace(/\s+/g, '_');
    const filePath = `${idRequest}/Form_Pengajuan_${namaClean}_${idRequest}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('dokumen-peserta')
      .upload(filePath, dokumenFile.buffer, { contentType: 'application/pdf', upsert: true });
    if (uploadError) {
      return res.status(500).json({ error: `Gagal upload dokumen untuk ${p.nama_peserta}: ${uploadError.message}` });
    }
    const { data: urlData } = supabase.storage.from('dokumen-peserta').getPublicUrl(filePath);
    const dokumenPesertaUrl = urlData.publicUrl;

    const { error } = await supabase.from('requests').insert({
      ...dataHC,
      nama_peserta: p.nama_peserta, email_peserta: p.email_peserta,
      posisi_current: p.posisi_current, dept: p.dept, div: p.div,
      gol_current: p.gol_current, posisi_target: p.posisi_target,
      gol_target: p.gol_target, jumlah_bawahan: p.jumlah_bawahan,
      jumlah_peers: p.jumlah_peers, masa_kerja: p.masa_kerja,
      tujuan_ac: p.tujuan_ac, jenis_assessment: p.jenis_assessment,
      terakhir_assessment: p.terakhir_assessment,
      id_request: idRequest, status: 'Pending - Menunggu Review',
      dokumen_peserta_url: dokumenPesertaUrl
    });

    if (error) {
      return res.status(500).json({ error: `Gagal menyimpan pengajuan untuk ${p.nama_peserta}` });
    }

    // Generate PDF ringkasan data peserta
    const pdfBuffer = await generatePDFPengajuan(dataHC, p, idRequest);
    const namaPDF = `Pengajuan_AC_${namaClean}_${idRequest}.pdf`;
    const namaDokumenPeserta = `Form_Pengajuan_${namaClean}_${idRequest}.pdf`;

    const dataPeserta = {
      nama_perusahaan, pic_hc,
      nama_peserta: p.nama_peserta,
      posisi_current: p.posisi_current,
      posisi_target: p.posisi_target,
      jenis_assessment: p.jenis_assessment,
      tujuan_ac: p.tujuan_ac
    };

    for (const approver of approvers) {
      const tokenApprove = uuidv4();
      const tokenReject = uuidv4();
      const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('token_approval').insert([
        { id_request: idRequest, token: tokenApprove, action: 'approve', approver_nama: approver.nama, approver_email: approver.email, expired_at: expiredAt },
        { id_request: idRequest, token: tokenReject, action: 'reject', approver_nama: approver.nama, approver_email: approver.email, expired_at: expiredAt }
      ]);
      await kirimEmailApprover({
        namaApprover: approver.nama,
        emailApprover: approver.email,
        idRequest, dataPeserta,
        tokenApprove, tokenReject,
        pdfBuffer, namaPDF,
        dokumenPesertaBuffer: dokumenFile.buffer,
        namaDokumenPeserta
      });
    }

    await supabase.from('log_aktivitas').insert({ id_request: idRequest, aktivitas: 'Pengajuan Masuk', detail: `Request dari ${pic_hc} (${nama_perusahaan}) untuk ${p.nama_peserta}` });
    resultIds.push(idRequest);
    statusList.push('pending');
  }

  res.json({
    success: true,
    idRequests: resultIds,
    status: 'pending',
    message: `${resultIds.length} pengajuan berhasil dikirim dan menunggu review.`
  });
});

// GET /api/requests - Daftar semua request (PIC only)
router.get('/', authMiddleware, picOnly, async (req, res) => {
  const { status, bulan } = req.query;
  let query = supabase.from('requests').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (bulan) query = query.like('id_request', `REQ-${bulan}-%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Gagal mengambil data' });
  res.json({ data });
});

// GET /api/requests/status/by-email/:email - Cek semua request by email HC (publik)
router.get('/status/by-email/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const { data, error } = await supabase
    .from('requests')
    .select('id_request, nama_peserta, jenis_assessment, status, created_at, tanggal_psikotes, jam_psikotes, tanggal_ac, jam_ac, lokasi_ac, status_dokumen')
    .eq('email_pic_hc', email)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Gagal mengambil data' });
  if (!data || data.length === 0) return res.status(404).json({ error: 'Tidak ada request ditemukan untuk email ini' });
  res.json({ data });
});

// GET /api/requests/status/:idRequest - Cek status publik (untuk HC)
router.get('/status/:idRequest', async (req, res) => {
  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries((cfgData || []).map(c => [c.key, c.value]));

  const { data, error } = await supabase
    .from('requests')
    .select(`
      id_request, status, nama_peserta, nama_perusahaan, created_at, catatan_reject,
      tanggal_psikotes, jam_psikotes,
      tanggal_ac, jam_ac, lokasi_ac
    `)
    .eq('id_request', req.params.idRequest)
    .single();

  if (error || !data) return res.status(404).json({ error: 'ID Request tidak ditemukan' });

  res.json({
    data: {
      ...data,
      url_zip_dokumen: config.file_zip_dokumen_url || null,
      url_form_dokumen: `${process.env.FRONTEND_URL}/form-dokumen?id=${data.id_request}`
    }
  });
});

// GET /api/requests/:idRequest/log - Riwayat aktivitas satu request (PIC only)
router.get('/:idRequest/log', authMiddleware, picOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('log_aktivitas')
    .select('id, aktivitas, detail, created_at')
    .eq('id_request', req.params.idRequest)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Gagal ambil log' });
  res.json({ data: data || [] });
});

// GET /api/requests/:idRequest - Detail satu request (PIC only)
router.get('/:idRequest', authMiddleware, picOnly, async (req, res) => {
  const { data, error } = await supabase.from('requests').select('*').eq('id_request', req.params.idRequest).single();
  if (error || !data) return res.status(404).json({ error: 'Request tidak ditemukan' });
  res.json({ data });
});

// DELETE /api/requests/:idRequest - Hapus request (PIC only)
router.delete('/:idRequest', authMiddleware, picOnly, async (req, res) => {
  const { idRequest } = req.params;

  // Cascade delete tabel terkait sebelum hapus request utama
  await supabase.from('token_approval').delete().eq('id_request', idRequest);
  await supabase.from('slot_presentasi').update({ status: 'Tersedia', id_request: null }).eq('id_request', idRequest);
  await supabase.from('log_aktivitas').delete().eq('id_request', idRequest);

  const { error } = await supabase.from('requests').delete().eq('id_request', idRequest);
  if (error) return res.status(500).json({ error: 'Gagal menghapus request' });

  res.json({ success: true, message: 'Request berhasil dihapus' });
});

module.exports = router;
