import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import FooterContact from '../components/FooterContact';

export default function ApprovalPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const action = params.get('action');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) { setError('Token tidak ditemukan'); setLoading(false); return; }
    api.get(`/api/approval/cek?token=${token}`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { setError(err.response?.data?.error || 'Token tidak valid'); setLoading(false); });
  }, [token]);

  const handleAction = async () => {
    if (action === 'reject' && !catatan.trim()) { toast.error('Catatan penolakan wajib diisi'); return; }
    setSubmitting(true);
    try {
      if (action === 'approve') {
        await api.post('/api/approval/approve', { token });
      } else {
        await api.post('/api/approval/reject', { token, catatan });
      }
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memproses');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div></div>;

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link Tidak Valid</h2>
        <p className="text-gray-500">{error}</p>
        <p className="text-xs text-gray-400 mt-4">Token approval berlaku 7 hari dan hangus setelah digunakan.</p>
        <FooterContact />
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
        <div className="text-5xl mb-4">{action === 'approve' ? '✅' : '❌'}</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {action === 'approve' ? 'Request Disetujui!' : 'Request Ditolak'}
        </h2>
        <p className="text-gray-500">Pemohon akan mendapat notifikasi via email.</p>
      </div>
    </div>
  );

  const r = data?.request;
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">RA</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Review Pengajuan Assessment</h1>
          <p className="text-gray-500 text-sm">RACD AIHO – PT Astra International</p>
        </div>

        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-sm font-bold text-blue-700">{r?.id_request}</span>
            <span className={action === 'approve' ? 'text-green-600 font-semibold text-sm' : 'text-red-600 font-semibold text-sm'}>
              {action === 'approve' ? '✓ Approve' : '✗ Reject'}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['Perusahaan', r?.nama_perusahaan],
              ['PIC HC', r?.pic_hc],
              ['Peserta', r?.nama_peserta],
              ['Posisi Saat Ini', r?.posisi_current],
              ['Posisi Target', r?.posisi_target],
              ['Jenis Assessment', r?.jenis_assessment],
              ['Tujuan AC', r?.tujuan_ac],
            ].map(([k, v]) => v && (
              <div key={k} className="flex gap-2">
                <span className="text-gray-500 w-36 flex-shrink-0">{k}</span>
                <span className="text-gray-900 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {action === 'reject' && (
          <div className="card mb-4">
            <label className="form-label">Catatan Penolakan <span className="text-red-500">*</span></label>
            <textarea className="form-input" rows={4} placeholder="Tuliskan alasan penolakan..."
              value={catatan} onChange={e => setCatatan(e.target.value)} />
          </div>
        )}

        <button onClick={handleAction} disabled={submitting}
          className={`w-full py-3 font-semibold rounded-lg transition-colors ${
            action === 'approve'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          } disabled:opacity-50`}>
          {submitting ? 'Memproses...' : action === 'approve' ? '✓ Setujui Request Ini' : '✗ Tolak Request Ini'}
        </button>
        <FooterContact />
      </div>
    </div>
  );
}
