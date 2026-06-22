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
// CRON JOB - Jalankan setiap hari pukul 06.00 WIB
// ============================================================
cron.schedule('0 6 * * *', async () => {
  console.log('[CRON] Menjalankan reminder harian...');
  await runDailyReminders();
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
