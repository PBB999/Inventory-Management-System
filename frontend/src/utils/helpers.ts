export const formatCurrency = (amount: number, currency = 'INR'): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export const formatDate = (date: string | Date, style: 'short' | 'long' | 'time' = 'short'): string => {
  const d = new Date(date);
  if (style === 'time') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (style === 'long') return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('en-IN').format(n);

export const getInitials = (name: string): string =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export const cn = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');
