const express = require('express');
const supabase = require('../supabase');
const {
  kirimEmailApprovedHC,
  kirimEmailRejectedHC
} = require('../services/emailService');

const router = express.Router();

// ============================================================
// GET /api/approval/cek?token=xxx - Validasi token (publik)
// ============================================================
router.get('/cek', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token tidak ditemukan' });

  const { data: tokenData, error } = await supabase
    .from('token_approval')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !tokenData) return res.status(404).json({ error: 'Token tidak valid' });
  if (tokenData.sudah_digunakan) return res.status(400).json({ error: 'Token sudah digunakan', sudahDigunakan: true });
  if (new Date(tokenData.expired_at) < new Date()) return res.status(400).json({ error: 'Token sudah expired' });

  const { data: request } = await supabase
    .from('requests')
    .select('*')
    .eq('id_request', tokenData.id_request)
    .single();

  res.json({
    valid: true,
    action: tokenData.action,
    idRequest: tokenData.id_request,
    approverNama: tokenData.approver_nama,
    request
  });
});

// ============================================================
// POST /api/approval/approve - Proses approve (publik via token)
// ============================================================
router.post('/approve', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token tidak ditemukan' });

  const { data: tokenData, error } = await supabase
    .from('token_approval')
    .select('*')
    .eq('token', token)
    .eq('action', 'approve')
    .single();

  if (error || !tokenData) return res.status(404).json({ error: 'Token tidak valid' });
  if (tokenData.sudah_digunakan) return res.status(400).json({ error: 'Token sudah digunakan' });

  // Tandai token sudah digunakan
  await supabase.from('token_approval').update({ sudah_digunakan: true }).eq('token', token);

  // Update status request
  await supabase.from('requests')
    .update({
      status: 'Approved',
      approved_by: tokenData.approver_nama,
      tanggal_approve: new Date().toISOString()
    })
    .eq('id_request', tokenData.id_request);

  // Ambil data request dan config
  const { data: request } = await supabase.from('requests').select('*').eq('id_request', tokenData.id_request).single();
  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  // Kirim email ke HC
  await kirimEmailApprovedHC({
    namaHC: request.pic_hc,
    emailHC: request.email_pic_hc,
    idRequest: request.id_request,
    urlZip: config.file_zip_dokumen_url,
    urlFormDokumen: `${process.env.FRONTEND_URL}/form-dokumen?id=${request.id_request}`
  });

  // Log
  await supabase.from('log_aktivitas').insert({
    id_request: tokenData.id_request,
    aktivitas: 'Request Approved',
    detail: `Disetujui oleh ${tokenData.approver_nama}`
  });

  res.json({ success: true, message: 'Request berhasil diapprove' });
});

// ============================================================
// POST /api/approval/reject - Proses reject dengan catatan (publik via token)
// ============================================================
router.post('/reject', async (req, res) => {
  const { token, catatan } = req.body;
  if (!token) return res.status(400).json({ error: 'Token tidak ditemukan' });
  if (!catatan) return res.status(400).json({ error: 'Catatan penolakan wajib diisi' });

  const { data: tokenData, error } = await supabase
    .from('token_approval')
    .select('*')
    .eq('token', token)
    .eq('action', 'reject')
    .single();

  if (error || !tokenData) return res.status(404).json({ error: 'Token tidak valid' });
  if (tokenData.sudah_digunakan) return res.status(400).json({ error: 'Token sudah digunakan' });

  // Tandai token sudah digunakan
  await supabase.from('token_approval').update({ sudah_digunakan: true }).eq('token', token);

  // Update status
  await supabase.from('requests')
    .update({ status: 'Rejected', catatan_reject: catatan })
    .eq('id_request', tokenData.id_request);

  // Kirim email ke HC
  const { data: request } = await supabase.from('requests').select('*').eq('id_request', tokenData.id_request).single();

  await kirimEmailRejectedHC({
    namaHC: request.pic_hc,
    emailHC: request.email_pic_hc,
    idRequest: request.id_request,
    catatanReject: catatan
  });

  await supabase.from('log_aktivitas').insert({
    id_request: tokenData.id_request,
    aktivitas: 'Request Rejected',
    detail: `Ditolak oleh ${tokenData.approver_nama}. Catatan: ${catatan}`
  });

  res.json({ success: true, message: 'Request berhasil direject' });
});

module.exports = router;
