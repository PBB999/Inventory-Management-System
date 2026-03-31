import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, ShoppingBag, DollarSign,
  AlertTriangle, BarChart2, Loader2, ArrowRight, Package,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';

const COLORS = ['#6366f1','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];

const StatCard = ({ label, value, change, icon: Icon, color }: {
  label: string; value: string; change?: number; icon: React.ElementType; color: string;
}) => (
  <div className="stat-card">
    <div className="flex items-start justify-between">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={16} className="text-white" />
      </div>
      {change !== undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <div className="mt-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-slate-400 text-sm mt-0.5">{label}</p>
    </div>
  </div>
);

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-600 py-8">
    <BarChart2 size={28} className="mb-2"/>
    <p className="text-sm text-center">{message}</p>
    <p className="text-xs text-slate-700 mt-1">Complete some orders to see data here</p>
  </div>
);

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-slate-400 mb-1 text-xs">{label}</p>
      <p className="text-white font-semibold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export default function DashboardPage() {
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => api.get('/reports/kpis').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: salesData = [] } = useQuery({
    queryKey: ['sales-chart'],
    queryFn: () => api.get('/reports/sales?groupBy=day').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => api.get('/reports/top-products?limit=5').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: paymentBreakdown = [] } = useQuery({
    queryKey: ['payment-breakdown'],
    queryFn: () => api.get('/reports/payments').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recent-orders-dash'],
    queryFn: () => api.get('/orders?limit=5').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: customersTotal = 0 } = useQuery({
    queryKey: ['customers-count'],
    queryFn: () => api.get('/customers?limit=1').then(r => r.data.pagination?.total || 0),
  });

  if (kpiLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-brand-400" size={32}/>
      </div>
    );
  }

  const kpis = kpiData || { todayRevenue: 0, todayOrders: 0, avgOrderValue: 0, revenueChange: 0, ordersChange: 0, lowStockAlerts: 0 };

  const paymentPie = (paymentBreakdown as { _id: string; totalAmount: number }[]).map((item, i) => ({
    name: item._id.replace(/_/g,' '),
    value: item.totalAmount,
    color: COLORS[i % COLORS.length],
  }));

  const STATUS_CLASSES: Record<string,string> = {
    confirmed: 'badge-green', pending: 'badge-yellow', fulfilled: 'badge-blue',
    cancelled: 'badge-red',   refunded: 'badge-red',
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Today's overview</p>
        </div>
        <Link to="/pos" className="btn-primary flex items-center gap-2 text-sm">
          <ShoppingBag size={15}/> Open POS
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue"  value={formatCurrency(kpis.todayRevenue)}  change={kpis.revenueChange} icon={DollarSign}   color="bg-brand-600"  />
        <StatCard label="Orders Today"     value={formatNumber(kpis.todayOrders)}     change={kpis.ordersChange}  icon={ShoppingBag}  color="bg-emerald-600"/>
        <StatCard label="Avg Order Value"  value={formatCurrency(kpis.avgOrderValue)}                             icon={BarChart2}     color="bg-violet-600" />
        <StatCard label="Low Stock Alerts" value={String(kpis.lowStockAlerts)}                                    icon={AlertTriangle} color="bg-amber-600"  />
      </div>

      {/* Revenue Trend — full width */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-white text-sm">Revenue Trend</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Last 30 days</span>
            <Link to="/reports" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Full report <ArrowRight size={11}/>
            </Link>
          </div>
        </div>
        <div style={{ height: 220 }}>
          {salesData.length === 0 ? (
            <EmptyChart message="No revenue data yet" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="_id" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="totalRevenue" stroke="#6366f1" strokeWidth={2.5}
                  dot={false} activeDot={{ r:4, fill:'#6366f1', stroke:'#fff', strokeWidth:2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Payment Methods + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Payment Methods Pie */}
        <div className="card">
          <h2 className="font-medium text-white text-sm mb-4">Payment Methods</h2>
          <div style={{ height: 200 }}>
            {paymentPie.length === 0 ? (
              <EmptyChart message="No payment data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentPie} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={75} innerRadius={35}
                    paddingAngle={3}>
                    {paymentPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), '']}
                    contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', fontSize:'12px' }}
                    labelStyle={{ display:'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {paymentPie.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
              {paymentPie.map(item => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }}/>
                  <span className="text-slate-400 capitalize">{item.name}</span>
                  <span className="text-white font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products Bar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-white text-sm">Top Products</h2>
            <Link to="/reports" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={11}/>
            </Link>
          </div>
          <div style={{ height: 200 }}>
            {topProducts.length === 0 ? (
              <EmptyChart message="No product sales yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(topProducts as { productName: string; totalRevenue: number }[]).slice(0,5)}
                  layout="vertical"
                  margin={{ top:0, right:10, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="productName" tick={{ fill:'#94a3b8', fontSize:10 }}
                    axisLine={false} tickLine={false} width={100}
                    tickFormatter={(v: string) => v.length > 14 ? v.slice(0,12)+'…' : v} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="totalRevenue" fill="#6366f1" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Orders */}
        <div className="card lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="font-medium text-white text-sm">Recent Orders</h2>
            <Link to="/orders" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={11}/>
            </Link>
          </div>
          {(recentOrders as { _id: string }[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-600">
              <ShoppingBag size={28} className="mb-2"/>
              <p className="text-sm">No orders yet</p>
              <Link to="/pos" className="mt-3 text-xs text-brand-400 hover:text-brand-300">
                Create your first order →
              </Link>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Order #</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Customer</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Time</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Amount</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders as {
                  _id: string; orderNumber: string; customerName?: string;
                  grandTotal: number; status: string; createdAt: string;
                }[]).map(order => (
                  <tr key={order._id} className="border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-brand-400">{order.orderNumber}</td>
                    <td className="px-4 py-2.5 text-slate-300">{order.customerName || 'Walk-in'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(order.createdAt, 'time')}</td>
                    <td className="px-4 py-2.5 text-right text-white font-semibold">{formatCurrency(order.grandTotal)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`${STATUS_CLASSES[order.status] || 'badge-blue'} capitalize`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card flex flex-col gap-2">
          <h2 className="font-medium text-white text-sm mb-2">Quick Actions</h2>
          {[
            { to:'/pos',       label:'New Sale',    desc:'Start a transaction',        color:'text-brand-400'   },
            { to:'/inventory', label:'Inventory',   desc:'Check stock levels',         color:'text-emerald-400' },
            { to:'/customers', label:'Customers',   desc:`${customersTotal} registered`, color:'text-violet-400'},
            { to:'/orders',    label:'Orders',      desc:'View recent orders',         color:'text-amber-400'   },
            { to:'/products',  label:'Products',    desc:'Manage catalog',             color:'text-rose-400'    },
            { to:'/reports',   label:'Reports',     desc:'Sales analytics',            color:'text-cyan-400'    },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group">
              <div>
                <p className={`text-sm font-medium ${item.color}`}>{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors"/>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
