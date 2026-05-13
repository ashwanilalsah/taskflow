const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../models/database');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');
const router = express.Router();
const p = (db,s,v=[]) => new Promise((res,rej) => db.run(s,v,e=>e?rej(e):res()));
const g = (db,s,v=[]) => new Promise((res,rej) => db.get(s,v,(e,r)=>e?rej(e):res(r)));
const a = (db,s,v=[]) => new Promise((res,rej) => db.all(s,v,(e,r)=>e?rej(e):res(r)));

router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const isAdmin = req.user.role === 'admin';
  const projects = isAdmin
    ? await a(db, `SELECT p.*,u.name as owner_name,u.avatar as owner_avatar,(SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) as task_count,(SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.status='done') as done_count,(SELECT COUNT(*) FROM project_members pm WHERE pm.project_id=p.id) as member_count FROM projects p JOIN users u ON p.owner_id=u.id ORDER BY p.created_at DESC`)
    : await a(db, `SELECT p.*,u.name as owner_name,u.avatar as owner_avatar,pm.role as my_role,(SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) as task_count,(SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.status='done') as done_count,(SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id=p.id) as member_count FROM projects p JOIN users u ON p.owner_id=u.id JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=? ORDER BY p.created_at DESC`, [req.user.id]);
  res.json({ projects });
});

router.post('/', authenticate, async (req, res) => {
  const { name, description, due_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = getDb(); const id = uuidv4();
  await p(db, 'INSERT INTO projects (id,name,description,owner_id,due_date) VALUES (?,?,?,?,?)', [id, name, description||null, req.user.id, due_date||null]);
  await p(db, 'INSERT INTO project_members (id,project_id,user_id,role) VALUES (?,?,?,?)', [uuidv4(), id, req.user.id, 'admin']);
  res.status(201).json({ project: await g(db, 'SELECT * FROM projects WHERE id=?', [id]) });
});

router.get('/:projectId', authenticate, requireProjectAccess, async (req, res) => {
  const db = getDb(); const pid = req.params.projectId;
  const members = await a(db, `SELECT u.id,u.name,u.email,u.avatar,pm.role,pm.joined_at FROM project_members pm JOIN users u ON pm.user_id=u.id WHERE pm.project_id=? ORDER BY pm.role DESC,u.name`, [pid]);
  const stats = await g(db, `SELECT COUNT(*) as total,SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) as in_review,SUM(CASE WHEN due_date < date('now') AND status!='done' THEN 1 ELSE 0 END) as overdue FROM tasks WHERE project_id=?`, [pid]);
  res.json({ project: req.project, members, stats });
});

router.put('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, async (req, res) => {
  const db = getDb(); const { name, description, status, due_date } = req.body;
  const sets=[]; const vals=[];
  if(name){sets.push('name=?');vals.push(name);}
  if(description!==undefined){sets.push('description=?');vals.push(description);}
  if(status){sets.push('status=?');vals.push(status);}
  if(due_date!==undefined){sets.push('due_date=?');vals.push(due_date||null);}
  sets.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(req.params.projectId);
  if(sets.length>1) await p(db,`UPDATE projects SET ${sets.join(',')} WHERE id=?`,vals);
  res.json({ project: await g(db,'SELECT * FROM projects WHERE id=?',[req.params.projectId]) });
});

router.delete('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, async (req, res) => {
  const db = getDb();
  await p(db,'DELETE FROM tasks WHERE project_id=?',[req.params.projectId]);
  await p(db,'DELETE FROM project_members WHERE project_id=?',[req.params.projectId]);
  await p(db,'DELETE FROM projects WHERE id=?',[req.params.projectId]);
  res.json({ message: 'Project deleted' });
});

router.post('/:projectId/members', authenticate, requireProjectAccess, requireProjectAdmin, async (req, res) => {
  const { email, role='member' } = req.body;
  const db = getDb();
  const user = await g(db,'SELECT * FROM users WHERE email=?',[email]);
  if(!user) return res.status(404).json({ error: 'User not found. They must register first.' });
  const existing = await g(db,'SELECT * FROM project_members WHERE project_id=? AND user_id=?',[req.params.projectId,user.id]);
  if(existing) return res.status(409).json({ error: 'Already a member' });
  await p(db,'INSERT INTO project_members (id,project_id,user_id,role) VALUES (?,?,?,?)',[uuidv4(),req.params.projectId,user.id,role]);
  res.status(201).json({ message:'Member added', user:{id:user.id,name:user.name,email:user.email,avatar:user.avatar,role} });
});

router.delete('/:projectId/members/:userId', authenticate, requireProjectAccess, requireProjectAdmin, async (req, res) => {
  const db = getDb();
  await p(db,'DELETE FROM project_members WHERE project_id=? AND user_id=?',[req.params.projectId,req.params.userId]);
  await p(db,'UPDATE tasks SET assignee_id=NULL WHERE project_id=? AND assignee_id=?',[req.params.projectId,req.params.userId]);
  res.json({ message:'Member removed' });
});

router.put('/:projectId/members/:userId/role', authenticate, requireProjectAccess, requireProjectAdmin, async (req, res) => {
  const db = getDb();
  await p(db,'UPDATE project_members SET role=? WHERE project_id=? AND user_id=?',[req.body.role,req.params.projectId,req.params.userId]);
  res.json({ message:'Role updated' });
});

module.exports = router;