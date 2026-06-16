const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const { kirimEmailApprover } = require('../services/emailService');

const router = express.Router();

const generateIdRequest = async () => {
  const now = new Date();
  const prefix = `REQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data } = await supabase.from('requests').select('id_request').like('id_request', `${prefix}-%`).order('id_request', { ascending: false }).limit(1);
  const lastNum = data?.[0]?.id_request ? parseInt(data[0].id_request.split('-')[2]) + 1 : 1;
  return `${prefix}-${String(lastNum).padStart(3, '0')}`;
};

// POST /api/requests/submit
router.post('/submit', async (req, res) => {
  const { nama_perusahaan, pic_hc, email_pic_hc, user_atasan, email_user, peserta } = req.body;

  if (!nama_perusahaan || !pic_hc || !email_pic_hc) {
    return res.status(400).json({ error: 'Field wajib HC belum lengkap' });
  }

  if (!peserta || !Array.isArray(peserta) || peserta.length === 0) {
    return res.status(400).json({ error: 'Minimal 1 peserta harus diisi' });
  }

  for (const p of peserta) {
    if (!p.nama_peserta || !p.jenis_assessment) {
      return res.status(400).json({ error: `Nama peserta dan jenis assessment wajib diisi untuk semua peserta` });
    }
  }

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));
  const kuotaMaks = parseInt(config.kuota_maks || '8');

  const bulanIni = new Date();
  const prefixBulan = `REQ-${bulanIni.getFullYear()}${String(bulanIni.getMonth() + 1).padStart(2, '0')}`;
  const { count } = await supabase.from('requests').select('*', { count: 'exact', head: true }).like('id_request', `${prefixBulan}-%`).neq('status', 'Rejected');

  const approvers = [
    { nama: config.approver_1_nama, email: config.approver_1_email },
    { nama: config.approver_2_nama, email: config.approver_2_email }
  ].filter(a => a.email);

  const idRequests = [];
  const statusList = [];

  for (const p of peserta) {
    const sisaKuota = kuotaMaks - (count + idRequests.length);
    const idRequest = await generateIdRequest();

    if (sisaKuota <= 0) {
      await supabase.from('requests').insert({
        nama_perusahaan, pic_hc, email_pic_hc, user_atasan, email_user,
        nama_peserta: p.nama_peserta, email_peserta: p.email_peserta,
        posisi_current: p.posisi_current, dept: p.dept, div: p.div,
        gol_current: p.gol_current, posisi_target: p.posisi_target,
        gol_target: p.gol_target, jumlah_bawahan: p.jumlah_bawahan,
        jumlah_peers: p.jumlah_peers, masa_kerja: p.masa_kerja,
        tujuan_ac: p.tujuan_ac, jenis_assessment: p.jenis_assessment,
        terakhir_assessment: p.terakhir_assessment,
        id_request: idRequest, status: 'Ditunda - Kuota Penuh'
      });
      await supabase.from('log_aktivitas').insert({ id_request: idRequest, aktivitas: 'Pengajuan Ditunda', detail: 'Kuota bulan ini sudah penuh' });
      idRequests.push(idRequest);
      statusList.push('kuota_penuh');
      continue;
    }

    const { error } = await supabase.from('requests').insert({
      nama_perusahaan, pic_hc, email_pic_hc, user_atasan, email_user,
      nama_peserta: p.nama_peserta, email_peserta: p.email_peserta,
      posisi_current: p.posisi_current, dept: p.dept, div: p.div,
      gol_current: p.gol_current, posisi_target: p.posisi_target,
      gol_target: p.gol_target, jumlah_bawahan: p.jumlah_bawahan,
      jumlah_peers: p.jumlah_peers, masa_kerja: p.masa_kerja,
      tujuan_ac: p.tujuan_ac, jenis_assessment: p.jenis_assessment,
      terakhir_assessment: p.terakhir_assessment,
      id_request: idRequest, status: 'Pending - Menunggu Review'
    });

    if (error) {
      return res.status(500).json({ error: `Gagal menyimpan pengajuan untuk ${p.nama_peserta}` });
    }

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
      await supabase.from('token_approval').insert([
        { id_request: idRequest, token: tokenApprove, action: 'approve', approver_nama: approver.nama, approver_email: approver.email },
        { id_request: idRequest, token: tokenReject, action: 'reject', approver_nama: approver.nama, approver_email: approver.email }
      ]);
      await kirimEmailApprover({ namaApprover: approver.nama, emailApprover: approver.email, idRequest, dataPeserta, tokenApprove, tokenReject });
    }

    await supabase.from('log_aktivitas').insert({ id_request: idRequest, aktivitas: 'Pengajuan Masuk', detail: `Request dari ${pic_hc} (${nama_perusahaan}) untuk ${p.nama_peserta}` });
    idRequests.push(idRequest);
    statusList.push('pending');
  }

  const adaKuotaPenuh = statusList.includes('kuota_penuh');
  const semuaPending = statusList.every(s => s === 'pending');

  res.json({
    success: true,
    idRequests,
    status: semuaPending ? 'pending' : adaKuotaPenuh ? 'sebagian_kuota_penuh' : 'kuota_penuh',
    message: semuaPending
      ? `${idRequests.length} pengajuan berhasil dikirim dan menunggu review.`
      : `${statusList.filter(s => s === 'pending').length} pengajuan berhasil, ${statusList.filter(s => s === 'kuota_penuh').length} ditunda karena kuota penuh.`
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

// GET /api/requests/:idRequest - Detail satu request (PIC only)
router.get('/:idRequest', authMiddleware, picOnly, async (req, res) => {
  const { data, error } = await supabase.from('requests').select('*').eq('id_request', req.params.idRequest).single();
  if (error || !data) return res.status(404).json({ error: 'Request tidak ditemukan' });
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
      tanggal_psikotes, jam_psikotes, link_platform_psikotes,
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

module.exports = router;
