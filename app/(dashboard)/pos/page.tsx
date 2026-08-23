'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, X, User, Percent, ChevronDown, Printer, Smartphone } from 'lucide-react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useLanguage } from '@/context/LanguageContext';
import { SkeletonPage, SkeletonTable } from '@/components/Skeleton';

interface Category { _id: string; name: string; nameKh: string; icon: string; }
interface Product { _id: string; name: string; nameKh: string; sku: string; barcode?: string; priceUsd: number; stock: number; minStock: number; unit: string; category: Category; }
interface CartItem extends Product { qty: number; subtotalUsd: number; }
interface Customer { _id: string; name: string; phone: string; loyaltyPoints: number; }

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'aba', label: 'ABA Pay', icon: '🏦' },
  { id: 'wing', label: 'Wing', icon: '🏦' },
  { id: 'acleda', label: 'ACLEDA', icon: '🏦' },
];

export default function POSPage() {
  const { data: session } = useSession();
  const { t, language } = useLanguage();
  const barcodeRef = useRef<HTMLInputElement>(null);

  // SWR Data Fetching
  const { data: catsData } = useSWR('/api/categories', fetcher);
  const { data: prodsData, mutate: mutateProducts } = useSWR('/api/products?limit=100', fetcher);
  const { data: custsData } = useSWR('/api/customers?limit=100', fetcher);
  const { data: setsData } = useSWR('/api/settings', fetcher);

  const categories: Category[] = Array.isArray(catsData) ? catsData : (catsData?.categories || []);
  const products: Product[] = prodsData?.products || [];
  const customers: Customer[] = custsData?.customers || [];
  const settings = { exchangeRate: 4100, taxRate: 0, storeName: '', storeNameKh: '', address: '', phone: '', receiptFooter: '', ...setsData };

  const loading = !catsData || !prodsData || !custsData || !setsData;

  // UI state
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Mobile scanner states
  const [showScanQrModal, setShowScanQrModal] = useState(false);
  const [scanUrl, setScanUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [note, setNote] = useState('');

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<'USD'|'KHR'>('USD');
  const [processing, setProcessing] = useState(false);

  // Receipt modal
  const [lastSale, setLastSale] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Calculations
  const round2 = (num: number) => Number((num || 0).toFixed(2));

  const subtotal = round2(cart.reduce((s, i) => s + i.subtotalUsd, 0));
  const discountUsd = round2(subtotal * (discountPercent / 100));
  const taxableAmount = round2(subtotal - discountUsd);
  const taxUsd = round2(taxableAmount * (settings.taxRate / 100));
  const totalUsd = round2(taxableAmount + taxUsd);
  const totalKhr = Math.round(totalUsd * settings.exchangeRate);
  const parsedAmountPaid = parseFloat(amountPaid) || 0;
  const amountPaidUsdCalc = round2(paymentCurrency === 'KHR' ? parsedAmountPaid / settings.exchangeRate : parsedAmountPaid);
  const changeUsd = Math.max(0, round2(amountPaidUsdCalc - totalUsd));

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category?._id === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.nameKh.includes(search) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    return matchCat && matchSearch && p.stock > 0;
  });

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) { toast.error('Out of stock!'); return; }
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) {
        if (existing.qty >= product.stock) { toast.error('Max stock reached!'); return prev; }
        return prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1, subtotalUsd: Number(((i.qty + 1) * i.priceUsd).toFixed(2)) } : i);
      }
      return [...prev, { ...product, qty: 1, subtotalUsd: Number(product.priceUsd.toFixed(2)) }];
    });
  }, []);

  // Barcode scan handler
  const scannerSessionId = useRef(Math.random().toString(36).substring(2, 15));

  // Poll phone barcode scanner queue and input into the text field
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/pos/scan?sessionId=${scannerSessionId.current}`);
        if (res.ok) {
          const data = await res.json();
          if (data.scannedBarcode) {
            // Push barcode to input box (triggers the auto-submit effect)
            setBarcodeInput(data.scannedBarcode);
          }
        }
      } catch (err) {
        console.error('Mobile scanner poll error', err);
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Unified Auto-Submit Barcode Handler (handles manual entry, physical USB scanners, and mobile companion scans)
  useEffect(() => {
    const input = barcodeInput.trim();
    if (!input) return;

    // 1. Direct local search: check if barcode or SKU matches loaded products exactly
    const found = products.find(p => p.barcode === input || p.sku === input.toUpperCase());
    if (found) {
      addToCart(found);
      toast.success(`Scanned: ${found.name}`);
      setBarcodeInput('');
      return;
    }

    // 2. Database fallback search: if it is a numeric barcode of valid length, fetch from server
    if (input.length >= 8 && /^\d+$/.test(input)) {
      const timer = setTimeout(async () => {
        try {
          const dbRes = await fetch(`/api/products?search=${encodeURIComponent(input)}&limit=1`);
          if (dbRes.ok) {
            const dbData = await dbRes.json();
            const matched = dbData.products?.[0];
            if (matched && (matched.barcode === input || matched.sku === input.toUpperCase())) {
              addToCart(matched);
              toast.success(`Scanned: ${matched.name}`);
              setBarcodeInput('');
            }
          }
        } catch (e) {
          console.error('Database search error', e);
        }
      }, 400); // 400ms debounce to wait for complete scanner keyboard inputs to finish typing

      return () => clearTimeout(timer);
    }
  }, [barcodeInput, products, addToCart]);

  const openScanQr = async () => {
    setLoadingQr(true);
    setShowScanQrModal(true);
    try {
      const res = await fetch(`/api/pos/scan/ip?sessionId=${scannerSessionId.current}`);
      if (res.ok) {
        const data = await res.json();
        setScanUrl(data.scanUrl);
      } else {
        toast.error('Failed to get server configuration');
      }
    } catch {
      toast.error('Network error fetching configuration');
    } finally {
      setLoadingQr(false);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i._id !== id) return i;
      const newQty = Math.max(0, Math.min(i.qty + delta, i.stock));
      if (newQty === 0) return null as any;
      return { ...i, qty: newQty, subtotalUsd: Number((newQty * i.priceUsd).toFixed(2)) };
    }).filter(Boolean));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i._id !== id));
  const clearCart = () => { setCart([]); setSelectedCustomer(null); setDiscountPercent(0); setNote(''); };

  // Barcode scan handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = products.find(p => p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim().toUpperCase());
    if (found) { addToCart(found); toast.success(`Added: ${found.name}`); }
    else { toast.error('Product not found'); }
    setBarcodeInput('');
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  ).slice(0, 8);

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (!amountPaid && paymentMethod === 'cash') { toast.error('Enter amount paid'); return; }
    if (paymentMethod === 'cash' && amountPaidUsdCalc < totalUsd - 0.005) { toast.error('Amount paid is less than total'); return; }

    setProcessing(true);
    try {
      const body = {
        items: cart.map(i => ({ product: i._id, name: i.name, nameKh: i.nameKh, sku: i.sku, qty: i.qty, priceUsd: i.priceUsd, subtotalUsd: i.subtotalUsd })),
        subtotalUsd: subtotal,
        discountPercent,
        discountUsd,
        taxPercent: settings.taxRate,
        taxUsd,
        totalUsd,
        totalKhr,
        exchangeRate: settings.exchangeRate,
        paymentMethod,
        amountPaidUsd: paymentMethod === 'cash' ? amountPaidUsdCalc : totalUsd,
        changeUsd: paymentMethod === 'cash' ? changeUsd : 0,
        customer: selectedCustomer?._id,
        note,
        status: 'completed',
      };

      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Sale failed');
      const sale = await res.json();

      setLastSale({ ...sale, items: cart, cashier: session?.user, customer: selectedCustomer, settings });
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();
      setAmountPaid('');
      toast.success(`Sale completed! ${changeUsd > 0 ? `Change: $${changeUsd.toFixed(2)}` : ''}`);
      mutateProducts(); // Background refresh products to update local stock
    } catch (e: any) { toast.error(e.message || 'Checkout failed'); }
    setProcessing(false);
  };

  const printReceipt = () => {
    if (!lastSale) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) {
      document.body.removeChild(iframe);
      toast.error('Could not initialize print frame.');
      return;
    }

    win.document.open();
    win.document.write(`
      <html><head><title>Receipt - ${lastSale.invoiceNo || 'N/A'}</title>
      <style>
      @page { margin: 0; }
      html, body { width: 100%; max-width: 80mm; margin: 0 auto; padding: 12px; font-family: 'Courier New', monospace; font-size: 12pt; color: #000; background: #fff; }
      * { box-sizing: border-box; }
      .c { text-align: center; } .b { font-weight: bold; }
      .l { border-top: 2px dashed #000; margin: 12px 0; }
      .r { display: flex; justify-content: space-between; margin: 6px 0; }
      .t { font-size: 14pt; font-weight: bold; }
      .title { font-size: 18pt; font-weight: bold; margin-bottom: 4px; }
      .subtitle { font-size: 11pt; margin-bottom: 2px; }
      .muted { color: #333; font-size: 10pt; }
      </style></head>
      <body>
        <div class="c">
          ${lastSale.settings?.logo ? `<img src="${lastSale.settings.logo}" style="max-width: 80%; max-height: 80px; object-fit: contain; margin-bottom: 8px;" />` : '<span style="font-size: 24px;">🛒</span>'}
        </div>
        <div class="c title">${lastSale.settings?.storeNameKh || 'ហាង'}</div>
        <div class="c subtitle">${lastSale.settings?.storeName || 'Store'}</div>
        <div class="c muted">${lastSale.settings?.address || ''}</div>
        <div class="c muted">${lastSale.settings?.phone || ''}</div>
        <div class="l"></div>
        <div class="r"><span>Invoice:</span><span class="b">${lastSale.invoiceNo || '—'}</span></div>
        <div class="r"><span>Date:</span><span>${lastSale.createdAt ? new Date(lastSale.createdAt).toLocaleString() : ''}</span></div>
        <div class="r"><span>Cashier:</span><span>${lastSale.cashier?.name || '—'}</span></div>
        ${lastSale.customer ? `<div class="r"><span>Customer:</span><span>${lastSale.customer.name || ''}</span></div>` : ''}
        <div class="l"></div>
        ${(lastSale.items || []).map((item: any) => `
          <div class="b">${item.product?.nameKh || item.product?.name || 'Item'}</div>
          ${item.product?.nameKh ? `<div>${item.product?.name}</div>` : ''}
          <div class="r" style="color:#555"><span>${item.qty || 1} × $${Number(item.priceUsd || 0).toFixed(2)}</span><span>$${Number(item.subtotalUsd || 0).toFixed(2)}</span></div>
        `).join('')}
        <div class="l"></div>
        <div class="r"><span>Subtotal:</span><span>$${Number(lastSale.subtotalUsd || 0).toFixed(2)}</span></div>
        ${Number(lastSale.discountUsd || 0) > 0 ? `<div class="r"><span>Discount (${lastSale.discountPercent || 0}%):</span><span>-$${Number(lastSale.discountUsd || 0).toFixed(2)}</span></div>` : ''}
        ${Number(lastSale.taxUsd || 0) > 0 ? `<div class="r"><span>Tax (${lastSale.taxPercent || 0}%):</span><span>$${Number(lastSale.taxUsd || 0).toFixed(2)}</span></div>` : ''}
        <div class="l"></div>
        <div class="r t"><span>TOTAL:</span><span>$${Number(lastSale.totalUsd || 0).toFixed(2)}</span></div>
        <div class="r muted"><span></span><span>${Number(lastSale.totalKhr || 0).toLocaleString()} ៛</span></div>
        <div class="l"></div>
        <div class="r"><span>Payment:</span><span>${String(lastSale.paymentMethod || '').toUpperCase()}</span></div>
        ${lastSale.paymentMethod === 'cash' ? `<div class="r"><span>Amount Paid:</span><span>$${Number(lastSale.amountPaidUsd ?? lastSale.totalUsd ?? 0).toFixed(2)}</span></div>
        <div class="r"><span>Cash Back:</span><span>$${Number(lastSale.changeUsd || 0).toFixed(2)}</span></div>` : ''}
        <div class="l"></div>
        <pre class="c subtitle" style="font-family: inherit; margin: 0;">${lastSale.settings?.receiptFooter || `អរគុណសម្រាប់ការទិញទំនិញ!\nThank you for shopping at ${lastSale.settings?.storeName || 'Rith Mart'}!`}</pre>
      </body></html>
    `);
    win.document.close();
    
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="pos-layout">
      {/* LEFT: Product Panel */}
      <div className="pos-products card" style={{ overflow: 'hidden' }}>
        {/* Search & Barcode */}
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Search className="search-input-icon" size={16} style={{ color: 'var(--gray-500)' }} />
            <input 
              placeholder={t('search_product_placeholder')} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              autoFocus 
              className="form-control"
              style={{ paddingLeft: 36, borderRadius: 'var(--radius-lg)', width: '100%' }}
            />
          </div>
          <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input 
              ref={barcodeRef} 
              className="form-control" 
              value={barcodeInput} 
              onChange={e => setBarcodeInput(e.target.value)} 
              placeholder={t('scan_barcode_placeholder')} 
              style={{ flex: 1, borderRadius: 'var(--radius-lg)', minWidth: 0 }} 
            />
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)' }}>{t('add_btn')}</button>
            <button 
              type="button" 
              onClick={openScanQr} 
              className="btn btn-outline" 
              style={{ borderRadius: 'var(--radius-lg)', display: 'inline-flex', alignItems: 'center', gap: 6, height: 42 }}
              title={t('mobile_scan_title')}
            >
              <Smartphone size={16} />
              <span>{t('mobile_scan')}</span>
            </button>
          </form>
        </div>

        {/* Category Tabs */}
        <div 
          className="pos-category-tabs"
          onWheel={(e) => {
            const container = e.currentTarget;
            if (e.deltaY !== 0) {
              container.scrollLeft += e.deltaY;
            }
          }}
        >
          <button onClick={() => setActiveCategory('all')} className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}>🏷️ {language === 'kh' ? 'ទាំងអស់' : language === 'zh' ? '全部' : 'All'}</button>
          {categories.map(c => (
            <button key={c._id} onClick={() => setActiveCategory(c._id)} className={`category-tab ${activeCategory === c._id ? 'active' : ''}`}>
              {c.icon} {language === 'kh' ? (c.nameKh || c.name) : c.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="product-grid">
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>{language === 'kh' ? 'រកមិនឃើញទំនិញទេ' : language === 'zh' ? '未找到商品' : 'No products found'}</div>
            </div>
          ) : filteredProducts.map(product => (
            <div key={product._id} className={`product-card ${product.stock === 0 ? 'out-of-stock' : ''}`} onClick={() => addToCart(product)}>
              {product.stock <= product.minStock && product.stock > 0 && (
                <span className="product-stock-tag badge-warning" style={{ background: 'var(--warning-50)', color: 'var(--warning)' }}>Low</span>
              )}
              <div className="product-emoji">{product.category?.icon || '📦'}</div>
              <div className="product-name" title={language === 'kh' ? (product.nameKh || product.name) : product.name} style={{ fontWeight: 700, fontSize: 13, minHeight: 38 }}>
                {language === 'kh' ? (product.nameKh || product.name) : (product.name || product.nameKh)}
              </div>
              <div className="product-price">${product.priceUsd.toFixed(2)}</div>
              <div className="product-stock-text" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{product.stock} {product.unit} left</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Cart Panel */}
      <div className="cart-panel">
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>{t('cart')}</span>
            {cart.length > 0 && <span className="badge badge-primary">{cart.reduce((s, i) => s + i.qty, 0)} {cart.reduce((s, i) => s + i.qty, 0) === 1 ? t('item') : t('items')}</span>}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
              <Trash2 size={14} /> {t('clear_cart')}
            </button>
          )}
        </div>

        {/* Customer Selection */}
        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
          {selectedCustomer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-100)' }}>
              <User size={15} style={{ color: 'var(--primary)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}>{selectedCustomer.name}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary)' }}>⭐ {selectedCustomer.loyaltyPoints} pts · {selectedCustomer.phone}</div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input
                  className="form-control"
                  style={{ paddingLeft: 32, fontSize: 'var(--font-size-sm)' }}
                  placeholder={t('select_customer')}
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
              </div>
              {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredCustomers.map(c => (
                    <button key={c._id} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', fontSize: 'var(--font-size-sm)' }}
                      onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{c.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{c.phone} · ⭐{c.loyaltyPoints} pts</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: 'var(--space-8)', textAlign: 'center' }}>
              <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <div style={{ fontWeight: 600 }}>{t('no_products_in_cart')}</div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item._id} className="cart-item" style={{ padding: 'var(--space-3) 0', borderBottom: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {item.category?.icon || '📦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cart-item-name" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 4, color: 'var(--text-primary)' }}>
                    {language === 'kh' ? (item.nameKh || item.name) : (item.name || item.nameKh)}
                  </div>
                  <div className="cart-item-price" style={{ fontSize: 12, color: 'var(--gray-500)' }}>${item.priceUsd.toFixed(2)} / {item.unit}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 'var(--font-size-md)', color: 'var(--primary-dark)' }}>${item.subtotalUsd.toFixed(2)}</div>
                  <div className="qty-control" style={{ display: 'flex', alignItems: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden' }}>
                    <button className="qty-btn" onClick={() => updateQty(item._id, -1)} style={{ padding: '10px 8px', background: 'var(--gray-200)', border: 'none', cursor: 'pointer', color: 'var(--gray-800)', display: 'flex', alignItems: 'center' }}><Minus size={18} strokeWidth={2.5} /></button>
                    <span className="qty-value" style={{ fontWeight: 800, minWidth: 28, textAlign: 'center', fontSize: 16, color: 'var(--gray-900)' }}>{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item._id, 1)} style={{ padding: '10px 8px', background: 'var(--primary-100)', border: 'none', cursor: 'pointer', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center' }}><Plus size={18} strokeWidth={2.5} /></button>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item._id)} style={{ background: 'var(--danger-50)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 8, borderRadius: '50%', flexShrink: 0, marginLeft: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Discount & Note */}
        {cart.length > 0 && (
          <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Percent size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input type="number" className="form-control" style={{ paddingLeft: 28, fontSize: 13 }} placeholder={t('discount') + ' %'} min={0} max={100} value={discountPercent || ''} onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
            </div>
            <input className="form-control" style={{ fontSize: 13, flex: 1 }} placeholder={language === 'kh' ? 'កំណត់ចំណាំ...' : language === 'zh' ? '备注...' : 'Note...'} value={note} onChange={e => setNote(e.target.value)} />
          </div>
        )}

        {/* Totals - Invoice Style */}
        <div className="cart-totals" style={{ background: 'var(--gray-50)', padding: 'var(--space-5)', borderTop: '2px dashed var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--font-size-sm)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('subtotal')}</span>
            <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
          </div>
          {discountUsd > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--font-size-sm)', color: 'var(--success)' }}>
              <span>{t('discount')} ({discountPercent}%)</span>
              <span style={{ fontWeight: 600 }}>-${discountUsd.toFixed(2)}</span>
            </div>
          )}
          {taxUsd > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 'var(--font-size-sm)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('tax')} ({settings.taxRate}%)</span>
              <span style={{ fontWeight: 600 }}>${taxUsd.toFixed(2)}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{t('total')}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 32, color: 'var(--primary-dark)', lineHeight: 1 }}>${totalUsd.toFixed(2)}</div>
              <div style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 4, fontWeight: 600 }}>{totalKhr.toLocaleString()} ៛</div>
            </div>
          </div>

          <button onClick={() => { if (cart.length === 0) { toast.error('Add items first'); return; } setAmountPaid(paymentCurrency === 'USD' ? totalUsd.toFixed(2) : totalKhr.toString()); setShowPayment(true); }} className="btn btn-success btn-block" style={{ marginTop: 'var(--space-6)', padding: '18px', fontSize: 18, borderRadius: 'var(--radius-xl)', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)' }} disabled={cart.length === 0}>
            <ShoppingCart size={24} /> {language === 'kh' ? 'គិតប្រាក់' : language === 'zh' ? '结账付款' : 'CHECKOUT'}
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayment && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2 className="modal-title">💳 {t('payment')}</h2>
              <button className="modal-close" onClick={() => setShowPayment(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Amount Due */}
              <div className="payment-summary" style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('paying_amount')}</div>
                <div className="payment-amount-display">${totalUsd.toFixed(2)}</div>
                <div className="payment-amount-khr">{totalKhr.toLocaleString()} ៛</div>
              </div>

              {/* Payment Methods */}
              <div className="payment-methods">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} className={`payment-method-btn ${paymentMethod === m.id ? 'selected' : ''}`} onClick={() => { setPaymentMethod(m.id); if (m.id !== 'cash') setAmountPaid(paymentCurrency === 'USD' ? totalUsd.toFixed(2) : totalKhr.toString()); }}>
                    <span className="icon">{m.icon}</span>
                    {t(m.id)}
                  </button>
                ))}
              </div>

              {/* Cash Input */}
              {paymentMethod === 'cash' && (
                <>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>{t('received_cash')}</label>
                      <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: 2, gap: 2 }}>
                        <button onClick={() => { setPaymentCurrency('USD'); setAmountPaid(totalUsd.toFixed(2)); }} style={{ border: 'none', background: paymentCurrency === 'USD' ? 'white' : 'transparent', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', boxShadow: paymentCurrency === 'USD' ? 'var(--shadow-sm)' : 'none', fontWeight: paymentCurrency === 'USD' ? 700 : 500 }}>USD</button>
                        <button onClick={() => { setPaymentCurrency('KHR'); setAmountPaid(totalKhr.toString()); }} style={{ border: 'none', background: paymentCurrency === 'KHR' ? 'white' : 'transparent', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', boxShadow: paymentCurrency === 'KHR' ? 'var(--shadow-sm)' : 'none', fontWeight: paymentCurrency === 'KHR' ? 700 : 500 }}>KHR</button>
                      </div>
                    </div>
                    <div className="input-group">
                      <span className="input-prefix">{paymentCurrency === 'USD' ? '$' : '៛'}</span>
                      <input className="form-control" type="number" step={paymentCurrency === 'USD' ? '0.01' : '100'} min={paymentCurrency === 'USD' ? totalUsd.toFixed(2) : totalKhr} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0" style={{ fontSize: 16, fontWeight: 700, textAlign: 'right', padding: '8px 12px' }} autoFocus />
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                    {paymentCurrency === 'USD' 
                      ? [Math.ceil(totalUsd), Math.ceil(totalUsd / 5) * 5, Math.ceil(totalUsd / 10) * 10, 50, 100].filter((v, i, arr) => arr.indexOf(v) === i && v >= totalUsd).slice(0, 4).map(amt => (
                          <button key={amt} onClick={() => setAmountPaid(amt.toFixed(2))} className={`btn btn-sm ${parseFloat(amountPaid) === amt ? 'btn-primary' : 'btn-outline'}`}>${amt.toFixed(2)}</button>
                        ))
                      : [Math.ceil(totalKhr / 1000) * 1000, Math.ceil(totalKhr / 5000) * 5000, Math.ceil(totalKhr / 10000) * 10000, 50000, 100000].filter((v, i, arr) => arr.indexOf(v) === i && v >= totalKhr).slice(0, 4).map(amt => (
                          <button key={amt} onClick={() => setAmountPaid(String(amt))} className={`btn btn-sm ${parseFloat(amountPaid) === amt ? 'btn-primary' : 'btn-outline'}`}>{amt.toLocaleString()} ៛</button>
                        ))
                    }
                  </div>

                  {amountPaidUsdCalc >= totalUsd - 0.005 && (
                    <div style={{ background: 'var(--success-50)', border: '1px solid var(--success-100)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>💰 {t('change')}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--success)' }}>${changeUsd.toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: 'var(--success)' }}>{Math.round(changeUsd * settings.exchangeRate).toLocaleString()} ៛</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Order Summary */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{language === 'kh' ? 'សេចក្តីសង្ខេបនៃការទិញ' : language === 'zh' ? '订单汇总' : 'Order Summary'}</div>
                <div style={{ maxHeight: '100px', overflowY: 'auto', paddingRight: '4px', marginBottom: '8px' }}>
                  {cart.map(i => (
                    <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--text-secondary)' }}>
                      <span>{language === 'kh' ? (i.nameKh || i.name) : (i.name || i.nameKh)} × {i.qty}</span>
                      <span>${i.subtotalUsd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px dashed var(--border)', marginTop: 8, paddingTop: 8 }}>
                  {discountUsd > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>{t('discount')}</span><span>-${discountUsd.toFixed(2)}</span></div>}
                  {taxUsd > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('tax')}</span><span>${taxUsd.toFixed(2)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 4 }}><span>{t('total')}</span><span style={{ color: 'var(--primary)' }}>${totalUsd.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPayment(false)}>{language === 'kh' ? 'បោះបង់' : language === 'zh' ? '取消' : 'Cancel'}</button>
              <button className="btn btn-success btn-lg" onClick={handleCheckout} disabled={processing || (paymentMethod === 'cash' && amountPaidUsdCalc < totalUsd - 0.005)}>
                {processing ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {language === 'kh' ? 'កំពុងដំណើរការ...' : language === 'zh' ? '正在处理...' : 'Processing...'}</> : `✓ ${language === 'kh' ? 'បញ្ជាក់ការបង់ប្រាក់' : language === 'zh' ? '确认收款' : 'Confirm Payment'} · $${totalUsd.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceipt && lastSale && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">🧾 Sale Completed!</h2>
              <button className="modal-close" onClick={() => setShowReceipt(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
                <div style={{ fontSize: 56, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', color: 'var(--success)' }}>Payment Successful!</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Invoice: {lastSale.invoiceNo}</div>
              </div>

              <div className="receipt" style={{ maxWidth: 280, margin: '0 auto' }}>
                {lastSale.settings?.logo && <div className="receipt-center"><img src={lastSale.settings.logo} alt="Logo" style={{ maxWidth: '60%', maxHeight: 60, objectFit: 'contain', margin: '0 auto 4px' }} /></div>}
                <div className="receipt-center" style={{ fontWeight: 700, fontSize: 14 }}>{!lastSale.settings?.logo && '🛒 '}{lastSale.settings?.storeNameKh || 'ហាង'}</div>
                <div className="receipt-center" style={{ fontSize: 11 }}>{lastSale.settings?.storeName || 'Store'}</div>
                {lastSale.settings?.address && <div className="receipt-center" style={{ fontSize: 10, color: '#666' }}>{lastSale.settings.address}</div>}
                {lastSale.settings?.phone && <div className="receipt-center" style={{ fontSize: 10, color: '#666' }}>{lastSale.settings.phone}</div>}
                <div className="receipt-line" />
                <div className="receipt-row"><span>Invoice:</span><span style={{ fontWeight: 700 }}>{lastSale.invoiceNo}</span></div>
                <div className="receipt-row"><span>Date:</span><span>{new Date(lastSale.createdAt || Date.now()).toLocaleString()}</span></div>
                <div className="receipt-row"><span>Cashier:</span><span>{lastSale.cashier?.name || '—'}</span></div>
                {lastSale.customer && <div className="receipt-row"><span>Customer:</span><span>{lastSale.customer.name}</span></div>}
                <div className="receipt-line" />
                {lastSale.items?.map((item: CartItem, i: number) => (
                  <div key={i}>
                    <div style={{ fontWeight: 600 }}>{item.nameKh || item.name}</div>
                    {item.nameKh && <div style={{ fontSize: 11 }}>{item.name}</div>}
                    <div className="receipt-row" style={{ color: '#666', fontSize: 11 }}><span>{item.qty} × ${item.priceUsd.toFixed(2)}</span><span>${item.subtotalUsd.toFixed(2)}</span></div>
                  </div>
                ))}
                <div className="receipt-line" />
                <div className="receipt-row"><span>Subtotal:</span><span>${lastSale.subtotalUsd?.toFixed(2) || '0.00'}</span></div>
                {lastSale.discountUsd > 0 && <div className="receipt-row"><span>Discount ({lastSale.discountPercent}%):</span><span>-${lastSale.discountUsd.toFixed(2)}</span></div>}
                {lastSale.taxUsd > 0 && <div className="receipt-row"><span>Tax ({lastSale.taxPercent}%):</span><span>${lastSale.taxUsd.toFixed(2)}</span></div>}
                <div className="receipt-row receipt-total"><span>TOTAL:</span><span>${lastSale.totalUsd?.toFixed(2) || '0.00'}</span></div>
                <div className="receipt-row" style={{ fontSize: 10, color: '#666' }}><span></span><span>{lastSale.totalKhr?.toLocaleString() || '0'} ៛</span></div>
                
                <div className="receipt-line" />
                <div className="receipt-row"><span>Payment:</span><span>{String(lastSale.paymentMethod || '').toUpperCase()}</span></div>
                {lastSale.paymentMethod === 'cash' && (
                  <>
                    <div className="receipt-row"><span>Amount Paid:</span><span>${lastSale.amountPaidUsd?.toFixed(2) || '0.00'}</span></div>
                    <div className="receipt-row" style={{ color: 'green' }}><span>Cash Back:</span><span>${lastSale.changeUsd?.toFixed(2) || '0.00'}</span></div>
                  </>
                )}
                <div className="receipt-line" />
                <pre className="receipt-center" style={{ fontSize: 10, fontFamily: 'inherit', margin: 0 }}>{lastSale.settings?.receiptFooter || `អរគុណសម្រាប់ការទិញទំនិញ!\nThank you for shopping at ${lastSale.settings?.storeName || 'Rith Mart'}!`}</pre>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReceipt(false)}>New Sale</button>
              <button className="btn btn-primary" onClick={printReceipt}><Printer size={16} /> Print Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Scan QR Modal */}
      {showScanQrModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowScanQrModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={20} style={{ color: 'var(--primary)' }} />
                <span>Phone Barcode Scanner</span>
              </h2>
              <button className="modal-close" onClick={() => setShowScanQrModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--space-6) var(--space-8)' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                Connect your phone to the <strong>same Wi-Fi network</strong> as this PC, scan this QR code, and start scanning barcodes using your phone camera.
              </p>
              
              <div style={{ 
                margin: '20px auto', 
                padding: 16, 
                background: '#ffffff', 
                borderRadius: 'var(--radius-lg)', 
                width: 250, 
                height: 250, 
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)'
              }}>
                {loadingQr ? (
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                ) : scanUrl ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scanUrl)}`} 
                    alt="Scan URL QR Code" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: 'var(--danger)', fontSize: 13 }}>Failed to load QR code</div>
                )}
              </div>

              {scanUrl && (
                <div style={{ 
                  background: 'var(--gray-50)', 
                  border: '1px solid var(--border)', 
                  padding: '8px 12px', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: 12, 
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  color: 'var(--gray-600)',
                  marginTop: 16
                }}>
                  {scanUrl}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowScanQrModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Cart Button */}
      <div className="mobile-cart-fab">
        <button 
          className="btn btn-primary" 
          onClick={() => {
            const cartPanel = document.querySelector('.pos-cart-panel');
            if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth' });
          }} 
          style={{ width: '100%', height: 56, borderRadius: 'var(--radius-full)', fontSize: 16, fontWeight: 700, boxShadow: 'var(--shadow-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={20} />
            <span>{cart.reduce((sum, item) => sum + item.qty, 0)} {language === 'kh' ? 'មុខ' : language === 'zh' ? '件商品' : 'Items'}</span>
          </div>
          <span>{language === 'kh' ? 'មើលកន្ត្រក' : language === 'zh' ? '查看购物车' : 'View Cart'}</span>
        </button>
      </div>
    </div>
  );
}
