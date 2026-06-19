# Panduan Sistem Request Assessment Center (AC)
**Versi:** V3  
**Tanggal:** 19 Juni 2026  
**Catatan:** Dokumen ini diperbarui secara menyeluruh mencakup semua revisi Batch 1–7 dan hasil audit sistem.

---

## DAFTAR ISI

- [BAB 0 – Kredensial dan Akses](#bab-0--kredensial-dan-akses)
- [BAB 1 – Pengantar Sistem](#bab-1--pengantar-sistem)
- [BAB 2 – Link dan Akses Sistem](#bab-2--link-dan-akses-sistem)
- [BAB 3 – Panduan PIC Asesmen](#bab-3--panduan-pic-asesmen)
- [BAB 4 – Panduan HC PGA/SO](#bab-4--panduan-hc-pgaso)
- [BAB 5 – Struktur Teknis](#bab-5--struktur-teknis)
- [BAB 6 – Cara Revisi dan Update Sistem](#bab-6--cara-revisi-dan-update-sistem)
- [BAB 7 – Troubleshooting](#bab-7--troubleshooting)
- [BAB 8 – Panduan Testing](#bab-8--panduan-testing)
- [RIWAYAT REVISI](#riwayat-revisi)

---

# BAB 0 – Kredensial dan Akses

## Supabase

| Item | Detail |
|------|--------|
| URL Dashboard | https://supabase.com/dashboard |
| Project Name | request-assessment-v1 |
| Project URL | (lihat di Settings → API) |
| Anon Key | (lihat di Settings → API → Project API keys) |
| Service Role Key | (lihat di Settings → API → Project API keys) |
| Database Password | (lihat di Settings → Database) |

### Tabel Database Aktif

| Tabel | Keterangan |
|-------|------------|
| `requests` | Semua data pengajuan, jadwal, status peserta |
| `daftar_hc` | Daftar HC PGA/SO yang terdaftar |
| `konfigurasi` | Pengaturan sistem dalam format key-value |
| `token_approval` | Token untuk proses persetujuan approver |
| `log_aktivitas` | Log semua aktivitas dan pengiriman email |
| `slot_presentasi` | Slot jadwal presentasi yang dapat dipilih HC |
| `users` | Data akun pengguna sistem (PIC Asesmen) |

### Supabase Storage

| Item | Detail |
|------|--------|
| Bucket | `laporan-pdf` (public) |
| Path Format | `{id_request}/laporan_{timestamp}.pdf` |
| Akses Upload | Service Role (via backend) |

---

## Railway (Backend)

| Item | Detail |
|------|--------|
| Dashboard | https://railway.app |
| Service Name | request-assessment-v1 (backend) |
| Runtime | Node.js + Express |
| Deploy Trigger | Push ke branch `main` di GitHub |

### Environment Variables Backend (Railway)

| Variable | Keterangan |
|----------|------------|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase |
| `RESEND_API_KEY` | API key Resend untuk pengiriman email |
| `FROM_EMAIL` | Alamat email pengirim (domain lyraac.site) |
| `FRONTEND_URL` | URL frontend (Vercel) |
| `PORT` | Port server (default: 3000) |

---

## Vercel (Frontend)

| Item | Detail |
|------|--------|
| Dashboard | https://vercel.com |
| Framework | React + Vite + TailwindCSS |
| Deploy Trigger | Push ke branch `main` di GitHub |

### Environment Variables Frontend (Vercel)

| Variable | Keterangan |
|----------|------------|
| `VITE_API_URL` | URL backend Railway |
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |

---

## GitHub

| Item | Detail |
|------|--------|
| Repository | request-assessment-v1 |
| Branch Utama | `main` |
| Branch Kerja Terakhir | `claude/gifted-knuth-epwary` → sudah di-merge ke `main` |

---

## Resend (Email)

| Item | Detail |
|------|--------|
| Dashboard | https://resend.com |
| Domain | lyraac.site (verified) |
| Alamat Pengirim | noreply@lyraac.site |
| DNS Records | SPF, DKIM, DMARC sudah dikonfigurasi di Cloudflare |

---

# BAB 1 – Pengantar Sistem

## Tentang Sistem

Sistem Request Assessment Center (RACD AIHO) adalah aplikasi web untuk mengelola alur pengajuan Assessment Center (AC) di PT Astra International. Sistem ini menggantikan proses manual berbasis email dan spreadsheet dengan alur digital yang terstruktur, otomatis, dan dapat dipantau secara real-time.

## Pengguna Sistem

| Pengguna | Role | Akses |
|----------|------|-------|
| PIC Asesmen (Admin AC) | `pic_asesmen` | Dashboard, Detail Request, Konfigurasi, Daftar HC, Slot Presentasi |
| HC PGA/SO | Publik | Form Pengajuan, Form Dokumen, Cek Status, Pilih Slot |
| Approver (Line Manager/HR) | Publik via token | Halaman Approve/Reject via link email |

## Alur 9 Fase Workflow

Setiap request peserta melewati alur status berikut:

```
Pending - Menunggu Review
    ↓ (Approver approve)
Approved
    ↓ (PIC kirim jadwal GR)
Menunggu GR
    ↓ (PIC input MOM GR)
GR Selesai - Menunggu Dokumen
    ↓ (HC upload dokumen)
Dokumen Diterima
    ↓ (PIC kirim jadwal psikotes)
Psikotes Dijadwalkan
    ↓ (PIC kirim jadwal AC)
AC Dijadwalkan
    ↓ (HC pilih slot presentasi)
Menunggu Presentasi
    ↓ (PIC upload laporan PDF)
Selesai
```

> Catatan: Status **Rejected** dapat terjadi kapan saja sebelum status Selesai, baik oleh Approver maupun PIC.

## Fitur Utama Sistem (V3)

- **Form Pengajuan Online:** HC mendaftarkan 1 atau lebih peserta dalam satu form
- **Approval via Email:** Approver menerima email dengan link Approve/Reject (token 7 hari)
- **Dashboard Interaktif:** Filter periode, perusahaan, status, search nama; 6 stats card; progress bar kapasitas; export CSV
- **Notifikasi Email Otomatis:** Setiap fase mengirim email ke pihak terkait secara otomatis
- **Invite Kalender (.ics):** Semua email jadwal menyertakan file .ics untuk Google Calendar & Outlook
- **Booking Slot Presentasi:** HC memilih sendiri slot presentasi via /pilih-slot (anti double-booking)
- **Upload PDF Laporan:** PIC upload laporan, dikirim sebagai attachment email ke HC & atasan
- **Cek Status Publik:** HC cek status by ID Request atau by Email HC
- **Dual-Mode Search:** Cari status by ID Request tunggal atau by Email HC (tampil semua peserta)
- **Track Record Email:** Semua pengiriman email dicatat di log_aktivitas dengan timestamp WIB
- **Cascade Delete:** Hapus request otomatis membersihkan semua data terkait

---

# BAB 2 – Link dan Akses Sistem

## Halaman Publik (Tanpa Login)

| Halaman | URL | Keterangan |
|---------|-----|------------|
| Form Pengajuan | `/form-pengajuan` | HC mengisi pengajuan peserta |
| Form Dokumen | `/form-dokumen?id=[ID_REQUEST]` | HC/Peserta upload link dokumen |
| Cek Status | `/cek-status` | Cek status by ID atau by Email HC |
| Pilih Slot Presentasi | `/pilih-slot` | HC memilih slot jadwal presentasi |

## Halaman PIC (Memerlukan Login)

| Halaman | URL | Keterangan |
|---------|-----|------------|
| Dashboard | `/dashboard` | Ringkasan semua request + filter + export |
| Detail Request | `/dashboard/request/[ID]` | Kelola fase per request |
| Daftar HC | `/daftar-hc` | Manajemen HC + kirim email pembukaan |
| Konfigurasi | `/konfigurasi` | Pengaturan sistem & tim pelaksana |
| Slot Presentasi | `/slot-presentasi` | Tambah & kelola slot jadwal presentasi |
| Setup Password | `/setup-password` | Setup/ganti password akun PIC |

## Halaman Approver (Akses via Token Email)

| Halaman | URL |
|---------|-----|
| Halaman Approval | `/approve?token=[TOKEN]` |

---

# BAB 3 – Panduan PIC Asesmen

## 3.1 Setup Password Pertama Kali

1. Buka URL sistem di browser
2. Masuk ke `/setup-password`
3. Masukkan email akun PIC yang telah dibuat di Supabase
4. Set password baru
5. Login dengan email dan password yang telah dibuat

## 3.2 Konfigurasi Sistem

Sebelum membuka pendaftaran, PIC wajib mengisi Konfigurasi di `/konfigurasi`.

### Field Konfigurasi

| Field | Tipe | Contoh | Keterangan |
|-------|------|--------|------------|
| `tanggal_buka` | Date | 2026-07-01 | Tanggal mulai form pengajuan dapat diakses |
| `tanggal_tutup` | Date | 2026-07-15 | Tanggal terakhir pengajuan diterima |
| `periode_ac` | Text | Juli 2026 | Label periode AC (ditampilkan di email & dashboard) |
| `kuota_maks` | Number | 9 | Kuota maksimum (info saja, tidak membatasi pendaftaran) |
| `approver_1_nama` | Text | Budi Santoso | Nama approver pertama |
| `approver_1_email` | Email | budi@astra.co.id | Email approver pertama |
| `approver_2_nama` | Text | Siti Rahayu | Nama approver kedua |
| `approver_2_email` | Email | siti@astra.co.id | Email approver kedua |
| `assessor_N_nama` | Text | - | Nama assessor (N = 1, 2, 3, ...) |
| `assessor_N_email` | Email | - | Email assessor |
| `admin_ac_N_nama` | Text | - | Nama admin AC |
| `admin_ac_N_email` | Email | - | Email admin AC |
| `roleplayer_N_nama` | Text | - | Nama roleplayer |
| `roleplayer_N_email` | Email | - | Email roleplayer |
| `file_zip_dokumen_url` | URL | - | Link ZIP file dokumen persyaratan untuk HC |
| `link_keperluan_asesmen` | URL | - | Link dokumen keperluan asesmen (disisipkan di email Tim Pelaksana) |

> **Catatan:** Field assessor, admin AC, dan roleplayer bersifat dinamis — tambahkan sesuai kebutuhan. Sistem menggunakan pola `assessor_1_nama`, `assessor_1_email`, `assessor_2_nama`, dst.

## 3.3 Manajemen Daftar HC

1. Buka `/daftar-hc`
2. Tambah HC baru: masukkan nama dan email HC
3. Kirim **Email Pembukaan:** pilih HC dari daftar → klik "Kirim Email Pembukaan"
   - Email berisi link form pengajuan, periode AC (`periode_ac`), batas pendaftaran (`tanggal_tutup`), dan link ZIP dokumen
4. Semua pengiriman email tercatat di log_aktivitas

## 3.4 Mengelola Request – Fase per Fase

Setiap request dikelola melalui halaman Detail Request (`/dashboard/request/[ID]`).

---

### FASE 1 – Review & Approval

**Status awal:** Pending - Menunggu Review

**Yang terjadi:**
- Request masuk dari HC → email dikirim ke Approver 1 & Approver 2 dengan detail peserta (PDF terlampir)
- Approver klik link Approve atau Reject di email (token berlaku 7 hari)
- Setelah salah satu approver mengambil tindakan, semua token request tersebut otomatis di-invalidasi

**Setelah Approve:**
- Status berubah ke **Approved**
- Email notifikasi dikirim ke HC: Approved + link form dokumen + link ZIP

**Setelah Reject:**
- Status berubah ke **Rejected**
- Email notifikasi dikirim ke HC: Rejected + catatan penolakan

---

### FASE 2 – Verifikasi Kelengkapan

**Status:** Approved

**Yang dilakukan PIC:**
1. Review data pengajuan di Detail Request
2. Hubungi HC untuk konfirmasi jika ada data yang perlu dilengkapi
3. Setelah semua oke, lanjut ke Fase 3

---

### FASE 3 – Penjadwalan GR (Guided Reflection)

**Status:** Menunggu GR

**Langkah PIC:**
1. Buka Detail Request → section Fase 3
2. Isi form jadwal GR:
   - Tanggal GR
   - Jam GR
   - Lokasi/Link Meeting GR
3. Klik **"Kirim Undangan GR"**
   - Email + file `.ics` (1 jam) dikirim ke HC dan seluruh Tim Pelaksana
   - Log aktivitas mencatat "Dikirim"

**Jika ingin merevisi jadwal:**
- Buka kembali Fase 3 (form otomatis pre-fill dari data existing)
- Ubah data yang perlu direvisi
- Klik **"Update & Kirim Ulang Undangan GR"**
  - Email revisi dikirim dengan subject **[REVISI]** dan banner kuning peringatan
  - Log aktivitas mencatat "Direvisi"

**MOM GR:**
1. Setelah GR selesai, isi form MOM (Minutes of Meeting) GR
2. Klik "Kirim MOM GR"
   - Email MOM dikirim ke HC dan Tim Pelaksana
   - Status berubah ke **GR Selesai - Menunggu Dokumen**
   - Email ke HC menyertakan link form dokumen

---

### FASE 4 – Pengumpulan Dokumen

**Status:** GR Selesai - Menunggu Dokumen

**Proses:**
- HC membuka `/form-dokumen?id=[ID_REQUEST]`
- HC mengisi 3 link dokumen yang dipersyaratkan
- Setelah submit → status berubah ke **Dokumen Diterima**
- Email notifikasi ke Tim Pelaksana dikirim (menyertakan link keperluan asesmen jika dikonfigurasi)

**PIC tidak perlu melakukan apapun di fase ini** — proses berjalan otomatis setelah HC submit dokumen.

---

### FASE 5 – Penjadwalan Psikotes & AC

**Status:** Dokumen Diterima → Psikotes Dijadwalkan → AC Dijadwalkan

#### Jadwal Psikotes

1. Buka Detail Request → section Fase 5 (Psikotes)
2. Isi form jadwal psikotes:
   - Tanggal psikotes
   - Jam psikotes (input teks bebas, contoh: "08.00–10.00")
   - Lokasi psikotes
3. Klik **"Kirim Jadwal Psikotes"**
   - Email + file `.ics` (2 jam) dikirim ke HC dan Tim Pelaksana
   - Status berubah ke **Psikotes Dijadwalkan**

> **Catatan:** Field platform psikotes sudah dihapus. Email secara otomatis menyertakan teks: "Cek email dari astra.recruitment@ai.astra.co.id"

#### Jadwal AC

1. Setelah psikotes dijadwalkan, isi form jadwal AC:
   - Tanggal AC
   - Jam AC
   - Lokasi AC
2. Klik **"Kirim Jadwal AC"**
   - Email + file `.ics` (8 jam) dikirim ke HC dan Tim Pelaksana (termasuk link keperluan asesmen)
   - Status berubah ke **AC Dijadwalkan**

**Untuk merevisi jadwal psikotes atau AC:**
- Buka form (otomatis pre-fill)
- Ubah data
- Klik **"Update & Kirim Ulang ..."** → email revisi dengan subject [REVISI] dan banner kuning

---

### FASE 6 – Presentasi & Laporan

**Status:** AC Dijadwalkan → Menunggu Presentasi → Selesai

#### Mengarahkan HC untuk Pilih Slot Presentasi

1. Buka Detail Request → section Fase 6
2. Jika HC belum memilih slot, tampil kotak kuning berisi link `/pilih-slot`
3. Klik tombol **"Salin Link"** → link tersalin ke clipboard
4. Kirimkan link tersebut ke HC melalui WhatsApp/email

> Pastikan sudah menambahkan slot presentasi di `/slot-presentasi` sebelum mengirimkan link ke HC.

#### Menambah Slot Presentasi

1. Buka `/slot-presentasi`
2. Klik "Tambah Slot Baru"
3. Isi tanggal, jam, dan lokasi
4. Klik Simpan

#### Proses HC Memilih Slot

1. HC buka `/pilih-slot`
2. HC input ID Request
3. HC melihat daftar slot tersedia → pilih slot
4. Klik "Booking Slot"
   - Slot otomatis berubah ke status Terpesan
   - Jadwal presentasi tersimpan di request
   - Status request berubah ke **Menunggu Presentasi**
   - Email konfirmasi + `.ics` (2 jam) dikirim ke HC & User/Atasan
   - Notifikasi dikirim ke Admin AC

#### Upload Laporan PDF

1. Setelah AC dan presentasi selesai, buka Detail Request → Fase 6
2. Klik "Upload Laporan PDF"
3. Pilih file PDF laporan dari komputer
4. Klik **"Kirim Laporan"**
   - PDF disimpan ke Supabase Storage
   - Email dengan PDF terlampir dikirim ke HC & User/Atasan
   - Status request berubah ke **Selesai**
   - Form upload disembunyikan (tidak muncul lagi setelah laporan terkirim)

---

## 3.5 Dashboard

Buka `/dashboard` untuk melihat semua request.

### Stats Card

| Card | Keterangan |
|------|------------|
| Total | Semua request yang ada |
| Pending | Request menunggu review approver |
| Approved | Request sudah disetujui, proses berlanjut |
| Proses | Request sedang dalam proses (GR s/d Menunggu Presentasi) |
| Selesai | Request sudah selesai seluruh proses |
| Ditolak | Request yang di-Reject |

### Filter Bar

| Filter | Keterangan |
|--------|------------|
| Periode | Filter berdasarkan periode AC |
| Perusahaan | Filter berdasarkan perusahaan peserta |
| Status | Filter berdasarkan status workflow |
| Search | Cari nama peserta |
| Reset | Hapus semua filter aktif |

### Progress Bar Kapasitas

- Menampilkan: X / kuota_maks slot terpakai per periode
- Hijau: < 70% kapasitas
- Kuning: ≥ 70% kapasitas
- Merah: ≥ 100% (sudah penuh)

### Export CSV

- Tombol **"Export CSV"** mengekspor data sesuai filter yang aktif
- File CSV dapat dibuka di Excel atau Google Sheets

### Hapus Request

- Tombol **"Hapus"** muncul di setiap baris **hanya untuk role `pic_asesmen`**
- Konfirmasi `window.confirm` muncul sebelum penghapusan
- Cascade delete: token_approval dihapus, log_aktivitas dihapus, slot_presentasi direset ke Tersedia, request dihapus

---

# BAB 4 – Panduan HC PGA/SO

## 4.1 Mendaftarkan Peserta

1. Terima email pembukaan dari PIC Asesmen
2. Klik link form pengajuan di email atau buka `/form-pengajuan`
3. Isi data:
   - Nama HC PGA/SO dan email
   - Perusahaan
   - Jenis Assessment: **Potential Review** atau **Profiling**
   - Jumlah peserta
   - Untuk setiap peserta: nama, jabatan, nama atasan, email atasan
4. Klik **"Submit Pengajuan"**
5. Catat ID Request yang diberikan (format: `REQ-YYYYMM-XXX`) — satu ID per peserta
6. Tunggu email notifikasi persetujuan dari sistem

> **Catatan:** Form pengajuan hanya bisa diisi antara `tanggal_buka` dan `tanggal_tutup` yang dikonfigurasi PIC.

## 4.2 Mengisi Dokumen

1. Terima email notifikasi bahwa GR sudah selesai
2. Klik link form dokumen di email, atau buka `/form-dokumen?id=[ID_REQUEST]`
3. Isi 3 link dokumen yang dipersyaratkan
4. Klik **"Submit Dokumen"**
5. Tunggu notifikasi jadwal psikotes dari PIC

## 4.3 Memilih Slot Presentasi

1. Terima link `/pilih-slot` dari PIC (dikirim via WhatsApp/email)
2. Buka link tersebut di browser
3. Masukkan ID Request peserta
4. Lihat daftar slot presentasi yang tersedia
5. Pilih slot yang sesuai
6. Klik **"Booking Slot"**
7. Cek email konfirmasi jadwal presentasi (beserta file .ics)

## 4.4 Cek Status Request

Buka `/cek-status` untuk memeriksa status terkini.

### Cari by ID Request

1. Pilih tab "Cari by ID Request"
2. Masukkan ID Request (contoh: `REQ-202607-001`)
3. Klik "Cek Status"
4. Lihat status dan informasi detail request

### Cari by Email HC

1. Pilih tab "Cari by Email HC"
2. Masukkan alamat email HC yang digunakan saat pendaftaran
3. Klik "Cek Status"
4. Lihat daftar semua peserta yang pernah didaftarkan email tersebut

### Warna Badge Status

| Status | Warna |
|--------|-------|
| Pending - Menunggu Review | Kuning |
| Menunggu GR | Orange |
| GR Selesai - Menunggu Dokumen | Amber |
| Dokumen Diterima | Teal |
| Psikotes Dijadwalkan | Violet |
| AC Dijadwalkan | Sky (biru muda) |
| Menunggu Presentasi | Indigo |
| Approved | Hijau |
| Rejected | Merah |
| Selesai | Biru |

---

# BAB 5 – Struktur Teknis

## 5.1 Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│                   Frontend                   │
│         React + Vite + TailwindCSS          │
│                  (Vercel)                    │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│                   Backend                    │
│             Node.js + Express               │
│                 (Railway)                    │
└────────┬─────────────────────┬──────────────┘
         │                     │
┌────────▼──────┐   ┌──────────▼──────────────┐
│   Supabase    │   │          Resend          │
│  PostgreSQL   │   │     Email Service        │
│   + Storage   │   │     (lyraac.site)        │
└───────────────┘   └─────────────────────────┘
```

## 5.2 Struktur Folder

```
request-assessment-v1/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DetailRequest.jsx
│   │   │   ├── FormPengajuan.jsx
│   │   │   ├── FormDokumen.jsx
│   │   │   ├── CekStatus.jsx
│   │   │   ├── Konfigurasi.jsx
│   │   │   ├── DaftarHC.jsx
│   │   │   ├── SlotPresentasi.jsx
│   │   │   ├── PilihSlot.jsx
│   │   │   └── SetupPassword.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   └── App.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── requests.js
│   │   │   ├── fase_routes.js
│   │   │   ├── approval.js
│   │   │   ├── hc.js
│   │   │   ├── slots.js
│   │   │   └── auth.js
│   │   ├── services/
│   │   │   ├── emailService.js
│   │   │   └── cronService.js
│   │   └── index.js
│   └── package.json
└── CATATAN_REVISI.md
```

## 5.3 API Endpoints Utama

### Requests

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/requests` | Submit pengajuan baru |
| GET | `/api/requests` | List semua request (PIC) |
| GET | `/api/requests/:id` | Detail request |
| DELETE | `/api/requests/:id` | Hapus request (cascade) |
| GET | `/api/requests/status/:id` | Cek status by ID (publik) |
| GET | `/api/requests/status/by-email/:email` | Cek status by email HC (publik) |

### Fase

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/fase3/kirim-gr` | Kirim jadwal GR |
| POST | `/api/fase3/kirim-mom` | Kirim MOM GR |
| POST | `/api/fase4/kirim-psikotes` | Kirim jadwal psikotes |
| POST | `/api/fase4/kirim-ac` | Kirim jadwal AC |
| POST | `/api/fase6/kirim-laporan` | Upload & kirim laporan PDF |

### Slot Presentasi

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/slots` | List semua slot (PIC) |
| POST | `/api/slots` | Tambah slot baru |
| GET | `/api/slots/tersedia` | List slot tersedia (publik) |
| POST | `/api/slots/booking` | Booking slot (atomic) |

### Approval

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/approval/verify` | Verifikasi token |
| POST | `/api/approval/action` | Eksekusi approve/reject |

## 5.4 Skema Database

### Tabel `requests`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id_request` | TEXT (PK) | Format REQ-YYYYMM-XXX |
| `nama_peserta` | TEXT | Nama peserta AC |
| `perusahaan` | TEXT | Nama perusahaan |
| `jabatan` | TEXT | Jabatan peserta |
| `jenis_assessment` | TEXT | Potential Review / Profiling |
| `nama_hc` | TEXT | Nama HC PGA/SO |
| `email_hc` | TEXT | Email HC |
| `nama_atasan` | TEXT | Nama atasan peserta |
| `email_atasan` | TEXT | Email atasan peserta |
| `status` | TEXT | Status workflow |
| `tanggal_pengajuan` | TIMESTAMPTZ | Waktu submit form |
| `tanggal_gr` | DATE | Tanggal GR |
| `jam_gr` | TEXT | Jam GR |
| `lokasi_gr` | TEXT | Lokasi/link GR |
| `tanggal_psikotes` | DATE | Tanggal psikotes |
| `jam_psikotes` | TEXT | Jam psikotes (teks bebas, contoh: "08.00–10.00") |
| `lokasi_psikotes` | TEXT | Lokasi psikotes |
| `tanggal_ac` | DATE | Tanggal AC |
| `jam_ac` | TEXT | Jam AC |
| `lokasi_ac` | TEXT | Lokasi AC |
| `tanggal_presentasi` | DATE | Tanggal presentasi (dari slot) |
| `jam_presentasi` | TEXT | Jam presentasi |
| `lokasi_presentasi` | TEXT | Lokasi presentasi |
| `status_laporan` | TEXT | Null / Laporan Dikirim |
| `catatan_penolakan` | TEXT | Catatan jika di-Reject |
| `dokumen_1` | TEXT | Link dokumen 1 |
| `dokumen_2` | TEXT | Link dokumen 2 |
| `dokumen_3` | TEXT | Link dokumen 3 |

### Tabel `slot_presentasi`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | ID slot |
| `tanggal` | DATE | Tanggal presentasi |
| `jam` | TEXT | Jam presentasi |
| `lokasi` | TEXT | Lokasi presentasi |
| `id_request` | TEXT | Request yang booking (null jika Tersedia) |
| `status` | TEXT | Tersedia / Terpesan |

### Tabel `token_approval`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | ID token |
| `id_request` | TEXT | ID request terkait |
| `token` | TEXT | Token unik (UUID) |
| `action` | TEXT | approve / reject |
| `used` | BOOLEAN | Sudah digunakan? |
| `expired_at` | TIMESTAMPTZ | Waktu kadaluarsa (7 hari dari insert) |

### Tabel `konfigurasi`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `key` | TEXT (PK) | Nama field konfigurasi |
| `value` | TEXT | Nilai konfigurasi |

### Tabel `log_aktivitas`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | ID log |
| `id_request` | TEXT | Request terkait |
| `aksi` | TEXT | Deskripsi aksi (misal: "Email GR Dikirim") |
| `detail` | TEXT | Detail tambahan (email tujuan, dll) |
| `created_at` | TIMESTAMPTZ | Waktu aktivitas (WIB) |

## 5.5 Logika Email dan .ics

### Email yang Dikirim Sistem

| Event | Penerima | Attachment .ics |
|-------|----------|-----------------|
| Submit Pengajuan Baru | Approver 1 & 2 | Tidak |
| Approved | HC | Tidak |
| Rejected | HC | Tidak |
| Jadwal GR | HC + Tim Pelaksana | Ya (1 jam) |
| MOM GR | HC + Tim Pelaksana | Tidak |
| Jadwal Psikotes | HC + Tim Pelaksana | Ya (2 jam) |
| Jadwal AC | HC + Tim Pelaksana | Ya (8 jam) |
| Konfirmasi Slot Presentasi | HC + Atasan + Admin AC | Ya (2 jam) |
| Laporan PDF | HC + Atasan | Ya (PDF terlampir) |
| Email Pembukaan HC | HC | Tidak |

### Cron Job Otomatis

| Jadwal | Aksi |
|--------|------|
| H-1 sebelum AC | Kirim email reminder ke peserta & Tim Pelaksana |
| Hari-H AC | Kirim email reminder pagi hari AC |

> Kedua cron job mengecualikan request dengan status: Rejected, Selesai, Pending - Menunggu Review, Laporan Dikirim.

---

# BAB 6 – Cara Revisi dan Update Sistem

## 6.1 Alur Deploy Perubahan

```
Edit kode di lokal
    ↓
git add . && git commit -m "deskripsi"
    ↓
git push origin main
    ↓
Railway (backend) auto-deploy ← GitHub main
Vercel (frontend) auto-deploy ← GitHub main
```

## 6.2 Mengubah Konten Email

File: `backend/src/services/emailService.js`

Setiap fungsi email memiliki struktur:
```javascript
async function kirimEmailNamaFungsi(data) {
  // ...
  const htmlBody = `...template HTML...`;
  await resend.emails.send({ to, subject, html: htmlBody, attachments });
  await logEmail('nama_fungsi', emailTujuan, idRequest);
}
```

Ubah string HTML di variabel `htmlBody` untuk mengubah konten email.

## 6.3 Mengubah Field Konfigurasi

1. Tambah/ubah field di `frontend/src/pages/Konfigurasi.jsx` (form UI)
2. Pastikan key yang digunakan konsisten dengan yang dibaca di `emailService.js` atau route terkait
3. Tidak perlu ubah skema DB — konfigurasi disimpan sebagai key-value

## 6.4 Menambah Status Baru

1. Tambah status baru di database (constraint atau enum jika ada)
2. Tambah warna badge di `frontend/src/pages/CekStatus.jsx` dan `frontend/src/pages/Dashboard.jsx`
3. Update logika di backend route yang mengubah status

## 6.5 Mengubah Logika Slot Presentasi

File: `backend/src/routes/slots.js`

Booking menggunakan atomic single-query untuk mencegah double booking:
```sql
UPDATE slot_presentasi 
SET status='Terpesan', id_request=? 
WHERE id=? AND status='Tersedia'
```
Jangan ubah logika ini tanpa alasan kuat — ini mencegah race condition.

## 6.6 Database Migration

Untuk perubahan skema database:
1. Buka Supabase Dashboard → SQL Editor
2. Jalankan SQL query yang diperlukan
3. Verifikasi perubahan di Table Editor
4. Update kode backend/frontend yang terpengaruh

---

# BAB 7 – Troubleshooting

## 7.1 Email Tidak Masuk

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| Email tidak masuk ke Gmail | Resend API error | Cek log Railway → lihat error di console |
| Email tidak masuk ke Outlook | Domain warming | Normal untuk domain baru — tunggu 1-3 hari |
| Email masuk ke Spam | SPF/DKIM belum propagasi | Cek DNS di Cloudflare, tunggu propagasi |
| Semua email berhenti | RESEND_API_KEY expired | Update di Railway env variables |

**Cara cek log email:** Buka Supabase → Table `log_aktivitas` → filter by `id_request`

## 7.2 Form Pengajuan Tidak Bisa Diakses

| Masalah | Solusi |
|---------|--------|
| "Pendaftaran belum dibuka" | Cek konfigurasi `tanggal_buka` — mungkin belum diisi atau tanggalnya di masa depan |
| "Pendaftaran sudah ditutup" | Cek konfigurasi `tanggal_tutup` — perbarui jika perlu |
| Form error saat submit | Buka browser console (F12) → lihat error network |

## 7.3 Token Approval Bermasalah

| Masalah | Solusi |
|---------|--------|
| "Token sudah digunakan" | Normal — setelah approve/reject, semua token request di-invalidasi |
| "Token kadaluarsa" | Token berlaku 7 hari — minta PIC untuk buat token baru (via kirim ulang notifikasi) |
| "Token tidak ditemukan" | Pastikan link diklik utuh, tidak terpotong oleh email client |

## 7.4 Slot Presentasi Tidak Bisa Dibooking

| Masalah | Solusi |
|---------|--------|
| "Slot sudah diambil" | Slot baru saja diambil orang lain (race condition) — pilih slot lain |
| Tidak ada slot tersedia | PIC belum tambah slot — minta PIC tambah slot di `/slot-presentasi` |
| ID Request tidak ditemukan | Pastikan ID Request benar (format: REQ-YYYYMM-XXX) dan status sudah AC Dijadwalkan |

## 7.5 PDF Laporan Gagal Upload

| Masalah | Solusi |
|---------|--------|
| Upload error | Pastikan file adalah PDF, ukuran < 10MB |
| "Bucket tidak ditemukan" | Cek Supabase Storage — pastikan bucket `laporan-pdf` ada |
| File terupload tapi email gagal | Cek log Railway — mungkin email config error |

## 7.6 Dashboard Tidak Menampilkan Data

| Masalah | Solusi |
|---------|--------|
| Data kosong padahal ada request | Cek filter — kemungkinan filter periode atau status aktif yang menyembunyikan data |
| Export CSV kosong | Pastikan ada data sesuai filter sebelum export |
| Stats card tidak akurat | Refresh halaman — data di-fetch saat halaman load |

## 7.7 Form Dokumen Error

| Masalah | Solusi |
|---------|--------|
| "ID Request tidak ditemukan" | URL `/form-dokumen` harus menyertakan `?id=ID_REQUEST` |
| Pesan error saat buka tanpa ID | Normal — sistem menampilkan pesan error dan link kembali |

---

# BAB 8 – Panduan Testing

Gunakan panduan ini untuk memverifikasi seluruh fungsi sistem setelah deploy atau setelah perubahan kode.

---

## Skenario 1: Alur Lengkap (Happy Path)

**Tujuan:** Verifikasi seluruh alur dari pengajuan hingga laporan selesai.

1. **Login sebagai PIC** → buka `/konfigurasi`
   - Isi `periode_ac` (contoh: "Juli 2026")
   - Isi `tanggal_buka` (hari ini atau kemarin)
   - Isi `tanggal_tutup` (2 minggu ke depan)
   - Isi `approver_1_nama` dan `approver_1_email`
   - Isi minimal 1 assessor dan 1 admin_ac
   - Isi `link_keperluan_asesmen`
   - Simpan

2. **Buka `/daftar-hc`** → pastikan ada HC terdaftar → klik **"Kirim Email Pembukaan"**
   - Verifikasi: email pembukaan masuk ke inbox HC

3. **HC buka `/form-pengajuan`** → isi 1 peserta → klik Submit
   - Verifikasi: muncul ID Request (format REQ-YYYYMM-XXX)
   - Verifikasi: email notifikasi masuk ke inbox Approver

4. **Approver klik link Approve** di email
   - Verifikasi: halaman approval muncul dengan detail peserta
   - Verifikasi: setelah klik Approve, email Approved masuk ke HC (dengan link form dokumen + link ZIP)

5. **Cek Status di `/cek-status`** → masukkan ID Request
   - Verifikasi: status "Approved", badge warna hijau

6. **PIC buka Dashboard** (`/dashboard`)
   - Verifikasi: request muncul di tabel
   - Coba filter periode, perusahaan, status — pastikan filter berjalan
   - Verifikasi stats card menampilkan angka yang benar

7. **PIC buka Detail Request → Fase 3** → isi jadwal GR → klik "Kirim Undangan GR"
   - Verifikasi: email undangan GR masuk ke HC dan Tim Pelaksana
   - Verifikasi: file `.ics` terlampir dan bisa dibuka di Google Calendar/Outlook

8. **PIC isi MOM GR → klik "Kirim MOM GR"**
   - Verifikasi: email MOM masuk ke HC dan Tim Pelaksana
   - Verifikasi: status berubah ke "GR Selesai - Menunggu Dokumen"

9. **HC buka `/form-dokumen?id=[ID]`** → isi 3 link dokumen → Submit
   - Verifikasi: status berubah ke "Dokumen Diterima"
   - Verifikasi: email notifikasi ke Tim Pelaksana masuk (menyertakan `link_keperluan_asesmen`)

10. **PIC buka Detail → Fase 5** → isi jadwal psikotes (jam: "08.00–10.00") → kirim
    - Verifikasi: email jadwal psikotes masuk + `.ics` terlampir
    - Verifikasi: status berubah ke "Psikotes Dijadwalkan"

11. **PIC isi jadwal AC → kirim**
    - Verifikasi: email jadwal AC masuk + `.ics` terlampir (8 jam)
    - Verifikasi: email menyertakan `link_keperluan_asesmen`
    - Verifikasi: status berubah ke "AC Dijadwalkan"

12. **PIC buka `/slot-presentasi`** → klik "Tambah Slot Baru" → isi tanggal, jam, lokasi → Simpan

13. **PIC buka Detail Request → Fase 6** → salin link `/pilih-slot` dengan tombol "Salin Link"

14. **HC buka `/pilih-slot`** → input ID Request → pilih slot → klik "Booking Slot"
    - Verifikasi: email konfirmasi presentasi masuk ke HC + Atasan + `.ics` terlampir
    - Verifikasi: notifikasi masuk ke Admin AC
    - Verifikasi: status request berubah ke "Menunggu Presentasi"
    - Verifikasi: slot di `/slot-presentasi` berubah ke "Terpesan"

15. **PIC buka Fase 6** → upload file PDF laporan → klik "Kirim Laporan"
    - Verifikasi: email dengan PDF terlampir masuk ke HC dan Atasan
    - Verifikasi: status berubah ke "Selesai"
    - Verifikasi: form upload tidak muncul lagi

---

## Skenario 2: Alur Reject

**Tujuan:** Verifikasi proses penolakan request oleh Approver.

1. Submit request baru dari `/form-pengajuan`
2. Approver klik link **Reject** di email → isi catatan penolakan → Submit
3. **Verifikasi:** email Rejected masuk ke HC dengan catatan penolakan
4. **Cek Status** → status "Rejected", badge warna merah, catatan penolakan tampil

---

## Skenario 3: Multi Peserta

**Tujuan:** Verifikasi pengajuan beberapa peserta sekaligus tidak menyebabkan ID collision.

1. HC submit form pengajuan dengan **2–3 peserta** sekaligus
2. **Verifikasi:** setiap peserta mendapat ID Request **berbeda** (REQ-YYYYMM-XXX urut)
3. Buka `/cek-status` → tab "Cari by Email HC" → masukkan email HC
4. **Verifikasi:** semua peserta yang didaftarkan email HC tersebut muncul dalam 1 tabel

---

## Skenario 4: Revisi Jadwal

**Tujuan:** Verifikasi fitur kirim ulang undangan dengan notifikasi perubahan.

1. PIC kirim jadwal GR untuk suatu request
2. PIC buka kembali Fase 3 untuk request yang sama
   - **Verifikasi:** form otomatis terisi data jadwal sebelumnya (pre-fill)
3. Ubah tanggal atau jam → klik **"Update & Kirim Ulang Undangan GR"**
4. **Verifikasi:** email revisi masuk dengan:
   - Subject mengandung **[REVISI]**
   - Body ada **banner kuning peringatan** perubahan jadwal
5. Cek `log_aktivitas` di Supabase — pastikan tercatat "Direvisi" bukan "Dikirim"

---

## Skenario 5: Double Booking Prevention

**Tujuan:** Verifikasi sistem mencegah dua orang booking slot yang sama.

1. Buat 1 slot presentasi baru
2. Buka 2 browser/tab berbeda, masing-masing buka `/pilih-slot`
3. Di kedua tab, masukkan 2 ID Request berbeda yang sudah di status AC Dijadwalkan
4. Klik "Booking Slot" di kedua tab hampir bersamaan
5. **Verifikasi:** hanya 1 booking berhasil, tab/browser lain mendapat pesan "slot sudah diambil"

---

## Skenario 6: Hapus Request

**Tujuan:** Verifikasi cascade delete berjalan benar.

1. Pilih 1 request dari Dashboard yang sudah punya slot presentasi dan token approval
2. Klik **"Hapus"** → konfirmasi dialog muncul → klik OK
3. **Verifikasi di Supabase:**
   - Tabel `log_aktivitas`: tidak ada record dengan `id_request` tersebut
   - Tabel `token_approval`: tidak ada record dengan `id_request` tersebut
   - Tabel `slot_presentasi`: slot yang sebelumnya Terpesan oleh request ini kembali ke status **Tersedia**
   - Tabel `requests`: record request sudah tidak ada
4. **Verifikasi:** request tidak muncul lagi di Dashboard

---

## Checklist Verifikasi Testing

### Format dan Data

- [ ] ID Request format REQ-YYYYMM-XXX dan urut per bulan
- [ ] Multi peserta mendapat ID berbeda (tidak collision)
- [ ] Pre-fill form jadwal berjalan saat edit ulang

### Email

- [ ] Email masuk dalam waktu <5 menit (Gmail)
- [ ] Email ke Outlook/non-Gmail mungkin lebih lama (normal untuk domain baru)
- [ ] Subject email revisi mengandung [REVISI]
- [ ] Banner kuning muncul di body email revisi

### File .ics

- [ ] File .ics terlampir di email jadwal GR (1 jam)
- [ ] File .ics terlampir di email jadwal Psikotes (2 jam)
- [ ] File .ics terlampir di email jadwal AC (8 jam)
- [ ] File .ics terlampir di email konfirmasi Presentasi (2 jam)
- [ ] File .ics bisa dibuka di Google Calendar
- [ ] File .ics bisa dibuka di Outlook

### Laporan PDF

- [ ] PDF terlampir langsung di email (bukan link)
- [ ] Form upload disembunyikan setelah laporan terkirim
- [ ] File tersimpan di Supabase Storage bucket `laporan-pdf`

### Dashboard

- [ ] Filter periode berjalan
- [ ] Filter perusahaan berjalan
- [ ] Filter status berjalan
- [ ] Search nama peserta berjalan
- [ ] Reset filter menghapus semua filter
- [ ] Export CSV sesuai filter aktif
- [ ] Progress bar kapasitas menampilkan warna yang benar (hijau/kuning/merah)

### Cek Status

- [ ] Warna badge sesuai tabel status (BAB 4.4)
- [ ] Dual-mode search berfungsi (by ID dan by Email HC)
- [ ] Semua peserta HC muncul saat cari by Email HC

### Keamanan dan Integritas

- [ ] Tombol Hapus hanya muncul untuk role pic_asesmen
- [ ] Token approval expired setelah 7 hari
- [ ] Setelah approve/reject, token lain request tersebut di-invalidasi
- [ ] Double booking slot dicegah (atomic query)
- [ ] Form dokumen menampilkan error jika URL tanpa `?id=`

---

# RIWAYAT REVISI

| Batch | Tanggal | Perubahan Utama |
|-------|---------|-----------------|
| Batch 1 | 2026 | Fix bug multi peserta (ID collision), track record email, hapus opsi "Potential Review & Profiling", tombol Hapus Dashboard |
| Batch 2 | 2026 | Validasi pendaftaran by tanggal_buka/tutup, jam_psikotes teks bebas, hapus link_platform_psikotes, Cek Status dual-mode |
| Batch 3 | 2026 | File .ics di semua email jadwal, field link_keperluan_asesmen |
| Batch 4 | 2026 | Pre-fill form jadwal, tombol "Update & Kirim Ulang", email revisi [REVISI] + banner kuning, log "Direvisi" vs "Dikirim" |
| Batch 5 | 2026 | Booking slot presentasi oleh HC (/pilih-slot), manajemen slot PIC (/slot-presentasi), tabel slot_presentasi |
| Batch 6 | 2026 | Dashboard interaktif (filter, stats card, progress bar, export CSV), tanggal_ac → periode_ac, hapus tenggat_pendaftaran |
| Batch 7 | 2026 | Upload PDF laporan ke Storage + email attachment, status Psikotes/AC Dijadwalkan, Fase 6 read-only + tombol Salin Link |
| Audit | 2026 | Fix 11 bug (cek-file Storage, cron filter, CekStatus race condition, warna badge lengkap, double booking atomic, FormDokumen error, dll), cascade delete |

> **Backlog:** Export PDF laporan per periode (belum diimplementasi)

---

*Dokumen ini adalah panduan lengkap untuk sistem Request Assessment Center RACD AIHO – PT Astra International.*  
*Untuk pertanyaan teknis, hubungi tim pengembang atau lihat catatan detail di `CATATAN_REVISI.md`.*
