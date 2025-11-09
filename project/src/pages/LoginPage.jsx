import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleUser as UserCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('user');
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    termsAccepted: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'user' && isSignup) {
        // User Signup
        if (!formData.name || !formData.username || !formData.password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.username)) {
          setError('Please enter a valid email address (e.g., user@example.com)');
          setLoading(false);
          return;
        }
        if (!formData.termsAccepted) {
          setError('Please accept the terms and conditions');
          setLoading(false);
          return;
        }

        const result = await register({
          name: formData.name,
          username: formData.username,
          password: formData.password
        });

        if (result.success) {
          alert('Account created successfully! Please login with your email and password.');
          setIsSignup(false);
          resetForm();
        } else {
          setError(result.error || 'Unable to create account. Please try again.');
        }
      } else {
        // Login (both admin and user)
        if (!formData.username || !formData.password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        
        // Email validation for user login
        if (activeTab === 'user') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.username)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
          }
        }

        const result = await login({
          username: formData.username,
          password: formData.password
        }, activeTab);

        if (result.success) {
          // Redirect based on user type
          if (result.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        } else {
          setError(result.error || 'Unable to login. Please check your email and password.');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again or contact support.');
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      termsAccepted: false
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSignup(false);
    resetForm();
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Welcome to Ignite</h1>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'user' ? 'active' : ''}`}
              onClick={() => handleTabChange('user')}
            >
              <UserCircle size={20} />
              User
            </button>
            <button
              className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => handleTabChange('admin')}
            >
              <Shield size={20} />
              Admin
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message" style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                color: '#c33',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            {activeTab === 'user' && isSignup && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">
                {activeTab === 'user' ? 'Email Address' : 'Username'}
              </label>
              <input
                type={activeTab === 'user' ? 'email' : 'text'}
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder={activeTab === 'user' ? 'Enter your email' : 'Enter your username'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
              />
            </div>

            {activeTab === 'user' && isSignup && (
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleInputChange}
                  />
                  <span>I accept the terms and conditions</span>
                </label>
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Login')}
            </button>

            {activeTab === 'user' && (
              <div className="toggle-auth">
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    resetForm();
                  }}
                >
                  {isSignup
                    ? 'Already have an account? Login'
                    : "Don't have an account? Sign Up"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
