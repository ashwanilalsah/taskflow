const express = require('express');
const { getDb } = require('../models/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const g = (db,s,v=[]) => new Promise((res,rej) => db.get(s,v,(e,r)=>e?rej(e):res(r)));
const a = (db,s,v=[]) => new Promise((res,rej) => db.all(s,v,(e,r)=>e?rej(e):res(r)));

router.get('/', authenticate, async (req, res) => {
  const db = getDb(); const uid = req.user.id; const isAdmin = req.user.role==='admin';
  try {
    const taskStats = isAdmin
      ? await g(db,`SELECT COUNT(*) as total,SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) as in_review,SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,SUM(CASE WHEN due_date < date('now') AND status!='done' THEN 1 ELSE 0 END) as overdue FROM tasks`)
      : await g(db,`SELECT COUNT(*) as total,SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) as in_review,SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,SUM(CASE WHEN due_date < date('now') AND status!='done' THEN 1 ELSE 0 END) as overdue FROM tasks WHERE assignee_id=? OR creator_id=?`,[uid,uid]);
    const myTasks = await a(db,`SELECT t.*,p.name as project_name,u.name as assignee_name,u.avatar as assignee_avatar FROM tasks t JOIN projects p ON t.project_id=p.id LEFT JOIN users u ON t.assignee_id=u.id WHERE t.assignee_id=? AND t.status!='done' ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END LIMIT 10`,[uid]);
    const overdueTasks = isAdmin
      ? await a(db,`SELECT t.*,p.name as project_name,u.name as assignee_name FROM tasks t JOIN projects p ON t.project_id=p.id LEFT JOIN users u ON t.assignee_id=u.id WHERE t.due_date < date('now') AND t.status!='done' ORDER BY t.due_date ASC LIMIT 10`)
      : await a(db,`SELECT t.*,p.name as project_name,u.name as assignee_name FROM tasks t JOIN projects p ON t.project_id=p.id LEFT JOIN users u ON t.assignee_id=u.id WHERE t.due_date < date('now') AND t.status!='done' AND (t.assignee_id=? OR t.creator_id=?) ORDER BY t.due_date ASC LIMIT 10`,[uid,uid]);
    const activity = await a(db,`SELECT al.*,u.name,u.avatar FROM activity_log al JOIN users u ON al.user_id=u.id ORDER BY al.created_at DESC LIMIT 20`);
    const projects = isAdmin
      ? await a(db,`SELECT p.id,p.name,p.status,p.due_date,COUNT(t.id) as task_count,SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done_count FROM projects p LEFT JOIN tasks t ON t.project_id=p.id WHERE p.status!='archived' GROUP BY p.id ORDER BY p.created_at DESC LIMIT 6`)
      : await a(db,`SELECT p.id,p.name,p.status,p.due_date,COUNT(t.id) as task_count,SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done_count FROM projects p LEFT JOIN tasks t ON t.project_id=p.id JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=? WHERE p.status!='archived' GROUP BY p.id ORDER BY p.created_at DESC LIMIT 6`,[uid]);
    let teamStats = null;
    if(isAdmin) {
      const tu=await g(db,'SELECT COUNT(*) as count FROM users');
      const tp=await g(db,'SELECT COUNT(*) as count FROM projects');
      const ap=await g(db,"SELECT COUNT(*) as count FROM projects WHERE status='active'");
      teamStats={totalUsers:tu.count,totalProjects:tp.count,activeProjects:ap.count};
    }
    res.json({ taskStats, myTasks:myTasks.map(t=>({...t,tags:JSON.parse(t.tags||'[]')})), overdueTasks:overdueTasks.map(t=>({...t,tags:JSON.parse(t.tags||'[]')})), activity:activity.map(a=>({...a,details:JSON.parse(a.details||'{}')})), projects, teamStats });
  } catch(e) { console.error(e); res.status(500).json({ error:'Server error' }); }
});

module.exports = router;