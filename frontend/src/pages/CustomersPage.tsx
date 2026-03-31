import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Star, ShoppingBag, ChevronRight, Plus, X, Loader2, Phone, Mail, MapPin, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';
import { LoadingSpinner, EmptyState, Pagination } from '../components/ui';

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  loyaltyPoints: number;
  totalPurchases: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_FORM = {
  name: '',
  phone: '',
  email: '',
  'address.street': '',
  'address.city': '',
  'address.state': '',
  'address.postalCode': '',
  notes: '',
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () =>
      api.get(`/customers?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`).then(r => r.data),
  });

  const customers: Customer[] = data?.data || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) =>
      editCustomer
        ? api.put(`/customers/${editCustomer._id}`, payload)
        : api.post('/customers', payload),
    onSuccess: () => {
      toast.success(editCustomer ? 'Customer updated' : 'Customer added');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowModal(false);
      setEditCustomer(null);
      setForm(DEFAULT_FORM);
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err.response?.data?.error?.message || 'Save failed');
    },
  });

  const openNew = () => {
    setEditCustomer(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      'address.street': c.address?.street || '',
      'address.city': c.address?.city || '',
      'address.state': c.address?.state || '',
      'address.postalCode': c.address?.postalCode || '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }
    if (form.phone.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }

    saveMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: {
        street: form['address.street'] || undefined,
        city: form['address.city'] || undefined,
        state: form['address.state'] || undefined,
        postalCode: form['address.postalCode'] || undefined,
      },
    });
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const getTier = (spent: number) => {
    if (spent >= 50000) return { label: 'Platinum', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' };
    if (spent >= 20000) return { label: 'Gold',     color: 'text-amber-400',  bg: 'bg-amber-500/10  border-amber-500/20'  };
    if (spent >= 5000)  return { label: 'Silver',   color: 'text-slate-300',  bg: 'bg-slate-500/10  border-slate-500/20'  };
    return                     { label: 'Bronze',   color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Customers</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pagination.total} registered customers</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: formatNumber(pagination.total),      icon: Users,       color: 'bg-brand-600'   },
          { label: 'Avg Spend',       value: formatCurrency(customers.reduce((s, c) => s + c.totalSpent, 0) / Math.max(customers.length, 1)), icon: ShoppingBag, color: 'bg-emerald-600' },
          { label: 'Loyalty Points',  value: formatNumber(customers.reduce((s, c) => s + c.loyaltyPoints, 0)), icon: Star, color: 'bg-amber-600'   },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-xl font-semibold text-white">{value}</p>
            <p className="text-slate-400 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input w-full max-w-sm pl-9"
          placeholder="Search by name or phone…"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Customer</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Phone</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Tier</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Orders</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Total Spent</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Points</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8}><LoadingSpinner /></td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState
                  icon={<Users size={36} />}
                  title="No customers yet"
                  description="Add a customer manually or enter a phone number at POS checkout."
                  action={
                    <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm mx-auto">
                      <Plus size={14} /> Add First Customer
                    </button>
                  }
                />
              </td></tr>
            ) : customers.map(c => {
              const tier = getTier(c.totalSpent);
              return (
                <tr key={c._id} className="table-row">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-200">{c.name}</p>
                      {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge border ${tier.bg} ${tier.color}`}>{tier.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300">{c.totalPurchases}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{formatCurrency(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-amber-400 text-xs">
                      <Star size={10} fill="currentColor" />
                      {formatNumber(c.loyaltyPoints)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-slate-500 hover:text-brand-400 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={pagination.pages}
        total={pagination.total}
        onPageChange={setPage}
      />

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card w-full max-w-lg bg-slate-900 border-slate-700 animate-slide-in max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
                  <User size={16} className="text-brand-400" />
                </div>
                <h3 className="font-semibold text-white">
                  {editCustomer ? 'Edit Customer' : 'New Customer'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic info */}
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
                  Basic Info
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Full Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        className="input w-full pl-8 text-sm"
                        placeholder="e.g. Priya Sharma"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Phone Number <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={form.phone}
                        onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="input w-full pl-8 text-sm font-mono"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                      />
                    </div>
                    {form.phone && form.phone.length < 10 && (
                      <p className="text-xs text-amber-400 mt-1">{10 - form.phone.length} more digits needed</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Email <span className="text-slate-600 font-normal">(optional)</span></label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        className="input w-full pl-8 text-sm"
                        placeholder="customer@email.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin size={11} /> Address <span className="text-slate-600 font-normal normal-case">(optional)</span>
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Street</label>
                    <input
                      value={form['address.street']}
                      onChange={e => set('address.street', e.target.value)}
                      className="input w-full text-sm"
                      placeholder="123 MG Road"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">City</label>
                      <input
                        value={form['address.city']}
                        onChange={e => set('address.city', e.target.value)}
                        className="input w-full text-sm"
                        placeholder="Mumbai"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">State</label>
                      <input
                        value={form['address.state']}
                        onChange={e => set('address.state', e.target.value)}
                        className="input w-full text-sm"
                        placeholder="Maharashtra"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Postal Code</label>
                    <input
                      value={form['address.postalCode']}
                      onChange={e => set('address.postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input w-full text-sm font-mono"
                      placeholder="400001"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !form.name || form.phone.length < 10}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saveMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Plus size={14} />}
                  {editCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
