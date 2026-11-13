import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Network, Lock, User, Mail, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        username_or_email: username,
        password: password,
      });
      login(res.data.access_token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        username,
        email,
        password,
        confirm_password: confirmPassword,
        full_name: fullName,
      });

      // Auto login after registration
      const loginRes = await api.post('/auth/login', {
        username_or_email: username,
        password: password,
      });
      login(loginRes.data.access_token, loginRes.data.user);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (role: 'admin' | 'analyst') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('Admin@123456');
    } else {
      setUsername('analyst');
      setPassword('Analyst@123456');
    }
    setErrorMessage(null);
  };

  const handleForgotPassword = () => {
    setInfoMessage(
      'Secure password reset: In local development, an SMTP mailer is intentionally unconfigured. Administrators can manage credentials directly in the backend database.'
    );
  };

  return (
    <div className="min-h-screen bg-[#070b12] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-3">
            <Network className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IntelliNet</h1>
          <p className="text-xs text-slate-400 mt-1">
            Intelligent Network Monitoring & Intrusion Detection
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-950/80 p-1 mb-6 border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isRegistering ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isRegistering ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Analyst
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or analyst"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Security Analyst"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              {!isRegistering && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>{isRegistering ? 'Complete Registration' : 'Authenticate Console'}</span>
          </button>
        </form>

        {/* Quick-fill helpers for evaluation */}
        {!isRegistering && (
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 mb-2">Quick-fill Demo Credentials:</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => quickFill('admin')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-slate-700 transition-colors"
              >
                Admin (Admin@123456)
              </button>
              <button
                type="button"
                onClick={() => quickFill('analyst')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 transition-colors"
              >
                Analyst (Analyst@123456)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
