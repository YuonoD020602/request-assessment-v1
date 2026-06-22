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
  const [hasilPengiriman, setHasilPengiriman] = useState(null);
  const [logPembukaan, setLogPembukaan] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [showJadwalForm, setShowJadwalForm] = useState(false);
  const [jadwalBatch, setJadwalBatch] = useState({
    pendaftaran: '', getting_requirement: '', pengisian_form: '',
    online_test: '', pelaksanaan_ac: '', pemaparan: ''
  });

  useEffect(() => { fetchHC(); fetchLog(); }, []);

  const fetchHC = async () => {
    try {
      const res = await api.get('/api/hc');
      setHcList(res.data.data || []);
    } catch { toast.error('Gagal memuat data HC'); }
    finally { setLoading(false); }
  };

  const fetchLog = async () => {
    try {
      const res = await api.get('/api/hc/log-pembukaan');
      setLogPembukaan(res.data.data || []);
    } catch { }
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

  const handleBukaJadwalForm = () => {
    setShowJadwalForm(true);
  };

  const handleKirimPembukaan = async () => {
    if (!confirm(`Kirim email pembukaan layanan ke ${hcList.length} HC?`)) return;
    setSending(true);
    setHasilPengiriman(null);
    try {
      const res = await api.post('/api/hc/kirim-pembukaan', { jadwal_batch: jadwalBatch });
      const { berhasil, gagal, total, gagalList } = res.data;
      setHasilPengiriman({ berhasil, gagal, total, gagalList });
      setShowJadwalForm(false);
      fetchLog();
      if (gagal === 0) {
        toast.success(`Email berhasil dikirim ke semua ${berhasil} HC`);
      } else if (berhasil > 0) {
        toast(`${berhasil} berhasil, ${gagal} gagal dari ${total} HC`, { icon: '⚠️' });
      } else {
        toast.error(`Semua email gagal terkirim (${gagal} HC)`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal kirim email');
    } finally {
      setSending(false);
    }
  };

  const initials = (nama) => nama ? nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const avatarColors = ['from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600', 'from-cyan-500 to-blue-600'];

  return (
    <Layout>
      <div className="space-y-6">

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl p-7 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #4f46e5 100%)' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Manajemen HC</p>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Daftar HC</h1>
              <p className="text-blue-100 text-sm mt-1.5">
                <span className="font-bold text-white">{hcList.length}</span> HC terdaftar di sistem
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBukaJadwalForm} disabled={sending || hcList.length === 0}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition-all disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                {sending ? 'Mengirim...' : 'Kirim Email Pembukaan'}
              </button>
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-white text-blue-700 text-sm font-bold px-4 py-2.5 rounded-xl shadow hover:shadow-md transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                Tambah HC
              </button>
            </div>
          </div>
        </div>

        {/* Form Jadwal Rencana untuk Email Pembukaan */}
        {showJadwalForm && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Jadwal Rencana Pelaksanaan</p>
                  <p className="text-xs text-gray-400">Isi rentang waktu yang akan ditampilkan di email pembukaan</p>
                </div>
              </div>
              <button onClick={() => setShowJadwalForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'pendaftaran', label: 'Pendaftaran Potential Review & Profiling' },
                  { key: 'getting_requirement', label: 'Pelaksanaan Getting Requirement' },
                  { key: 'pengisian_form', label: 'Pengisian Form Data Karyawan dan Form STAR' },
                  { key: 'online_test', label: 'Pelaksanaan Online Test Ignite-Spark' },
                  { key: 'pelaksanaan_ac', label: 'Pelaksanaan Assessment Center' },
                  { key: 'pemaparan', label: 'Pemaparan Hasil Assessment Center' },
                ].map(item => (
                  <div key={item.key}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{item.label}</label>
                    <input className="form-input text-sm" placeholder="contoh: 1 - 15 Juli 2026"
                      value={jadwalBatch[item.key]}
                      onChange={e => setJadwalBatch({...jadwalBatch, [item.key]: e.target.value})} />
                  </div>
                ))}
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                <strong>Info:</strong> Field ini bersifat teks bebas (bukan date picker) agar bisa diisi rentang waktu seperti "1 - 15 Juli 2026". Jadwal ini hanya digunakan untuk tabel di email pembukaan.
              </div>
              <div className="flex gap-2">
                <button onClick={handleKirimPembukaan} disabled={sending}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  {sending ? 'Mengirim...' : `Kirim ke ${hcList.length} HC`}
                </button>
                <button onClick={() => setShowJadwalForm(false)} className="text-sm text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl font-medium transition-colors">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hasil Pengiriman Alert */}
        {hasilPengiriman && (
          <div className={`rounded-2xl border p-5 ${hasilPengiriman.gagal === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${hasilPengiriman.gagal === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <svg className={`w-5 h-5 ${hasilPengiriman.gagal === 0 ? 'text-emerald-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {hasilPengiriman.gagal === 0
                    ? <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    : <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>}
                </svg>
              </div>
              <div className="flex-1">
                <p className={`font-bold text-sm mb-1 ${hasilPengiriman.gagal === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {hasilPengiriman.gagal === 0 ? 'Semua email berhasil dikirim' : 'Pengiriman selesai dengan beberapa gagal'}
                </p>
                <div className="flex gap-5 text-sm">
                  <span className="text-emerald-700 font-medium">Berhasil: <strong>{hasilPengiriman.berhasil}</strong></span>
                  <span className="text-red-600 font-medium">Gagal: <strong>{hasilPengiriman.gagal}</strong></span>
                  <span className="text-gray-500">Total: {hasilPengiriman.total}</span>
                </div>
                {hasilPengiriman.gagalList?.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-red-600">
                    {hasilPengiriman.gagalList.map((g, i) => <li key={i}>• {g.nama} ({g.email}) — {g.alasan}</li>)}
                  </ul>
                )}
              </div>
              <button onClick={() => setHasilPengiriman(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Log Pembukaan */}
        {logPembukaan.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <p className="text-sm font-bold text-gray-800">Riwayat Pengiriman Email Pembukaan</p>
              </div>
              <button onClick={() => setShowLog(!showLog)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                {showLog ? 'Sembunyikan' : `Lihat (${logPembukaan.length} entri)`}
              </button>
            </div>
            {showLog && (
              <div className="px-6 py-4 space-y-2">
                {logPembukaan.map((log, i) => {
                  const tgl = new Date(log.created_at);
                  const label = tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                  const jam = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="flex-1 text-gray-700 text-xs">{log.detail}</p>
                      <div className="text-xs text-gray-400 text-right flex-shrink-0">
                        <p className="font-medium">{label}</p>
                        <p>{jam} WIB</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Form Tambah HC */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-blue-50/40">
              <p className="text-sm font-bold text-gray-800">Tambah HC Baru</p>
            </div>
            <form onSubmit={handleAdd} className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Perusahaan *</label>
                  <input className="form-input" required placeholder="PT. Example" value={form.nama_perusahaan} onChange={e => setForm({...form, nama_perusahaan: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nama HC *</label>
                  <input className="form-input" required placeholder="Nama lengkap HC" value={form.nama_hc} onChange={e => setForm({...form, nama_hc: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email HC *</label>
                  <input type="email" className="form-input" required placeholder="email@perusahaan.com" value={form.email_hc} onChange={e => setForm({...form, email_hc: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  Simpan HC
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl font-medium transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabel HC */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Memuat data...</p>
            </div>
          ) : hcList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <p className="text-gray-600 font-semibold">Belum ada HC terdaftar</p>
              <p className="text-sm text-gray-400">Klik "Tambah HC" untuk menambahkan</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                  {['No', 'Perusahaan', 'Nama HC', 'Email', 'Aksi'].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-gray-400 font-bold text-xs tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hcList.map((hc, idx) => (
                  <tr key={hc.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-5 text-gray-300 text-xs font-semibold">{idx + 1}</td>
                    <td className="py-4 px-5">
                      <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">{hc.nama_perusahaan}</span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-bold">{initials(hc.nama_hc)}</span>
                        </div>
                        <span className="font-semibold text-gray-800 text-sm">{hc.nama_hc}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-500 text-xs">{hc.email_hc}</td>
                    <td className="py-4 px-5">
                      <button onClick={() => handleDelete(hc.id)}
                        className="text-xs font-medium text-red-400 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-500 px-3 py-1.5 rounded-lg transition-all">
                        Hapus
                      </button>
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
