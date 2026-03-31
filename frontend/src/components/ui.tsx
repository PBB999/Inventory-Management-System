import { ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers';

// ── Modal ──────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn('card w-full bg-slate-900 border-slate-700 animate-slide-in max-h-[90vh] overflow-y-auto', maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Form Field ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-slate-700 mb-3">{icon}</div>
      <p className="text-slate-400 font-medium">{title}</p>
      {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Loading Spinner ────────────────────────────────────────────────────────

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={size} className="animate-spin text-brand-400" />
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyState?: ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, keyField, loading, emptyState,
}: DataTableProps<T>) {
  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-slate-400 font-medium',
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <Loader2 className="animate-spin text-brand-400 mx-auto" size={24} />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <p className="text-center py-16 text-slate-500">No records found</p>
                )}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={String(row[keyField])} className="table-row">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3',
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : '',
                      col.className
                    )}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-slate-400">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-secondary py-1.5 px-3 disabled:opacity-40 text-sm"
        >
          ← Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn-secondary py-1.5 px-3 disabled:opacity-40 text-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm',
  onConfirm, onCancel, danger, loading,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <p className="text-slate-300 text-sm mb-6">{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn('flex-1 flex items-center justify-center gap-2', danger ? 'btn-danger' : 'btn-primary')}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
