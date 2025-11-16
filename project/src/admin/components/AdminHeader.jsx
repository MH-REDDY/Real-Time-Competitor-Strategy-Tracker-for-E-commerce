import { Headphones, User } from 'lucide-react';
import { styles } from '../styles/adminStyles';
import { useState } from 'react';

const AdminHeader = ({ currentView, setCurrentView, onLogout, userName }) => {
  const [hovered, setHovered] = useState(null);
  const [logoutHover, setLogoutHover] = useState(false);

  const mapLabel = (label) => {
    if (label === 'Prices') return 'Price Forecast';
    if (label === 'Inventory') return 'Products';
    return label;
  };
  const isActive = (label) => currentView === mapLabel(label);

  const handleNav = (label) => {
    setCurrentView(mapLabel(label));
  };

  return (
    <header style={styles.adminHeader}>
      <div style={styles.adminHeaderInner}>
        <div
          style={styles.adminLogoWrap}
          role="button"
          tabIndex={0}
          onClick={() => setCurrentView('Dashboard')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setCurrentView('Dashboard')}
        >
          <div style={styles.adminLogoBox}>
            <Headphones size={32} />
          </div>
          <h1 style={styles.adminLogoText}>Ignite Admin</h1>
        </div>

        <nav style={styles.adminNav}>
          {['Prices', 'Compare', 'Orders', 'Inventory', 'Users'].map((label) => (
            <button
              key={label}
              style={{
                ...styles.adminNavItem,
                ...(isActive(label) ? styles.adminNavItemActive : {}),
                ...(hovered === label && !isActive(label) ? styles.adminNavItemHover : {}),
              }}
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleNav(label)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={styles.adminHeaderRight}>
          <div style={styles.adminUserBadge}>
            <User size={18} />
            <span>{userName || 'Admin'}</span>
          </div>
          <button
            style={{ ...styles.logoutBtn, ...(logoutHover ? styles.logoutBtnHover : {}) }}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
