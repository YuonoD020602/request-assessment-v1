const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ============================================================
// FASE 1: Email Pembukaan Layanan ke HC
// ============================================================
const kirimEmailPembukaan = async ({ namaHC, emailHC, tanggalAC, tenggat, kuota }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailHC,
    subject: `[RACD AIHO] Pembukaan Layanan Assessment Center – ${tanggalAC}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>
        Bapak/Ibu ${namaHC}<br/>
        HC PGA/SO</p>

        <p>Dengan hormat,</p>

        <p>Kami informasikan bahwa <strong>RACD AIHO Assessment Center</strong> membuka layanan 
        Potential Review Assessment dan Profiling dengan ketentuan sebagai berikut:</p>

        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Tanggal Pelaksanaan AC</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${tanggalAC}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Batas Pendaftaran</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${tenggat}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Kuota Tersedia</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${kuota} peserta</td>
          </tr>
        </table>

        <p>Untuk melakukan pengajuan, silakan akses form berikut:<br/>
        <a href="${process.env.FRONTEND_URL}/form-pengajuan">Form Pengajuan Assessment</a></p>

        <p>Hormat kami,<br/>
        <strong>PIC Asesmen RACD AIHO</strong><br/>
        PT Astra International</p>
      </div>
    `
  });
};

// ============================================================
// FASE 2: Email ke Approver (dengan tombol Approve/Reject)
// ============================================================
const kirimEmailApprover = async ({ namaApprover, emailApprover, idRequest, dataPeserta, tokenApprove, tokenReject }) => {
  const urlApprove = `${process.env.FRONTEND_URL}/approval?token=${tokenApprove}&action=approve`;
  const urlReject = `${process.env.FRONTEND_URL}/approval?token=${tokenReject}&action=reject`;

  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailApprover,
    subject: `[RACD AIHO] Review Pengajuan Assessment – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>
        Bapak/Ibu ${namaApprover}</p>

        <p>Terdapat pengajuan Assessment Center yang memerlukan review Anda:</p>

        <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;" colspan="2"><strong>ID Request: ${idRequest}</strong></td></tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Perusahaan</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.nama_perusahaan}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>PIC HC</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.pic_hc}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Nama Peserta</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.nama_peserta}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Posisi Saat Ini</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.posisi_current || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Posisi Target</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.posisi_target || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Jenis Assessment</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.jenis_assessment}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Tujuan AC</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dataPeserta.tujuan_ac || '-'}</td>
          </tr>
        </table>

        <p>Silakan pilih tindakan Anda:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${urlApprove}" style="background: #22c55e; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; margin-right: 16px; font-weight: bold;">✓ APPROVE</a>
          <a href="${urlReject}" style="background: #ef4444; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">✗ REJECT</a>
        </div>

        <p style="color: #666; font-size: 12px;">Link ini berlaku selama 7 hari. Jika Anda tidak merasa menerima email ini, abaikan saja.</p>

        <p>Hormat kami,<br/>
        <strong>Sistem RACD AIHO Assessment Center</strong></p>
      </div>
    `
  });
};

// ============================================================
// FASE 2: Email ke HC setelah APPROVED
// ============================================================
const kirimEmailApprovedHC = async ({ namaHC, emailHC, idRequest, urlZip, urlFormDokumen }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailHC,
    subject: `[RACD AIHO] Pengajuan Disetujui – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>
        Bapak/Ibu ${namaHC}</p>

        <p>Pengajuan Assessment Center dengan ID <strong>${idRequest}</strong> telah <strong style="color: #22c55e;">DISETUJUI</strong>.</p>

        <p>Langkah selanjutnya, mohon lengkapi dokumen berikut:</p>
        <ol>
          <li>Download 3 dokumen yang diperlukan: <a href="${urlZip}">Klik di sini untuk download ZIP dokumen</a></li>
          <li>Isi semua dokumen tersebut</li>
          <li>Upload dokumen melalui form berikut: <a href="${urlFormDokumen}">Form Upload Dokumen Lanjutan</a></li>
        </ol>

        <p>Tim kami akan menghubungi Anda untuk menjadwalkan sesi Getting Requirement.</p>

        <p>Hormat kami,<br/>
        <strong>PIC Asesmen RACD AIHO</strong><br/>
        PT Astra International</p>
      </div>
    `
  });
};

// ============================================================
// FASE 2: Email ke HC setelah REJECTED
// ============================================================
const kirimEmailRejectedHC = async ({ namaHC, emailHC, idRequest, catatanReject }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailHC,
    subject: `[RACD AIHO] Pengajuan Tidak Dapat Diproses – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>
        Bapak/Ibu ${namaHC}</p>

        <p>Pengajuan Assessment Center dengan ID <strong>${idRequest}</strong> <strong style="color: #ef4444;">tidak dapat diproses</strong> dengan keterangan:</p>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
          <p style="margin: 0;">${catatanReject}</p>
        </div>

        <p>Untuk pertanyaan lebih lanjut, silakan hubungi PIC Asesmen RACD AIHO.</p>

        <p>Hormat kami,<br/>
        <strong>PIC Asesmen RACD AIHO</strong><br/>
        PT Astra International</p>
      </div>
    `
  });
};

// ============================================================
// FASE 3: Email Undangan GR ke HC dan User/Atasan
// ============================================================
const kirimEmailUndanganGR = async ({ namaTo, emailTo, idRequest, tanggalGR, jamGR, lokasiGR, namaPeserta }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailTo,
    subject: `[RACD AIHO] Undangan Getting Requirement – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth.<br/>
        Bapak/Ibu ${namaTo}</p>

        <p>Dengan hormat, kami mengundang Anda untuk hadir dalam sesi <strong>Getting Requirement (GR)</strong> terkait pelaksanaan Assessment Center untuk:</p>

        <p><strong>Peserta: ${namaPeserta}</strong></p>

        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Tanggal</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${tanggalGR}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Pukul</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${jamGR} WIB</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Lokasi / Link</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${lokasiGR}</td>
          </tr>
        </table>

        <p>Mohon untuk hadir tepat waktu. Terima kasih.</p>

        <p>Hormat kami,<br/>
        <strong>PIC Asesmen RACD AIHO</strong><br/>
        PT Astra International</p>
      </div>
    `
  });
};

// ============================================================
// FASE 3: Email MOM GR ke HC + notifikasi ke Assessor/Admin/Roleplayer
// ============================================================
const kirimEmailMOM = async ({ namaTo, emailTo, idRequest, namaPeserta, momText, isTimPelaksana = false }) => {
  const subject = isTimPelaksana
    ? `[RACD AIHO] Notifikasi GR Selesai – Mulai Susun Skenario – ${idRequest}`
    : `[RACD AIHO] Minutes of Meeting GR – ${idRequest}`;

  const bodyContent = isTimPelaksana
    ? `<p>GR untuk peserta <strong>${namaPeserta}</strong> (${idRequest}) telah selesai. Mohon mulai menyusun skenario AC.</p><p><strong>MOM GR:</strong></p><div style="background:#f9f9f9;padding:12px;border-left:4px solid #3b82f6;">${momText}</div>`
    : `<p>Berikut adalah Minutes of Meeting sesi Getting Requirement untuk <strong>${namaPeserta}</strong> (${idRequest}):</p><div style="background:#f9f9f9;padding:12px;border-left:4px solid #3b82f6;">${momText}</div>`;

  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailTo,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        ${bodyContent}
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
};

// ============================================================
// FASE 4: Email reminder dokumen H-3
// ============================================================
const kirimReminderDokumen = async ({ namaHC, emailHC, idRequest, namaPeserta, urlFormDokumen }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailHC,
    subject: `[RACD AIHO] Reminder: Dokumen Belum Diterima – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaHC}</p>
        <p>Ini adalah pengingat bahwa dokumen untuk peserta <strong>${namaPeserta}</strong> (${idRequest}) <strong>belum kami terima</strong>.</p>
        <p>Pelaksanaan AC tinggal <strong>3 hari lagi</strong>. Mohon segera upload dokumen melalui:</p>
        <p><a href="${urlFormDokumen}" style="background:#3b82f6;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;">Upload Dokumen Sekarang</a></p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
};

// ============================================================
// FASE 4: Email notifikasi dokumen diterima ke tim pelaksana
// ============================================================
const kirimNotifikasiDokumenDiterima = async ({ namaTo, emailTo, idRequest, namaPeserta, linkDokumen, jenisDokumen }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailTo,
    subject: `[RACD AIHO] Dokumen AC Tersedia – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        <p>Dokumen untuk peserta <strong>${namaPeserta}</strong> (${idRequest}) telah tersedia.</p>
        <p><strong>Dokumen: ${jenisDokumen}</strong></p>
        <p><a href="${linkDokumen}">Klik di sini untuk mengakses dokumen</a></p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
};

// ============================================================
// FASE 4: Email jadwal psikotes
// ============================================================
const kirimJadwalPsikotes = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggal, jam, linkPlatform, isReminder = false }) => {
  const subject = isReminder
    ? `[RACD AIHO] Reminder Besok: Psikotes – ${idRequest}`
    : `[RACD AIHO] Jadwal Psikotes – ${idRequest}`;

  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailTo,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        <p>${isReminder ? 'Mengingatkan bahwa' : 'Berikut jadwal'} <strong>Psikotes</strong> untuk peserta <strong>${namaPeserta}</strong>:</p>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Tanggal</strong></td><td style="padding:8px;border:1px solid #ddd;">${tanggal}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Pukul</strong></td><td style="padding:8px;border:1px solid #ddd;">${jam} WIB</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Platform</strong></td><td style="padding:8px;border:1px solid #ddd;"><a href="${linkPlatform}">${linkPlatform}</a></td></tr>
        </table>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
};

// ============================================================
// FASE 5: Reminder H-1 dan Hari H AC
// ============================================================
const kirimReminderAC = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggalAC, lokasiAC, isHariH = false }) => {
  const subject = isHariH
    ? `[RACD AIHO] Hari Ini: Pelaksanaan AC – ${idRequest}`
    : `[RACD AIHO] Reminder Besok: Pelaksanaan AC – ${idRequest}`;

  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailTo,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        <p>${isHariH ? '⏰ Mengingatkan bahwa <strong>hari ini</strong>' : '📅 Mengingatkan bahwa <strong>besok</strong>'} adalah jadwal pelaksanaan <strong>Assessment Center</strong> untuk peserta <strong>${namaPeserta}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Tanggal</strong></td><td style="padding:8px;border:1px solid #ddd;">${tanggalAC}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Lokasi</strong></td><td style="padding:8px;border:1px solid #ddd;">${lokasiAC}</td></tr>
        </table>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
};

// ============================================================
// FASE 6: Undangan Presentasi
// ============================================================
const kirimUndanganPresentasi = async ({ namaTo, emailTo, idRequest, namaPeserta, tanggal, jam, lokasi }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailTo,
    subject: `[RACD AIHO] Undangan Presentasi Hasil AC – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        <p>Kami mengundang Anda untuk hadir dalam <strong>Presentasi Hasil Assessment Center</strong> untuk peserta <strong>${namaPeserta}</strong>:</p>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Tanggal</strong></td><td style="padding:8px;border:1px solid #ddd;">${tanggal}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Pukul</strong></td><td style="padding:8px;border:1px solid #ddd;">${jam} WIB</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Lokasi / Link</strong></td><td style="padding:8px;border:1px solid #ddd;">${lokasi}</td></tr>
        </table>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong></p>
      </div>
    `
  });
};

// ============================================================
// FASE 6: Kirim Laporan PDF
// ============================================================
const kirimLaporan = async ({ namaTo, emailTo, idRequest, namaPeserta, pdfBuffer, namaPDF }) => {
  await transporter.sendMail({
    from: `"RACD AIHO Assessment Center" <${process.env.EMAIL_USER}>`,
    to: emailTo,
    subject: `[RACD AIHO] Laporan Assessment Center – ${namaPeserta} – ${idRequest}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Kepada Yth. Bapak/Ibu ${namaTo}</p>
        <p>Terlampir laporan hasil <strong>Assessment Center</strong> untuk peserta <strong>${namaPeserta}</strong> (${idRequest}).</p>
        <p>Apabila ada pertanyaan, silakan menghubungi kami.</p>
        <p>Hormat kami,<br/><strong>PIC Asesmen RACD AIHO</strong><br/>PT Astra International</p>
      </div>
    `,
    attachments: [
      {
        filename: namaPDF,
        content: pdfBuffer
      }
    ]
  });
};

module.exports = {
  kirimEmailPembukaan,
  kirimEmailApprover,
  kirimEmailApprovedHC,
  kirimEmailRejectedHC,
  kirimEmailUndanganGR,
  kirimEmailMOM,
  kirimReminderDokumen,
  kirimNotifikasiDokumenDiterima,
  kirimJadwalPsikotes,
  kirimReminderAC,
  kirimUndanganPresentasi,
  kirimLaporan
};
