import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, ShoppingBag, CheckCircle, Loader2, X,
  Camera, ScanLine, User, ImagePlus, Link,
  Monitor, Globe, Phone as PhoneIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/helpers';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface ProductVariant {
  sku: string;
  price: number;
  attributes: Record<string, string>;
  barcode?: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  basePrice: number;
  taxRate: number;
  variants: ProductVariant[];
  images: string[];
}

const PAYMENT_METHODS = [
  { id: 'cash',        label: 'Cash', icon: Banknote  },
  { id: 'credit_card', label: 'Card', icon: CreditCard },
  { id: 'upi',         label: 'UPI',  icon: Smartphone },
];

const getFallbackImage = (name: string) =>
  `https://source.unsplash.com/80x80/?${encodeURIComponent(name)},product`;

// ── Camera Scanner Modal ───────────────────────────────────────────────────
function CameraScanModal({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef   = useRef<number>(0);
  const [error, setError]       = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const start = async () => {
      try {
        if (!('BarcodeDetector' in window)) {
          setError('Camera scanning requires Chrome or Edge browser.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
        }
      } catch {
        setError('Could not access camera. Please allow camera permission.');
      }
    };
    start();
    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!scanning) return;
    // @ts-ignore
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'code_39', 'upc_a'],
    });
    const detect = async () => {
      if (videoRef.current?.readyState === 4) {
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            streamRef.current?.getTracks().forEach(t => t.stop());
            onScan(codes[0].rawValue);
            return;
          }
        } catch { /* continue */ }
      }
      animRef.current = requestAnimationFrame(detect);
    };
    animRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animRef.current);
  }, [scanning, onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera size={15} className="text-brand-400" />
            <span className="font-medium text-white text-sm">Camera Scanner</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div>
                <Camera size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-36 relative">
                  {[
                    'top-0 left-0 border-t-2 border-l-2',
                    'top-0 right-0 border-t-2 border-r-2',
                    'bottom-0 left-0 border-b-2 border-l-2',
                    'bottom-0 right-0 border-b-2 border-r-2',
                  ].map((c, i) => (
                    <div key={i} className={`absolute w-7 h-7 ${c} border-brand-400`} />
                  ))}
                  <div
                    className="absolute inset-x-0 h-0.5 bg-brand-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                    style={{ animation: 'scanLine 1.8s ease-in-out infinite', top: '50%' }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <p className="text-center text-slate-500 text-xs py-3">
          {scanning ? 'Point camera at barcode — detects automatically' : error ? '' : 'Starting camera…'}
        </p>
      </div>
      <style>{`@keyframes scanLine{0%,100%{top:10%}50%{top:85%}}`}</style>
    </div>
  );
}

// ── Cart Item Image Editor ─────────────────────────────────────────────────
function CartItemImageEditor({
  sku, currentImage, productName, onSave, onClose,
}: {
  sku: string;
  currentImage?: string;
  productName: string;
  onSave: (sku: string, url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl]           = useState(currentImage || '');
  const [preview, setPreview]   = useState(currentImage || '');
  const [imgError, setImgError] = useState(false);

  const handlePreview = () => {
    setImgError(false);
    setPreview(url.trim());
  };

  const suggestions = [
    `https://source.unsplash.com/120x120/?${encodeURIComponent(productName)},product`,
    `https://source.unsplash.com/120x120/?${encodeURIComponent(productName)},retail`,
    `https://source.unsplash.com/120x120/?${encodeURIComponent(productName)},shop`,
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm bg-slate-900 border-slate-700 animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImagePlus size={15} className="text-brand-400" />
            <h3 className="font-semibold text-white text-sm">Set Item Image</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={15} />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center">
            {preview && !imgError ? (
              <img
                src={preview}
                alt="preview"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-600">
                <ShoppingBag size={20} />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>
        </div>

        {imgError && (
          <p className="text-xs text-red-400 text-center mb-3">
            Could not load image — try a different URL
          </p>
        )}

        <div className="space-y-2 mb-4">
          <label className="text-xs text-slate-400 block">Paste image URL</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePreview()}
                className="input w-full pl-7 text-xs"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <button onClick={handlePreview} className="btn-secondary text-xs px-3 py-1.5">
              Preview
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">
            Quick suggestions for <span className="text-slate-300">"{productName}"</span>
          </p>
          <div className="flex gap-2">
            {suggestions.map((src, i) => (
              <button
                key={i}
                onClick={() => { setUrl(src); setPreview(src); setImgError(false); }}
                className={`flex-1 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  url === src ? 'border-brand-500' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <img
                  src={src}
                  alt={`suggestion ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1 text-center">Click a suggestion to select it</p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (url.trim()) { onSave(sku, url.trim()); onClose(); }
              else toast.error('Enter an image URL');
            }}
            disabled={!url.trim()}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
          >
            <ImagePlus size={13} /> Set Image
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main POS Page ──────────────────────────────────────────────────────────
export default function POSPage() {
  const [search, setSearch]                     = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCheckout, setShowCheckout]         = useState(false);
  const [paymentMethod, setPaymentMethod]       = useState('cash');
  const [cashTendered, setCashTendered]         = useState('');
  const [orderSuccess, setOrderSuccess]         = useState<{ number: string; total: number } | null>(null);
  const [lastScanned, setLastScanned]           = useState<string | null>(null);
  const [showCamera, setShowCamera]             = useState(false);
  const [editImageSku, setEditImageSku]         = useState<string | null>(null);
  const [imageOverrides, setImageOverrides]     = useState<Record<string, string>>({});
  const [channel, setChannel]                   = useState<'pos' | 'online' | 'phone'>('pos');
  const searchRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { user } = useAuthStore();
  const cart     = useCartStore();
  const totals   = cart.totals();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-pos', search, selectedCategory],
    queryFn: () =>
      api.get(`/products?search=${search}&limit=48${selectedCategory ? `&category=${selectedCategory}` : ''}`).then(r => r.data.data),
    staleTime: 60000,
  });

  const categories = Array.from(new Set((productsData || []).map((p: Product) => p.category))) as string[];

  const { data: scannedProduct } = useQuery({
    queryKey: ['pos-barcode', lastScanned],
    queryFn: () => api.get(`/products/barcode/${lastScanned}`).then(r => r.data.data),
    enabled: !!lastScanned,
    retry: false,
  });

  useEffect(() => {
    if (scannedProduct && lastScanned) {
      const variant =
        scannedProduct.variants.find(
          (v: ProductVariant) => v.barcode === lastScanned || v.sku === lastScanned
        ) || scannedProduct.variants[0];
      if (variant) {
        cart.addItem({
          productId: scannedProduct._id,
          variantSku: variant.sku,
          productName: scannedProduct.name,
          variantAttributes: variant.attributes || {},
          unitPrice: variant.price || scannedProduct.basePrice,
          taxRate: scannedProduct.taxRate || 0,
          image: scannedProduct.images?.[0] || getFallbackImage(scannedProduct.name),
        });
        toast.success(`Added: ${scannedProduct.name}`, { icon: '📷' });
      }
      setLastScanned(null);
    }
  }, [scannedProduct, lastScanned]);

  useBarcodeScanner({ onScan: code => setLastScanned(code), enabled: !showCheckout && !showCamera });

  const handleCameraScan = useCallback((code: string) => {
    setShowCamera(false);
    setTimeout(() => setLastScanned(code), 100);
  }, []);

  const handleAddProduct = (product: Product) => {
    const variant = product.variants[0];
    if (!variant) { toast.error('No variant available'); return; }
    cart.addItem({
      productId: product._id,
      variantSku: variant.sku,
      productName: product.name,
      variantAttributes: variant.attributes || {},
      unitPrice: variant.price || product.basePrice,
      taxRate: product.taxRate || 0,
      image: product.images?.[0] || getFallbackImage(product.name),
    });
    toast.success(`${product.name} added`, { duration: 900 });
  };

  const handleSaveImage = (sku: string, url: string) => {
    setImageOverrides(prev => ({ ...prev, [sku]: url }));
    toast.success('Image updated');
  };

  const placeOrder = useMutation({
    mutationFn: (payload: unknown) => api.post('/orders', payload),
    onSuccess: (res) => {
      setOrderSuccess({ number: res.data.data.orderNumber, total: totals.grandTotal });
      cart.clearCart();
      setImageOverrides({});
      setShowCheckout(false);
      setCashTendered('');
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['recent-orders-dash'] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err.response?.data?.error?.message || 'Order failed');
    },
  });

  const handlePlaceOrder = () => {
    if (!cart.items.length) { toast.error('Cart is empty'); return; }
    const amountPaid =
      paymentMethod === 'cash'
        ? parseFloat(cashTendered) || totals.grandTotal
        : totals.grandTotal;
    if (paymentMethod === 'cash' && amountPaid < totals.grandTotal) {
      toast.error('Insufficient cash amount');
      return;
    }
    placeOrder.mutate({
      items: cart.items.map(i => ({
        productId: i.productId,
        variantSku: i.variantSku,
        productName: i.productName,
        variantAttributes: i.variantAttributes,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        taxRate: i.taxRate,
      })),
      storeId: user?.storeId,
      channel,
      customerPhone: cart.customerPhone || undefined,
      customerName: cart.customerName || undefined,
      notes: cart.notes,
      payments: [{ method: paymentMethod, amount: amountPaid }],
    });
  };

  const change = parseFloat(cashTendered) - totals.grandTotal;
  const editingItem = editImageSku ? cart.items.find(i => i.variantSku === editImageSku) : null;

  if (orderSuccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-slide-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-1">Sale Complete!</h2>
          <p className="text-slate-400 mb-2">Order {orderSuccess.number}</p>
          <p className="text-3xl font-semibold text-white mb-6">{formatCurrency(orderSuccess.total)}</p>
          {paymentMethod === 'cash' && change > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 inline-block">
              <p className="text-emerald-400 text-sm">Change due</p>
              <p className="text-emerald-300 text-2xl font-semibold">{formatCurrency(change)}</p>
            </div>
          )}
          <button onClick={() => setOrderSuccess(null)} className="btn-primary px-8 py-3">
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showCamera && (
        <CameraScanModal onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}

      {editImageSku && editingItem && (
        <CartItemImageEditor
          sku={editImageSku}
          currentImage={imageOverrides[editImageSku] || editingItem.image}
          productName={editingItem.productName}
          onSave={handleSaveImage}
          onClose={() => setEditImageSku(null)}
        />
      )}

      <div className="flex h-full">
        {/* ── Product Grid ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input w-full pl-9"
                  placeholder="Search products…"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowCamera(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
                title="Scan with camera"
              >
                <Camera size={15} />
                <ScanLine size={15} />
              </button>
            </div>

            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    selectedCategory === ''
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                      selectedCategory === cat
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-brand-400" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {(productsData || []).map((product: Product) => {
                  const imgSrc = product.images?.[0] || getFallbackImage(product.name);
                  return (
                    <button
                      key={product._id}
                      onClick={() => handleAddProduct(product)}
                      className="card text-left hover:border-brand-500/50 hover:bg-slate-800 transition-all group active:scale-95 p-0 overflow-hidden"
                    >
                      <div className="w-full aspect-square bg-slate-800 flex items-center justify-center overflow-hidden relative">
                        <img
                          src={imgSrc}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => {
                            (e.target as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=1e293b&color=6366f1&size=128`;
                          }}
                        />
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <Plus size={12} className="text-white" />
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-medium text-slate-200 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>
                        <p className="text-sm font-semibold text-brand-400 mt-1">
                          {formatCurrency(product.variants[0]?.price || product.basePrice)}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {!isLoading && (!productsData || productsData.length === 0) && (
                  <div className="col-span-full text-center py-16 text-slate-500">
                    <ShoppingBag size={32} className="mx-auto mb-2 text-slate-700" />
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Cart ── */}
        <div className="w-[360px] flex-shrink-0 flex flex-col border-l border-slate-800 bg-slate-900">

          {/* Cart header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">Cart</h2>
              <span className={`badge text-xs capitalize ${
                channel === 'pos' ? 'badge-blue' : channel === 'online' ? 'badge-green' : 'badge-yellow'
              }`}>
                {channel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">{cart.items.length} items</span>
              {cart.items.length > 0 && (
                <button
                  onClick={() => { cart.clearCart(); setImageOverrides({}); }}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="px-3 py-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User size={13} className="text-slate-500 flex-shrink-0" />
              <input
                value={cart.customerPhone}
                onChange={e =>
                  cart.setCustomer(e.target.value.replace(/\D/g, '').slice(0, 10), cart.customerName)
                }
                className="input flex-1 py-1.5 text-xs"
                placeholder="Customer phone (optional)"
              />
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <ShoppingBag size={40} className="text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Cart is empty</p>
                <p className="text-slate-600 text-xs mt-1">Click a product or scan a barcode</p>
                <button
                  onClick={() => setShowCamera(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs transition-colors"
                >
                  <Camera size={13} /> Scan with Camera
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.items.map(item => {
                  const imgSrc =
                    imageOverrides[item.variantSku] ||
                    item.image ||
                    getFallbackImage(item.productName);
                  return (
                    <div key={item.variantSku} className="bg-slate-800/60 rounded-lg overflow-hidden">
                      <div className="flex gap-2 p-2">

                        {/* Image — hover to change */}
                        <div className="relative flex-shrink-0 group/img">
                          <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden">
                            <img
                              src={imgSrc}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(item.productName)}&background=1e293b&color=6366f1&size=80`;
                              }}
                            />
                          </div>
                          <button
                            onClick={() => setEditImageSku(item.variantSku)}
                            className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                            title="Change image"
                          >
                            <ImagePlus size={14} className="text-white" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-medium text-slate-200 truncate leading-tight">
                              {item.productName}
                            </p>
                            <button
                              onClick={() => {
                                cart.removeItem(item.variantSku);
                                setImageOverrides(prev => {
                                  const next = { ...prev };
                                  delete next[item.variantSku];
                                  return next;
                                });
                              }}
                              className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          {Object.keys(item.variantAttributes || {}).length > 0 && (
                            <p className="text-xs text-slate-500">
                              {Object.values(item.variantAttributes).join(' / ')}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => cart.updateQuantity(item.variantSku, item.quantity - 1)}
                                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-sm font-medium text-white w-5 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => cart.updateQuantity(item.variantSku, item.quantity + 1)}
                                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Change image link */}
                      <button
                        onClick={() => setEditImageSku(item.variantSku)}
                        className="w-full px-2 pb-1.5 flex items-center gap-1 text-xs text-slate-600 hover:text-brand-400 transition-colors"
                      >
                        <ImagePlus size={10} />
                        {imageOverrides[item.variantSku] ? 'Change image' : 'Add / change image'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals + checkout */}
          {cart.items.length > 0 && (
            <div className="border-t border-slate-800 p-4 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span>{formatCurrency(totals.taxTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-white text-base border-t border-slate-700 pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>

              {!showCheckout ? (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  <CreditCard size={16} /> Charge {formatCurrency(totals.grandTotal)}
                </button>
              ) : (
                <div className="space-y-3 animate-slide-in">

                  {/* Channel selector */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 font-medium">Order Channel</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { id: 'pos',    label: 'POS',    icon: Monitor   },
                        { id: 'online', label: 'Online', icon: Globe     },
                        { id: 'phone',  label: 'Phone',  icon: PhoneIcon },
                      ] as const).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setChannel(id)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            channel === id
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setPaymentMethod(id)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMethod === id
                            ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'cash' && (
                    <div>
                      <input
                        type="number"
                        value={cashTendered}
                        onChange={e => setCashTendered(e.target.value)}
                        className="input w-full text-center text-lg font-semibold"
                        placeholder="Enter amount"
                        autoFocus
                      />
                      {change > 0 && (
                        <p className="text-center text-emerald-400 text-sm mt-1.5 font-medium">
                          Change: {formatCurrency(change)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="btn-secondary py-2.5 text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={placeOrder.isPending}
                      className="btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                    >
                      {placeOrder.isPending
                        ? <Loader2 size={14} className="animate-spin" />
                        : <CheckCircle size={14} />
                      }
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}