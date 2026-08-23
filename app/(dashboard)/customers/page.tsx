'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';

interface Customer {
  _id: string; name: string; phone: string; email?: string; address?: string;
  totalSpentUsd: number; visitCount: number; loyaltyPoints: number; isActive: boolean;
}

export default function CustomersPage() {
  const { confirm } = useConfirm();
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  const params = new URLSearchParams({ page: String(page), search });
  const { data, error, isLoading, mutate: mutateCustomers } = useSWR(`/api/customers?${params}`, fetcher);

  const loading = isLoading && !data;
  const customers: Customer[] = data?.customers || [];
  const total: number = data?.total || 0;
  const pages: number = data?.pages || 1;

  if (error) toast.error('Failed to load customers');

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '' }); setShowModal(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/customers/${editing._id}` : '/api/customers';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      mutateCustomers();
      toast.success(editing ? 'Customer updated!' : 'Customer added!');
      setShowModal(false);
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Remove this customer?'))) return;
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    mutateCustomers();
    toast.success('Customer removed');
  };

  const getTier = (spent: number) => {
    if (spent >= 200) return { label: 'Gold', color: '#d97706', bg: '#fffbeb' };
    if (spent >= 100) return { label: 'Silver', color: '#64748b', bg: '#f1f5f9' };
    return { label: 'Bronze', color: '#ea580c', bg: '#fff7ed' };
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('Customers', 'អតិថិជន', '客户管理')}</h1>
          <p>{total} {t('registered customers', 'អតិថិជនដែលបានចុះឈ្មោះ', '已注册客户')}</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> {t('Add Customer', 'បន្ថែមអតិថិជន', '添加客户')}</button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" size={15} />
            <input placeholder={t('Search name, phone, email…', 'ស្វែងរកឈ្មោះ ទូរស័ព្ទ អ៊ីមែល…', '搜索姓名/电话/邮箱…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="table-container">
          <div className="table-responsive"><table className="table">
            <thead>
              <tr>
                <th>{t('Customer', 'អតិថិជន', '客户')}</th>
                <th>{t('Contact', 'ទំនាក់ទំនង', '联系方式')}</th>
                <th>{t('Tier', 'កម្រិត', '等级')}</th>
                <th>{t('Total Spent', 'ប្រាក់សរុប', '消费总额')}</th>
                <th>{t('Visits', 'ចំនួនដងមកទិញ', '到店次数')}</th>
                <th>{t('Points', 'ពិន្ទុ', '积分')}</th>
                <th>{t('Actions', 'សកម្មភាព', '操作')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable columns={7} />
              ) : customers.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3>{t('No customers yet', 'មិនទាន់មានអតិថិជននៅឡើយទេ', '暂无客户')}</h3>
                    <p>{t('Add your first customer to start tracking loyalty', 'បន្ថែមអតិថិជនដំបូងដើម្បីតាមដានការស្មោះត្រង់', '添加第一个客户开始跟踪忠诚度')}</p>
                    <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: 16 }}><Plus size={16} /> {t('Add Customer', 'បន្ថែមអតិថិជន', '添加客户')}</button>
                  </div>
                </td></tr>
              ) : customers.map(c => {
                const tier = getTier(c.totalSpentUsd);
                return (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {c.address && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{c.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} />{c.phone}</div>
                      {c.email && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={12} />{c.email}</div>}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: tier.bg, color: tier.color, fontWeight: 700, fontSize: 12 }}>
                        <Star size={11} fill={tier.color} /> {tier.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>${c.totalSpentUsd.toFixed(2)}</td>
                    <td>{c.visitCount}</td>
                    <td>
                      <span className="badge badge-purple"><Star size={10} /> {c.loyaltyPoints} pts</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => openEdit(c)} className="btn btn-outline btn-sm btn-icon"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(c._id)} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
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

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? t('Edit Customer', 'កែសម្រួលអតិថិជន', '编辑客户') : t('Add Customer', 'បន្ថែមអតិថិជន', '添加客户')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">{t('Full Name', 'ឈ្មោះពេញ', '姓名')}</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sok Dara" />
              </div>
              <div className="form-group">
                <label className="form-label required">{t('Phone Number', 'លេខទូរស័ព្ទ', '电话号码')}</label>
                <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="012 345 678" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Email', 'អ៊ីមែល', '邮箱')}</label>
                <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="sokdara@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Address', 'អាសយដ្ឋាន', '地址')}</label>
                <input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Phnom Penh" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>{t('Cancel', 'បោះបង់', '取消')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? t('Saving…', 'កំពុងរក្សាទុក...', '保存中...') : editing ? t('Update', 'កែសម្រួល', '更新') : t('Add Customer', 'បន្ថែមអតិថិជន', '添加客户')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
