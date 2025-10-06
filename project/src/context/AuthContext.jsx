import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [user, setUser] = useState(null);

  const login = (userData, type) => {
    setIsAuthenticated(true);
    setUserType(type);
    setUser(userData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userType, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
