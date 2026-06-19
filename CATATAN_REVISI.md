# CATATAN REVISI — Request Assessment V1
**Project:** RACD AIHO – PT Astra International  
**Terakhir diperbarui:** Juni 2026

---

## STATUS PENGERJAAN

| # | Revisi | Status | Batch |
|---|--------|--------|-------|
| 1 | Bug multi peserta (ID collision) | ✅ Selesai | Batch 1 |
| 2 | Track record pengiriman email | ✅ Selesai | Batch 1 |
| 3 | Hapus opsi jenis assessment | ✅ Selesai | Batch 1 |
| 4 | Tombol hapus request di Dashboard | ✅ Selesai | Batch 1 |
| 5a | Kuota → sistem rentang tanggal pendaftaran | ✅ Selesai | Batch 2 |
| 5b | Perubahan field psikotes (rentang jam, hapus link platform) | ✅ Selesai | Batch 2 |
| 5c | Revisi jadwal + kirim ulang + notif pergantian | ✅ Selesai | Batch 4 |
| 5d | Link keperluan asesmen ke Tim Pelaksana | ✅ Selesai | Batch 3 |
| 6 | Cek Status — cari by email HC | ✅ Selesai | Batch 2 |
| 7 | Invite kalender (.ics) untuk email jadwal | ✅ Selesai | Batch 3 |
| 8 | Booking slot presentasi oleh HC | ✅ Selesai | Batch 5 |
| 9 | Dashboard interaktif + filter periode + export CSV | ✅ Selesai | Batch 6 |
| 10 | Konfigurasi: `tanggal_ac` → `periode_ac` (bulan & tahun) | ✅ Selesai | Batch 6 |
| 11 | Export PDF laporan per periode | 📋 Backlog | - |

---

## DETAIL REVISI

---

### ✅ 1. Bug Multi Peserta (ID Collision)
**Masalah:** Submit 2+ peserta sekaligus → ID request tabrakan, data peserta ke-2/ke-3 hilang.  
**Root cause:** `generateIdRequest()` dipanggil berulang dalam loop — insert peserta sebelumnya belum committed ke DB.  
**Solusi:** Batch-generate semua ID sebelum loop dengan `generateIdRequests(jumlah)`.  
**File:** `backend/src/routes/requests.js`, `backend/src/services/cronService.js`  
**Selesai:** Batch 1

---

### ✅ 2. Track Record Pengiriman Email
**Deskripsi:** Setiap email yang terkirim dicatat otomatis ke `log_aktivitas` dengan nama fungsi, email tujuan, dan timestamp WIB.  
**File:** `backend/src/services/emailService.js` (fungsi `logEmail()` ditambahkan, dipanggil di semua 12 fungsi email)  
**Selesai:** Batch 1

---

### ✅ 3. Hapus Opsi Jenis Assessment
**Deskripsi:** Hapus opsi "Potential Review & Profiling" dari dropdown. Hanya tersisa: Potential Review dan Profiling.  
**DB:** Constraint `requests_jenis_assessment_check` sudah diupdate, data lama dikonversi ke "Potential Review".  
**File:** `frontend/src/pages/FormPengajuan.jsx`  
**Selesai:** Batch 1

---

### ✅ 4. Tombol Hapus Request di Dashboard
**Deskripsi:** Tambah tombol Hapus per baris di tabel Dashboard dengan window.confirm sebelum eksekusi.  
**File:** `frontend/src/pages/Dashboard.jsx`, `backend/src/routes/requests.js` (endpoint `DELETE /:idRequest`)  
**Selesai:** Batch 1

---

### ✅ 5a. Kuota → Sistem Rentang Tanggal Pendaftaran
**Deskripsi:** Validasi pendaftaran berdasarkan `tanggal_buka` dan `tanggal_tutup`, bukan kuota. Kuota tetap ada sebagai acuan info saja (tidak membatasi).  
**Field baru di Konfigurasi:** `tanggal_buka`, `tanggal_tutup`  
**File:** `backend/src/routes/requests.js`, `frontend/src/pages/Konfigurasi.jsx`  
**Selesai:** Batch 2

---

### ✅ 5b. Perubahan Field Psikotes
**Deskripsi:**  
- `jam_psikotes` → input teks bebas, contoh: "08.00–10.00"  
- `link_platform_psikotes` → dihapus, diganti teks statis: "Cek email dari astra.recruitment@ai.astra.co.id"  
**File:** `backend/src/routes/fase_routes.js`, `frontend/src/pages/DetailRequest.jsx`, `frontend/src/pages/CekStatus.jsx`, `frontend/src/pages/FormDokumen.jsx`, `backend/src/services/emailService.js`  
**Selesai:** Batch 2

---

### ✅ 5c. Revisi Jadwal + Kirim Ulang + Notif Pergantian
**Deskripsi:**  
- Semua form jadwal (GR, Psikotes, AC, Presentasi) sekarang pre-fill otomatis dari data existing  
- Tombol berubah jadi "Update & Kirim Ulang ..." jika jadwal sudah pernah dikirim  
- Email revisi: subject berubah `[REVISI]`, body ada banner kuning peringatan  
- Log aktivitas mencatat "Direvisi" vs "Dikirim" secara terpisah  
**File:** `backend/src/services/emailService.js`, `backend/src/routes/fase_routes.js`, `frontend/src/pages/DetailRequest.jsx`  
**Selesai:** Batch 4

---

### ✅ 5d. Link Keperluan Asesmen
**Deskripsi:** Field `link_keperluan_asesmen` di Konfigurasi → otomatis disisipkan di email Tim Pelaksana (MOM GR, notifikasi dokumen, jadwal AC). Tampil juga di Detail Request section Jadwal AC.  
**Field baru di Konfigurasi:** `link_keperluan_asesmen`  
**File:** `frontend/src/pages/Konfigurasi.jsx`, `frontend/src/pages/DetailRequest.jsx`, `backend/src/services/emailService.js`, `backend/src/routes/fase_routes.js`  
**Selesai:** Batch 3

---

### ✅ 6. Cek Status — Cari by Email HC
**Deskripsi:** Dual-mode search di halaman Cek Status: cari by ID Request atau by Email HC. Cari by email → tampil semua peserta yang pernah didaftarkan HC tersebut dalam 1 tabel.  
**Endpoint baru:** `GET /api/requests/status/by-email/:email` (publik)  
**File:** `frontend/src/pages/CekStatus.jsx`, `backend/src/routes/requests.js`  
**Selesai:** Batch 2

---

### ✅ 7. Invite Kalender (.ics)
**Deskripsi:** Semua email jadwal menyertakan file `.ics` agar penerima bisa langsung add ke Google Calendar / Outlook.  
- GR → `GR_REQ-xxx.ics` (1 jam)  
- Psikotes → `Psikotes_REQ-xxx.ics` (2 jam, hanya saat kirim, tidak di reminder H-1)  
- AC → `AC_REQ-xxx.ics` (8 jam)  
- Presentasi → `Presentasi_REQ-xxx.ics` (2 jam)  
**File:** `backend/src/services/emailService.js`  
**Selesai:** Batch 3

---

### ✅ 8. Booking Slot Presentasi oleh HC
**Deskripsi:**  
- PIC buka `/slot-presentasi` → tambah slot (tanggal, jam, lokasi) → salin link untuk HC  
- HC buka `/pilih-slot` → input ID Request → pilih slot → booking  
- Slot otomatis jadi Terpesan, jadwal presentasi tersimpan di request  
- Email konfirmasi + `.ics` dikirim ke HC & User/Atasan, notif ke Admin AC  
**Tabel baru:** `slot_presentasi` (id, tanggal, jam, lokasi, id_request, status)  
**File baru:** `backend/src/routes/slots.js`, `frontend/src/pages/SlotPresentasi.jsx`, `frontend/src/pages/PilihSlot.jsx`  
**File diupdate:** `backend/src/index.js`, `frontend/src/App.jsx`, `frontend/src/components/Layout.jsx`  
**Selesai:** Batch 5

---

### ✅ 9. Dashboard Interaktif + Filter + Export CSV
**Deskripsi:**  
- Filter bar: Periode (by `tanggal_ac`), Perusahaan, Status, Search nama peserta, Reset filter  
- 6 stats card: Total | Pending | Approved | Proses | Selesai | Ditolak  
- Progress bar kapasitas: X / `kuota_maks` slot terpakai per periode (hijau < 70%, kuning ≥ 70%, merah ≥ 100%)  
- Tabel: badge warna per status, kolom lebih informatif, No, ID, Perusahaan, Peserta, Jenis AC, Status, Tanggal AC, Pengajuan, Aksi  
- Tombol Export CSV sesuai filter aktif  
**Selesai:** Batch 6  
**File:** `frontend/src/pages/Dashboard.jsx`

---

### ✅ 10. Konfigurasi: `tanggal_ac` → `periode_ac`
**Deskripsi:**  
- Field `tanggal_ac` di Konfigurasi (date picker) diganti jadi `periode_ac` (text input, contoh: "Juli 2026")  
- 1 bulan = 3 sesi × maks 3 orang = maks 9 orang/bulan  
- Email pembukaan pakai `periode_ac` bukan tanggal spesifik; fallback ke `tanggal_ac` jika belum diupdate  
- Tanggal spesifik per peserta tetap diinput manual PIC di Fase 4  
**Selesai:** Batch 6  
**File:** `frontend/src/pages/Konfigurasi.jsx`, `backend/src/services/emailService.js`, `backend/src/routes/hc.js`

---

### 📋 11. Export PDF Laporan per Periode
**Deskripsi:** Export data request per periode menjadi PDF laporan yang rapi (header logo, tabel, summary).  
**Status:** Backlog — dikerjakan setelah Batch 6  
**File:** TBD

---

## CATATAN TEKNIS

### Database (Supabase)
- **Tabel `requests`:** Semua kolom yang dipakai sudah ada. `jam_psikotes` bertipe TEXT ✅
- **Tabel `konfigurasi`:** Key-value store, field baru otomatis terbuat saat disimpan dari UI
- **Tabel `slot_presentasi`:** Dibuat manual via SQL Editor (Batch 5)
- **Constraint `jenis_assessment`:** Sudah diupdate, hanya "Potential Review" dan "Profiling" ✅
- **Kolom `link_platform_psikotes`:** Masih ada di DB (data lama aman), tidak dipakai lagi

### Infrastruktur
- **Frontend:** React + Vite + TailwindCSS → Vercel (auto-deploy dari branch `main`)
- **Backend:** Node.js + Express → Railway
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend (domain: lyraac.site, verified)
- **Branch kerja:** `claude/gifted-knuth-epwary` → merge ke `main`

### Email
- Delay ke Outlook/non-Gmail: normal untuk domain baru (domain warming)
- SPF/DKIM/DMARC sudah terkonfigurasi di Cloudflare
