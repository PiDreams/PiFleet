const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { isEmail, isNonEmptyString } = require('../../shared/validation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || !isNonEmptyString(password, 200) || password.length < 10) {
    return res.status(400).json({ error: 'Valid email and password of at least 10 characters required' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = bcrypt.hashSync(password, 12);
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), passwordHash, 'admin');

  return res.status(201).json({ ok: true, userId: info.lastInsertRowid });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || !isNonEmptyString(password, 200)) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const jti = uuidv4();
  const token = jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role, jti },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (user_id, jti, expires_at) VALUES (?, ?, ?)')
    .run(user.id, jti, expiresAt);

  return res.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, role: user.role }
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

module.exports = router;
