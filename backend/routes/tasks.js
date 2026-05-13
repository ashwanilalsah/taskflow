const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../models/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const router = express.Router({ mergeParams: true });
const p = (db,s,v=[]) => new Promise((res,rej) => db.run(s,v,e=>e?rej(e):res()));
const g = (db,s,v=[]) => new Promise((res,rej) => db.get(s,v,(e,r)=>e?rej(e):res(r)));
const a = (db,s,v=[]) => new Promise((res,rej) => db.all(s,v,(e,r)=>e?rej(e):res(r)));

router.get('/', authenticate, requireProjectAccess, async (req, res) => {
  const db = getDb(); const { status, priority } = req.query;
  let q=`SELECT t.*,u.name as assignee_name,u.avatar as assignee_avatar,c.name as creator_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id LEFT JOIN users c ON t.creator_id=c.id WHERE t.project_id=?`;
  const params=[req.params.projectId];
  if(status){q+=' AND t.status=?';params.push(status);}
  if(priority){q+=' AND t.priority=?';params.push(priority);}
  q+=` ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,t.created_at DESC`;
  const tasks = await a(db,q,params);
  res.json({ tasks: tasks.map(t=>({...t,tags:JSON.parse(t.tags||'[]')})) });
});

router.post('/', authenticate, requireProjectAccess, async (req, res) => {
  const { title, description, status='todo', priority='medium', assignee_id, due_date, estimated_hours, tags=[] } = req.body;
  if(!title) return res.status(400).json({ error:'Title required' });
  const db = getDb(); const id = uuidv4();
  await p(db,`INSERT INTO tasks (id,title,description,status,priority,project_id,assignee_id,creator_id,due_date,estimated_hours,tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,[id,title,description||null,status,priority,req.params.projectId,assignee_id||null,req.user.id,due_date||null,estimated_hours||null,JSON.stringify(tags)]);
  const task = await g(db,`SELECT t.*,u.name as assignee_name,u.avatar as assignee_avatar,c.name as creator_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id LEFT JOIN users c ON t.creator_id=c.id WHERE t.id=?`,[id]);
  res.status(201).json({ task:{...task,tags:JSON.parse(task.tags||'[]')} });
});

router.put('/:taskId', authenticate, requireProjectAccess, async (req, res) => {
  const db = getDb();
  const task = await g(db,'SELECT * FROM tasks WHERE id=? AND project_id=?',[req.params.taskId,req.params.projectId]);
  if(!task) return res.status(404).json({ error:'Task not found' });
  const canEdit = req.user.role==='admin'||task.creator_id===req.user.id||task.assignee_id===req.user.id||(req.membership&&req.membership.role==='admin');
  if(!canEdit) return res.status(403).json({ error:'Permission denied' });
  const allowed=['title','description','status','priority','assignee_id','due_date','estimated_hours'];
  const sets=['updated_at=?']; const vals=[new Date().toISOString()];
  allowed.forEach(f=>{if(req.body[f]!==undefined){sets.push(`${f}=?`);vals.push(req.body[f]===''?null:req.body[f]);}});
  if(req.body.tags!==undefined){sets.push('tags=?');vals.push(JSON.stringify(req.body.tags));}
  vals.push(req.params.taskId);
  await p(db,`UPDATE tasks SET ${sets.join(',')} WHERE id=?`,vals);
  const updated = await g(db,`SELECT t.*,u.name as assignee_name,u.avatar as assignee_avatar,c.name as creator_name FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id LEFT JOIN users c ON t.creator_id=c.id WHERE t.id=?`,[req.params.taskId]);
  res.json({ task:{...updated,tags:JSON.parse(updated.tags||'[]')} });
});

router.delete('/:taskId', authenticate, requireProjectAccess, async (req, res) => {
  const db = getDb();
  const task = await g(db,'SELECT * FROM tasks WHERE id=? AND project_id=?',[req.params.taskId,req.params.projectId]);
  if(!task) return res.status(404).json({ error:'Task not found' });
  const canDelete=req.user.role==='admin'||task.creator_id===req.user.id||(req.membership&&req.membership.role==='admin');
  if(!canDelete) return res.status(403).json({ error:'Permission denied' });
  await p(db,'DELETE FROM tasks WHERE id=?',[req.params.taskId]);
  res.json({ message:'Task deleted' });
});

router.get('/:taskId/comments', authenticate, requireProjectAccess, async (req, res) => {
  const db = getDb();
  const comments = await a(db,`SELECT c.*,u.name,u.avatar FROM comments c JOIN users u ON c.user_id=u.id WHERE c.task_id=? ORDER BY c.created_at ASC`,[req.params.taskId]);
  res.json({ comments });
});

router.post('/:taskId/comments', authenticate, requireProjectAccess, async (req, res) => {
  const { content } = req.body;
  if(!content) return res.status(400).json({ error:'Content required' });
  const db = getDb(); const id = uuidv4();
  await p(db,'INSERT INTO comments (id,task_id,user_id,content) VALUES (?,?,?,?)',[id,req.params.taskId,req.user.id,content]);
  const comment = await g(db,`SELECT c.*,u.name,u.avatar FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?`,[id]);
  res.status(201).json({ comment });
});

module.exports = router;