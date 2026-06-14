const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah expired' });
  }
};

const picOnly = (req, res, next) => {
  if (req.user.role !== 'pic_asesmen') {
    return res.status(403).json({ error: 'Akses hanya untuk PIC Asesmen' });
  }
  next();
};

module.exports = { authMiddleware, picOnly };
