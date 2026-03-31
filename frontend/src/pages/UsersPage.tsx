import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Loader2, X, UserCheck, UserX, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatDate, getInitials } from '../utils/helpers';

interface User {
  _id: string; name: string; email: string; role: string;
  isActive: boolean; lastLogin?: string;
  storeId?: { name: string }; createdAt: string;
}

const DEFAULT_FORM = { name: '', email: '', password: '', role: 'cashier' };

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) =>
      editUser ? api.put(`/users/${editUser._id}`, payload) : api.post('/users', payload),
    onSuccess: () => {
      toast.success(editUser ? 'User updated' : 'User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false); setEditUser(null); setForm(DEFAULT_FORM);
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) =>
      toast.error(err.response?.data?.error?.message || 'Save failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/users/${id}`, { isActive }),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setShowModal(true);
  };

  const openNew = () => { setEditUser(null); setForm(DEFAULT_FORM); setShowModal(true); };

  const ROLE_COLORS: Record<string, string> = {
    admin: 'badge-red', inventory_manager: 'badge-blue', cashier: 'badge-green',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage staff accounts and permissions</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add User
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              {['User','Role','Store','Last Login','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-16"><Loader2 className="animate-spin text-brand-400 mx-auto" size={24} /></td></tr>
            ) : (data || []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-slate-500">
                <Users size={32} className="mx-auto mb-2 text-slate-700" />No users yet
              </td></tr>
            ) : (data || []).map((user: User) => (
              <tr key={user._id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-semibold flex-shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`${ROLE_COLORS[user.role] || 'badge-blue'} capitalize`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{user.storeId?.name || '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{user.lastLogin ? formatDate(user.lastLogin, 'long') : 'Never'}</td>
                <td className="px-4 py-3"><span className={user.isActive ? 'badge-green' : 'badge-red'}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(user)} className="text-slate-500 hover:text-brand-400 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate({ id: user._id, isActive: !user.isActive })}
                      className={`text-xs flex items-center gap-1 transition-colors ${user.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                    >
                      {user.isActive ? <><UserX size={12} />Deactivate</> : <><UserCheck size={12} />Activate</>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md bg-slate-900 border-slate-700 animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{editUser ? 'Edit User' : 'New User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Full Name', key: 'name', placeholder: 'John Doe' },
                { label: 'Email', key: 'email', placeholder: 'john@company.com', type: 'email' },
                { label: editUser ? 'New Password (leave blank to keep)' : 'Password', key: 'password', placeholder: 'Min. 8 characters', type: 'password' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
                  <input type={type || 'text'} value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="input w-full text-sm" placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input w-full text-sm">
                  <option value="cashier">Cashier</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => saveMutation.mutate(editUser && !form.password ? { name: form.name, email: form.email, role: form.role } : form)}
                  disabled={saveMutation.isPending || !form.name || !form.email || (!editUser && !form.password)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {editUser ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
