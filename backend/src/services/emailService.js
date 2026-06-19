const { Resend } = require('resend');
const supabase = require('../supabase');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'noreply@lyraac.site';

const logEmail = async (id_request, tujuan, fungsi) => {
  try {
    await supabase.from('log_aktivitas').insert({
      id_request,
      aktivitas: 'Email Terkirim',
      detail: `${fungsi} → ${tujuan} pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
    });
  } catch (_) {}
};

// Parse "2024-01-15" + "09.00" → "20240115T090000"
const parseICSDateTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  const match = (timeStr || '').match(/(\d{1,2})[.:](\d{2})/);
  const h = match ? match[1].padStart(2, '0') : '09';
  const min = match ? match[2] : '00';
  return `${y}${m}${d}T${h}${min}00`;
};

// Add hours to a parsed ICS datetime string
const addHoursToICS = (icsDate, hours) => {
  if (!icsDate) return null;
  const y = parseInt(icsDate.substring(0, 4));
  const mo = parseInt(icsDate.substring(4, 6)) - 1;
  const d = parseInt(icsDate.substring(6, 8));
  const h = parseInt(icsDate.substring(9, 11));
  const mi = parseInt(icsDate.substring(11, 13));
  const dt = new Date(Date.UTC(y, mo, d, h - 7, mi)); // convert WIB to UTC for calc
  dt.setUTCHours(dt.getUTCHours() + hours);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  const nh = String(dt.getUTCHours() + 7).padStart(2, '0'); // back to WIB
  return `${ny}${nm}${nd}T${nh}${mi.toString().padStart(2, '0')}00`;
};

const generateICS = ({ uid, summary, description, location, dateStr, timeStr, endTimeStr, durationHours = 2 }) => {
  const dtStart = parseICSDateTime(dateStr, timeStr);
  if (!dtStart) return null;
  const dtEnd = endTimeStr
    ? parseICSDateTime(dateStr, endTimeStr)
    : addHoursToICS(dtStart, durationHours);
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const safeDesc = (description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const safeLoc = (location || '').replace(/,/g, '\\,');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RACD AIHO//Assessment Center//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}@racd-aiho`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Asia/Jakarta:${dtStart}`,
    `DTEND;TZID=Asia/Jakarta:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${safeDesc}`,
    `LOCATION:${safeLoc}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const { error } = await resend.emails.send({
    from: `RACD AIHO Assessment Center <${FROM_EMAIL}>`,
    reply_to: FROM_EMAIL,
    to,
    subject,
    html,
    attachments,
    headers: {
      'X-Entity-Ref-ID': `racd-aiho-${Date.now()}`
    }
  });
  if (error) throw new Error(error.message);
};

// ============================================================
// FASE 1: Email Pembukaan Layanan ke HC
// ============================================================
const kirimEmailPembukaan = async ({ namaHC, emailHC, tanggalAC, tenggat, kuota }) => {
  await sendEmail({
    to: emailHC,
    subject: `[RACD AIHO] Pembukaan Layanan Assessment Center – ${tanggalAC}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${namaHC}<br/>HC PGA/SO</p>
        <p>Dengan hormat,</p>
        <p>Kami informasikan bahwa <strong>RACD AIHO Assessment Center</strong> membuka layanan Potential Review Assessment dan Profiling dengan ketentuan sebagai berikut:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tanggal Pelaksanaan AC</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${tanggalAC}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Batas Pendaftaran</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${tenggat}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Kuota Tersedia</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${kuota} peserta</td></tr>
        </table>
        <p>Untuk melakukan pengajuan, silakan akses form berikut:<br/>
        <a href="${process.env.FRONTEND_URL}/form-pengajuan">Form Pengajuan Assessment</a></p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `
  });
  await logEmail(null, emailHC, 'Email Pembukaan');
};

// ============================================================
// FASE 2: Email ke Approver (dengan PDF terlampir)
// ============================================================
const kirimEmailApprover = async ({ namaApprover, emailApprover, idRequest, dataPeserta, tokenApprove, tokenReject, pdfBuffer, namaPDF }) => {
  const urlApprove = `${process.env.FRONTEND_URL}/approval?token=${tokenApprove}&action=approve`;
  const urlReject = `${process.env.FRONTEND_URL}/approval?token=${tokenReject}&action=reject`;

  const attachments = pdfBuffer && namaPDF
    ? [{ filename: namaPDF, content: pdfBuffer }]
    : [];

  await sendEmail({
    to: emailApprover,
    subject: `[RACD AIHO] Review Pengajuan Assessment – ${idRequest}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${namaApprover}</p>
        <p>Terdapat pengajuan Assessment Center yang memerlukan review Anda. Detail lengkap terlampir dalam file PDF.</p>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;" colspan="2"><strong>ID Request: ${idRequest}</strong></td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Perusahaan</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.nama_perusahaan}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>PIC HC</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.pic_hc}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Nama Peserta</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.nama_peserta}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Posisi Saat Ini</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.posisi_current || '-'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Posisi Target</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.posisi_target || '-'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Jenis Assessment</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.jenis_assessment}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tujuan AC</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.tujuan_ac || '-'}</td></tr>
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${urlApprove}" style="background: #22c55e; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; margin-right: 16px; font-weight: bold;">✓ APPROVE</a>
          <a href="${urlReject}" style="background: #ef4444; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">✗ REJECT</a>
        </div>
        <p style="color: #666; font-size: 12px;">Link ini berlaku selama 7 hari.</p>
        <p>Hormat kami,<br/><strong>Sistem RACD AIHO Assessment Center</strong></p>
      </div>
    `
  });
  await logEmail(idRequest, emailApprover, 'Email Approver');
};

// ============================================================
// FASE 2: Email ke HC setelah APPROVED
// ============================================================
const kirimEmailApprovedHC = async ({ namaHC, emailHC, idRequest, urlZip, urlFormDokumen }) => {
  await sendEmail({
    to: emailHC,
    subject: `[RACD AIHO] Pengajuan Disetujui – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${namaHC}</p>
        <p>Pengajuan Assessment Center dengan ID <strong>${idRequest}</strong> telah <strong style="color: #22c55e;">DISETUJUI</strong>.</p>
        <ol>
          <li>Download dokumen: <a href="${urlZip}">Klik di sini untuk download ZIP dokumen</a></li>
          <li>Isi semua dokumen tersebut</li>
          <li>Upload dokumen: <a href="${urlFormDokumen}">Form Upload Dokumen Lanjutan</a></li>
        </ol>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `
  });
  await logEmail(idRequest, emailHC, 'Email Approved HC');
};

// ============================================================
// FASE 2: Email ke HC setelah REJECTED
// ============================================================
const kirimEmailRejectedHC = async ({ namaHC, emailHC, idRequest, catatanReject }) => {
  await sendEmail({
    to: emailHC,
    subject: `[RACD AIHO] Pengajuan Tidak Dapat Diproses – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${namaHC}</p>
        <p>Pengajuan <strong>${idRequest}</strong> <strong style="color: #ef4444;">tidak dapat diproses</strong>:</p>
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
          <p style="margin: 0;">${catatanReject}</p>
        </div>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `
  });
  await logEmail(idRequest, emailHC, 'Email Rejected HC');
};

// ============================================================
// FASE 3: Email Undangan GR (+ .ics kalender)
// ============================================================
const kirimEmailUndanganGR = async ({ namaTo, emailTo, idRequest, tanggalGR, jamGR, lokasiGR, namaPeserta }) => {
  const icsContent = generateICS({
    uid: `gr-${idRequest}`,
    summary: `Getting Requirement AC – ${namaPeserta}`,
    description: `Getting Requirement untuk Assessment Center peserta ${namaPeserta}. ID: ${idRequest}`,
    location: lokasiGR,
    dateStr: tanggalGR,
    timeStr: jamGR,
    durationHours: 1
  });

  const attachments = icsContent
    ? [{ filename: `GR_${idRequest}.ics`, content: Buffer.from(icsContent) }]
    : [];

  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] Undangan Getting Requirement – ${idRequest}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${namaTo}</p>
        <p>Kami mengundang Anda untuk hadir dalam sesi <strong>Getting Requirement (GR)</strong> untuk peserta <strong>${namaPeserta}</strong>:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tanggal</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${tanggalGR}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Pukul</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${jamGR} WIB</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Lokasi / Link</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${lokasiGR}</td></tr>
        </table>
        <p style="color: #555; font-size: 13px;">File kalender (.ics) terlampir. Buka untuk menambahkan ke kalender Anda.</p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, 'Email Undangan GR');
};

// ============================================================
// FASE 3: Email MOM GR (+ link keperluan untuk Tim Pelaksana)
// ============================================================
const kirimEmailMOM = async ({ namaTo, emailTo, idRequest, namaPeserta, momText, isTimPelaksana = false, linkKeperluan = null }) => {
  const subject = isTimPelaksana
    ? `[RACD AIHO] Notifikasi GR Selesai – ${idRequest}`
    : `[RACD AIHO] Minutes of Meeting GR – ${idRequest}`;

  const linkKeperluanHtml = (isTimPelaksana && linkKeperluan)
    ? `<p><strong>Link Keperluan Asesmen:</strong> <a href="${linkKeperluan}">${linkKeperluan}</a></p>`
    : '';

  const body = isTimPelaksana
    ? `<p>GR untuk <strong>${namaPeserta}</strong> (${idRequest}) selesai. Mohon mulai menyusun skenario AC.</p>${linkKeperluanHtml}<div style="background:#f9f9f9;padding:12px;border-left:4px solid #3b82f6;">${momText}</div>`
    : `<p>MOM Getting Requirement untuk <strong>${namaPeserta}</strong> (${idRequest}):</p><div style="background:#f9f9f9;padding:12px;border-left:4px solid #3b82f6;">${momText}</div>`;

  await sendEmail({
    to: emailTo, subject,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>Kepada Yth. Bapak/Ibu ${namaTo}</p>${body}<p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p></div>`
  });
  await logEmail(idRequest, emailTo, 'Email MOM GR');
};

// ============================================================
// FASE 4: Reminder Dokumen H-3
// ============================================================
const kirimReminderDokumen = async ({ namaHC, emailHC, idRequest, namaPeserta, urlFormDokumen }) => {
  await sendEmail({
    to: emailHC,
    subject: `[RACD AIHO] Reminder: Dokumen Belum Diterima – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaHC}</p>
        <p>Dokumen untuk <strong>${namaPeserta}</strong> (${idRequest}) <strong>belum kami terima</strong>. AC tinggal <strong>3 hari lagi</strong>.</p>
        <p><a href="${urlFormDokumen}" style="background:#3b82f6;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;">Upload Dokumen Sekarang</a></p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
  await logEmail(idRequest, emailHC, 'Reminder Dokumen H-3');
};

// ============================================================
// FASE 4: Notifikasi Dokumen Diterima (+ link keperluan untuk Tim Pelaksana)
// ============================================================
const kirimNotifikasiDokumenDiterima = async ({ namaTo, emailTo, idRequest, namaPeserta, linkDokumen, jenisDokumen, linkKeperluan = null }) => {
  const linkKeperluanHtml = linkKeperluan
    ? `<p><strong>Link Keperluan Asesmen:</strong> <a href="${linkKeperluan}">${linkKeperluan}</a></p>`
    : '';
  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] Dokumen AC Tersedia – ${idRequest}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>Kepada Yth. Bapak/Ibu ${namaTo}</p><p>Dokumen <strong>${jenisDokumen}</strong> untuk <strong>${namaPeserta}</strong> (${idRequest}) tersedia.</p><p><a href="${linkDokumen}">Klik di sini untuk mengakses</a></p>${linkKeperluanHtml}<p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p></div>`
  });
  await logEmail(idRequest, emailTo, 'Notifikasi Dokumen Diterima');
};

// ============================================================
// FASE 4: Jadwal Psikotes (+ .ics kalender)
// ============================================================
const kirimJadwalPsikotes = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggal, jam, isReminder = false }) => {
  const attachments = [];
  if (!isReminder) {
    const icsContent = generateICS({
      uid: `psikotes-${idRequest}`,
      summary: `Psikotes AC – ${namaPeserta}`,
      description: `Psikotes Assessment Center untuk ${namaPeserta}. ID: ${idRequest}. Platform: cek email dari astra.recruitment@ai.astra.co.id`,
      dateStr: tanggal,
      timeStr: jam,
      durationHours: 2
    });
    if (icsContent) attachments.push({ filename: `Psikotes_${idRequest}.ics`, content: Buffer.from(icsContent) });
  }

  await sendEmail({
    to: emailTo,
    subject: isReminder ? `[RACD AIHO] Reminder Besok: Psikotes – ${idRequest}` : `[RACD AIHO] Jadwal Psikotes – ${idRequest}`,
    attachments,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>Kepada Yth. Bapak/Ibu ${namaTo}</p><p>${isReminder ? 'Reminder' : 'Jadwal'} Psikotes untuk <strong>${namaPeserta}</strong>:</p><table style="border-collapse:collapse;width:100%;"><tr><td style="padding:8px;border:1px solid #ddd;"><strong>Tanggal</strong></td><td style="padding:8px;border:1px solid #ddd;">${tanggal}</td></tr><tr><td style="padding:8px;border:1px solid #ddd;"><strong>Pukul</strong></td><td style="padding:8px;border:1px solid #ddd;">${jam} WIB</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Platform</strong></td><td style="padding: 8px; border: 1px solid #ddd;">Cek email dari astra.recruitment@ai.astra.co.id</td></tr></table>${!isReminder ? '<p style="color:#555;font-size:13px;">File kalender (.ics) terlampir.</p>' : ''}<p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p></div>`
  });
  await logEmail(idRequest, emailTo, isReminder ? 'Reminder Psikotes H-1' : 'Jadwal Psikotes');
};

// ============================================================
// FASE 5: Reminder AC H-1 dan Hari H (+ .ics + link keperluan)
// ============================================================
const kirimReminderAC = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggalAC, lokasiAC, isHariH = false, attachCalendar = false, linkKeperluan = null }) => {
  const attachments = [];
  if (attachCalendar) {
    const icsContent = generateICS({
      uid: `ac-${idRequest}`,
      summary: `Assessment Center – ${namaPeserta}`,
      description: `Pelaksanaan Assessment Center untuk ${namaPeserta}. ID: ${idRequest}`,
      location: lokasiAC,
      dateStr: tanggalAC,
      timeStr: '08:00',
      durationHours: 8
    });
    if (icsContent) attachments.push({ filename: `AC_${idRequest}.ics`, content: Buffer.from(icsContent) });
  }

  const linkKeperluanHtml = linkKeperluan
    ? `<p><strong>Link Keperluan Asesmen:</strong> <a href="${linkKeperluan}">${linkKeperluan}</a></p>`
    : '';

  await sendEmail({
    to: emailTo,
    subject: isHariH ? `[RACD AIHO] Hari Ini: Pelaksanaan AC – ${idRequest}` : `[RACD AIHO] ${attachCalendar ? 'Jadwal' : 'Reminder Besok'}: Pelaksanaan AC – ${idRequest}`,
    attachments,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>Kepada Yth. Bapak/Ibu ${namaTo}</p><p>${isHariH ? 'Hari ini' : attachCalendar ? 'Berikut jadwal' : 'Besok'} adalah pelaksanaan <strong>Assessment Center</strong> untuk <strong>${namaPeserta}</strong>.</p><table style="border-collapse:collapse;width:100%;"><tr><td style="padding:8px;border:1px solid #ddd;"><strong>Tanggal</strong></td><td style="padding:8px;border:1px solid #ddd;">${tanggalAC}</td></tr><tr><td style="padding:8px;border:1px solid #ddd;"><strong>Lokasi</strong></td><td style="padding:8px;border:1px solid #ddd;">${lokasiAC}</td></tr></table>${linkKeperluanHtml}${attachCalendar ? '<p style="color:#555;font-size:13px;">File kalender (.ics) terlampir.</p>' : ''}<p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p></div>`
  });
  await logEmail(idRequest, emailTo, isHariH ? 'Reminder AC Hari H' : attachCalendar ? 'Jadwal AC' : 'Reminder AC H-1');
};

// ============================================================
// FASE 6: Undangan Presentasi (+ .ics kalender)
// ============================================================
const kirimUndanganPresentasi = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggal, jam, lokasi }) => {
  const icsContent = generateICS({
    uid: `presentasi-${idRequest}`,
    summary: `Presentasi Hasil AC – ${namaPeserta}`,
    description: `Presentasi Hasil Assessment Center untuk ${namaPeserta}. ID: ${idRequest}`,
    location: lokasi,
    dateStr: tanggal,
    timeStr: jam,
    durationHours: 2
  });

  const attachments = icsContent
    ? [{ filename: `Presentasi_${idRequest}.ics`, content: Buffer.from(icsContent) }]
    : [];

  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] Undangan Presentasi Hasil AC – ${idRequest}`,
    attachments,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>Kepada Yth. Bapak/Ibu ${namaTo}</p><p>Undangan <strong>Presentasi Hasil Assessment Center</strong> untuk <strong>${namaPeserta}</strong>:</p><table style="border-collapse:collapse;width:100%;"><tr><td style="padding:8px;border:1px solid #ddd;"><strong>Tanggal</strong></td><td style="padding:8px;border:1px solid #ddd;">${tanggal}</td></tr><tr><td style="padding:8px;border:1px solid #ddd;"><strong>Pukul</strong></td><td style="padding:8px;border:1px solid #ddd;">${jam} WIB</td></tr><tr><td style="padding:8px;border:1px solid #ddd;"><strong>Lokasi / Link</strong></td><td style="padding:8px;border:1px solid #ddd;">${lokasi}</td></tr></table><p style="color:#555;font-size:13px;">File kalender (.ics) terlampir.</p><p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p></div>`
  });
  await logEmail(idRequest, emailTo, 'Undangan Presentasi');
};

// ============================================================
// FASE 6: Kirim Laporan PDF
// ============================================================
const kirimLaporan = async ({ namaTo, emailTo, idRequest, namaPeserta, pdfBuffer, namaPDF }) => {
  await resend.emails.send({
    from: `RACD AIHO Assessment Center <${FROM_EMAIL}>`,
    reply_to: FROM_EMAIL,
    to: emailTo,
    subject: `[RACD AIHO] Laporan Assessment Center – ${namaPeserta} – ${idRequest}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>Kepada Yth. Bapak/Ibu ${namaTo}</p><p>Terlampir laporan hasil <strong>Assessment Center</strong> untuk <strong>${namaPeserta}</strong> (${idRequest}).</p><p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p></div>`,
    attachments: [{ filename: namaPDF, content: pdfBuffer }],
    headers: {
      'X-Entity-Ref-ID': `racd-aiho-${Date.now()}`
    }
  });
  await logEmail(idRequest, emailTo, 'Laporan PDF');
};

module.exports = {
  kirimEmailPembukaan, kirimEmailApprover, kirimEmailApprovedHC,
  kirimEmailRejectedHC, kirimEmailUndanganGR, kirimEmailMOM,
  kirimReminderDokumen, kirimNotifikasiDokumenDiterima,
  kirimJadwalPsikotes, kirimReminderAC, kirimUndanganPresentasi, kirimLaporan
};
