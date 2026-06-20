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

const FieldGroup = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500 normal-case">*</span>}
    </label>
    {children}
  </div>
);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pengajuan Terkirim!</h2>
          <p className="text-gray-500 mb-6">
            {submitted.idRequests?.length > 1
              ? `${submitted.idRequests.length} peserta berhasil didaftarkan`
              : 'Simpan ID Request Anda:'}
          </p>
          <div className="space-y-3 mb-6">
            {submitted.idRequests?.map((id, idx) => (
              <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs text-blue-400 font-semibold mb-1">ID REQUEST</p>
                <p className="text-xl font-mono font-bold text-blue-700">{id}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mb-6">{submitted.message}</p>
          <a href="/cek-status" className="btn-primary inline-block w-full text-center py-3 rounded-xl">
            Cek Status Request →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Form Pengajuan Assessment Center</h1>
          <p className="text-gray-500 text-sm mt-1.5">RACD AIHO – PT Astra International</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Seksi A: Data HC */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-600 px-6 py-4 flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Data HC PGA/SO</h2>
                <p className="text-blue-100 text-xs">Informasi Human Capital yang mendaftarkan</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FieldGroup label="Nama Perusahaan" required>
                  <input name="nama_perusahaan" className="form-input" required onChange={handleHCChange} placeholder="PT. Contoh Indonesia" />
                </FieldGroup>
              </div>
              <FieldGroup label="Nama PIC HC" required>
                <input name="pic_hc" className="form-input" required onChange={handleHCChange} placeholder="Nama lengkap" />
              </FieldGroup>
              <FieldGroup label="Email PIC HC" required>
                <input name="email_pic_hc" type="email" className="form-input" required onChange={handleHCChange} placeholder="email@perusahaan.com" />
              </FieldGroup>
              <FieldGroup label="Nama User/Atasan" required>
                <input name="user_atasan" className="form-input" required onChange={handleHCChange} placeholder="Nama atasan peserta" />
              </FieldGroup>
              <FieldGroup label="Email User/Atasan">
                <input name="email_user" type="email" className="form-input" onChange={handleHCChange} placeholder="email@perusahaan.com" />
              </FieldGroup>
            </div>
          </div>

          {/* Seksi B: Data Peserta */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Data Peserta</h2>
                <p className="text-xs text-gray-500 mt-0.5">{pesertaList.length} peserta ditambahkan</p>
              </div>
              <button type="button" onClick={tambahPeserta}
                className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-4 py-2 font-semibold transition-colors">
                + Tambah Peserta
              </button>
            </div>

            <div className="space-y-4">
              {pesertaList.map((peserta, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Card Header Peserta */}
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-sm">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Peserta {idx + 1}</p>
                        {peserta.nama_peserta && (
                          <p className="text-xs text-gray-400 mt-0.5">{peserta.nama_peserta}</p>
                        )}
                      </div>
                    </div>
                    {pesertaList.length > 1 && (
                      <button type="button" onClick={() => hapusPeserta(idx)}
                        className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 font-medium transition-colors">
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="p-6 grid grid-cols-2 gap-4">
                    {/* Data Utama */}
                    <div className="col-span-2">
                      <FieldGroup label="Nama Peserta" required>
                        <input name="nama_peserta" className="form-input" required
                          value={peserta.nama_peserta} onChange={e => handlePesertaChange(idx, e)}
                          placeholder="Nama lengkap peserta" />
                      </FieldGroup>
                    </div>
                    <FieldGroup label="Email Peserta">
                      <input name="email_peserta" type="email" className="form-input"
                        value={peserta.email_peserta} onChange={e => handlePesertaChange(idx, e)}
                        placeholder="email@domain.com" />
                    </FieldGroup>
                    <FieldGroup label="Masa Kerja">
                      <input name="masa_kerja" className="form-input" placeholder="mis. 5 tahun"
                        value={peserta.masa_kerja} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>

                    {/* Divider */}
                    <div className="col-span-2 border-t border-dashed border-gray-200 pt-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Posisi & Golongan</p>
                    </div>
                    <FieldGroup label="Posisi Saat Ini">
                      <input name="posisi_current" className="form-input"
                        value={peserta.posisi_current} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>
                    <FieldGroup label="Golongan Saat Ini">
                      <input name="gol_current" className="form-input"
                        value={peserta.gol_current} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>
                    <FieldGroup label="Posisi Target">
                      <input name="posisi_target" className="form-input"
                        value={peserta.posisi_target} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>
                    <FieldGroup label="Golongan Target">
                      <input name="gol_target" className="form-input"
                        value={peserta.gol_target} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>

                    {/* Divider */}
                    <div className="col-span-2 border-t border-dashed border-gray-200 pt-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Unit & Struktur</p>
                    </div>
                    <FieldGroup label="Departemen">
                      <input name="dept" className="form-input"
                        value={peserta.dept} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>
                    <FieldGroup label="Divisi">
                      <input name="div" className="form-input"
                        value={peserta.div} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>
                    <FieldGroup label="Jumlah Bawahan">
                      <input name="jumlah_bawahan" className="form-input"
                        value={peserta.jumlah_bawahan} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>
                    <FieldGroup label="Jumlah Peers">
                      <input name="jumlah_peers" className="form-input"
                        value={peserta.jumlah_peers} onChange={e => handlePesertaChange(idx, e)} />
                    </FieldGroup>

                    {/* Divider */}
                    <div className="col-span-2 border-t border-dashed border-gray-200 pt-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Detail Assessment</p>
                    </div>
                    <div className="col-span-2">
                      <FieldGroup label="Jenis Assessment" required>
                        <select name="jenis_assessment" className="form-input" required
                          value={peserta.jenis_assessment} onChange={e => handlePesertaChange(idx, e)}>
                          <option value="">-- Pilih Jenis Assessment --</option>
                          <option value="Potential Review">Potential Review</option>
                          <option value="Profiling">Profiling</option>
                        </select>
                      </FieldGroup>
                    </div>
                    <div className="col-span-2">
                      <FieldGroup label="Tujuan Assessment">
                        <textarea name="tujuan_ac" className="form-input" rows={3}
                          placeholder="Jelaskan tujuan mengikuti Assessment Center..."
                          value={peserta.tujuan_ac} onChange={e => handlePesertaChange(idx, e)} />
                      </FieldGroup>
                    </div>
                    <div className="col-span-2">
                      <FieldGroup label="Terakhir Mengikuti Assessment">
                        <input name="terakhir_assessment" className="form-input"
                          placeholder="mis. Belum pernah / 2 tahun lalu"
                          value={peserta.terakhir_assessment} onChange={e => handlePesertaChange(idx, e)} />
                      </FieldGroup>
                    </div>

                    {/* Upload PDF */}
                    <div className="col-span-2">
                      <div className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${peserta.dokumen_pdf ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40'}`}>
                        <div className="mb-2">
                          {peserta.dokumen_pdf
                            ? <span className="text-3xl">📄</span>
                            : <span className="text-3xl">📎</span>}
                        </div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Upload Form Pengajuan (PDF) <span className="text-red-500">*</span>
                        </p>
                        {peserta.dokumen_pdf ? (
                          <p className="text-xs text-green-700 font-medium">✓ {peserta.dokumen_pdf.name}</p>
                        ) : (
                          <p className="text-xs text-gray-400 mb-3">Unduh template dari email pembukaan, isi, lalu upload di sini</p>
                        )}
                        <label className={`inline-block cursor-pointer text-xs font-semibold px-4 py-2 rounded-lg transition-colors mt-2 ${peserta.dokumen_pdf ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}>
                          {peserta.dokumen_pdf ? 'Ganti File' : 'Pilih File PDF'}
                          <input type="file" accept=".pdf" className="hidden"
                            onChange={e => handleDokumenChange(idx, e.target.files[0])} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button type="submit"
            className="w-full py-4 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all text-base disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengirim...</span>
              : `Kirim Pengajuan (${pesertaList.length} Peserta) →`}
          </button>

          <p className="text-center text-xs text-gray-400 pb-4">
            Data yang Anda kirimkan akan diproses secara konfidensial oleh Tim RACD AIHO.
          </p>
        </form>
      </div>
    </div>
  );
}
