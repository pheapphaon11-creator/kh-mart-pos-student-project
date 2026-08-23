'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';

interface Category { _id: string; name: string; nameKh: string; icon: string; color: string; isActive: boolean; }

const ICONS = ['📦','🥤','🍿','🥛','🍞','🥩','🥦','🧴','📱','🏠','👗','💊','🛒','🎁','🐟','🌾','🧃','🍫','🌿','🧹'];
const COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#ea580c','#0891b2','#be185d','#4f46e5','#059669'];

export default function CategoriesPage() {
  const { confirm } = useConfirm();
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const { data: categories, mutate, isLoading } = useSWR<Category[]>('/api/categories');
  const loading = isLoading && !categories;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', nameKh: '', description: '', icon: '📦', color: '#2563eb' });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', nameKh: '', description: '', icon: '📦', color: '#2563eb' });
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, nameKh: c.nameKh, description: '', icon: c.icon, color: c.color });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.nameKh) { toast.error('Name and Khmer name are required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing._id}` : '/api/categories';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Failed');
      toast.success(editing ? 'Category updated!' : 'Category created!');
      setShowModal(false);
      mutate();
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Delete this category?'))) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      mutate();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('Categories', 'ប្រភេទទំនិញ', '分类管理')}</h1>
          <p>{t('Organize products into categories', 'រៀបចំផលិតផលតាមប្រភេទ', '将商品按分类组织')}</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> {t('Add Category', 'បន្ថែមប្រភេទ', '添加分类')}</button>
      </div>

      {loading ? (
        <SkeletonPage />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {(categories || []).map(c => (
            <div key={c._id} className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: c.color + '20', border: `2px solid ${c.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {c.icon}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(c)} className="btn btn-outline btn-sm btn-icon"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(c._id)} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                </div>
              </div>
              <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>{language === 'kh' ? c.nameKh : c.name}</div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{language === 'kh' ? c.name : c.nameKh}</div>
              </div>
              <div style={{ width: '100%', height: 3, borderRadius: 99, background: c.color, opacity: 0.7 }} />
            </div>
          ))}
          {(!categories || categories.length === 0) && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">🏷️</div>
              <h3>{t('No categories yet', 'មិនទាន់មានប្រភេទនៅឡើយទេ', '暂无分类')}</h3>
              <p>{t('Create your first category to organize products', 'បង្កើតប្រភេទដំបូងដើម្បីរៀបចំផលិតផល', '创建第一个分类来组织商品')}</p>
              <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: 16 }}><Plus size={16} /> {t('Add Category', 'បន្ថែមប្រភេទ', '添加分类')}</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? t('Edit Category', 'កែសម្រួលប្រភេទ', '编辑分类') : t('Add Category', 'បន្ថែមប្រភេទ', '添加分类')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">{t('Category Name (English)', 'ឈ្មោះប្រភេទ (អង់គ្លេស)', '分类名称 (英文)')}</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Beverages" />
              </div>
              <div className="form-group">
                <label className="form-label required">{t('Name (Khmer)', 'ឈ្មោះ (ខ្មែរ)', '名称 (高棉语)')}</label>
                <input className="form-control" value={form.nameKh} onChange={e => setForm({ ...form, nameKh: e.target.value })} placeholder="ភេសជ្ជៈ" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Icon', 'រូបសញ្ញា', '图标')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                      style={{ width: 38, height: 38, fontSize: 20, border: `2px solid ${form.icon === icon ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: form.icon === icon ? 'var(--primary-50)' : 'white', cursor: 'pointer' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Color', 'ពណ៌', '颜色')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: color, border: `3px solid ${form.color === color ? '#0f172a' : 'transparent'}`, cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>{t('Cancel', 'បោះបង់', '取消')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t('Saving…', 'កំពុងរក្សាទុក...', '保存中...') : editing ? t('Update', 'កែសម្រួល', '更新') : t('Create', 'បង្កើត', '创建')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
