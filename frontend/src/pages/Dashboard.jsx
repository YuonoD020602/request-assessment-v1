import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';


const STATUS_COLOR = {
  'Pending - Menunggu Review': 'bg-amber-100 text-amber-800 border border-amber-200',
  'Approved': 'bg-blue-100 text-blue-800 border border-blue-200',
  'Rejected': 'bg-red-100 text-red-700 border border-red-200',
  'Menunggu GR': 'bg-purple-100 text-purple-800 border border-purple-200',
  'GR Selesai - Menunggu Dokumen': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  'Dokumen Diterima': 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  'Psikotes Dijadwalkan': 'bg-violet-100 text-violet-800 border border-violet-200',
  'AC Dijadwalkan': 'bg-sky-100 text-sky-800 border border-sky-200',
  'Menunggu Presentasi': 'bg-orange-100 text-orange-800 border border-orange-200',
  'Laporan Dikirim': 'bg-teal-100 text-teal-800 border border-teal-200',
  'Selesai': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
};

const STATUS_ROW_ACCENT = {
  'Pending - Menunggu Review': 'border-l-amber-400',
  'Rejected': 'border-l-red-400',
  'Selesai': 'border-l-emerald-400',
};

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
  {
    key: 'total', label: 'Total', sub: 'Semua request',
    from: 'from-slate-600', to: 'to-slate-800', numCls: 'text-slate-800',
    iconBg: 'bg-slate-100', iconCls: 'text-slate-500',
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
  },
  {
    key: 'pending', label: 'Pending', sub: 'Menunggu review',
    from: 'from-amber-400', to: 'to-orange-500', numCls: 'text-amber-700',
    iconBg: 'bg-amber-50', iconCls: 'text-amber-500',
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  },
  {
    key: 'approved', label: 'Approved', sub: 'Disetujui',
    from: 'from-blue-500', to: 'to-blue-700', numCls: 'text-blue-700',
    iconBg: 'bg-blue-50', iconCls: 'text-blue-500',
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  },
  {
    key: 'proses', label: 'Proses', sub: 'Sedang berjalan',
    from: 'from-violet-500', to: 'to-purple-700', numCls: 'text-violet-700',
    iconBg: 'bg-violet-50', iconCls: 'text-violet-500',
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-2.3M20 15a9 9 0 01-15 2.3"/></svg>
  },
  {
    key: 'selesai', label: 'Selesai', sub: 'Laporan terkirim',
    from: 'from-emerald-500', to: 'to-teal-600', numCls: 'text-emerald-700',
    iconBg: 'bg-emerald-50', iconCls: 'text-emerald-500',
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
  },
  {
    key: 'ditolak', label: 'Ditolak', sub: 'Tidak disetujui',
    from: 'from-rose-500', to: 'to-red-600', numCls: 'text-rose-700',
    iconBg: 'bg-rose-50', iconCls: 'text-rose-500',
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kuotaMaks, setKuotaMaks] = useState(9);

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
  const kapasitasPct = kapasitasAktif != null ? Math.min((kapasitasAktif / kuotaMaks) * 100, 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 p-7 shadow-xl">
          {/* decorative blobs */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-indigo-400/10 rounded-full blur-xl" />
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">RACD AIHO · PT Astra International</p>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
              <p className="text-blue-100 text-sm mt-1.5">
                Selamat datang kembali, <span className="font-bold text-white">{user?.nama}</span> 👋
              </p>
            </div>
            {user?.role === 'pic_asesmen' && (
              <a href="/form-pengajuan" target="_blank"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-5 py-3 rounded-xl border border-white/25 transition-all shadow-lg hover:shadow-white/10">
                🔗 Link Form Pengajuan
              </a>
            )}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-6 gap-3">
          {STATS_CONFIG.map((s) => (
            <div key={s.key}
              className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-4 cursor-default group"
              onClick={() => s.key !== 'total' && setFilterStatus(
                s.key === 'pending' ? 'Pending - Menunggu Review' :
                s.key === 'approved' ? 'Approved' :
                s.key === 'selesai' ? 'Selesai' :
                s.key === 'ditolak' ? 'Rejected' : ''
              )}>
              {/* top color stripe */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.from} ${s.to}`} />
              {/* icon top-right */}
              <div className={`absolute top-4 right-4 w-7 h-7 ${s.iconBg} rounded-lg flex items-center justify-center ${s.iconCls} opacity-80 group-hover:opacity-100 transition-opacity`}>
                {s.svg}
              </div>
              {/* number */}
              <p className={`text-3xl font-extrabold ${s.numCls} leading-none mt-2`}>{stats[s.key]}</p>
              <p className="text-xs font-bold text-gray-700 mt-2">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Progress Bar Kapasitas ── */}
        {filterPeriode && filterPeriode !== '__none__' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-gray-800">Kapasitas Periode: <span className="text-blue-700">{filterPeriode}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Berdasarkan request aktif (bukan Rejected)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-gray-800">{Math.round(kapasitasPct)}<span className="text-base font-normal text-gray-400">%</span></p>
                <p className="text-xs text-gray-400">{kapasitasAktif} / {kuotaMaks} peserta</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all duration-700 ease-out relative overflow-hidden ${
                  kapasitasPct >= 100 ? 'bg-gradient-to-r from-red-400 to-rose-600' :
                  kapasitasPct >= 70  ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                        'bg-gradient-to-r from-emerald-400 to-teal-500'}`}
                style={{ width: `${kapasitasPct}%` }}>
                <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                {kapasitasPct >= 100 ? '⚠️ Kapasitas penuh' : `${kuotaMaks - kapasitasAktif} slot tersisa`}
              </p>
              <p className="text-xs text-gray-400">Kuota maksimal dapat diubah di Konfigurasi</p>
            </div>
          </div>
        )}

        {/* ── Filter + Tabel ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Filter Section */}
          <div className="px-6 py-5 border-b border-gray-50">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Filter & Pencarian</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-48">
                <label className="form-label text-xs">Cari Peserta / ID</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input className="form-input pl-9" placeholder="Nama peserta atau ID request..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="min-w-40">
                <label className="form-label text-xs">Periode AC</label>
                <select className="form-input" value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}>
                  <option value="">Semua Periode</option>
                  {periodeList.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__none__">Belum Ada Jadwal AC</option>
                </select>
              </div>
              <div className="min-w-44">
                <label className="form-label text-xs">Perusahaan</label>
                <select className="form-input" value={filterPerusahaan} onChange={e => setFilterPerusahaan(e.target.value)}>
                  <option value="">Semua Perusahaan</option>
                  {perusahaanList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="min-w-44">
                <label className="form-label text-xs">Status</label>
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
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                    ✕ Reset
                  </button>
                )}
                <button onClick={() => exportCSV(filtered, filterPeriode)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-semibold transition-colors shadow-sm">
                  ↓ Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Info bar */}
          <div className="px-6 py-2.5 bg-gradient-to-r from-gray-50/80 to-slate-50/50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Menampilkan <span className="font-bold text-gray-600">{filtered.length}</span> dari <span className="font-bold text-gray-600">{requests.length}</span> request
              {filterPeriode && filterPeriode !== '__none__' && <span className="ml-2 text-blue-600 font-semibold">· {filterPeriode}</span>}
            </p>
            {hasFilter && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                ⚡ Filter aktif
              </span>
            )}
          </div>

          {/* Tabel */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm font-medium">Memuat data...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">🔍</div>
              <p className="text-gray-600 font-semibold">Tidak ada data ditemukan</p>
              <p className="text-sm text-gray-400">Coba ubah filter atau reset pencarian</p>
              {hasFilter && (
                <button onClick={resetFilter} className="mt-1 text-sm text-blue-600 hover:text-blue-800 font-semibold underline">
                  Reset semua filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                    {['No','ID Request','Perusahaan','Nama Peserta','Jenis AC','Status','Tanggal AC','Pengajuan','Aksi'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-400 font-bold text-xs tracking-widest uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={r.id}
                      className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors border-l-2 ${STATUS_ROW_ACCENT[r.status] || 'border-l-transparent'}`}>
                      <td className="py-4 px-4 text-gray-300 text-xs font-semibold">{idx + 1}</td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg whitespace-nowrap">{r.id_request}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-xs font-medium">{r.nama_perusahaan}</td>
                      <td className="py-4 px-4">
                        <p className="text-gray-900 font-bold text-xs">{r.nama_peserta}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{r.jenis_assessment}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md whitespace-nowrap">{r.jenis_assessment}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs whitespace-nowrap">
                        {r.tanggal_ac
                          ? <span className="font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{r.tanggal_ac}</span>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Link to={`/request/${r.id_request}`}
                            className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shadow-sm">
                            Detail →
                          </Link>
                          {user?.role === 'pic_asesmen' && (
                            <button onClick={() => handleHapus(r.id_request)}
                              className="text-xs font-medium text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 border border-transparent px-2 py-1.5 rounded-lg transition-all">
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
