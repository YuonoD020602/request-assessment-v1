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

  const tersedia = slots.filter(s => s.status === 'Tersedia').length;
  const terpesan = slots.filter(s => s.status === 'Terpesan').length;

  return (
    <Layout>
      <div className="space-y-6">

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl p-7 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest mb-1">Manajemen Jadwal</p>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Slot Presentasi</h1>
              <p className="text-slate-300 text-sm mt-1.5">Tambah slot waktu presentasi hasil AC untuk dipilih oleh HC</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center bg-white/10 rounded-xl px-4 py-3">
                <p className="text-2xl font-extrabold text-emerald-300">{tersedia}</p>
                <p className="text-xs text-slate-300 mt-0.5">Tersedia</p>
              </div>
              <div className="text-center bg-white/10 rounded-xl px-4 py-3">
                <p className="text-2xl font-extrabold text-amber-300">{terpesan}</p>
                <p className="text-xs text-slate-300 mt-0.5">Terpesan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Link untuk HC */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-indigo-50 border-b border-indigo-100">
            <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            </div>
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Link Pemilihan Slot untuk HC</p>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <code className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl flex-1 font-mono">{linkPilih}</code>
            <button onClick={() => { navigator.clipboard.writeText(linkPilih); toast.success('Link disalin!'); }}
              className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-xl px-4 py-2 transition-colors whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Salin
            </button>
          </div>
        </div>

        {/* Form tambah slot */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            </div>
            <h3 className="font-bold text-gray-800 text-sm">Tambah Slot Baru</h3>
          </div>
          <form onSubmit={handleTambah} className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tanggal *</label>
                <input type="date" className="form-input" required
                  value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Jam *</label>
                <input type="time" className="form-input" required
                  value={form.jam} onChange={e => setForm({ ...form, jam: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Lokasi / Link Meet</label>
                <input className="form-input" placeholder="Ruang Rapat / Link Zoom"
                  value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
              {saving ? 'Menambahkan...' : 'Tambah Slot'}
            </button>
          </form>
        </div>

        {/* Daftar slot */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Daftar Slot</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">{slots.length} total slot</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Memuat slot...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
              <p className="text-gray-500 font-semibold text-sm">Belum ada slot</p>
              <p className="text-xs text-gray-400">Tambahkan slot presentasi di atas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Tanggal', 'Jam', 'Lokasi', 'Status', 'ID Request', ''].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-gray-400 font-bold text-xs tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${slot.status === 'Terpesan' ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${slot.status === 'Tersedia' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                          <svg className={`w-4 h-4 ${slot.status === 'Tersedia' ? 'text-emerald-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        </div>
                        <span className="font-bold text-gray-800 text-xs">{slot.tanggal}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-600 font-medium text-xs">{slot.jam} WIB</td>
                    <td className="py-4 px-5 text-gray-500 text-xs">{slot.lokasi || <span className="text-gray-200">—</span>}</td>
                    <td className="py-4 px-5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        slot.status === 'Tersedia'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>{slot.status}</span>
                    </td>
                    <td className="py-4 px-5">
                      {slot.id_request
                        ? <span className="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">{slot.id_request}</span>
                        : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex gap-1.5">
                        {slot.status === 'Terpesan' && (
                          <button onClick={() => handleBebaskan(slot)}
                            className="text-xs font-semibold text-amber-600 hover:text-white hover:bg-amber-500 border border-amber-200 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-all">
                            Bebaskan
                          </button>
                        )}
                        <button onClick={() => handleHapus(slot)}
                          className="text-xs font-medium text-red-400 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-500 px-3 py-1.5 rounded-lg transition-all">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
