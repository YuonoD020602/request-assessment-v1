# CATATAN REVISI — Request Assessment V1
**Project:** RACD AIHO – PT Astra International  
**Terakhir diperbarui:** 20 Juni 2026 (Batch 10)

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
| 11 | Upload PDF laporan ke Supabase Storage + kirim sebagai email attachment | ✅ Selesai | Batch 7 |
| 12 | Status baru: `Psikotes Dijadwalkan` & `AC Dijadwalkan` | ✅ Selesai | Batch 7 |
| 13 | Fase 6 read-only jadwal presentasi + link `/pilih-slot` bisa disalin | ✅ Selesai | Batch 7 |
| 14 | Hapus field redundant `tenggat_pendaftaran`, gabung ke `tanggal_tutup` | ✅ Selesai | Batch 7 |
| 15 | Token approval: validasi `expired_at` + invalidasi semua token setelah digunakan | ✅ Selesai | Audit |
| 16 | Audit & fix menyeluruh sistem (11 bug dari 2 putaran audit) | ✅ Selesai | Audit |
| 17 | Upload dokumen PDF per peserta di Form Pengajuan + link template via email pembukaan | ✅ Selesai | Batch 8 |
| 18 | Riwayat aktivitas & email — timeline per request + log pengiriman email pembukaan | ✅ Selesai | Batch 9 |
| 20 | Hapus field redundant: link Form Potrev di FormDokumen + Tanggal AC & Lokasi AC di form GR | ✅ Selesai | Batch 10 |
| 21 | Fix bug: status Psikotes Dijadwalkan tidak tersimpan (DB CHECK constraint + backend) | ✅ Selesai | Batch 10 |
| 22 | Slot Presentasi: Hapus cascade (reset request) + tombol Bebaskan slot | ✅ Selesai | Batch 10 |
| 23 | HC pilih slot presentasi via Cek Status + email notifikasi pilih jadwal di Fase 6 | ✅ Selesai | Batch 10 |
| 24 | Export PDF laporan per periode | 📋 Backlog | - |

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

### ✅ 11. Upload PDF Laporan (Supabase Storage + Email Attachment)
**Deskripsi:**  
- PIC upload file PDF laporan hasil AC via form di Fase 6 DetailRequest  
- PDF disimpan ke Supabase Storage bucket `laporan-pdf` dengan path `{id_request}/laporan_{timestamp}.pdf`  
- Email otomatis dikirim ke HC & User/Atasan dengan PDF sebagai attachment (bukan link)  
- Status request otomatis berubah ke `Selesai` setelah laporan terkirim  
- Form upload disembunyikan setelah `status_laporan = 'Laporan Dikirim'`  
**Endpoint:** `POST /api/fase6/kirim-laporan` (multipart/form-data, Multer memory storage)  
**File:** `backend/src/routes/fase_routes.js`, `backend/src/services/emailService.js`, `frontend/src/pages/DetailRequest.jsx`, `backend/package.json` (tambah `multer`)  
**Selesai:** Batch 7

---

### ✅ 12. Status Baru: `Psikotes Dijadwalkan` & `AC Dijadwalkan`
**Deskripsi:**  
- Status `Psikotes Dijadwalkan` otomatis di-set saat PIC kirim jadwal psikotes (Fase 4)  
- Status `AC Dijadwalkan` otomatis di-set saat PIC kirim jadwal AC (Fase 4)  
- Dashboard: badge warna violet (Psikotes) dan sky (AC)  
- CekStatus: tampil badge warna sesuai, termasuk di section jadwal selanjutnya  
**File:** `backend/src/routes/fase_routes.js`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/CekStatus.jsx`  
**Selesai:** Batch 7

---

### ✅ 13. Fase 6 Read-Only + Link `/pilih-slot` Bisa Disalin
**Deskripsi:**  
- Fase 6 DetailRequest sekarang hanya menampilkan jadwal presentasi (read-only), tidak ada form input PIC — HC memilih sendiri via `/pilih-slot`  
- Jika HC belum memilih slot, tampil box kuning dengan link `{origin}/pilih-slot` lengkap beserta tombol "Salin Link"  
- Tombol salin menggunakan `navigator.clipboard.writeText` + toast notifikasi  
**File:** `frontend/src/pages/DetailRequest.jsx`  
**Selesai:** Batch 7

---

### ✅ 14. Hapus Field Redundant `tenggat_pendaftaran`
**Deskripsi:**  
- Field `tenggat_pendaftaran` di Konfigurasi dihapus — fungsinya sudah ditangani `tanggal_tutup`  
- Email pembukaan pakai `tanggal_tutup` untuk info batas pendaftaran  
- Format tanggal di email: `toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })`  
**File:** `frontend/src/pages/Konfigurasi.jsx`, `backend/src/routes/hc.js`  
**Selesai:** Batch 7

---

### ✅ 15. Token Approval: `expired_at` + Invalidasi Semua Token
**Deskripsi:**  
- Saat token approval dibuat, field `expired_at` diisi 7 hari dari sekarang (sebelumnya NULL → semua token dianggap expired karena `new Date(null) = 1970`)  
- Setelah salah satu token digunakan (approve atau reject), semua token untuk `id_request` yang sama langsung di-invalidasi — mencegah token reject dipakai setelah approve, dan sebaliknya  
**File:** `backend/src/routes/requests.js`, `backend/src/routes/approval.js`  
**Selesai:** Audit

---

### ✅ 16. Audit & Fix Menyeluruh Sistem (11 Bug dari 2 Putaran)
**Deskripsi:** Dua putaran audit menemukan dan memperbaiki:

**Putaran 1 (Audit 1):**
- `cek-file` Storage: `list('', {search})` di root → `list(idRequest)` baca subfolder benar
- Cron H-1 & Hari-H AC: tidak filter status → tambah `.not('status', 'in', '(...)')` exclude Rejected/Selesai
- CekStatus race condition `setTimeout 100ms` → refactor ke `handleCekById(id)` yang langsung pakai parameter
- CekStatus warna badge: tambah violet, sky, indigo, teal untuk status lanjutan
- Dashboard dead code `STATUS_BADGE` dihapus
- Form upload laporan tetap aktif setelah terkirim → sembunyikan jika `status_laporan = 'Laporan Dikirim'`

**Putaran 2 (Audit 2):**
- Cron filter `"Pending"` tidak match → fix ke `"Pending - Menunggu Review"`, tambah `"Laporan Dikirim"`
- Race condition double booking slot → atomic single-query `UPDATE WHERE status='Tersedia'`
- CekStatus badge `Menunggu GR` & `GR Selesai - Menunggu Dokumen` tidak punya warna → tambah orange & amber
- FormDokumen tanpa pesan jika `?id=` kosong → tampilkan error + link kembali
- Tombol Hapus di Dashboard muncul semua role → kondisi `user?.role === 'pic_asesmen'`

**File:** `backend/src/routes/fase_routes.js`, `backend/src/routes/approval.js`, `backend/src/routes/slots.js`, `backend/src/services/cronService.js`, `frontend/src/pages/CekStatus.jsx`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/DetailRequest.jsx`, `frontend/src/pages/FormDokumen.jsx`  
**Selesai:** Audit

---

### ✅ 17. Upload Dokumen PDF Per Peserta di Form Pengajuan
**Deskripsi:**  
Fitur pengumpulan dokumen "Form Pengajuan Potential Review & Profiling" langsung di form pengajuan online.

**Alur lengkap:**
1. PIC mengisi field `link_form_pengajuan` di Konfigurasi → link Google Docs/Drive template form pengajuan
2. Saat blast email pembukaan ke HC, link template disertakan dalam email (box biru dengan instruksi)
3. HC mengunduh template, mengisi, menyimpan sebagai PDF
4. Saat submit form pengajuan, HC **wajib** upload 1 PDF per peserta — tidak bisa submit tanpa file
5. Backend upload PDF ke Supabase Storage bucket `dokumen-peserta`, path: `{id_request}/Form_Pengajuan_{Nama}_{id_request}.pdf`
6. URL publik disimpan ke kolom `dokumen_peserta_url` di tabel `requests`
7. Email ke approver menyertakan **2 attachment**: (1) PDF ringkasan data peserta yang digenerate otomatis, (2) PDF Form Pengajuan yang diupload HC
8. PIC RACD bisa download dokumen dari tab Info di halaman Detail Request

**Perubahan teknis:**
- Endpoint `POST /api/requests/submit` berubah dari JSON ke `multipart/form-data` (Multer `upload.any()`)
- Field file per peserta: `dokumen_pdf_0`, `dokumen_pdf_1`, dst
- Field `peserta` di-JSON.parse dari `req.body.peserta` (string JSON)
- Validasi: jika ada peserta yang tidak punya file → tolak seluruh submit dengan pesan error per peserta

**DB:**
- Kolom baru: `ALTER TABLE requests ADD COLUMN IF NOT EXISTS dokumen_peserta_url text null;`
- Bucket baru: `dokumen-peserta` (Supabase Storage, public)
- Policy: `CREATE POLICY "Allow service role full access on dokumen-peserta" ON storage.objects FOR ALL TO service_role ...`

**File:** `frontend/src/pages/FormPengajuan.jsx`, `frontend/src/pages/Konfigurasi.jsx`, `frontend/src/pages/DetailRequest.jsx`, `backend/src/routes/requests.js`, `backend/src/routes/hc.js`, `backend/src/services/emailService.js`  
**Selesai:** Batch 8

---

### ✅ 18. Riwayat Aktivitas & Email — Timeline per Request + Log Pengiriman Email Pembukaan
**Deskripsi:**  
Dua fitur track record/audit trail yang sebelumnya tidak ada:

**A. Tab Riwayat di Detail Request**  
- Tab baru "Riwayat (N)" muncul di halaman Detail Request, sejajar dengan tab Info, Fase 3, Fase 4, dst.
- Menampilkan semua aktivitas dan email yang pernah dikirim untuk request tersebut dalam format **timeline vertikal**
- Setiap entry menampilkan: badge jenis aktivitas (biru untuk Email, hijau untuk tindakan sistem), teks detail, tanggal dan jam WIB
- Data diambil dari tabel `log_aktivitas` yang sudah ada — dicatat otomatis sejak Batch 1 (`logEmail()` di emailService.js)
- Endpoint baru: `GET /api/requests/:idRequest/log` (PIC only)

**B. Riwayat Pengiriman Email Pembukaan di Daftar HC**  
- Setelah blast email pembukaan, riwayat pengiriman tampil di halaman Daftar HC
- Expand/collapse dengan toggle "Lihat (N entri)"
- Setiap entry: waktu kirim (tanggal + jam WIB) dan detail pengiriman (berhasil/gagal berapa HC)
- Juga langsung refresh setelah blast berhasil — tidak perlu reload halaman
- Endpoint baru: `GET /api/hc/log-pembukaan` (PIC only, ambil max 20 entri terakhir)

**Perubahan teknis:**
- `backend/src/routes/requests.js`: tambah endpoint `GET /:idRequest/log`
- `backend/src/routes/hc.js`: tambah endpoint `GET /log-pembukaan` (HARUS di atas `/:id` agar tidak konflik routing)
- `frontend/src/pages/DetailRequest.jsx`: tambah state `logList`, fungsi `fetchLog()`, helper `refresh()`, dan tab baru "Riwayat"
- `frontend/src/pages/DaftarHC.jsx`: tambah state `logPembukaan`, `showLog`, fungsi `fetchLog()`, section Riwayat Pengiriman

**File:** `backend/src/routes/requests.js`, `backend/src/routes/hc.js`, `frontend/src/pages/DetailRequest.jsx`, `frontend/src/pages/DaftarHC.jsx`  
**Selesai:** Batch 9

---

### ✅ 20. Hapus Field Redundant: Link Form Potrev + Tanggal AC & Lokasi AC di GR
**Deskripsi:**  
Menghapus 3 field yang sudah tidak relevan atau menimbulkan overlap:

1. **`link_form_potrev` di FormDokumen.jsx** — Link Google Drive "Form Potential Review" dihapus karena form ini sudah dikumpulkan sebagai PDF di form pengajuan awal. Section pengumpulan dokumen lanjutan kini hanya berisi 2 item: Link Data Karyawan + Link Form STAR.

2. **`tanggal_ac` dan `lokasi_ac` di form GR (Fase 3)** — Field "Tanggal AC (perkiraan)" dan "Lokasi AC" dihapus dari form GR karena overlap dengan Fase 4 yang sudah punya form penjadwalan AC tersendiri. Menghindari kebingungan user dan data ganda di DB.

**File:** `frontend/src/pages/FormDokumen.jsx`, `frontend/src/pages/DetailRequest.jsx`, `backend/src/routes/fase_routes.js`  
**Selesai:** Batch 10

---

### ✅ 21. Fix Bug: Status "Psikotes Dijadwalkan" Tidak Tersimpan
**Deskripsi:**  
Status peserta tidak berubah menjadi `Psikotes Dijadwalkan` meski PIC sudah mengisi dan mengirim jadwal psikotes.

**Root cause:**  
DB `CHECK` constraint pada kolom `requests.status` tidak menyertakan nilai `'Psikotes Dijadwalkan'` dan `'AC Dijadwalkan'` (constraint lama masih mengandung status usang `'Ditunda - Kuota Penuh'`). Saat `supabase.from('requests').update({ status: 'Psikotes Dijadwalkan' })` dipanggil, constraint menolak update secara silent — tidak ada error yang di-throw ke frontend.

**Solusi (2 lapis):**  
1. **DB fix:** User menjalankan SQL di Supabase Editor untuk drop dan recreate constraint `requests_status_check` dengan semua status valid termasuk `'Psikotes Dijadwalkan'` dan `'AC Dijadwalkan'`  
2. **Backend fix:** Endpoint `/fase4/psikotes` ditambahkan error-checking dengan fallback split update — jika update gabungan gagal (e.g. constraint), coba update data jadwal dulu, lalu update status secara terpisah

**File:** `backend/src/routes/fase_routes.js` (endpoint `/psikotes`)  
**Selesai:** Batch 10

---

### ✅ 22. Slot Presentasi: Hapus Cascade + Tombol Bebaskan
**Deskripsi:**  
Sebelumnya slot yang statusnya `Terpesan` tidak bisa dihapus. Sekarang PIC punya 2 opsi:

- **Hapus** (tombol merah, untuk semua slot): Menghapus slot dari daftar. Jika slot berstatus `Terpesan`, sebelum menghapus sistem otomatis membersihkan data presentasi di request terkait (`tanggal_presentasi`, `jam_presentasi`, `lokasi_presentasi` dikosongkan) dan mereset status request kembali ke `AC Dijadwalkan` — sehingga HC bisa memilih slot lain.

- **Bebaskan** (tombol oranye, hanya muncul untuk slot `Terpesan`): Melepas booking tanpa menghapus slot. Slot kembali ke `Tersedia` (id_request = null), data presentasi di request dikosongkan, status request kembali ke `AC Dijadwalkan`.

Saat menghapus slot `Terpesan`, muncul dialog konfirmasi yang menginformasikan efek cascade.

**Endpoint baru:** `PUT /api/slots/:id/release`  
**File:** `backend/src/routes/slots.js`, `frontend/src/pages/SlotPresentasi.jsx`  
**Selesai:** Batch 10

---

### ✅ 23. HC Pilih Slot Presentasi via Cek Status + Email Notifikasi di Fase 6
**Deskripsi:**  
Sebelumnya HC harus membuka 2 halaman berbeda: `/cek-status` untuk memantau status, dan `/pilih-slot` untuk memilih jadwal presentasi. Sekarang semuanya bisa dilakukan di **satu halaman `/cek-status`**.

**Alur baru (sisi PIC — Fase 6):**  
1. Setelah AC dijadwalkan, PIC membuka tab **Fase 6** di Detail Request  
2. Jika HC belum memilih slot, tampil:  
   - Kotak kuning informatif  
   - Tombol **"📧 Kirim Notifikasi Pilih Jadwal ke HC"** → mengirim email ke HC berisi instruksi + link ke `/cek-status?id=REQ-xxx`  
   - Kotak abu-abu berisi link yang sama, bisa disalin manual  
3. Jika HC sudah memilih → tampil kotak hijau konfirmasi dengan detail jadwal

**Alur baru (sisi HC — Cek Status):**  
1. HC membuka `/cek-status`, input ID Request  
2. Jika status `AC Dijadwalkan` dan belum punya jadwal presentasi → muncul section **"Pilih Jadwal Presentasi Hasil AC"** dengan daftar slot tersedia  
3. HC klik **"Pilih Slot Ini"** → konfirmasi → slot di-booking secara atomic  
4. Halaman otomatis refresh menampilkan jadwal presentasi yang sudah dipilih  

**Email notifikasi pilih jadwal:**  
- Subject: `[RACD AIHO] Pilih Jadwal Presentasi Hasil AC – REQ-xxx`  
- Kotak biru dengan 3-langkah instruksi  
- Tombol CTA biru yang langsung ke `/cek-status?id=REQ-xxx`  
- Dicatat di `log_aktivitas`

**Endpoint baru:** `POST /api/fase6/notif-pilih-slot`  
**File:** `backend/src/routes/fase_routes.js`, `backend/src/services/emailService.js`, `frontend/src/pages/DetailRequest.jsx`, `frontend/src/pages/CekStatus.jsx`  
**Selesai:** Batch 10

---

### 📋 24. Export PDF Laporan per Periode
**Deskripsi:** Export data request per periode menjadi PDF laporan yang rapi (header logo, tabel, summary).  
**Status:** Backlog  
**File:** TBD

---

## CATATAN TEKNIS

### Database (Supabase)
- **Tabel `requests`:** Semua kolom yang dipakai sudah ada. `jam_psikotes` bertipe TEXT ✅
- **Tabel `konfigurasi`:** Key-value store, field baru otomatis terbuat saat disimpan dari UI
- **Tabel `slot_presentasi`:** Dibuat manual via SQL Editor (Batch 5)
- **Tabel `token_approval`:** Kolom `expired_at` wajib diisi saat insert (7 hari dari sekarang)
- **Constraint `jenis_assessment`:** Sudah diupdate, hanya "Potential Review" dan "Profiling" ✅
- **Kolom `link_platform_psikotes`:** Masih ada di DB (data lama aman), tidak dipakai lagi
- **Supabase Storage:** Bucket `laporan-pdf` (public), path format: `{id_request}/laporan_{timestamp}.pdf`
- **Supabase Storage:** Bucket `dokumen-peserta` (public), path format: `{id_request}/Form_Pengajuan_{Nama}_{id_request}.pdf`
- **Storage Policy:** Row-level security policy dibuat via SQL Editor untuk allow upload dari service role (kedua bucket)
- **Kolom `dokumen_peserta_url`:** Ditambahkan ke tabel `requests` (type: text, nullable)

### Infrastruktur
- **Frontend:** React + Vite + TailwindCSS → Vercel (auto-deploy dari branch `main`)
- **Backend:** Node.js + Express → Railway
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend (domain: lyraac.site, verified)
- **Branch kerja:** `claude/gifted-knuth-epwary` → merge ke `main`

### Email
- Delay ke Outlook/non-Gmail: normal untuk domain baru (domain warming)
- SPF/DKIM/DMARC sudah terkonfigurasi di Cloudflare
