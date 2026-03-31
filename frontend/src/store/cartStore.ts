import { create } from 'zustand';

export interface CartItem {
  productId: string;
  variantSku: string;
  productName: string;
  variantAttributes: Record<string, string>;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  image?: string; // product image URL for cart display
}

interface CartState {
  items: CartItem[];
  customerPhone: string;
  customerName: string;
  notes: string;
  addItem: (item: Omit<CartItem, 'quantity' | 'discountAmount'>) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, qty: number) => void;
  setDiscount: (sku: string, amount: number) => void;
  setCustomer: (phone: string, name: string) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  totals: () => { subtotal: number; discountTotal: number; taxTotal: number; grandTotal: number };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerPhone: '',
  customerName: '',
  notes: '',

  addItem: (item) => set((state) => {
    const existing = state.items.find((i) => i.variantSku === item.variantSku);
    if (existing) {
      return {
        items: state.items.map((i) =>
          i.variantSku === item.variantSku ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    }
    return { items: [...state.items, { ...item, quantity: 1, discountAmount: 0 }] };
  }),

  removeItem: (sku) => set((state) => ({ items: state.items.filter((i) => i.variantSku !== sku) })),

  updateQuantity: (sku, qty) => set((state) => ({
    items: qty <= 0
      ? state.items.filter((i) => i.variantSku !== sku)
      : state.items.map((i) => (i.variantSku === sku ? { ...i, quantity: qty } : i)),
  })),

  setDiscount: (sku, amount) => set((state) => ({
    items: state.items.map((i) => (i.variantSku === sku ? { ...i, discountAmount: amount } : i)),
  })),

  setCustomer: (phone, name) => set({ customerPhone: phone, customerName: name }),
  setNotes: (notes) => set({ notes }),
  clearCart: () => set({ items: [], customerPhone: '', customerName: '', notes: '' }),

  totals: () => {
    const { items } = get();
    let subtotal = 0, discountTotal = 0, taxTotal = 0;
    items.forEach((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      const lineDiscount = item.discountAmount * item.quantity;
      const lineTax = (lineSubtotal - lineDiscount) * (item.taxRate / 100);
      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    });
    return { subtotal, discountTotal, taxTotal, grandTotal: subtotal - discountTotal + taxTotal };
  },
}));
