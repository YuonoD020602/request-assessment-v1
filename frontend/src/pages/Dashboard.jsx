import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  'Pending - Menunggu Review': 'badge-pending',
  'Approved': 'badge-approved',
  'Rejected': 'badge-rejected',
  'Ditunda - Kuota Penuh': 'badge-pending',
  'Menunggu GR': 'badge-process',
  'GR Selesai - Menunggu Dokumen': 'badge-process',
  'Dokumen Diterima': 'badge-process',
  'Menunggu Presentasi': 'badge-process',
  'Laporan Dikirim': 'badge-approved',
  'Selesai': 'badge-done',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/requests');
      setRequests(res.data.data || []);
    } catch (err) {
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
    } catch (err) {
      toast.error('Gagal menghapus request');
    }
  };

  const filtered = filter ? requests.filter(r => r.status === filter) : requests;

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Pending - Menunggu Review').length,
    proses: requests.filter(r => ['Approved','Menunggu GR','GR Selesai - Menunggu Dokumen','Dokumen Diterima','Menunggu Presentasi'].includes(r.status)).length,
    selesai: requests.filter(r => ['Laporan Dikirim','Selesai'].includes(r.status)).length,
  };

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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Request', value: stats.total, color: 'text-gray-900' },
            { label: 'Menunggu Review', value: stats.pending, color: 'text-yellow-600' },
            { label: 'Sedang Diproses', value: stats.proses, color: 'text-blue-600' },
            { label: 'Selesai', value: stats.selesai, color: 'text-green-600' },
          ].map((s, i) => (
            <div key={i} className="card">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter & Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Daftar Request</h2>
            <select className="form-input w-auto text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="Pending - Menunggu Review">Menunggu Review</option>
              <option value="Approved">Approved</option>
              <option value="Menunggu GR">Menunggu GR</option>
              <option value="GR Selesai - Menunggu Dokumen">Menunggu Dokumen</option>
              <option value="Dokumen Diterima">Dokumen Diterima</option>
              <option value="Menunggu Presentasi">Menunggu Presentasi</option>
              <option value="Selesai">Selesai</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Belum ada request</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">ID Request</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Perusahaan</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Peserta</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Jenis</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-blue-700 font-semibold">{r.id_request}</td>
                      <td className="py-3 px-4 text-gray-700">{r.nama_perusahaan}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{r.nama_peserta}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{r.jenis_assessment}</td>
                      <td className="py-3 px-4">
                        <span className={STATUS_BADGE[r.status] || 'badge-pending'}>{r.status}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Link to={`/request/${r.id_request}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                            Detail →
                          </Link>
                          <button onClick={() => handleHapus(r.id_request)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs">
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
