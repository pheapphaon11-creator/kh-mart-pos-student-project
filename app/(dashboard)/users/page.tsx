'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCheck, UserX, Shield } from 'lucide-react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';
import { useConfirm } from '@/context/ConfirmContext';

type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier';

interface User {
  _id: string; name: string; email: string; role: UserRole; isActive: boolean; createdAt: string;
}

const ROLES = ['superadmin', 'admin', 'manager', 'cashier'] as const;
const roleColors: Record<string, string> = { superadmin: 'badge-purple', admin: 'badge-danger', manager: 'badge-warning', cashier: 'badge-success' };

export default function UsersPage() {
  const { confirm } = useConfirm();
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const { data: session } = useSession();
  const currentRole = (session?.user as any)?.role;
  const isSuperadmin = currentRole === 'superadmin';

  const { data: usersData, mutate: mutateUsers, isLoading: loadingUsers } = useSWR('/api/users');
  const { data: branchesData } = useSWR(isSuperadmin ? '/api/branches' : null);
  
  const loading = loadingUsers && !usersData;
  const users: User[] = usersData || [];
  const branches: any[] = branchesData || [];

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: UserRole; isActive: boolean, branchId: string }>(
    { name: '', email: '', password: '', role: 'cashier', isActive: true, branchId: '' }
  );

  if (!['admin', 'superadmin'].includes(currentRole)) {
    return (
      <div className="empty-state" style={{ marginTop: 'var(--space-12)' }}>
        <div className="empty-state-icon">🔒</div>
        <h3>{t('Access Restricted', 'ការចូលប្រើត្រូវបានដាក់កម្រិត', '访问受限')}</h3>
        <p>{t('Only administrators can manage users.', 'មានតែអ្នកគ្រប់គ្រងទេដែលអាចគ្រប់គ្រងអ្នកប្រើប្រាស់។', '只有管理员可以管理用户。')}</p>
      </div>
    );
  }


  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'cashier', isActive: true, branchId: '' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive, branchId: (u as any).branch || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    if (!editing && !form.password) { toast.error('Password is required for new users'); return; }
    setSaving(true);
    try {
      const body: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive };
      if (form.password) body.password = form.password;
      if (currentRole === 'superadmin' && form.role !== 'superadmin' && form.branchId) body.branch = form.branchId;
      
      const url = editing ? `/api/users/${editing._id}` : '/api/users';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(editing ? 'User updated!' : 'User created!');
      setShowModal(false);
      mutateUsers();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const toggleActive = async (u: User) => {
    try {
      await fetch(`/api/users/${u._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }) });
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
      mutateUsers();
    } catch { toast.error('Failed to update'); }
  };

  const deleteUser = async (u: User) => {
    if (!(await confirm(`Are you sure you want to permanently delete user ${u.name}?`))) return;
    try {
      const res = await fetch(`/api/users/${u._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      toast.success('User deleted successfully');
      mutateUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('User Management', 'គ្រប់គ្រងអ្នកប្រើប្រាស់', '用户管理')}</h1>
          <p>{users.length} {t('users', 'អ្នកប្រើប្រាស់', '用户')} · {users.filter(u => u.isActive).length} {t('active', 'សកម្ម', '活跃')}</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> {t('Add User', 'បន្ថែមអ្នកប្រើប្រាស់', '添加用户')}</button>
      </div>

      {loading ? (
        <SkeletonPage />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {users.map(u => (
            <div key={u._id} className="card" style={{ padding: 'var(--space-5)', opacity: u.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: u.role === 'admin' ? 'linear-gradient(135deg,#dc2626,#ef4444)' : u.role === 'manager' ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <span className={`badge ${roleColors[u.role]}`}><Shield size={11} /> {u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span>
                <span className={`badge ${u.isActive ? 'badge-success' : 'badge-gray'}`}>{u.isActive ? t('● Active', '● សកម្ម', '● 活跃') : t('○ Inactive', '○ អសកម្ម', '○ 停用')}</span>
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                {t('Joined', 'ចូលរួម', '加入于')} {new Date(u.createdAt).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button onClick={() => openEdit(u)} className="btn btn-outline btn-sm" style={{ flex: 1 }}><Edit2 size={14} /> {t('Edit', 'កែសម្រួល', '编辑')}</button>
                <button onClick={() => toggleActive(u)} className={`btn btn-sm btn-icon ${u.isActive ? 'btn-ghost' : 'btn-outline'}`} title={u.isActive ? 'Deactivate' : 'Activate'} style={{ color: u.isActive ? 'var(--warning)' : 'var(--success)' }}>
                  {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
                <button onClick={() => deleteUser(u)} className="btn btn-sm btn-icon btn-ghost" title="Delete User" style={{ color: 'var(--danger)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? t('Edit User', 'កែសម្រួលអ្នកប្រើប្រាស់', '编辑用户') : t('Add User', 'បន្ថែមអ្នកប្រើប្រាស់', '添加用户')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">{t('Full Name', 'ឈ្មោះពេញ', '姓名')}</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sok Dara" />
              </div>
              <div className="form-group">
                <label className="form-label required">{t('Email', 'អ៊ីមែល', '邮箱')}</label>
                <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@khmart.com" disabled={!!editing} />
              </div>
              <div className="form-group">
                <label className={`form-label ${!editing ? 'required' : ''}`}>{t('Password', 'ពាក្យសម្ងាត់', '密码')}</label>
                <input 
                  className="form-control" 
                  type="password" 
                  value={form.password} 
                  onChange={e => setForm({ ...form, password: e.target.value })} 
                  placeholder={editing ? t('Leave blank to keep current password', 'ទុកទតៃដើម្បីរក្សាពាក្យសម្ងាត់បច្ចុប្បន្ន', '留空保持当前密码') : t('Min 6 characters', 'យ៉ាងតិច ៶ តួអក្សរ', '至少6个字符')} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Role', 'តួនាទី', '角色')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {ROLES.filter(r => currentRole === 'superadmin' ? true : r !== 'superadmin').map(role => (
                    <button key={role} type="button" onClick={() => setForm({ ...form, role })}
                      style={{ padding: '10px 0', border: `2px solid ${form.role === role ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: form.role === role ? 'var(--primary-50)' : 'white', color: form.role === role ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--font-size-sm)', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {role === 'superadmin' ? '🌍' : role === 'admin' ? '👑' : role === 'manager' ? '📊' : '🛒'}<br />{role}
                    </button>
                  ))}
                </div>
              </div>
              
              {currentRole === 'superadmin' && form.role !== 'superadmin' && (
                <div className="form-group">
                  <label className="form-label required">{t('Assign to Branch', 'កំណត់សាខា', '分配到分店')}</label>
                  <select 
                    className="form-control" 
                    value={form.branchId} 
                    onChange={e => setForm({...form, branchId: e.target.value})}
                    required
                  >
                    <option value="">{t('Select a branch...', 'ជ្រើសរើសសាខា...', '选择分店...')}</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {editing && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                    User is Active
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>{t('Cancel', 'បោះបង់', '取消')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? t('Saving…', 'កំពុងរក្សាទុក...', '保存中...') : editing ? t('Update User', 'កែសម្រួល', '更新用户') : t('Create User', 'បង្កើតអ្នកប្រើប្រាស់', '创建用户')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
