import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Shield, Sparkles, User, Lock, Phone, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export function AuthScreen() {
  const { login, phoneLogin, checkPhone, register, demoLogin } = useAuth();
  const [mode, setMode] = useState('phone'); // 'phone' | 'demo' | 'login' | 'register'
  const [directPhone, setDirectPhone] = useState('');
  const [directName, setDirectName] = useState('');
  const [phoneStatus, setPhoneStatus] = useState(null);
  const [loginPhone, setLoginPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoUsers = [
    { username: 'alice', name: 'Alice Johnson', phone: '+919000000001', role: 'Product Lead', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice' },
    { username: 'bob', name: 'Bob Miller', phone: '+919000000002', role: 'Frontend Engineer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob' },
    { username: 'priya', name: 'Priya Sharma', phone: '+919000000003', role: 'Backend Architect', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=priya' },
    { username: 'carlos', name: 'Carlos Diaz', phone: '+919000000004', role: 'Mobile Dev', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=carlos' }
  ];

  const handlePhoneChange = async (val) => {
    setDirectPhone(val);
    setError('');
    const clean = val.trim().replace(/[\s()-]/g, '');
    if (clean.length >= 10) {
      try {
        const res = await checkPhone(clean);
        if (res && res.exists) {
          setPhoneStatus({ isExisting: true, text: `✓ Registered: ${res.user.display_name}` });
          if (!directName) setDirectName(res.user.display_name);
        } else {
          setPhoneStatus({ isExisting: false, text: '• New number (Auto-registration)' });
        }
      } catch (e) {
        // silent fail on network/aborted check
      }
    } else {
      setPhoneStatus(null);
    }
  };

  const handleDirectPhoneSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!directPhone.trim()) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await phoneLogin(directPhone, directName);
    } catch (err) {
      setError(err.message || 'Direct phone login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillPhone = async (num, name) => {
    setDirectPhone(num);
    setDirectName(name);
    setError('');
    setLoading(true);
    try {
      await phoneLogin(num, name);
    } catch (err) {
      setError(err.message || 'Direct phone login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (u) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(u);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginPhone, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, phone, password, displayName);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-wa-light-bg dark:bg-wa-dark-bg p-4">
      {/* Top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-32 bg-wa-teal dark:bg-wa-dark-sent -z-10" />

      <div className="w-full max-w-md bg-white dark:bg-wa-dark-panel rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-wa-dark-border">
        {/* Header */}
        <div className="bg-wa-teal dark:bg-wa-dark-panel px-6 py-8 text-center text-white border-b border-wa-teal-dark dark:border-wa-dark-border">
          <div className="inline-flex p-3 bg-white/20 dark:bg-wa-teal/20 rounded-2xl mb-3 backdrop-blur-sm">
            <MessageSquare className="w-8 h-8 text-white dark:text-wa-teal" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">NLPChat</h1>
          <p className="text-sm text-white/80 dark:text-wa-dark-muted mt-1">
            Type in any slang or language — delivered in natural English.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-gray-200 dark:border-wa-dark-border bg-gray-50 dark:bg-wa-dark-header overflow-x-auto">
          <button
            onClick={() => { setMode('phone'); setError(''); }}
            className={`flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shrink-0 ${
              mode === 'phone'
                ? 'border-b-2 border-wa-teal text-wa-teal dark:text-wa-teal dark:border-wa-teal'
                : 'text-gray-500 dark:text-wa-dark-muted hover:text-gray-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Phone Direct
          </button>
          <button
            onClick={() => { setMode('demo'); setError(''); }}
            className={`flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shrink-0 ${
              mode === 'demo'
                ? 'border-b-2 border-wa-teal text-wa-teal dark:text-wa-teal dark:border-wa-teal'
                : 'text-gray-500 dark:text-wa-dark-muted hover:text-gray-700'
            }`}
          >
            Demo (1-Click)
          </button>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shrink-0 ${
              mode === 'login'
                ? 'border-b-2 border-wa-teal text-wa-teal dark:text-wa-teal dark:border-wa-teal'
                : 'text-gray-500 dark:text-wa-dark-muted hover:text-gray-700'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shrink-0 ${
              mode === 'register'
                ? 'border-b-2 border-wa-teal text-wa-teal dark:text-wa-teal dark:border-wa-teal'
                : 'text-gray-500 dark:text-wa-dark-muted hover:text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Direct Phone Login (Password-free) */}
          {mode === 'phone' && (
            <form onSubmit={handleDirectPhoneSubmit} className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Direct Phone Login (No Password)
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    Enter phone number to login directly. New numbers are registered automatically!
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text">
                    Phone Number
                  </label>
                  {phoneStatus && (
                    <span className={`text-[11px] font-medium flex items-center gap-1 ${
                      phoneStatus.isExisting ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {phoneStatus.isExisting && <CheckCircle2 className="w-3 h-3" />}
                      {phoneStatus.text}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={directPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="e.g. +91 90000 00001 or 9876543210"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal focus:ring-1 focus:ring-wa-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">
                  Display Name <span className="text-gray-400 font-normal">(Optional for existing / Recommended for new)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="e.g. Vikash Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !directPhone.trim()}
                className="w-full py-2.5 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
              >
                {loading ? (
                  'Logging in...'
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Direct Login with Phone</span>
                  </>
                )}
              </button>

              {/* Quick-fill test numbers */}
              <div className="pt-3 border-t border-gray-100 dark:border-wa-dark-border/40">
                <div className="text-[11px] font-medium text-gray-500 dark:text-wa-dark-muted mb-2">
                  Quick-fill & test registered numbers:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {demoUsers.map((u) => (
                    <button
                      type="button"
                      key={u.username}
                      onClick={() => handleQuickFillPhone(u.phone, u.name)}
                      disabled={loading}
                      className="text-left px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-wa-dark-header hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-gray-200 dark:border-wa-dark-border hover:border-emerald-300 dark:hover:border-emerald-700 text-gray-700 dark:text-wa-dark-text transition-colors flex items-center justify-between group"
                    >
                      <div className="truncate">
                        <div className="text-xs font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {u.phone}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-600 shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* 1-Click Demo Quick Switch */}
          {mode === 'demo' && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-wa-dark-muted mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Select a demo user to instantly test live messaging:
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {demoUsers.map((u) => (
                  <button
                    key={u.username}
                    onClick={() => handleDemoSelect(u.username)}
                    disabled={loading}
                    className="flex flex-col items-center p-3 rounded-xl border border-gray-200 dark:border-wa-dark-border hover:border-wa-teal dark:hover:border-wa-teal hover:bg-gray-50 dark:hover:bg-wa-dark-header transition-all text-center group"
                  >
                    <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full mb-2 bg-gray-100 dark:bg-wa-dark-header p-1" />
                    <span className="font-semibold text-sm text-gray-900 dark:text-wa-dark-text group-hover:text-wa-teal">
                      {u.name}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-wa-dark-muted">{u.role}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Tip: Open two browser windows to test real-time chat between Alice and Bob!</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="e.g. +91 90000 00001"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Registration Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
