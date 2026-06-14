// FormDokumen.jsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function FormDokumen() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    id_request: params.get('id') || '',
    link_form_potrev: '',
    link_data_karyawan: '',
    link_form_star: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/fase4/dokumen', form);
      setSubmitted(true);
      toast.success('Dokumen berhasil dikirim!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengirim dokumen');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Dokumen Terkirim!</h2>
        <p className="text-gray-500">Tim RACD AIHO akan segera memproses dokumen Anda.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Dokumen Lanjutan</h1>
          <p className="text-gray-500 text-sm mt-1">RACD AIHO – PT Astra International</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">ID Request <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.id_request} onChange={e => setForm({...form, id_request: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Link Google Drive – Form Potential Review <span className="text-red-500">*</span></label>
              <input className="form-input" placeholder="https://drive.google.com/..." value={form.link_form_potrev} onChange={e => setForm({...form, link_form_potrev: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Link Google Drive – Data Karyawan <span className="text-red-500">*</span></label>
              <input className="form-input" placeholder="https://drive.google.com/..." value={form.link_data_karyawan} onChange={e => setForm({...form, link_data_karyawan: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Link Google Drive – Form STAR <span className="text-red-500">*</span></label>
              <input className="form-input" placeholder="https://drive.google.com/..." value={form.link_form_star} onChange={e => setForm({...form, link_form_star: e.target.value})} required />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Mengirim...' : 'Kirim Dokumen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
