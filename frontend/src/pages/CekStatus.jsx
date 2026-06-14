// CekStatus.jsx
import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function CekStatus() {
  const [idRequest, setIdRequest] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCek = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get(`/api/requests/status/${idRequest.trim().toUpperCase()}`);
      setData(res.data.data);
    } catch (err) {
      toast.error('ID Request tidak ditemukan');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    'Pending - Menunggu Review': 'text-yellow-600 bg-yellow-50',
    'Approved': 'text-green-600 bg-green-50',
    'Rejected': 'text-red-600 bg-red-50',
    'Selesai': 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cek Status Request</h1>
          <p className="text-gray-500 text-sm mt-1">Masukkan ID Request yang Anda terima</p>
        </div>

        <div className="card mb-4">
          <form onSubmit={handleCek} className="flex gap-2">
            <input className="form-input flex-1" placeholder="REQ-202506-001"
              value={idRequest} onChange={e => setIdRequest(e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '...' : 'Cek'}
            </button>
          </form>
        </div>

        {data && (
          <div className="card">
            <div className="text-center mb-4">
              <p className="font-mono text-lg font-bold text-blue-700">{data.id_request}</p>
            </div>
            <div className={`rounded-lg p-4 mb-4 text-center ${statusColor[data.status] || 'text-blue-600 bg-blue-50'}`}>
              <p className="font-semibold">{data.status}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Peserta</span>
                <span className="font-medium">{data.nama_peserta}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Perusahaan</span>
                <span className="font-medium">{data.nama_perusahaan}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Tanggal Daftar</span>
                <span className="font-medium">{new Date(data.created_at).toLocaleDateString('id-ID')}</span>
              </div>
              {data.catatan_reject && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <p className="text-red-600 text-sm font-medium">Catatan: {data.catatan_reject}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          <a href="/form-pengajuan" className="text-blue-600 hover:underline">← Ajukan Request Baru</a>
        </p>
      </div>
    </div>
  );
}
