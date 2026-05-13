import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TaskModal from '../components/TaskModal';
import { format, isPast, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Settings, Users, Loader2, UserPlus, X, Trash2,
  CheckCircle2, Clock, Eye, ListTodo, MoreVertical, Filter, Search,
  Shield, Calendar
} from 'lucide-react';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'text-slate-400', dot: 'bg-slate-500', headerBg: 'bg-slate-800/50' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-400', dot: 'bg-blue-500', headerBg: 'bg-blue-500/10' },
  { key: 'in_review', label: 'In Review', color: 'text-purple-400', dot: 'bg-purple-500', headerBg: 'bg-purple-500/10' },
  { key: 'done', label: 'Done', color: 'text-emerald-400', dot: 'bg-emerald-500', headerBg: 'bg-emerald-500/10' },
];

const PRIORITY_COLORS = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-slate-400 bg-slate-700/50 border-slate-600/20',
};
const PRIORITY_DOT = {
  urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-slate-500'
};

function TaskCard({ task, onClick }) {
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div onClick={() => onClick(task)}
      className="card p-3.5 cursor-pointer hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.98]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-200 flex-1 leading-snug">{task.title}</p>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${PRIORITY_DOT[task.priority]}`} />
      </div>
      {task.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{task.description}</p>
      )}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded px-1.5 py-0.5">{tag}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {task.assignee_id ? (
            <img src={task.assignee_avatar} alt={task.assignee_name}
              className="w-5 h-5 rounded-full bg-slate-700"
              title={task.assignee_name}
              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee_name || 'U')}&background=4f46e5&color=fff&size=20`; }}
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <span className="text-slate-600 text-xs">?</span>
            </div>
          )}
          {task.due_date && (
            <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
              <Calendar size={10} />
              {format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
        <span className={`badge border text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
      </div>
    </div>
  );
}

function MemberRow({ member, onRemove, onRoleChange, canManage, isOwner }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
      <img src={member.avatar} alt={member.name}
        className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0"
        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'U')}&background=4f46e5&color=fff&size=32`; }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{member.name}</p>
        <p className="text-xs text-slate-500 truncate">{member.email}</p>
      </div>
      <div className="flex items-center gap-2">
        {canManage && !isOwner ? (
          <select
            value={member.role}
            onChange={e => onRoleChange(member.id, e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className={`badge text-xs ${member.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-700/50 text-slate-400'}`}>
            {member.role === 'admin' && <Shield size={10} />}
            {member.role}
          </span>
        )}
        {canManage && !isOwner && (
          <button onClick={() => onRemove(member.id)} className="text-slate-600 hover:text-red-400 transition-colors">
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board'); // board | list
  const [activeTab, setActiveTab] = useState('tasks'); // tasks | members | settings
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({});

  const myMembership = members.find(m => m.id === user?.id);
  const canManage = isAdmin || myMembership?.role === 'admin';

  const loadData = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setStats(projRes.data.stats);
      setTasks(tasksRes.data.tasks);
      setProjectForm({
        name: projRes.data.project.name,
        description: projRes.data.project.description || '',
        status: projRes.data.project.status,
        due_date: projRes.data.project.due_date || '',
      });
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) navigate('/projects');
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [projectId]);

  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email: addMemberEmail });
      setMembers(prev => [...prev, { ...res.data.user, role: 'member' }]);
      setAddMemberEmail('');
      toast.success('Member added!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/projects/${projectId}/members/${userId}/role`, { role });
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleSaveProject = async () => {
    try {
      const res = await api.put(`/projects/${projectId}`, projectForm);
      setProject(res.data.project);
      setEditingProject(false);
      toast.success('Project updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project?.name}"? This will delete all tasks.`)) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleTaskSaved = (savedTask) => {
    setTasks(prev => {
      const exists = prev.find(t => t.id === savedTask.id);
      return exists ? prev.map(t => t.id === savedTask.id ? savedTask : t) : [savedTask, ...prev];
    });
  };

  const handleTaskDeleted = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const openNewTask = () => {
    setSelectedTask({ title: '', status: 'todo', priority: 'medium', tags: [] });
    setShowTaskModal(true);
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-indigo-500" />
    </div>
  );

  const progressPct = stats?.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white truncate">{project?.name}</h1>
            {project?.description && <p className="text-slate-400 mt-1 text-sm">{project.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && (
              <button onClick={openNewTask} className="btn-primary">
                <Plus size={16} /> Task
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { icon: ListTodo, label: 'Todo', val: stats?.todo, color: 'text-slate-400' },
            { icon: Clock, label: 'In Progress', val: stats?.in_progress, color: 'text-blue-400' },
            { icon: Eye, label: 'In Review', val: stats?.in_review, color: 'text-purple-400' },
            { icon: CheckCircle2, label: 'Done', val: stats?.done, color: 'text-emerald-400' },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="card p-3 text-center">
              <Icon size={16} className={`mx-auto mb-1 ${color}`} />
              <div className="text-xl font-bold text-white">{val || 0}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>{progressPct}% complete</span>
            {stats?.overdue > 0 && <span className="text-red-400">{stats.overdue} overdue</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {[
          { key: 'tasks', label: 'Tasks' },
          { key: 'members', label: `Members (${members.length})` },
          ...(canManage ? [{ key: 'settings', label: 'Settings' }] : []),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-9 text-sm py-2" placeholder="Search tasks..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="input w-auto text-sm py-2" value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <div className="flex gap-1">
              {['board', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-2 text-sm rounded-lg transition-all ${view === v ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {canManage && (
              <button onClick={openNewTask} className="btn-secondary text-sm py-2">
                <Plus size={14} /> Add Task
              </button>
            )}
          </div>

          {/* Board View */}
          {view === 'board' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUMNS.map(col => {
                const colTasks = filteredTasks.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className="flex flex-col min-h-64">
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${col.headerBg}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                        <span className="text-xs text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                      </div>
                      {canManage && (
                        <button onClick={() => { setSelectedTask({ title: '', status: col.key, priority: 'medium', tags: [] }); setShowTaskModal(true); }}
                          className="text-slate-600 hover:text-slate-300 transition-colors">
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      {colTasks.map(task => (
                        <TaskCard key={task.id} task={task} onClick={openTask} />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="text-center py-6 text-slate-700 text-xs">Empty</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List View */}
          {view === 'list' && (
            <div className="card divide-y divide-slate-800/60">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <ListTodo size={32} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-500 text-sm">No tasks found</p>
                </div>
              ) : filteredTasks.map(task => {
                const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                return (
                  <div key={task.id} onClick={() => openTask(task)}
                    className="flex items-center gap-4 p-4 hover:bg-slate-800/30 cursor-pointer transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{task.title}</p>
                      {task.description && <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {task.assignee_id && (
                        <img src={task.assignee_avatar} alt={task.assignee_name}
                          className="w-6 h-6 rounded-full bg-slate-700"
                          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee_name || 'U')}&background=4f46e5&color=fff&size=24`; }}
                        />
                      )}
                      {task.due_date && (
                        <span className={`text-xs ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
                          {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                      <span className="badge text-xs bg-slate-700/50 text-slate-400">
                        {COLUMNS.find(c => c.key === task.status)?.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="card p-5 max-w-lg">
          <h3 className="font-semibold text-white mb-4">Team Members</h3>
          {members.map(member => (
            <MemberRow
              key={member.id}
              member={member}
              onRemove={handleRemoveMember}
              onRoleChange={handleRoleChange}
              canManage={canManage}
              isOwner={member.id === project?.owner_id}
            />
          ))}
          {canManage && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <label className="label">Add Member by Email</label>
              <div className="flex gap-2">
                <input className="input text-sm" placeholder="member@company.com"
                  value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()} />
                <button onClick={handleAddMember} disabled={addingMember} className="btn-primary flex-shrink-0">
                  {addingMember ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Add
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">They must have a TaskFlow account first.</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && canManage && (
        <div className="card p-5 max-w-lg space-y-4">
          <h3 className="font-semibold text-white">Project Settings</h3>
          <div>
            <label className="label">Name</label>
            <input className="input" value={projectForm.name || ''} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={projectForm.description || ''}
              onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={projectForm.status || 'active'}
                onChange={e => setProjectForm(p => ({ ...p, status: e.target.value }))}>
                {['active', 'on_hold', 'completed', 'archived'].map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={projectForm.due_date || ''}
                onChange={e => setProjectForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveProject} className="btn-primary">Save Changes</button>
            <button onClick={handleDeleteProject} className="btn-danger ml-auto">
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          members={members}
          onClose={() => { setShowTaskModal(false); setSelectedTask(null); }}
          onSave={handleTaskSaved}
          onDelete={handleTaskDeleted}
          canEdit={canManage || selectedTask.creator_id === user?.id || selectedTask.assignee_id === user?.id}
        />
      )}
    </div>
  );
}
