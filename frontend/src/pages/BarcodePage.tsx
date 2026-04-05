import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Scan, Barcode, Search, CheckCircle, XCircle,
  Package, Hash, Printer, RefreshCw, Zap, Camera,
  CameraOff, X, AlertCircle, FlipHorizontal,
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
      <svg width={Math.min(totalWidth, 280)} height="70" viewBox={`0 0 ${Math.min(totalWidth, 280)} 70`} className="rounded">
        <rect width="100%" height="100%" fill="#fff" />
        {bars.slice(0, 80).map((width, i) => {
          const barX = x; const barWidth = width * 2; x += barWidth + 1;
          return i % 2 === 0 ? <rect key={i} x={barX} y={8} width={barWidth} height={46} fill="#0f172a" /> : null;
        })}
      </svg>
      <div className="text-center">
        <p className="font-mono text-sm font-semibold text-white tracking-widest">{value}</p>
        {label && <p className="text-xs text-slate-400 mt-0.5">{label}</p>}
      </div>
    </div>
  );
}

// ── Universal Camera Scanner (works on ALL browsers) ──────────────────────
function LiveCameraScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const animRef       = useRef<number>(0);
  const lastCodeRef   = useRef('');
  const lastTimeRef   = useRef(0);

  const [error, setError]         = useState('');
  const [scanning, setScanning]   = useState(false);
  const [detected, setDetected]   = useState('');
  const [cameras, setCameras]     = useState<MediaDeviceInfo[]>([]);
  const [activeCam, setActiveCam] = useState('');
  const [facingBack, setFacingBack] = useState(true);
  const [zxingReady, setZxingReady] = useState(false);
  const [loadingLib, setLoadingLib] = useState(true);

  // Dynamically load ZXing from CDN — works on ALL Chrome versions
  useEffect(() => {
    if ((window as any).ZXing) { setZxingReady(true); setLoadingLib(false); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/zxing-js/0.21.3/zxing.min.js';
    script.onload = () => { setZxingReady(true); setLoadingLib(false); };
    script.onerror = () => {
      // Fallback: try unpkg
      const s2 = document.createElement('script');
      s2.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
      s2.onload = () => { setZxingReady(true); setLoadingLib(false); };
      s2.onerror = () => { setLoadingLib(false); setError('Could not load scanner library. Check your internet connection.'); };
      document.head.appendChild(s2);
    };
    document.head.appendChild(script);
  }, []);

  // Get available cameras
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const cams = devices.filter(d => d.kind === 'videoinput');
      setCameras(cams);
    }).catch(() => {});
  }, []);

  const startCamera = useCallback(async (deviceId?: string, back?: boolean) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(animRef.current);
    setScanning(false);
    setError('');

    try {
      const useFacingBack = back !== undefined ? back : facingBack;
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: useFacingBack ? 'environment' : 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const track = stream.getVideoTracks()[0];
        setActiveCam(track.getSettings().deviceId || '');
        setScanning(true);
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Camera permission denied.\n\nTo fix: Click the camera icon in your browser address bar → Allow → Refresh this page.');
      } else if (e.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (e.name === 'NotReadableError') {
        setError('Camera is already in use by another application. Close other apps using the camera and try again.');
      } else {
        setError(`Camera error: ${e.message}`);
      }
    }
  }, [facingBack]);

  // Start camera on mount (after lib loads)
  useEffect(() => {
    if (!loadingLib) startCamera();
    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [loadingLib]);

  // ZXing scan loop — works on ALL Chrome versions + Firefox + Safari
  useEffect(() => {
    if (!scanning || !zxingReady) return;

    const ZXing = (window as any).ZXing || (window as any).ZXingLib;
    if (!ZXing) { setError('Scanner library not loaded. Please refresh the page.'); return; }

    let reader: any;
    try {
      // Try MultiFormatReader (most compatible)
      if (ZXing.BrowserMultiFormatReader) {
        reader = new ZXing.BrowserMultiFormatReader();
      } else if (ZXing.MultiFormatReader) {
        reader = new ZXing.MultiFormatReader();
      }
    } catch { /* fall through to canvas method */ }

    // Canvas-based scanning (universal fallback)
    const scanCanvas = () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) {
        animRef.current = requestAnimationFrame(scanCanvas);
        return;
      }

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(scanCanvas); return; }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const ZX = (window as any).ZXing || (window as any).ZXingLib;
        if (ZX && ZX.BrowserMultiFormatReader) {
          const codeReader = new ZX.BrowserMultiFormatReader();
          const imgData = canvas.toDataURL('image/png');
          const img = new Image();
          img.onload = () => {
            try {
              const result = codeReader.decodeFromImage(img);
              if (result) handleDetected(result.getText());
            } catch { /* no barcode */ }
          };
          img.src = imgData;
        }
      } catch { /* continue */ }

      animRef.current = requestAnimationFrame(scanCanvas);
    };

    // Try native BarcodeDetector first (Chrome 88+), fall back to ZXing canvas
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'code_39', 'upc_a', 'itf', 'aztec', 'data_matrix'],
        });

        const detectNative = async () => {
          const video = videoRef.current;
          if (video?.readyState === 4) {
            try {
              const barcodes = await detector.detect(video);
              if (barcodes.length > 0) handleDetected(barcodes[0].rawValue);
            } catch { /* continue */ }
          }
          animRef.current = requestAnimationFrame(detectNative);
        };
        animRef.current = requestAnimationFrame(detectNative);
        return () => cancelAnimationFrame(animRef.current);
      } catch { /* fall through to ZXing */ }
    }

    // ZXing canvas fallback for older Chrome / Firefox / Safari
    animRef.current = requestAnimationFrame(scanCanvas);
    return () => cancelAnimationFrame(animRef.current);
  }, [scanning, zxingReady]);

  const handleDetected = (code: string) => {
    if (!code) return;
    const now = Date.now();
    if (code === lastCodeRef.current && now - lastTimeRef.current < 2000) return;
    lastCodeRef.current = code;
    lastTimeRef.current = now;
    setDetected(code);
    toast.success(`Scanned: ${code}`, { icon: '🎯', duration: 2000 });
    onScan(code);
  };

  const flipCamera = () => {
    const newFacing = !facingBack;
    setFacingBack(newFacing);
    startCamera(undefined, newFacing);
  };

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
            <span className="font-semibold text-white text-sm">Camera Scanner</span>
            {scanning && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Flip camera button */}
            <button
              onClick={flipCamera}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              title="Flip camera"
            >
              <FlipHorizontal size={16} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Camera view */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>

          {/* Loading lib */}
          {loadingLib && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-brand-400" />
              <p className="text-slate-400 text-sm">Loading scanner library…</p>
            </div>
          )}

          {/* Error state */}
          {error && !loadingLib && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <CameraOff size={28} className="text-red-400" />
              </div>
              <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
              <button
                onClick={() => startCamera()}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
              >
                <RefreshCw size={13} /> Try Again
              </button>
            </div>
          )}

          {/* Video */}
          {!error && !loadingLib && (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Hidden canvas for ZXing processing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative w-64 h-44 z-10">
                  {/* Corner brackets */}
                  {[
                    'top-0 left-0 border-t-4 border-l-4',
                    'top-0 right-0 border-t-4 border-r-4',
                    'bottom-0 left-0 border-b-4 border-l-4',
                    'bottom-0 right-0 border-b-4 border-r-4',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-10 h-10 ${cls} border-brand-400`} />
                  ))}
                  {/* Animated scan line */}
                  <div
                    className="absolute inset-x-2 h-0.5 bg-brand-400 shadow-[0_0_12px_4px_rgba(99,102,241,0.8)]"
                    style={{ animation: 'scanLine 2s ease-in-out infinite', top: '50%' }}
                  />
                  <p className="absolute -bottom-7 left-0 right-0 text-center text-white text-xs font-medium drop-shadow">
                    Align barcode within the frame
                  </p>
                </div>
              </div>

              {/* Detected flash */}
              {detected && (
                <div className="absolute top-3 left-3 right-3 bg-emerald-500/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 animate-slide-in">
                  <CheckCircle size={14} className="text-white flex-shrink-0" />
                  <p className="text-white text-xs font-mono font-semibold truncate">{detected}</p>
                </div>
              )}

              {!scanning && (
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

        {/* Controls */}
        <div className="px-4 py-3 space-y-3">

          {/* Camera switcher */}
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

          {/* Compatibility info */}
          <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-2.5">
            <AlertCircle size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Works on <span className="text-white">all Chrome versions</span>, Firefox, Safari, Edge — laptop and mobile.
              Supports EAN-13, EAN-8, QR Code, Code-128, Code-39, UPC-A.
            </p>
          </div>

          <button onClick={onClose} className="btn-secondary w-full text-sm py-2">
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
  const [mode, setMode]             = useState<'scan' | 'generate'>('scan');
  const [manualInput, setManualInput] = useState('');
  const [lookupCode, setLookupCode]   = useState('');
  const [generateSku, setGenerateSku] = useState('');
  const [printCount, setPrintCount]   = useState(1);
  const [showCamera, setShowCamera]   = useState(false);
  const [lastScanned, setLastScanned] = useState('');

  // HID scanner buffer (USB barcode scanner)
  const bufferRef  = useRef('');
  const lastKeyRef = useRef(0);

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

  const handleCameraScan = useCallback((code: string) => {
    setLastScanned(code);
    setLookupCode(code);
    setManualInput(code);
    setShowCamera(false);
  }, []);

  const { data: foundProduct, isLoading: looking, isError: notFound } = useQuery({
    queryKey: ['barcode-lookup', lookupCode],
    queryFn: () => api.get(`/products/barcode/${lookupCode}`).then(r => r.data.data),
    enabled: lookupCode.length >= 4,
    retry: false,
  });

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

  const selectedProduct = allProducts?.find((p: Product) =>
    p.variants.some((v: ProductVariant) => v.sku === generateSku)
  );
  const selectedVariant = selectedProduct?.variants.find(
    (v: ProductVariant) => v.sku === generateSku
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {showCamera && (
        <LiveCameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
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

          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Scanner</h2>
              {lastScanned && (
                <span className="badge badge-green font-mono text-xs">{lastScanned}</span>
              )}
            </div>

            {/* Big camera button */}
            <button
              onClick={() => setShowCamera(true)}
              className="w-full flex flex-col items-center gap-3 py-8 rounded-xl border-2 border-dashed border-brand-500/40 bg-brand-600/5 hover:bg-brand-600/10 hover:border-brand-500/70 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center group-hover:bg-brand-600/30 transition-colors">
                <Camera size={30} className="text-brand-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-base">Activate Camera Scanner</p>
                <p className="text-slate-400 text-sm mt-1">
                  Opens your laptop or mobile camera
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  All Chrome versions
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Firefox &amp; Safari
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Mobile
                </span>
              </div>
            </button>

            {/* USB scanner info */}
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3">
              <Zap size={15} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-300 font-medium">USB / Bluetooth Scanner</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect a physical scanner — works automatically, no setup needed
                </p>
              </div>
            </div>

            {/* Manual input */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Manual Lookup</p>
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
                  <Search size={14} /> Find
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

                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Variants</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {foundProduct.variants.map((v: ProductVariant) => (
                      <div key={v.sku} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                        v.barcode === lookupCode || v.sku === lookupCode
                          ? 'bg-brand-600/15 border border-brand-500/30'
                          : 'bg-slate-800/50'
                      }`}>
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

                <div className="bg-white rounded-xl p-4 flex justify-center">
                  <BarcodeDisplay
                    value={foundProduct.variants[0]?.barcode || foundProduct.variants[0]?.sku || lookupCode}
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
          <div className="card space-y-4">
            <h2 className="font-semibold text-white">Select Product Variant</h2>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Product → Variant SKU</label>
              <select value={generateSku} onChange={e => setGenerateSku(e.target.value)} className="input w-full text-sm">
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
                  <div><p className="text-slate-500">SKU</p><p className="text-white font-mono mt-0.5">{selectedVariant.sku}</p></div>
                  <div><p className="text-slate-500">Price</p><p className="text-white font-medium mt-0.5">{formatCurrency(selectedVariant.price)}</p></div>
                  {selectedVariant.barcode && (
                    <div><p className="text-slate-500">Barcode</p><p className="text-white font-mono mt-0.5">{selectedVariant.barcode}</p></div>
                  )}
                  <div><p className="text-slate-500">Attributes</p><p className="text-white mt-0.5">{Object.values(selectedVariant.attributes || {}).join(', ') || '—'}</p></div>
                </div>
              </div>
            )}

            {generateSku && (
              <div className="border-t border-slate-800 pt-4 space-y-3 animate-slide-in">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Number of Labels to Print</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPrintCount(Math.max(1, printCount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors">−</button>
                    <span className="text-white font-semibold text-lg w-8 text-center">{printCount}</span>
                    <button onClick={() => setPrintCount(Math.min(100, printCount + 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors">+</button>
                  </div>
                </div>
                <button onClick={() => toast.success(`Sent ${printCount} label${printCount > 1 ? 's' : ''} to printer`)}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  <Printer size={15} />
                  Print {printCount} Label{printCount > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-white mb-4">Barcode Preview</h2>
            {!generateSku ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Barcode size={40} className="text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Select a variant to preview its barcode</p>
              </div>
            ) : (
              <div className="space-y-6 animate-slide-in">
                <div className="bg-white rounded-xl p-6 space-y-3">
                  <div className="text-center">
                    <p className="text-slate-800 font-bold text-sm">{selectedProduct?.name}</p>
                    <p className="text-slate-500 text-xs">{Object.values(selectedVariant?.attributes || {}).join(' · ')}</p>
                  </div>
                  <div className="flex justify-center">
                    <BarcodeDisplay value={selectedVariant?.barcode || selectedVariant?.sku || ''} label={selectedVariant?.sku} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 border-t border-slate-200 pt-2 mt-2">
                    <span>{selectedProduct?.category}</span>
                    <span className="font-bold">{formatCurrency(selectedVariant?.price || 0)}</span>
                  </div>
                </div>

                {(selectedProduct?.variants?.length || 0) > 1 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">All Variants</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedProduct?.variants.map((v: ProductVariant) => (
                        <button key={v.sku} onClick={() => setGenerateSku(v.sku)}
                          className={`bg-white rounded-lg p-3 transition-all ${v.sku === generateSku ? 'ring-2 ring-brand-500' : 'opacity-60 hover:opacity-90'}`}>
                          <BarcodeDisplay value={v.barcode || v.sku} label={Object.values(v.attributes || {}).join(' / ') || v.sku} />
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
