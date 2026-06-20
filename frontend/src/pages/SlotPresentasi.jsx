import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function SlotPresentasi() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tanggal: '', jam: '', lokasi: '' });
  const [saving, setSaving] = useState(false);

  const fetchSlots = () => {
    api.get('/api/slots')
      .then(res => setSlots(res.data.data || []))
      .catch(() => toast.error('Gagal memuat slot'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlots(); }, []);

  const handleTambah = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/slots', form);
      toast.success('Slot berhasil ditambahkan');
      setForm({ tanggal: '', jam: '', lokasi: '' });
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambah slot');
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async (slot) => {
    const msg = slot.status === 'Terpesan'
      ? `Slot ini sudah dipesan oleh ${slot.id_request}. Menghapus akan membatalkan booking dan mereset status request ke "AC Dijadwalkan". Lanjutkan?`
      : 'Hapus slot ini?';
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/api/slots/${slot.id}`);
      toast.success('Slot dihapus');
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus slot');
    }
  };

  const handleBebaskan = async (slot) => {
    if (!window.confirm(`Bebaskan slot ini dari ${slot.id_request}? Status request akan kembali ke "AC Dijadwalkan" dan slot menjadi Tersedia kembali.`)) return;
    try {
      await api.put(`/api/slots/${slot.id}/release`);
      toast.success('Slot dibebaskan');
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membebaskan slot');
    }
  };

  const linkPilih = `${window.location.origin}/pilih-slot`;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Slot Presentasi</h1>
          <p className="text-gray-500 text-sm mt-1">Tambah slot waktu yang tersedia untuk dipilih oleh HC</p>
        </div>

        {/* Link untuk HC */}
        <div className="card bg-blue-50 border border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-1">Link untuk HC (bagikan ke HC):</p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-blue-700 bg-white px-3 py-1 rounded border border-blue-200 flex-1">{linkPilih}</code>
            <button onClick={() => { navigator.clipboard.writeText(linkPilih); toast.success('Link disalin!'); }}
              className="text-sm text-blue-600 border border-blue-300 rounded px-3 py-1 hover:bg-blue-100">
              Salin
            </button>
          </div>
        </div>

        {/* Form tambah slot */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Tambah Slot Baru</h3>
          <form onSubmit={handleTambah} className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Tanggal *</label>
              <input type="date" className="form-input" required
                value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Jam *</label>
              <input type="time" className="form-input" required
                value={form.jam} onChange={e => setForm({ ...form, jam: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Lokasi / Link Meet</label>
              <input className="form-input" placeholder="Ruang Rapat / Link Zoom"
                value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} />
            </div>
            <div className="col-span-3">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menambahkan...' : '+ Tambah Slot'}
              </button>
            </div>
          </form>
        </div>

        {/* Daftar slot */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Daftar Slot</h3>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Memuat...</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Belum ada slot. Tambahkan slot di atas.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Tanggal</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Jam</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Lokasi</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">ID Request</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{slot.tanggal}</td>
                    <td className="py-2 px-3">{slot.jam} WIB</td>
                    <td className="py-2 px-3 text-gray-600">{slot.lokasi || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        slot.status === 'Tersedia'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>{slot.status}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-500 font-mono text-xs">{slot.id_request || '-'}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        {slot.status === 'Terpesan' && (
                          <button onClick={() => handleBebaskan(slot)}
                            className="text-orange-500 hover:text-orange-700 text-xs px-2 py-1 rounded hover:bg-orange-50">
                            Bebaskan
                          </button>
                        )}
                        <button onClick={() => handleHapus(slot)}
                          className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">
                          Hapus
                        </button>
                      </div>
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
