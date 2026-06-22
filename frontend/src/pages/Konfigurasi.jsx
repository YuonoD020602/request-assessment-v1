import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CONFIG_GROUPS_STATIC = [
  {
    title: 'Jadwal AC',
    desc: 'Periode dan kuota pendaftaran Assessment Center',
    accent: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-50',
    iconCls: 'text-blue-500',
    svg: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    keys: [
      { key: 'periode_ac', label: 'Periode AC (contoh: Juli 2026)', type: 'text', col: 1 },
      { key: 'tanggal_buka', label: 'Tanggal Buka Pendaftaran', type: 'date', col: 1 },
      { key: 'tanggal_tutup', label: 'Tanggal Tutup Pendaftaran', type: 'date', col: 1 },
      { key: 'kuota_maks', label: 'Kuota Maksimal Peserta', type: 'number', col: 1 },
    ]
  },
  {
    title: 'Approver',
    desc: 'Pejabat yang berwenang menyetujui request',
    accent: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50',
    iconCls: 'text-violet-500',
    svg: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
    keys: [
      { key: 'approver_1_nama', label: 'Nama Approver 1', type: 'text' },
      { key: 'approver_1_email', label: 'Email Approver 1', type: 'email' },
      { key: 'approver_2_nama', label: 'Nama Approver 2', type: 'text' },
      { key: 'approver_2_email', label: 'Email Approver 2', type: 'email' },
    ]
  },
  {
    title: 'URL & Link',
    desc: 'Tautan dokumen dan form yang digunakan sistem',
    accent: 'from-teal-500 to-emerald-600',
    iconBg: 'bg-teal-50',
    iconCls: 'text-teal-500',
    svg: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>,
    keys: [
      { key: 'file_zip_dokumen_url', label: 'URL ZIP Dokumen Lanjutan', type: 'url', full: true },
      { key: 'link_keperluan_asesmen', label: 'Link Keperluan Asesmen (dikirim ke Tim Pelaksana)', type: 'url', full: true },
      { key: 'link_form_pengajuan', label: 'Link Template Form Pengajuan Potential Review & Profiling', type: 'url', full: true },
      { key: 'link_form_star', label: 'Link Form STAR (dikirim ke HC & Peserta via MoM)', type: 'url', full: true },
    ]
  }
];

const PersonRow = ({ idx, item, onUpdate, onRemove, placeholder }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
    <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-slate-600">{idx + 1}</span>
    </div>
    <input type="text" placeholder={`Nama ${placeholder}`} className="form-input flex-1 text-sm"
      value={item.nama} onChange={e => onUpdate(idx, 'nama', e.target.value)} />
    <input type="email" placeholder={`Email ${placeholder}`} className="form-input flex-1 text-sm"
      value={item.email} onChange={e => onUpdate(idx, 'email', e.target.value)} />
    <button onClick={() => onRemove(idx)}
      className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-white hover:bg-red-500 rounded-lg transition-all flex-shrink-0">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  </div>
);

const TeamSection = ({ title, items, onAdd, onUpdate, onRemove, placeholder, accent, svg }) => (
  <div className="mb-6 last:mb-0">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center`}>
          <span className="text-white scale-75">{svg}</span>
        </div>
        <p className="text-sm font-bold text-gray-700">{title}</p>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{items.length}</span>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
        Tambah {placeholder}
      </button>
    </div>
    <div className="space-y-2">
      {items.map((item, idx) => (
        <PersonRow key={idx} idx={idx} item={item} onUpdate={onUpdate} onRemove={onRemove} placeholder={placeholder} />
      ))}
    </div>
  </div>
);

export default function Konfigurasi() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [assessors, setAssessors] = useState([{ nama: '', email: '' }]);
  const [roleplayers, setRoleplayers] = useState([{ nama: '', email: '' }]);
  const [admins, setAdmins] = useState([{ nama: '', email: '' }]);

  useEffect(() => {
    api.get('/api/config')
      .then(res => {
        const data = res.data.data || {};
        setConfig(data);
        const loadedAssessors = [];
        let i = 1;
        while (data[`assessor_${i}_nama`] || data[`assessor_${i}_email`]) {
          loadedAssessors.push({ nama: data[`assessor_${i}_nama`] || '', email: data[`assessor_${i}_email`] || '' });
          i++;
        }
        if (loadedAssessors.length > 0) setAssessors(loadedAssessors);
        const loadedRoleplayers = [];
        let j = 1;
        while (data[`roleplayer_${j}_nama`] || data[`roleplayer_${j}_email`]) {
          loadedRoleplayers.push({ nama: data[`roleplayer_${j}_nama`] || '', email: data[`roleplayer_${j}_email`] || '' });
          j++;
        }
        if (loadedRoleplayers.length > 0) setRoleplayers(loadedRoleplayers);
        const loadedAdmins = [];
        let k = 1;
        while (data[`admin_ac_${k}_nama`] || data[`admin_ac_${k}_email`]) {
          loadedAdmins.push({ nama: data[`admin_ac_${k}_nama`] || '', email: data[`admin_ac_${k}_email`] || '' });
          k++;
        }
        if (loadedAdmins.length > 0) setAdmins(loadedAdmins);
      })
      .catch(() => toast.error('Gagal memuat konfigurasi'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const timConfig = {};
      assessors.forEach((a, idx) => { timConfig[`assessor_${idx + 1}_nama`] = a.nama; timConfig[`assessor_${idx + 1}_email`] = a.email; });
      for (let i = assessors.length + 1; i <= 10; i++) { timConfig[`assessor_${i}_nama`] = ''; timConfig[`assessor_${i}_email`] = ''; }
      roleplayers.forEach((r, idx) => { timConfig[`roleplayer_${idx + 1}_nama`] = r.nama; timConfig[`roleplayer_${idx + 1}_email`] = r.email; });
      for (let i = roleplayers.length + 1; i <= 10; i++) { timConfig[`roleplayer_${i}_nama`] = ''; timConfig[`roleplayer_${i}_email`] = ''; }
      admins.forEach((a, idx) => { timConfig[`admin_ac_${idx + 1}_nama`] = a.nama; timConfig[`admin_ac_${idx + 1}_email`] = a.email; });
      for (let i = admins.length + 1; i <= 10; i++) { timConfig[`admin_ac_${i}_nama`] = ''; timConfig[`admin_ac_${i}_email`] = ''; }
      await api.put('/api/config', { ...config, ...timConfig });
      toast.success('Konfigurasi berhasil disimpan');
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const addAssessor = () => setAssessors([...assessors, { nama: '', email: '' }]);
  const removeAssessor = (idx) => { if (assessors.length === 1) return toast.error('Minimal 1 assessor'); setAssessors(assessors.filter((_, i) => i !== idx)); };
  const updateAssessor = (idx, field, value) => { const u = [...assessors]; u[idx][field] = value; setAssessors(u); };

  const addRoleplayer = () => setRoleplayers([...roleplayers, { nama: '', email: '' }]);
  const removeRoleplayer = (idx) => { if (roleplayers.length === 1) return toast.error('Minimal 1 roleplayer'); setRoleplayers(roleplayers.filter((_, i) => i !== idx)); };
  const updateRoleplayer = (idx, field, value) => { const u = [...roleplayers]; u[idx][field] = value; setRoleplayers(u); };

  const addAdmin = () => setAdmins([...admins, { nama: '', email: '' }]);
  const removeAdmin = (idx) => { if (admins.length === 1) return toast.error('Minimal 1 administrator'); setAdmins(admins.filter((_, i) => i !== idx)); };
  const updateAdmin = (idx, field, value) => { const u = [...admins]; u[idx][field] = value; setAdmins(u); };

  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-8 h-8 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Memuat konfigurasi...</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6">

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl p-7 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Pengaturan Sistem</p>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Konfigurasi</h1>
              <p className="text-slate-300 text-sm mt-1.5">Pengaturan umum sistem Request Assessment Center</p>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-white text-slate-800 text-sm font-bold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60">
              {saving
                ? <><div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> Menyimpan...</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg> Simpan Semua</>}
            </button>
          </div>
        </div>

        {/* Config Groups */}
        {CONFIG_GROUPS_STATIC.map(group => (
          <div key={group.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${group.accent}`} style={{ position: 'relative', width: 4, height: 40, borderRadius: 4 }}
                className={`w-1 h-10 rounded-full bg-gradient-to-b ${group.accent} flex-shrink-0`} />
              <div className={`w-9 h-9 ${group.iconBg} rounded-xl flex items-center justify-center ${group.iconCls}`}>
                {group.svg}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{group.title}</p>
                <p className="text-xs text-gray-400">{group.desc}</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {group.keys.map(item => (
                  <div key={item.key} className={item.full ? 'col-span-2' : ''}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{item.label}</label>
                    <input type={item.type} className="form-input text-sm"
                      value={config[item.key] || ''}
                      onChange={e => setConfig({ ...config, [item.key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Tim Pelaksana */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
            <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Tim Pelaksana</p>
              <p className="text-xs text-gray-400">Administrator, Assessor, dan Roleplayer yang terlibat</p>
            </div>
          </div>
          <div className="p-6">
            <TeamSection
              title="Administrator AC" items={admins}
              onAdd={addAdmin} onUpdate={updateAdmin} onRemove={removeAdmin}
              placeholder="Administrator"
              accent="from-slate-500 to-slate-700"
              svg={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>}
            />
            <div className="border-t border-dashed border-gray-100 my-5" />
            <TeamSection
              title="Assessor" items={assessors}
              onAdd={addAssessor} onUpdate={updateAssessor} onRemove={removeAssessor}
              placeholder="Assessor"
              accent="from-blue-500 to-indigo-600"
              svg={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
            />
            <div className="border-t border-dashed border-gray-100 my-5" />
            <TeamSection
              title="Roleplayer" items={roleplayers}
              onAdd={addRoleplayer} onUpdate={updateRoleplayer} onRemove={removeRoleplayer}
              placeholder="Roleplayer"
              accent="from-violet-500 to-purple-600"
              svg={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
          </div>
        </div>

      </div>
    </Layout>
  );
}
