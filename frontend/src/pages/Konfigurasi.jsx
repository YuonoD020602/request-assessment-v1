import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CONFIG_GROUPS_STATIC = [
  {
    title: 'Jadwal AC',
    keys: [
      { key: 'tanggal_ac', label: 'Tanggal Pelaksanaan AC', type: 'date' },
      { key: 'tenggat_pendaftaran', label: 'Tenggat Pendaftaran', type: 'date' },
      { key: 'kuota_maks', label: 'Kuota Maksimal Peserta', type: 'number' },
    ]
  },
  {
    title: 'Approver',
    keys: [
      { key: 'approver_1_nama', label: 'Nama Approver 1', type: 'text' },
      { key: 'approver_1_email', label: 'Email Approver 1', type: 'email' },
      { key: 'approver_2_nama', label: 'Nama Approver 2', type: 'text' },
      { key: 'approver_2_email', label: 'Email Approver 2', type: 'email' },
    ]
  },
  {
    title: 'URL & Link',
    keys: [
      { key: 'file_zip_dokumen_url', label: 'URL ZIP Dokumen Lanjutan', type: 'url' },
    ]
  }
];

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

        // Bangun array assessor dari config
        const loadedAssessors = [];
        let i = 1;
        while (data[`assessor_${i}_nama`] || data[`assessor_${i}_email`]) {
          loadedAssessors.push({ nama: data[`assessor_${i}_nama`] || '', email: data[`assessor_${i}_email`] || '' });
          i++;
        }
        if (loadedAssessors.length > 0) setAssessors(loadedAssessors);

        // Bangun array roleplayer dari config
        const loadedRoleplayers = [];
        let j = 1;
        while (data[`roleplayer_${j}_nama`] || data[`roleplayer_${j}_email`]) {
          loadedRoleplayers.push({ nama: data[`roleplayer_${j}_nama`] || '', email: data[`roleplayer_${j}_email`] || '' });
          j++;
        }
        if (loadedRoleplayers.length > 0) setRoleplayers(loadedRoleplayers);

        // Bangun array admin dari config
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

      assessors.forEach((a, idx) => {
        timConfig[`assessor_${idx + 1}_nama`] = a.nama;
        timConfig[`assessor_${idx + 1}_email`] = a.email;
      });
      for (let i = assessors.length + 1; i <= 10; i++) {
        timConfig[`assessor_${i}_nama`] = '';
        timConfig[`assessor_${i}_email`] = '';
      }

      roleplayers.forEach((r, idx) => {
        timConfig[`roleplayer_${idx + 1}_nama`] = r.nama;
        timConfig[`roleplayer_${idx + 1}_email`] = r.email;
      });
      for (let i = roleplayers.length + 1; i <= 10; i++) {
        timConfig[`roleplayer_${i}_nama`] = '';
        timConfig[`roleplayer_${i}_email`] = '';
      }

      admins.forEach((a, idx) => {
        timConfig[`admin_ac_${idx + 1}_nama`] = a.nama;
        timConfig[`admin_ac_${idx + 1}_email`] = a.email;
      });
      for (let i = admins.length + 1; i <= 10; i++) {
        timConfig[`admin_ac_${i}_nama`] = '';
        timConfig[`admin_ac_${i}_email`] = '';
      }

      await api.put('/api/config', { ...config, ...timConfig });
      toast.success('Konfigurasi berhasil disimpan');
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // Handler assessor
  const addAssessor = () => setAssessors([...assessors, { nama: '', email: '' }]);
  const removeAssessor = (idx) => {
    if (assessors.length === 1) return toast.error('Minimal 1 assessor');
    setAssessors(assessors.filter((_, i) => i !== idx));
  };
  const updateAssessor = (idx, field, value) => {
    const updated = [...assessors];
    updated[idx][field] = value;
    setAssessors(updated);
  };

  // Handler roleplayer
  const addRoleplayer = () => setRoleplayers([...roleplayers, { nama: '', email: '' }]);
  const removeRoleplayer = (idx) => {
    if (roleplayers.length === 1) return toast.error('Minimal 1 roleplayer');
    setRoleplayers(roleplayers.filter((_, i) => i !== idx));
  };
  const updateRoleplayer = (idx, field, value) => {
    const updated = [...roleplayers];
    updated[idx][field] = value;
    setRoleplayers(updated);
  };

  // Handler admin
  const addAdmin = () => setAdmins([...admins, { nama: '', email: '' }]);
  const removeAdmin = (idx) => {
    if (admins.length === 1) return toast.error('Minimal 1 administrator');
    setAdmins(admins.filter((_, i) => i !== idx));
  };
  const updateAdmin = (idx, field, value) => {
    const updated = [...admins];
    updated[idx][field] = value;
    setAdmins(updated);
  };

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">Memuat...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Konfigurasi Sistem</h1>
            <p className="text-gray-500 text-sm mt-1">Pengaturan umum sistem Request Assessment</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan...' : 'Simpan Semua'}
          </button>
        </div>

        {/* Grup statis: Jadwal AC, Approver, URL */}
        {CONFIG_GROUPS_STATIC.map(group => (
          <div key={group.title} className="card">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{group.title}</h3>
            <div className="grid grid-cols-2 gap-4">
              {group.keys.map(item => (
                <div key={item.key}>
                  <label className="form-label">{item.label}</label>
                  <input type={item.type} className="form-input"
                    value={config[item.key] || ''}
                    onChange={e => setConfig({ ...config, [item.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Tim Pelaksana - Dynamic */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Tim Pelaksana</h3>

          {/* Administrator - Dynamic */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Administrator AC</p>
              <button onClick={addAdmin}
                className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition-colors">
                + Tambah Administrator
              </button>
            </div>
            <div className="space-y-3">
              {admins.map((a, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}</span>
                  <input type="text" placeholder="Nama Administrator" className="form-input flex-1"
                    value={a.nama}
                    onChange={e => updateAdmin(idx, 'nama', e.target.value)} />
                  <input type="email" placeholder="Email Administrator" className="form-input flex-1"
                    value={a.email}
                    onChange={e => updateAdmin(idx, 'email', e.target.value)} />
                  <button onClick={() => removeAdmin(idx)}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    title="Hapus administrator ini">
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assessor - Dynamic */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Assessor</p>
              <button onClick={addAssessor}
                className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition-colors">
                + Tambah Assessor
              </button>
            </div>
            <div className="space-y-3">
              {assessors.map((a, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}</span>
                  <input type="text" placeholder="Nama Assessor" className="form-input flex-1"
                    value={a.nama}
                    onChange={e => updateAssessor(idx, 'nama', e.target.value)} />
                  <input type="email" placeholder="Email Assessor" className="form-input flex-1"
                    value={a.email}
                    onChange={e => updateAssessor(idx, 'email', e.target.value)} />
                  <button onClick={() => removeAssessor(idx)}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    title="Hapus assessor ini">
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Roleplayer - Dynamic */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Roleplayer</p>
              <button onClick={addRoleplayer}
                className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition-colors">
                + Tambah Roleplayer
              </button>
            </div>
            <div className="space-y-3">
              {roleplayers.map((r, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}</span>
                  <input type="text" placeholder="Nama Roleplayer" className="form-input flex-1"
                    value={r.nama}
                    onChange={e => updateRoleplayer(idx, 'nama', e.target.value)} />
                  <input type="email" placeholder="Email Roleplayer" className="form-input flex-1"
                    value={r.email}
                    onChange={e => updateRoleplayer(idx, 'email', e.target.value)} />
                  <button onClick={() => removeRoleplayer(idx)}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    title="Hapus roleplayer ini">
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
