import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── Products ───────────────────────────────────────────────────────────────

export const useProducts = (params?: { search?: string; category?: string; page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.search)   query.set('search',   params.search);
  if (params?.category) query.set('category', params.category);
  if (params?.page)     query.set('page',     String(params.page));
  if (params?.limit)    query.set('limit',    String(params.limit || 20));

  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get(`/products?${query}`).then(r => r.data),
    staleTime: 60_000,
  });
};

export const useProductByBarcode = (barcode: string | null) =>
  useQuery({
    queryKey: ['product-barcode', barcode],
    queryFn: () => api.get(`/products/barcode/${barcode}`).then(r => r.data.data),
    enabled: !!barcode,
    staleTime: 30_000,
  });

// ── Orders ─────────────────────────────────────────────────────────────────

export const useOrders = (params?: {
  storeId?: string; status?: string; channel?: string;
  startDate?: string; endDate?: string; page?: number;
}) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v) query.set(k, String(v)); });

  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.get(`/orders?${query}`).then(r => r.data),
  });
};

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => api.post('/orders', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err.response?.data?.error?.message || 'Order failed');
    },
  });
};

// ── Inventory ──────────────────────────────────────────────────────────────

export const useInventory = (params?: { storeId?: string; lowStock?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.storeId)  query.set('storeId',  params.storeId);
  if (params?.lowStock) query.set('lowStock', 'true');

  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => api.get(`/inventory?${query}`).then(r => r.data.data),
    refetchInterval: 30_000, // auto-refresh inventory every 30s
  });
};

export const useLowStockAlerts = () =>
  useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/inventory/low-stock').then(r => r.data.data),
    refetchInterval: 60_000,
  });

export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => api.post('/inventory/adjust', payload),
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
    },
    onError: () => toast.error('Stock adjustment failed'),
  });
};

export const useTransferStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => api.post('/inventory/transfer', payload),
    onSuccess: () => {
      toast.success('Transfer completed');
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err.response?.data?.error?.message || 'Transfer failed');
    },
  });
};

// ── Customers ──────────────────────────────────────────────────────────────

export const useCustomers = (search?: string) =>
  useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get(`/customers?${search ? `search=${search}` : ''}`).then(r => r.data.data),
    staleTime: 120_000,
  });

export const useCustomerByPhone = (phone: string | null) =>
  useQuery({
    queryKey: ['customer-phone', phone],
    queryFn: () => api.get(`/customers/phone/${phone}`).then(r => r.data.data),
    enabled: !!phone && phone.length >= 10,
    retry: false,
  });

// ── Reports ────────────────────────────────────────────────────────────────

export const useDashboardKPIs = (storeId?: string) =>
  useQuery({
    queryKey: ['kpis', storeId],
    queryFn: () => api.get(`/reports/kpis${storeId ? `?storeId=${storeId}` : ''}`).then(r => r.data.data),
    refetchInterval: 30_000,
  });

export const useSalesReport = (params: {
  groupBy?: string; startDate?: string; endDate?: string; storeId?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
  return useQuery({
    queryKey: ['sales-report', params],
    queryFn: () => api.get(`/reports/sales?${query}`).then(r => r.data.data),
  });
};

// ── Stores ─────────────────────────────────────────────────────────────────

export const useStores = () =>
  useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then(r => r.data.data),
    staleTime: 300_000, // stores rarely change
  });
