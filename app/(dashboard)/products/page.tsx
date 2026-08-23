'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';

interface Category { _id: string; name: string; nameKh: string; icon: string; color: string; }
interface Supplier { _id: string; name: string; }
interface Product {
  _id: string; name: string; nameKh: string; sku: string; barcode?: string;
  category: Category; priceUsd: number; costUsd: number; stock: number;
  minStock: number; unit: string; supplier?: Supplier; isActive: boolean;
}

const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'box', 'bottle', 'can', 'bag', 'carton', 'tube', 'pair', 'set'];

export default function ProductsPage() {
  const { confirm } = useConfirm();
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => {
    if (language === 'kh') return kh;
    if (language === 'zh') return zh;
    return en;
  };
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', nameKh: '', sku: '', barcode: '', category: '', priceUsd: '',
    costUsd: '', stock: '', minStock: '5', unit: 'pcs', supplier: '',
  });

  const params = new URLSearchParams({ page: String(page), search, ...(catFilter && { category: catFilter }), ...(lowStock && { lowStock: 'true' }) });
  
  const { data, error, isLoading, mutate: mutateProducts } = useSWR(`/api/products?${params}`, fetcher);
  const { data: catsData } = useSWR('/api/categories', fetcher);
  const { data: suppsData } = useSWR('/api/suppliers', fetcher);

  const products: Product[] = data?.products || [];
  const total: number = data?.total || 0;
  const pages: number = data?.pages || 1;
  const categories: Category[] = Array.isArray(catsData) ? catsData : (catsData?.categories || []);
  const suppliers: Supplier[] = suppsData?.suppliers || [];
  
  const loading = isLoading && !data;

  if (error && !data) toast.error('Failed to load products');

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', nameKh: '', sku: '', barcode: '', category: categories[0]?._id || '', priceUsd: '', costUsd: '', stock: '', minStock: '5', unit: 'pcs', supplier: '' });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, nameKh: p.nameKh, sku: p.sku, barcode: p.barcode || '', category: p.category?._id || '', priceUsd: String(p.priceUsd), costUsd: String(p.costUsd), stock: String(p.stock), minStock: String(p.minStock), unit: p.unit, supplier: p.supplier?._id || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.category || !form.priceUsd) { toast.error('Please fill required fields'); return; }
    setSaving(true);
    try {
      const body = { ...form, priceUsd: parseFloat(form.priceUsd), costUsd: parseFloat(form.costUsd) || 0, stock: parseInt(form.stock) || 0, minStock: parseInt(form.minStock) || 5 };
      const url = editing ? `/api/products/${editing._id}` : '/api/products';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      mutateProducts();
      toast.success(`Product ${editing ? 'updated' : 'created'} successfully`);
      setShowModal(false);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Archive this product?'))) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      mutateProducts();
      toast.success('Product archived');
    } catch { toast.error('Failed to archive'); }
  };

  const handleQuickAddStock = async (p: Product) => {
    try {
      await fetch(`/api/products/${p._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: p.stock + 1 })
      });
      toast.success(`Added +1 stock to ${p.name}`);
      mutateProducts();
    } catch { toast.error('Failed to add stock'); }
  };

  const getStockStatus = (p: Product) => {
    if (p.stock === 0) return { label: 'Out', cls: 'badge-danger', pct: 0 };
    if (p.stock <= p.minStock) return { label: 'Low', cls: 'badge-warning', pct: Math.min((p.stock / p.minStock) * 100, 100) };
    return { label: 'OK', cls: 'badge-success', pct: 100 };
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('Products', 'ផលិតផល', '商品管理')}</h1>
          <p>{total} {t('products in inventory', 'ផលិតផលក្នុងស្តុក', '件商品在库')}</p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => setLowStock(!lowStock)} className={`btn ${lowStock ? 'btn-warning' : 'btn-outline'} btn-sm`}>
            <AlertTriangle size={14} /> {t('Low Stock', 'ស្តុកទាប', '低库存')} {lowStock && '✓'}
          </button>
          <button onClick={() => mutateProducts()} className="btn btn-outline btn-sm"><RefreshCw size={14} /></button>
          <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> {t('Add Product', 'បន្ថែមទំនិញ', '添加商品')}</button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" size={15} />
            <input placeholder={t('Search by name, SKU, barcode…', 'ស្វែងរកតាមឈ្មោះ SKU បាកូដ…', '按名称/SKU/条码搜索…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 180 }} value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
            <option value="">{t('All Categories', 'ប្រភេទទាំងអស់', '全部分类')}</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <div className="table-container">
          <div className="table-responsive"><table className="table">
            <thead>
              <tr>
                <th>{t('Product', 'ផលិតផល', '商品')}</th>
                <th>{t('SKU / Barcode', 'SKU / បាកូដ', 'SKU / 条码')}</th>
                <th>{t('Category', 'ប្រភេទ', '分类')}</th>
                <th>{t('Price', 'តម្លៃ', '售价')}</th>
                <th>{t('Cost', 'ថ្លៃដើម', '成本')}</th>
                <th>{t('Stock', 'ស្តុក', '库存')}</th>
                <th>{t('Status', 'ស្ថានភាព', '状态')}</th>
                <th>{t('Actions', 'សកម្មភាព', '操作')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable columns={8} />
              ) : products.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3>{t('No products found', 'រកមិនឃើញទំនិញ', '未找到商品')}</h3>
                    <p>{t('Add your first product to get started', 'បន្ថែមទំនិញដំបូងរបស់អ្នកដើម្បីចាប់ផ្តើម', '添加您的第一个商品开始使用')}</p>
                    <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: 16 }}><Plus size={16} /> {t('Add Product', 'បន្ថែមទំនិញ', '添加商品')}</button>
                  </div>
                </td></tr>
              ) : products.map(p => {
                const stock = getStockStatus(p);
                const margin = p.costUsd > 0 ? (((p.priceUsd - p.costUsd) / p.priceUsd) * 100).toFixed(1) : '—';
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
                    <td style={{ fontWeight: 700 }}>${p.priceUsd.toFixed(2)}</td>
                    <td>
                      <div>${p.costUsd.toFixed(2)}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--success)' }}>{margin}% margin</div>
                    </td>
                    <td>
                      <div className="stock-indicator">
                        <div className="stock-bar">
                          <div className={`stock-bar-fill ${stock.label === 'OK' ? 'high' : stock.label === 'Low' ? 'medium' : 'low'}`} style={{ width: `${stock.pct}%` }} />
                        </div>
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{p.stock} {p.unit}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${stock.cls}`}>{stock.label === 'OK' ? t('In Stock', 'មានស្តុក', '有库存') : stock.label === 'Low' ? t('Low Stock', 'ស្តុកទាប', '低库存') : t('Out of Stock', 'អស់ស្តុក', '已售罄')}</span></td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => handleQuickAddStock(p)} className="btn btn-outline btn-sm btn-icon" title="Quick Add +1 Stock" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}><Plus size={14} /></button>
                        <button onClick={() => openEdit(p)} className="btn btn-outline btn-sm btn-icon"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(p._id)} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>

        {pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{t('Showing', 'បង្ហាញ', '显示')} {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} {t('of', 'ក្នុងចំណោម', '共')} {total}</span>
            <div className="pagination-controls">
              <button className="pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`pagination-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? t('Edit Product', 'កែសម្រួលទំនិញ', '编辑商品') : t('Add New Product', 'បន្ថែមទំនិញថ្មី', '添加新商品')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">{t('Product Name (English)', 'ឈ្មោះទំនិញ (អង់គ្លេស)', '商品名称 (英文)')}</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Angkor Beer 330ml" />
                </div>
                <div className="form-group">
                  <label className="form-label required">{t('Name (Khmer)', 'ឈ្មោះ (ខ្មែរ)', '名称 (高棉语)')}</label>
                  <input className="form-control" value={form.nameKh} onChange={e => setForm({ ...form, nameKh: e.target.value })} placeholder="ឈ្មោះផលិតផល" />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label required">SKU</label>
                  <input className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="BEV-001" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Barcode</label>
                  <input className="form-control" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="8850006300013" />
                </div>
                <div className="form-group">
                  <label className="form-label required">{t('Category', 'ប្រភេទ', '分类')}</label>
                  <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">{t('Select category', 'ជ្រើសរើសប្រភេទ', '选择分类')}</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">{t('Selling Price (USD)', 'តម្លៃលក់ (ដុល្លារ)', '售价 (美元)')}</label>
                  <div className="input-group">
                    <span className="input-prefix">$</span>
                    <input className="form-control" type="number" step="0.01" min="0" value={form.priceUsd} onChange={e => setForm({ ...form, priceUsd: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Cost Price (USD)', 'ថ្លៃដើម (ដុល្លារ)', '成本价 (美元)')}</label>
                  <div className="input-group">
                    <span className="input-prefix">$</span>
                    <input className="form-control" type="number" step="0.01" min="0" value={form.costUsd} onChange={e => setForm({ ...form, costUsd: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">{t('Stock Qty', 'ចំនួនស្តុក', '库存数量')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" onClick={() => setForm({ ...form, stock: String(Math.max(0, (parseInt(form.stock) || 0) - 1)) })} className="btn btn-outline btn-icon" style={{ padding: '0 12px', height: '42px' }}>-</button>
                    <input className="form-control" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" style={{ textAlign: 'center' }} />
                    <button type="button" onClick={() => setForm({ ...form, stock: String((parseInt(form.stock) || 0) + 1) })} className="btn btn-outline btn-icon" style={{ padding: '0 12px', height: '42px' }}>+</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Min Stock Alert', 'ការជូនដំណឹងស្តុកអប្បបរមា', '最低库存警告')}</label>
                  <input className="form-control" type="number" min="0" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} placeholder="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Unit', 'ឯកតា', '单位')}</label>
                  <select className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Supplier', 'អ្នកផ្គត់ផ្គង់', '供货商')}</label>
                <select className="form-control" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
                  <option value="">{t('No supplier', 'គ្មានអ្នកផ្គត់ផ្គង់', '无供货商')}</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>{t('Cancel', 'បោះបង់', '取消')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {t('Saving…', 'កំពុងរក្សាទុក...', '保存中...')}</> : editing ? t('Update Product', 'កែសម្រួលទំនិញ', '更新商品') : t('Create Product', 'បង្កើតទំនិញ', '创建商品')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
