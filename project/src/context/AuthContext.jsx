import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Use Vite dev proxy. Backend routes are under /auth
const AUTH_BASE = '/auth';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'admin' | 'user'
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load persisted auth on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedUserType = localStorage.getItem('userType');
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedAuth === 'true' && savedUserType && savedUser && savedToken) {
      setIsAuthenticated(true);
      setUserType(savedUserType);
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Real login via FastAPI
  const login = async (credentials, _activeTab = 'user') => {
    setLoading(true);
    try {
      const isAdmin = _activeTab === 'admin';
      const body = isAdmin
        ? { username: credentials.username || credentials.email, password: credentials.password }
        : { email: credentials.username || credentials.email, password: credentials.password };

      // timeout wrapper to avoid indefinite waiting
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      // debug trace
      try { console.debug('[auth] login start', { isAdmin, body }); } catch (_) {}

      const res = await fetch(`${AUTH_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      try { console.debug('[auth] login response', res.status); } catch (_) {}
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        let message = `Login failed (${res.status})`;
        if (err) {
          if (typeof err === 'string') message = err;
          else if (Array.isArray(err.detail)) message = err.detail.map(e => e.msg).join('; ');
          else if (typeof err.detail === 'string') message = err.detail;
          else if (err.detail && typeof err.detail === 'object' && err.detail.msg) message = err.detail.msg;
        }
        return { success: false, error: message };
      }
      const data = await res.json();
      const role = data.role;
      const accessToken = data.access_token;
      const apiUser = data.user || {};
      const userData = {
        username: apiUser.full_name || apiUser.email,
        email: apiUser.email,
        role,
        _id: apiUser._id,
      };

      setIsAuthenticated(true);
      setUserType(role);
      setUser(userData);
      setToken(accessToken);

      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userType', role);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', accessToken);

      return { success: true, role };
    } catch (e) {
      try { console.error('[auth] login error', e); } catch (_) {}
      const aborted = e && (e.name === 'AbortError' || e.message?.includes('aborted'));
      return { success: false, error: aborted ? 'Cannot reach the server. Please ensure the backend is running on http://localhost:8001 and try again.' : (e?.message || 'Login failed') };
    } finally {
      setLoading(false);
    }
  };

  const register = async (form) => {
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.username || form.email,
          full_name: form.name || form.full_name,
          password: form.password,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        let message = `Registration failed (${res.status})`;
        if (err) {
          if (typeof err === 'string') message = err;
          else if (Array.isArray(err.detail)) message = err.detail.map(e => e.msg).join('; ');
          else if (typeof err.detail === 'string') message = err.detail;
          else if (err.detail && typeof err.detail === 'object' && err.detail.msg) message = err.detail.msg;
        }
        return { success: false, error: message };
      }
      await res.json();
      return { success: true };
    } catch (e) {
      return { success: false, error: e && e.message ? e.message : 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setUser(null);
    setToken(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userType');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const getAuthHeader = () => (token ? { Authorization: `Bearer ${token}` } : {});

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userType, 
      user, 
      token,
      loading,
      login, 
      register,
      logout,
      getAuthHeader
    }}>
      {children}
    </AuthContext.Provider>
  );
};
