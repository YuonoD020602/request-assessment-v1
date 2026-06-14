import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function DetailRequest() {
  const { idRequest } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Forms
  const [grForm, setGrForm] = useState({ tanggal_gr: '', jam_gr: '', lokasi_gr: '', tanggal_ac: '', lokasi_ac: '' });
  const [momForm, setMomForm] = useState({ mom_gr: '' });
  const [psikotesForm, setPsikotesForm] = useState({ tanggal_psikotes: '', jam_psikotes: '', link_platform_psikotes: '' });
  const [presentasiForm, setPresentasiForm] = useState({ tanggal_presentasi: '', jam_presentasi: '', lokasi_presentasi: '' });
  const [pathLaporan, setPathLaporan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRequest(); }, [idRequest]);

  const fetchRequest = async () => {
    try {
      const res = await api.get(`/api/requests/${idRequest}`);
      setRequest(res.data.data);
    } catch { toast.error('Request tidak ditemukan'); navigate('/dashboard'); }
    finally { setLoading(false); }
  };

  const submitGR = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase3/jadwal-gr', { id_request: idRequest, ...grForm });
      toast.success('Jadwal GR berhasil dikirim!'); fetchRequest();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const submitMOM = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase3/input-mom', { id_request: idRequest, ...momForm });
      toast.success('MOM berhasil dikirim!'); fetchRequest();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const submitPsikotes = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase4/psikotes', { id_request: idRequest, ...psikotesForm });
      toast.success('Jadwal psikotes berhasil dikirim!'); fetchRequest();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const submitPresentasi = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase6/jadwal-presentasi', { id_request: idRequest, ...presentasiForm });
      toast.success('Undangan presentasi berhasil dikirim!'); fetchRequest();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const submitLaporan = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase6/kirim-laporan', { id_request: idRequest, path_laporan: pathLaporan });
      toast.success('Laporan berhasil dikirim!'); fetchRequest();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">Memuat...</div></Layout>;
  if (!request) return null;

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'fase3', label: 'Fase 3 – GR' },
    { id: 'fase4', label: 'Fase 4 – Persiapan' },
    { id: 'fase6', label: 'Fase 6 – Laporan' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{request.id_request}</h1>
            <p className="text-gray-500 text-sm">{request.nama_peserta} – {request.nama_perusahaan}</p>
          </div>
          <span className="ml-auto text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">{request.status}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.label}</button>
          ))}
        </div>

        {/* Tab: Info */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Data HC</h3>
              <div className="space-y-2 text-sm">
                {[['Perusahaan', request.nama_perusahaan], ['PIC HC', request.pic_hc], ['Email HC', request.email_pic_hc],
                  ['User/Atasan', request.user_atasan], ['Email User', request.email_user]].map(([k,v]) => (
                  <div key={k} className="flex gap-2"><span className="text-gray-500 w-28">{k}</span><span className="font-medium">{v || '-'}</span></div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Data Peserta</h3>
              <div className="space-y-2 text-sm">
                {[['Nama', request.nama_peserta], ['Posisi', request.posisi_current], ['Target', request.posisi_target],
                  ['Dept/Div', `${request.dept || '-'} / ${request.div || '-'}`], ['Jenis AC', request.jenis_assessment],
                  ['Tujuan AC', request.tujuan_ac]].map(([k,v]) => (
                  <div key={k} className="flex gap-2"><span className="text-gray-500 w-28">{k}</span><span className="font-medium">{v || '-'}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Fase 3 */}
        {activeTab === 'fase3' && user?.role === 'pic_asesmen' && (
          <div className="space-y-6">
            {/* Input Jadwal GR */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Input Jadwal Getting Requirement</h3>
              {request.tanggal_gr && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  ✓ Jadwal GR sudah dikirim: {request.tanggal_gr} {request.jam_gr} – {request.lokasi_gr}
                </div>
              )}
              <form onSubmit={submitGR} className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tanggal GR *</label><input type="date" className="form-input" required onChange={e => setGrForm({...grForm, tanggal_gr: e.target.value})} /></div>
                <div><label className="form-label">Jam GR *</label><input type="time" className="form-input" required onChange={e => setGrForm({...grForm, jam_gr: e.target.value})} /></div>
                <div className="col-span-2"><label className="form-label">Lokasi / Link Meet *</label><input className="form-input" required onChange={e => setGrForm({...grForm, lokasi_gr: e.target.value})} /></div>
                <div><label className="form-label">Tanggal AC</label><input type="date" className="form-input" onChange={e => setGrForm({...grForm, tanggal_ac: e.target.value})} /></div>
                <div><label className="form-label">Lokasi AC</label><input className="form-input" onChange={e => setGrForm({...grForm, lokasi_ac: e.target.value})} /></div>
                <div className="col-span-2"><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Kirim Undangan GR'}</button></div>
              </form>
            </div>

            {/* Input MOM */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Input Minutes of Meeting GR</h3>
              {request.mom_gr && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">✓ MOM sudah dikirim</div>
              )}
              <form onSubmit={submitMOM} className="space-y-4">
                <div><label className="form-label">Isi MOM *</label>
                  <textarea className="form-input" rows={6} required placeholder="Tulis ringkasan MOM GR di sini..."
                    onChange={e => setMomForm({mom_gr: e.target.value})} /></div>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Kirim MOM'}</button>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Fase 4 */}
        {activeTab === 'fase4' && user?.role === 'pic_asesmen' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">Status Dokumen</h3>
              <div className={`p-3 rounded-lg text-sm ${request.status_dokumen === 'Dokumen Diterima' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {request.status_dokumen === 'Dokumen Diterima' ? '✓ Dokumen sudah diterima dari HC' : '⏳ Menunggu dokumen dari HC'}
              </div>
              {request.link_form_potrev && (
                <div className="mt-3 space-y-1 text-sm">
                  <a href={request.link_form_potrev} target="_blank" className="text-blue-600 hover:underline block">📄 Form Potential Review</a>
                  <a href={request.link_data_karyawan} target="_blank" className="text-blue-600 hover:underline block">📄 Data Karyawan</a>
                  <a href={request.link_form_star} target="_blank" className="text-blue-600 hover:underline block">📄 Form STAR</a>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Input Jadwal Psikotes</h3>
              {request.tanggal_psikotes && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  ✓ Jadwal psikotes: {request.tanggal_psikotes} {request.jam_psikotes}
                </div>
              )}
              <form onSubmit={submitPsikotes} className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tanggal *</label><input type="date" className="form-input" required onChange={e => setPsikotesForm({...psikotesForm, tanggal_psikotes: e.target.value})} /></div>
                <div><label className="form-label">Jam *</label><input type="time" className="form-input" required onChange={e => setPsikotesForm({...psikotesForm, jam_psikotes: e.target.value})} /></div>
                <div className="col-span-2"><label className="form-label">Link Platform *</label><input className="form-input" required onChange={e => setPsikotesForm({...psikotesForm, link_platform_psikotes: e.target.value})} /></div>
                <div className="col-span-2"><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Kirim Jadwal Psikotes'}</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Fase 6 */}
        {activeTab === 'fase6' && user?.role === 'pic_asesmen' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Jadwal Presentasi Hasil AC</h3>
              {request.tanggal_presentasi && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  ✓ Undangan presentasi sudah dikirim: {request.tanggal_presentasi} {request.jam_presentasi}
                </div>
              )}
              <form onSubmit={submitPresentasi} className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tanggal *</label><input type="date" className="form-input" required onChange={e => setPresentasiForm({...presentasiForm, tanggal_presentasi: e.target.value})} /></div>
                <div><label className="form-label">Jam *</label><input type="time" className="form-input" required onChange={e => setPresentasiForm({...presentasiForm, jam_presentasi: e.target.value})} /></div>
                <div className="col-span-2"><label className="form-label">Lokasi / Link *</label><input className="form-input" required onChange={e => setPresentasiForm({...presentasiForm, lokasi_presentasi: e.target.value})} /></div>
                <div className="col-span-2"><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Kirim Undangan Presentasi'}</button></div>
              </form>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Kirim Laporan PDF</h3>
              {request.status_laporan === 'Laporan Dikirim' && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">✓ Laporan sudah dikirim</div>
              )}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-1">Cara upload laporan:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Upload file PDF ke Supabase Storage bucket <strong>laporan-pdf</strong></li>
                  <li>Salin nama file yang diupload (contoh: <code>laporan-REQ-202506-001.pdf</code>)</li>
                  <li>Paste di kolom di bawah, lalu klik Kirim Laporan</li>
                </ol>
              </div>
              <form onSubmit={submitLaporan} className="space-y-4">
                <div>
                  <label className="form-label">Nama File PDF di Storage *</label>
                  <input className="form-input" placeholder="laporan-REQ-202506-001.pdf" required
                    value={pathLaporan} onChange={e => setPathLaporan(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Kirim Laporan ke HC & User'}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
