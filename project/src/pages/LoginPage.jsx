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
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (activeTab === 'user' && isSignup) {
      if (!formData.name || !formData.username || !formData.password) {
        alert('Please fill in all fields');
        return;
      }
      if (!formData.termsAccepted) {
        alert('Please accept the terms and conditions');
        return;
      }
    } else {
      if (!formData.username || !formData.password) {
        alert('Please fill in all fields');
        return;
      }
    }

    login({ username: formData.username, name: formData.name }, activeTab);
    navigate('/');
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
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
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

            <button type="submit" className="submit-btn">
              {isSignup ? 'Create Account' : 'Login'}
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
