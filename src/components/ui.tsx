import { useEffect, useState, ReactNode } from 'react';
import { User, ToastMessage } from '@/types';

// ===== TOAST SYSTEM =====
let toastId = 0;
let setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>> | null = null;

export const showToast = (text: string, type: ToastMessage['type'] = 'info') => {
  if (!setToasts) return;
  const id = `toast-${++toastId}`;
  setToasts(prev => [...prev, { id, text, type }]);
  setTimeout(() => {
    setToasts?.(prev => prev.filter(t => t.id !== id));
  }, 3000);
};

export const ToastContainer = () => {
  const [toasts, setToastsState] = useState<ToastMessage[]>([]);
  setToasts = setToastsState;

  return (
    <div className="fixed top-4 left-4 right-4 z-[80] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass-strong rounded-xl px-5 py-3 pointer-events-auto animate-slideDown max-w-sm w-full text-center"
          style={{
            borderLeft: `3px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#00d4ff'}`,
          }}
        >
          <p className="text-sm text-gray-200">{toast.text}</p>
        </div>
      ))}
    </div>
  );
};

// ===== AVATAR COMPONENT =====
interface AvatarProps {
  user?: User | null;
  size?: number;
  showOnline?: boolean;
  onClick?: () => void;
}

export const Avatar = ({ user, size = 44, showOnline = false, onClick }: AvatarProps) => {
  const colors = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  const colorIndex = user?.uid ? user.uid.charCodeAt(0) % colors.length : 0;
  const bgColor = colors[colorIndex];
  const initials = user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : '?';

  return (
    <div
      className="relative flex-shrink-0 rounded-full overflow-hidden cursor-pointer"
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold"
          style={{ background: `linear-gradient(135deg, ${bgColor}, ${colors[(colorIndex + 2) % colors.length]})`, fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      {showOnline && user && (
        <div className={user.online ? 'online-dot' : 'offline-dot'} style={{ width: size * 0.28, height: size * 0.28, borderWidth: 2 }} />
      )}
    </div>
  );
};

// ===== MODAL COMPONENT =====
interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export const Modal = ({ open, onClose, children, title }: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-strong rounded-t-3xl sm:rounded-3xl animate-slideUp max-h-[85vh] overflow-y-auto">
        {title && (
          <div className="sticky top-0 glass-strong rounded-t-3xl px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ===== LOADING SPINNER =====
export const Spinner = ({ size = 24 }: { size?: number }) => (
  <div className="animate-spin" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#00d4ff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
);

// ===== TYPING INDICATOR =====
export const TypingIndicator = () => (
  <div className="flex items-center gap-2 px-4 py-2 animate-fadeIn">
    <div className="msg-received px-4 py-3 flex items-center gap-1">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
);

// ===== EMPTY STATE =====
export const EmptyState = ({ icon, title, description }: { icon: ReactNode; title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center h-full px-8 text-center animate-fadeIn">
    <div className="w-20 h-20 rounded-full glass flex items-center justify-center mb-4 text-gray-500">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
  </div>
);

// ===== SEARCH BAR =====
interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChange, placeholder = 'Search...' }: SearchBarProps) => (
  <div className="relative">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    )}
  </div>
);

// ===== DATE SEPARATOR =====
export const DateSeparator = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center my-4">
    <div className="px-4 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
      {label}
    </div>
  </div>
);

// ===== OFFLINE BANNER =====
export const OfflineBanner = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-warning/20 text-warning text-center text-xs py-1.5 font-medium animate-slideDown">
      No internet connection. Messages will be sent when reconnected.
    </div>
  );
};
