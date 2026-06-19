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
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const [grForm, setGrForm] = useState({ tanggal_gr: '', jam_gr: '', lokasi_gr: '', tanggal_ac: '', lokasi_ac: '' });
  const [momForm, setMomForm] = useState({ mom_gr: '' });
  const [psikotesForm, setPsikotesForm] = useState({ tanggal_psikotes: '', jam_psikotes: '' });
  const [jadwalAcForm, setJadwalAcForm] = useState({ tanggal_ac: '', jam_ac: '', lokasi_ac: '' });
  const [formsReady, setFormsReady] = useState(false);
  const [fileLaporan, setFileLaporan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequest();
    api.get('/api/config').then(res => setConfig(res.data.data || {})).catch(() => {});
  }, [idRequest]);

  const fetchRequest = async () => {
    try {
      const res = await api.get(`/api/requests/${idRequest}`);
      const r = res.data.data;
      setRequest(r);
      // Pre-fill forms dengan data existing
      if (r.tanggal_gr) setGrForm({ tanggal_gr: r.tanggal_gr, jam_gr: r.jam_gr || '', lokasi_gr: r.lokasi_gr || '', tanggal_ac: r.tanggal_ac || '', lokasi_ac: r.lokasi_ac || '' });
      if (r.mom_gr) setMomForm({ mom_gr: r.mom_gr });
      if (r.tanggal_psikotes) setPsikotesForm({ tanggal_psikotes: r.tanggal_psikotes, jam_psikotes: r.jam_psikotes || '' });
      if (r.tanggal_ac && r.jam_ac) setJadwalAcForm({ tanggal_ac: r.tanggal_ac, jam_ac: r.jam_ac, lokasi_ac: r.lokasi_ac || '' });
      setFormsReady(true);
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

  const submitJadwalAC = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase4/jadwal-ac', { id_request: idRequest, ...jadwalAcForm });
      toast.success('Jadwal AC berhasil disimpan!'); fetchRequest();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const submitLaporan = async (e) => {
    e.preventDefault();
    if (!fileLaporan) return toast.error('Pilih file PDF terlebih dahulu');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('pdf', fileLaporan);
      formData.append('id_request', idRequest);
      await api.post('/api/fase6/kirim-laporan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Laporan berhasil dikirim!');
      fetchRequest();
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
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{request.id_request}</h1>
            <p className="text-gray-500 text-sm">{request.nama_peserta} – {request.nama_perusahaan}</p>
          </div>
          <span className="ml-auto text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">{request.status}</span>
        </div>

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
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Input Jadwal Getting Requirement</h3>
              {request.tanggal_gr && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  ✓ Jadwal GR sudah dikirim: {request.tanggal_gr} {request.jam_gr} – {request.lokasi_gr}
                </div>
              )}
              <form onSubmit={submitGR} className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tanggal GR *</label><input type="date" className="form-input" required value={grForm.tanggal_gr} onChange={e => setGrForm({...grForm, tanggal_gr: e.target.value})} /></div>
                <div><label className="form-label">Jam GR *</label><input type="time" className="form-input" required value={grForm.jam_gr} onChange={e => setGrForm({...grForm, jam_gr: e.target.value})} /></div>
                <div className="col-span-2"><label className="form-label">Lokasi / Link Meet *</label><input className="form-input" required value={grForm.lokasi_gr} onChange={e => setGrForm({...grForm, lokasi_gr: e.target.value})} /></div>
                <div><label className="form-label">Tanggal AC</label><input type="date" className="form-input" value={grForm.tanggal_ac} onChange={e => setGrForm({...grForm, tanggal_ac: e.target.value})} /></div>
                <div><label className="form-label">Lokasi AC</label><input className="form-input" value={grForm.lokasi_ac} onChange={e => setGrForm({...grForm, lokasi_ac: e.target.value})} /></div>
                <div className="col-span-2"><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : request.tanggal_gr ? 'Update & Kirim Ulang Undangan GR' : 'Kirim Undangan GR'}</button></div>
              </form>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Input Minutes of Meeting GR</h3>
              {request.mom_gr && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">✓ MOM sudah dikirim</div>
              )}
              <form onSubmit={submitMOM} className="space-y-4">
                <div><label className="form-label">Isi MOM *</label>
                  <textarea className="form-input" rows={6} required placeholder="Tulis ringkasan MOM GR di sini..."
                    value={momForm.mom_gr}
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
                <div><label className="form-label">Tanggal *</label><input type="date" className="form-input" required value={psikotesForm.tanggal_psikotes} onChange={e => setPsikotesForm({...psikotesForm, tanggal_psikotes: e.target.value})} /></div>
                <div><label className="form-label">Rentang Jam Psikotes *</label><input className="form-input" required placeholder="contoh: 08.00–10.00" value={psikotesForm.jam_psikotes} onChange={e => setPsikotesForm({...psikotesForm, jam_psikotes: e.target.value})} /></div>
                <div className="col-span-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">Peserta akan diarahkan cek email dari astra.recruitment@ai.astra.co.id</div>
                <div className="col-span-2"><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : request.tanggal_psikotes ? 'Update & Kirim Ulang Jadwal Psikotes' : 'Kirim Jadwal Psikotes'}</button></div>
              </form>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Input Jadwal Assessment Center</h3>
              {request.tanggal_ac && request.jam_ac && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  ✓ Jadwal AC: {request.tanggal_ac} {request.jam_ac} – {request.lokasi_ac}
                </div>
              )}
              {config.link_keperluan_asesmen && (
                <div className="mb-4 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                  <span className="font-medium">Link Keperluan Asesmen: </span>
                  <a href={config.link_keperluan_asesmen} target="_blank" rel="noreferrer" className="underline">{config.link_keperluan_asesmen}</a>
                  <span className="text-indigo-500 ml-1">(akan dikirim ke Tim Pelaksana via email)</span>
                </div>
              )}
              <form onSubmit={submitJadwalAC} className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tanggal AC *</label><input type="date" className="form-input" required value={jadwalAcForm.tanggal_ac} onChange={e => setJadwalAcForm({...jadwalAcForm, tanggal_ac: e.target.value})} /></div>
                <div><label className="form-label">Jam AC *</label><input type="time" className="form-input" required value={jadwalAcForm.jam_ac} onChange={e => setJadwalAcForm({...jadwalAcForm, jam_ac: e.target.value})} /></div>
                <div className="col-span-2"><label className="form-label">Lokasi / Link AC *</label><input className="form-input" required value={jadwalAcForm.lokasi_ac} onChange={e => setJadwalAcForm({...jadwalAcForm, lokasi_ac: e.target.value})} /></div>
                <div className="col-span-2"><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : request.tanggal_ac && request.jam_ac ? 'Update & Kirim Ulang Notifikasi AC' : 'Simpan Jadwal AC'}</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Fase 6 */}
        {activeTab === 'fase6' && user?.role === 'pic_asesmen' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Jadwal Presentasi Hasil AC</h3>
              {request.tanggal_presentasi ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm font-semibold text-green-800 mb-2">✅ HC telah memilih slot presentasi</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Tanggal:</span> <strong>{request.tanggal_presentasi}</strong></p>
                    <p><span className="text-gray-500">Pukul:</span> <strong>{request.jam_presentasi} WIB</strong></p>
                    <p><span className="text-gray-500">Lokasi:</span> <strong>{request.lokasi_presentasi || '-'}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
                  ⏳ HC belum memilih slot presentasi. Bagikan link <strong>/pilih-slot</strong> ke HC.
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Kirim Laporan PDF</h3>
              {request.status_laporan === 'Laporan Dikirim' && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">✓ Laporan sudah dikirim</div>
              )}
              <form onSubmit={submitLaporan} className="space-y-4">
                <div>
                  <label className="form-label">Upload File PDF *</label>
                  <input type="file" accept=".pdf" className="form-input"
                    onChange={e => setFileLaporan(e.target.files[0])} />
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
