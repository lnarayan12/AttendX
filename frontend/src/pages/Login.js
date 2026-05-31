import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ── Left panel ── */}
      <div className="login-left">
        {/* Background effects */}
        <div className="login-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="grid-overlay" />
          <div className="particles">
            {[1,2,3,4,5,6].map(i => <div key={i} className="particle" />)}
          </div>
        </div>

        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="logo-icon">
              <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
                <path d="M7 8h14M7 14h10M7 20h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="21" cy="19" r="4" fill="#a78bfa"/>
                <path d="M19.5 19l1 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">AttendX</span>
          </div>

          <div className="login-header">
            <h1>Welcome back</h1>
            <p>Sign in to manage attendance</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field-group">
              <label>Username</label>
              <div className="input-wrap">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                  required
                  id="login-username"
                />
              </div>
            </div>

            <div className="field-group">
              <label>Password</label>
              <div className="input-wrap">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                  id="login-password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPwd(s => !s)} id="toggle-password">
                  {showPwd ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading} id="login-submit">
              {loading ? <span className="spinner" /> : 'Sign In →'}
            </button>
          </form>

          <div className="login-hint">
            <span>Default:</span> admin / admin123
          </div>
        </div>
      </div>

      {/* ── Right decorative panel (desktop only) ── */}
      <div className="login-right">
        <div className="right-blob-1" />
        <div className="right-blob-2" />

        <div className="right-illustration">
          <div className="right-circle">
            <svg className="right-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        </div>

        <div className="right-text">
          <h2>Track Attendance Effortlessly</h2>
          <p>Manage members, mark attendance,<br/>and generate insightful reports — all in one place.</p>
        </div>

        <div className="right-dots">
          <div className="right-dot active" />
          <div className="right-dot" />
          <div className="right-dot" />
        </div>
      </div>
    </div>
  );
}
