'use client';

import { useState } from 'react';
import { Search, Eye, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';

interface SaleItem { name: string; nameKh: string; qty: number; priceUsd: number; subtotalUsd: number; }
interface Sale {
  _id: string; invoiceNo: string; items: SaleItem[]; subtotalUsd: number;
  discountUsd: number; taxUsd: number; totalUsd: number; totalKhr: number;
  paymentMethod: string; amountPaidUsd: number; changeUsd: number;
  cashier: { name: string } | null; customer: { name: string; phone: string } | null;
  status: string; createdAt: string; exchangeRate: number;
  settings?: any;
}

const pmColor: Record<string, string> = { cash: 'badge-success', card: 'badge-primary', qr: 'badge-purple' };

export default function SalesPage() {
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const _today = new Date();
  const _lastWeek = new Date(_today);
  _lastWeek.setDate(_today.getDate() - 7);
  
  const defaultEndDate = _today.toISOString().slice(0, 10);
  const defaultStartDate = _lastWeek.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [selected, setSelected] = useState<Sale | null>(null);

  const todayStr = _today.toISOString().slice(0, 10);

  const params = new URLSearchParams({ page: String(page), search, ...(startDate && { startDate }), ...(endDate && { endDate }) });
  const { data, error, isLoading } = useSWR(`/api/sales?${params}`, fetcher);
  const { data: settings } = useSWR('/api/settings', fetcher);

  const loading = isLoading && !data;
  const sales: Sale[] = data?.sales || [];
  const total: number = data?.total || 0;
  const pages: number = data?.pages || 1;
  const summary = data?.summary || { totalUsd: 0, count: 0 };

  if (error) toast.error('Failed to load sales');

  const handlePrint = (sale: Sale) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) {
      document.body.removeChild(iframe);
      toast.error('Could not initialize print frame.');
      return;
    }

    win.document.open();
    win.document.write(`
      <html><head><title>Receipt - ${sale.invoiceNo}</title>
      <style>
      @page { margin: 0; }
      html, body { width: 100%; max-width: 80mm; margin: 0 auto; padding: 12px; font-family: 'Courier New', monospace; font-size: 12pt; color: #000; background: #fff; }
      * { box-sizing: border-box; }
      .c { text-align: center; } .b { font-weight: bold; }
      .l { border-top: 2px dashed #000; margin: 12px 0; }
      .r { display: flex; justify-content: space-between; margin: 6px 0; }
      .t { font-size: 14pt; font-weight: bold; }
      .title { font-size: 18pt; font-weight: bold; margin-bottom: 4px; }
      .subtitle { font-size: 11pt; margin-bottom: 2px; }
      .muted { color: #333; font-size: 10pt; }
      </style></head>
      <body>
        <div class="c">
          ${settings?.logo ? `<img src="${settings.logo}" style="max-width: 80%; max-height: 80px; object-fit: contain; margin-bottom: 8px;" />` : '<span style="font-size: 24px;">🛒</span>'}
        </div>
        <div class="c title">${settings?.storeNameKh || 'ហាង'}</div>
        <div class="c subtitle">${settings?.storeName || 'Store'}</div>
        <div class="c muted">${settings?.address || ''}</div>
        <div class="c muted">${settings?.phone || ''}</div>
        <div class="l"></div>
        <div class="r"><span>Invoice:</span><span class="b">${sale.invoiceNo || '—'}</span></div>
        <div class="r"><span>Date:</span><span>${sale.createdAt ? new Date(sale.createdAt).toLocaleString() : ''}</span></div>
        <div class="r"><span>Cashier:</span><span>${sale.cashier?.name || '—'}</span></div>
        ${sale.customer ? `<div class="r"><span>Customer:</span><span>${sale.customer.name || ''}</span></div>` : ''}
        <div class="l"></div>
        ${(sale.items || []).map((item: any) => `
          <div class="b">${item.nameKh || item.name || 'Item'}</div>
          ${item.nameKh ? `<div>${item.name}</div>` : ''}
          <div class="r" style="color:#555"><span>${item.qty || 1} × $${Number(item.priceUsd || 0).toFixed(2)}</span><span>$${Number(item.subtotalUsd || 0).toFixed(2)}</span></div>
        `).join('')}
        <div class="l"></div>
        <div class="r"><span>Subtotal:</span><span>$${Number(sale.subtotalUsd || 0).toFixed(2)}</span></div>
        ${Number(sale.discountUsd || 0) > 0 ? `<div class="r"><span>Discount:</span><span>-$${Number(sale.discountUsd || 0).toFixed(2)}</span></div>` : ''}
        ${Number(sale.taxUsd || 0) > 0 ? `<div class="r"><span>Tax:</span><span>$${Number(sale.taxUsd || 0).toFixed(2)}</span></div>` : ''}
        <div class="l"></div>
        <div class="r t"><span>TOTAL:</span><span>$${Number(sale.totalUsd || 0).toFixed(2)}</span></div>
        <div class="r muted"><span></span><span>${Number(sale.totalKhr || 0).toLocaleString()} ៛</span></div>
        <div class="l"></div>
        <div class="r"><span>Payment:</span><span>${String(sale.paymentMethod || '').toUpperCase()}</span></div>
        ${sale.paymentMethod === 'cash' ? `<div class="r"><span>Amount Paid:</span><span>$${Number(sale.amountPaidUsd ?? sale.totalUsd ?? 0).toFixed(2)}</span></div>
        <div class="r"><span>Cash Back:</span><span>$${Number(sale.changeUsd || 0).toFixed(2)}</span></div>` : ''}
        <div class="l"></div>
        <pre class="c subtitle" style="font-family: inherit; margin: 0;">${settings?.receiptFooter || `អរគុណសម្រាប់ការទិញទំនិញ!\nThank you for shopping at ${settings?.storeName || 'Rith Mart'}!`}</pre>
      </body></html>
    `);
    win.document.close();
    
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  const exportCSV = () => {
    const headers = ['Invoice', 'Date', 'Cashier', 'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total USD', 'Total KHR', 'Payment', 'Status'];
    const rows = sales.map(s => [
      s.invoiceNo,
      new Date(s.createdAt).toLocaleDateString(),
      s.cashier?.name || '',
      s.customer?.name || '',
      s.items.length,
      s.subtotalUsd.toFixed(2),
      s.discountUsd.toFixed(2),
      s.taxUsd.toFixed(2),
      s.totalUsd.toFixed(2),
      s.totalKhr,
      s.paymentMethod,
      s.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sales-${todayStr}.csv`; a.click();
  };

  const pmColor: Record<string, string> = { cash: 'badge-success', card: 'badge-primary', aba: 'badge-purple', wing: 'badge-orange', acleda: 'badge-warning' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('Sales History', 'ប្រវត្តិការលក់', '销售历史')}</h1>
          <p>{total} {t('transactions', 'ប្រតិបត្តិការ', '交易')} · ${summary.totalUsd.toFixed(2)} {t('total', 'សរុប', '总计')}</p>
        </div>
        <div className="page-header-actions">
          <button onClick={exportCSV} className="btn btn-outline btn-sm"><Download size={14} /> {t('Export CSV', 'នាំចេញ CSV', '导出 CSV')}</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        {[
          { label: t('Total Revenue', 'ចំណូលសរុប', '总收入'), value: `$${summary.totalUsd.toFixed(2)}`, icon: '💰', color: 'var(--success)' },
          { label: t('Total Orders', 'ចំនួនការបញ្ជាទិញ', '总订单'), value: summary.count, icon: '🧾', color: 'var(--primary)' },
          { label: t('Avg. Order Value', 'តម្លៃមធ្យមការបញ្ជាទិញ', '平均订单值'), value: summary.count > 0 ? `$${(summary.totalUsd / summary.count).toFixed(2)}` : '$0.00', icon: '📊', color: 'var(--purple)' },
        ].map(card => (
          <div key={card.label} className="card" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: 32 }}>{card.icon}</span>
            <div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" size={15} />
            <input placeholder={t('Search invoice number…', 'ស្វែងរកលេខវិក្កយបត្រ…', '搜索发票号…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} style={{ color: 'var(--gray-400)' }} />
            <input type="date" className="form-control" style={{ width: 150 }} value={startDate} onChange={e => setStartDate(e.target.value)} max={todayStr} />
            <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>{t('to', 'ដល់', '至')}</span>
            <input type="date" className="form-control" style={{ width: 150 }} value={endDate} onChange={e => setEndDate(e.target.value)} max={todayStr} />
            {(startDate || endDate) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>{t('Clear', 'សម្អាត', '清除')}</button>
            )}
          </div>
        </div>

        <div className="table-container">
          <div className="table-responsive"><table className="table">
            <thead>
              <tr><th>{t('Invoice', 'វិក្កយបត្រ', '发票')}</th><th>{t('Date & Time', 'កាលបរិច្ឆេទ & ម៉ោង', '日期时间')}</th><th>{t('Cashier', 'អ្នកគិតលុយ', '收银员')}</th><th>{t('Customer', 'អតិថិជន', '客户')}</th><th>{t('Items', 'ទំនិញ', '商品')}</th><th>{t('Total', 'សរុប', '总计')}</th><th>{t('Payment', 'ការបង់ប្រាក់', '支付')}</th><th>{t('Status', 'ស្ថានភាព', '状态')}</th><th>{t('Actions', 'សកម្មភាព', '操作')}</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable columns={9} />
              ) : sales.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🧾</div>
                    <h3>{t('No sales found', 'រកមិនឃើញការលក់', '未找到销售记录')}</h3>
                    <p>{t('Sales transactions will appear here', 'ប្រតិបត្តិការលក់នឹងបង្ហាញនៅទីនេះ', '销售交易将显示在此处')}</p>
                  </div>
                </td></tr>
              ) : sales.map(s => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--primary)', fontFamily: 'monospace' }}>{s.invoiceNo}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>
                    <div>{new Date(s.createdAt).toLocaleDateString()}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{new Date(s.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{s.cashier?.name || '—'}</td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{s.customer?.name || <span style={{ color: 'var(--text-muted)' }}>{t('Walk-in', 'អតិថិជនតាមហាង', '散客')}</span>}</td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{s.items.length} {t('items', 'ទំនិញ', '件')}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>${s.totalUsd.toFixed(2)}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{(s.totalKhr || 0).toLocaleString()} ៛</div>
                  </td>
                  <td><span className={`badge ${pmColor[s.paymentMethod] || 'badge-gray'}`}>{s.paymentMethod?.toUpperCase()}</span></td>
                  <td><span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'refunded' ? 'badge-warning' : 'badge-danger'}`}>{s.status}</span></td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => setSelected(s)} className="btn btn-outline btn-sm btn-icon"><Eye size={14} /></button>
                      <button onClick={() => handlePrint(s)} className="btn btn-ghost btn-sm" style={{ fontSize: 'var(--font-size-xs)' }}>🖨️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        {pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{t('Showing', 'បង្ហាញ', '显示')} {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} {t('of', 'ក្នុងចំណោម', '共')} {total}</span>
            <div className="pagination-controls">
              <button className="pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => (
                <button key={n} className={`pagination-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h2 className="modal-title">{t('Sale Detail', 'ព័ត៌មានលម្អិតការលក់', '销售详情')} · {selected.invoiceNo}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                <div><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Date', 'កាលបរិច្ឆេទ', '日期')}</span><div style={{ fontWeight: 600 }}>{new Date(selected.createdAt).toLocaleString()}</div></div>
                <div><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Cashier', 'អ្នកគិតលុយ', '收银员')}</span><div style={{ fontWeight: 600 }}>{selected.cashier?.name || '—'}</div></div>
                <div><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Customer', 'អតិថិជន', '客户')}</span><div style={{ fontWeight: 600 }}>{selected.customer?.name || t('Walk-in', 'អតិថិជនតាមហាង', '散客')}</div></div>
                <div><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Payment', 'ការបង់ប្រាក់', '支付')}</span><div style={{ fontWeight: 600 }}>{selected.paymentMethod?.toUpperCase()}</div></div>
              </div>
              <div className="table-responsive"><table className="table" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <thead><tr><th>{t('Product', 'ផលិតផល', '商品')}</th><th>{t('Qty', 'ចំនួន', '数量')}</th><th>{t('Price', 'តម្លៃ', '价格')}</th><th>{t('Subtotal', 'សរុបរង', '小计')}</th></tr></thead>
                <tbody>
                  {selected.items.map((item, i) => (
                    <tr key={i}>
                      <td><div style={{ fontWeight: 600 }}>{item.name}</div></td>
                      <td>{item.qty}</td>
                      <td>${item.priceUsd.toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>${item.subtotalUsd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <div style={{ marginTop: 'var(--space-4)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                {[
                  [t('Subtotal', 'សរុបរង', '小计'), `$${selected.subtotalUsd.toFixed(2)}`],
                  ...(selected.discountUsd > 0 ? [[t('Discount', 'បង្រែតម្លៃ', '折扣'), `-$${selected.discountUsd.toFixed(2)}`]] : []),
                  ...(selected.taxUsd > 0 ? [[t('Tax', 'ពន្ធ', '税费'), `$${selected.taxUsd.toFixed(2)}`]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="cart-total-row"><span>{label}</span><span>{val}</span></div>
                ))}
                <div className="cart-total-row total"><span>{t('TOTAL', 'សរុប', '总计')}</span><span className="amount">${selected.totalUsd.toFixed(2)}</span></div>
                <div className="cart-khr">{(selected.totalKhr || 0).toLocaleString()} ៛ (1 USD = {selected.exchangeRate} KHR)</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelected(null)}>{t('Close', 'បិទ', '关闭')}</button>
              <button className="btn btn-primary" onClick={() => handlePrint(selected)}>🖨️ {t('Print Receipt', 'បោះពុម្ពវិក្កយបត្រ', '打印收据')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
