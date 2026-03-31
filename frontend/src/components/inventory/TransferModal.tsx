import { useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { useStores, useTransferStock } from '../hooks/useApi';
import { Modal, Field } from './ui';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  preselectedSku?: string;
  preselectedProductId?: string;
  preselectedFromStore?: string;
}

export function TransferModal({
  open, onClose, preselectedSku, preselectedProductId, preselectedFromStore,
}: TransferModalProps) {
  const { data: stores = [] } = useStores();
  const transfer = useTransferStock();

  const [form, setForm] = useState({
    fromStoreId: preselectedFromStore || '',
    toStoreId: '',
    variantSku: preselectedSku || '',
    productId: preselectedProductId || '',
    quantity: '',
    note: '',
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    transfer.mutate(
      {
        ...form,
        quantity: parseInt(form.quantity),
      },
      {
        onSuccess: () => {
          onClose();
          setForm({ fromStoreId: '', toStoreId: '', variantSku: '', productId: '', quantity: '', note: '' });
        },
      }
    );
  };

  const canSubmit =
    form.fromStoreId &&
    form.toStoreId &&
    form.fromStoreId !== form.toStoreId &&
    form.variantSku &&
    parseInt(form.quantity) > 0;

  return (
    <Modal open={open} onClose={onClose} title="Inter-Store Transfer">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From Store">
            <select value={form.fromStoreId} onChange={e => set('fromStoreId', e.target.value)} className="input w-full text-sm">
              <option value="">Select store</option>
              {stores.map((s: { _id: string; name: string; code: string }) => (
                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </Field>
          <Field label="To Store">
            <select value={form.toStoreId} onChange={e => set('toStoreId', e.target.value)} className="input w-full text-sm">
              <option value="">Select store</option>
              {stores
                .filter((s: { _id: string }) => s._id !== form.fromStoreId)
                .map((s: { _id: string; name: string; code: string }) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
            </select>
          </Field>
        </div>

        <Field label="Variant SKU">
          <input
            value={form.variantSku}
            onChange={e => set('variantSku', e.target.value.toUpperCase())}
            className="input w-full text-sm font-mono"
            placeholder="e.g. TSH-WHT-M"
          />
        </Field>

        <Field label="Quantity">
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={e => set('quantity', e.target.value)}
            className="input w-full text-sm"
            placeholder="Units to transfer"
          />
        </Field>

        <Field label="Note (optional)">
          <input
            value={form.note}
            onChange={e => set('note', e.target.value)}
            className="input w-full text-sm"
            placeholder="Reason for transfer"
          />
        </Field>

        {form.fromStoreId && form.toStoreId && form.fromStoreId === form.toStoreId && (
          <p className="text-xs text-red-400">Source and destination cannot be the same store.</p>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || transfer.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {transfer.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <ArrowLeftRight size={14} />}
            Transfer Stock
          </button>
        </div>
      </div>
    </Modal>
  );
}
