const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const { kirimReminderAC } = require('../services/emailService');

const router = express.Router();
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// GET /api/slots - Semua slot (publik)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('slot_presentasi')
    .select('*')
    .order('tanggal', { ascending: true })
    .order('jam', { ascending: true });
  if (error) return res.status(500).json({ error: 'Gagal mengambil slot' });
  res.json({ data });
});

// POST /api/slots - Tambah slot baru (PIC only)
router.post('/', authMiddleware, picOnly, async (req, res) => {
  const { tanggal, jam, lokasi } = req.body;
  if (!tanggal || !jam) return res.status(400).json({ error: 'Tanggal dan jam wajib diisi' });

  const { data, error } = await supabase
    .from('slot_presentasi')
    .insert({ tanggal, jam, lokasi: lokasi || '' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Gagal menambah slot' });
  res.json({ success: true, data });
});

// DELETE /api/slots/:id - Hapus slot (PIC only, hanya yang belum terpesan)
router.delete('/:id', authMiddleware, picOnly, async (req, res) => {
  const { id } = req.params;
  const { data: slot } = await supabase.from('slot_presentasi').select('*').eq('id', id).single();
  if (!slot) return res.status(404).json({ error: 'Slot tidak ditemukan' });
  if (slot.status === 'Terpesan') return res.status(400).json({ error: 'Slot sudah terpesan, tidak bisa dihapus' });

  await supabase.from('slot_presentasi').delete().eq('id', id);
  res.json({ success: true });
});

// POST /api/slots/:id/book - HC booking slot (publik, perlu id_request)
router.post('/:id/book', async (req, res) => {
  const { id } = req.params;
  const { id_request } = req.body;
  if (!id_request) return res.status(400).json({ error: 'ID Request wajib diisi' });

  // Cek slot masih tersedia
  const { data: slot } = await supabase.from('slot_presentasi').select('*').eq('id', id).single();
  if (!slot) return res.status(404).json({ error: 'Slot tidak ditemukan' });
  if (slot.status === 'Terpesan') return res.status(400).json({ error: 'Slot ini sudah diambil orang lain. Silakan pilih slot lain.' });

  // Cek request valid
  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'ID Request tidak ditemukan' });

  // Update slot jadi terpesan
  await supabase.from('slot_presentasi').update({ status: 'Terpesan', id_request }).eq('id', id);

  // Update request dengan jadwal presentasi
  await supabase.from('requests').update({
    tanggal_presentasi: slot.tanggal,
    jam_presentasi: slot.jam,
    lokasi_presentasi: slot.lokasi,
    status: 'Menunggu Presentasi'
  }).eq('id_request', id_request);

  // Ambil config untuk kirim email ke admin
  const { data: cfgData } = await supabase.from('konfigurasi').select('key, value');
  const config = Object.fromEntries((cfgData || []).map(c => [c.key, c.value]));

  // Kirim email konfirmasi ke HC dan User/Atasan
  const penerima = [
    { nama: request.pic_hc, email: request.email_pic_hc },
    request.email_user ? { nama: request.user_atasan, email: request.email_user } : null
  ].filter(Boolean);

  for (const p of penerima) {
    await kirimReminderAC({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: slot.tanggal, lokasiAC: `${slot.lokasi} pukul ${slot.jam} WIB`,
      isHariH: false, attachCalendar: true
    });
    await delay(400);
  }

  // Kirim notif ke semua admin AC
  let k = 1;
  while (config[`admin_ac_${k}_email`]) {
    await kirimReminderAC({
      namaTo: config[`admin_ac_${k}_nama`],
      emailTo: config[`admin_ac_${k}_email`],
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggalAC: slot.tanggal, lokasiAC: `${slot.lokasi} pukul ${slot.jam} WIB`,
      isHariH: false, attachCalendar: false
    });
    k++;
    await delay(400);
  }

  await supabase.from('log_aktivitas').insert({
    id_request,
    aktivitas: 'Slot Presentasi Dipilih',
    detail: `HC memilih slot ${slot.tanggal} ${slot.jam} di ${slot.lokasi}`
  });

  res.json({
    success: true,
    message: 'Slot berhasil dipesan! Konfirmasi telah dikirim ke email Anda.',
    slot: { tanggal: slot.tanggal, jam: slot.jam, lokasi: slot.lokasi }
  });
});

module.exports = router;
