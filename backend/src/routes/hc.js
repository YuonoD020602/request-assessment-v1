const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const { kirimEmailPembukaan } = require('../services/emailService');

const router = express.Router();

// GET /api/hc - Daftar semua HC
router.get('/', authMiddleware, picOnly, async (req, res) => {
  const { data, error } = await supabase.from('daftar_hc').select('*').order('nama_perusahaan');
  if (error) return res.status(500).json({ error: 'Gagal ambil data HC' });
  res.json({ data });
});

// POST /api/hc/kirim-pembukaan - HARUS di atas /:id agar tidak konflik!
router.post('/kirim-pembukaan', authMiddleware, picOnly, async (req, res) => {
  const { data: hcList, error: hcError } = await supabase
    .from('daftar_hc')
    .select('*')
    .order('nama_perusahaan');

  if (hcError) {
    console.error('Gagal ambil daftar HC:', hcError.message);
    return res.status(500).json({ error: 'Gagal mengambil daftar HC' });
  }

  if (!hcList || hcList.length === 0) {
    return res.status(400).json({ error: 'Belum ada HC yang terdaftar. Tambahkan HC terlebih dahulu.' });
  }

  const { data: cfgData, error: cfgError } = await supabase.from('konfigurasi').select('key, value');
  if (cfgError || !cfgData) {
    return res.status(500).json({ error: 'Gagal membaca konfigurasi' });
  }
  const config = Object.fromEntries(cfgData.map(c => [c.key, c.value]));

  if (!config.tanggal_ac || !config.tenggat_pendaftaran) {
    return res.status(400).json({ error: 'Tanggal AC dan Tenggat Pendaftaran belum diisi di konfigurasi' });
  }

  let berhasil = 0;
  const gagalList = [];

  for (const hc of hcList) {
    try {
      if (!hc.email_hc) {
        gagalList.push({ nama: hc.nama_hc, alasan: 'Email kosong' });
        continue;
      }
      await kirimEmailPembukaan({
        namaHC: hc.nama_hc,
        emailHC: hc.email_hc,
        tanggalAC: config.tanggal_ac,
        tenggat: config.tenggat_pendaftaran,
        kuota: config.kuota_maks || '8'
      });
      berhasil++;
    } catch (e) {
      console.error(`Gagal kirim ke ${hc.email_hc}:`, e.message);
      gagalList.push({ nama: hc.nama_hc, email: hc.email_hc, alasan: e.message });
    }
  }

  const gagal = gagalList.length;
  const detailGagal = gagalList.length > 0
    ? ` | Gagal: ${gagalList.map(g => `${g.nama} (${g.alasan})`).join(', ')}`
    : '';

  await supabase.from('log_aktivitas').insert({
    aktivitas: 'Email Pembukaan Terkirim',
    detail: `Berhasil: ${berhasil}, Gagal: ${gagal} dari total ${hcList.length} HC${detailGagal}`
  });

  res.json({ success: true, berhasil, gagal, total: hcList.length, gagalList });
});

// POST /api/hc - Tambah HC baru
router.post('/', authMiddleware, picOnly, async (req, res) => {
  const { nama_perusahaan, nama_hc, email_hc } = req.body;
  if (!nama_perusahaan || !nama_hc || !email_hc) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }
  const { error } = await supabase.from('daftar_hc').insert({ nama_perusahaan, nama_hc, email_hc });
  if (error) return res.status(500).json({ error: 'Gagal tambah HC' });
  res.json({ success: true });
});

// PUT /api/hc/:id - Update HC
router.put('/:id', authMiddleware, picOnly, async (req, res) => {
  const { error } = await supabase.from('daftar_hc').update(req.body).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Gagal update HC' });
  res.json({ success: true });
});

// DELETE /api/hc/:id - Hapus HC
router.delete('/:id', authMiddleware, picOnly, async (req, res) => {
  const { error } = await supabase.from('daftar_hc').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Gagal hapus HC' });
  res.json({ success: true });
});

module.exports = router;
