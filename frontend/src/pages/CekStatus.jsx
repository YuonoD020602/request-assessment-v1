import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export function CekStatus() {
  const [searchParams] = useSearchParams();
  const [idRequest, setIdRequest] = useState(searchParams.get('id') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('id'); // 'id' atau 'email'
  const [emailHC, setEmailHC] = useState('');
  const [resultList, setResultList] = useState([]); // untuk hasil by-email
  const [slots, setSlots] = useState([]);
  const [bookingId, setBookingId] = useState(null); // slot yg sedang di-booking
  const [bookingDone, setBookingDone] = useState(false);

  const fetchSlots = async () => {
    try {
      const res = await api.get('/api/slots');
      setSlots((res.data.data || []).filter(s => s.status === 'Tersedia'));
    } catch { }
  };

  const handleBookSlot = async (slotId) => {
    if (!window.confirm('Konfirmasi pilih jadwal ini?')) return;
    setBookingId(slotId);
    try {
      await api.post(`/api/slots/${slotId}/book`, { id_request: result.id_request });
      setBookingDone(true);
      handleCekById(result.id_request);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memilih slot. Coba lagi.');
    } finally {
      setBookingId(null);
    }
  };

  const handleCekById = async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    setResult(null);
    setBookingDone(false);
    try {
      const res = await api.get(`/api/requests/status/${id}`);
      const data = res.data.data;
      setResult(data);
      // Fetch slot jika belum ada presentasi
      if (!data.tanggal_presentasi && data.tanggal_ac && data.jam_ac) {
        fetchSlots();
      }
    } catch {
      setError('ID Request tidak ditemukan. Periksa kembali ID yang Anda masukkan.');
    } finally {
      setLoading(false);
    }
  };

  const handleCek = async (e) => {
    e?.preventDefault();
    await handleCekById(idRequest);
  };

  const handleCekEmail = async (e) => {
    e?.preventDefault();
    if (!emailHC) return;
    setLoading(true);
    setError('');
    setResultList([]);
    try {
      const res = await api.get(`/api/requests/status/by-email/${encodeURIComponent(emailHC)}`);
      setResultList(res.data.data || []);
    } catch {
      setError('Email tidak ditemukan atau belum ada request yang didaftarkan.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-cek kalau ada id di URL
  useEffect(() => {
    if (searchParams.get('id')) handleCek();
  }, []);

  const getStatusColor = (status) => {
    if (status === 'Approved') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'Rejected') return 'text-red-600 bg-red-50 border-red-200';
    if (status === 'Selesai') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (status === 'Menunggu GR') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (status === 'GR Selesai - Menunggu Dokumen') return 'text-amber-600 bg-amber-50 border-amber-200';
    if (status === 'Dokumen Diterima') return 'text-teal-600 bg-teal-50 border-teal-200';
    if (status === 'Psikotes Dijadwalkan') return 'text-violet-600 bg-violet-50 border-violet-200';
    if (status === 'AC Dijadwalkan') return 'text-sky-600 bg-sky-50 border-sky-200';
    if (status === 'Menunggu Presentasi') return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cek Status & Jadwal</h1>
          <p className="text-gray-500 text-sm mt-1">Masukkan ID Request yang Anda terima</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
          <button
            onClick={() => { setMode('id'); setResult(null); setResultList([]); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'id' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Cari by ID Request
          </button>
          <button
            onClick={() => { setMode('email'); setResult(null); setResultList([]); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'email' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Cari by Email HC
          </button>
        </div>

        {mode === 'id' && (
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
        )}

        {mode === 'email' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <form onSubmit={handleCekEmail} className="flex gap-3">
              <input
                className="form-input flex-1"
                placeholder="Email HC Anda"
                type="email"
                value={emailHC}
                onChange={e => setEmailHC(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary px-6" disabled={loading}>
                {loading ? '...' : 'Cek'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm text-center mb-4">
            {error}
          </div>
        )}

        {mode === 'email' && resultList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Daftar Request Anda</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Peserta</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Jenis</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {resultList.map((r) => (
                    <tr key={r.id_request} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <p className="font-medium text-gray-900">{r.nama_peserta}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.id_request}</p>
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{r.jenis_assessment}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-medium">{r.status}</span>
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => { setMode('id'); setIdRequest(r.id_request); handleCekById(r.id_request); }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          Detail →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-4">
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
            </div>

            {/* Jadwal Psikotes & AC */}
            {['Approved', 'Menunggu GR', 'GR Selesai - Menunggu Dokumen', 'Dokumen Diterima', 'Psikotes Dijadwalkan', 'AC Dijadwalkan', 'Menunggu Presentasi', 'Selesai'].includes(result.status) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">📅 Jadwal Selanjutnya</h3>
                  <button onClick={handleCek} disabled={loading}
                    className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1">
                    {loading ? '⏳...' : '🔄 Refresh'}
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Jadwal Psikotes */}
                  <div className={`p-3 rounded-lg border ${result.tanggal_psikotes ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">📝 JADWAL PSIKOTES</p>
                    {result.tanggal_psikotes ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-gray-900">📅 {result.tanggal_psikotes} pukul {result.jam_psikotes} WIB</p>
                        <p className="text-blue-600 text-xs">Cek email dari astra.recruitment@ai.astra.co.id</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Belum dijadwalkan</p>
                    )}
                  </div>

                  {/* Jadwal AC */}
                  <div className={`p-3 rounded-lg border ${result.tanggal_ac && result.jam_ac ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">🏢 JADWAL ASSESSMENT CENTER</p>
                    {result.tanggal_ac && result.jam_ac ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-gray-900">📅 {result.tanggal_ac} pukul {result.jam_ac} WIB</p>
                        {result.lokasi_ac && (
                          <p className="text-gray-600 text-xs">📍 {result.lokasi_ac}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Belum dijadwalkan</p>
                    )}
                  </div>

                  {/* Jadwal Presentasi */}
                  {(result.tanggal_presentasi || ['Menunggu Presentasi', 'Selesai'].includes(result.status)) && (
                    <div className={`p-3 rounded-lg border ${result.tanggal_presentasi ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs font-semibold text-gray-500 mb-1">🎤 JADWAL PRESENTASI HASIL AC</p>
                      {result.tanggal_presentasi ? (
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-gray-900">📅 {result.tanggal_presentasi} pukul {result.jam_presentasi} WIB</p>
                          {result.lokasi_presentasi && (
                            <p className="text-gray-600 text-xs">📍 {result.lokasi_presentasi}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Menunggu konfirmasi jadwal dari RACD</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                  💡 Klik <strong>Refresh</strong> untuk cek jadwal terbaru. Jadwal juga akan dikirim ke email Anda.
                </div>
              </div>
            )}

            {/* Pilih Slot Presentasi */}
            {result.tanggal_ac && result.jam_ac && !result.tanggal_presentasi && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-1">📅 Pilih Jadwal Presentasi Hasil AC</h3>
                <p className="text-sm text-gray-500 mb-4">Silakan pilih salah satu slot waktu yang tersedia untuk presentasi hasil Assessment Center Anda.</p>
                {bookingDone && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-4">
                    ✅ Jadwal berhasil dipilih! Email konfirmasi akan dikirim ke Anda.
                  </div>
                )}
                {slots.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                    Belum ada slot tersedia saat ini. Hubungi PIC RACD untuk informasi lebih lanjut.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {slots.map(slot => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">📅 {slot.tanggal} — {slot.jam} WIB</p>
                          {slot.lokasi && <p className="text-gray-500 text-xs mt-0.5">📍 {slot.lokasi}</p>}
                        </div>
                        <button
                          onClick={() => handleBookSlot(slot.id)}
                          disabled={bookingId === slot.id}
                          className="ml-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                          {bookingId === slot.id ? 'Memilih...' : 'Pilih Slot Ini'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Link aksi berdasarkan status */}
            {result.status === 'Approved' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

            {['Menunggu GR', 'GR Selesai - Menunggu Dokumen'].includes(result.status) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="font-semibold text-sm text-gray-700 mb-3">📋 Dokumen diperlukan:</p>
                <a href={`/form-dokumen?id=${result.id_request}`}
                  className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm hover:bg-green-100">
                  📤 Upload Dokumen Lanjutan
                </a>
              </div>
            )}

            {result.status === 'Rejected' && result.catatan_reject && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="font-semibold text-sm text-gray-700 mb-2">Keterangan Penolakan:</p>
                <div className="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">
                  {result.catatan_reject}
                </div>
              </div>
            )}

            {result.status === 'Selesai' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
