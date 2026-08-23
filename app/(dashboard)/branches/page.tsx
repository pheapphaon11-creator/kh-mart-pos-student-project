'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Store, MapPin, Phone, Mail, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';

export default function BranchesPage() {
  const { confirm } = useConfirm();
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const { data: session, status } = useSession();
  const router = useRouter();
  const isSuperadmin = status === 'authenticated' && (session?.user as any)?.role === 'superadmin';
  const { data, mutate, isLoading } = useSWR(isSuperadmin ? '/api/branches' : null);
  const loading = isLoading && !data;
  const branches: any[] = data || [];

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({ 
    _id: '', name: '', address: '', phone: '',
    adminName: '', adminEmail: '', adminPassword: '' 
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !isSuperadmin)) {
      router.push('/');
    }
  }, [status, isSuperadmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const isEdit = !!formData._id;
    const url = isEdit ? `/api/branches/${formData._id}` : '/api/branches';
    const method = isEdit ? 'PUT' : 'POST';

    if (!isEdit && (!formData.adminName || !formData.adminEmail || !formData.adminPassword)) {
      toast.error('Admin details are required for new branches');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(isEdit ? 'Branch updated successfully' : 'Branch created successfully');
        setShowModal(false);
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save branch');
      }
    } catch (error) {
      toast.error('Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Are you sure you want to permanently delete this branch?'))) return;
    try {
      const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Branch deleted successfully');
        mutate();
      } else {
        toast.error('Failed to delete branch');
      }
    } catch (error) {
      toast.error('Failed to delete branch');
    }
  };

  if (status === 'loading') return null;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('Branches', 'សាខា', '分店')}</h1>
          <p>{branches.length} {t('locations registered in the network', 'ទីតាំងបានចុះឈ្មោះក្នុងបណ្តាញ', '在网络中注册的地点')}</p>
        </div>
        <button
          onClick={() => {
            setFormData({ _id: '', name: '', address: '', phone: '', adminName: '', adminEmail: '', adminPassword: '' });
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> {t('Add Branch', 'បន្ថែមសាខា', '添加分店')}
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <div className="table-responsive"><table className="table">
            <thead>
              <tr>
                <th>{t('Branch Name', 'ឈ្មោះសាខា', '分店名称')}</th>
                <th>{t('Address', 'អាសយដ្ឋាន', '地址')}</th>
                <th>{t('Phone', 'លេខទូរស័ព្ទ', '电话')}</th>
                <th>{t('Status', 'ស្ថានភាព', '状态')}</th>
                <th>{t('Actions', 'សកម្មភាព', '操作')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable columns={5} />
              ) : branches.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🏬</div>
                    <h3>{t('No branches yet', 'មិនទាន់មានសាខាទេ', '暂无分店')}</h3>
                    <p>{t('Establish your first retail location to get started.', 'បង្កើតទីតាំងលក់ដំបូងរបស់អ្នកដើម្បីចាប់ផ្តើម។', '建立您的第一个零售地点以开始。')}</p>
                    <button onClick={() => { setFormData({ _id: '', name: '', address: '', phone: '', adminName: '', adminEmail: '', adminPassword: '' }); setShowModal(true); }} className="btn btn-primary" style={{ marginTop: 16 }}><Plus size={16} /> {t('Add Branch', 'បន្ថែមសាខា', '添加分店')}</button>
                  </div>
                </td></tr>
              ) : branches.map(branch => (
                <tr key={branch._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        <Store size={18} />
                      </div>
                      <div style={{ fontWeight: 600 }}>{branch.name}</div>
                    </div>
                  </td>
                  <td>
                    {branch.address ? (
                      <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={14} className="text-muted" />{branch.address}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    {branch.phone ? (
                      <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Phone size={14} className="text-muted" />{branch.phone}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <span className="badge badge-success">{t('● Active', '● សកម្ម', '● 活跃')}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => { setFormData({ ...branch, adminName: '', adminEmail: '', adminPassword: '' }); setShowModal(true); }} className="btn btn-outline btn-sm btn-icon" title={t('Edit', 'កែសម្រួល', '编辑')}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(branch._id)} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} title={t('Delete', 'លុប', '删除')}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">{formData._id ? t('Edit Branch', 'កែសម្រួលសាខា', '编辑分店') : t('Add New Branch', 'បន្ថែមសាខាថ្មី', '添加新分店')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Two-column grid is maintained for both Create and Edit modes for consistent UI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                  
                  {/* Column 1: Branch Details */}
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Store size={18} /> {t('Branch Details', 'ព័ត៌មានលម្អិតសាខា', '分店详情')}
                    </h3>
                    
                    <div className="form-group">
                      <label className="form-label required">{t('Branch Name', 'ឈ្មោះសាខា', '分店名称')}</label>
                      <input className="form-control" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Headquarters" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('Address', 'អាសយដ្ឋាន', '地址')}</label>
                      <textarea className="form-control" rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder={t('Full address', 'អាសយដ្ឋានពេញ', '详细地址')} style={{ resize: 'none' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('Phone Number', 'លេខទូរស័ព្ទ', '电话号码')}</label>
                      <input className="form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="012 345 678" />
                    </div>
                  </div>

                  {/* Column 2: Admin Provisioning (Only for new branches) */}
                  {!formData._id ? (
                    <div style={{ background: 'var(--gray-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Key size={18} /> {t('Default Admin', 'អ្នកគ្រប់គ្រងលំនាំដើម', '默认管理员')}
                      </h3>
                      
                      <div className="form-group">
                        <label className="form-label required">{t('Admin Full Name', 'ឈ្មោះពេញអ្នកគ្រប់គ្រង', '管理员全名')}</label>
                        <input className="form-control" required value={formData.adminName} onChange={e => setFormData({ ...formData, adminName: e.target.value })} placeholder="Branch Manager" />
                      </div>
                      <div className="form-group">
                        <label className="form-label required">{t('Admin Email', 'អ៊ីមែលអ្នកគ្រប់គ្រង', '管理员邮箱')}</label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                          <input className="form-control" type="email" required style={{ paddingLeft: 38 }} value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })} placeholder="admin@branch.com" />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label required">{t('Admin Password', 'ពាក្យសម្ងាត់អ្នកគ្រប់គ្រង', '管理员密码')}</label>
                        <div style={{ position: 'relative' }}>
                          <Key size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                          <input className="form-control" type="password" required minLength={6} style={{ paddingLeft: 38 }} value={formData.adminPassword} onChange={e => setFormData({ ...formData, adminPassword: e.target.value })} placeholder={t('Min 6 characters', 'យ៉ាងតិច ៶ តួអក្សរ', '至少6个字符')} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--primary-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-100)', display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Store size={18} /> {t('Managing Admins', 'គ្រប់គ្រងអ្នកគ្រប់គ្រង', '管理管理员')}
                      </h3>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {t('Branch administrators are managed separately. You can assign or modify branch admins directly from the ', 'អ្នកគ្រប់គ្រងសាខាត្រូវបានគ្រប់គ្រងដាច់ដោយឡែកពីគ្នា។ អ្នកអាចកំណត់ ឬផ្លាស់ប្តូរអ្នកគ្រប់គ្រងសាខាដោយផ្ទាល់ពីផ្នែក ', '分店管理员是单独管理的。您可以直接在')}<strong>{t('User Management', 'គ្រប់គ្រងអ្នកប្រើប្រាស់', '用户管理')}</strong>{t(' section.', '។', '部分分配或修改分店管理员。')}
                      </p>
                    </div>
                  )}

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={saving}>{t('Cancel', 'បោះបង់', '取消')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('Saving…', 'កំពុងរក្សាទុក...', '保存中...') : formData._id ? t('Update Branch', 'កែសម្រួលសាខា', '更新分店') : t('Add Branch & Admin', 'បន្ថែមសាខា & អ្នកគ្រប់គ្រង', '添加分店及管理员')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
