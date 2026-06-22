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

const getGreeting = () => {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }));
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  return 'Selamat sore';
};

const formatTanggal = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

const addHoursToICS = (icsDate, hours) => {
  if (!icsDate) return null;
  const y = parseInt(icsDate.substring(0, 4));
  const mo = parseInt(icsDate.substring(4, 6)) - 1;
  const d = parseInt(icsDate.substring(6, 8));
  const h = parseInt(icsDate.substring(9, 11));
  const mi = parseInt(icsDate.substring(11, 13));
  const dt = new Date(Date.UTC(y, mo, d, h - 7, mi));
  dt.setUTCHours(dt.getUTCHours() + hours);
  const wib = new Date(dt.getTime() + 7 * 3600 * 1000);
  const ny = String(wib.getUTCFullYear());
  const nm = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(wib.getUTCDate()).padStart(2, '0');
  const nh = String(wib.getUTCHours()).padStart(2, '0');
  const nmi = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${ny}${nm}${nd}T${nh}${nmi}00`;
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

const TABLE_STYLE = 'border-collapse: collapse; width: 100%;';
const TH_STYLE = 'padding: 10px 12px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold; text-align: center; font-size: 13px;';
const TD_STYLE = 'padding: 10px 12px; border: 1px solid #ddd; font-size: 13px;';
const TD_CENTER = 'padding: 10px 12px; border: 1px solid #ddd; font-size: 13px; text-align: center;';

// ============================================================
// FASE 1: Email Pembukaan Layanan ke HC
// ============================================================
const kirimEmailPembukaan = async ({ namaHC, emailHC, periodeAC, tenggat, kuota, linkFormPengajuan, jadwalBatch = {} }) => {
  const greeting = getGreeting();

  const jadwalRows = [
    ['Pendaftaran Potential Review &amp; Profiling', jadwalBatch.pendaftaran || tenggat || '-'],
    ['Pelaksanaan Getting Requirement', jadwalBatch.getting_requirement || '-'],
    ['Pengisian Form Data Karyawan dan Form STAR', jadwalBatch.pengisian_form || '-'],
    ['Pelaksanaan Online Test Ignite-Spark', jadwalBatch.online_test || '-'],
    ['Pelaksanaan Assessment Center', jadwalBatch.pelaksanaan_ac || '-'],
    ['Pemaparan Hasil Assessment Center', jadwalBatch.pemaparan || '-'],
  ].map(([k, r]) => `<tr><td style="${TD_STYLE}">${k}</td><td style="${TD_CENTER}">${r}</td></tr>`).join('');

  await sendEmail({
    to: emailHC,
    subject: `[RACD AIHO] Pembukaan Layanan Assessment Center – ${periodeAC}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth.<br/>Bapak/Ibu HR Dept. Head Astra Group<br/>Bapak/Ibu PIC HC Astra Group</p>
        <p>${greeting},</p>
        <p>Recruitment and Assessment Center Division (RACD) membuka pendaftaran untuk layanan penyelenggaraan Assessment Center kepada Astra Group dan SO yang dikhususkan untuk <strong>Potential Review dan Profiling</strong>. <em>Assessment Center</em> merupakan metode evaluasi individu yang terstandardisasi dengan menggunakan berbagai teknik evaluasi (<em>multi-method</em>) yang dirancang untuk mengukur kompetensi, serta dilaksanakan oleh sejumlah asesor (<em>multi-rater</em>). <em>Assessment Center</em> yang dilaksanakan RACD AIHO didasarkan pada <em>Astra Leadership Competencies</em> (ALC) dan kompetensi yang diukur akan disesuaikan dengan kebutuhan dari Astra Group dan SO melalui proses Getting Requirement dengan PIC HC dan <em>user</em>.</p>
        <p>Adapun detail teknis pelaksanaan sebagai berikut:</p>
        <ol style="padding-left: 20px;">
          <li>Pelaksanaan akan dilakukan secara <em>offline</em> dimana peserta akan diminta untuk datang ke Head Office Astra International, Gedung AMDI A, Sunter.</li>
          <li>Pelaksanaan Assessment Center berlangsung selama <strong>1 hari</strong>.</li>
          <li>Pendaftaran akan dipecah menjadi 2 tahap:
            <ol type="a" style="padding-left: 20px; margin-top: 4px;">
              <li>Membalas email pembukaan ini disertai dengan <strong>Form Permintaan Assessment (terlampir)</strong> yang telah diisi</li>
              <li><strong><em>Getting requirement</em></strong> dengan PIC HC dan <em>user</em></li>
            </ol>
          </li>
          <li>Jika peserta yang diajukan untuk assessment lebih dari 1 (satu) orang, mohon untuk mengisi Form Permintaan Assessment untuk <u>masing-masing peserta</u>.</li>
        </ol>
        <p>Adapun jadwal pelaksanaan tertera pada tabel di bawah ini:</p>
        <table style="${TABLE_STYLE}">
          <tr><th style="${TH_STYLE}">Kegiatan</th><th style="${TH_STYLE}">Rentang Waktu</th></tr>
          ${jadwalRows}
        </table>
        ${linkFormPengajuan ? `
        <div style="margin-top: 16px; padding: 12px 16px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Dokumen yang perlu disiapkan:</strong></p>
          <p style="margin: 0;">Unduh, isi, dan simpan dalam format <strong>PDF</strong> dokumen berikut sebelum mengisi form pengajuan:</p>
          <p style="margin: 8px 0 0 0;"><a href="${linkFormPengajuan}" style="color: #2563eb; font-weight: bold;">Form Pengajuan Potential Review &amp; Profiling &rarr;</a></p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #6b7280;">File PDF dokumen ini wajib dilampirkan saat mengisi form pengajuan.</p>
        </div>` : ''}
        <p style="margin-top: 16px;">Untuk melakukan pengajuan, silakan akses form berikut:<br/>
        <a href="${process.env.FRONTEND_URL}/form-pengajuan" style="color: #2563eb;">Form Pengajuan Assessment</a></p>
        <p>Demikian informasi ini kami sampaikan. Apabila ada hal-hal yang ingin ditanyakan terkait layanan ini, kami siap membantu Bapak/Ibu melalui detil kontak saya di bawah ini.</p>
        <p>Terima kasih atas perhatian dan kerja sama Bapak/Ibu.</p>
      </div>
    `
  });
  await logEmail(null, emailHC, 'Email Pembukaan');
};

// ============================================================
// FASE 2: Email ke Approver (dengan PDF terlampir)
// ============================================================
const kirimEmailApprover = async ({ namaApprover, emailApprover, idRequest, dataPeserta, tokenApprove, tokenReject, pdfBuffer, namaPDF, dokumenPesertaBuffer, namaDokumenPeserta }) => {
  const urlApprove = `${process.env.FRONTEND_URL}/approval?token=${tokenApprove}&action=approve`;
  const urlReject = `${process.env.FRONTEND_URL}/approval?token=${tokenReject}&action=reject`;

  const attachments = [];
  if (pdfBuffer && namaPDF) attachments.push({ filename: namaPDF, content: pdfBuffer });
  if (dokumenPesertaBuffer && namaDokumenPeserta) attachments.push({ filename: namaDokumenPeserta, content: dokumenPesertaBuffer });

  await sendEmail({
    to: emailApprover,
    subject: `[RACD AIHO] Review Pengajuan Assessment – ${idRequest}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${namaApprover}</p>
        <p>Terdapat pengajuan Assessment Center yang memerlukan review Anda. Detail lengkap terlampir dalam file PDF.</p>
        <table style="${TABLE_STYLE} margin-bottom: 16px;">
          <tr><td style="${TD_STYLE} background: #f5f5f5;" colspan="2"><strong>ID Request: ${idRequest}</strong></td></tr>
          <tr><td style="${TD_STYLE}"><strong>Perusahaan</strong></td><td style="${TD_STYLE}">${dataPeserta.nama_perusahaan}</td></tr>
          <tr><td style="${TD_STYLE}"><strong>PIC HC</strong></td><td style="${TD_STYLE}">${dataPeserta.pic_hc}</td></tr>
          <tr><td style="${TD_STYLE}"><strong>Nama Peserta</strong></td><td style="${TD_STYLE}">${dataPeserta.nama_peserta}</td></tr>
          <tr><td style="${TD_STYLE}"><strong>Posisi Saat Ini</strong></td><td style="${TD_STYLE}">${dataPeserta.posisi_current || '-'}</td></tr>
          <tr><td style="${TD_STYLE}"><strong>Posisi Target</strong></td><td style="${TD_STYLE}">${dataPeserta.posisi_target || '-'}</td></tr>
          <tr><td style="${TD_STYLE}"><strong>Jenis Assessment</strong></td><td style="${TD_STYLE}">${dataPeserta.jenis_assessment}</td></tr>
          <tr><td style="${TD_STYLE}"><strong>Tujuan AC</strong></td><td style="${TD_STYLE}">${dataPeserta.tujuan_ac || '-'}</td></tr>
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${urlApprove}" style="background: #22c55e; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; margin-right: 16px; font-weight: bold;">&#10003; APPROVE</a>
          <a href="${urlReject}" style="background: #ef4444; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">&#10007; REJECT</a>
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
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
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
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
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
const kirimEmailUndanganGR = async ({ namaTo, emailTo, idRequest, tanggalGR, jamGR, lokasiGR, namaPeserta, periodeAC }) => {
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
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>${getGreeting()} Bapak/Ibu,</p>
        <p>Sehubungan dengan akan dilaksanakannya Assessment Center Batch ${periodeAC || ''}, kami mengundang Bapak &amp; Ibu untuk berdiskusi lebih lanjut mengenai kebutuhan yang diajukan (proses <em>getting requirement</em>) pada :</p>
        <table style="margin: 16px 0 16px 24px; border: none;">
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Hari / Tanggal</td><td style="padding: 6px 0;">: ${formatTanggal(tanggalGR)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Waktu</td><td style="padding: 6px 0;">: ${jamGR} WIB</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Lokasi</td><td style="padding: 6px 0;">: ${lokasiGR}</td></tr>
        </table>
        <p style="color: #555; font-size: 13px;">File kalender (.ics) terlampir. Buka untuk menambahkan ke kalender Anda.</p>
        <p>Terima kasih</p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, 'Email Undangan GR');
};

// ============================================================
// FASE 3: Email MOM GR ke PIC HC
// ============================================================
const kirimEmailMOM = async ({ namaTo, emailTo, idRequest, namaPeserta, momText, namaPerusahaan, kompetensiALC, tanggalOnlineTest, jamOnlineTest, tanggalAC, lokasiAC, linkFormStar, linkFormDataKaryawan, isTimPelaksana = false, linkKeperluan = null }) => {
  if (isTimPelaksana) {
    const linkKeperluanHtml = linkKeperluan
      ? `<p><strong>Link Keperluan Asesmen:</strong> <a href="${linkKeperluan}">${linkKeperluan}</a></p>`
      : '';

    await sendEmail({
      to: emailTo,
      subject: `[RACD AIHO] Notifikasi GR Selesai – ${idRequest}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
          <p>${getGreeting()} Bapak/Ibu,</p>
          <p>GR untuk <strong>${namaPeserta}</strong> (${idRequest}) telah selesai dilaksanakan. Mohon mulai menyusun skenario AC.</p>
          ${linkKeperluanHtml}
          <div style="background:#f9f9f9; padding:12px; border-left:4px solid #3b82f6; margin: 12px 0;">
            <p style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px;">Ringkasan MOM:</p>
            <p style="margin: 0; font-size: 13px;">${momText}</p>
          </div>
          <p>Terima kasih.</p>
        </div>
      `
    });
    await logEmail(idRequest, emailTo, 'Email MOM GR (Tim Pelaksana)');
    return;
  }

  // MOM ke PIC HC — sesuai template PDF
  const onlineTestInfo = tanggalOnlineTest
    ? `${formatTanggal(tanggalOnlineTest)}<br/>${jamOnlineTest || '-'} WIB`
    : '-';
  const acTanggalInfo = tanggalAC ? formatTanggal(tanggalAC) : '-';

  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] Minutes of Meeting GR – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>${getGreeting()} Bapak/Ibu,</p>
        <p>Berikut saya lampirkan kesepakatan pada <em>getting requirement meeting</em> yang telah kita laksanakan, untuk pelaksanaan Assessment Center peserta ${namaPerusahaan || ''} pada :</p>

        <table style="${TABLE_STYLE} margin: 16px 0;">
          <tr>
            <th style="${TH_STYLE}" rowspan="2">Nama Peserta</th>
            <th style="${TH_STYLE}" rowspan="2">Kompetensi ALC yang akan diukur</th>
            <th style="${TH_STYLE}" rowspan="2">Pelaksanaan Online Tes Astra Ignite &amp; Astra Spark</th>
            <th style="${TH_STYLE}" colspan="3">Pelaksanaan Assessment Center</th>
          </tr>
          <tr>
            <th style="${TH_STYLE}">Hari / Tanggal</th>
            <th style="${TH_STYLE}">Pukul</th>
            <th style="${TH_STYLE}">Lokasi</th>
          </tr>
          <tr>
            <td style="${TD_CENTER}">${namaPeserta}</td>
            <td style="${TD_CENTER}">${kompetensiALC || '-'}</td>
            <td style="${TD_CENTER}">${onlineTestInfo}</td>
            <td style="${TD_CENTER}">${acTanggalInfo}</td>
            <td style="${TD_CENTER}">08.00 &ndash; 17.00 WIB<br/><span style="font-size:11px;">(peserta diminta hadir 15 menit sebelum kegiatan berlangsung)</span></td>
            <td style="${TD_CENTER}">${lokasiAC || 'Astra International Head Office – Gedung AMDI A, Sunter'}<br/><span style="font-size:11px;">(ruangan akan diinformasikan H-1)</span></td>
          </tr>
        </table>

        <p>Berikut beberapa informasi yang perlu diperhatikan :</p>
        <ol style="padding-left: 20px;">
          <li>Dokumen Formulir Data Karyawan dan form STAR diisi oleh peserta dan dikirimkan kembali paling lambat <strong>H-3</strong> sebelum pelaksanaan asesmen (file terlampir).</li>
          <li>Pelaksanaan Tes Astra Ignite &amp; Astra Spark dilakukan secara online. Undangan dan link test akan dikirimkan secara langsung ke email peserta. Selama pengerjaan tes, peserta wajib didampingi oleh tim HC (secara langsung / melalui Ms. Teams).</li>
          <li>Peserta dan tim HC akan menerima email undangan Ms. Teams yang akan berlangsung selama online tes. Melalui Ms. Teams, tim AIHO akan memberikan pengarahan awal dan pengawasan pelaksanaan tes.</li>
          <li>Pelaksanaan Assessment Center akan dilakukan secara <em>offline</em> di Astra International Head Office – Gedung AMDI A, Sunter (ruangan akan diinformasikan H-1 kepada PIC HC)</li>
          <li>H-1 pelaksanaan Assessment Center, PIC Assessment Center AIHO akan mengirimkan email reminder kepada PIC HC ${namaPerusahaan || ''} untuk diteruskan kepada peserta.</li>
          <li>Presentasi hasil Assessment Center akan dipresentasikan H+2 minggu pelaksanaan, tanggal akan disepakati kemudian.</li>
        </ol>

        ${linkFormDataKaryawan ? `<p>Link Form Data Karyawan: <a href="${linkFormDataKaryawan}" style="color: #2563eb;">${linkFormDataKaryawan}</a></p>` : ''}
        ${linkFormStar ? `<p>Link Form STAR: <a href="${linkFormStar}" style="color: #2563eb;">${linkFormStar}</a></p>` : ''}

        <p>Demikian informasi ini saya sampaikan.</p>
        <p>Terima kasih.</p>
      </div>
    `
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
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth. Bapak/Ibu ${namaHC}</p>
        <p>Dokumen untuk <strong>${namaPeserta}</strong> (${idRequest}) <strong>belum kami terima</strong>. AC tinggal <strong>3 hari lagi</strong>.</p>
        <p><a href="${urlFormDokumen}" style="background:#3b82f6;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Upload Dokumen Sekarang</a></p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
  await logEmail(idRequest, emailHC, 'Reminder Dokumen H-3');
};

// ============================================================
// FASE 4: Notifikasi Dokumen Diterima (ke Tim Pelaksana)
// ============================================================
const kirimNotifikasiDokumenDiterima = async ({ namaTo, emailTo, idRequest, namaPeserta, linkDokumen, jenisDokumen, linkKeperluan = null }) => {
  const linkKeperluanHtml = linkKeperluan
    ? `<p><strong>Link Keperluan Asesmen:</strong> <a href="${linkKeperluan}">${linkKeperluan}</a></p>`
    : '';
  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] Dokumen AC Tersedia – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        <p>Dokumen <strong>${jenisDokumen}</strong> untuk <strong>${namaPeserta}</strong> (${idRequest}) tersedia.</p>
        <p><a href="${linkDokumen}" style="color: #2563eb;">Klik di sini untuk mengakses</a></p>
        ${linkKeperluanHtml}
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, 'Notifikasi Dokumen Diterima');
};

// ============================================================
// FASE 4: Jadwal Psikotes (+ .ics kalender)
// ============================================================
const kirimJadwalPsikotes = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggal, jam, isReminder = false, isRevisi = false }) => {
  const attachments = [];
  if (!isReminder) {
    const icsContent = generateICS({
      uid: `psikotes-${idRequest}-${isRevisi ? 'rev' : 'v1'}`,
      summary: `${isRevisi ? '[REVISI] ' : ''}Psikotes AC – ${namaPeserta}`,
      description: `Psikotes Assessment Center untuk ${namaPeserta}. ID: ${idRequest}. Platform: cek email dari astra.recruitment@ai.astra.co.id`,
      dateStr: tanggal,
      timeStr: jam,
      durationHours: 2
    });
    if (icsContent) attachments.push({ filename: `Psikotes_${idRequest}.ics`, content: Buffer.from(icsContent) });
  }

  const prefix = isRevisi ? '[REVISI] ' : isReminder ? 'Reminder Besok: ' : '';
  await sendEmail({
    to: emailTo,
    subject: isReminder ? `[RACD AIHO] Reminder Besok: Psikotes – ${idRequest}` : `[RACD AIHO] ${prefix}Jadwal Psikotes – ${idRequest}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        ${isRevisi ? '<div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:10px;margin-bottom:12px;"><strong>Jadwal psikotes telah diperbarui. Harap abaikan jadwal sebelumnya.</strong></div>' : ''}
        <p>${isReminder ? 'Reminder' : isRevisi ? 'Update jadwal' : 'Jadwal'} Psikotes untuk <strong>${namaPeserta}</strong>:</p>
        <table style="${TABLE_STYLE}">
          <tr><td style="${TD_STYLE}"><strong>Tanggal</strong></td><td style="${TD_STYLE}">${formatTanggal(tanggal)}</td></tr>
          <tr><td style="${TD_STYLE}"><strong>Pukul</strong></td><td style="${TD_STYLE}">${jam} WIB</td></tr>
          <tr><td style="${TD_STYLE}"><strong>Platform</strong></td><td style="${TD_STYLE}">Cek email dari astra.recruitment@ai.astra.co.id</td></tr>
        </table>
        ${!isReminder ? '<p style="color:#555;font-size:13px;">File kalender (.ics) terlampir.</p>' : ''}
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, isReminder ? 'Reminder Psikotes H-1' : isRevisi ? 'Revisi Jadwal Psikotes' : 'Jadwal Psikotes');
};

// ============================================================
// FASE 5: Notifikasi Jadwal AC (umum, ke HC/User saat PIC input jadwal)
// ============================================================
const kirimReminderAC = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggalAC, lokasiAC, isHariH = false, attachCalendar = false, linkKeperluan = null, isRevisi = false }) => {
  const attachments = [];
  if (attachCalendar) {
    const icsContent = generateICS({
      uid: `ac-${idRequest}-${isRevisi ? 'rev' : 'v1'}`,
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
  const revisiHtml = isRevisi
    ? '<div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:10px;margin-bottom:12px;"><strong>Jadwal AC telah diperbarui. Harap abaikan jadwal sebelumnya.</strong></div>'
    : '';
  const subjectPrefix = isHariH ? 'Hari Ini' : isRevisi ? '[REVISI] Jadwal' : attachCalendar ? 'Jadwal' : 'Reminder Besok';

  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] ${subjectPrefix}: Pelaksanaan AC – ${idRequest}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>${getGreeting()} Bapak/Ibu,</p>
        ${revisiHtml}
        <p>Sehubungan dengan pelaksanaan Assessment Center yang diselenggarakan oleh PT Astra International, Tbk, berikut kami informasikan detail kegiatan pelaksanaan Assessment Center :</p>
        <table style="margin: 16px 0 16px 24px; border: none;">
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Hari / Tanggal</td><td style="padding: 6px 0;">: <strong>${formatTanggal(tanggalAC)}</strong></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Tempat</td><td style="padding: 6px 0;">: <strong>${lokasiAC}</strong></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Pukul</td><td style="padding: 6px 0;">: <strong>08.00 – 15.00 WIB</strong></td></tr>
        </table>
        ${linkKeperluanHtml}
        ${attachCalendar ? '<p style="color:#555;font-size:13px;">File kalender (.ics) terlampir.</p>' : ''}
        <p>Demikian informasi yang dapat kami sampaikan.</p>
        <p>Terima kasih</p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, isHariH ? 'Reminder AC Hari H' : isRevisi ? 'Revisi Jadwal AC' : attachCalendar ? 'Jadwal AC' : 'Reminder AC H-1');
};

// ============================================================
// FASE 5: Reminder H-1 untuk Peserta (dikirim ke PIC HC untuk diteruskan)
// ============================================================
const kirimReminderACPeserta = async ({ namaHC, emailHC, idRequest, namaPeserta, tanggalAC, ruanganAC, lokasiAC }) => {
  const tempat = ruanganAC
    ? `${ruanganAC}, Gedung AMDI A Lt 1, Astra International Head Office – Sunter (offline)`
    : lokasiAC || 'Gedung AMDI A Lt 1, Astra International Head Office – Sunter (offline)';

  await sendEmail({
    to: emailHC,
    subject: `[RACD AIHO] Reminder H-1 Pelaksanaan AC – ${idRequest} (untuk diteruskan ke peserta)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>${getGreeting()} Bapak/Ibu Peserta Assessment Center,</p>
        <p>Sehubungan dengan pelaksanaan Assessment Center yang diselenggarakan oleh PT Astra International, Tbk, berikut kami informasikan detail kegiatan pelaksanaan Assessment Center :</p>
        <table style="margin: 16px 0 16px 24px; border: none;">
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Hari / Tanggal</td><td style="padding: 6px 0;">: <strong>${formatTanggal(tanggalAC)}</strong></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Tempat</td><td style="padding: 6px 0;">: <strong>${tempat}</strong></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Pukul</td><td style="padding: 6px 0;">: <strong>08.00 – 15.00 WIB</strong></td></tr>
        </table>
        <p>Adapun poin-poin yang perlu diperhatikan adalah sebagai berikut</p>
        <ol style="padding-left: 20px;">
          <li>Peserta diharapkan <strong>datang 15 menit sebelum waktu pelaksanaan</strong></li>
          <li>Peserta diharapkan membawa tumblr, jaket pribadi dan <em>mouse</em> (jika diperlukan).</li>
          <li>Snack dan makan siang disediakan oleh PT Astra International, Tbk.</li>
          <li>Alat tulis dan Notebook untuk assessment disediakan oleh RAC.</li>
        </ol>
        <p>Kegiatan ini tidak membutuhkan persiapan khusus. Untuk kelancaran kegiatan, peserta diharapkan untuk dapat beristirahat dengan cukup sebelum mengikuti kegiatan Assessment Center dan diharapkan untuk <strong><em>tidak membawa laptop pribadi/kantor guna menjaga konsentrasi</em></strong> selama proses Assessment Center.</p>
        <p>Demikian informasi yang dapat kami sampaikan.</p>
        <p>Terima kasih</p>
      </div>
    `
  });
  await logEmail(idRequest, emailHC, 'Reminder AC H-1 Peserta');
};

// ============================================================
// FASE 5: Reminder H-1/H-3 untuk Assessor
// ============================================================
const kirimReminderACAssessor = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggalAC, ruanganAC, lokasiAC }) => {
  const tempat = ruanganAC
    ? `${ruanganAC}, Gedung AMDI A Lt 1, Astra International Head Office – Sunter (offline)`
    : lokasiAC || 'Gedung AMDI A Lt 1, Astra International Head Office – Sunter (offline)';

  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] Reminder Pelaksanaan AC – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>${getGreeting()} Bapak/Ibu Assessor</p>
        <p>Sehubungan dengan pelaksanaan Assessment Center yang diselenggarakan oleh PT Astra International, Tbk, berikut kami informasikan detail kegiatan pelaksanaan Assessment Center :</p>
        <table style="margin: 16px 0 16px 24px; border: none;">
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Hari / Tanggal</td><td style="padding: 6px 0;">: <strong>${formatTanggal(tanggalAC)}</strong></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Tempat</td><td style="padding: 6px 0;">: <strong>${tempat}</strong></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; white-space: nowrap;">Pukul</td><td style="padding: 6px 0;">: <strong>08.00 – 15.00 WIB</strong></td></tr>
        </table>
        <p>Demikian informasi yang dapat kami sampaikan.</p>
        <p>Terima kasih</p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, 'Reminder AC Assessor');
};

// ============================================================
// FASE 5: Reminder H-1/H-3 untuk Roleplayer (dengan tabel penugasan)
// ============================================================
const kirimReminderACRoleplayer = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggalAC, jamAC, penugasanTim }) => {
  const rows = (penugasanTim || []).map(p =>
    `<tr><td style="${TD_CENTER}">${p.roleplayer || '-'}</td><td style="${TD_CENTER}">${p.assessor || '-'}</td><td style="${TD_CENTER}">${p.ruangan || '-'}</td><td style="${TD_CENTER}">${formatTanggal(tanggalAC)}</td><td style="${TD_CENTER}">${jamAC || '08.00 – 15.00'} WIB</td></tr>`
  ).join('');

  const tableHtml = rows
    ? `<table style="${TABLE_STYLE} margin: 16px 0;">
        <tr><th style="${TH_STYLE}">Nama Roleplayer</th><th style="${TH_STYLE}">Nama Asesor</th><th style="${TH_STYLE}">Ruangan</th><th style="${TH_STYLE}">Hari / Tanggal</th><th style="${TH_STYLE}">Waktu</th></tr>
        ${rows}
      </table>`
    : '<p style="color: #999;">Penugasan tim belum diatur.</p>';

  await sendEmail({
    to: emailTo,
    subject: `[RACD AIHO] Reminder Pelaksanaan AC – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>${getGreeting()} Bapak/Ibu Roleplayer</p>
        <p>Sehubungan dengan pelaksanaan Assessment Center yang diselenggarakan oleh PT Astra International, Tbk, berikut kami informasikan detail kegiatan pelaksanaan Assessment Center :</p>
        ${tableHtml}
        <p>Demikian informasi yang dapat kami sampaikan.</p>
        <p>Terima kasih</p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, 'Reminder AC Roleplayer');
};

// ============================================================
// FASE 6: Undangan Presentasi Hasil AC (+ .ics kalender)
// ============================================================
const kirimUndanganPresentasi = async ({ namaTo, emailTo, idRequest, namaPeserta, namaPerusahaan, tanggal, jam, lokasi }) => {
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Selamat siang Bapak/Ibu,</p>
        <p>Sehubungan dengan telah dilaksanakannya Assessment Center untuk ${namaPerusahaan || ''} atas nama :</p>
        <ol style="padding-left: 20px;">
          <li>${namaPeserta}</li>
        </ol>
        <p>kami mengundang bapak/ibu untuk menghadiri penyampaian hasil Assessment Center yang akan dilaksanakan pada:</p>
        <table style="margin: 16px 0 16px 24px; border: none;">
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold;">Hari</td><td style="padding: 6px 0;">: ${formatTanggal(tanggal)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold;">Pukul</td><td style="padding: 6px 0;">: ${jam} WIB</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold;">Lokasi</td><td style="padding: 6px 0;">: ${lokasi}</td></tr>
        </table>
        <p style="color:#555;font-size:13px;">File kalender (.ics) terlampir.</p>
        <p>Demikian informasi yang dapat kami sampaikan.</p>
        <p>Terima kasih</p>
      </div>
    `
  });
  await logEmail(idRequest, emailTo, 'Undangan Presentasi');
};

// ============================================================
// FASE 6: Notifikasi Pilih Slot Presentasi ke HC
// ============================================================
const kirimNotifikasiPilihSlot = async ({ namaHC, emailHC, idRequest, namaPeserta, linkCekStatus }) => {
  await sendEmail({
    to: emailHC,
    subject: `[RACD AIHO] Pilih Jadwal Presentasi Hasil AC – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth.<br/>Bapak/Ibu ${namaHC}</p>
        <p>Assessment Center untuk <strong>${namaPeserta}</strong> (${idRequest}) telah selesai dilaksanakan.</p>
        <p>Selanjutnya, Anda perlu <strong>memilih jadwal Presentasi Hasil AC</strong> sesuai slot yang tersedia.</p>
        <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">Cara memilih jadwal presentasi:</p>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Klik tombol di bawah untuk membuka halaman Cek Status</li>
            <li>Scroll ke bawah ke bagian <strong>"Pilih Jadwal Presentasi"</strong></li>
            <li>Pilih slot yang tersedia dan konfirmasi</li>
          </ol>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${linkCekStatus}" style="background: #1d4ed8; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
            Pilih Jadwal Presentasi &rarr;
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">Atau salin link berikut ke browser: ${linkCekStatus}</p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `
  });
  await logEmail(idRequest, emailHC, 'Notifikasi Pilih Slot Presentasi');
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        <p>Terlampir laporan hasil <strong>Assessment Center</strong> untuk <strong>${namaPeserta}</strong> (${idRequest}).</p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `,
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
  kirimJadwalPsikotes, kirimReminderAC,
  kirimReminderACPeserta, kirimReminderACAssessor, kirimReminderACRoleplayer,
  kirimUndanganPresentasi, kirimNotifikasiPilihSlot, kirimLaporan
};
