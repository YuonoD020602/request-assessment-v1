import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export function FormDokumen() {
  const [searchParams] = useSearchParams();
  const idRequest = searchParams.get('id');

  const [form, setForm] = useState({ link_form_potrev: '', link_data_karyawan: '', link_form_star: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jadwal, setJadwal] = useState(null);
  const [loadingJadwal, setLoadingJadwal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/fase4/dokumen', { id_request: idRequest, ...form });
      setSubmitted(true);
      fetchJadwal();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengirim dokumen. Periksa ID Request dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchJadwal = async () => {
    if (!idRequest) return;
    setLoadingJadwal(true);
    try {
      const res = await api.get(`/api/requests/status/${idRequest}`);
      setJadwal(res.data.data);
    } catch {
      // jadwal belum tersedia
    } finally {
      setLoadingJadwal(false);
    }
  };

  useEffect(() => {
    if (submitted) fetchJadwal();
  }, [submitted]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Dokumen Lanjutan</h1>
          <p className="text-sm text-gray-500 mt-1">RACD AIHO – PT Astra International</p>
        </div>

        {!idRequest ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 text-sm">
            <p className="font-semibold mb-1">Link tidak valid</p>
            <p>ID Request tidak ditemukan. Pastikan Anda membuka link yang dikirim melalui email approval.</p>
            <a href="/cek-status" className="mt-3 inline-block text-blue-600 hover:underline text-xs">← Cek Status Request</a>
          </div>
        ) : !submitted ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <p className="font-medium">ID Request: <span className="font-mono">{idRequest}</span></p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Link Google Drive – Form Potential Review *</label>
                <input className="form-input" placeholder="https://drive.google.com/..." required
                  value={form.link_form_potrev} onChange={e => setForm({...form, link_form_potrev: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Link Google Drive – Data Karyawan *</label>
                <input className="form-input" placeholder="https://drive.google.com/..." required
                  value={form.link_data_karyawan} onChange={e => setForm({...form, link_data_karyawan: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Link Google Drive – Form STAR *</label>
                <input className="form-input" placeholder="https://drive.google.com/..." required
                  value={form.link_form_star} onChange={e => setForm({...form, link_form_star: e.target.value})} />
              </div>
              {error && <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600">{error}</div>}
              <button type="submit" className="btn-primary w-full" disabled={loading || !idRequest}>
                {loading ? 'Mengirim...' : 'Kirim Dokumen'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sukses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Dokumen Terkirim!</h2>
              <p className="text-gray-500 text-sm mb-4">Tim RACD AIHO akan segera memproses dokumen Anda.</p>

              {/* Tombol Cek Jadwal */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-3">
                <p className="font-medium mb-1">📌 Simpan ID Request Anda:</p>
                <p className="font-mono text-lg font-bold text-blue-800">{idRequest}</p>
              </div>
              <a href={`/cek-status?id=${idRequest}`}
                className="inline-block w-full text-center bg-blue-700 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors">
                🔍 Cek Jadwal Kapan Saja →
              </a>
              <p className="text-xs text-gray-400 mt-2">Bookmark halaman tersebut untuk pantau jadwal Anda</p>
            </div>

            {/* Jadwal Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">📅 Jadwal Selanjutnya</h3>
                <button onClick={fetchJadwal} disabled={loadingJadwal}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 rounded-lg px-3 py-1">
                  {loadingJadwal ? '⏳ Memuat...' : '🔄 Refresh'}
                </button>
              </div>

              {loadingJadwal ? (
                <div className="text-center py-4 text-gray-400 text-sm">Memuat jadwal...</div>
              ) : jadwal ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg border ${jadwal.tanggal_psikotes ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">📝 JADWAL PSIKOTES</p>
                    {jadwal.tanggal_psikotes ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-gray-900">📅 {jadwal.tanggal_psikotes} pukul {jadwal.jam_psikotes} WIB</p>
                        <p className="text-blue-600 text-xs">Cek email dari astra.recruitment@ai.astra.co.id</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Belum dijadwalkan</p>
                    )}
                  </div>

                  <div className={`p-3 rounded-lg border ${jadwal.tanggal_ac && jadwal.jam_ac ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">🏢 JADWAL ASSESSMENT CENTER</p>
                    {jadwal.tanggal_ac && jadwal.jam_ac ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-gray-900">📅 {jadwal.tanggal_ac} pukul {jadwal.jam_ac} WIB</p>
                        {jadwal.lokasi_ac && (
                          <p className="text-gray-600 text-xs">📍 {jadwal.lokasi_ac}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Belum dijadwalkan</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">Gagal memuat jadwal</div>
              )}

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                💡 Klik <strong>Refresh</strong> untuk cek jadwal terbaru, atau buka halaman <strong>Cek Jadwal</strong> kapan saja menggunakan ID Request Anda.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
