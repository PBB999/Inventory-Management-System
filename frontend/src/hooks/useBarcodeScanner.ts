import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxDelay?: number; // ms between keystrokes to be considered a scan
  enabled?: boolean;
}

/**
 * Listens for rapid keyboard input (barcode scanner behavior).
 * Scanners emit chars very fast (< 50ms apart) then send Enter.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 6,
  maxDelay = 80,
  enabled = true,
}: BarcodeScannerOptions) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if focus is inside a text input (user is typing normally)
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const now = Date.now();
      const delta = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const code = buffer.current.trim();
        buffer.current = '';
        if (code.length >= minLength) {
          onScan(code);
        }
        return;
      }

      // Reset buffer if too slow (human typing, not scanner)
      if (delta > maxDelay && buffer.current.length > 0) {
        buffer.current = '';
      }

      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    },
    [enabled, minLength, maxDelay, onScan]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
