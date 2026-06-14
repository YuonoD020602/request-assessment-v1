const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const { kirimEmailPembukaan } = require('../services/emailService');

const router = express.Router();

// GET /api/config - Ambil semua konfigurasi
router.get('/', authMiddleware, picOnly, async (req, res) => {
  const { data, error } = await supabase.from('konfigurasi').select('*').order('key');
  if (error) return res.status(500).json({ error: 'Gagal ambil config' });
  const config = Object.fromEntries(data.map(c => [c.key, c.value]));
  res.json({ data: config });
});

// PUT /api/config - Update konfigurasi
router.put('/', authMiddleware, picOnly, async (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    await supabase.from('konfigurasi').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }
  res.json({ success: true, message: 'Konfigurasi berhasil diupdate' });
});

module.exports = router;
