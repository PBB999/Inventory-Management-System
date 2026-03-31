import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface OfflineOrder {
  id: string;
  payload: unknown;
  createdAt: string;
}

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  queueOrder: (payload: unknown) => void;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  queueOrder: () => {},
});

const STORAGE_KEY = 'pos_offline_queue';

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<OfflineOrder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const syncingRef = useRef(false);

  // Persist queue to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Listen for connectivity changes
  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  toast.success('Back online — syncing orders…'); };
    const handleOffline = () => { setIsOnline(false); toast.error('You are offline. Orders will sync when reconnected.'); };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending orders when coming back online
  useEffect(() => {
    if (!isOnline || queue.length === 0 || syncingRef.current) return;

    const sync = async () => {
      syncingRef.current = true;
      let successCount = 0;
      const remaining: OfflineOrder[] = [];

      for (const item of queue) {
        try {
          await api.post('/orders', { ...(item.payload as object), isOffline: true });
          successCount++;
        } catch {
          remaining.push(item);
        }
      }

      setQueue(remaining);
      syncingRef.current = false;

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline order${successCount > 1 ? 's' : ''}`);
      }
      if (remaining.length > 0) {
        toast.error(`${remaining.length} order${remaining.length > 1 ? 's' : ''} failed to sync`);
      }
    };

    sync();
  }, [isOnline, queue]);

  const queueOrder = (payload: unknown) => {
    const item: OfflineOrder = {
      id: `offline-${Date.now()}`,
      payload,
      createdAt: new Date().toISOString(),
    };
    setQueue(prev => [...prev, item]);
    toast('Order saved offline', { icon: '📦' });
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount: queue.length, queueOrder }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
