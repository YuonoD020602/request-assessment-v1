const PDFDocument = require('pdfkit');

const generatePDFPengajuan = (dataHC, peserta, idRequest) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ============================================================
    // HEADER
    // ============================================================
    doc.fontSize(16).font('Helvetica-Bold').text('RACD AIHO Assessment Center', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('PT Astra International', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text('Form Pengajuan Assessment Center', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`ID Request: ${idRequest}`, { align: 'center' });
    doc.moveDown(0.5);

    // Garis pemisah
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ============================================================
    // DATA HC
    // ============================================================
    doc.fontSize(12).font('Helvetica-Bold').text('A. Data HC PGA/SO');
    doc.moveDown(0.3);

    const rowHC = [
      ['Nama Perusahaan', dataHC.nama_perusahaan],
      ['Nama PIC HC 1', dataHC.pic_hc],
      ['Email PIC HC 1', dataHC.email_pic_hc],
      ...(dataHC.hc_tambahan || []).flatMap((h, i) => [
        [`Nama PIC HC ${i + 2}`, h.nama || '-'],
        [`Email PIC HC ${i + 2}`, h.email || '-'],
      ]),
      ['Nama User/Atasan 1', dataHC.user_atasan || '-'],
      ['Email User/Atasan 1', dataHC.email_user || '-'],
      ...(dataHC.user_tambahan || []).flatMap((u, i) => [
        [`Nama User/Atasan ${i + 2}`, u.nama || '-'],
        [`Email User/Atasan ${i + 2}`, u.email || '-'],
      ]),
    ];

    rowHC.forEach(([label, value]) => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}:`, { continued: true, width: 200 });
      doc.font('Helvetica').text(` ${value || '-'}`);
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ============================================================
    // DATA PESERTA
    // ============================================================
    doc.fontSize(12).font('Helvetica-Bold').text('B. Data Peserta');
    doc.moveDown(0.3);

    const rowPeserta = [
      ['Nama Peserta', peserta.nama_peserta],
      ['Email Peserta', peserta.email_peserta || '-'],
      ['Masa Kerja', peserta.masa_kerja || '-'],
      ['Posisi Saat Ini', peserta.posisi_current || '-'],
      ['Golongan Saat Ini', peserta.gol_current || '-'],
      ['Posisi Target', peserta.posisi_target || '-'],
      ['Golongan Target', peserta.gol_target || '-'],
      ['Departemen', peserta.dept || '-'],
      ['Divisi', peserta.div || '-'],
      ['Jumlah Bawahan', peserta.jumlah_bawahan || '-'],
      ['Jumlah Peers', peserta.jumlah_peers || '-'],
    ];

    rowPeserta.forEach(([label, value]) => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}:`, { continued: true, width: 200 });
      doc.font('Helvetica').text(` ${value || '-'}`);
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ============================================================
    // DETAIL ASSESSMENT
    // ============================================================
    doc.fontSize(12).font('Helvetica-Bold').text('C. Detail Assessment');
    doc.moveDown(0.3);

    const rowAssessment = [
      ['Jenis Assessment', peserta.jenis_assessment || '-'],
      ['Terakhir Assessment', peserta.terakhir_assessment || '-'],
    ];

    rowAssessment.forEach(([label, value]) => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}:`, { continued: true, width: 200 });
      doc.font('Helvetica').text(` ${value || '-'}`);
    });

    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').text('Tujuan Assessment:');
    doc.fontSize(10).font('Helvetica').text(peserta.tujuan_ac || '-', { width: 495 });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Footer
    const now = new Date();
    doc.fontSize(9).font('Helvetica').fillColor('gray')
      .text(`Dokumen ini digenerate otomatis oleh sistem RACD AIHO Assessment Center pada ${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.`, { align: 'center' });

    doc.end();
  });
};

module.exports = { generatePDFPengajuan };
