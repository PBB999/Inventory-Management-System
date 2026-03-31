import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLowStockAlerts } from '../hooks/useApi';

export function LowStockBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: alerts } = useLowStockAlerts();

  if (!alerts?.length || dismissed) return null;

  const critical = alerts.filter((a: { quantityOnHand: number }) => a.quantityOnHand === 0);
  const low = alerts.filter((a: { quantityOnHand: number }) => a.quantityOnHand > 0);

  return (
    <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-300">
            {critical.length > 0 && `${critical.length} item${critical.length > 1 ? 's' : ''} out of stock · `}
            {low.length} low stock alert{low.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {alerts.slice(0, 3).map((a: { variantSku: string }) => a.variantSku).join(', ')}
            {alerts.length > 3 && ` +${alerts.length - 3} more`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to="/inventory"
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
        >
          View <ArrowRight size={11} />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
