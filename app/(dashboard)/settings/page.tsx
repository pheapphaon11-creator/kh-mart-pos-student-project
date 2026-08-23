'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Save, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';

interface Settings {
  storeName: string; storeNameKh: string; address: string; phone: string;
  email: string; taxRate: number; exchangeRate: number; receiptFooter: string;
  pointsPerDollar?: number; logo?: string;
}

interface Profile {
  name: string; email: string; password?: string;
}

export default function SettingsPage() {
  const { language } = useLanguage();
  const tr = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;
  const { data: session, update } = useSession();
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const { mode, color, setMode, setColor } = useTheme();
  
  const [settings, setSettings] = useState<Settings>({ 
    storeName: '', storeNameKh: '', address: '', phone: '', 
    email: '', taxRate: 0, exchangeRate: 0, receiptFooter: '',
    pointsPerDollar: 0, logo: ''
  });
  const [profile, setProfile] = useState<Profile>({ name: '', email: '', password: '' });
  
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'financial' | 'receipt'>('profile');

  const { data: remoteSettings, isLoading: loadingSettings } = useSWR(userRole === 'admin' ? '/api/settings' : null, { revalidateOnFocus: false, refreshInterval: 0 });
  const loading = loadingSettings && !remoteSettings;

  useEffect(() => {
    if (remoteSettings && !remoteSettings.error) {
      setSettings(prev => ({ ...prev, ...remoteSettings }));
    }
  }, [remoteSettings]);

  useEffect(() => {
    if (userRole) {
      setProfile({
        name: (session?.user as any)?.name || '',
        email: (session?.user as any)?.email || '',
        password: ''
      });
    }
  }, [userRole, session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'profile') {
        // Save Profile
        if (!userId) {
          throw new Error('User ID not found in session. Please log out and log back in.');
        }
        console.log('[SETTINGS] Saving profile for userId:', userId, 'activeTab:', activeTab, 'profile:', profile);
        const res = await fetch(`/api/users/${userId}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(profile) 
        });
        console.log('[SETTINGS] Response status:', res.status);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Update failed (HTTP ${res.status} ${res.statusText})`);
        }
        // Refresh the session token so sidebar/header update immediately
        await update({ name: profile.name, email: profile.email });
        toast.success('Profile updated successfully!');
      } else {
        // Save Settings
        const res = await fetch('/api/settings', { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(settings) 
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Save failed (HTTP ${res.status} ${res.statusText})`);
        }
        toast.success('Settings saved successfully!');
      }
    } catch (err: any) { 
      toast.error(err.message || 'Failed to save'); 
    }
    setSaving(false);
  };

  const tabs = [];
  
  // Profile tab is available for everyone
  tabs.push({ key: 'profile', label: tr('My Profile', 'គណនីរបស់ខ្ញុំ', '我的个人资料'), icon: <UserIcon size={18} /> });
  
  // Settings tabs only for admin (they manage the branch settings)
  if (userRole === 'admin') {
    tabs.push(
      { key: 'store', label: tr('Store Info', 'ព័ត៌មានហាង', '店铺信息'), icon: '🏪' },
      { key: 'financial', label: tr('Financial', 'ហិរញ្ញវត្ថុ', '财务设置'), icon: '💰' },
      { key: 'receipt', label: tr('Receipt', 'វិក្កយបត្រ', '收据'), icon: '🧾' }
    );
  }

  if (loading) return <SkeletonPage />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{userRole === 'superadmin' ? tr('Profile Settings', 'ការកំណត់គណនី', '个人设置') : tr('Settings', 'ការកំណត់', '设置')}</h1>
          <p>{userRole === 'superadmin' ? tr('Manage your super admin account', 'គ្រប់គ្រងគណនីអ្នកគ្រប់គ្រងកែអាណា', '管理您的超级管理员账户') : tr('Configure your store preferences', 'កំណត់ចំណូលចិត្តហាងរបស់អ្នក', '配置您的店铺偏好')}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {tr('Saving…', 'កំពុងរក្សាទុក...', '保存中...')}</> : <><Save size={16} /> {tr('Save Changes', 'រក្សាទុកការកែប្រែ', '保存更改')}</>}
        </button>
      </div>

      <div className="settings-layout-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 'var(--space-6)' }}>
        {/* Sidebar tabs */}
        <div className="card settings-tabs-container" style={{ padding: 'var(--space-3)', height: 'fit-content' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
              style={{ width: '100%', background: 'none', border: 'none', color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)', justifyContent: 'flex-start', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', width: 24 }}>{tab.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title flex items-center gap-2">
                {tabs.find(tab => tab.key === activeTab)?.icon} {tabs.find(tab => tab.key === activeTab)?.label}
              </div>
            </div>
          </div>
          <div className="card-body">
            
            {activeTab === 'profile' && (
              <div style={{ maxWidth: 500 }}>
                <div className="form-group">
                  <label className="form-label required">{tr('Full Name', 'ឈ្មោះពេញ', '姓名')}</label>
                  <input className="form-control" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Your Name" />
                </div>
                <div className="form-group">
                  <label className="form-label required">{tr('Email Address', 'អាសយដ្ឋានអ៊ីមែល', '邮箱地址')}</label>
                  <input className="form-control" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="you@example.com" />
                </div>
                
                <hr style={{ margin: 'var(--space-5) 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                
                <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>{tr('Change Password', 'ផ្លាស់ប្តូរពាក្យសម្ងាត់', '修改密码')}</h4>
                <div className="form-group">
                  <label className="form-label">{tr('New Password', 'ពាក្យសម្ងាត់ថ្មី', '新密码')}</label>
                  <input className="form-control" type="password" value={profile.password} onChange={e => setProfile({ ...profile, password: e.target.value })} placeholder={tr('Leave blank to keep current password', 'ទុកទតៃដើម្បីរក្សាពាក្យសម្ងាត់បច្ចុប្បន្ន', '留空保持当前密码')} />
                  <p className="form-hint">{tr('Must be at least 6 characters if you wish to change it.', 'ត្រូវមានយ៉ាងតិច ៶ តួអក្សរបើអ្នកចង់ផ្លាស់ប្តូរ។', '如需修改，至少需要6个字符。')}</p>
                </div>

                <hr style={{ margin: 'var(--space-5) 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>{tr('Theme Settings', 'ការកំណត់រចនាបថ', '主题设置')}</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{tr('Mode', 'របៀប', '模式')}</label>
                    <div style={{ display: 'flex', gap: 8, height: 42 }}>
                      {[
                        { id: 'light', icon: '☀️', label: tr('Light', 'ភ្លឺ', '浅色') },
                        { id: 'dark', icon: '🌙', label: tr('Dark', 'ងងឹត', '深色') },
                        { id: 'system', icon: '💻', label: tr('System', 'ប្រព័ន្ធ', '系统') }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMode(m.id as any)}
                          className={`btn ${mode === m.id ? 'btn-primary' : 'btn-outline'}`}
                          style={{ flex: 1, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s', border: mode === m.id ? 'none' : '1px solid var(--border)' }}
                        >
                          <span style={{ fontSize: 16 }}>{m.icon}</span>
                          <span style={{ fontWeight: mode === m.id ? 700 : 500 }}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tr('Primary Color', 'ពណ៌ចម្បង', '主色')}</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 42 }}>
                      {['green', 'blue', 'purple', 'orange', 'rose'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c as any)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: c === 'green' ? '#10b981' : c === 'blue' ? '#3b82f6' : c === 'purple' ? '#8b5cf6' : c === 'orange' ? '#f97316' : '#f43f5e',
                            border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                            cursor: 'pointer', transition: 'all 0.2s', padding: 0
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'store' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">{tr('Store Name (English)', 'ឈ្មោះហាង (អង់គ្លេស)', '店名 (英文)')}</label>
                    <input className="form-control" value={settings.storeName} onChange={e => setSettings({ ...settings, storeName: e.target.value })} placeholder="Your Store Name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">{tr('Store Name (Khmer)', 'ឈ្មោះហាង (ខ្មែរ)', '店名 (高棉语)')}</label>
                    <input className="form-control" value={settings.storeNameKh} onChange={e => setSettings({ ...settings, storeNameKh: e.target.value })} placeholder="ខេ អេស ម៉ាត" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{tr('Address', 'អាសយដ្ឋាន', '地址')}</label>
                  <textarea className="form-control" rows={2} value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} placeholder="No. 123, Street 271, Phnom Penh" />
                </div>
                <div className="form-group">
                  <label className="form-label">{tr('Store Logo', 'ឡូហ្គោហាង', '店铺标志')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 40, width: 40, objectFit: 'contain', background: 'white', borderRadius: 4, border: '1px solid var(--border)' }} />}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const MAX_WIDTH = 400;
                              const scaleSize = MAX_WIDTH / img.width;
                              canvas.width = MAX_WIDTH;
                              canvas.height = img.height * scaleSize;
                              const ctx = canvas.getContext('2d');
                              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                              const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                              setSettings({ ...settings, logo: resizedBase64 });
                            };
                            img.src = event.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{tr('Phone Number', 'លេខទូរស័ព្ទ', '电话号码')}</label>
                    <input className="form-control" value={settings.phone} onChange={e => setSettings({ ...settings, phone: e.target.value })} placeholder="+855 23 000 000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tr('Email', 'អ៊ីមែល', '邮箱')}</label>
                    <input className="form-control" type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} placeholder="info@khmart.com" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'financial' && (
              <>
                <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span style={{ fontSize: 32 }}>💱</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--primary)' }}>{tr('Exchange Rate Preview', 'អត្រាប្តូរប្រាក់', '汇率预览')}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>$1.00 USD = {settings.exchangeRate.toLocaleString()} KHR · $10.00 USD = {(settings.exchangeRate * 10).toLocaleString()} KHR</div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">{tr('USD to KHR Exchange Rate', 'អត្រាប្តូរប្រាក់ USD ទៅ KHR', '美元兑换瑞尔汇率')}</label>
                    <div className="input-group">
                      <span className="input-prefix" style={{ fontSize: 12 }}>1 USD =</span>
                      <input className="form-control" type="number" min="1" style={{ paddingLeft: 60 }} value={settings.exchangeRate} onChange={e => setSettings({ ...settings, exchangeRate: parseInt(e.target.value) || 4100 })} placeholder="4100" />
                    </div>
                    <p className="form-hint">{tr('Current market rate: approx. 4,050–4,150 KHR per USD', 'អត្រាទីផ្សារបច្ចុប្បន្ន: ប្រហែល ៤,០៥០–៤,១៥០ រៀលក្នុង ១ ដុល្លារ', '当前市场汇率：约4,050-4,150瑞尔/美元')}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tr('Tax Rate (%)', 'អត្រាពន្ធ (%)', '税率 (%)')}</label>
                    <div className="input-group has-suffix">
                      <input className="form-control" type="number" min="0" max="100" step="0.5" value={settings.taxRate} onChange={e => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })} placeholder="10" />
                      <span className="input-suffix">%</span>
                    </div>
                    <p className="form-hint">{tr('Set to 0 to disable tax calculation', 'កំណត់ជា ០ ដើម្បីបិទការគិតពន្ធ', '设为0以禁用税费计算')}</p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{tr('Loyalty Points Rate', 'អត្រាពិន្ទុស្មោះត្រង់', '积分率')}</label>
                    <div className="input-group has-suffix">
                      <input className="form-control" type="number" min="0" step="0.5" value={settings.pointsPerDollar} onChange={e => setSettings({ ...settings, pointsPerDollar: parseFloat(e.target.value) || 0 })} placeholder="1" />
                      <span className="input-suffix">{tr('pts / $1', 'ពិន្ទុ / $១', '分 / $1')}</span>
                    </div>
                    <p className="form-hint">{tr('Points earned per $1 spent', 'ពិន្ទុដែលទទួលក្នុង $១ ដែលចំណាយ', '每花费$1获得的积分')}</p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'receipt' && (
              <>
                <div className="form-group">
                  <label className="form-label">{tr('Receipt Footer Message', 'សារបាតក្រោមវិក្កយបត្រ', '收据底部信息')}</label>
                  <textarea className="form-control" rows={3} value={settings.receiptFooter} onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })} placeholder={`អរគុណសម្រាប់ការទិញទំនិញ!\nThank you for shopping at ${settings.storeName || 'Rith Mart'}!`} />
                  <p className="form-hint">{tr('This message appears at the bottom of every printed receipt', 'សារនេះនឹងបង្ហាញនៅក្រោមវិក្កយបត្ររាល់តែដែលបានបោះពុម្ព', '此消息显示在每张打印收据的底部')}</p>
                </div>

                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tr('Receipt Preview', 'ប្រាក់តែវិក្កយបត្រ', '收据预览')}</div>
                  <div className="receipt" style={{ maxWidth: 280 }}>
                    {settings.logo && <div className="receipt-center"><img src={settings.logo} alt="Logo" style={{ maxWidth: '60%', maxHeight: 60, objectFit: 'contain', margin: '0 auto 4px' }} /></div>}
                    <div className="receipt-center" style={{ fontWeight: 700, fontSize: 14 }}>{!settings.logo && '🛒 '}{settings.storeNameKh || 'ហាង'}</div>
                    <div className="receipt-center" style={{ fontSize: 11 }}>{settings.storeName || 'Store'}</div>
                    <div className="receipt-center" style={{ fontSize: 10, color: '#666' }}>{settings.address}</div>
                    <div className="receipt-center" style={{ fontSize: 10, color: '#666' }}>{settings.phone}</div>
                    <div className="receipt-line" />
                    <div className="receipt-row"><span>Invoice:</span><span>INV-20260821-1234</span></div>
                    <div className="receipt-row"><span>Cashier:</span><span>Sok Dara</span></div>
                    <div className="receipt-line" />
                    <div>Angkor Beer 330ml</div>
                    <div className="receipt-row" style={{ color: '#666' }}><span>2 x $1.25</span><span>$2.50</span></div>
                    <div className="receipt-line" />
                    <div className="receipt-row receipt-total"><span>TOTAL:</span><span>$2.50</span></div>
                    <div className="receipt-row" style={{ fontSize: 10, color: '#666' }}><span></span><span>{(2.50 * settings.exchangeRate).toLocaleString()} ៛</span></div>
                    {settings.taxRate > 0 && <div className="receipt-row" style={{ fontSize: 10 }}><span>Tax ({settings.taxRate}%):</span><span>${(2.50 * settings.taxRate / 100).toFixed(2)}</span></div>}
                    <div className="receipt-line" />
                    <pre className="receipt-center" style={{ fontSize: 10, fontFamily: 'inherit', margin: 0 }}>{settings.receiptFooter || `អរគុណសម្រាប់ការទិញទំនិញ!\nThank you for shopping at ${settings.storeName || 'Rith Mart'}!`}</pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
