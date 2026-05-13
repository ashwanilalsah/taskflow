import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns';
import { 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, Folder, 
  Users, Activity, ArrowRight, Loader2, BarChart3
} from 'lucide-react';

const PRIORITY_CONFIG = {
  urgent: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-500' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-500' },
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-500' },
};

const STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'text-slate-400', bg: 'bg-slate-700/50' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  in_review: { label: 'In Review', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg border ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value ?? '—'}</div>
      <div className="text-sm font-medium text-slate-300">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function TaskRow({ task }) {
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const s = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';

  return (
    <Link to={`/projects/${task.project_id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200 font-medium truncate group-hover:text-white">{task.title}</p>
        <p className="text-xs text-slate-500">{task.project_name}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {overdue && <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> Overdue</span>}
        {task.due_date && !overdue && (
          <span className="text-xs text-slate-500">{format(parseISO(task.due_date), 'MMM d')}</span>
        )}
        <span className={`badge ${s.bg} ${s.color}`}>{s.label}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-indigo-500" />
    </div>
  );

  const { taskStats, myTasks, overdueTasks, activity, projects, teamStats } = data || {};

  const progressPct = taskStats?.total > 0 
    ? Math.round((taskStats.done / taskStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1">Here's what's happening with your projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label="Total Tasks" value={taskStats?.total} color="indigo" />
        <StatCard icon={TrendingUp} label="In Progress" value={taskStats?.in_progress} color="indigo" />
        <StatCard icon={CheckCircle2} label="Completed" value={taskStats?.done} sub={`${progressPct}% done`} color="emerald" />
        <StatCard icon={AlertTriangle} label="Overdue" value={taskStats?.overdue} color="red" />
      </div>

      {/* Progress bar */}
      {taskStats?.total > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Overall Progress</span>
            <span className="text-sm font-bold text-white">{progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" />{taskStats?.todo} Todo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{taskStats?.in_progress} Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />{taskStats?.in_review} Review</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{taskStats?.done} Done</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock size={16} className="text-indigo-400" /> My Active Tasks
            </h2>
            <Link to="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {myTasks?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-700" />
              <p className="text-sm">All caught up! No active tasks.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {myTasks?.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
        </div>

        {/* Sidebar: Projects + Activity */}
        <div className="space-y-4">
          {/* Projects */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Folder size={16} className="text-indigo-400" /> Projects
              </h2>
              <Link to="/projects" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
            </div>
            {projects?.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {projects?.slice(0, 4).map(p => {
                  const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
                  return (
                    <Link key={p.id} to={`/projects/${p.id}`} className="block hover:bg-slate-800/40 rounded-lg p-2 -mx-2 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-200 truncate">{p.name}</span>
                        <span className="text-xs text-slate-500 ml-2">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{p.task_count} tasks</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin: Team Stats */}
          {isAdmin && teamStats && (
            <div className="card p-5">
              <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Users size={16} className="text-indigo-400" /> Team
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{teamStats.totalUsers}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Members</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{teamStats.activeProjects}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Active</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overdue */}
      {overdueTasks?.length > 0 && (
        <div className="card p-5 border-red-500/20">
          <h2 className="font-semibold text-red-400 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} /> Overdue Tasks ({overdueTasks.length})
          </h2>
          <div className="space-y-1">
            {overdueTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activity?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-400" /> Recent Activity
          </h2>
          <div className="space-y-3">
            {activity.slice(0, 8).map(item => (
              <div key={item.id} className="flex items-start gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-7 h-7 rounded-full bg-slate-700 flex-shrink-0 mt-0.5"
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'U')}&background=4f46e5&color=fff&size=28`; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-slate-100">{item.name}</span>{' '}
                    <span className="text-slate-400">{item.action.replace(/_/g, ' ')}</span>{' '}
                    {item.details?.title && <span className="text-slate-300">"{item.details.title}"</span>}
                  </p>
                  <p className="text-xs text-slate-600">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
