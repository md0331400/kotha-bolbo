import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';
import { showToast } from '@/components/ui';

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthScreen = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup, login, forgotPassword, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    try {
      if (mode === 'signup') {
        if (!name.trim()) { showToast('Please enter your name', 'error'); setLoading(false); return; }
        if (password !== confirmPassword) { showToast('Passwords do not match', 'error'); setLoading(false); return; }
        if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); setLoading(false); return; }
        await signup(email, password, name.trim());
        showToast('Account created successfully!', 'success');
      } else if (mode === 'login') {
        await login(email, password);
        showToast('Welcome back!', 'success');
      } else {
        if (!email.trim()) { showToast('Please enter your email', 'error'); setLoading(false); return; }
        await forgotPassword(email);
        showToast('Password reset email sent!', 'success');
        setMode('login');
      }
    } catch (err: any) {
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ background: '#0a0e1a' }}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb" style={{ width: 300, height: 300, top: '-5%', right: '-20%', background: '#00d4ff' }} />
        <div className="gradient-orb" style={{ width: 250, height: 250, bottom: '10%', left: '-15%', background: '#7c3aed' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-8">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-slideUp">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulseGlow"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold mb-1"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Kotha Bolbo
          </h1>
          <p className="text-gray-500 text-sm">
            {mode === 'login' ? 'Welcome back! Sign in to continue' : mode === 'signup' ? 'Create your account to get started' : 'Reset your password'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass rounded-2xl p-6 animate-slideUp" style={{ animationDelay: '0.1s' }}>
          {/* Tab switcher */}
          {mode !== 'forgot' && (
            <div className="flex rounded-xl mb-6 p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => switchMode('login')}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: mode === 'login' ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'transparent',
                  color: mode === 'login' ? 'white' : 'rgba(255,255,255,0.4)',
                }}
              >
                Login
              </button>
              <button
                onClick={() => switchMode('signup')}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: mode === 'signup' ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'transparent',
                  color: mode === 'signup' ? 'white' : 'rgba(255,255,255,0.4)',
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-danger" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium ml-1">Full Name</label>
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium ml-1">Email</label>
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password (not for forgot) */}
            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium ml-1">Password</label>
                <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-300">
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium ml-1">Confirm Password</label>
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-accent hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 mt-6"
              disabled={loading}
              style={{ boxShadow: '0 8px 30px rgba(0, 212, 255, 0.25)' }}
            >
              {loading ? (
                <Spinner size={20} />
              ) : (
                mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'
              )}
            </button>
          </form>

          {/* Back to login from forgot */}
          {mode === 'forgot' && (
            <div className="text-center mt-4">
              <button onClick={() => switchMode('login')} className="text-sm text-accent hover:underline">
                ← Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-8">
          By continuing, you agree to our Terms of Service & Privacy Policy
        </p>
      </div>
    </div>
  );
};
