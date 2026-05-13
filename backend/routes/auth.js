const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../models/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'member']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, role = 'member' } = req.body;
  const db = getDb();
  try {
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => err ? reject(err) : resolve(row));
    });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a`;
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, email, hashedPassword, role, avatar], err => err ? reject(err) : resolve());
    });
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, name, email, role, avatar } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  const db = getDb();
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
], async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const db = getDb();
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });
    const updates = [];
    const values = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (currentPassword && newPassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
      updates.push('password = ?');
      values.push(await bcrypt.hash(newPassword, 12));
    }
    if (updates.length > 0) {
      values.push(req.user.id);
      await new Promise((resolve, reject) => {
        db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, err => err ? reject(err) : resolve());
      });
    }
    const updated = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, email, role, avatar FROM users WHERE id = ?', [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });
    res.json({ user: updated });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/users', authenticate, (req, res) => {
  const db = getDb();
  db.all('SELECT id, name, email, role, avatar FROM users ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ users: rows });
  });
});

module.exports = router;
