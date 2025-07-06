import { useState, useCallback, createContext, useContext } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

const NotificationContext = createContext<any>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<NotificationType>('info');

  const show = useCallback((msg: string, t: NotificationType = 'info') => {
    setMessage(msg);
    setType(t);
    setTimeout(() => setMessage(null), 3500);
  }, []);

  return (
    <NotificationContext.Provider value={show}>
      {children}
      {message && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-bold transition-all
          ${type === 'success' ? 'bg-panAfrican-green' : type === 'error' ? 'bg-panAfrican-crimson' : 'bg-panAfrican-gold text-black'}`}
        >
          {message}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
} 