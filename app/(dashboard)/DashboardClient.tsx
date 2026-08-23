'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import {
  DollarSign, ShoppingBag, Users, Package, TrendingUp, TrendingDown,
  AlertTriangle, ArrowRight, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';

interface DashboardData {
  today: { sales: number; orders: number };
  period: { sales: number; orders: number };
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: any[];
  recentSales: any[];
  topProducts: any[];
  chartData: any[];
  exchangeRate: number;
  storeName: string;
}

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [period, setPeriod] = useState('today');
  const { t, language } = useLanguage();
  
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect superadmin
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'superadmin') {
      router.push('/branches');
    }
  }, [status, session, router]);

  const shouldFetch = status === 'authenticated' && (session?.user as any)?.role !== 'superadmin';
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    shouldFetch ? `/api/dashboard?period=${period}` : null,
    fetcher,
    { fallbackData: period === 'today' ? initialData : undefined }
  );

  const loading = isLoading && !data;

  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const fmtKhr = (usd: number, rate: number) =>
    `${(usd * rate).toLocaleString('km-KH')} ៛`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('dashboard')}</h1>
          {data && <p>{t('welcome_back').replace('{storeName}', data.storeName || '')}</p>}
        </div>
        <div className="page-header-actions">
          <div style={{ display: 'flex', gap: 4, background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', padding: 4 }}>
            {['today', 'week', 'month', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
              >
                {t(p)}
              </button>
            ))}
          </div>
          <button onClick={() => mutate()} className="btn btn-outline btn-sm">
            <RefreshCw size={14} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonPage />
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card blue">
              <div className="kpi-top">
                <div className="kpi-icon blue"><DollarSign size={22} /></div>
                <div className={`kpi-trend ${data.today.sales > 0 ? 'up' : 'down'}`}>
                  {data.today.sales > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {t('today')}
                </div>
              </div>
              <div className="kpi-value">{fmt(data.today.sales)}</div>
              <div className="kpi-label">{t('today_sales')}</div>
            </div>

            <div className="kpi-card green">
              <div className="kpi-top">
                <div className="kpi-icon green"><ShoppingBag size={22} /></div>
                <div className="kpi-trend up"><TrendingUp size={12} />{t(period)}</div>
              </div>
              <div className="kpi-value">{data.period.orders}</div>
              <div className="kpi-label">{t('today_transactions')} ({t(period)})</div>
            </div>

            <div className="kpi-card orange">
              <div className="kpi-top">
                <div className="kpi-icon orange"><Users size={22} /></div>
                <span className="badge badge-warning" style={{ fontSize: 10 }}>{language === 'kh' ? 'សរុប' : language === 'zh' ? '总计' : 'Total'}</span>
              </div>
              <div className="kpi-value">{data.totalCustomers}</div>
              <div className="kpi-label">{t('active_customers')}</div>
            </div>

            <div className="kpi-card purple">
              <div className="kpi-top">
                <div className="kpi-icon purple"><Package size={22} /></div>
                {data.lowStockProducts.length > 0 && (
                  <span className="badge badge-danger">{data.lowStockProducts.length} {language === 'kh' ? 'ជិតអស់' : language === 'zh' ? '预警' : 'low'}</span>
                )}
              </div>
              <div className="kpi-value">{data.totalProducts}</div>
              <div className="kpi-label">{t('active_products')}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="dashboard-charts-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
            {/* Sales Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{t('sales_trend')}</div>
                  <div className="card-subtitle">{t('last_7_days_revenue')}</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: 'none', boxShadow: 'var(--shadow-lg)', fontSize: 12 }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, language === 'kh' ? 'ប្រាក់ចំណូល' : language === 'zh' ? '营业额' : 'Revenue']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorSales)" dot={{ r: 4, fill: '#2563eb' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">{t('top_products')}</div>
                <Link href="/products" className="btn btn-ghost btn-sm">{t('view_all')} <ArrowRight size={14} /></Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {data.topProducts.length === 0 ? (
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <div className="empty-state-icon" style={{ fontSize: 32 }}>📦</div>
                    <p>{language === 'kh' ? 'មិនទាន់មានទិន្នន័យលក់នៅឡើយទេ' : language === 'zh' ? '暂无销售数据' : 'No sales data yet'}</p>
                  </div>
                ) : (
                  data.topProducts.map((p, i) => (
                    <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ width: 24, height: 24, background: i === 0 ? 'var(--warning-50)' : 'var(--gray-100)', color: i === 0 ? 'var(--warning)' : 'var(--gray-500)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {language === 'kh' ? (p.nameKh || p.name) : (p.name || p.nameKh)}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.totalQty} {t('units_sold')}</div>
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--primary)' }}>${p.totalRevenue.toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="dashboard-charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            {/* Recent Sales */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">{t('recent_sales')}</div>
                <Link href="/sales" className="btn btn-ghost btn-sm">{t('view_all')} <ArrowRight size={14} /></Link>
              </div>
              <div className="table-container">
                <div className="table-responsive"><table className="table">
                  <thead>
                    <tr>
                      <th>{t('invoice')}</th>
                      <th>{t('cashier')}</th>
                      <th>{t('total')}</th>
                      <th>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>{language === 'kh' ? 'មិនទាន់មានការលក់នៅឡើយទេ' : language === 'zh' ? '暂无交易记录' : 'No sales yet'}</td></tr>
                    ) : (
                      data.recentSales.map((sale: any) => (
                        <tr key={sale._id}>
                          <td style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--primary)' }}>{sale.invoiceNo}</td>
                          <td>{sale.cashier?.name || '-'}</td>
                          <td style={{ fontWeight: 700 }}>{fmt(sale.totalUsd)}</td>
                          <td><span className="badge badge-success">{t('completed')}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table></div>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  {t('low_stock_alerts')}
                  {data.lowStockProducts.length > 0 && (
                    <span className="badge badge-danger" style={{ marginLeft: 8 }}>{data.lowStockProducts.length}</span>
                  )}
                </div>
                <Link href="/products?lowStock=true" className="btn btn-ghost btn-sm">{t('view_all')} <ArrowRight size={14} /></Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {data.lowStockProducts.length === 0 ? (
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <div className="empty-state-icon" style={{ fontSize: 32 }}>✅</div>
                    <h3 style={{ fontSize: 'var(--font-size-base)' }}>{t('all_stock_ok')}</h3>
                    <p>{t('all_stock_ok_desc')}</p>
                  </div>
                ) : (
                  data.lowStockProducts.map((p: any) => (
                    <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-light)' }}>
                      <AlertTriangle size={16} style={{ color: p.stock === 0 ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                          {language === 'kh' ? (p.nameKh || p.name) : (p.name || p.nameKh)}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.sku}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                          {p.stock === 0 ? t('out_of_stock') : `${p.stock} ${t('left')}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>{language === 'kh' ? 'ការទាញយកទិន្នន័យបានបរាជ័យ' : language === 'zh' ? '数据加载失败' : 'Failed to load data'}</h3>
          <p>{language === 'kh' ? 'សូមពិនិត្យមើលការភ្ជាប់មូលដ្ឋានទិន្នន័យរបស់អ្នក' : language === 'zh' ? '请检查您的数据库连接' : 'Please check your database connection'}</p>
          <button onClick={() => mutate()} className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>{language === 'kh' ? 'ព្យាយាមម្តងទៀត' : language === 'zh' ? '重试' : 'Retry'}</button>
        </div>
      )}
    </div>
  );
}
