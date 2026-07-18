import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import FooterContact from '../components/FooterContact';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.data.user, res.data.token);
      toast.success(`Selamat datang, ${res.data.user.nama}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header publik: logo RA gradient */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-2xl font-bold tracking-tight">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Request Assessment</h1>
          <p className="text-gray-500 text-sm mt-1">RACD AIHO – PT Astra International</p>
        </div>

        {/* Card login */}
        <div className="card p-8 shadow-xl shadow-blue-100/60">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/>
              </svg>
            </span>
            <h2 className="text-sm font-bold text-gray-900">Masuk ke akun Anda</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="form-label">Email</label>
              <input id="login-email" type="email" className="form-input" placeholder="nama@astra.co.id"
                autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="login-password" className="form-label">Password</label>
              <input id="login-password" type="password" className="form-input" placeholder="••••••••"
                autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Bukan untuk login?{' '}
              <a href="/form-pengajuan"
                className="text-blue-600 hover:underline font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
                Ajukan Request Assessment
              </a>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Cek status request?{' '}
              <a href="/cek-status"
                className="text-blue-600 hover:underline font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
                Cek di sini
              </a>
            </p>
            <FooterContact />
          </div>
        </div>
      </div>
    </div>
  );
}
