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

  const pwTooShort = form.newPassword.length > 0 && form.newPassword.length < 8;
  const confirmFilled = form.confirm.length > 0;
  const confirmMatch = form.newPassword === form.confirm;

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="card text-center max-w-sm w-full p-8 shadow-xl shadow-blue-100/60">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-40" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1.5">Password Berhasil Diset</h2>
        <p className="text-sm text-gray-500 mb-5">Akun Anda siap digunakan. Silakan masuk dengan password baru.</p>
        <a href="/login" className="btn-primary w-full">
          Login Sekarang
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header publik: logo RA gradient */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-2xl font-bold tracking-tight">RA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Setup Password</h1>
          <p className="text-gray-500 text-sm mt-1">Aktifkan akun Request Assessment Anda</p>
        </div>

        <div className="card p-8 shadow-xl shadow-blue-100/60">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </span>
            <h2 className="text-sm font-bold text-gray-900">Buat password akun Anda</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="setup-email" className="form-label">Email</label>
              <input id="setup-email" type="email" className="form-input" placeholder="nama@astra.co.id"
                autoComplete="email" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label htmlFor="setup-key" className="form-label">Setup Key</label>
              <input id="setup-key" type="password" className="form-input" placeholder="Kunci dari PIC Asesmen"
                required aria-describedby="setup-key-hint"
                value={form.setupKey} onChange={e => setForm({...form, setupKey: e.target.value})} />
              <p id="setup-key-hint" className="mt-1.5 text-xs text-gray-400">Diberikan oleh PIC Asesmen bersama undangan akun.</p>
            </div>
            <div>
              <label htmlFor="setup-password" className="form-label">Password Baru</label>
              <input id="setup-password" type="password" className="form-input" placeholder="••••••••"
                autoComplete="new-password" required aria-describedby="setup-password-hint"
                value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} />
              <p id="setup-password-hint" className={`mt-1.5 text-xs ${pwTooShort ? 'text-amber-600' : 'text-gray-400'}`}>
                Minimal 8 karakter.
              </p>
            </div>
            <div>
              <label htmlFor="setup-confirm" className="form-label">Konfirmasi Password</label>
              <input id="setup-confirm" type="password" className="form-input" placeholder="••••••••"
                autoComplete="new-password" required aria-describedby="setup-confirm-hint"
                value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} />
              <p id="setup-confirm-hint" aria-live="polite"
                className={`mt-1.5 text-xs flex items-center gap-1 ${!confirmFilled ? 'text-gray-400' : confirmMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                {confirmFilled && (
                  confirmMatch
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                )}
                {!confirmFilled ? 'Ulangi password baru Anda.' : confirmMatch ? 'Password cocok.' : 'Password belum cocok.'}
              </p>
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />}
              {loading ? 'Menyimpan...' : 'Set Password'}
            </button>
          </form>

          <p className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Ada pertanyaan? Hubungi PIC Asesmen —{' '}
            <a href="mailto:yuono.raharjo@ai.astra.co.id"
              className="text-blue-600 hover:underline font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
              yuono.raharjo@ai.astra.co.id
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
