import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FormPengajuan from './pages/FormPengajuan';
import { FormDokumen } from './pages/FormDokumen';
import ApprovalPage from './pages/ApprovalPage';
import { CekStatus } from './pages/CekStatus';
import { DaftarHC } from './pages/DaftarHC';
import Konfigurasi from './pages/Konfigurasi';
import DetailRequest from './pages/DetailRequest';
import SetupPassword from './pages/SetupPassword';
import SlotPresentasi from './pages/SlotPresentasi';
import PilihSlot from './pages/PilihSlot';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div></div>;
  return user ? children : <Navigate to="/login" />;
};

const PICRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'pic_asesmen' ? children : <Navigate to="/dashboard" />;
};

export default function App() {
  return (
    <Routes>
      {/* Publik */}
      <Route path="/login" element={<Login />} />
      <Route path="/form-pengajuan" element={<FormPengajuan />} />
      <Route path="/form-dokumen" element={<FormDokumen />} />
      <Route path="/approval" element={<ApprovalPage />} />
      <Route path="/cek-status" element={<CekStatus />} />
      <Route path="/setup-password" element={<SetupPassword />} />
      <Route path="/pilih-slot" element={<PilihSlot />} />

      {/* Private */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/request/:idRequest" element={<PrivateRoute><DetailRequest /></PrivateRoute>} />
      <Route path="/daftar-hc" element={<PrivateRoute><PICRoute><DaftarHC /></PICRoute></PrivateRoute>} />
      <Route path="/konfigurasi" element={<PrivateRoute><PICRoute><Konfigurasi /></PICRoute></PrivateRoute>} />
      <Route path="/slot-presentasi" element={<PrivateRoute><PICRoute><SlotPresentasi /></PICRoute></PrivateRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
