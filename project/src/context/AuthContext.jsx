import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_URL = 'http://localhost:8001'; // Unified backend API

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Simplified (auth temporarily disabled)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userType, setUserType] = useState('admin');
  const [user, setUser] = useState({ username: 'demo', role: 'admin' });
  const [token, setToken] = useState('dev-token');
  const [loading, setLoading] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    // No-op: auth disabled; preload demo user
  }, []);

  const login = async () => ({ success: true, role: 'admin' });

  const register = async () => ({ success: true });

  const logout = () => {
    // Reset to demo user instead of full unauthenticated state
    setIsAuthenticated(true);
    setUserType('admin');
    setUser({ username: 'demo', role: 'admin' });
    setToken('dev-token');
  };

  const getAuthHeader = () => ({ });

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
