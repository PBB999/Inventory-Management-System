import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Eye, Loader2, ChevronLeft, ChevronRight, X, RotateCcw, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';

interface OrderItem { productName: string; variantSku: string; quantity: number; unitPrice: number; totalPrice: number; }
interface Payment  { method: string; amount: number; status: string; }
interface Order {
  _id: string; orderNumber: string; status: string; channel: string;
  grandTotal: number; subtotal: number; taxTotal: number; discountTotal: number;
  items: OrderItem[]; payments: Payment[];
  cashierId?: { name: string }; storeId?: { name: string };
  customerName?: string; customerPhone?: string; notes?: string;
  createdAt: string;
}

const STATUS_CLASSES: Record<string, string> = {
  confirmed: 'badge-green', pending: 'badge-yellow', fulfilled: 'badge-blue',
  cancelled: 'badge-red',   refunded: 'badge-red',   processing: 'badge-yellow',
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<Order | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, status, channel],
    queryFn: () => api.get(`/orders?page=${page}&limit=20${status ? `&status=${status}` : ''}${channel ? `&channel=${channel}` : ''}`).then(r => r.data),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/orders/${id}/refund`),
    onSuccess: () => {
      toast.success('Order refunded');
      qc.invalidateQueries({ queryKey: ['orders'] });
      setConfirmRefund(null);
      setViewOrder(null);
    },
    onError: () => toast.error('Refund failed'),
  });

  const orders: Order[] = data?.data || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Orders</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pagination.total} total orders</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input text-sm">
          <option value="">All Statuses</option>
          {['pending','confirmed','processing','fulfilled','cancelled','refunded'].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select value={channel} onChange={e => { setChannel(e.target.value); setPage(1); }} className="input text-sm">
          <option value="">All Channels</option>
          <option value="pos">POS</option>
          <option value="online">Online</option>
          <option value="phone">Phone</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              {['Order #','Date','Customer','Channel','Items','Total','Status',''].map(h => (
                <th key={h} className={`px-4 py-3 text-slate-400 font-medium ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-16"><Loader2 className="animate-spin text-brand-400 mx-auto" size={24} /></td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-500">
                <ClipboardList size={32} className="mx-auto mb-2 text-slate-700" />No orders yet
              </td></tr>
            ) : orders.map(order => (
              <tr key={order._id} className="table-row">
                <td className="px-4 py-3 font-mono text-xs text-brand-400">{order.orderNumber}</td>
                <td className="px-4 py-3 text-slate-300">
                  <div>{formatDate(order.createdAt)}</div>
                  <div className="text-xs text-slate-500">{formatDate(order.createdAt, 'time')}</div>
                </td>
                <td className="px-4 py-3 text-slate-300">{order.customerName || 'Walk-in'}</td>
                <td className="px-4 py-3"><span className="badge badge-blue capitalize">{order.channel}</span></td>
                <td className="px-4 py-3 text-center text-slate-300">{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">{formatCurrency(order.grandTotal)}</td>
                <td className="px-4 py-3"><span className={`${STATUS_CLASSES[order.status] || 'badge-blue'} capitalize`}>{order.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewOrder(order)} className="text-slate-500 hover:text-brand-400 transition-colors" title="View">
                      <Eye size={14} />
                    </button>
                    {['confirmed','fulfilled'].includes(order.status) && (
                      <button onClick={() => setConfirmRefund(order)} className="text-slate-500 hover:text-red-400 transition-colors" title="Refund">
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">Page {page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
              <ChevronLeft size={14} /> Prev
            </button>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page===pagination.pages} className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewOrder(null)}>
          <div className="card w-full max-w-lg bg-slate-900 border-slate-700 animate-slide-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">{viewOrder.orderNumber}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(viewOrder.createdAt, 'long')} · {formatDate(viewOrder.createdAt, 'time')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${STATUS_CLASSES[viewOrder.status] || 'badge-blue'} capitalize`}>{viewOrder.status}</span>
                <button onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-slate-200"><X size={16} /></button>
              </div>
            </div>

            {/* Customer info */}
            {(viewOrder.customerName || viewOrder.customerPhone) && (
              <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-500 mb-1">Customer</p>
                <p className="text-sm text-white">{viewOrder.customerName || 'Walk-in'}</p>
                {viewOrder.customerPhone && <p className="text-xs text-slate-400 font-mono">{viewOrder.customerPhone}</p>}
              </div>
            )}

            {/* Items */}
            <div className="mb-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Items</p>
              <div className="space-y-2">
                {viewOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Package size={12} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-200">{item.productName}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.variantSku} × {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-white">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(viewOrder.subtotal)}</span></div>
              {viewOrder.discountTotal > 0 && <div className="flex justify-between text-emerald-400"><span>Discount</span><span>-{formatCurrency(viewOrder.discountTotal)}</span></div>}
              <div className="flex justify-between text-slate-400"><span>Tax</span><span>{formatCurrency(viewOrder.taxTotal)}</span></div>
              <div className="flex justify-between font-semibold text-white text-base border-t border-slate-700 pt-2"><span>Total</span><span>{formatCurrency(viewOrder.grandTotal)}</span></div>
            </div>

            {/* Payments */}
            <div className="mb-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Payment</p>
              {viewOrder.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-300 capitalize">{p.method.replace('_',' ')}</span>
                  <span className="text-white font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>

            {['confirmed','fulfilled'].includes(viewOrder.status) && (
              <button onClick={() => setConfirmRefund(viewOrder)} className="btn-danger w-full flex items-center justify-center gap-2 text-sm">
                <RotateCcw size={14} /> Issue Refund
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm Refund Modal */}
      {confirmRefund && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmRefund(null)}>
          <div className="card w-full max-w-sm bg-slate-900 border-slate-700 animate-slide-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-2">Confirm Refund</h3>
            <p className="text-slate-400 text-sm mb-1">Order <span className="font-mono text-brand-400">{confirmRefund.orderNumber}</span></p>
            <p className="text-slate-400 text-sm mb-5">Refund <span className="text-white font-semibold">{formatCurrency(confirmRefund.grandTotal)}</span>? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRefund(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => refundMutation.mutate(confirmRefund._id)} disabled={refundMutation.isPending} className="btn-danger flex-1 flex items-center justify-center gap-2">
                {refundMutation.isPending && <Loader2 size={14} className="animate-spin" />} Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
