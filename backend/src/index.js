require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const approvalRoutes = require('./routes/approval');
const configRoutes = require('./routes/config');
const hcRoutes = require('./routes/hc');
const fase3Routes = require('./routes/fase3');
const fase4Routes = require('./routes/fase4');
const fase5Routes = require('./routes/fase5');
const fase6Routes = require('./routes/fase6');
const slotRoutes = require('./routes/slots');
const { runDailyReminders } = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://request-ac.powerappsportals.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ROUTES
// ============================================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Request Assessment API v1 - RACD AIHO',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/config', configRoutes);
app.use('/api/hc', hcRoutes);
app.use('/api/fase3', fase3Routes);
app.use('/api/fase4', fase4Routes);
app.use('/api/fase5', fase5Routes);
app.use('/api/fase6', fase6Routes);
app.use('/api/slots', slotRoutes);

// ============================================================
// CRON JOB - Reminder harian (internal + trigger eksternal)
// ============================================================
// Guard: cegah reminder jalan dua kali di hari yang sama
// (misal cron internal & cron-job.org sama-sama menembak jam 06.00)
let lastReminderRunDate = null;
let reminderRunning = false;

const triggerDailyReminders = async (source) => {
  const todayWIB = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  if (reminderRunning) {
    console.log(`[CRON] Skip (${source}): reminder sedang berjalan`);
    return;
  }
  if (lastReminderRunDate === todayWIB) {
    console.log(`[CRON] Skip (${source}): reminder sudah dijalankan hari ini`);
    return;
  }
  reminderRunning = true;
  lastReminderRunDate = todayWIB;
  console.log(`[CRON] Menjalankan reminder harian (trigger: ${source})...`);
  try {
    await runDailyReminders();
  } finally {
    reminderRunning = false;
  }
};

// Endpoint ringan untuk keep-alive ping (cron-job.org / UptimeRobot)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint trigger cron dari luar (cron-job.org) — dilindungi CRON_SECRET.
// Dibutuhkan di hosting yang menidurkan server saat idle (mis. Render free),
// karena node-cron internal tidak jalan saat server tidur.
app.get('/api/cron/run-daily', (req, res) => {
  if (!process.env.CRON_SECRET || req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Balas segera agar pemanggil tidak kena timeout; proses lanjut di background
  res.json({ success: true, message: 'Reminder harian dipicu' });
  triggerDailyReminders('eksternal').catch(err => console.error('[CRON] Error:', err.message));
});

cron.schedule('0 6 * * *', () => {
  triggerDailyReminders('internal').catch(err => console.error('[CRON] Error:', err.message));
}, {
  timezone: 'Asia/Jakarta'
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
