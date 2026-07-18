const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, picOnly } = require('../middleware/auth');
const { kirimUndanganPresentasi } = require('../services/emailService');

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

// DELETE /api/slots/:id - Hapus slot (PIC only), cascade clear request jika terpesan
router.delete('/:id', authMiddleware, picOnly, async (req, res) => {
  const { id } = req.params;
  const { data: slot } = await supabase.from('slot_presentasi').select('*').eq('id', id).single();
  if (!slot) return res.status(404).json({ error: 'Slot tidak ditemukan' });

  // Jika terpesan, bersihkan data presentasi dari request terkait.
  // Request yang sudah Selesai tidak disentuh — jadwal presentasinya jadi arsip.
  if (slot.status === 'Terpesan' && slot.id_request) {
    const { data: reqData } = await supabase.from('requests').select('status').eq('id_request', slot.id_request).single();
    if (reqData && reqData.status !== 'Selesai') {
      await supabase.from('requests').update({
        tanggal_presentasi: null,
        jam_presentasi: null,
        lokasi_presentasi: null,
        status: 'AC Dijadwalkan'
      }).eq('id_request', slot.id_request);
    }
  }

  await supabase.from('slot_presentasi').delete().eq('id', id);
  res.json({ success: true });
});

// PUT /api/slots/:id/release - Bebaskan slot Terpesan → Tersedia (PIC only)
router.put('/:id/release', authMiddleware, picOnly, async (req, res) => {
  const { id } = req.params;
  const { data: slot } = await supabase.from('slot_presentasi').select('*').eq('id', id).single();
  if (!slot) return res.status(404).json({ error: 'Slot tidak ditemukan' });
  if (slot.status !== 'Terpesan') return res.status(400).json({ error: 'Slot bukan Terpesan' });

  // Bersihkan data presentasi dari request terkait.
  // Request yang sudah Selesai tidak disentuh — jadwal presentasinya jadi arsip.
  if (slot.id_request) {
    const { data: reqData } = await supabase.from('requests').select('status').eq('id_request', slot.id_request).single();
    if (reqData && reqData.status !== 'Selesai') {
      await supabase.from('requests').update({
        tanggal_presentasi: null,
        jam_presentasi: null,
        lokasi_presentasi: null,
        status: 'AC Dijadwalkan'
      }).eq('id_request', slot.id_request);
    }
  }

  await supabase.from('slot_presentasi').update({ status: 'Tersedia', id_request: null }).eq('id', id);
  res.json({ success: true });
});

// POST /api/slots/:id/book - HC booking slot (publik, perlu id_request)
router.post('/:id/book', async (req, res) => {
  const { id } = req.params;
  const { id_request } = req.body;
  if (!id_request) return res.status(400).json({ error: 'ID Request wajib diisi' });

  // Cek request valid dulu
  const { data: request } = await supabase.from('requests').select('*').eq('id_request', id_request).single();
  if (!request) return res.status(404).json({ error: 'ID Request tidak ditemukan' });

  // Booking hanya boleh setelah AC dijadwalkan
  if (!request.tanggal_ac) {
    return res.status(400).json({ error: 'Jadwal Assessment Center belum ditetapkan untuk request ini. Booking presentasi baru bisa dilakukan setelah jadwal AC ada.' });
  }
  if (request.status === 'Rejected' || request.status === 'Selesai') {
    return res.status(400).json({ error: `Request berstatus ${request.status} — tidak dapat booking slot presentasi.` });
  }
  if (request.tanggal_presentasi) {
    return res.status(400).json({ error: 'Request ini sudah memiliki jadwal presentasi. Hubungi PIC Asesmen jika ingin mengubah jadwal.' });
  }

  // Atomic update: hanya berhasil jika slot masih Tersedia
  const { data: updatedSlots, error: slotError } = await supabase
    .from('slot_presentasi')
    .update({ status: 'Terpesan', id_request })
    .eq('id', id)
    .eq('status', 'Tersedia')
    .select();

  if (slotError) return res.status(500).json({ error: 'Gagal memproses booking' });
  if (!updatedSlots || updatedSlots.length === 0) {
    // Cek apakah slot ada atau sudah terpesan
    const { data: existingSlot } = await supabase.from('slot_presentasi').select('status').eq('id', id).single();
    if (!existingSlot) return res.status(404).json({ error: 'Slot tidak ditemukan' });
    return res.status(400).json({ error: 'Slot ini sudah diambil orang lain. Silakan pilih slot lain.' });
  }
  const slot = updatedSlots[0];

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
    await kirimUndanganPresentasi({
      namaTo: p.nama, emailTo: p.email,
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggal: slot.tanggal, jam: slot.jam, lokasi: slot.lokasi || '-'
    });
    await delay(400);
  }

  // Kirim undangan presentasi ke semua assessor
  let k = 1;
  while (config[`assessor_${k}_email`]) {
    await kirimUndanganPresentasi({
      namaTo: config[`assessor_${k}_nama`],
      emailTo: config[`assessor_${k}_email`],
      idRequest: id_request, namaPeserta: request.nama_peserta,
      tanggal: slot.tanggal, jam: slot.jam, lokasi: slot.lokasi || '-'
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
