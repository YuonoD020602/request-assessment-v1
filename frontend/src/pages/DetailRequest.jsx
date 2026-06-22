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

  const [grForm, setGrForm] = useState({ tanggal_gr: '', jam_gr: '', lokasi_gr: '' });
  const [momForm, setMomForm] = useState({ mom_gr: '', kompetensi_alc: '', tanggal_psikotes: '', jam_psikotes: '', tanggal_ac: '', lokasi_ac: '' });
  const [jadwalAcForm, setJadwalAcForm] = useState({ ruangan_ac: '' });
  const [penugasanTim, setPenugasanTim] = useState([{ roleplayer: '', assessor: '', ruangan: '' }]);
  const [formsReady, setFormsReady] = useState(false);
  const [fileLaporan, setFileLaporan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [logList, setLogList] = useState([]);
  const [configData, setConfigData] = useState({});

  useEffect(() => {
    fetchRequest();
    fetchLog();
    api.get('/api/config').then(res => {
      const d = res.data.data || {};
      setConfig(d);
      setConfigData(d);
    }).catch(() => {});
  }, [idRequest]);

  const fetchLog = async () => {
    try {
      const res = await api.get(`/api/requests/${idRequest}/log`);
      setLogList(res.data.data || []);
    } catch { }
  };

  const fetchRequest = async () => {
    try {
      const res = await api.get(`/api/requests/${idRequest}`);
      const r = res.data.data;
      setRequest(r);
      // Pre-fill forms dengan data existing
      if (r.tanggal_gr) setGrForm({ tanggal_gr: r.tanggal_gr, jam_gr: r.jam_gr || '', lokasi_gr: r.lokasi_gr || '' });
      if (r.mom_gr) setMomForm({ mom_gr: r.mom_gr, kompetensi_alc: r.kompetensi_alc || '', tanggal_psikotes: r.tanggal_psikotes || '', jam_psikotes: r.jam_psikotes || '', tanggal_ac: r.tanggal_ac || '', lokasi_ac: r.lokasi_ac || '' });
      if (r.ruangan_ac) setJadwalAcForm({ ruangan_ac: r.ruangan_ac || '' });
      if (r.penugasan_tim && Array.isArray(r.penugasan_tim) && r.penugasan_tim.length > 0) setPenugasanTim(r.penugasan_tim);
      setFormsReady(true);
    } catch { toast.error('Request tidak ditemukan'); navigate('/dashboard'); }
    finally { setLoading(false); }
  };

  const refresh = () => { fetchRequest(); fetchLog(); };

  const submitGR = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase3/jadwal-gr', { id_request: idRequest, ...grForm });
      toast.success('Jadwal GR berhasil dikirim!'); refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const submitMOM = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase3/input-mom', { id_request: idRequest, ...momForm });
      toast.success('MOM berhasil dikirim!'); refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const submitJadwalAC = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/fase4/jadwal-ac', { id_request: idRequest, ...jadwalAcForm, penugasan_tim: penugasanTim });
      toast.success('Jadwal AC berhasil disimpan!'); refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const kirimReminderManual = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/fase4/kirim-reminder-manual', { id_request: idRequest });
      toast.success('Reminder berhasil dikirim ke HC!'); refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const kirimReminderBookingJadwal = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/fase5/kirim-reminder-booking', { id_request: idRequest });
      toast.success('Reminder booking jadwal berhasil dikirim!'); refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const kirimNotifPilihSlot = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/fase6/notif-pilih-slot', { id_request: idRequest });
      toast.success('Notifikasi berhasil dikirim ke HC!');
      refresh();
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
      refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">Memuat...</div></Layout>;
  if (!request) return null;

  // Build assessor & roleplayer options from configData
  const assessorOptions = (() => {
    const opts = [];
    let i = 1;
    while (configData[`assessor_${i}_nama`]) {
      opts.push(configData[`assessor_${i}_nama`]);
      i++;
    }
    return opts;
  })();
  const roleplayerOptions = (() => {
    const opts = [];
    let i = 1;
    while (configData[`roleplayer_${i}_nama`]) {
      opts.push(configData[`roleplayer_${i}_nama`]);
      i++;
    }
    return opts;
  })();

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'fase3', label: 'Fase 3 – GR' },
    { id: 'fase4', label: 'Fase 4 – Persiapan' },
    { id: 'fase6', label: 'Fase 6 – Laporan' },
    { id: 'riwayat', label: `Riwayat (${logList.length})` },
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
                {request.dokumen_peserta_url && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-28">Dok. Pengajuan</span>
                    <a href={request.dokumen_peserta_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
                      📄 Download PDF
                    </a>
                  </div>
                )}
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
                    onChange={e => setMomForm({...momForm, mom_gr: e.target.value})} /></div>
                <div><label className="form-label">Kompetensi yang Diuji (ALC)</label>
                  <input className="form-input" placeholder="contoh: Planning & Organizing, Communication, Leadership"
                    value={momForm.kompetensi_alc}
                    onChange={e => setMomForm({...momForm, kompetensi_alc: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Tanggal Psikotes</label>
                    <input type="date" className="form-input"
                      value={momForm.tanggal_psikotes}
                      onChange={e => setMomForm({...momForm, tanggal_psikotes: e.target.value})} /></div>
                  <div><label className="form-label">Jam Psikotes</label>
                    <input className="form-input" placeholder="contoh: 08.00–10.00"
                      value={momForm.jam_psikotes}
                      onChange={e => setMomForm({...momForm, jam_psikotes: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Tanggal AC</label>
                    <input type="date" className="form-input"
                      value={momForm.tanggal_ac}
                      onChange={e => setMomForm({...momForm, tanggal_ac: e.target.value})} /></div>
                  <div><label className="form-label">Lokasi AC</label>
                    <input className="form-input" placeholder="Gedung AMDI A, Sunter"
                      value={momForm.lokasi_ac}
                      onChange={e => setMomForm({...momForm, lokasi_ac: e.target.value})} /></div>
                </div>
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
              {request.link_data_karyawan && (
                <div className="mt-3 space-y-1 text-sm">
                  <a href={request.link_data_karyawan} target="_blank" className="text-blue-600 hover:underline block">📄 Data Karyawan</a>
                  <a href={request.link_form_star} target="_blank" className="text-blue-600 hover:underline block">📄 Form STAR</a>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Penugasan Tim & Ruangan AC</h3>
              {request.tanggal_ac && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  ✓ Jadwal AC: {request.tanggal_ac} 08.00–15.00 WIB – {request.lokasi_ac}
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
                <div className="col-span-2"><label className="form-label">Ruangan AC</label><input className="form-input" placeholder="contoh: Ruang Meeting Lantai 3 – Astra International" value={jadwalAcForm.ruangan_ac} onChange={e => setJadwalAcForm({...jadwalAcForm, ruangan_ac: e.target.value})} /></div>

                {/* Penugasan Tim */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">Penugasan Tim (Roleplayer – Assessor – Ruangan)</label>
                    <button type="button"
                      onClick={() => setPenugasanTim([...penugasanTim, { roleplayer: '', assessor: '', ruangan: '' }])}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                      Tambah Baris
                    </button>
                  </div>
                  <div className="space-y-2">
                    {penugasanTim.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                        <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-slate-600">{idx + 1}</span>
                        </div>
                        <select className="form-input flex-1 text-sm"
                          value={p.roleplayer}
                          onChange={e => { const u = [...penugasanTim]; u[idx].roleplayer = e.target.value; setPenugasanTim(u); }}>
                          <option value="">-- Roleplayer --</option>
                          {roleplayerOptions.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <select className="form-input flex-1 text-sm"
                          value={p.assessor}
                          onChange={e => { const u = [...penugasanTim]; u[idx].assessor = e.target.value; setPenugasanTim(u); }}>
                          <option value="">-- Assessor --</option>
                          {assessorOptions.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <input className="form-input flex-1 text-sm" placeholder="Ruangan"
                          value={p.ruangan}
                          onChange={e => { const u = [...penugasanTim]; u[idx].ruangan = e.target.value; setPenugasanTim(u); }} />
                        <button type="button"
                          onClick={() => { if (penugasanTim.length === 1) return; setPenugasanTim(penugasanTim.filter((_, i) => i !== idx)); }}
                          className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-white hover:bg-red-500 rounded-lg transition-all flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-2"><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Simpan Penugasan Tim'}</button></div>
              </form>

              {request.tanggal_ac && (
                <div className="mt-4">
                  <button
                    onClick={kirimReminderManual}
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {submitting ? '⏳ Mengirim...' : '📧 Kirim Reminder Sekarang'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Fase 6 */}
        {activeTab === 'fase6' && user?.role === 'pic_asesmen' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Jadwal Presentasi Hasil AC</h3>
              {request.tanggal_presentasi ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-3">
                  <p className="text-sm font-semibold text-green-800 mb-2">✅ HC telah memilih slot presentasi</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Tanggal:</span> <strong>{request.tanggal_presentasi}</strong></p>
                    <p><span className="text-gray-500">Pukul:</span> <strong>{request.jam_presentasi} WIB</strong></p>
                    <p><span className="text-gray-500">Lokasi:</span> <strong>{request.lokasi_presentasi || '-'}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mb-3">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
                    <p className="font-medium mb-1">⏳ HC belum memilih slot presentasi</p>
                    <p className="text-xs text-yellow-600">Kirim notifikasi ke HC agar mereka memilih jadwal melalui halaman Cek Status.</p>
                  </div>
                  <button
                    onClick={kirimNotifPilihSlot}
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {submitting ? '⏳ Mengirim...' : '📧 Kirim Notifikasi Pilih Jadwal ke HC'}
                  </button>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                    <p className="font-medium mb-1">Atau bagikan link langsung:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 font-mono select-all truncate">
                        {window.location.origin}/cek-status?id={idRequest}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/cek-status?id=${idRequest}`); toast.success('Link disalin!'); }}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs whitespace-nowrap">
                        Salin
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={kirimReminderBookingJadwal}
                disabled={submitting}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                {submitting ? '⏳ Mengirim...' : '🔔 Kirim Reminder Booking Jadwal'}
              </button>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Kirim Laporan PDF</h3>
              {request.status_laporan === 'Laporan Dikirim' && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">✓ Laporan sudah dikirim</div>
              )}
              {request.status_laporan !== 'Laporan Dikirim' && (
                <form onSubmit={submitLaporan} className="space-y-4">
                  <div>
                    <label className="form-label">Upload File PDF *</label>
                    <input type="file" accept=".pdf" className="form-input"
                      onChange={e => setFileLaporan(e.target.files[0])} />
                  </div>
                  <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Kirim Laporan ke HC & User'}</button>
                </form>
              )}
            </div>
          </div>
        )}
        {/* Tab: Riwayat */}
        {activeTab === 'riwayat' && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Riwayat Aktivitas & Email</h3>
            {logList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Belum ada aktivitas tercatat</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {logList.map((log) => {
                    const tgl = new Date(log.created_at);
                    const label = tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    const jam = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
                    const isEmail = log.aktivitas === 'Email Terkirim';
                    return (
                      <div key={log.id} className="flex gap-4 pl-8 relative">
                        <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white ${isEmail ? 'bg-blue-500' : 'bg-green-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isEmail ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {log.aktivitas}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{log.detail}</p>
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0 text-right whitespace-nowrap">
                          <p>{label}</p>
                          <p>{jam} WIB</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
