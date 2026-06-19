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
      // Refresh slots jika slot sudah diambil orang lain
      const fresh = await api.get('/api/slots');
      setSlots(fresh.data.data || []);
    } finally {
      setBooking(false);
    }
  };

  // Tampilan setelah booking berhasil
  if (booked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Slot Berhasil Dipesan!</h2>
          <p className="text-gray-500 mb-6">Konfirmasi jadwal presentasi telah dikirim ke email Anda.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm mb-6">
            <div className="flex gap-2"><span className="text-gray-500 w-24">ID Request</span><span className="font-medium">{idRequest}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-24">Tanggal</span><span className="font-medium">{booked.tanggal}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-24">Pukul</span><span className="font-medium">{booked.jam} WIB</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-24">Lokasi</span><span className="font-medium">{booked.lokasi || '-'}</span></div>
          </div>
          <a href="/cek-status" className="text-blue-600 text-sm hover:underline">Cek status pengajuan →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-8 pb-2">
          <h1 className="text-2xl font-bold text-gray-900">Pilih Slot Presentasi Hasil AC</h1>
          <p className="text-gray-500 text-sm mt-1">RACD AIHO Assessment Center – PT Astra International</p>
        </div>

        {/* Input ID Request */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Masukkan ID Request Anda</h3>
          <form onSubmit={handleCekId} className="flex gap-2">
            <input
              className="form-input flex-1 font-mono"
              placeholder="contoh: REQ-202506-001"
              value={idInput}
              onChange={e => setIdInput(e.target.value)}
            />
            <button type="submit" className="btn-primary whitespace-nowrap">Konfirmasi</button>
          </form>
          {idRequest && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg text-sm text-green-700">
              ✓ ID Request: <strong>{idRequest}</strong>
            </div>
          )}
        </div>

        {/* Daftar slot tersedia */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Slot Tersedia</h3>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Memuat slot...</div>
          ) : slotTersedia.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Belum ada slot tersedia saat ini.</p>
              <p className="text-sm mt-1">Silakan hubungi PIC Asesmen untuk informasi lebih lanjut.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slotTersedia.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900">{slot.tanggal}</p>
                    <p className="text-sm text-gray-600">Pukul {slot.jam} WIB</p>
                    {slot.lokasi && <p className="text-sm text-gray-500 mt-0.5">📍 {slot.lokasi}</p>}
                  </div>
                  <button
                    onClick={() => handlePilih(slot)}
                    disabled={!idRequest || booking}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      idRequest
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}>
                    {booking ? '...' : 'Pilih Slot'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-8">
          Butuh bantuan? Hubungi PIC Asesmen RACD AIHO
        </p>
      </div>
    </div>
  );
}
