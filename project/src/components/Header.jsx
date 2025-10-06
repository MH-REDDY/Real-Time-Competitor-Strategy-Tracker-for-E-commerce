import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Headphones, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Header.css';

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo-section">
          <div className="logo-icon">
            <Headphones size={32} />
          </div>
          <h1 className="logo-text">Ignite</h1>
        </Link>

        <nav className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          {isAuthenticated && (
            <Link to="/browse-events" className="nav-link">Browse Events</Link>
          )}
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <Link to="/cart" className="cart-icon">
                <ShoppingCart size={24} />
                {getTotalItems() > 0 && (
                  <span className="cart-badge">{getTotalItems()}</span>
                )}
              </Link>
              <div className="user-section">
                <User size={20} />
                <span className="user-name">{user?.username}</span>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={20} />
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
