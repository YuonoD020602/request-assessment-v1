import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function FormPengajuan() {
  const [form, setForm] = useState({
    nama_perusahaan: '', pic_hc: '', email_pic_hc: '', user_atasan: '', email_user: '',
    nama_peserta: '', posisi_current: '', dept: '', div: '', gol_current: '',
    posisi_target: '', gol_target: '', jumlah_bawahan: '', jumlah_peers: '',
    masa_kerja: '', tujuan_ac: '', jenis_assessment: '', terakhir_assessment: '', email_peserta: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/requests/submit', form);
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
          <p className="text-gray-500 mb-4">ID Request Anda:</p>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-2xl font-mono font-bold text-blue-700">{submitted.idRequest}</p>
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
                <input name="nama_perusahaan" className="form-input" required onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Nama PIC HC <span className="text-red-500">*</span></label>
                <input name="pic_hc" className="form-input" required onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Email PIC HC <span className="text-red-500">*</span></label>
                <input name="email_pic_hc" type="email" className="form-input" required onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Nama User/Atasan <span className="text-red-500">*</span></label>
                <input name="user_atasan" className="form-input" required onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Email User/Atasan</label>
                <input name="email_user" type="email" className="form-input" onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Seksi 2: Data Peserta */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Data Peserta</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Nama Peserta <span className="text-red-500">*</span></label>
                <input name="nama_peserta" className="form-input" required onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Email Peserta</label>
                <input name="email_peserta" type="email" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Masa Kerja</label>
                <input name="masa_kerja" className="form-input" placeholder="mis. 5 tahun" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Posisi Saat Ini</label>
                <input name="posisi_current" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Golongan Saat Ini</label>
                <input name="gol_current" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Posisi Target</label>
                <input name="posisi_target" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Golongan Target</label>
                <input name="gol_target" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Departemen</label>
                <input name="dept" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Divisi</label>
                <input name="div" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Jumlah Bawahan</label>
                <input name="jumlah_bawahan" className="form-input" onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Jumlah Peers</label>
                <input name="jumlah_peers" className="form-input" onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Seksi 3: Detail Assessment */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Detail Assessment</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Jenis Assessment <span className="text-red-500">*</span></label>
                <select name="jenis_assessment" className="form-input" required onChange={handleChange}>
                  <option value="">-- Pilih --</option>
                  <option value="Potential Review">Potential Review</option>
                  <option value="Profiling">Profiling</option>
                  <option value="Potential Review & Profiling">Potential Review & Profiling</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="form-label">Tujuan Assessment</label>
                <textarea name="tujuan_ac" className="form-input" rows={3} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Terakhir Mengikuti Assessment</label>
                <input name="terakhir_assessment" className="form-input" placeholder="mis. Belum pernah / 2 tahun lalu" onChange={handleChange} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </form>
      </div>
    </div>
  );
}
