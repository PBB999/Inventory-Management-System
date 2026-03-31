import { useState, useEffect } from 'react';
import { User, Search, X, Star } from 'lucide-react';
import { useCustomerByPhone } from '../hooks/useApi';
import { useCartStore } from '../store/cartStore';
import { formatNumber } from '../utils/helpers';

export function CustomerLookup() {
  const [phone, setPhone] = useState('');
  const [debouncedPhone, setDebouncedPhone] = useState('');
  const cart = useCartStore();

  // Debounce phone input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPhone(phone), 600);
    return () => clearTimeout(t);
  }, [phone]);

  const { data: customer, isLoading, isError } = useCustomerByPhone(
    debouncedPhone.length >= 10 ? debouncedPhone : null
  );

  const handleSelect = () => {
    if (customer) {
      cart.setCustomer(customer.phone, customer.name);
    }
  };

  const handleClear = () => {
    setPhone('');
    setDebouncedPhone('');
    cart.setCustomer('', '');
  };

  const isAttached = !!cart.customerPhone;

  return (
    <div className="px-4 py-2.5 border-b border-slate-800">
      {isAttached ? (
        <div className="flex items-center justify-between gap-2 bg-brand-600/10 border border-brand-500/20 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <User size={13} className="text-brand-400" />
            <div>
              <p className="text-sm font-medium text-brand-300">{cart.customerName}</p>
              <p className="text-xs text-slate-400">{cart.customerPhone}</p>
            </div>
          </div>
          <button onClick={handleClear} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-slate-500" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="input w-full pl-8 py-1.5 text-xs"
              placeholder="Customer phone number"
              maxLength={10}
            />
            {phone && (
              <button onClick={handleClear} className="absolute right-2.5 text-slate-500 hover:text-slate-300">
                <X size={12} />
              </button>
            )}
          </div>

          {isLoading && debouncedPhone.length >= 10 && (
            <p className="text-xs text-slate-500 px-1 animate-pulse">Looking up customer…</p>
          )}

          {customer && !isLoading && (
            <button
              onClick={handleSelect}
              className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600/20 flex items-center justify-center">
                  <User size={11} className="text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-slate-200">{customer.name}</p>
                  <p className="text-xs text-slate-500">{customer.totalPurchases} orders · ₹{formatNumber(customer.totalSpent)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <Star size={10} fill="currentColor" />
                <span className="text-xs">{customer.loyaltyPoints} pts</span>
              </div>
            </button>
          )}

          {isError && debouncedPhone.length >= 10 && (
            <p className="text-xs text-slate-500 px-1">No customer found — will create on checkout</p>
          )}
        </div>
      )}
    </div>
  );
}
