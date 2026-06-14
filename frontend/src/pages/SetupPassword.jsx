import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function SetupPassword() {
  const [form, setForm] = useState({ email: '', setupKey: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Password tidak cocok'); return; }
    if (form.newPassword.length < 8) { toast.error('Password minimal 8 karakter'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/setup-password', { email: form.email, setupKey: form.setupKey, newPassword: form.newPassword });
      setDone(true);
      toast.success('Password berhasil diset!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal set password');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card text-center max-w-sm w-full mx-4">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold mb-2">Password Berhasil Diset</h2>
        <a href="/login" className="btn-primary inline-block mt-4">Login Sekarang</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Setup Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input type="email" className="form-input" required onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Setup Key</label>
            <input type="password" className="form-input" required onChange={e => setForm({...form, setupKey: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Password Baru</label>
            <input type="password" className="form-input" required onChange={e => setForm({...form, newPassword: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Konfirmasi Password</label>
            <input type="password" className="form-input" required onChange={e => setForm({...form, confirm: e.target.value})} />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
