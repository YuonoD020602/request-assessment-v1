# CATATAN REVISI — Request Assessment V1
**Tanggal:** Juni 2026  
**Project:** RACD AIHO – PT Astra International  
**Status:** Siap Dikerjakan

---

## DAFTAR REVISI LENGKAP

---

### 1. Bug Multi Peserta
**Deskripsi:**  
Fitur multi peserta sudah ada di Form Pengajuan tapi hanya berjalan untuk 1 peserta. Masalah utama ada di fungsi `generateIdRequest()` yang dipanggil berulang dalam loop — karena insert peserta sebelumnya belum committed ke DB, query menghasilkan ID yang sama untuk peserta ke-2, ke-3, dst.

**Yang perlu diperbaiki:**
- Fix `generateIdRequest()` agar tidak collision dalam loop (generate semua ID di awal sebelum loop insert)
- Pastikan setiap peserta mendapat `id_request` unik masing-masing
- Sekalian fix `cronService.js` yang hardcoded `assessor_1`, `assessor_2`, `admin_ac_1`, `roleplayer_1` — diganti pakai helper dinamis `getTimPelaksana()` dan `getAdmins()` yang sudah ada di `fase_routes.js`

**File terdampak:**
- `backend/src/routes/requests.js`
- `backend/src/services/cronService.js`

**Catatan downstream:**  
Semua fase (2–6) sudah bekerja per `id_request` secara struktur — tidak ada perubahan downstream yang diperlukan selain fix di atas.

---

### 2. Track Record Pengiriman Email
**Deskripsi:**  
Semua fitur pengiriman email perlu ada catatan kapan email terkirim berupa keterangan dan timestamp di log aktivitas sistem.

**Yang perlu ditambahkan:**  
Insert ke tabel `log_aktivitas` setelah setiap email berhasil dikirim di semua fungsi:
- `kirimEmailPembukaan`
- `kirimEmailApprover`
- `kirimEmailApprovedHC`
- `kirimEmailRejectedHC`
- `kirimEmailUndanganGR`
- `kirimEmailMOM`
- `kirimReminderDokumen`
- `kirimNotifikasiDokumenDiterima`
- `kirimJadwalPsikotes`
- `kirimReminderAC`
- `kirimUndanganPresentasi`
- `kirimLaporan`

**Format log:** `{ id_request, aktivitas: 'Email Terkirim', detail: '[nama fungsi] → [email tujuan] pada [timestamp]' }`

**File terdampak:**
- `backend/src/services/emailService.js`

---

### 3. Form Pengajuan — Hapus Opsi Jenis Assessment
**Deskripsi:**  
Hapus pilihan **"Potential Review & Profiling"** dari dropdown Jenis Assessment. Hanya tersisa 2 pilihan:
- Potential Review
- Profiling

**File terdampak:**
- `frontend/src/pages/FormPengajuan.jsx`

---

### 4. Fitur Hapus Request di Dashboard
**Deskripsi:**  
Tambah tombol hapus per baris request di halaman Dashboard untuk PIC Asesmen. Setiap baris di tabel request memiliki tombol hapus di kolom Aksi (di samping tombol Detail).

**Yang perlu ditambahkan:**
- Tombol hapus per baris di `Dashboard.jsx`
- Konfirmasi sebelum hapus (popup/dialog)
- Endpoint `DELETE /api/requests/:idRequest` di backend (PIC only)

**File terdampak:**
- `frontend/src/pages/Dashboard.jsx`
- `backend/src/routes/requests.js`

---

### 5. Assessment Center & Psikotes

#### 5a. Kuota Diganti ke Sistem Rentang Tanggal
**Deskripsi:**  
Sistem kuota yang saat ini membatasi pendaftaran secara otomatis diganti menjadi sistem rentang tanggal. Pendaftar bisa mendaftar sebanyak-banyaknya selama masih dalam rentang tanggal yang di-set PIC. Kuota 8 hanya sebagai **notice/acuan** untuk informasi saja — PIC RACD yang seleksi manual siapa yang masuk.

**Yang perlu diubah:**
- Hapus logic `sisaKuota <= 0` yang men-set status `Ditunda - Kuota Penuh`
- Tambah field `tanggal_buka` dan `tanggal_tutup` di konfigurasi (rentang pendaftaran)
- Validasi pendaftaran berdasarkan rentang tanggal, bukan kuota
- Kuota tetap ditampilkan sebagai informasi di email pembukaan dan form pengajuan
- Konfigurasi di halaman Konfigurasi diupdate sesuai field baru

**File terdampak:**
- `backend/src/routes/requests.js`
- `frontend/src/pages/Konfigurasi.jsx`
- `backend/src/services/emailService.js` (template email pembukaan)

#### 5b. Perubahan Field Psikotes
**Deskripsi:**  
Dua perubahan field pada jadwal psikotes:
1. **Jam psikotes** → diganti menjadi **rentang jam** (contoh: `08.00–10.00`)
2. **Link Platform Psikotes** → diganti menjadi teks pemberitahuan statis: *"Cek email dari astra.recruitment@ai.astra.co.id"*

**Yang perlu diubah:**
- Field `jam_psikotes` di form input PIC → input rentang jam
- Field `link_platform_psikotes` dihapus dari form, diganti teks statis
- Template email psikotes diupdate sesuai perubahan field
- Tampilan di `CekStatus.jsx` dan `FormDokumen.jsx` diupdate

**File terdampak:**
- `backend/src/routes/fase_routes.js` (endpoint psikotes)
- `frontend/src/pages/DetailRequest.jsx`
- `frontend/src/pages/CekStatus.jsx`
- `frontend/src/pages/FormDokumen.jsx`
- `backend/src/services/emailService.js`

#### 5c. Custom Jadwal & Reminder untuk Tim Pelaksana
**Deskripsi:**  
Tambah fitur jadwal dan reminder otomatis yang terpisah untuk Tim Pelaksana:

- **Jadwal Psikotes** → dikirim ke **Administrator**
- **Jadwal AC** → dikirim ke **Assessor & Roleplayer**
- Reminder otomatis **H-3** dan **H-1** untuk Assessor, Roleplayer, dan Administrator
- Input custom tanggal & rentang jam tersendiri untuk masing-masing jadwal
- Bisa **tambah jadwal baru** atau **revisi jadwal** yang sudah ada, lalu kirim ulang email notifikasi
- Saat ada **pergantian jadwal**, email notifikasi juga dikirim ke **PIC HC dan User/Atasan**

**Yang perlu ditambahkan/diubah:**
- Form input jadwal terpisah (Psikotes & AC) di halaman Detail Request
- Endpoint baru atau update endpoint existing untuk handle revisi jadwal + kirim ulang email
- Logic reminder H-3 dan H-1 di `cronService.js` diperluas untuk Tim Pelaksana secara dinamis
- Email notifikasi pergantian jadwal ke HC dan User/Atasan

**File terdampak:**
- `frontend/src/pages/DetailRequest.jsx`
- `backend/src/routes/fase_routes.js`
- `backend/src/services/cronService.js`
- `backend/src/services/emailService.js`

#### 5d. Link Keperluan Asesmen & Psikotes
**Deskripsi:**  
Tambah 1 field input custom di sistem untuk link-link keperluan asesmen dan psikotes (termasuk skenario, rundown, dll) yang disiapkan oleh PIC Asesmen — bukan oleh assessor. Link ini bisa diakses oleh tim pelaksana.

**Yang perlu ditambahkan:**
- Field `link_keperluan_asesmen` di halaman Konfigurasi (diisi oleh PIC)
- Ditampilkan di halaman Detail Request untuk PIC
- Disertakan dalam email notifikasi yang dikirim ke Tim Pelaksana

**File terdampak:**
- `frontend/src/pages/Konfigurasi.jsx`
- `frontend/src/pages/DetailRequest.jsx`
- `backend/src/services/emailService.js`

---

### 6. Cek Status — Cari by Email HC
**Deskripsi:**  
Halaman Cek Status saat ini hanya bisa menampilkan 1 peserta per pencarian (input ID request manual). Untuk HC yang mendaftarkan banyak peserta, ini tidak nyaman karena harus cek satu per satu.

**Solusi:** Tambah fitur cari by email HC → tampil semua peserta yang pernah didaftarkan dalam 1 tabel lengkap.

**Tampilan hasil:**
```
Hasil untuk: pic@perusahaan.com

Peserta          | Status              | Aksi
----------------|---------------------|------------------
Budi Santoso    | Approved            | Upload Dokumen →
Sari Dewi       | Pending Review      | Cek Detail →
Ahmad Fauzi     | Dokumen Diterima    | Lihat Jadwal →
```

**Yang perlu ditambahkan:**
- Tab/toggle di halaman Cek Status: "Cari by ID Request" atau "Cari by Email"
- Endpoint baru `GET /api/requests/status/by-email/:email` (publik)
- Tampilan tabel multi peserta di `CekStatus.jsx`

**File terdampak:**
- `frontend/src/pages/CekStatus.jsx`
- `backend/src/routes/requests.js`

---

### 7. Invite Kalender (.ics)
**Deskripsi:**  
Email notifikasi jadwal menyertakan file `.ics` (iCalendar) sebagai attachment sehingga penerima bisa langsung add ke Google Calendar atau Outlook Calendar.

**Berlaku untuk email:**
- Jadwal Psikotes
- Jadwal AC
- Undangan GR
- Undangan Presentasi Hasil

**Cara implementasi:** Generate file `.ics` di backend, attach ke email via Resend. Tidak butuh API eksternal.

**File terdampak:**
- `backend/src/services/emailService.js`

---

### 8. Booking Jadwal Presentasi oleh HC/User
**Deskripsi:**  
PIC RACD menyediakan slot-slot waktu presentasi yang tersedia. HC/User bisa booking sendiri dan memilih jadwal dari slot yang tersedia — tanpa perlu koordinasi manual.

**Alur:**
1. PIC RACD input slot waktu tersedia di halaman Detail Request / Konfigurasi
2. HC/User buka halaman publik, lihat slot tersedia, pilih dan konfirmasi
3. Slot yang sudah dipilih otomatis terkunci
4. Email konfirmasi dikirim ke HC/User dan PIC

**Yang perlu ditambahkan:**
- Tabel baru di Supabase: `jadwal_presentasi` (`id`, `id_request`, `tanggal`, `jam`, `status: tersedia/terbooking`, `booked_by`)
- Endpoint: tambah slot (PIC), lihat slot tersedia (publik), booking slot (HC)
- UI di Detail Request untuk PIC input slot
- Halaman/section publik di CekStatus untuk HC pilih slot
- Email konfirmasi booking

**File terdampak:**
- `backend/src/routes/fase6.js` (atau buat route baru)
- `frontend/src/pages/DetailRequest.jsx`
- `frontend/src/pages/CekStatus.jsx`
- `backend/src/services/emailService.js`

---

## POIN INFORMATIF (Rencana ke Depan)

### Email & Domain
- **Delay email ke Outlook/non-Gmail:** Kemungkinan karena reputasi domain `lyraac.site` yang baru diverifikasi. Akan membaik seiring waktu (domain warming). SPF/DKIM/DMARC sudah terkonfigurasi di Cloudflare.
- **Kompatibilitas:** Resend + domain verified sudah support semua provider email.

### Rencana Masa Depan
- Perubahan template email → dikerjakan sesuai kebutuhan
- Optimasi tampilan UI → dikerjakan sesuai kebutuhan

---

## URUTAN PENGERJAAN

| Batch | Revisi | Estimasi |
|-------|--------|----------|
| **Batch 1** (Quick wins) | 3. Hapus opsi jenis assessment | 5 menit |
| | 4. Tombol hapus request Dashboard | 30 menit |
| | 2. Track record email | 1 jam |
| | 1. Bug multi peserta + fix cron | 1 jam |
| **Batch 2** (Form & Status) | 6. Cek Status by email HC | 1.5 jam |
| | 5a. Kuota → rentang tanggal | 2 jam |
| | 5b. Perubahan field psikotes | 1 jam |
| **Batch 3** (Fitur Jadwal) | 5d. Link keperluan asesmen | 1.5 jam |
| | 7. Invite kalender (.ics) | 2 jam |
| | 5c. Custom jadwal & reminder Tim Pelaksana | 5 jam |
| **Batch 4** (Fitur Baru) | 8. Booking jadwal presentasi oleh HC | 4 jam |

**Total estimasi: ~1–2 hari kerja**

---

*Semua revisi di atas 100% possible dengan infrastruktur yang sudah ada (Supabase, Railway, Vercel, Resend). Tidak membutuhkan layanan berbayar tambahan.*
