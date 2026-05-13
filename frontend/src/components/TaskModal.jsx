import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { X, Loader2, Trash2, MessageSquare, Send, User } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_COLORS = {
  low: 'text-slate-400 bg-slate-700/50',
  medium: 'text-yellow-400 bg-yellow-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  urgent: 'text-red-400 bg-red-500/10',
};

export default function TaskModal({ task, projectId, members, onClose, onSave, onDelete, canEdit }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(!task.id);
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    assignee_id: task.assignee_id || '',
    due_date: task.due_date || '',
    estimated_hours: task.estimated_hours || '',
    tags: task.tags || [],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const isNew = !task.id;

  useEffect(() => {
    if (task.id) {
      api.get(`/projects/${projectId}/tasks/${task.id}/comments`)
        .then(r => setComments(r.data.comments))
        .catch(() => {});
    }
  }, [task.id, projectId]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      let result;
      const payload = {
        ...form,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      };

      if (isNew) {
        result = await api.post(`/projects/${projectId}/tasks`, payload);
        toast.success('Task created');
      } else {
        result = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
        toast.success('Task updated');
      }
      onSave(result.data.task);
      if (isNew) onClose();
      else setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}/tasks/${task.id}`);
      toast.success('Task deleted');
      onDelete(task.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: newComment });
      setComments(prev => [...prev, res.data.comment]);
      setNewComment('');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSendingComment(false);
    }
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <h2 className="font-semibold text-white">{isNew ? 'New Task' : editing ? 'Edit Task' : 'Task Details'}</h2>
          <div className="flex items-center gap-2">
            {!isNew && canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary py-1.5 px-3 text-sm">Edit</button>
            )}
            {!isNew && canEdit && (
              <button onClick={handleDelete} disabled={deleting} className="btn-danger py-1.5 px-3 text-sm">
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-1"><X size={20} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Title */}
          {(isNew || editing) ? (
            <div>
              <label className="label">Title *</label>
              <input className="input text-base font-medium" placeholder="Task title..." value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
            </div>
          ) : (
            <h3 className="text-lg font-semibold text-white">{task.title}</h3>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              {editing || isNew ? (
                <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : (
                <span className="badge bg-slate-700/50 text-slate-300 text-sm py-1 px-3">
                  {STATUSES.find(s => s.value === task.status)?.label}
                </span>
              )}
            </div>
            <div>
              <label className="label">Priority</label>
              {editing || isNew ? (
                <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              ) : (
                <span className={`badge text-sm py-1 px-3 ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
              )}
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Assignee</label>
              {editing || isNew ? (
                <select className="input" value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  {task.assignee_id ? (
                    <>
                      <img src={task.assignee_avatar} alt={task.assignee_name}
                        className="w-6 h-6 rounded-full bg-slate-700"
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee_name || 'U')}&background=4f46e5&color=fff&size=24`; }}
                      />
                      <span className="text-sm text-slate-300">{task.assignee_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500 flex items-center gap-1.5"><User size={14} /> Unassigned</span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="label">Due Date</label>
              {editing || isNew ? (
                <input type="date" className="input" value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              ) : (
                <span className="text-sm text-slate-300">
                  {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '—'}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            {editing || isNew ? (
              <textarea className="input resize-none" rows={4} placeholder="Add a description..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            ) : (
              <p className="text-sm text-slate-400 whitespace-pre-wrap">{task.description || 'No description'}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editing || isNew ? form.tags : task.tags || []).map((tag, i) => (
                <span key={i} className="badge bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 py-1">
                  {tag}
                  {(editing || isNew) && (
                    <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) }))}
                      className="ml-1 hover:text-red-400">×</button>
                  )}
                </span>
              ))}
            </div>
            {(editing || isNew) && (
              <input className="input text-sm" placeholder="Add tag and press Enter..."
                value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} />
            )}
          </div>

          {/* Estimated Hours */}
          {(editing || isNew) && (
            <div>
              <label className="label">Estimated Hours</label>
              <input type="number" min="0" step="0.5" className="input" value={form.estimated_hours}
                onChange={e => setForm(p => ({ ...p, estimated_hours: e.target.value }))} placeholder="e.g. 4" />
            </div>
          )}

          {/* Save buttons */}
          {(editing || isNew) && (
            <div className="flex gap-3 pt-2">
              {!isNew && <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>}
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {isNew ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Comments */}
          {!isNew && (
            <div className="border-t border-slate-800 pt-5">
              <h4 className="font-medium text-slate-300 flex items-center gap-2 mb-4">
                <MessageSquare size={15} /> Comments ({comments.length})
              </h4>
              <div className="space-y-3 mb-4">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.avatar} alt={c.name}
                      className="w-7 h-7 rounded-full bg-slate-700 flex-shrink-0 mt-0.5"
                      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'U')}&background=4f46e5&color=fff&size=28`; }}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-slate-200">{c.name}</span>
                        <span className="text-xs text-slate-600">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-sm text-slate-600">No comments yet</p>}
              </div>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="Add a comment..."
                  value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()} />
                <button onClick={handleComment} disabled={sendingComment || !newComment.trim()} className="btn-primary px-3">
                  {sendingComment ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
