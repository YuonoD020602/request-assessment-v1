import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function PilihSlot() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idRequest, setIdRequest] = useState('');
  const [idInput, setIdInput] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    api.get('/api/slots')
      .then(res => setSlots(res.data.data || []))
      .catch(() => toast.error('Gagal memuat slot'))
      .finally(() => setLoading(false));
  }, []);

  const slotTersedia = slots.filter(s => s.status === 'Tersedia');

  const handleCekId = (e) => {
    e.preventDefault();
    if (!idInput.trim()) return toast.error('Masukkan ID Request terlebih dahulu');
    setIdRequest(idInput.trim().toUpperCase());
  };

  const handlePilih = async (slot) => {
    if (!idRequest) return toast.error('Masukkan ID Request terlebih dahulu');
    if (!window.confirm(`Konfirmasi pilih slot:\n${slot.tanggal} pukul ${slot.jam} WIB\nLokasi: ${slot.lokasi || '-'}\n\nLanjutkan?`)) return;
    setBooking(true);
    try {
      const res = await api.post(`/api/slots/${slot.id}/book`, { id_request: idRequest });
      setBooked(res.data.slot);
      toast.success('Slot berhasil dipesan!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memesan slot');
      const fresh = await api.get('/api/slots');
      setSlots(fresh.data.data || []);
    } finally {
      setBooking(false);
    }
  };

  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-40" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Slot Berhasil Dipesan!</h2>
            <p className="text-gray-500 text-sm mt-1.5">Konfirmasi jadwal presentasi telah dikirim ke email Anda.</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-5 border border-gray-100 space-y-3 mb-6">
            {[
              { label: 'ID Request', value: idRequest },
              { label: 'Tanggal', value: booked.tanggal },
              { label: 'Pukul', value: `${booked.jam} WIB` },
              { label: 'Lokasi', value: booked.lokasi || '-' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-24 flex-shrink-0">{label}</span>
                <span className="text-sm font-semibold text-gray-800">{value}</span>
              </div>
            ))}
          </div>
          <a href="/cek-status"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold py-3 rounded-xl hover:shadow-lg transition-all">
            Cek Status Pengajuan
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)' }}>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="relative max-w-2xl mx-auto px-4 py-12 space-y-6">

        {/* Brand header */}
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-3 mb-5 bg-white/5 border border-white/10 backdrop-blur-sm px-5 py-2.5 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-extrabold">RA</span>
            </div>
            <div className="text-left">
              <p className="text-white text-xs font-bold">Request AC</p>
              <p className="text-slate-400 text-xs">RACD · AIHO</p>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Pilih Slot Presentasi</h1>
          <p className="text-slate-300 text-sm mt-2">Hasil Assessment Center · PT Astra International</p>
        </div>

        {/* Step 1: Input ID Request */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <p className="text-white font-bold text-sm">Masukkan ID Request Anda</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleCekId} className="flex gap-3">
              <input
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                placeholder="Contoh: REQ-202506-001"
                value={idInput}
                onChange={e => setIdInput(e.target.value)}
              />
              <button type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-3 rounded-xl transition-colors whitespace-nowrap shadow-lg">
                Konfirmasi
              </button>
            </form>
            {idRequest && (
              <div className="mt-3 flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-sm px-4 py-2.5 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                ID Request terkonfirmasi: <strong className="ml-1 text-white">{idRequest}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Pilih slot */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${idRequest ? 'bg-indigo-500' : 'bg-white/10'}`}>
                <span className={`text-xs font-bold ${idRequest ? 'text-white' : 'text-white/30'}`}>2</span>
              </div>
              <p className={`font-bold text-sm ${idRequest ? 'text-white' : 'text-white/40'}`}>Pilih Slot Presentasi</p>
            </div>
            {slotTersedia.length > 0 && (
              <span className="text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-400/20 px-2.5 py-1 rounded-full font-semibold">
                {slotTersedia.length} slot tersedia
              </span>
            )}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
                <p className="text-white/40 text-sm">Memuat slot...</p>
              </div>
            ) : slotTersedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <p className="text-white/50 font-semibold text-sm">Belum ada slot tersedia saat ini</p>
                <p className="text-white/30 text-xs">Silakan hubungi PIC Asesmen untuk informasi lebih lanjut</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slotTersedia.map((slot, idx) => (
                  <div key={slot.id}
                    className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${
                      idRequest
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-400/50 cursor-pointer'
                        : 'border-white/5 bg-white/3 opacity-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-400/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-300 text-sm font-bold">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{slot.tanggal}</p>
                        <p className="text-slate-300 text-xs mt-0.5">Pukul {slot.jam} WIB</p>
                        {slot.lokasi && (
                          <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            {slot.lokasi}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePilih(slot)}
                      disabled={!idRequest || booking}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        idRequest
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20 active:scale-95'
                          : 'bg-white/5 text-white/20 cursor-not-allowed'
                      }`}>
                      {booking ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : 'Pilih'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/30 pb-4">
          Butuh bantuan? Hubungi PIC Asesmen RACD AIHO —{' '}
          <a href="mailto:yuono.raharjo@ai.astra.co.id" className="text-blue-300/70 hover:text-blue-200 underline">yuono.raharjo@ai.astra.co.id</a>
        </p>
      </div>
    </div>
  );
}
