import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  'Pending - Menunggu Review': 'badge-pending',
  'Approved': 'badge-approved',
  'Rejected': 'badge-rejected',
  'Menunggu GR': 'badge-process',
  'GR Selesai - Menunggu Dokumen': 'badge-process',
  'Dokumen Diterima': 'badge-process',
  'Menunggu Presentasi': 'badge-process',
  'Laporan Dikirim': 'badge-approved',
  'Selesai': 'badge-done',
};

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

  // Daftar periode unik dari tanggal_ac
  const periodeList = useMemo(() => {
    const set = new Set();
    requests.forEach(r => { if (r.tanggal_ac) set.add(toPeriode(r.tanggal_ac)); });
    return [...set].sort();
  }, [requests]);

  // Daftar perusahaan unik
  const perusahaanList = useMemo(() => {
    const set = new Set(requests.map(r => r.nama_perusahaan).filter(Boolean));
    return [...set].sort();
  }, [requests]);

  // Data terfilter
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

  // Stats dari data terfilter (atau semua jika tidak ada filter)
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

  // Progress bar kapasitas (hanya saat filter periode aktif, bukan __none__)
  const kapasitasAktif = (filterPeriode && filterPeriode !== '__none__')
    ? requests.filter(r => toPeriode(r.tanggal_ac) === filterPeriode && r.status !== 'Rejected').length
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Selamat datang, {user?.nama}</p>
          </div>
          {user?.role === 'pic_asesmen' && (
            <div className="flex gap-3">
              <a href="/form-pengajuan" target="_blank"
                className="btn-secondary text-sm flex items-center gap-2">
                🔗 Link Form Pengajuan
              </a>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-50' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Approved', value: stats.approved, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Proses', value: stats.proses, color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Selesai', value: stats.selesai, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Ditolak', value: stats.ditolak, color: 'text-red-700', bg: 'bg-red-50' },
          ].map((s, i) => (
            <div key={i} className={`card ${s.bg} border border-gray-100`}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress Bar Kapasitas (hanya saat filter periode) */}
        {filterPeriode && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Kapasitas Periode: <strong>{filterPeriode}</strong></p>
              <p className="text-sm text-gray-500">{kapasitasAktif} / {kuotaMaks} peserta</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${kapasitasAktif >= kuotaMaks ? 'bg-red-500' : kapasitasAktif >= kuotaMaks * 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((kapasitasAktif / kuotaMaks) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {kapasitasAktif >= kuotaMaks ? '⚠ Kapasitas penuh' : `${kuotaMaks - kapasitasAktif} slot tersisa`}
              {' · '}Kuota maksimal dapat diubah di Konfigurasi
            </p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="card">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            {/* Search */}
            <div className="flex-1 min-w-48">
              <label className="form-label">Cari Peserta / ID</label>
              <input className="form-input" placeholder="Nama peserta atau ID request..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Filter Periode */}
            <div className="min-w-40">
              <label className="form-label">Periode AC</label>
              <select className="form-input" value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}>
                <option value="">Semua Periode</option>
                {periodeList.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__none__">Belum Ada Jadwal AC</option>
              </select>
            </div>

            {/* Filter Perusahaan */}
            <div className="min-w-44">
              <label className="form-label">Perusahaan</label>
              <select className="form-input" value={filterPerusahaan} onChange={e => setFilterPerusahaan(e.target.value)}>
                <option value="">Semua Perusahaan</option>
                {perusahaanList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Filter Status */}
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

            {/* Tombol aksi */}
            <div className="flex gap-2">
              {hasFilter && (
                <button onClick={resetFilter}
                  className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Reset
                </button>
              )}
              <button onClick={() => exportCSV(filtered, filterPeriode)}
                className="px-3 py-2 text-sm text-green-700 border border-green-200 rounded-lg hover:bg-green-50 font-medium">
                ↓ Export CSV
              </button>
            </div>
          </div>

          {/* Info jumlah hasil */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              Menampilkan <strong>{filtered.length}</strong> dari <strong>{requests.length}</strong> request
              {filterPeriode && filterPeriode !== '__none__' && <span className="ml-1 text-blue-600">· {filterPeriode}</span>}
            </p>
          </div>

          {/* Tabel */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg mb-1">Tidak ada data</p>
              <p className="text-sm">Coba ubah filter atau reset pencarian</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">No</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">ID Request</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">Perusahaan</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">Nama Peserta</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">Jenis AC</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">Status</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">Tanggal AC</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">Pengajuan</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-xs text-blue-700 font-semibold whitespace-nowrap">{r.id_request}</td>
                      <td className="py-3 px-3 text-gray-700 text-xs">{r.nama_perusahaan}</td>
                      <td className="py-3 px-3 text-gray-900 font-medium text-xs">{r.nama_peserta}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs">{r.jenis_assessment}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">
                        {r.tanggal_ac ? r.tanggal_ac : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/request/${r.id_request}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs whitespace-nowrap">
                            Detail →
                          </Link>
                          <button onClick={() => handleHapus(r.id_request)}
                            className="text-red-400 hover:text-red-600 font-medium text-xs">
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
