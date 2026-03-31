import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Store, Loader2, X, MapPin, Phone, Mail, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface StoreType {
  _id: string; name: string; code: string; type: string;
  address: { city: string; state: string; street?: string; postalCode?: string };
  contact: { phone: string; email: string };
  taxRate: number; isActive: boolean;
}

const DEFAULT_FORM = {
  name: '', code: '', type: 'physical',
  'address.street': '', 'address.city': '', 'address.state': '', 'address.postalCode': '',
  'contact.phone': '', 'contact.email': '', taxRate: '18',
};

export default function StoresPage() {
  const [showModal, setShowModal] = useState(false);
  const [editStore, setEditStore] = useState<StoreType | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) =>
      editStore ? api.put(`/stores/${editStore._id}`, payload) : api.post('/stores', payload),
    onSuccess: () => {
      toast.success(editStore ? 'Store updated' : 'Store created');
      qc.invalidateQueries({ queryKey: ['stores'] });
      setShowModal(false); setEditStore(null); setForm(DEFAULT_FORM);
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) =>
      toast.error(err.response?.data?.error?.message || 'Save failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/stores/${id}`, { isActive }),
    onSuccess: () => { toast.success('Store updated'); qc.invalidateQueries({ queryKey: ['stores'] }); },
  });

  const openNew = () => { setEditStore(null); setForm(DEFAULT_FORM); setShowModal(true); };
  const openEdit = (s: StoreType) => {
    setEditStore(s);
    setForm({
      name: s.name, code: s.code, type: s.type, taxRate: String(s.taxRate),
      'address.street': s.address?.street || '', 'address.city': s.address?.city || '',
      'address.state': s.address?.state || '', 'address.postalCode': s.address?.postalCode || '',
      'contact.phone': s.contact?.phone || '', 'contact.email': s.contact?.email || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: form.name, code: form.code, type: form.type, taxRate: parseFloat(form.taxRate),
      address: { street: form['address.street'], city: form['address.city'], state: form['address.state'], postalCode: form['address.postalCode'], country: 'IN' },
      contact: { phone: form['contact.phone'], email: form['contact.email'] },
    });
  };

  const TYPE_COLORS: Record<string, string> = { physical: 'badge-green', warehouse: 'badge-blue', online: 'badge-yellow' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Stores</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage physical locations and warehouses</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Store
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-400" size={24} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data || []).map((store: StoreType) => (
            <div key={store._id} className="card hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
                  <Store size={18} className="text-brand-400" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className={TYPE_COLORS[store.type] || 'badge-blue'}>{store.type}</span>
                  <button onClick={() => openEdit(store)} className="text-slate-500 hover:text-brand-400 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => toggleMutation.mutate({ id: store._id, isActive: !store.isActive })}
                    className={`transition-colors ${store.isActive ? 'text-emerald-400 hover:text-red-400' : 'text-slate-500 hover:text-emerald-400'}`}
                    title={store.isActive ? 'Deactivate' : 'Activate'}>
                    {store.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white">{store.name}</h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">{store.code}</p>
              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-1.5"><MapPin size={10} />{store.address?.city}, {store.address?.state}</div>
                {store.contact?.phone && <div className="flex items-center gap-1.5"><Phone size={10} />{store.contact.phone}</div>}
                {store.contact?.email && <div className="flex items-center gap-1.5"><Mail size={10} />{store.contact.email}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs">
                <span className="text-slate-500">GST Rate</span>
                <span className="text-slate-300 font-medium">{store.taxRate}%</span>
              </div>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <div className="col-span-full text-center py-16 text-slate-500">
              <Store size={32} className="mx-auto mb-2 text-slate-700" />No stores yet
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-lg bg-slate-900 border-slate-700 animate-slide-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{editStore ? 'Edit Store' : 'New Store'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Store Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input w-full text-sm" placeholder="Main Street Store" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Store Code</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="input w-full text-sm font-mono" placeholder="MSS-01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input w-full text-sm">
                    <option value="physical">Physical</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">GST Rate (%)</label>
                  <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} className="input w-full text-sm" />
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider pt-1">Address</p>
              {[
                { label: 'Street', key: 'address.street', placeholder: '123 MG Road' },
                { label: 'City', key: 'address.city', placeholder: 'Mumbai' },
                { label: 'State', key: 'address.state', placeholder: 'Maharashtra' },
                { label: 'Postal Code', key: 'address.postalCode', placeholder: '400001' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="input w-full text-sm" placeholder={placeholder} />
                </div>
              ))}
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider pt-1">Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Phone</label>
                  <input value={form['contact.phone']} onChange={e => setForm(f => ({ ...f, 'contact.phone': e.target.value }))} className="input w-full text-sm" placeholder="+91 9999999999" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
                  <input type="email" value={form['contact.email']} onChange={e => setForm(f => ({ ...f, 'contact.email': e.target.value }))} className="input w-full text-sm" placeholder="store@company.com" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saveMutation.isPending || !form.name || !form.code} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {editStore ? 'Save Changes' : 'Create Store'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
