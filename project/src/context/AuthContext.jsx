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
  // Simple routing state (no backend auth, just local state)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check localStorage on mount to persist login across refreshes
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedUserType = localStorage.getItem('userType');
    const savedUser = localStorage.getItem('user');
    
    if (savedAuth === 'true' && savedUserType && savedUser) {
      setIsAuthenticated(true);
      setUserType(savedUserType);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Simple login - accept any input and set role based on activeTab
  const login = async (credentials, activeTab = 'user') => {
    setLoading(true);
    
    // Simulate brief delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Role is determined by which tab the user clicked login from
    const role = activeTab === 'admin' ? 'admin' : 'user';
    
    const userData = {
      username: credentials.username || credentials.email,
      email: credentials.email || credentials.username,
      role: role
    };
    
    setIsAuthenticated(true);
    setUserType(role);
    setUser(userData);
    
    // Persist to localStorage
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userType', role);
    localStorage.setItem('user', JSON.stringify(userData));
    
    setLoading(false);
    return { success: true, role: role };
  };

  const register = async (userData) => {
    setLoading(true);
    
    // Simulate brief delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setLoading(false);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setUser(null);
    setToken(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userType');
    localStorage.removeItem('user');
  };

  const getAuthHeader = () => ({});

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
