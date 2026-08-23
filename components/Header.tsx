'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';

interface HeaderProps {
  sidebarCollapsed?: boolean;
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
  const [exchangeRate, setExchangeRate] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setHasUnread(data.notifications.some((n: any) => !n.isRead));
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PUT' });
      setHasUnread(false);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.exchangeRate) setExchangeRate(data.exchangeRate);
      } catch {}
    };
    fetchSettings();
    fetchNotifications();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    tick();
    
    const clockInterval = setInterval(tick, 1000);
    const notifInterval = setInterval(fetchNotifications, 60000);
    
    return () => {
      clearInterval(clockInterval);
      clearInterval(notifInterval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === 'superadmin';
  const { language, setLanguage } = useLanguage();

  return (
    <header className={`header ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="header-left">
        <button 
          className="mobile-menu-btn" 
          onClick={() => window.dispatchEvent(new Event('toggleMobileMenu'))}
        >
          <Menu size={20} />
        </button>
        {!isSuperAdmin && (
          <div className="header-search">
            <Search className="header-search-icon" />
            <input type="text" placeholder="Search products, invoices, customers..." />
          </div>
        )}
      </div>

      <div className="header-right">
        {!isSuperAdmin && exchangeRate > 0 && (
          <div className="exchange-rate-badge">
            <span>💱</span>
            <span>1 USD = {exchangeRate.toLocaleString()} KHR</span>
          </div>
        )}

        {/* Language Selector */}
        <div className="language-selector">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as any)}
            className="lang-select"
          >
            <option value="kh">🇰🇭 ភាសាខ្មែរ</option>
            <option value="en">🇺🇸 English</option>
            <option value="zh">🇨🇳 中文</option>
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-primary)',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            background: 'var(--gray-100)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.5px'
          }}
        >
          <span style={{ fontSize: '18px' }}>🕒</span>
          {currentTime}
        </div>

        {!isSuperAdmin && (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button className="header-icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={17} />
              {hasUnread && <span className="badge-dot" />}
            </button>
            
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '280px',
                background: 'white',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                zIndex: 1000
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Notifications
                  {hasUnread && (
                    <span onClick={markAllRead} style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer' }}>Mark all read</span>
                  )}
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n._id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', background: n.isRead ? 'transparent' : 'var(--gray-50)' }}>
                        <div style={{ fontSize: '13px', fontWeight: n.isRead ? 500 : 700, color: 'var(--text)' }}>{n.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{n.message}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      You have no new notifications.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
