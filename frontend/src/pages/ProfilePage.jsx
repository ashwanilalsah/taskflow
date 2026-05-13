import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { User, Mail, Shield, Lock, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [nameForm, setNameForm] = useState({ name: user?.name || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!nameForm.name.trim()) return;
    setSavingName(true);
    try {
      const res = await api.put('/auth/profile', { name: nameForm.name });
      updateUser(res.data.user);
      toast.success('Name updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      await api.put('/auth/profile', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 mt-0.5">Manage your account settings</p>
      </div>

      {/* Avatar & Info */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar}
            alt={user?.name}
            className="w-16 h-16 rounded-full bg-slate-700"
            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=4f46e5&color=fff&size=64`; }}
          />
          <div>
            <h2 className="text-lg font-bold text-white">{user?.name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {user?.role === 'admin' && <Shield size={12} className="text-amber-400" />}
              <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                user?.role === 'admin' 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                  : 'bg-slate-700 text-slate-400'
              }`}>{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Name */}
      <div className="card p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
          <User size={16} className="text-indigo-400" /> Update Name
        </h3>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={nameForm.name}
              onChange={e => setNameForm({ name: e.target.value })} required minLength={2} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-60" value={user?.email} disabled />
            <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" disabled={savingName} className="btn-primary">
            {savingName ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Name
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
          <Lock size={16} className="text-indigo-400" /> Change Password
        </h3>
        <form onSubmit={handleSavePw} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} required minLength={6} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required />
          </div>
          <button type="submit" disabled={savingPw} className="btn-primary">
            {savingPw ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
