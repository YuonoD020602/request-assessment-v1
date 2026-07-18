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

const FL = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
      {label}{required && <span className="text-red-500 ml-0.5 normal-case font-normal">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const SectionDivider = ({ label }) => (
  <div className="col-span-2 flex items-center gap-3 py-1">
    <div className="flex-1 border-t border-dashed border-gray-200" />
    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap px-1">{label}</span>
    <div className="flex-1 border-t border-dashed border-gray-200" />
  </div>
);

const steps = ['Data HC', 'Data Peserta', 'Kirim'];

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
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-10 text-center">
          {/* Success animation ring */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" style={{ animationDuration: '2s' }} />
            <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-xl">
              <span className="text-5xl">✅</span>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Pengajuan Berhasil!</h2>
          <p className="text-gray-500 text-sm mb-6">
            {submitted.idRequests?.length > 1
              ? `${submitted.idRequests.length} peserta berhasil didaftarkan`
              : 'Simpan ID Request berikut untuk cek status:'}
          </p>
          <div className="space-y-3 mb-6">
            {submitted.idRequests?.map((id, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-px shadow-lg">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4">
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">ID Request #{idx + 1}</p>
                  <p className="text-xl font-mono font-extrabold text-blue-800">{id}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-6 bg-amber-50 border border-amber-100 rounded-xl p-3">
            💌 Approver akan mereview pengajuan Anda. Notifikasi dikirim via email.
          </p>
          <a href="/cek-status"
            className="block w-full py-3.5 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all text-sm">
            Pantau Status Request →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* ── Logo + Title ── */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-white font-extrabold text-xl">RA</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Form Pengajuan Assessment Center</h1>
          <p className="text-gray-400 text-sm mt-1">RACD AIHO – PT Astra International</p>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center mb-8 px-2">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i < 2
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-transparent text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}>
                  {i < 2 ? (i === 0 ? 'A' : 'B') : '✓'}
                </div>
                <p className={`text-xs mt-1 font-semibold whitespace-nowrap ${i < 2 ? 'text-blue-700' : 'text-gray-400'}`}>{step}</p>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 rounded ${i < 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Seksi A: Data HC ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-600 px-6 py-5">
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <span className="text-white font-extrabold">A</span>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">Data HC PGA/SO</h2>
                  <p className="text-blue-100 text-xs mt-0.5">Informasi Human Capital yang mendaftarkan peserta</p>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FL label="Nama Perusahaan" required>
                  <input name="nama_perusahaan" className="form-input" required onChange={handleHCChange} placeholder="PT. Contoh Indonesia" />
                </FL>
              </div>
              <FL label="Nama PIC HC" required>
                <input name="pic_hc" className="form-input" required onChange={handleHCChange} placeholder="Nama lengkap PIC" />
              </FL>
              <FL label="Email PIC HC" required>
                <input name="email_pic_hc" type="email" className="form-input" required onChange={handleHCChange} placeholder="pic@perusahaan.com" />
              </FL>
              <FL label="Nama User / Atasan" required>
                <input name="user_atasan" className="form-input" required onChange={handleHCChange} placeholder="Nama atasan peserta" />
              </FL>
              <FL label="Email User / Atasan">
                <input name="email_user" type="email" className="form-input" onChange={handleHCChange} placeholder="atasan@perusahaan.com" />
              </FL>
            </div>
          </div>

          {/* ── Seksi B: Data Peserta ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-extrabold text-sm">B</span>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">Data Peserta</h2>
                  <p className="text-xs text-gray-400">{pesertaList.length} peserta ditambahkan</p>
                </div>
              </div>
              <button type="button" onClick={tambahPeserta}
                className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-white hover:bg-blue-700 bg-blue-50 border border-blue-200 hover:border-blue-700 rounded-xl px-4 py-2 font-bold transition-all shadow-sm">
                + Tambah Peserta
              </button>
            </div>

            <div className="space-y-4">
              {pesertaList.map((peserta, idx) => (
                <div key={idx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Peserta Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md text-white font-extrabold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Peserta {idx + 1}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{peserta.nama_peserta || 'Belum diisi'}</p>
                      </div>
                    </div>
                    {pesertaList.length > 1 && (
                      <button type="button" onClick={() => hapusPeserta(idx)}
                        className="text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 bg-red-50 rounded-xl px-3 py-1.5 font-bold transition-all">
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <FL label="Nama Peserta" required>
                        <input name="nama_peserta" className="form-input" required
                          value={peserta.nama_peserta} onChange={e => handlePesertaChange(idx, e)}
                          placeholder="Nama lengkap peserta" />
                      </FL>
                    </div>
                    <FL label="Email Peserta">
                      <input name="email_peserta" type="email" className="form-input"
                        value={peserta.email_peserta} onChange={e => handlePesertaChange(idx, e)}
                        placeholder="email@domain.com" />
                    </FL>
                    <FL label="Masa Kerja">
                      <input name="masa_kerja" className="form-input" placeholder="mis. 5 tahun"
                        value={peserta.masa_kerja} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>

                    <SectionDivider label="Posisi & Golongan" />
                    <FL label="Posisi Saat Ini">
                      <input name="posisi_current" className="form-input"
                        value={peserta.posisi_current} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>
                    <FL label="Golongan Saat Ini">
                      <input name="gol_current" className="form-input"
                        value={peserta.gol_current} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>
                    <FL label="Posisi Target">
                      <input name="posisi_target" className="form-input"
                        value={peserta.posisi_target} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>
                    <FL label="Golongan Target">
                      <input name="gol_target" className="form-input"
                        value={peserta.gol_target} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>

                    <SectionDivider label="Unit & Struktur" />
                    <FL label="Departemen">
                      <input name="dept" className="form-input"
                        value={peserta.dept} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>
                    <FL label="Divisi">
                      <input name="div" className="form-input"
                        value={peserta.div} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>
                    <FL label="Jumlah Bawahan">
                      <input name="jumlah_bawahan" className="form-input"
                        value={peserta.jumlah_bawahan} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>
                    <FL label="Jumlah Peers">
                      <input name="jumlah_peers" className="form-input"
                        value={peserta.jumlah_peers} onChange={e => handlePesertaChange(idx, e)} />
                    </FL>

                    <SectionDivider label="Detail Assessment" />
                    <div className="col-span-2">
                      <FL label="Jenis Assessment" required>
                        <select name="jenis_assessment" className="form-input" required
                          value={peserta.jenis_assessment} onChange={e => handlePesertaChange(idx, e)}>
                          <option value="">-- Pilih Jenis Assessment --</option>
                          <option value="Potential Review">Potential Review</option>
                          <option value="Profiling">Profiling</option>
                        </select>
                      </FL>
                    </div>
                    <div className="col-span-2">
                      <FL label="Tujuan Assessment">
                        <textarea name="tujuan_ac" className="form-input resize-none" rows={3}
                          placeholder="Jelaskan tujuan mengikuti Assessment Center..."
                          value={peserta.tujuan_ac} onChange={e => handlePesertaChange(idx, e)} />
                      </FL>
                    </div>
                    <div className="col-span-2">
                      <FL label="Terakhir Mengikuti Assessment">
                        <input name="terakhir_assessment" className="form-input"
                          placeholder="mis. Belum pernah / 2 tahun lalu"
                          value={peserta.terakhir_assessment} onChange={e => handlePesertaChange(idx, e)} />
                      </FL>
                    </div>

                    {/* Upload PDF */}
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Upload Form Pengajuan (PDF)<span className="text-red-500 ml-0.5 normal-case font-normal">*</span>
                      </p>
                      <label className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                        peserta.dokumen_pdf
                          ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}>
                        <input type="file" accept=".pdf" className="hidden"
                          onChange={e => handleDokumenChange(idx, e.target.files[0])} />
                        {peserta.dokumen_pdf ? (
                          <>
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl">📄</div>
                            <p className="text-sm font-bold text-emerald-700 mb-0.5">✓ File dipilih</p>
                            <p className="text-xs text-emerald-600 font-medium">{peserta.dokumen_pdf.name}</p>
                            <p className="text-xs text-gray-400 mt-2">Klik untuk ganti file</p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl">📎</div>
                            <p className="text-sm font-bold text-gray-600 mb-1">Klik untuk upload PDF</p>
                            <p className="text-xs text-gray-400">Unduh template dari email pembukaan, isi, lalu upload di sini</p>
                            <div className="mt-3 inline-block bg-white border border-blue-200 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm">
                              Pilih File PDF
                            </div>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="space-y-3 pb-6">
            <button type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-blue-200 transition-all text-base disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
              disabled={loading}>
              <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Mengirim pengajuan...
                  </span>
                : `Kirim Pengajuan (${pesertaList.length} Peserta) →`}
            </button>
            <p className="text-center text-xs text-gray-400">
              🔒 Data Anda diproses secara konfidensial oleh Tim RACD AIHO
            </p>
            <p className="text-center text-xs text-gray-400">
              Ada pertanyaan? Hubungi PIC Asesmen —{' '}
              <a href="mailto:yuono.raharjo@ai.astra.co.id" className="text-blue-600 hover:underline font-medium">yuono.raharjo@ai.astra.co.id</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
