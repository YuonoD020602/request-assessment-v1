import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const STATUS_META = {
  'Approved':                          { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  'Rejected':                          { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-400' },
  'Selesai':                           { color: 'text-blue-700 bg-blue-50 border-blue-200',           dot: 'bg-blue-500' },
  'Menunggu GR':                       { color: 'text-orange-700 bg-orange-50 border-orange-200',    dot: 'bg-orange-400' },
  'GR Selesai - Menunggu Dokumen':     { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-400' },
  'Dokumen Diterima':                  { color: 'text-teal-700 bg-teal-50 border-teal-200',          dot: 'bg-teal-400' },
  'Psikotes Dijadwalkan':              { color: 'text-violet-700 bg-violet-50 border-violet-200',    dot: 'bg-violet-500' },
  'AC Dijadwalkan':                    { color: 'text-sky-700 bg-sky-50 border-sky-200',             dot: 'bg-sky-500' },
  'Menunggu Presentasi':               { color: 'text-indigo-700 bg-indigo-50 border-indigo-200',    dot: 'bg-indigo-500' },
};
const getStatusMeta = (s) => STATUS_META[s] || { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400' };

const JadwalCard = ({ icon, label, active, children }) => (
  <div className={`rounded-xl border p-4 transition-all ${active ? 'shadow-sm' : 'opacity-60'}`}
    style={active ? {} : { borderColor: '#e5e7eb', background: '#f9fafb' }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-base">{icon}</span>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
    {children}
  </div>
);

export function CekStatus() {
  const [searchParams] = useSearchParams();
  const [idRequest, setIdRequest] = useState(searchParams.get('id') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('id');
  const [emailHC, setEmailHC] = useState('');
  const [resultList, setResultList] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookingId, setBookingId] = useState(null);
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

  useEffect(() => {
    if (searchParams.get('id')) handleCek();
  }, []);

  const statusMeta = result ? getStatusMeta(result.status) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 flex flex-col items-center justify-start px-4 pb-12">

      {/* Hero Header */}
      <div className="w-full max-w-lg pt-12 pb-6 text-center">
        <div className="relative inline-flex">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-white font-bold text-xl">RA</span>
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Cek Status & Jadwal</h1>
        <p className="text-gray-500 text-sm mt-1.5">Pantau perkembangan pengajuan Assessment Center Anda</p>
      </div>

      <div className="w-full max-w-lg space-y-4">

        {/* Mode Toggle */}
        <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm">
          {['id', 'email'].map((m) => (
            <button key={m}
              onClick={() => { setMode(m); setResult(null); setResultList([]); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === m
                ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'}`}>
              {m === 'id' ? '🔖 Cari by ID Request' : '📧 Cari by Email HC'}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {mode === 'id' ? (
            <form onSubmit={handleCek} className="flex gap-3">
              <input
                className="form-input flex-1 font-mono"
                placeholder="Contoh: REQ-202506-001"
                value={idRequest}
                onChange={e => setIdRequest(e.target.value.toUpperCase())}
                required
              />
              <button type="submit"
                className="px-6 py-2 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-semibold rounded-lg shadow transition-all disabled:opacity-50 whitespace-nowrap"
                disabled={loading}>
                {loading ? <span className="flex items-center gap-1"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></span> : 'Cek →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCekEmail} className="flex gap-3">
              <input
                className="form-input flex-1"
                placeholder="Email HC Anda"
                type="email"
                value={emailHC}
                onChange={e => setEmailHC(e.target.value)}
                required
              />
              <button type="submit"
                className="px-6 py-2 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-semibold rounded-lg shadow transition-all disabled:opacity-50 whitespace-nowrap"
                disabled={loading}>
                {loading ? <span className="flex items-center gap-1"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></span> : 'Cari →'}
              </button>
            </form>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-red-400 text-lg">⚠️</span>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Email result list */}
        {mode === 'email' && resultList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-slate-50">
              <h3 className="font-bold text-gray-900 text-sm">Daftar Request ({resultList.length})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {resultList.map((r) => {
                const m = getStatusMeta(r.status);
                return (
                  <div key={r.id_request} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.dot}`} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.nama_peserta}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{r.id_request} · {r.jenis_assessment}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${m.color} whitespace-nowrap`}>{r.status}</span>
                      <button
                        onClick={() => { setMode('id'); setIdRequest(r.id_request); handleCekById(r.id_request); }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                        Detail →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Result Detail */}
        {result && (
          <div className="space-y-4">

            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`px-6 py-5 border-b ${statusMeta?.color.includes('emerald') ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100' : statusMeta?.color.includes('red') ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-100' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">ID REQUEST</p>
                    <p className="font-mono font-bold text-blue-800 text-xl">{result.id_request}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusMeta?.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta?.dot}`} />
                    {result.status}
                  </span>
                </div>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Peserta</p>
                  <p className="font-semibold text-gray-900">{result.nama_peserta}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Perusahaan</p>
                  <p className="font-semibold text-gray-900">{result.nama_perusahaan}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Tanggal Daftar</p>
                  <p className="font-semibold text-gray-900">{new Date(result.created_at).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            </div>

            {/* Jadwal */}
            {['Approved', 'Menunggu GR', 'GR Selesai - Menunggu Dokumen', 'Dokumen Diterima', 'Psikotes Dijadwalkan', 'AC Dijadwalkan', 'Menunggu Presentasi', 'Selesai'].includes(result.status) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    📅 <span>Jadwal Anda</span>
                  </h3>
                  <button onClick={handleCek} disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 rounded-lg px-3 py-1.5 font-semibold transition-colors">
                    {loading ? <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> : '↻'} Refresh
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Psikotes */}
                  <JadwalCard icon="📝" label="Jadwal Psikotes" active={!!result.tanggal_psikotes}>
                    {result.tanggal_psikotes ? (
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900 text-sm">{result.tanggal_psikotes} · {result.jam_psikotes} WIB</p>
                        <p className="text-xs text-blue-600 flex items-center gap-1">
                          📧 Cek email dari astra.recruitment@ai.astra.co.id
                        </p>
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">Belum dijadwalkan</p>}
                  </JadwalCard>

                  {/* AC */}
                  <JadwalCard icon="🏢" label="Jadwal Assessment Center" active={!!(result.tanggal_ac && result.jam_ac)}>
                    {result.tanggal_ac && result.jam_ac ? (
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900 text-sm">{result.tanggal_ac} · {result.jam_ac} WIB</p>
                        {result.lokasi_ac && <p className="text-xs text-gray-500 flex items-center gap-1">📍 {result.lokasi_ac}</p>}
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">Belum dijadwalkan</p>}
                  </JadwalCard>

                  {/* Presentasi */}
                  {(result.tanggal_presentasi || ['Menunggu Presentasi', 'Selesai'].includes(result.status)) && (
                    <JadwalCard icon="🎤" label="Jadwal Presentasi Hasil AC" active={!!result.tanggal_presentasi}>
                      {result.tanggal_presentasi ? (
                        <div className="space-y-1">
                          <p className="font-bold text-gray-900 text-sm">{result.tanggal_presentasi} · {result.jam_presentasi} WIB</p>
                          {result.lokasi_presentasi && <p className="text-xs text-gray-500 flex items-center gap-1">📍 {result.lokasi_presentasi}</p>}
                        </div>
                      ) : <p className="text-sm text-gray-400 italic">Menunggu konfirmasi dari RACD</p>}
                    </JadwalCard>
                  )}
                </div>

                <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <span className="text-base flex-shrink-0">💡</span>
                  <p className="text-xs text-amber-700">Klik <strong>Refresh</strong> untuk cek jadwal terbaru. Jadwal juga akan dikirim ke email Anda.</p>
                </div>
              </div>
            )}

            {/* Pilih Slot Presentasi */}
            {result.tanggal_ac && result.jam_ac && !result.tanggal_presentasi && (
              <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">📅 Pilih Jadwal Presentasi Hasil AC</h3>
                  <p className="text-indigo-100 text-xs mt-1">Pilih salah satu slot waktu yang tersedia di bawah ini</p>
                </div>
                <div className="p-5">
                  {bookingDone && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 mb-4">
                      <span>✅</span> Jadwal berhasil dipilih! Email konfirmasi akan dikirim ke Anda.
                    </div>
                  )}
                  {slots.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-sm text-gray-500 font-medium">Belum ada slot tersedia</p>
                      <p className="text-xs text-gray-400 mt-1">Hubungi PIC RACD untuk informasi lebih lanjut</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slots.map(slot => (
                        <div key={slot.id}
                          className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer"
                          onClick={() => bookingId === null && handleBookSlot(slot.id)}>
                          <div>
                            <p className="font-bold text-gray-900 text-sm group-hover:text-indigo-900">
                              📅 {slot.tanggal} — {slot.jam} WIB
                            </p>
                            {slot.lokasi && <p className="text-gray-400 text-xs mt-0.5 group-hover:text-indigo-600">📍 {slot.lokasi}</p>}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleBookSlot(slot.id); }}
                            disabled={bookingId === slot.id}
                            className="ml-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap">
                            {bookingId === slot.id
                              ? <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memilih...</span>
                              : 'Pilih Slot Ini'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Aksi berdasarkan status */}
            {result.status === 'Approved' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">✅ Pengajuan disetujui! Langkah selanjutnya:</p>
                <div className="space-y-2">
                  {result.url_zip_dokumen && (
                    <a href={result.url_zip_dokumen} target="_blank"
                      className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl text-blue-800 text-sm font-semibold transition-colors">
                      <span className="text-xl">📦</span> Download ZIP Dokumen Lanjutan
                    </a>
                  )}
                  <a href={`/form-dokumen?id=${result.id_request}`}
                    className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-emerald-800 text-sm font-semibold transition-colors">
                    <span className="text-xl">📤</span> Upload Dokumen Lanjutan
                  </a>
                </div>
              </div>
            )}

            {['Menunggu GR', 'GR Selesai - Menunggu Dokumen'].includes(result.status) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">📋 Dokumen diperlukan:</p>
                <a href={`/form-dokumen?id=${result.id_request}`}
                  className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-emerald-800 text-sm font-semibold transition-colors">
                  <span className="text-xl">📤</span> Upload Dokumen Lanjutan
                </a>
              </div>
            )}

            {result.status === 'Rejected' && result.catatan_reject && (
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
                <p className="font-bold text-sm text-gray-800 mb-3">Keterangan Penolakan:</p>
                <div className="bg-red-50 border-l-4 border-red-400 rounded-r-xl p-4 text-sm text-red-700">
                  {result.catatan_reject}
                </div>
              </div>
            )}

            {result.status === 'Selesai' && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-center">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-white font-bold text-sm">Proses Assessment Center telah selesai!</p>
                <p className="text-blue-100 text-xs mt-1">Laporan telah dikirim ke email Anda.</p>
              </div>
            )}
          </div>
        )}

        <div className="text-center pt-2">
          <a href="/form-pengajuan" className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
            ← Ajukan Request Baru
          </a>
        </div>
      </div>
    </div>
  );
}
