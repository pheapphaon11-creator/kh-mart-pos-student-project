'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';

interface Supplier {
  _id: string; name: string; contactPerson: string; phone: string;
  email?: string; address?: string; company?: string; notes?: string; isActive: boolean;
}

export default function SuppliersPage() {
  const { confirm } = useConfirm();
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, mutate, isLoading } = useSWR(`/api/suppliers?page=${page}&search=${search}`);
  const loading = isLoading && !data;
  
  const suppliers: Supplier[] = data?.suppliers || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', company: '', notes: '' });

  const openAdd = () => { setEditing(null); setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', company: '', notes: '' }); setShowModal(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email || '', address: s.address || '', company: s.company || '', notes: s.notes || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.contactPerson || !form.phone) { toast.error('Name, contact person and phone are required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/suppliers/${editing._id}` : '/api/suppliers';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Supplier updated!' : 'Supplier added!');
      setShowModal(false);
      mutate();
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Remove this supplier?'))) return;
    await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    toast.success('Supplier removed');
    mutate();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('Suppliers', 'អ្នកផ្គត់ផ្គង់', '供货商管理')}</h1>
          <p>{total} {t('suppliers registered', 'អ្នកផ្គត់ផ្គង់បានចុះឈ្មោះ', '已注册供货商')}</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> {t('Add Supplier', 'បន្ថែមអ្នកផ្គត់ផ្គង់', '添加供货商')}</button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" size={15} />
            <input placeholder={t('Search name, contact, phone…', 'ស្វែងរកឈ្មោះ ទំនាក់ទំនង ទូរស័ព្ទ…', '搜索名称/联系人/电话…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="table-container">
          <div className="table-responsive"><table className="table">
            <thead>
              <tr><th>{t('Supplier', 'អ្នកផ្គត់ផ្គង់', '供货商')}</th><th>{t('Contact Person', 'អ្នកទំនាក់ទំនង', '联系人')}</th><th>{t('Phone', 'ទូរស័ព្ទ', '电话')}</th><th>{t('Email', 'អ៊ីមែល', '邮箱')}</th><th>{t('Address', 'អាសយដ្ឋាន', '地址')}</th><th>{t('Actions', 'សកម្មភាព', '操作')}</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable columns={6} />
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🚚</div>
                    <h3>{t('No suppliers yet', 'មិនទាន់មានអ្នកផ្គត់ផ្គង់នៅឡើយទេ', '暂无供货商')}</h3>
                    <p>{t('Add suppliers to track product sourcing', 'បន្ថែមអ្នកផ្គត់ផ្គង់ដើម្បីតាមដានប្រភពទំនិញ', '添加供货商以跟踪商品来源')}</p>
                    <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: 16 }}><Plus size={16} /> {t('Add Supplier', 'បន្ថែមអ្នកផ្គត់ផ្គង់', '添加供货商')}</button>
                  </div>
                </td></tr>
              ) : suppliers.map(s => (
                <tr key={s._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {s.company && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={11} />{s.company}</div>}
                  </td>
                  <td>{s.contactPerson}</td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-size-sm)' }}><Phone size={12} />{s.phone}</span></td>
                  <td>{s.email ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-size-sm)' }}><Mail size={12} />{s.email}</span> : '—'}</td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{s.address || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => openEdit(s)} className="btn btn-outline btn-sm btn-icon"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(s._id)} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        {pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
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
          <div className="modal modal-md">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? t('Edit Supplier', 'កែសម្រួលអ្នកផ្គត់ផ្គង់', '编辑供货商') : t('Add Supplier', 'បន្ថែមអ្នកផ្គត់ផ្គង់', '添加供货商')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">{t('Supplier Name', 'ឈ្មោះអ្នកផ្គត់ផ្គង់', '供货商名称')}</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Camco Trading" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Company', 'ក្រុមហុន', '公司')}</label>
                  <input className="form-control" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Camco Co., Ltd" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">{t('Contact Person', 'អ្នកទំនាក់ទំនង', '联系人')}</label>
                  <input className="form-control" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="Sok Dara" />
                </div>
                <div className="form-group">
                  <label className="form-label required">{t('Phone', 'ទូរស័ព្ទ', '电话')}</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+855 12 345 678" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Email', 'អ៊ីមែល', '邮箱')}</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="supplier@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Address', 'អាសយដ្ឋាន', '地址')}</label>
                  <input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Phnom Penh" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Notes', 'កំណត់ចំណាំ', '备注')}</label>
                <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={t('Additional notes…', 'កំណត់ចំណាំបន្ថែម…', '其他备注…')} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>{t('Cancel', 'បោះបង់', '取消')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? t('Saving…', 'កំពុងរក្សាទុក...', '保存中...') : editing ? t('Update', 'កែសម្រួល', '更新') : t('Add Supplier', 'បន្ថែមអ្នកផ្គត់ផ្គង់', '添加供货商')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
