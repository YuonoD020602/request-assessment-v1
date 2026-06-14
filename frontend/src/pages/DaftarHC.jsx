// DaftarHC.jsx
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function DaftarHC() {
  const [hcList, setHcList] = useState([]);
  const [form, setForm] = useState({ nama_perusahaan: '', nama_hc: '', email_hc: '' });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchHC(); }, []);

  const fetchHC = async () => {
    try {
      const res = await api.get('/api/hc');
      setHcList(res.data.data || []);
    } catch { toast.error('Gagal memuat data HC'); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/hc', form);
      toast.success('HC berhasil ditambahkan');
      setForm({ nama_perusahaan: '', nama_hc: '', email_hc: '' });
      setShowForm(false);
      fetchHC();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus HC ini?')) return;
    try {
      await api.delete(`/api/hc/${id}`);
      toast.success('HC dihapus');
      fetchHC();
    } catch { toast.error('Gagal hapus'); }
  };

  const handleKirimPembukaan = async () => {
    if (!confirm(`Kirim email pembukaan layanan ke ${hcList.length} HC?`)) return;
    setSending(true);
    try {
      const res = await api.post('/api/hc/kirim-pembukaan');
      toast.success(`Email terkirim ke ${res.data.berhasil} HC`);
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal kirim email'); }
    finally { setSending(false); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daftar HC</h1>
            <p className="text-gray-500 text-sm mt-1">{hcList.length} HC terdaftar</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleKirimPembukaan} disabled={sending} className="btn-secondary">
              {sending ? 'Mengirim...' : '📧 Kirim Email Pembukaan'}
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Tambah HC</button>
          </div>
        </div>

        {showForm && (
          <div className="card">
            <h3 className="font-semibold mb-4">Tambah HC Baru</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-3 gap-4">
              <div><label className="form-label">Perusahaan *</label><input className="form-input" required value={form.nama_perusahaan} onChange={e => setForm({...form, nama_perusahaan: e.target.value})} /></div>
              <div><label className="form-label">Nama HC *</label><input className="form-input" required value={form.nama_hc} onChange={e => setForm({...form, nama_hc: e.target.value})} /></div>
              <div><label className="form-label">Email HC *</label><input type="email" className="form-input" required value={form.email_hc} onChange={e => setForm({...form, email_hc: e.target.value})} /></div>
              <div className="col-span-3 flex gap-2">
                <button type="submit" className="btn-primary">Simpan</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          {loading ? <div className="text-center py-8 text-gray-400">Memuat...</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Perusahaan</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Nama HC</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {hcList.map(hc => (
                  <tr key={hc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{hc.nama_perusahaan}</td>
                    <td className="py-3 px-4">{hc.nama_hc}</td>
                    <td className="py-3 px-4 text-gray-500">{hc.email_hc}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleDelete(hc.id)} className="text-red-500 hover:text-red-700 text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
