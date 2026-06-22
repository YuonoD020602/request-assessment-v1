import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const STATUS_META = {
  'Approved':                      { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400', header: 'from-emerald-600 to-teal-600' },
  'Rejected':                      { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-400',     header: 'from-red-600 to-rose-600' },
  'Selesai':                       { color: 'text-blue-700 bg-blue-50 border-blue-200',           dot: 'bg-blue-500',    header: 'from-blue-600 to-indigo-600' },
  'Menunggu GR':                   { color: 'text-orange-700 bg-orange-50 border-orange-200',     dot: 'bg-orange-400',  header: 'from-orange-500 to-amber-600' },
  'GR Selesai - Menunggu Dokumen': { color: 'text-amber-700 bg-amber-50 border-amber-200',        dot: 'bg-amber-400',   header: 'from-amber-500 to-orange-500' },
  'Dokumen Diterima':              { color: 'text-teal-700 bg-teal-50 border-teal-200',           dot: 'bg-teal-400',    header: 'from-teal-500 to-cyan-600' },
  'Psikotes Dijadwalkan':          { color: 'text-violet-700 bg-violet-50 border-violet-200',     dot: 'bg-violet-500',  header: 'from-violet-600 to-purple-600' },
  'AC Dijadwalkan':                { color: 'text-sky-700 bg-sky-50 border-sky-200',              dot: 'bg-sky-500',     header: 'from-sky-500 to-blue-600' },
  'Menunggu Presentasi':           { color: 'text-indigo-700 bg-indigo-50 border-indigo-200',     dot: 'bg-indigo-500',  header: 'from-indigo-600 to-blue-700' },
};
const getStatusMeta = (s) => STATUS_META[s] || { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400', header: 'from-yellow-500 to-amber-500' };

// Timeline step: shows a vertical step with connector line
const TimelineStep = ({ num, icon, label, active, done, last, children }) => (
  <div className="flex gap-4">
    {/* Left: circle + line */}
    <div className="flex flex-col items-center flex-shrink-0">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shadow-sm ${
        done  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-transparent text-white' :
        active ? 'bg-white border-blue-500 text-blue-600' :
                 'bg-gray-50 border-gray-200 text-gray-300'
      }`}>
        {done ? <span className="text-base">{icon}</span> : <span className="text-xs">{num}</span>}
      </div>
      {!last && <div className={`w-0.5 flex-1 mt-1 min-h-[24px] rounded-full ${done ? 'bg-gradient-to-b from-blue-400 to-indigo-400' : 'bg-gray-150'}`} style={{ background: done ? undefined : '#e9ecef' }} />}
    </div>
    {/* Right: content */}
    <div className={`flex-1 pb-5 ${last ? '' : ''}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${done ? 'text-blue-600' : active ? 'text-gray-500' : 'text-gray-300'}`}>{label}</p>
      <div className={`rounded-2xl border p-4 transition-all ${
        done  ? 'bg-white border-gray-100 shadow-sm' :
        active ? 'bg-gray-50 border-gray-200' :
                 'bg-gray-50/50 border-gray-100 opacity-50'
      }`}>
        {children}
      </div>
    </div>
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

  const sm = result ? getStatusMeta(result.status) : null;
  const hasPsikotes = !!result?.tanggal_psikotes;
  const hasAC = !!(result?.tanggal_ac && result?.jam_ac);
  const hasPresentasi = !!result?.tanggal_presentasi;
  const showPresentasiStep = hasPresentasi || ['Menunggu Presentasi', 'Selesai'].includes(result?.status);
  const showJadwalSection = ['Approved','Menunggu GR','GR Selesai - Menunggu Dokumen','Dokumen Diterima','Psikotes Dijadwalkan','AC Dijadwalkan','Menunggu Presentasi','Selesai'].includes(result?.status);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pb-16"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f5f0ff 100%)' }}>

      {/* ── Hero ── */}
      <div className="w-full max-w-lg pt-12 pb-8 text-center">
        <div className="relative inline-flex flex-col items-center mb-5">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-700 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200 mb-1">
            <span className="text-white font-extrabold text-2xl">RA</span>
          </div>
          <div className="absolute -top-1 -right-1 flex items-center gap-1 bg-emerald-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Live
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Cek Status & Jadwal</h1>
        <p className="text-gray-400 text-sm mt-2">Pantau perkembangan pengajuan Assessment Center Anda secara real-time</p>
      </div>

      <div className="w-full max-w-lg space-y-4">

        {/* ── Mode Toggle ── */}
        <div className="flex p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-lg shadow-gray-100">
          {[
            { key: 'id',    label: 'ID Request', icon: '🔖' },
            { key: 'email', label: 'Email HC',    icon: '📧' },
          ].map(({ key, label, icon }) => (
            <button key={key}
              onClick={() => { setMode(key); setResult(null); setResultList([]); setError(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === key
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-200'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* ── Search Form ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white p-5">
          {mode === 'id' ? (
            <form onSubmit={handleCek}>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Masukkan ID Request</label>
              <div className="flex gap-3">
                <input
                  className="form-input flex-1 font-mono text-sm bg-gray-50 focus:bg-white"
                  placeholder="REQ-202506-001"
                  value={idRequest}
                  onChange={e => setIdRequest(e.target.value.toUpperCase())}
                  required
                />
                <button type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 whitespace-nowrap"
                  disabled={loading}>
                  {loading
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                    : 'Cek →'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCekEmail}>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Masukkan Email HC</label>
              <div className="flex gap-3">
                <input
                  className="form-input flex-1 bg-gray-50 focus:bg-white"
                  placeholder="nama@perusahaan.com"
                  type="email"
                  value={emailHC}
                  onChange={e => setEmailHC(e.target.value)}
                  required
                />
                <button type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 whitespace-nowrap"
                  disabled={loading}>
                  {loading
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                    : 'Cari →'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-red-500">⚠️</span>
            </div>
            <div>
              <p className="text-red-700 text-sm font-semibold">Tidak ditemukan</p>
              <p className="text-red-500 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Email result list ── */}
        {mode === 'email' && resultList.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-extrabold text-gray-800 text-sm">Daftar Request</h3>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{resultList.length} request</span>
            </div>
            <div className="divide-y divide-gray-50">
              {resultList.map((r) => {
                const m = getStatusMeta(r.status);
                return (
                  <div key={r.id_request}
                    className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    onClick={() => { setMode('id'); setIdRequest(r.id_request); handleCekById(r.id_request); }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white ring-offset-1 ${m.dot}`} />
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{r.nama_peserta}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{r.id_request} · {r.jenis_assessment}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${m.color} whitespace-nowrap hidden sm:inline-flex`}>{r.status}</span>
                      <span className="text-blue-400 group-hover:text-blue-600 font-bold text-sm transition-colors">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Result Detail ── */}
        {result && (
          <div className="space-y-4">

            {/* Status Hero Card */}
            <div className="rounded-3xl overflow-hidden shadow-xl shadow-gray-200/60 border border-white">
              {/* Colored top header */}
              <div className={`relative overflow-hidden bg-gradient-to-r ${sm?.header || 'from-blue-600 to-indigo-600'} px-6 py-6`}>
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-widest">ID Request</p>
                      <p className="font-mono font-extrabold text-white text-2xl mt-0.5">{result.id_request}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-xl border border-white/30">
                      <span className={`w-2 h-2 rounded-full ${sm?.dot} animate-pulse`} />
                      <span className="text-white text-xs font-bold">{result.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Info grid */}
              <div className="bg-white/90 backdrop-blur px-6 py-4 grid grid-cols-3 gap-4">
                {[
                  { label: 'Peserta',        val: result.nama_peserta },
                  { label: 'Perusahaan',     val: result.nama_perusahaan },
                  { label: 'Tanggal Daftar', val: new Date(result.created_at).toLocaleDateString('id-ID') },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Jadwal Timeline ── */}
            {showJadwalSection && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">Jadwal Anda</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Timeline proses Assessment Center</p>
                  </div>
                  <button onClick={handleCek} disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-3 py-2 font-bold transition-colors">
                    {loading ? <span className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> : '↻'} Refresh
                  </button>
                </div>

                <div className="space-y-0">
                  <TimelineStep num="1" icon="📝" label="Jadwal Psikotes" done={hasPsikotes} active={!hasPsikotes} last={false}>
                    {hasPsikotes ? (
                      <div>
                        <p className="font-bold text-gray-900">{result.tanggal_psikotes} · {result.jam_psikotes} WIB</p>
                        <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">📧 Cek email dari astra.recruitment@ai.astra.co.id</p>
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">Belum dijadwalkan — menunggu konfirmasi dari RACD</p>}
                  </TimelineStep>

                  <TimelineStep num="2" icon="🏢" label="Jadwal Assessment Center" done={hasAC} active={!hasAC} last={!showPresentasiStep}>
                    {hasAC ? (
                      <div>
                        <p className="font-bold text-gray-900">{result.tanggal_ac} · {result.jam_ac} WIB</p>
                        {result.lokasi_ac && <p className="text-xs text-gray-500 mt-1">📍 {result.lokasi_ac}</p>}
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">Belum dijadwalkan</p>}
                  </TimelineStep>

                  {showPresentasiStep && (
                    <TimelineStep num="3" icon="🎤" label="Jadwal Presentasi Hasil AC" done={hasPresentasi} active={!hasPresentasi} last={true}>
                      {hasPresentasi ? (
                        <div>
                          <p className="font-bold text-gray-900">{result.tanggal_presentasi} · {result.jam_presentasi} WIB</p>
                          {result.lokasi_presentasi && <p className="text-xs text-gray-500 mt-1">📍 {result.lokasi_presentasi}</p>}
                        </div>
                      ) : <p className="text-sm text-gray-400 italic">Menunggu konfirmasi jadwal dari RACD</p>}
                    </TimelineStep>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                  <span className="text-base flex-shrink-0">💡</span>
                  <p className="text-xs text-amber-700">Klik <strong>Refresh</strong> untuk cek jadwal terbaru. Notifikasi juga dikirim via email.</p>
                </div>
              </div>
            )}

            {/* ── Pilih Slot Presentasi ── */}
            {result.tanggal_ac && result.jam_ac && !result.tanggal_presentasi && (
              <div className="rounded-3xl overflow-hidden shadow-lg border border-indigo-100">
                <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 to-blue-700 px-6 py-5">
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                  <div className="relative">
                    <h3 className="font-extrabold text-white text-base">📅 Pilih Jadwal Presentasi</h3>
                    <p className="text-indigo-200 text-xs mt-1">Hasil Assessment Center Anda — pilih slot waktu yang tersedia</p>
                  </div>
                </div>
                <div className="bg-white p-5">
                  {bookingDone && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4 shadow-sm">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">✅</div>
                      <div>
                        <p className="text-sm font-bold text-emerald-700">Jadwal berhasil dipilih!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Email konfirmasi akan dikirim ke Anda.</p>
                      </div>
                    </div>
                  )}
                  {slots.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">📭</div>
                      <p className="text-sm font-bold text-gray-500">Belum ada slot tersedia</p>
                      <p className="text-xs text-gray-400 mt-1">Hubungi PIC RACD untuk informasi lebih lanjut</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {slots.map((slot, i) => (
                        <div key={slot.id}
                          className="group relative flex items-center justify-between p-4 bg-gray-50 hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-200 rounded-2xl transition-all cursor-pointer"
                          onClick={() => bookingId === null && handleBookSlot(slot.id)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xs transition-colors">
                              {i + 1}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm group-hover:text-indigo-900">
                                {slot.tanggal} — {slot.jam} WIB
                              </p>
                              {slot.lokasi && <p className="text-gray-400 text-xs mt-0.5 group-hover:text-indigo-500">📍 {slot.lokasi}</p>}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleBookSlot(slot.id); }}
                            disabled={bookingId === slot.id}
                            className="ml-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 whitespace-nowrap">
                            {bookingId === slot.id
                              ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memilih...</span>
                              : 'Pilih Slot Ini'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Aksi berdasarkan status ── */}
            {result.status === 'Approved' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-sm">✅</div>
                  <p className="font-bold text-gray-800 text-sm">Pengajuan disetujui! Langkah selanjutnya:</p>
                </div>
                <div className="space-y-2">
                  {result.url_zip_dokumen && (
                    <a href={result.url_zip_dokumen} target="_blank"
                      className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl text-blue-800 text-sm font-bold transition-colors group">
                      <div className="w-9 h-9 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center text-lg transition-colors">📦</div>
                      <div>
                        <p className="font-bold">Download ZIP Dokumen Lanjutan</p>
                        <p className="text-xs text-blue-500 font-normal mt-0.5">Form-form yang perlu diisi</p>
                      </div>
                      <span className="ml-auto text-blue-400">→</span>
                    </a>
                  )}
                  <a href={`/form-dokumen?id=${result.id_request}`}
                    className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-2xl text-emerald-800 text-sm font-bold transition-colors group">
                    <div className="w-9 h-9 bg-emerald-100 group-hover:bg-emerald-200 rounded-xl flex items-center justify-center text-lg transition-colors">📤</div>
                    <div>
                      <p className="font-bold">Upload Dokumen Lanjutan</p>
                      <p className="text-xs text-emerald-600 font-normal mt-0.5">Link Data Karyawan + Form STAR</p>
                    </div>
                    <span className="ml-auto text-emerald-400">→</span>
                  </a>
                </div>
              </div>
            )}

            {['Menunggu GR', 'GR Selesai - Menunggu Dokumen'].includes(result.status) && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-sm">📋</div>
                  <p className="font-bold text-gray-800 text-sm">Dokumen Anda diperlukan</p>
                </div>
                <a href={`/form-dokumen?id=${result.id_request}`}
                  className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-2xl text-emerald-800 text-sm font-bold transition-colors group">
                  <div className="w-9 h-9 bg-emerald-100 group-hover:bg-emerald-200 rounded-xl flex items-center justify-center text-lg transition-colors">📤</div>
                  <div>
                    <p className="font-bold">Upload Dokumen Lanjutan</p>
                    <p className="text-xs text-emerald-600 font-normal mt-0.5">Link Data Karyawan + Form STAR</p>
                  </div>
                  <span className="ml-auto text-emerald-400">→</span>
                </a>
              </div>
            )}

            {result.status === 'Rejected' && result.catatan_reject && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-red-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center text-sm">❌</div>
                  <p className="font-bold text-gray-800 text-sm">Keterangan Penolakan</p>
                </div>
                <div className="bg-red-50 border-l-4 border-red-400 rounded-r-2xl p-4 text-sm text-red-700">
                  {result.catatan_reject}
                </div>
              </div>
            )}

            {result.status === 'Selesai' && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 p-8 text-center shadow-xl">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative">
                  <p className="text-5xl mb-3">🎉</p>
                  <p className="text-white font-extrabold text-lg">Selesai!</p>
                  <p className="text-blue-100 text-sm mt-1">Proses Assessment Center telah selesai.</p>
                  <p className="text-blue-200 text-xs mt-1">Laporan telah dikirim ke email Anda.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center pt-2 pb-4">
          <a href="/form-pengajuan" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
            ← Ajukan Request Baru
          </a>
        </div>
      </div>
    </div>
  );
}
