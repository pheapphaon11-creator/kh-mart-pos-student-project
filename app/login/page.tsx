'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, ShoppingCart, Lock, Mail, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Language } from '@/lib/translations';

export default function LoginPage() {
  const { language, setLanguage } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(t('Invalid email or password. Please try again.', 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។ សូមព្យាយាមម្តងទៀត។', '邮箱或密码无效。请重试。'));
        setLoading(false);
      } else {
        if (email === 'superadmin@khmart.com') {
          router.push('/branches');
        } else {
          router.push('/');
        }
        router.refresh();
        // Do NOT call setLoading(false) here, let it stay loading until the route changes
      }
    } catch {
      setError(t('An unexpected error occurred. Please try again.', 'មានបញ្ហាមិនរំពឹងទុកកើតឡើង។ សូមព្យាយាមម្តងទៀត។', '发生了意外错误。请重试。'));
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '8px' }}>
        {(['en', 'kh', 'zh'] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`btn btn-sm ${language === lang ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '6px 10px', fontSize: '13px' }}
          >
            {lang === 'en' ? 'EN' : lang === 'kh' ? 'ខ្មែរ' : '中文'}
          </button>
        ))}
      </div>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🛒</div>
          <div className="login-logo-text">
            <h1>{t('POS System', 'ប្រព័ន្ធលក់ទំនិញ', 'POS 系统')}</h1>
            <p>{t('Point of Sale System', 'ប្រព័ន្ធលក់ទំនិញ', '销售点系统')}</p>
          </div>
        </div>
        
        <h2 className="login-title">{t('Welcome back 👋', 'សូមស្វាគមន៍ការត្រឡប់មកវិញ 👋', '欢迎回来 👋')}</h2>
        <p className="login-subtitle">{t('Sign in to your account to continue', 'ចូលគណនីរបស់អ្នកដើម្បីបន្ត', '登录您的帐户以继续')}</p>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required">{t('Email Address', 'អាសយដ្ឋានអ៊ីមែល', '电子邮箱')}</label>
            <div className="input-group" style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-400)',
                  zIndex: 1,
                }}
              />
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: 40 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">{t('Password', 'ពាក្យសម្ងាត់', '密码')}</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-400)',
                  zIndex: 1,
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingLeft: 40, paddingRight: 40 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-400)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: 'var(--space-6)' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                {t('Signing in...', 'កំពុងចូល...', '登录中...')}
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                {t('Sign In to POS', 'ចូលប្រព័ន្ធ POS', '登录POS系统')}
              </>
            )}
          </button>
        </form>

      </div>

      {loading && (
        <div className="login-loading-overlay">
          <div className="login-loading-content">
            <div className="login-logo-icon">🛒</div>
            <h3>{t('Signing in...', 'កំពុងចូល...', '登录中...')}</h3>
            <p>{t('Please wait a moment', 'សូមរង់ចាំបន្តិច', '请稍候')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
