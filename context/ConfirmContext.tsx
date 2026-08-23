'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { AlertCircle } from 'lucide-react';

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (message: string, options?: Omit<ConfirmOptions, 'message'>) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { language } = useLanguage();
  const t = (en: string, kh: string, zh: string) => language === 'kh' ? kh : language === 'zh' ? zh : en;

  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>();

  const confirm = useCallback((message: string, overrideOptions?: Omit<ConfirmOptions, 'message'>) => {
    setOptions({ message, ...overrideOptions });
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolvePromise) resolvePromise(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolvePromise) resolvePromise(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
          <div className="modal" style={{ maxWidth: 400, animation: 'slideUp 0.2s ease-out forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ 
                width: 40, height: 40, borderRadius: '50%', 
                background: 'var(--danger-50)', color: 'var(--danger)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <AlertCircle size={20} />
              </div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {options.title || t('Confirm Action', 'បញ្ជាក់សកម្មភាព', '确认操作')}
              </h2>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
              {options.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button className="btn btn-ghost" onClick={handleCancel}>
                {options.cancelText || t('Cancel', 'បោះបង់', '取消')}
              </button>
              <button className="btn btn-danger" onClick={handleConfirm}>
                {options.confirmText || t('Confirm', 'យល់ព្រម', '确认')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
