import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, AlertTriangle, ArrowLeftRight, Loader2, RefreshCw, Plus, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatNumber } from '../utils/helpers';

interface InventoryItem {
  _id: string;
  variantSku: string;
  quantityOnHand: number;
  quantityAvailable: number;
  reorderPoint: number;
  reorderQuantity: number;
  productId: { _id: string; name: string; category: string };
  storeId: { _id: string; name: string; code: string };
}

const ADJUST_TYPES = ['restock', 'adjustment', 'return', 'sale'];

export default function InventoryPage() {
  const [storeFilter, setStoreFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [adjustModal, setAdjustModal] = useState<InventoryItem | null>(null);
  const [transferModal, setTransferModal] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('restock');
  const [adjustNote, setAdjustNote] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const qc = useQueryClient();

  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['inventory', storeFilter, showLowStock],
    queryFn: () => api.get(`/inventory?${storeFilter ? `storeId=${storeFilter}&` : ''}${showLowStock ? 'lowStock=true' : ''}`).then(r => r.data.data),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then(r => r.data.data),
  });

  const adjustMutation = useMutation({
    mutationFn: (p: unknown) => api.post('/inventory/adjust', p),
    onSuccess: () => { toast.success('Stock adjusted'); qc.invalidateQueries({ queryKey: ['inventory'] }); setAdjustModal(null); setAdjustQty(''); setAdjustNote(''); },
    onError: () => toast.error('Adjustment failed'),
  });

  const transferMutation = useMutation({
    mutationFn: (p: unknown) => api.post('/inventory/transfer', p),
    onSuccess: () => { toast.success('Transfer completed'); qc.invalidateQueries({ queryKey: ['inventory'] }); setTransferModal(null); setTransferQty(''); setTransferTo(''); },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => toast.error(err.response?.data?.error?.message || 'Transfer failed'),
  });

  const handleAdjust = () => {
    if (!adjustModal || !adjustQty) return;
    const qty = ['sale', 'transfer_out'].includes(adjustType) ? -Math.abs(parseInt(adjustQty)) : Math.abs(parseInt(adjustQty));
    adjustMutation.mutate({ productId: adjustModal.productId._id, variantSku: adjustModal.variantSku, storeId: adjustModal.storeId._id, quantity: qty, type: adjustType, note: adjustNote });
  };

  const handleTransfer = () => {
    if (!transferModal || !transferQty || !transferTo) return;
    transferMutation.mutate({ fromStoreId: transferModal.storeId._id, toStoreId: transferTo, variantSku: transferModal.variantSku, productId: transferModal.productId._id, quantity: parseInt(transferQty) });
  };

  const filtered = (inventoryData || []).filter((item: InventoryItem) =>
    !search || item.productId?.name?.toLowerCase().includes(search.toLowerCase()) || item.variantSku.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (item: InventoryItem) => {
    if (item.quantityOnHand === 0) return { label: 'Out of Stock', cls: 'badge-red' };
    if (item.quantityOnHand <= item.reorderPoint) return { label: 'Low Stock', cls: 'badge-yellow' };
    return { label: 'In Stock', cls: 'badge-green' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventory</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time stock across all locations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLowStock(!showLowStock)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${showLowStock ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            <AlertTriangle size={14} /> Low Stock
          </button>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-sm" placeholder="Search product or SKU…" />
        </div>
        <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="input text-sm">
          <option value="">All Stores</option>
          {(storesData || []).map((s: { _id: string; name: string; code: string }) => (
            <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              {['Product','SKU','Store','On Hand','Available','Reorder At','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-16"><Loader2 className="animate-spin text-brand-400 mx-auto" size={24} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-500">
                <Package size={32} className="mx-auto mb-2 text-slate-700" />No inventory records
              </td></tr>
            ) : filtered.map((item: InventoryItem) => {
              const status = getStatus(item);
              return (
                <tr key={item._id} className="table-row">
                  <td className="px-4 py-3 text-slate-200">{item.productId?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.variantSku}</td>
                  <td className="px-4 py-3 text-slate-300">{item.storeId?.name}</td>
                  <td className="px-4 py-3 text-center font-semibold text-white">{formatNumber(item.quantityOnHand)}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{formatNumber(item.quantityAvailable)}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{formatNumber(item.reorderPoint)}</td>
                  <td className="px-4 py-3"><span className={status.cls}>{status.label}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setAdjustModal(item); setAdjustQty(''); setAdjustNote(''); setAdjustType('restock'); }}
                        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                        <Plus size={11} /> Adjust
                      </button>
                      <button onClick={() => { setTransferModal(item); setTransferQty(''); setTransferTo(''); }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                        <ArrowLeftRight size={11} /> Transfer
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAdjustModal(null)}>
          <div className="card w-full max-w-md bg-slate-900 border-slate-700 animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Adjust Stock</h3>
              <button onClick={() => setAdjustModal(null)} className="text-slate-400 hover:text-slate-200"><X size={16} /></button>
            </div>
            <p className="text-slate-400 text-sm mb-4">{adjustModal.productId?.name} · <span className="font-mono">{adjustModal.variantSku}</span> · {adjustModal.storeId?.name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Type</label>
                <select value={adjustType} onChange={e => setAdjustType(e.target.value)} className="input w-full text-sm">
                  {ADJUST_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Quantity</label>
                <input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="input w-full" placeholder="Enter quantity" min="1" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Note (optional)</label>
                <input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} className="input w-full" placeholder="Reason for adjustment" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setAdjustModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdjust} disabled={adjustMutation.isPending || !adjustQty} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {adjustMutation.isPending && <Loader2 size={14} className="animate-spin" />} Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTransferModal(null)}>
          <div className="card w-full max-w-md bg-slate-900 border-slate-700 animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Transfer Stock</h3>
              <button onClick={() => setTransferModal(null)} className="text-slate-400 hover:text-slate-200"><X size={16} /></button>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              From: <span className="text-white">{transferModal.storeId?.name}</span> · {transferModal.variantSku}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">To Store</label>
                <select value={transferTo} onChange={e => setTransferTo(e.target.value)} className="input w-full text-sm">
                  <option value="">Select destination…</option>
                  {(storesData || []).filter((s: { _id: string }) => s._id !== transferModal.storeId._id).map((s: { _id: string; name: string; code: string }) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Quantity (available: {transferModal.quantityOnHand})</label>
                <input type="number" value={transferQty} onChange={e => setTransferQty(e.target.value)} className="input w-full" placeholder="Units to transfer" min="1" max={transferModal.quantityOnHand} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setTransferModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleTransfer} disabled={transferMutation.isPending || !transferQty || !transferTo} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {transferMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  <ArrowLeftRight size={13} /> Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
