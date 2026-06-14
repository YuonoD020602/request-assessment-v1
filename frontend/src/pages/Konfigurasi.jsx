import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CONFIG_GROUPS = [
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
    title: 'Tim Pelaksana',
    keys: [
      { key: 'assessor_1_nama', label: 'Nama Assessor 1', type: 'text' },
      { key: 'assessor_1_email', label: 'Email Assessor 1', type: 'email' },
      { key: 'assessor_2_nama', label: 'Nama Assessor 2', type: 'text' },
      { key: 'assessor_2_email', label: 'Email Assessor 2', type: 'email' },
      { key: 'admin_ac_1_nama', label: 'Nama Administrator', type: 'text' },
      { key: 'admin_ac_1_email', label: 'Email Administrator', type: 'email' },
      { key: 'roleplayer_1_nama', label: 'Nama Roleplayer', type: 'text' },
      { key: 'roleplayer_1_email', label: 'Email Roleplayer', type: 'email' },
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

  useEffect(() => {
    api.get('/api/config')
      .then(res => setConfig(res.data.data || {}))
      .catch(() => toast.error('Gagal memuat konfigurasi'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/config', config);
      toast.success('Konfigurasi berhasil disimpan');
    } catch { toast.error('Gagal menyimpan'); }
    finally { setSaving(false); }
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
            {saving ? 'Menyimpan...' : '💾 Simpan Semua'}
          </button>
        </div>

        {CONFIG_GROUPS.map(group => (
          <div key={group.title} className="card">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{group.title}</h3>
            <div className="grid grid-cols-2 gap-4">
              {group.keys.map(item => (
                <div key={item.key}>
                  <label className="form-label">{item.label}</label>
                  <input type={item.type} className="form-input"
                    value={config[item.key] || ''}
                    onChange={e => setConfig({...config, [item.key]: e.target.value})} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
