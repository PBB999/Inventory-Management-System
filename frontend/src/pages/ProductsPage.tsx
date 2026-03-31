import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Package, Loader2, Search, X, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

interface Product {
  _id: string;
  name: string;
  category: string;
  basePrice: number;
  taxRate: number;
  isActive: boolean;
  images: string[];
  variants: { sku: string; price: number }[];
}

const DEFAULT_FORM = {
  name: '',
  category: '',
  basePrice: '',
  taxRate: '18',
  description: '',
  imageUrl: '',   // ← new field
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [imgError, setImgError] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get(`/products?search=${search}&limit=50`).then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) =>
      editProduct
        ? api.put(`/products/${editProduct._id}`, payload)
        : api.post('/products', {
            ...payload,
            variants: [{
              sku: `SKU-${Date.now()}`,
              price: parseFloat((payload as { basePrice: string }).basePrice),
            }],
          }),
    onSuccess: () => {
      toast.success(editProduct ? 'Product updated' : 'Product created');
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowModal(false);
      setEditProduct(null);
      setForm(DEFAULT_FORM);
      setImgError(false);
    },
    onError: () => toast.error('Save failed'),
  });

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      category: p.category,
      basePrice: String(p.basePrice),
      taxRate: String(p.taxRate),
      description: '',
      imageUrl: p.images?.[0] || '',
    });
    setImgError(false);
    setShowModal(true);
  };

  const openNew = () => {
    setEditProduct(null);
    setForm(DEFAULT_FORM);
    setImgError(false);
    setShowModal(true);
  };

  const handleSave = () => {
    const images = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];
    saveMutation.mutate({
      name: form.name,
      category: form.category,
      basePrice: parseFloat(form.basePrice),
      taxRate: parseFloat(form.taxRate),
      description: form.description,
      images,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Products</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage your product catalog</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-full max-w-sm pl-9"
          placeholder="Search products..."
        />
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-400" size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {(data || []).map((p: Product) => (
            <div key={p._id} className="card p-0 overflow-hidden group hover:border-slate-700 transition-all">
              {/* Image */}
              <div className="aspect-square bg-slate-800 flex items-center justify-center overflow-hidden relative">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <Package size={28} className="text-slate-600" />
                )}
                {/* Edit button overlay */}
                <button
                  onClick={() => openEdit(p)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil size={12} />
                </button>
                {!p.isActive && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <span className="badge-red text-xs">Inactive</span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-semibold text-brand-400">{formatCurrency(p.basePrice)}</p>
                  <span className="text-xs text-slate-500">{p.taxRate}% tax</span>
                </div>
              </div>
            </div>
          ))}

          {(!data || data.length === 0) && (
            <div className="col-span-full text-center py-16 text-slate-500">
              <Package size={32} className="mx-auto mb-2 text-slate-700" />
              No products yet
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card w-full max-w-md bg-slate-900 border-slate-700 animate-slide-in max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">
                {editProduct ? 'Edit Product' : 'New Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Image URL input + preview */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Product Image URL</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={e => { setForm(f => ({ ...f, imageUrl: e.target.value })); setImgError(false); }}
                  className="input w-full text-sm"
                  placeholder="https://example.com/image.jpg"
                />
                {/* Live preview */}
                {form.imageUrl && !imgError ? (
                  <div className="mt-2 rounded-lg overflow-hidden border border-slate-700 aspect-video bg-slate-800 flex items-center justify-center">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : form.imageUrl && imgError ? (
                  <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-center gap-2">
                    <ImageIcon size={14} className="text-red-400" />
                    <p className="text-xs text-red-400">Could not load image — check the URL</p>
                  </div>
                ) : null}
              </div>

              {/* Other fields */}
              {[
                { label: 'Product Name', key: 'name', placeholder: 'e.g. Premium Cotton T-Shirt' },
                { label: 'Category', key: 'category', placeholder: 'e.g. Apparel' },
                { label: 'Base Price (₹)', key: 'basePrice', placeholder: '0.00', type: 'number' },
                { label: 'Tax Rate (%)', key: 'taxRate', placeholder: '18', type: 'number' },
                { label: 'Description', key: 'description', placeholder: 'Optional description' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="input w-full text-sm"
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !form.name || !form.category || !form.basePrice}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
