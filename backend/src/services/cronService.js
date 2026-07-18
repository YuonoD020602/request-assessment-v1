const supabase = require('../supabase');
const { getSemuaHC } = require('../utils/penerima');
const {
  kirimReminderDokumen,
  kirimReminderAC,
  kirimReminderACPeserta,
  kirimReminderACAssessor,
  kirimReminderACRoleplayer,
  kirimJadwalPsikotes
} = require('./emailService');

const getAssessors = (config) => {
  const result = [];
  let i = 1;
  while (config[`assessor_${i}_email`]) {
    result.push({ nama: config[`assessor_${i}_nama`], email: config[`assessor_${i}_email`] });
    i++;
  }
  return result;
};

const getRoleplayers = (config) => {
  const result = [];
  let i = 1;
  while (config[`roleplayer_${i}_email`]) {
    result.push({ nama: config[`roleplayer_${i}_nama`], email: config[`roleplayer_${i}_email`] });
    i++;
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

const getTimPelaksana = (config) => {
  return [...getAssessors(config), ...getAdmins(config), ...getRoleplayers(config)];
};


// Kirim aman: kegagalan satu email tidak menghentikan reminder lainnya
const kirimAman = async (fn, args, ctx) => {
  try { await fn(args); } catch (e) { console.error(`[CRON] Gagal kirim (${ctx}):`, e.message); }
};

const runDailyReminders = async () => {
  // Semua tanggal dihitung berbasis WIB secara eksplisit — JANGAN campur
  // Date lokal server + toISOString (UTC), karena menggeser tanggal 1 hari
  // saat server berjalan di timezone UTC (Railway/Render default).
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD WIB
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));

  const h3 = new Date(today); h3.setUTCDate(h3.getUTCDate() + 3);
  const h1 = new Date(today); h1.setUTCDate(h1.getUTCDate() + 1);

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
      const config = Object.fromEntries((cfg || []).map(c => [c.key, c.value]));

      for (const hc of getSemuaHC(req)) {
        await kirimAman(kirimReminderDokumen, {
          namaHC: hc.nama,
          emailHC: hc.email,
          idRequest: req.id_request,
          namaPeserta: req.nama_peserta,
          urlFormDokumen: `${process.env.FRONTEND_URL}/form-dokumen?id=${req.id_request}`
        });
      }

      console.log(`[CRON] Reminder dokumen H-3 dikirim ke ${req.email_pic_hc} untuk ${req.id_request}`);
    }

    // --------------------------------------------------------
    // REMINDER H-1: Psikotes besok
    // --------------------------------------------------------
    const { data: psikotes } = await supabase
      .from('requests')
      .select('*')
      .eq('tanggal_psikotes', fmt(h1))
      .not('tanggal_psikotes', 'is', null)
      .not('status', 'in', '("Rejected","Selesai","Pending - Menunggu Review")');

    for (const req of psikotes || []) {
      // Ke Administrator
      const { data: cfg } = await supabase.from('konfigurasi').select('key, value');
      const config = Object.fromEntries((cfg || []).map(c => [c.key, c.value]));

      const admins = getAdmins(config);
      for (const admin of admins) {
        await kirimAman(kirimJadwalPsikotes, {
          namaTo: admin.nama, emailTo: admin.email,
          idRequest: req.id_request, namaPeserta: req.nama_peserta,
          tanggal: req.tanggal_psikotes, jam: req.jam_psikotes,
          isReminder: true
        });
      }

      // Ke semua PIC HC
      for (const hc of getSemuaHC(req)) {
        await kirimAman(kirimJadwalPsikotes, {
          namaTo: hc.nama, emailTo: hc.email,
          idRequest: req.id_request, namaPeserta: req.nama_peserta,
          tanggal: req.tanggal_psikotes, jam: req.jam_psikotes,
          isReminder: true
        });
      }

      // Ke email peserta jika ada
      if (req.email_peserta) {
        await kirimAman(kirimJadwalPsikotes, {
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
      .not('status', 'in', '("Rejected","Selesai","Pending - Menunggu Review","Laporan Dikirim")');

    for (const req of acH1 || []) {
      const { data: cfg } = await supabase.from('konfigurasi').select('key, value');
      const config = Object.fromEntries((cfg || []).map(c => [c.key, c.value]));

      // H-1 ke HC (template peserta — untuk diteruskan)
      for (const hc of getSemuaHC(req)) {
        await kirimAman(kirimReminderACPeserta, {
          namaHC: hc.nama, emailHC: hc.email,
          idRequest: req.id_request, namaPeserta: req.nama_peserta,
          tanggalAC: req.tanggal_ac, ruanganAC: req.ruangan_ac || null,
          lokasiAC: req.lokasi_ac
        });
      }

      // H-1 ke Assessor
      for (const a of getAssessors(config)) {
        if (a.email) {
          await kirimAman(kirimReminderACAssessor, {
            namaTo: a.nama, emailTo: a.email,
            idRequest: req.id_request, namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac, jamAC: req.jam_ac,
            penugasanTim: req.penugasan_tim || []
          });
        }
      }

      // H-1 ke Roleplayer (dengan tabel penugasan)
      for (const r of getRoleplayers(config)) {
        if (r.email) {
          await kirimAman(kirimReminderACRoleplayer, {
            namaTo: r.nama, emailTo: r.email,
            idRequest: req.id_request, namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac, jamAC: req.jam_ac,
            penugasanTim: req.penugasan_tim || []
          });
        }
      }

      // H-1 ke Admin AC
      for (const a of getAdmins(config)) {
        if (a.email) {
          await kirimAman(kirimReminderAC, {
            namaTo: a.nama, emailTo: a.email,
            idRequest: req.id_request, namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac, lokasiAC: req.lokasi_ac,
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
      .not('status', 'in', '("Rejected","Selesai","Pending - Menunggu Review","Laporan Dikirim")');

    for (const req of acHariH || []) {
      const { data: cfg } = await supabase.from('konfigurasi').select('key, value');
      const config = Object.fromEntries((cfg || []).map(c => [c.key, c.value]));

      // Hari H ke Assessor (tabel penugasan)
      for (const a of getAssessors(config)) {
        if (a.email) {
          await kirimAman(kirimReminderACAssessor, {
            namaTo: a.nama, emailTo: a.email,
            idRequest: req.id_request, namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac, jamAC: req.jam_ac,
            penugasanTim: req.penugasan_tim || []
          });
        }
      }

      // Hari H ke Roleplayer (tabel penugasan)
      for (const r of getRoleplayers(config)) {
        if (r.email) {
          await kirimAman(kirimReminderACRoleplayer, {
            namaTo: r.nama, emailTo: r.email,
            idRequest: req.id_request, namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac, jamAC: req.jam_ac,
            penugasanTim: req.penugasan_tim || []
          });
        }
      }

      // Hari H ke Admin AC
      for (const a of getAdmins(config)) {
        if (a.email) {
          await kirimAman(kirimReminderAC, {
            namaTo: a.nama, emailTo: a.email,
            idRequest: req.id_request, namaPeserta: req.nama_peserta,
            tanggalAC: req.tanggal_ac, lokasiAC: req.lokasi_ac,
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
