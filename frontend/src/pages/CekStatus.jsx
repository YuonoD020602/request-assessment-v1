import { useState } from 'react';
import api from '../utils/api';

export function CekStatus() {
  const [idRequest, setIdRequest] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCek = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/api/requests/status/${idRequest}`);
      setResult(res.data.data);
    } catch {
      setError('ID Request tidak ditemukan. Periksa kembali ID yang Anda masukkan.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Approved') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'Rejected') return 'text-red-600 bg-red-50 border-red-200';
    if (status === 'Selesai') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cek Status Request</h1>
          <p className="text-gray-500 text-sm mt-1">Masukkan ID Request yang Anda terima</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <form onSubmit={handleCek} className="flex gap-3">
            <input
              className="form-input flex-1"
              placeholder="Contoh: REQ-202506-001"
              value={idRequest}
              onChange={e => setIdRequest(e.target.value.toUpperCase())}
              required
            />
            <button type="submit" className="btn-primary px-6" disabled={loading}>
              {loading ? '...' : 'Cek'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="text-center">
              <p className="font-mono font-bold text-blue-700 text-lg">{result.id_request}</p>
              <div className={`mt-2 inline-block px-4 py-2 rounded-lg border font-semibold text-sm ${getStatusColor(result.status)}`}>
                {result.status}
              </div>
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Peserta</span>
                <span className="font-medium">{result.nama_peserta}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Perusahaan</span>
                <span className="font-medium">{result.nama_perusahaan}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Tanggal Daftar</span>
                <span className="font-medium">{new Date(result.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>

            {/* Link-link berdasarkan status */}
            {result.status === 'Approved' && (
              <div className="border-t pt-4">
                <p className="font-semibold text-sm text-gray-700 mb-3">✅ Pengajuan disetujui! Langkah selanjutnya:</p>
                <div className="space-y-2">
                  {result.url_zip_dokumen && (
                    <a href={result.url_zip_dokumen} target="_blank"
                      className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm hover:bg-blue-100">
                      📦 Download ZIP Dokumen
                    </a>
                  )}
                  <a href={`/form-dokumen?id=${result.id_request}`}
                    className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm hover:bg-green-100">
                    📤 Upload Dokumen Lanjutan
                  </a>
                </div>
              </div>
            )}

            {result.status === 'Rejected' && result.catatan_reject && (
              <div className="border-t pt-4">
                <p className="font-semibold text-sm text-gray-700 mb-2">Keterangan:</p>
                <div className="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">
                  {result.catatan_reject}
                </div>
              </div>
            )}

            {['Menunggu GR', 'GR Selesai - Menunggu Dokumen'].includes(result.status) && (
              <div className="border-t pt-4">
                <p className="font-semibold text-sm text-gray-700 mb-3">📋 Dokumen diperlukan:</p>
                <a href={`/form-dokumen?id=${result.id_request}`}
                  className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm hover:bg-green-100">
                  📤 Upload Dokumen Lanjutan
                </a>
              </div>
            )}

            {result.status === 'Selesai' && (
              <div className="border-t pt-4">
                <div className="bg-blue-50 rounded-lg p-3 text-blue-700 text-sm text-center">
                  🎉 Proses Assessment Center telah selesai. Laporan telah dikirim ke email Anda.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-6">
          <a href="/form-pengajuan" className="text-blue-600 hover:underline text-sm">
            ← Ajukan Request Baru
          </a>
        </div>
      </div>
    </div>
  );
}
