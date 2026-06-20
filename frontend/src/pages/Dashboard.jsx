import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';


const STATUS_COLOR = {
  'Pending - Menunggu Review': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-blue-100 text-blue-800',
  'Rejected': 'bg-red-100 text-red-700',
  'Menunggu GR': 'bg-purple-100 text-purple-800',
  'GR Selesai - Menunggu Dokumen': 'bg-indigo-100 text-indigo-800',
  'Dokumen Diterima': 'bg-cyan-100 text-cyan-800',
  'Psikotes Dijadwalkan': 'bg-violet-100 text-violet-800',
  'AC Dijadwalkan': 'bg-sky-100 text-sky-800',
  'Menunggu Presentasi': 'bg-orange-100 text-orange-800',
  'Laporan Dikirim': 'bg-teal-100 text-teal-800',
  'Selesai': 'bg-green-100 text-green-800',
};

// Format tanggal_ac "2026-07-15" → "Juli 2026"
const toPeriode = (tgl) => {
  if (!tgl) return null;
  const d = new Date(tgl);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const exportCSV = (data, periode) => {
  const header = ['ID Request', 'Perusahaan', 'PIC HC', 'Nama Peserta', 'Jenis Assessment', 'Status', 'Tanggal AC', 'Tanggal Pengajuan'];
  const rows = data.map(r => [
    r.id_request, r.nama_perusahaan, r.pic_hc, r.nama_peserta,
    r.jenis_assessment, r.status,
    r.tanggal_ac || '-',
    new Date(r.created_at).toLocaleDateString('id-ID')
  ]);
  const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const periodeLabel = !periode ? 'semua' : periode === '__none__' ? 'belum-dijadwalkan' : periode.replace(/\s+/g, '_');
  a.download = `Request_AC_${periodeLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const STATS_CONFIG = [
  { key: 'total',   label: 'Total Request', icon: '📋', gradient: 'from-slate-500 to-slate-700',   ring: 'ring-slate-200' },
  { key: 'pending', label: 'Pending',        icon: '⏳', gradient: 'from-amber-400 to-orange-500', ring: 'ring-amber-200' },
  { key: 'approved',label: 'Approved',       icon: '✅', gradient: 'from-blue-500 to-blue-700',    ring: 'ring-blue-200' },
  { key: 'proses',  label: 'Dalam Proses',   icon: '⚙️', gradient: 'from-violet-500 to-purple-700',ring: 'ring-violet-200' },
  { key: 'selesai', label: 'Selesai',        icon: '🏆', gradient: 'from-emerald-500 to-green-700',ring: 'ring-emerald-200' },
  { key: 'ditolak', label: 'Ditolak',        icon: '❌', gradient: 'from-rose-400 to-red-600',     ring: 'ring-rose-200' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kuotaMaks, setKuotaMaks] = useState(9);

  // Filter state
  const [filterPeriode, setFilterPeriode] = useState('');
  const [filterPerusahaan, setFilterPerusahaan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRequests();
    api.get('/api/config').then(res => {
      const cfg = res.data.data || {};
      if (cfg.kuota_maks) setKuotaMaks(parseInt(cfg.kuota_maks) || 9);
    }).catch(() => toast.error('Gagal memuat konfigurasi kuota'));
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/requests');
      setRequests(res.data.data || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleHapus = async (idRequest) => {
    if (!window.confirm(`Hapus request ${idRequest}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/api/requests/${idRequest}`);
      toast.success('Request berhasil dihapus');
      fetchRequests();
    } catch {
      toast.error('Gagal menghapus request');
    }
  };

  const periodeList = useMemo(() => {
    const set = new Set();
    requests.forEach(r => { if (r.tanggal_ac) set.add(toPeriode(r.tanggal_ac)); });
    return [...set].sort();
  }, [requests]);

  const perusahaanList = useMemo(() => {
    const set = new Set(requests.map(r => r.nama_perusahaan).filter(Boolean));
    return [...set].sort();
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterPeriode) {
        if (filterPeriode === '__none__') { if (r.tanggal_ac) return false; }
        else if (toPeriode(r.tanggal_ac) !== filterPeriode) return false;
      }
      if (filterPerusahaan && r.nama_perusahaan !== filterPerusahaan) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.nama_peserta?.toLowerCase().includes(q) && !r.id_request?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [requests, filterPeriode, filterPerusahaan, filterStatus, search]);

  const base = (filterPeriode || filterPerusahaan || filterStatus || search) ? filtered : requests;
  const stats = {
    total: base.length,
    pending: base.filter(r => r.status === 'Pending - Menunggu Review').length,
    approved: base.filter(r => r.status === 'Approved').length,
    proses: base.filter(r => ['Menunggu GR','GR Selesai - Menunggu Dokumen','Dokumen Diterima','Psikotes Dijadwalkan','AC Dijadwalkan','Menunggu Presentasi'].includes(r.status)).length,
    selesai: base.filter(r => ['Laporan Dikirim','Selesai'].includes(r.status)).length,
    ditolak: base.filter(r => r.status === 'Rejected').length,
  };

  const hasFilter = filterPeriode || filterPerusahaan || filterStatus || search;
  const resetFilter = () => { setFilterPeriode(''); setFilterPerusahaan(''); setFilterStatus(''); setSearch(''); };

  const kapasitasAktif = (filterPeriode && filterPeriode !== '__none__')
    ? requests.filter(r => toPeriode(r.tanggal_ac) === filterPeriode && r.status !== 'Rejected').length
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-blue-100 text-sm mt-1">Selamat datang, <span className="font-semibold text-white">{user?.nama}</span> 👋</p>
            </div>
            {user?.role === 'pic_asesmen' && (
              <a href="/form-pengajuan" target="_blank"
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur text-white text-sm font-medium px-4 py-2.5 rounded-xl border border-white/30 transition-colors">
                🔗 Link Form Pengajuan
              </a>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-3">
          {STATS_CONFIG.map((s) => (
            <div key={s.key}
              className={`relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm p-4 ring-1 ${s.ring}`}>
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${s.gradient}`} />
              <p className="text-xs text-gray-500 font-medium mb-1 ml-1">{s.label}</p>
              <div className="flex items-end gap-2 ml-1">
                <p className="text-2xl font-bold text-gray-900">{stats[s.key]}</p>
                <span className="text-lg mb-0.5">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar Kapasitas */}
        {filterPeriode && filterPeriode !== '__none__' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <p className="text-sm font-semibold text-gray-800">Kapasitas Periode: <span className="text-blue-700">{filterPeriode}</span></p>
              </div>
              <p className="text-sm font-bold text-gray-700">{kapasitasAktif} / {kuotaMaks} <span className="font-normal text-gray-400">peserta</span></p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${kapasitasAktif >= kuotaMaks ? 'bg-gradient-to-r from-red-400 to-red-600' : kapasitasAktif >= kuotaMaks * 0.7 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                style={{ width: `${Math.min((kapasitasAktif / kuotaMaks) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {kapasitasAktif >= kuotaMaks ? '⚠️ Kapasitas penuh' : `${kuotaMaks - kapasitasAktif} slot tersisa`}
              {' · '}Kuota maksimal dapat diubah di Konfigurasi
            </p>
          </div>
        )}

        {/* Filter Bar + Tabel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Filter Section */}
          <div className="p-5 border-b border-gray-50">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-48">
                <label className="form-label">🔍 Cari Peserta / ID</label>
                <input className="form-input" placeholder="Nama peserta atau ID request..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="min-w-40">
                <label className="form-label">Periode AC</label>
                <select className="form-input" value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}>
                  <option value="">Semua Periode</option>
                  {periodeList.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__none__">Belum Ada Jadwal AC</option>
                </select>
              </div>
              <div className="min-w-44">
                <label className="form-label">Perusahaan</label>
                <select className="form-input" value={filterPerusahaan} onChange={e => setFilterPerusahaan(e.target.value)}>
                  <option value="">Semua Perusahaan</option>
                  {perusahaanList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="min-w-44">
                <label className="form-label">Status</label>
                <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="Pending - Menunggu Review">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Menunggu GR">Menunggu GR</option>
                  <option value="GR Selesai - Menunggu Dokumen">Menunggu Dokumen</option>
                  <option value="Dokumen Diterima">Dokumen Diterima</option>
                  <option value="Psikotes Dijadwalkan">Psikotes Dijadwalkan</option>
                  <option value="AC Dijadwalkan">AC Dijadwalkan</option>
                  <option value="Menunggu Presentasi">Menunggu Presentasi</option>
                  <option value="Laporan Dikirim">Laporan Dikirim</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="flex gap-2">
                {hasFilter && (
                  <button onClick={resetFilter}
                    className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    ✕ Reset
                  </button>
                )}
                <button onClick={() => exportCSV(filtered, filterPeriode)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-medium transition-colors">
                  ↓ Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Hasil info bar */}
          <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Menampilkan <span className="font-semibold text-gray-700">{filtered.length}</span> dari <span className="font-semibold text-gray-700">{requests.length}</span> request
              {filterPeriode && filterPeriode !== '__none__' && <span className="ml-2 text-blue-600 font-medium">· {filterPeriode}</span>}
            </p>
            {hasFilter && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Filter aktif</span>}
          </div>

          {/* Tabel */}
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Memuat data...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-600 font-medium mb-1">Tidak ada data ditemukan</p>
              <p className="text-sm text-gray-400">Coba ubah filter atau reset pencarian</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">No</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">ID Request</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">Perusahaan</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">Nama Peserta</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">Jenis AC</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">Tanggal AC</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">Pengajuan</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs tracking-wide uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="py-3.5 px-4 text-gray-300 text-xs font-medium">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-md whitespace-nowrap">{r.id_request}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs font-medium">{r.nama_perusahaan}</td>
                      <td className="py-3.5 px-4 text-gray-900 font-semibold text-xs">{r.nama_peserta}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md whitespace-nowrap">{r.jenis_assessment}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">
                        {r.tanggal_ac ? <span className="font-medium text-gray-700">{r.tanggal_ac}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/request/${r.id_request}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                            Detail →
                          </Link>
                          {user?.role === 'pic_asesmen' && (
                            <button onClick={() => handleHapus(r.id_request)}
                              className="text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                              Hapus
                            </button>
                          )}
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
