const jwt = require('jsonwebtoken');
const { getDb } = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-change-in-production';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    db.get('SELECT id, name, email, role, avatar FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      next();
    });
  } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function requireProjectAccess(req, res, next) {
  const db = getDb();
  const { projectId } = req.params;
  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err || !project) return res.status(404).json({ error: 'Project not found' });
    db.get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id], (err2, membership) => {
      if (!membership && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
      req.project = project;
      req.membership = membership;
      next();
    });
  });
}

function requireProjectAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (!req.membership || req.membership.role !== 'admin') return res.status(403).json({ error: 'Project admin required' });
  next();
}

module.exports = { authenticate, requireAdmin, requireProjectAccess, requireProjectAdmin, JWT_SECRET };
