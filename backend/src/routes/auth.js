const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('aktif', true)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, nama: user.nama, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      perusahaan: user.perusahaan
    }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/setup-password (untuk set password pertama kali)
router.post('/setup-password', async (req, res) => {
  const { email, setupKey, newPassword } = req.body;

  // Setup key harus sama dengan JWT_SECRET (hanya untuk inisialisasi awal)
  if (setupKey !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Setup key tidak valid' });
  }

  const hash = await bcrypt.hash(newPassword, 10);

  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('email', email.toLowerCase());

  if (error) return res.status(500).json({ error: 'Gagal update password' });

  res.json({ message: 'Password berhasil diset' });
});

module.exports = router;
