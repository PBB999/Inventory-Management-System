import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/helpers';

const COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const [groupBy, setGroupBy] = useState('day');
  const [period, setPeriod] = useState('30');

  const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales', groupBy, period],
    queryFn: () => api.get(`/reports/sales?groupBy=${groupBy}&startDate=${startDate}`).then(r => r.data.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products-report', period],
    queryFn: () => api.get(`/reports/top-products?limit=10&startDate=${startDate}`).then(r => r.data.data),
  });

  const { data: paymentData } = useQuery({
    queryKey: ['payments-report', period],
    queryFn: () => api.get(`/reports/payments?startDate=${startDate}`).then(r => r.data.data),
  });

  const totalRevenue = (salesData || []).reduce((s: number, d: { totalRevenue: number }) => s + d.totalRevenue, 0);
  const totalOrders = (salesData || []).reduce((s: number, d: { totalOrders: number }) => s + d.totalOrders, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Reports</h1>
          <p className="text-slate-400 text-sm mt-0.5">Sales analytics & insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input text-sm">
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <p className="text-slate-400 text-sm">Total Revenue</p>
          <p className="text-3xl font-semibold text-white mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="stat-card">
          <p className="text-slate-400 text-sm">Total Orders</p>
          <p className="text-3xl font-semibold text-white mt-1">{formatNumber(totalOrders)}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card">
        <h2 className="font-medium text-white text-sm mb-4">Revenue Over Time</h2>
        {salesLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-400" size={24} /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
              <Line type="monotone" dataKey="totalRevenue" stroke="#6366f1" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="card">
          <h2 className="font-medium text-white text-sm mb-4">Top Products by Revenue</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={(topProducts || []).slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="productName" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="totalRevenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment methods pie */}
        <div className="card">
          <h2 className="font-medium text-white text-sm mb-4">Payment Method Mix</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentData || []} dataKey="totalAmount" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {(paymentData || []).map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {(paymentData || []).map((item: { _id: string; totalAmount: number }, i: number) => (
              <div key={item._id} className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-slate-400 capitalize">{item._id.replace('_', ' ')}</span>
                <span className="text-white font-medium">{formatCurrency(item.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders volume */}
      <div className="card">
        <h2 className="font-medium text-white text-sm mb-4">Order Volume</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={salesData || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => [v, 'Orders']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="totalOrders" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
