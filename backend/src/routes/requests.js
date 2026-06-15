const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const { kirimEmailApprover, kirimEmailApprovedHC } = require('../services/emailService');

const router = express.Router();

// Helper: Generate ID Request format REQ-YYYYMM-XXX
const generateIdRequest = async () => {
  const now = new Date();
  const prefix = `REQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const { data } = await supabase
    .from('requests')
    .select('id_request')
    .like('id_request', `${prefix}-%`)
    .order('id_request', { ascending: false })
    .limit(1);

  const lastNum = data?.[0]?.id_request
    ? parseInt(data[0].id_request.split('-')[2]) + 1
    : 1;

  return `${prefix}-${String(lastNum).padStart(3, '0')}`;
};

// ============================================================
// POST /api/requests/submit - Form pengajuan dari HC (publik)
// ============================================================
router.post('/submit', async (req, res) => {
  const {
    nama_perusahaan, pic_hc, email_pic_hc, user_atasan, email_user,
    nama_peserta, posisi_current, dept, div, gol_current,
    posisi_target, gol_target, jumlah_bawahan, jumlah_peers,
    masa_kerja, tujuan_ac, jenis_assessment, terakhir_assessment, email_peserta
  } = req.body;

  if (!nama_perusahaan || !pic_hc || !email_pic_hc || !nama_peserta || !jenis_assessment) {
    return res.status(400).json({ error: 'Field wajib belum lengkap' });
  }

  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));
  const kuotaMaks = parseInt(config.kuota_maks || '8');

  const bulanIni = new Date();
  const prefixBulan = `REQ-${bulanIni.getFullYear()}${String(bulanIni.getMonth() + 1).padStart(2, '0')}`;

  const { count } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .like('id_request', `${prefixBulan}-%`)
    .neq('status', 'Rejected');

  if (count >= kuotaMaks) {
    const idRequest = await generateIdRequest();
    await supabase.from('requests').insert({
      ...req.body,
      id_request: idRequest,
      status: 'Ditunda - Kuota Penuh'
    });

    await supabase.from('log_aktivitas').insert({
      id_request: idRequest,
      aktivitas: 'Pengajuan Ditunda',
      detail: 'Kuota bulan ini sudah penuh'
    });

    return res.json({
      success: true,
      idRequest,
      status: 'kuota_penuh',
      message: 'Pengajuan diterima namun kuota bulan ini sudah penuh.'
    });
  }

  const idRequest = await generateIdRequest();
  const { error } = await supabase.from('requests').insert({
    nama_perusahaan, pic_hc, email_pic_hc, user_atasan, email_user,
    nama_peserta, posisi_current, dept, div, gol_current,
    posisi_target, gol_target, jumlah_bawahan, jumlah_peers,
    masa_kerja, tujuan_ac, jenis_assessment, terakhir_assessment, email_peserta,
    id_request: idRequest,
    status: 'Pending - Menunggu Review'
  });

  if (error) return res.status(500).json({ error: 'Gagal menyimpan pengajuan' });

  const approvers = [
    { nama: config.approver_1_nama, email: config.approver_1_email },
    { nama: config.approver_2_nama, email: config.approver_2_email }
  ].filter(a => a.email);

  const dataPeserta = {
    nama_perusahaan, pic_hc, nama_peserta, posisi_current,
    posisi_target, jenis_assessment, tujuan_ac
  };

  for (const approver of approvers) {
    const tokenApprove = uuidv4();
    const tokenReject = uuidv4();

    await supabase.from('token_approval').insert([
      { id_request: idRequest, token: tokenApprove, action: 'approve', approver_nama: approver.nama, approver_email: approver.email },
      { id_request: idRequest, token: tokenReject, action: 'reject', approver_nama: approver.nama, approver_email: approver.email }
    ]);

    await kirimEmailApprover({
      namaApprover: approver.nama,
      emailApprover: approver.email,
      idRequest,
      dataPeserta,
      tokenApprove,
      tokenReject
    });
  }

  await supabase.from('log_aktivitas').insert({
    id_request: idRequest,
    aktivitas: 'Pengajuan Masuk',
    detail: `Request dari ${pic_hc} (${nama_perusahaan}) untuk ${nama_peserta}`
  });

  res.json({
    success: true,
    idRequest,
    status: 'pending',
    message: 'Pengajuan berhasil dikirim. Tim kami akan menghubungi Anda setelah direview.'
  });
});

// ============================================================
// GET /api/requests - Daftar semua request (PIC only)
// ============================================================
router.get('/', authMiddleware, picOnly, async (req, res) => {
  const { status, bulan } = req.query;

  let query = supabase.from('requests').select('*').order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (bulan) query = query.like('id_request', `REQ-${bulan}-%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Gagal mengambil data' });

  res.json({ data });
});

// ============================================================
// GET /api/requests/:idRequest - Detail satu request (PIC only)
// ============================================================
router.get('/:idRequest', authMiddleware, picOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id_request', req.params.idRequest)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Request tidak ditemukan' });
  res.json({ data });
});

// ============================================================
// GET /api/requests/status/:idRequest - Cek status (publik, untuk HC)
// ============================================================
router.get('/status/:idRequest', async (req, res) => {
  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries((cfgData || []).map(c => [c.key, c.value]));

  const { data, error } = await supabase
    .from('requests')
    .select('id_request, status, nama_peserta, nama_perusahaan, created_at, catatan_reject')
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
