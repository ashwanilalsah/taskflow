import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { format, isPast, parseISO } from 'date-fns';
import { Plus, FolderKanban, Users, CheckCircle2, Calendar, Loader2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  on_hold: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  completed: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  archived: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', due_date: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/projects', form);
      toast.success('Project created!');
      onCreated(res.data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input className="input" placeholder="My Awesome Project" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="What's this project about?"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  const pct = project.task_count > 0 ? Math.round((project.done_count / project.task_count) * 100) : 0;
  const overdue = project.due_date && isPast(parseISO(project.due_date)) && project.status !== 'completed';

  return (
    <Link to={`/projects/${project.id}`} className="card p-5 hover:border-indigo-500/40 transition-all hover:-translate-y-0.5 duration-200 block group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-indigo-600/20 border border-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600/30 transition-colors">
            <FolderKanban size={15} className="text-indigo-400" />
          </div>
          <h3 className="font-semibold text-slate-100 group-hover:text-white truncate">{project.name}</h3>
        </div>
        <span className={`badge border flex-shrink-0 ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
          {project.status?.replace('_', ' ')}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description}</p>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>{project.done_count || 0}/{project.task_count || 0} tasks</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={11} />
          {project.member_count || 1}
        </span>
        {project.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
            {overdue && <AlertCircle size={11} />}
            <Calendar size={11} />
            {format(parseISO(project.due_date), 'MMM d, yyyy')}
          </span>
        )}
        {project.owner_name && (
          <span className="ml-auto flex items-center gap-1">
            <img
              src={project.owner_avatar}
              alt={project.owner_name}
              className="w-4 h-4 rounded-full bg-slate-700"
              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.owner_name)}&background=4f46e5&color=fff&size=16`; }}
            />
            {project.owner_name}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/projects')
      .then(r => setProjects(r.data.projects))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'on_hold', 'completed', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <FolderKanban size={40} className="mx-auto text-slate-700 mb-3" />
          <h3 className="font-semibold text-slate-300 mb-1">No projects found</h3>
          <p className="text-sm text-slate-500 mb-4">
            {filter === 'all' ? "Create your first project to get started" : `No ${filter} projects`}
          </p>
          {filter === 'all' && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
              <Plus size={16} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}
