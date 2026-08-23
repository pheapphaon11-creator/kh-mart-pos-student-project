'use client';

import { useState } from 'react';
import { Plus, Search, AlertTriangle, RefreshCw, ArrowUpDown, History, ClipboardList, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';

interface Category { _id: string; name: string; nameKh: string; icon: string; color: string; }
interface Supplier { _id: string; name: string; }
interface Branch { _id: string; name: string; }
interface User { _id: string; name: string; }

interface Product {
  _id: string; name: string; nameKh: string; sku: string; barcode?: string;
  category: Category; priceUsd: number; costUsd: number; stock: number;
  minStock: number; unit: string; supplier?: Supplier; isActive: boolean;
}

interface InventoryTransaction {
  _id: string;
  product: Product;
  branch?: Branch;
  type: 'in' | 'out' | 'adjustment' | 'sale';
  quantity: number;
  reason: string;
  user: User;
  prevStock: number;
  newStock: number;
  createdAt: string;
}

const ADJUSTMENT_REASONS = {
  in: ['Purchase from Supplier', 'Customer Return', 'Inventory Count Correction', 'Other Stock In'],
  out: ['Damaged Goods', 'Returned to Supplier', 'Theft or Loss', 'Expired Stock', 'Other Stock Out'],
  adjustment: ['Periodic Stocktake', 'System Correction', 'Reconciliation']
};

export default function InventoryPage() {
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'cashier';
  const isSuperadmin = userRole === 'superadmin';
  const canAdjust = ['superadmin', 'admin', 'manager'].includes(userRole);

  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');

  // Stock levels tab states
  const [stockPage, setStockPage] = useState(1);
  const [stockSearch, setStockSearch] = useState('');
  const [stockCatFilter, setStockCatFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // History tab states
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    productId: '',
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: '',
    reasonSelect: '',
    customReason: '',
  });

  // Fetch data
  const stockParams = new URLSearchParams({
    page: String(stockPage),
    search: stockSearch,
    ...(stockCatFilter && { category: stockCatFilter }),
    ...(lowStockFilter && { lowStock: 'true' })
  });

  const historyParams = new URLSearchParams({
    page: String(historyPage),
    search: historySearch,
    ...(historyTypeFilter && { type: historyTypeFilter }),
    ...(historyStartDate && { startDate: historyStartDate }),
    ...(historyEndDate && { endDate: historyEndDate })
  });

  const { data: productsData, isLoading: productsLoading, mutate: mutateProducts } = useSWR(`/api/products?${stockParams}`, fetcher);
  const { data: txData, isLoading: txLoading, mutate: mutateTx } = useSWR(`/api/inventory?${historyParams}`, fetcher);
  const { data: catsData } = useSWR('/api/categories', fetcher);
  const { data: allProdData } = useSWR('/api/products?limit=250', fetcher);

  const products: Product[] = productsData?.products || [];
  const stockTotal: number = productsData?.total || 0;
  const stockPages: number = productsData?.pages || 1;

  const transactions: InventoryTransaction[] = txData?.transactions || [];
  const historyTotal: number = txData?.total || 0;
  const historyPages: number = txData?.pages || 1;

  const categories: Category[] = Array.isArray(catsData) ? catsData : (catsData?.categories || []);
  const allDropdownProducts: Product[] = allProdData?.products || [];

  const handleTabChange = (tab: 'stock' | 'history') => {
    setActiveTab(tab);
  };

  const openAdjustModal = (product: Product | null = null) => {
    if (!canAdjust) {
      toast.error('You do not have permission to adjust inventory');
      return;
    }
    setSelectedProduct(product);
    setForm({
      productId: product?._id || '',
      type: 'in',
      quantity: '',
      reasonSelect: ADJUSTMENT_REASONS.in[0],
      customReason: '',
    });
    setShowModal(true);
  };

  const handleTypeChange = (type: 'in' | 'out' | 'adjustment') => {
    setForm(prev => ({
      ...prev,
      type,
      reasonSelect: ADJUSTMENT_REASONS[type][0],
      customReason: '',
    }));
  };

  const handleSaveAdjustment = async () => {
    const prodId = selectedProduct?._id || form.productId;
    if (!prodId) {
      toast.error('Please select a product');
      return;
    }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty < 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }

    setSubmitting(true);
    try {
      const reason = form.reasonSelect === 'Other' || !form.reasonSelect
        ? form.customReason || 'Manual Adjustment'
        : form.reasonSelect;

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: prodId,
          type: form.type,
          quantity: qty,
          reason
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit adjustment');
      }

      toast.success('Inventory adjusted successfully');
      mutateProducts();
      mutateTx();
      setShowModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStockStatus = (p: Product) => {
    if (p.stock === 0) return { label: 'Out', cls: 'badge-danger', pct: 0 };
    if (p.stock <= p.minStock) return { label: 'Low', cls: 'badge-warning', pct: Math.min((p.stock / p.minStock) * 100, 100) };
    return { label: 'OK', cls: 'badge-success', pct: 100 };
  };

  const formatTxType = (type: string) => {
    switch (type) {
      case 'in': return { label: 'Stock In', cls: 'badge-in' };
      case 'out': return { label: 'Stock Out', cls: 'badge-out' };
      case 'sale': return { label: 'POS Sale', cls: 'badge-sale' };
      case 'adjustment': return { label: 'Adjusted', cls: 'badge-adjustment' };
      default: return { label: type, cls: '' };
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('Stock Adjustments', 'ការកែសម្រួលស្តុក', '库存调整')}</h1>
          <p>{t('Track stock levels and log manual or automated changes', 'តាមដានកម្រិតស្តុកនិងកត់ត្រាការកែប្រែ', '跟踪库存水平并记录变更')}</p>
        </div>
        <div className="page-header-actions">
          <button 
            onClick={() => { mutateProducts(); mutateTx(); }} 
            className="btn btn-outline btn-sm"
            title="Refresh tables"
          >
            <RefreshCw size={14} /> {t('Refresh', 'ផ្ទុកថ្មី', '刷新')}
          </button>
          {canAdjust && (
            <button onClick={() => openAdjustModal(null)} className="btn btn-primary">
              <Plus size={16} /> {t('Adjust Stock', 'កែសម្រួលស្តុក', '调整库存')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          onClick={() => handleTabChange('stock')} 
          className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
        >
          <ClipboardList size={14} style={{ marginRight: 6, verticalAlign: 'middle', display: 'inline-block' }} />
          Stock Levels
        </button>
        <button 
          onClick={() => handleTabChange('history')} 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <History size={14} style={{ marginRight: 6, verticalAlign: 'middle', display: 'inline-block' }} />
          {t('Adjustment History', 'ប្រវត្តិការកែសម្រួល', '调整历史')}
        </button>
      </div>

      {/* TAB 1: STOCK LEVELS */}
      {activeTab === 'stock' && (
        <div className="card">
          <div className="filter-bar">
            <div className="search-input-wrapper">
              <Search className="search-input-icon" size={15} />
              <input 
                placeholder={t('Search products by name, SKU, barcode…', 'ស្វែងរកតាមឈ្មោះ SKU បាកូដ…', '按名称/SKU/条码搜索…')} 
                value={stockSearch} 
                onChange={e => { setStockSearch(e.target.value); setStockPage(1); }} 
              />
            </div>
            <select 
              className="form-control" 
              style={{ width: 180 }} 
              value={stockCatFilter} 
              onChange={e => { setStockCatFilter(e.target.value); setStockPage(1); }}
            >
              <option value="">{t('All Categories', 'ប្រភេទទាំងអស់', '全部分类')}</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
            <button 
              onClick={() => { setLowStockFilter(!lowStockFilter); setStockPage(1); }} 
              className={`btn ${lowStockFilter ? 'btn-warning' : 'btn-outline'} btn-sm`}
              style={{ height: '42px' }}
            >
              <AlertTriangle size={14} style={{ marginRight: 4 }} /> {t('Low Stock', 'ស្តុកទាប', '低库存')} {lowStockFilter && '✓'}
            </button>
          </div>

          <div className="table-container">
            <div className="table-responsive"><table className="table">
              <thead>
                <tr>
                  <th>{t('Product', 'ផលិតផល', '商品')}</th>
                  <th>{t('SKU / Barcode', 'SKU / បាកូដ', 'SKU / 条码')}</th>
                  <th>{t('Category', 'ប្រភេទ', '分类')}</th>
                  <th>{t('Current Stock', 'ស្តុកបច្ចុប្បន្ន', '当前库存')}</th>
                  <th>{t('Min Stock', 'ស្តុកអប្បបរមា', '最低库存')}</th>
                  <th>{t('Status', 'ស្ថានភាព', '状态')}</th>
                  {canAdjust && <th>{t('Actions', 'សកម្មភាព', '操作')}</th>}
                </tr>
              </thead>
              <tbody>
                {productsLoading ? (
                  <SkeletonTable columns={canAdjust ? 7 : 6} />
                ) : products.length === 0 ? (
                  <tr><td colSpan={canAdjust ? 7 : 6}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📦</div>
                      <h3>{t('No products found', 'រកមិនឃើញផលិតផល', '未找到商品')}</h3>
                      <p>{t('Add products in the product section first.', 'បន្ថែមផលិតផលក្នុងផ្នែកផលិតផលជាមុនសិន។', '请先在商品部分添加商品。')}</p>
                    </div>
                  </td></tr>
                ) : products.map(p => {
                  const stockInfo = getStockStatus(p);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.nameKh}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</div>
                        {p.barcode && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.barcode}</div>}
                      </td>
                      <td>
                        {p.category && (
                          <span className="badge badge-primary">
                            {p.category.icon} {p.category.name}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="stock-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="stock-bar" style={{ width: 80, height: 6, backgroundColor: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                            <div 
                              className={`stock-bar-fill ${stockInfo.label === 'OK' ? 'high' : stockInfo.label === 'Low' ? 'medium' : 'low'}`} 
                              style={{ width: `${stockInfo.pct}%`, height: '100%' }} 
                            />
                          </div>
                          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{p.stock} {p.unit}</span>
                        </div>
                      </td>
                      <td>{p.minStock} {p.unit}</td>
                      <td>
                        <span className={`badge ${stockInfo.cls}`}>
                          {stockInfo.label === 'OK' ? t('In Stock', 'មានស្តុក', '有库存') : stockInfo.label === 'Low' ? t('Low Stock', 'ស្តុកទាប', '低库存') : t('Out of Stock', 'អស់ស្តុក', '已售罄')}
                        </span>
                      </td>
                      {canAdjust && (
                        <td>
                          <button 
                            onClick={() => openAdjustModal(p)} 
                            className="btn btn-outline btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ArrowUpDown size={12} /> {t('Adjust', 'កែសម្រួល', '调整')}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>

          {stockPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Showing {(stockPage - 1) * 20 + 1}–{Math.min(stockPage * 20, stockTotal)} of {stockTotal}</span>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setStockPage(p => p - 1)} disabled={stockPage === 1}>‹</button>
                {Array.from({ length: stockPages }, (_, i) => i + 1).map(n => (
                  <button key={n} className={`pagination-btn ${n === stockPage ? 'active' : ''}`} onClick={() => setStockPage(n)}>{n}</button>
                ))}
                <button className="pagination-btn" onClick={() => setStockPage(p => p + 1)} disabled={stockPage === stockPages}>›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADJUSTMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="search-input-wrapper" style={{ flex: '1 1 200px' }}>
              <Search className="search-input-icon" size={15} />
              <input 
                placeholder="Search by SKU, product name, reason…" 
                value={historySearch} 
                onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }} 
              />
            </div>
            <select 
              className="form-control" 
              style={{ width: 140 }} 
              value={historyTypeFilter} 
              onChange={e => { setHistoryTypeFilter(e.target.value); setHistoryPage(1); }}
            >
              <option value="">{t('All Types', 'ប្រភេទទាំងអស់', '全部类型')}</option>
              <option value="in">{t('Stock In', 'ស្តុកចូល', '入库')}</option>
              <option value="out">{t('Stock Out', 'ស្តុកចេញ', '出库')}</option>
              <option value="adjustment">{t('Adjusted', 'កែសម្រួល', '调整')}</option>
              <option value="sale">{t('POS Sale', 'លក់ POS', 'POS销售')}</option>
            </select>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div className="input-group" style={{ width: 150 }}>
                <span className="input-prefix" style={{ padding: '0 8px' }}><Calendar size={14} /></span>
                <input 
                  type="date" 
                  className="form-control" 
                  value={historyStartDate} 
                  onChange={e => { setHistoryStartDate(e.target.value); setHistoryPage(1); }} 
                  style={{ borderLeft: 'none', height: 42, paddingLeft: 0 }}
                />
              </div>
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <div className="input-group" style={{ width: 150 }}>
                <span className="input-prefix" style={{ padding: '0 8px' }}><Calendar size={14} /></span>
                <input 
                  type="date" 
                  className="form-control" 
                  value={historyEndDate} 
                  onChange={e => { setHistoryEndDate(e.target.value); setHistoryPage(1); }} 
                  style={{ borderLeft: 'none', height: 42, paddingLeft: 0 }}
                />
              </div>
            </div>
          </div>

          <div className="table-container">
            <div className="table-responsive"><table className="table">
              <thead>
                <tr>
                  <th>{t('Date & Time', 'កាលបរិច្ឆេទ & ម៉ោង', '日期时间')}</th>
                  <th>{t('Product', 'ផលិតផល', '商品')}</th>
                  <th>{t('Type', 'ប្រភេទ', '类型')}</th>
                  <th>{t('Qty Change', 'ការផ្លាស់ប្តូរចំនួន', '数量变化')}</th>
                  <th>{t('Stock Flow', 'លំហូរស្តុក', '库存流向')}</th>
                  <th>{t('Reason', 'មូលហេតុ', '原因')}</th>
                  <th>{t('Action User', 'អ្នកប្រើប្រាស់', '操作人')}</th>
                  {isSuperadmin && <th>{t('Branch', 'សាខា', '分店')}</th>}
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <SkeletonTable columns={isSuperadmin ? 8 : 7} />
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={isSuperadmin ? 8 : 7}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <h3>{t('No transaction records', 'មិនមានកំណត់ត្រាប្រតិបត្តិការ', '无交易记录')}</h3>
                      <p>{t('Any stock adjustments or POS sales will log here.', 'ការកែសម្រួលស្តុកឬការលក់ POS នឹងកត់ត្រានៅទីនេះ។', '库存调整或POS销售将记录在此。')}</p>
                    </div>
                  </td></tr>
                ) : transactions.map(tx => {
                  const txInfo = formatTxType(tx.type);
                  const isPositive = tx.quantity > 0;
                  return (
                    <tr key={tx._id}>
                      <td style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                        {new Date(tx.createdAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td>
                        {tx.product ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{tx.product.name}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{tx.product.sku}</div>
                          </>
                        ) : (
                          <div style={{ color: 'var(--text-muted)' }}>Deleted Product</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${txInfo.cls}`}>{txInfo.label}</span>
                      </td>
                      <td>
                        <span className={`qty-pill ${isPositive ? 'positive' : 'negative'}`}>
                          {isPositive ? `+${tx.quantity}` : tx.quantity}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {tx.prevStock} ➔ {tx.newStock}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{tx.reason}</div>
                      </td>
                      <td>{tx.user?.name || 'System'}</td>
                      {isSuperadmin && <td>{tx.branch?.name || 'Main Branch'}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>

          {historyPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Showing {(historyPage - 1) * 20 + 1}–{Math.min(historyPage * 20, historyTotal)} of {historyTotal}</span>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setHistoryPage(p => p - 1)} disabled={historyPage === 1}>‹</button>
                {Array.from({ length: historyPages }, (_, i) => i + 1).map(n => (
                  <button key={n} className={`pagination-btn ${n === historyPage ? 'active' : ''}`} onClick={() => setHistoryPage(n)}>{n}</button>
                ))}
                <button className="pagination-btn" onClick={() => setHistoryPage(p => p + 1)} disabled={historyPage === historyPages}>›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h2 className="modal-title">{t('Adjust Product Stock', 'កែសម្រួលស្តុកផលិតផល', '调整商品库存')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">{t('Product', 'ផលិតផល', '商品')}</label>
                {selectedProduct ? (
                  <div style={{ padding: '10px 14px', background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600 }}>{selectedProduct.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>SKU: {selectedProduct.sku} | {t('Current Stock', 'ស្តុកបច្ចុប្បន្ន', '当前库存')}: {selectedProduct.stock} {selectedProduct.unit}</div>
                  </div>
                ) : (
                  <select 
                    className="form-control" 
                    value={form.productId} 
                    onChange={e => {
                      const p = allDropdownProducts.find(prod => prod._id === e.target.value);
                      setSelectedProduct(p || null);
                      setForm(prev => ({ ...prev, productId: e.target.value }));
                    }}
                  >
                    <option value="">{t('Select product...', 'ជ្រើសរើសផលិតផល...', '选择商品...')}</option>
                    {allDropdownProducts.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label required">{t('Adjustment Type', 'ប្រភេទការកែសម្រួល', '调整类型')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button 
                    type="button" 
                    className={`btn ${form.type === 'in' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleTypeChange('in')}
                  >
                    {t('Stock In (+)', 'ស្តុកចូល (+)', '入库 (+)')}
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${form.type === 'out' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleTypeChange('out')}
                  >
                    {t('Stock Out (-)', 'ស្តុកចេញ (-)', '出库 (-)')}
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${form.type === 'adjustment' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleTypeChange('adjustment')}
                  >
                    {t('Set Count (=)', 'កំណត់ចំនួន (=)', '设置数量 (=)')}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">
                  {form.type === 'adjustment' ? t('Target Stock Count', 'ចំនួនស្តុកគោលដៅ', '目标库存数') : t('Quantity to Change', 'ចំនួនដែលត្រូវផ្លាស់ប្តូរ', '变更数量')} 
                  {selectedProduct && ` (in ${selectedProduct.unit})`}
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="any"
                  className="form-control" 
                  placeholder={form.type === 'adjustment' ? 'e.g. 50' : 'e.g. 10'} 
                  value={form.quantity}
                  onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                />
                {selectedProduct && form.type !== 'adjustment' && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                    New stock will be: {form.type === 'in' 
                      ? (selectedProduct.stock + (parseFloat(form.quantity) || 0)) 
                      : Math.max(0, selectedProduct.stock - (parseFloat(form.quantity) || 0))} {selectedProduct.unit}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label required">{t('Reason', 'មូលហេតុ', '原因')}</label>
                <select 
                  className="form-control"
                  value={form.reasonSelect}
                  onChange={e => setForm(prev => ({ ...prev, reasonSelect: e.target.value }))}
                >
                  {ADJUSTMENT_REASONS[form.type].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Other">{t('Other / Custom', 'ផ្សេងទៀត / ផ្ទាល់ខ្លួន', '其他 / 自定义')}</option>
                </select>
              </div>

              {form.reasonSelect === 'Other' && (
                <div className="form-group">
                  <label className="form-label required">{t('Custom Reason / Notes', 'មូលហេតុផ្ទាល់ខ្លួន / កំណត់ចំណាំ', '自定义原因 / 备注')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Describe the reason for adjustment"
                    value={form.customReason}
                    onChange={e => setForm(prev => ({ ...prev, customReason: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>{t('Cancel', 'បោះបង់', '取消')}</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveAdjustment} 
                disabled={submitting || (!selectedProduct && !form.productId) || !form.quantity}
              >
                {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {t('Submitting…', 'កំពុងដាក់ស្នើ...', '提交中...')}</> : t('Submit Adjustment', 'ដាក់ស្នើការកែសម្រួល', '提交调整')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
