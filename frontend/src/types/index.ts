// ── Core Entities ───────────────────────────────────────────────────────────

export interface Store {
  _id: string;
  name: string;
  code: string;
  type: 'physical' | 'warehouse' | 'online';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };
  contact: { phone: string; email: string };
  taxRate: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductVariant {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  compareAtPrice?: number;
  barcode?: string;
  weight?: number;
  images: string[];
}

export interface PricingRule {
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minQuantity?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  brand?: string;
  basePrice: number;
  taxCategory: 'exempt' | 'standard' | 'reduced';
  taxRate: number;
  variants: ProductVariant[];
  pricingRules: PricingRule[];
  images: string[];
  tags: string[];
  isActive: boolean;
  trackInventory: boolean;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  type: 'sale' | 'restock' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'return';
  quantity: number;
  reference?: string;
  note?: string;
  performedBy: string;
  timestamp: string;
}

export interface InventoryItem {
  _id: string;
  productId: Product | string;
  variantSku: string;
  storeId: Store | string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderPoint: number;
  reorderQuantity: number;
  transactions: InventoryTransaction[];
  lastCountDate?: string;
}

export interface OrderItem {
  productId: string;
  variantSku: string;
  productName: string;
  variantAttributes: Record<string, string>;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
}

export interface Payment {
  method: 'cash' | 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'store_credit';
  amount: number;
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedAt?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  channel: 'pos' | 'online' | 'phone';
  status: 'pending' | 'confirmed' | 'processing' | 'fulfilled' | 'cancelled' | 'refunded';
  storeId: Store | string;
  fulfillmentStoreId?: Store | string;
  cashierId?: { _id: string; name: string; email: string } | string;
  customerId?: Customer | string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  payments: Payment[];
  amountPaid: number;
  changeGiven: number;
  notes?: string;
  isOffline: boolean;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
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
  tags: string[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'cashier' | 'inventory_manager' | 'admin';
  storeId?: Store | string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// ── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ── Dashboard / Report Types ────────────────────────────────────────────────

export interface DashboardKPIs {
  todayRevenue: number;
  todayOrders: number;
  avgOrderValue: number;
  revenueChange: number;
  ordersChange: number;
  lowStockAlerts: number;
}

export interface SalesSummaryItem {
  _id: string;            // date string e.g. "2024-01-15"
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  avgOrderValue: number;
}

export interface TopProduct {
  _id: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface PaymentBreakdown {
  _id: string;           // payment method
  totalAmount: number;
  count: number;
}
