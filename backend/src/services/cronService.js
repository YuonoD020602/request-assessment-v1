const supabase = require('../supabase');
const {
  kirimReminderDokumen,
  kirimReminderAC,
  kirimJadwalPsikotes
} = require('./emailService');

const getTimPelaksana = (config) => {
  const result = [];
  let i = 1;
  while (config[`assessor_${i}_email`]) {
    result.push({ nama: config[`assessor_${i}_nama`], email: config[`assessor_${i}_email`] });
    i++;
  }
  let j = 1;
  while (config[`admin_ac_${j}_email`]) {
    result.push({ nama: config[`admin_ac_${j}_nama`], email: config[`admin_ac_${j}_email`] });
    j++;
  }
  let k = 1;
  while (config[`roleplayer_${k}_email`]) {
    result.push({ nama: config[`roleplayer_${k}_nama`], email: config[`roleplayer_${k}_email`] });
    k++;
  }
  return result;
};

const getAdmins = (config) => {
  const admins = [];
  let i = 1;
  while (config[`admin_ac_${i}_email`]) {
    admins.push({ nama: config[`admin_ac_${i}_nama`], email: config[`admin_ac_${i}_email`] });
    i++;
  }
  return admins;
};

const runDailyReminders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const h3 = new Date(today); h3.setDate(h3.getDate() + 3);
  const h1 = new Date(today); h1.setDate(h1.getDate() + 1);

  const fmt = (d) => d.toISOString().split('T')[0];

  try {
    // --------------------------------------------------------
    // REMINDER H-3: Dokumen belum masuk, AC 3 hari lagi
    // --------------------------------------------------------
    const { data: dokBelum } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['GR Selesai - Menunggu Dokumen'])
      .or('status_dokumen.eq.Belum Diterima,status_dokumen.is.null')
      .eq('tanggal_ac', fmt(h3));

    for (const req of dokBelum || []) {
      const { data: cfg } = await supabase.from('konfigurasi').select('key, value');
      const config = Object.fromEntries(cfg.map(c => [c.key, c.value]));

      await kirimReminderDokumen({
        namaHC: req.pic_hc,
        emailHC: req.email_pic_hc,
        idRequest: req.id_request,
        namaPeserta: req.nama_peserta,
        urlFormDokumen: `${process.env.FRONTEND_URL}/form-dokumen?id=${req.id_request}`
      });

      console.log(`[CRON] Reminder dokumen H-3 dikirim ke ${req.email_pic_hc} untuk ${req.id_request}`);
    }

    // --------------------------------------------------------
    // REMINDER H-1: Psikotes besok
    // --------------------------------------------------------
    const { data: psikotes } = await supabase
      .from('requests')
      .select('*')
      .eq('tanggal_psikotes', fmt(h1))
      .not('tanggal_psikotes', 'is', null);

    for (const req of psikotes || []) {
      // Ke Administrator
      const { data: cfg } = await supabase.from('konfigurasi').select('key, value');
      const config = Object.fromEntries(cfg.map(c => [c.key, c.value]));

      const admins = getAdmins(config);
      for (const admin of admins) {
        await kirimJadwalPsikotes({
          namaTo: admin.nama, emailTo: admin.email,
          idRequest: req.id_request, namaPeserta: req.nama_peserta,
          tanggal: req.tanggal_psikotes, jam: req.jam_psikotes,
          isReminder: true
        });
      }

      // Ke pic_hc
      await kirimJadwalPsikotes({
        namaTo: req.pic_hc, emailTo: req.email_pic_hc,
        idRequest: req.id_request, namaPeserta: req.nama_peserta,
        tanggal: req.tanggal_psikotes, jam: req.jam_psikotes,
        isReminder: true
      });

      // Ke email peserta jika ada
      if (req.email_peserta) {
        await kirimJadwalPsikotes({
          namaTo: req.nama_peserta,
          emailTo: req.email_peserta,
          idRequest: req.id_request,
          namaPeserta: req.nama_peserta,
          tanggal: req.tanggal_psikotes,
          jam: req.jam_psikotes,
          isReminder: true
        });
      }

      console.log(`[CRON] Reminder psikotes H-1 untuk ${req.id_request}`);
    }

    // --------------------------------------------------------
    // REMINDER H-1: AC besok - ke HC dan Tim Pelaksana
    // --------------------------------------------------------
    const { data: acH1 } = await supabase
      .from('requests')
      .select('*')
      .eq('tanggal_ac', fmt(h1))
      .not('tanggal_ac', 'is', null)
      .not('status', 'in', '("Rejected","Selesai","Pending")');

    for (const req of acH1 || []) {
      const { data: cfg } = await supabase.from('konfigurasi').select('key, value');
      const config = Object.fromEntries(cfg.map(c => [c.key, c.value]));

      const penerima = [
        { nama: req.pic_hc, email: req.email_pic_hc },
        req.email_user ? { nama: req.user_atasan, email: req.email_user } : null,
        ...getTimPelaksana(config)
      ].filter(Boolean);

      for (const p of penerima) {
        if (p.email) {
          await kirimReminderAC({
            namaTo: p.nama,
            emailTo: p.email,
            idRequest: req.id_request,
            namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac,
            lokasiAC: req.lokasi_ac,
            isHariH: false
          });
        }
      }
      console.log(`[CRON] Reminder AC H-1 untuk ${req.id_request}`);
    }

    // --------------------------------------------------------
    // REMINDER HARI H: AC hari ini - ke Tim Pelaksana pukul 06.00
    // --------------------------------------------------------
    const { data: acHariH } = await supabase
      .from('requests')
      .select('*')
      .eq('tanggal_ac', fmt(today))
      .not('tanggal_ac', 'is', null)
      .not('status', 'in', '("Rejected","Selesai","Pending")');

    for (const req of acHariH || []) {
      const { data: cfg } = await supabase.from('konfigurasi').select('key, value');
      const config = Object.fromEntries(cfg.map(c => [c.key, c.value]));

      const timPelaksana = getTimPelaksana(config);

      for (const p of timPelaksana) {
        if (p.email) {
          await kirimReminderAC({
            namaTo: p.nama,
            emailTo: p.email,
            idRequest: req.id_request,
            namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac,
            lokasiAC: req.lokasi_ac,
            isHariH: true
          });
        }
      }
      console.log(`[CRON] Reminder AC Hari H untuk ${req.id_request}`);
    }

  } catch (err) {
    console.error('[CRON] Error:', err.message);
  }
};

module.exports = { runDailyReminders };
