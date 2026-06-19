import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const pesertaKosong = () => ({
  nama_peserta: '', email_peserta: '', masa_kerja: '',
  posisi_current: '', gol_current: '', posisi_target: '', gol_target: '',
  dept: '', div: '', jumlah_bawahan: '', jumlah_peers: '',
  tujuan_ac: '', jenis_assessment: '', terakhir_assessment: '',
  dokumen_pdf: null
});

export default function FormPengajuan() {
  const [dataHC, setDataHC] = useState({
    nama_perusahaan: '', pic_hc: '', email_pic_hc: '',
    user_atasan: '', email_user: ''
  });
  const [pesertaList, setPesertaList] = useState([pesertaKosong()]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const handleHCChange = (e) => setDataHC({ ...dataHC, [e.target.name]: e.target.value });

  const handlePesertaChange = (idx, e) => {
    const updated = [...pesertaList];
    updated[idx][e.target.name] = e.target.value;
    setPesertaList(updated);
  };

  const tambahPeserta = () => setPesertaList([...pesertaList, pesertaKosong()]);

  const hapusPeserta = (idx) => {
    if (pesertaList.length === 1) return toast.error('Minimal 1 peserta');
    setPesertaList(pesertaList.filter((_, i) => i !== idx));
  };

  const handleDokumenChange = (idx, file) => {
    const updated = [...pesertaList];
    updated[idx].dokumen_pdf = file;
    setPesertaList(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (let i = 0; i < pesertaList.length; i++) {
      if (!pesertaList[i].dokumen_pdf) {
        return toast.error(`Peserta ${i + 1}: Dokumen PDF wajib diupload`);
      }
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(dataHC).forEach(([k, v]) => formData.append(k, v));
      const pesertaData = pesertaList.map(({ dokumen_pdf, ...rest }) => rest);
      formData.append('peserta', JSON.stringify(pesertaData));
      pesertaList.forEach((p, idx) => {
        if (p.dokumen_pdf) formData.append(`dokumen_pdf_${idx}`, p.dokumen_pdf);
      });
      const res = await api.post('/api/requests/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitted(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengirim pengajuan');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pengajuan Terkirim!</h2>
          <p className="text-gray-500 mb-4">
            {submitted.idRequests?.length > 1
              ? `${submitted.idRequests.length} peserta berhasil didaftarkan`
              : 'ID Request Anda:'}
          </p>
          <div className="space-y-2 mb-4">
            {submitted.idRequests?.map((id, idx) => (
              <div key={idx} className="bg-blue-50 rounded-lg p-3">
                <p className="text-lg font-mono font-bold text-blue-700">{id}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mb-6">{submitted.message}</p>
          <a href="/cek-status" className="btn-primary inline-block">Cek Status Request</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Form Pengajuan Assessment Center</h1>
          <p className="text-gray-500 text-sm mt-1">RACD AIHO – PT Astra International</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seksi 1: Data HC */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Data HC PGA/SO</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Nama Perusahaan <span className="text-red-500">*</span></label>
                <input name="nama_perusahaan" className="form-input" required onChange={handleHCChange} />
              </div>
              <div>
                <label className="form-label">Nama PIC HC <span className="text-red-500">*</span></label>
                <input name="pic_hc" className="form-input" required onChange={handleHCChange} />
              </div>
              <div>
                <label className="form-label">Email PIC HC <span className="text-red-500">*</span></label>
                <input name="email_pic_hc" type="email" className="form-input" required onChange={handleHCChange} />
              </div>
              <div>
                <label className="form-label">Nama User/Atasan <span className="text-red-500">*</span></label>
                <input name="user_atasan" className="form-input" required onChange={handleHCChange} />
              </div>
              <div>
                <label className="form-label">Email User/Atasan</label>
                <input name="email_user" type="email" className="form-input" onChange={handleHCChange} />
              </div>
            </div>
          </div>

          {/* Seksi 2: Data Peserta - Dynamic */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Data Peserta</h2>
              <button type="button" onClick={tambahPeserta}
                className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
                + Tambah Peserta
              </button>
            </div>

            {pesertaList.map((peserta, idx) => (
              <div key={idx} className="card border-2 border-gray-100">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Peserta {idx + 1}
                    {pesertaList.length > 1 && (
                      <span className="ml-2 text-xs text-gray-400">
                        {peserta.nama_peserta || 'Belum diisi'}
                      </span>
                    )}
                  </h3>
                  {pesertaList.length > 1 && (
                    <button type="button" onClick={() => hapusPeserta(idx)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors">
                      Hapus
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="form-label">Nama Peserta <span className="text-red-500">*</span></label>
                    <input name="nama_peserta" className="form-input" required
                      value={peserta.nama_peserta}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Email Peserta</label>
                    <input name="email_peserta" type="email" className="form-input"
                      value={peserta.email_peserta}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Masa Kerja</label>
                    <input name="masa_kerja" className="form-input" placeholder="mis. 5 tahun"
                      value={peserta.masa_kerja}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Posisi Saat Ini</label>
                    <input name="posisi_current" className="form-input"
                      value={peserta.posisi_current}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Golongan Saat Ini</label>
                    <input name="gol_current" className="form-input"
                      value={peserta.gol_current}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Posisi Target</label>
                    <input name="posisi_target" className="form-input"
                      value={peserta.posisi_target}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Golongan Target</label>
                    <input name="gol_target" className="form-input"
                      value={peserta.gol_target}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Departemen</label>
                    <input name="dept" className="form-input"
                      value={peserta.dept}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Divisi</label>
                    <input name="div" className="form-input"
                      value={peserta.div}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Jumlah Bawahan</label>
                    <input name="jumlah_bawahan" className="form-input"
                      value={peserta.jumlah_bawahan}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div>
                    <label className="form-label">Jumlah Peers</label>
                    <input name="jumlah_peers" className="form-input"
                      value={peserta.jumlah_peers}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>

                  {/* Detail Assessment per peserta */}
                  <div className="col-span-2 pt-2 border-t">
                    <label className="form-label">Jenis Assessment <span className="text-red-500">*</span></label>
                    <select name="jenis_assessment" className="form-input" required
                      value={peserta.jenis_assessment}
                      onChange={e => handlePesertaChange(idx, e)}>
                      <option value="">-- Pilih --</option>
                      <option value="Potential Review">Potential Review</option>
                      <option value="Profiling">Profiling</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Tujuan Assessment</label>
                    <textarea name="tujuan_ac" className="form-input" rows={3}
                      value={peserta.tujuan_ac}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Terakhir Mengikuti Assessment</label>
                    <input name="terakhir_assessment" className="form-input"
                      placeholder="mis. Belum pernah / 2 tahun lalu"
                      value={peserta.terakhir_assessment}
                      onChange={e => handlePesertaChange(idx, e)} />
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <label className="form-label">
                      Upload Form Pengajuan Potential Review & Profiling (PDF) <span className="text-red-500">*</span>
                    </label>
                    <input type="file" accept=".pdf" className="form-input"
                      onChange={e => handleDokumenChange(idx, e.target.files[0])} />
                    <p className="text-xs text-gray-500 mt-1">
                      Unduh template Form Pengajuan dari link yang dikirim di email pembukaan, isi, lalu upload PDF-nya di sini.
                    </p>
                    {peserta.dokumen_pdf && (
                      <p className="text-xs text-green-600 mt-1">✓ {peserta.dokumen_pdf.name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Mengirim...' : `Kirim Pengajuan (${pesertaList.length} Peserta)`}
          </button>
        </form>
      </div>
    </div>
  );
}
