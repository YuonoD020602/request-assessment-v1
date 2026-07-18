import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FooterContact from './FooterContact';

const menuItems = [
  {
    path: '/dashboard', label: 'Dashboard',
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    path: '/daftar-hc', label: 'Daftar HC', picOnly: true,
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  },
  {
    path: '/slot-presentasi', label: 'Slot Presentasi', picOnly: true,
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  },
  {
    path: '/konfigurasi', label: 'Konfigurasi', picOnly: true,
    svg: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = user?.nama?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Skip to content (a11y) */}
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:text-blue-700 focus:text-sm focus:font-semibold focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-lg focus:ring-2 focus:ring-blue-500">
        Lewati ke konten
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col flex-shrink-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 transform transition-transform duration-200 ease-out md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo area */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-bold tracking-tight">RA</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white tracking-tight truncate">Request Assessment</p>
              <p className="text-xs text-slate-400">RACD · AIHO</p>
            </div>
            {/* Close drawer (mobile only) */}
            <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu navigasi"
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        </div>

        {/* Nav label */}
        <div className="px-5 pb-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Menu</p>
        </div>

        {/* Menu items */}
        <nav aria-label="Menu utama" className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.picOnly && user?.role !== 'pic_asesmen') return null;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                aria-current={active ? 'page' : undefined}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  active
                    ? 'bg-gradient-to-br from-blue-600/90 to-indigo-600/90 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                <span className={active ? 'text-white' : 'text-slate-500'}>{item.svg}</span>
                {item.label}
                {active && <span className="ml-auto w-1 h-4 rounded-full bg-white/70" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 pb-5 pt-4">
          <div className="h-px mb-4 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.nama}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Buka menu navigasi"
            className="p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold tracking-tight">RA</span>
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight truncate">Request Assessment</span>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
          <FooterContact />
        </main>
      </div>
    </div>
  );
}
