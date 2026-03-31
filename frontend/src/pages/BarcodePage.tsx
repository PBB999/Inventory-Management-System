import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Scan, Barcode, Search, CheckCircle, XCircle,
  Package, Hash, Printer, RefreshCw, Zap, Camera,
  CameraOff, X, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

interface ProductVariant {
  sku: string;
  price: number;
  barcode?: string;
  attributes: Record<string, string>;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  basePrice: number;
  taxRate: number;
  variants: ProductVariant[];
}

// ── Barcode SVG renderer ───────────────────────────────────────────────────
function BarcodeDisplay({ value, label }: { value: string; label?: string }) {
  const bars = Array.from(value).flatMap((char, i) => {
    const code = char.charCodeAt(0);
    return [
      (code >> 6) % 3 + 1,
      (code >> 4) % 2 + 1,
      (code >> 2) % 3 + 1,
      code % 2 + 1,
      ((code + i) >> 1) % 2 + 1,
    ];
  });

  const totalWidth = bars.reduce((s, w) => s + w * 2, 0) + 16;
  let x = 8;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={Math.min(totalWidth, 280)}
        height="70"
        viewBox={`0 0 ${Math.min(totalWidth, 280)} 70`}
        className="rounded"
      >
        <rect width="100%" height="100%" fill="#fff" />
        {bars.slice(0, 80).map((width, i) => {
          const barX = x;
          const barWidth = width * 2;
          x += barWidth + 1;
          return i % 2 === 0
            ? <rect key={i} x={barX} y={8} width={barWidth} height={46} fill="#0f172a" />
            : null;
        })}
      </svg>
      <div className="text-center">
        <p className="font-mono text-sm font-semibold text-white tracking-widest">{value}</p>
        {label && <p className="text-xs text-slate-400 mt-0.5">{label}</p>}
      </div>
    </div>
  );
}

// ── Live Camera Scanner Component ──────────────────────────────────────────
function LiveCameraScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const animRef     = useRef<number>(0);
  const [error, setError]       = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras]   = useState<MediaDeviceInfo[]>([]);
  const [activeCam, setActiveCam] = useState<string>('');
  const [detected, setDetected]   = useState('');

  // Get available cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const cams = devices.filter(d => d.kind === 'videoinput');
      setCameras(cams);
    }).catch(() => {});
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(animRef.current);
    setScanning(false);
    setError('');

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'environment' },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);

        // Get actual device id being used
        const track = stream.getVideoTracks()[0];
        setActiveCam(track.getSettings().deviceId || '');
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (e.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not start camera: ' + e.message);
      }
    }
  }, []);

  // Start on mount
  useEffect(() => {
    startCamera();
    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  // BarcodeDetector loop
  useEffect(() => {
    if (!scanning) return;

    if (!('BarcodeDetector' in window)) {
      setError('BarcodeDetector API not supported. Use Chrome 88+ or Edge 88+. On mobile, use Chrome for Android.');
      setScanning(false);
      return;
    }

    // @ts-ignore
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'code_39', 'upc_a', 'itf', 'data_matrix'],
    });

    let lastCode = '';
    let lastTime = 0;

    const detect = async () => {
      const video = videoRef.current;
      if (video && video.readyState === 4) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            const now  = Date.now();
            // Debounce — don't fire same code twice within 2 seconds
            if (code !== lastCode || now - lastTime > 2000) {
              lastCode = code;
              lastTime = now;
              setDetected(code);
              toast.success(`Scanned: ${code}`, { icon: '🎯' });
              onScan(code);
            }
          }
        } catch { /* continue */ }
      }
      animRef.current = requestAnimationFrame(detect);
    };

    animRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animRef.current);
  }, [scanning, onScan]);

  const switchCamera = (deviceId: string) => {
    setActiveCam(deviceId);
    startCamera(deviceId);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden w-full max-w-md animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera size={15} className="text-brand-400" />
            <span className="font-semibold text-white text-sm">Camera Barcode Scanner</span>
            {scanning && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <CameraOff size={28} className="text-red-400" />
              </div>
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={() => startCamera()} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                <RefreshCw size={13} /> Try Again
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Dark overlay with cutout */}
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative w-64 h-44">
                  {/* Corner brackets */}
                  {[
                    'top-0 left-0 border-t-4 border-l-4',
                    'top-0 right-0 border-t-4 border-r-4',
                    'bottom-0 left-0 border-b-4 border-l-4',
                    'bottom-0 right-0 border-b-4 border-r-4',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-10 h-10 ${cls} border-brand-400 rounded-sm`} />
                  ))}
                  {/* Scan line */}
                  <div
                    className="absolute inset-x-4 h-0.5 bg-brand-400 shadow-[0_0_12px_4px_rgba(99,102,241,0.7)]"
                    style={{ animation: 'scanLine 2s ease-in-out infinite', top: '50%' }}
                  />
                  <p className="absolute -bottom-8 left-0 right-0 text-center text-white text-xs font-medium">
                    Align barcode within the frame
                  </p>
                </div>
              </div>

              {/* Detected flash */}
              {detected && (
                <div className="absolute top-3 left-3 right-3 bg-emerald-500/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 animate-slide-in">
                  <CheckCircle size={14} className="text-white flex-shrink-0" />
                  <p className="text-white text-xs font-mono font-medium truncate">{detected}</p>
                </div>
              )}

              {!scanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Scan size={32} className="text-slate-500 mx-auto mb-2 animate-pulse" />
                    <p className="text-slate-400 text-sm">Starting camera…</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Camera selector + info */}
        <div className="px-4 py-3 space-y-3">
          {/* Switch camera if multiple available */}
          {cameras.length > 1 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Switch Camera</p>
              <div className="flex gap-2 flex-wrap">
                {cameras.map((cam, i) => (
                  <button
                    key={cam.deviceId}
                    onClick={() => switchCamera(cam.deviceId)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      activeCam === cam.deviceId
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {cam.label || `Camera ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Supported formats info */}
          <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-2.5">
            <AlertCircle size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Supports EAN-13, EAN-8, Code-128, QR Code, Code-39, UPC-A.
              Works on <span className="text-slate-400">Chrome / Edge</span> on laptop and Android.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary w-full text-sm py-2"
          >
            Close Scanner
          </button>
        </div>
      </div>
      <style>{`@keyframes scanLine{0%,100%{top:8%}50%{top:88%}}`}</style>
    </div>
  );
}

// ── Main Barcode Page ──────────────────────────────────────────────────────
export default function BarcodePage() {
  const [mode, setMode]           = useState<'scan' | 'generate'>('scan');
  const [manualInput, setManualInput] = useState('');
  const [lookupCode, setLookupCode]   = useState('');
  const [generateSku, setGenerateSku] = useState('');
  const [printCount, setPrintCount]   = useState(1);
  const [showCamera, setShowCamera]   = useState(false);
  const [lastScanned, setLastScanned] = useState('');

  // HID scanner buffer (physical scanner plugged in via USB)
  const bufferRef   = useRef('');
  const lastKeyRef  = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showCamera) return;
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const now = Date.now();
    const delta = now - lastKeyRef.current;
    lastKeyRef.current = now;
    if (e.key === 'Enter') {
      const code = bufferRef.current.trim();
      bufferRef.current = '';
      if (code.length >= 4) {
        setLastScanned(code);
        setLookupCode(code);
        setManualInput(code);
        toast.success(`HID Scanner: ${code}`);
      }
      return;
    }
    if (delta > 100) bufferRef.current = '';
    if (e.key.length === 1) bufferRef.current += e.key;
  }, [showCamera]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Camera scan handler
  const handleCameraScan = useCallback((code: string) => {
    setLastScanned(code);
    setLookupCode(code);
    setManualInput(code);
    setShowCamera(false);
  }, []);

  // Product lookup
  const { data: foundProduct, isLoading: looking, isError: notFound } = useQuery({
    queryKey: ['barcode-lookup', lookupCode],
    queryFn: () => api.get(`/products/barcode/${lookupCode}`).then(r => r.data.data),
    enabled: lookupCode.length >= 4,
    retry: false,
  });

  // All products for generate tab
  const { data: allProducts } = useQuery({
    queryKey: ['products-barcode'],
    queryFn: () => api.get('/products?limit=100').then(r => r.data.data),
    enabled: mode === 'generate',
  });

  const handleManualLookup = () => {
    const code = manualInput.trim();
    if (code.length < 4) { toast.error('Enter at least 4 characters'); return; }
    setLookupCode(code);
    setLastScanned(code);
  };

  const handlePrint = () => {
    toast.success(`Sent ${printCount} label${printCount > 1 ? 's' : ''} to printer`);
  };

  const selectedProduct = allProducts?.find((p: Product) =>
    p.variants.some((v: ProductVariant) => v.sku === generateSku)
  );
  const selectedVariant = selectedProduct?.variants.find(
    (v: ProductVariant) => v.sku === generateSku
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Camera modal */}
      {showCamera && (
        <LiveCameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Barcode Manager</h1>
          <p className="text-slate-400 text-sm mt-0.5">Scan to lookup or generate product barcodes</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {[
          { id: 'scan',     label: 'Scan / Lookup', icon: Scan    },
          { id: 'generate', label: 'Generate',       icon: Barcode },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id as 'scan' | 'generate')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === id
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── SCAN MODE ── */}
      {mode === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Scanner panel */}
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Scanner</h2>
              {lastScanned && (
                <span className="badge badge-green font-mono text-xs">{lastScanned}</span>
              )}
            </div>

            {/* Camera scan button — BIG and prominent */}
            <button
              onClick={() => setShowCamera(true)}
              className="w-full flex flex-col items-center gap-3 py-8 rounded-xl border-2 border-dashed border-brand-500/40 bg-brand-600/5 hover:bg-brand-600/10 hover:border-brand-500/60 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center group-hover:bg-brand-600/30 transition-colors">
                <Camera size={28} className="text-brand-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Activate Camera Scanner</p>
                <p className="text-slate-400 text-sm mt-1">
                  Opens your laptop or mobile camera to scan barcodes
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                Works on Chrome &amp; Edge
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                Laptop &amp; Mobile
              </div>
            </button>

            {/* HID scanner status */}
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3">
              <Zap size={15} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-300 font-medium">USB / Bluetooth Scanner</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect a physical barcode scanner — it works automatically without clicking anything
                </p>
              </div>
            </div>

            {/* Manual input */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Manual Lookup
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                    className="input w-full pl-8 text-sm font-mono"
                    placeholder="Type barcode or SKU…"
                  />
                </div>
                <button onClick={handleManualLookup} className="btn-primary px-3 flex items-center gap-1.5 text-sm">
                  <Search size={14} />
                  Find
                </button>
              </div>
            </div>
          </div>

          {/* Result panel */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Lookup Result</h2>

            {!lookupCode && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Camera size={40} className="text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Click "Activate Camera Scanner" or type a barcode</p>
              </div>
            )}

            {looking && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw size={24} className="animate-spin text-brand-400 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    Looking up <span className="font-mono text-brand-400">{lookupCode}</span>…
                  </p>
                </div>
              </div>
            )}

            {notFound && lookupCode && !looking && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                  <XCircle size={28} className="text-red-400" />
                </div>
                <p className="text-red-400 font-medium">No product found</p>
                <p className="text-slate-500 text-sm mt-1 font-mono">{lookupCode}</p>
              </div>
            )}

            {foundProduct && !looking && (
              <div className="space-y-4 animate-slide-in">
                {/* Product info */}
                <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="w-12 h-12 rounded-lg bg-brand-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{foundProduct.name}</p>
                    <p className="text-slate-400 text-sm">{foundProduct.category}</p>
                    <p className="text-brand-400 font-semibold mt-1">
                      {formatCurrency(foundProduct.variants[0]?.price || foundProduct.basePrice)}
                    </p>
                  </div>
                  <span className="badge-green flex-shrink-0">Found</span>
                </div>

                {/* Variants */}
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                    Variants
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {foundProduct.variants.map((v: ProductVariant) => (
                      <div
                        key={v.sku}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                          v.barcode === lookupCode || v.sku === lookupCode
                            ? 'bg-brand-600/15 border border-brand-500/30'
                            : 'bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {(v.barcode === lookupCode || v.sku === lookupCode) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                          )}
                          <span className="font-mono text-xs text-slate-300">{v.sku}</span>
                          <span className="text-slate-500 text-xs">
                            {Object.values(v.attributes || {}).join(' / ')}
                          </span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(v.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Barcode graphic */}
                <div className="bg-white rounded-xl p-4 flex justify-center">
                  <BarcodeDisplay
                    value={
                      foundProduct.variants[0]?.barcode ||
                      foundProduct.variants[0]?.sku ||
                      lookupCode
                    }
                    label={foundProduct.name}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GENERATE MODE ── */}
      {mode === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Selector */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-white">Select Product Variant</h2>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Product → Variant SKU</label>
              <select
                value={generateSku}
                onChange={e => setGenerateSku(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="">Choose a variant…</option>
                {(allProducts || []).map((product: Product) =>
                  product.variants.map((v: ProductVariant) => (
                    <option key={v.sku} value={v.sku}>
                      {product.name} — {v.sku} ({Object.values(v.attributes || {}).join(' / ')})
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedVariant && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3 animate-slide-in">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{selectedProduct?.name}</p>
                  <span className="badge-blue">{selectedProduct?.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">SKU</p>
                    <p className="text-white font-mono mt-0.5">{selectedVariant.sku}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Price</p>
                    <p className="text-white font-medium mt-0.5">
                      {formatCurrency(selectedVariant.price)}
                    </p>
                  </div>
                  {selectedVariant.barcode && (
                    <div>
                      <p className="text-slate-500">Barcode</p>
                      <p className="text-white font-mono mt-0.5">{selectedVariant.barcode}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500">Attributes</p>
                    <p className="text-white mt-0.5">
                      {Object.values(selectedVariant.attributes || {}).join(', ') || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Print count */}
            {generateSku && (
              <div className="border-t border-slate-800 pt-4 space-y-3 animate-slide-in">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Number of Labels to Print
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPrintCount(Math.max(1, printCount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                    >−</button>
                    <span className="text-white font-semibold text-lg w-8 text-center">
                      {printCount}
                    </span>
                    <button
                      onClick={() => setPrintCount(Math.min(100, printCount + 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                    >+</button>
                  </div>
                </div>
                <button
                  onClick={handlePrint}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                >
                  <Printer size={15} />
                  Print {printCount} Label{printCount > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Barcode Preview</h2>

            {!generateSku ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Barcode size={40} className="text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Select a variant to preview its barcode</p>
              </div>
            ) : (
              <div className="space-y-6 animate-slide-in">
                {/* Label preview */}
                <div className="bg-white rounded-xl p-6 space-y-3">
                  <div className="text-center">
                    <p className="text-slate-800 font-bold text-sm">{selectedProduct?.name}</p>
                    <p className="text-slate-500 text-xs">
                      {Object.values(selectedVariant?.attributes || {}).join(' · ')}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <BarcodeDisplay
                      value={selectedVariant?.barcode || selectedVariant?.sku || ''}
                      label={selectedVariant?.sku}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 border-t border-slate-200 pt-2 mt-2">
                    <span>{selectedProduct?.category}</span>
                    <span className="font-bold">
                      {formatCurrency(selectedVariant?.price || 0)}
                    </span>
                  </div>
                </div>

                {/* All variants */}
                {(selectedProduct?.variants?.length || 0) > 1 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
                      All Variants
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedProduct?.variants.map((v: ProductVariant) => (
                        <button
                          key={v.sku}
                          onClick={() => setGenerateSku(v.sku)}
                          className={`bg-white rounded-lg p-3 transition-all ${
                            v.sku === generateSku
                              ? 'ring-2 ring-brand-500'
                              : 'opacity-60 hover:opacity-90'
                          }`}
                        >
                          <BarcodeDisplay
                            value={v.barcode || v.sku}
                            label={Object.values(v.attributes || {}).join(' / ') || v.sku}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
