'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import useSWR from 'swr';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Users, TruckIcon,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, UserCircle, Store,
  History,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', translationKey: 'dashboard', icon: LayoutDashboard, href: '/', section: 'main', hideFromSuperadmin: true },
  { label: 'POS Terminal', translationKey: 'pos_terminal', icon: ShoppingCart, href: '/pos', section: 'main', badge: 'LIVE', hideFromSuperadmin: true },
  { label: 'Products', translationKey: 'products', icon: Package, href: '/products', section: 'inventory', hideFromSuperadmin: true },
  { label: 'Categories', translationKey: 'categories', icon: Tag, href: '/categories', section: 'inventory', hideFromSuperadmin: true },
  { label: 'Stock Adjustments', translationKey: 'stock_adjustment', icon: History, href: '/inventory', section: 'inventory', hideFromSuperadmin: true },
  { label: 'Sales', translationKey: 'sales', icon: BarChart3, href: '/sales', section: 'reports', hideFromSuperadmin: true },
  { label: 'Customers', translationKey: 'customers', icon: Users, href: '/customers', section: 'crm', hideFromSuperadmin: true },
  { label: 'Suppliers', translationKey: 'suppliers', icon: TruckIcon, href: '/suppliers', section: 'crm', hideFromSuperadmin: true },
  { label: 'Users', translationKey: 'users', icon: UserCircle, href: '/users', section: 'admin', adminOnly: true, hideFromSuperadmin: true },
  { label: 'Branches', translationKey: 'branches', icon: Store, href: '/branches', section: 'admin', superadminOnly: true },
  { label: 'Settings', translationKey: 'settings', icon: Settings, href: '/settings', section: 'admin', adminOnly: true },
];

const sections = [
  { key: 'main', translationKey: 'main_menu' },
  { key: 'inventory', translationKey: 'inventory' },
  { key: 'reports', translationKey: 'sales' },
  { key: 'crm', translationKey: 'customers' },
  { key: 'admin', translationKey: 'admin_sec' },
];

export default function Sidebar({ initialSettings }: { initialSettings?: any }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Use SWR to share cache with other pages
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: settings } = useSWR('/api/settings', fetcher, { fallbackData: initialSettings });
  
  const logoUrl = settings?.logo;
  const storeName = settings?.storeName;

  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    window.addEventListener('toggleMobileMenu', handleToggle);
    return () => window.removeEventListener('toggleMobileMenu', handleToggle);
  }, []);

  const userRole = (session?.user as any)?.role || 'cashier';
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <>
    {/* Mobile Overlay */}
    {mobileOpen && (
      <div 
        className="sidebar-mobile-overlay" 
        onClick={() => setMobileOpen(false)}
      />
    )}
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', background: 'white', padding: 2 }} />
        ) : (
          <div className="sidebar-logo-icon">🛒</div>
        )}
        <div className="sidebar-logo-text">
          <h2>{storeName || 'KH Mart'}</h2>
          <p>POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {status !== 'loading' && sections.map((section) => {
          const items = navItems.filter((item: any) => {
            if (item.section !== section.key) return false;
            if (item.superadminOnly && userRole !== 'superadmin') return false;
            if (item.adminOnly && !['admin', 'superadmin'].includes(userRole)) return false;
            if (item.hideFromSuperadmin && userRole === 'superadmin') return false;
            return true;
          });
          if (items.length === 0) return null;

          return (
            <div key={section.key}>
              <div className="nav-section-label">{t(section.translationKey)}</div>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon">
                      <Icon size={18} />
                    </span>
                    <span className="nav-label">{t(item.translationKey)}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info">
            <div className="user-name">{session?.user?.name}</div>
            <div className="user-role">{userRole}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title={t('logout')}
            style={{ color: 'var(--gray-400)', marginLeft: 'auto' }}
          >
            <LogOut size={16} />
          </button>
        </div>

        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          style={{ marginTop: 'var(--space-3)', width: '100%', height: 32 }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
    </>
  );
}
