import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Modal, Spinner, showToast } from '@/components/ui';
import { requestNotificationPermission } from '@/onesignal';

export const SettingsScreen = () => {
  const { user, logout, changePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { showToast('Please fill all fields', 'error'); return; }
    if (newPassword !== confirmNewPassword) { showToast('New passwords do not match', 'error'); return; }
    if (newPassword.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifEnabled(result);
    showToast(result ? 'Notifications enabled!' : 'Notification permission denied', result ? 'success' : 'error');
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      showToast('Logged out successfully', 'info');
    } catch {
      showToast('Failed to logout', 'error');
    }
  };

  const settingsItems: Array<{
    section: string;
    items: Array<{
      icon: React.ReactNode;
      label: string;
      value?: string | boolean;
      toggle?: boolean;
      action?: () => void | Promise<void>;
    }>;
  }> = [
    {
      section: 'Account',
      items: [
        {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ),
          label: 'Change Password',
          action: () => setShowPasswordModal(true),
        },
        {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          ),
          label: 'Privacy',
          value: 'Standard',
        },
      ],
    },
    {
      section: 'Notifications',
      items: [
        {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          ),
          label: 'Push Notifications',
          toggle: true,
          value: notifEnabled,
          action: handleEnableNotifications,
        },
      ],
    },
    {
      section: 'About',
      items: [
        {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
          label: 'Version',
          value: '1.0.0',
        },
        {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          ),
          label: 'Made with ❤️',
          value: 'Kotha Bolbo Team',
        },
      ],
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 safe-top">
        <h1
          className="text-2xl font-bold"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Settings
        </h1>
      </div>

      {/* User card */}
      <div className="px-4 py-3">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {user?.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-100 truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Settings sections */}
      <div className="flex-1 px-4 py-2 space-y-6">
        {settingsItems.map((section) => (
          <div key={section.section}>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 ml-1">{section.section}</p>
            <div className="glass rounded-2xl overflow-hidden">
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors ${idx > 0 ? 'border-t border-white/5' : ''}`}
                  style={{ textAlign: 'left' }}
                >
                  {item.icon}
                  <span className="flex-1 text-[15px] text-gray-200">{item.label}</span>
                  {item.toggle ? (
                    <div
                      className="w-11 h-6 rounded-full relative transition-colors duration-200 cursor-pointer"
                      style={{ background: item.value ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.1)' }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: item.value ? 'translateX(22px)' : 'translateX(2px)' }}
                      />
                    </div>
                  ) : item.value ? (
                    <span className="text-sm text-gray-500">{item.value}</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="pt-2 pb-8">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-3.5 rounded-2xl text-danger font-semibold text-[15px] transition-all duration-200 hover:bg-danger/10"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium ml-1">Current Password</label>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full" placeholder="Enter current password" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium ml-1">New Password</label>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full" placeholder="Enter new password" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium ml-1">Confirm New Password</label>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full" placeholder="Confirm new password" />
            </div>
          </div>
          <button onClick={handleChangePassword} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {loading ? <Spinner size={18} /> : 'Change Password'}
          </button>
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Log Out">
        <div className="text-center">
          <p className="text-gray-400 mb-6">Are you sure you want to log out?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 rounded-xl font-semibold text-gray-300" style={{ background: 'rgba(255,255,255,0.06)' }}>
              Cancel
            </button>
            <button onClick={handleLogout} className="flex-1 py-3 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              Log Out
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
