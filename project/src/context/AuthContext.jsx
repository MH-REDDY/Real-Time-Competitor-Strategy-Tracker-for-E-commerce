import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

const API_URL = 'http://localhost:8000'; // Backend API URL

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Function to fetch user/admin data using the token
  const fetchUserData = useCallback(async () => {
    try {
      if (!token) return;

      // read cached user role if present
      const cached = localStorage.getItem('user');
      const cachedUser = cached ? JSON.parse(cached) : null;
      const isAdmin = cachedUser?.role === 'admin';

      const url = isAdmin ? `${API_URL}/api/admin/dashboard` : `${API_URL}/api/auth/me`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const nextUser = isAdmin ? (data.user || cachedUser || { role: 'admin' }) : data;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
        setIsAuthenticated(true);
      } else {
        // Token might be invalid, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Check for existing token on mount and restore cached user (admin/user)
  useEffect(() => {
    if (token) {
      // optimistic restore to avoid redirect flicker
      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          const cachedUser = JSON.parse(cached);
          setUser(cachedUser);
          setIsAuthenticated(true);
        } catch {}
      }
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [token, fetchUserData]);

  const login = async (username, password) => {
    try {
      console.log('Login attempt started for user:', username);
      setLoading(true);
      setError('');
      
      // First try admin login
      console.log('Attempting admin login...');
      let response;
      try {
        response = await fetch(`${API_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            password: password
          })
        });
        console.log('Admin login response status:', response.status);
      } catch (err) {
        console.error('Admin login request failed:', err);
        throw err;
      }

      if (response.ok) {
        console.log('Admin login successful, processing response...');
        const data = await response.json();
        console.log('Admin login response data:', data);
        
        const access_token = data.access_token;
        
        if (!access_token) {
          console.error('No access token received in admin login response');
          throw new Error('No access token received');
        }
        
        // Store the token and user data
        console.log('Storing admin auth data...');
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(access_token);
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Return success with role information
        return { 
          success: true, 
          role: 'admin' 
        };
      } else {
        console.log('Admin login failed, status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.log('Admin login error details:', errorData);
      }
      // If not admin, try regular user login
      console.log('Trying regular user login...');
      const userFormData = new URLSearchParams();
      userFormData.append('username', username);
      userFormData.append('password', password);
      
      response = await fetch(`${API_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: userFormData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = response.status === 401 
          ? 'Incorrect username or password' 
          : errorData.detail || 'Login failed. Please try again.';
        throw new Error(errorMessage);
      }
      
      // For regular user login
      const userData = await response.json();
      const userToken = userData.access_token;
      
      if (!userToken) {
        throw new Error('No access token received');
      }
      
      // Store the token and user data
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(userToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Fetch and set any additional user data
      await fetchUserData();
      
      return {
        success: true,
        role: 'user'
      };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name || userData.name || ''
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        // Handle validation errors
        if (response.status === 422 && responseData.detail) {
          const errorDetail = Array.isArray(responseData.detail) 
            ? responseData.detail.map(err => `${err.loc[1]}: ${err.msg}`).join('\n')
            : responseData.detail;
          throw new Error(errorDetail);
        }
        throw new Error(responseData.detail || 'Registration failed. Please try again.');
      }

      // If we get a token in the response, use it
      if (responseData.access_token) {
        localStorage.setItem('token', responseData.access_token);
        setToken(responseData.access_token);
        await fetchUserData();
      } else {
        // If no token, try to log in with the new credentials
        const loginResult = await login(userData.email, userData.password);
        if (!loginResult.success) {
          return loginResult; // Return the login error
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.message || 'Registration failed. Please check your information and try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  const getAuthHeader = () => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const value = {
    isAuthenticated,
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
