import React from 'react';
import { styles } from '../styles/adminStyles';

const AdminSidebar = ({ currentView, setCurrentView, onLogout, userName }) => {
  const getNavItemStyle = (viewName) => ({
    ...styles.navItem,
    ...(currentView === viewName ? styles.navItemActive : {}),
  });

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarHeader}>Admin Console</div>
      <ul style={styles.navList}>
        <li onClick={() => setCurrentView('Dashboard')} style={getNavItemStyle('Dashboard')}>
          🏠 Dashboard (Alerts)
        </li>
        <li onClick={() => setCurrentView('Q&A Assistant')} style={getNavItemStyle('Q&A Assistant')}>
          🧠 Q&A Assistant (LLM)
        </li>
        <li onClick={() => setCurrentView('Price Forecast')} style={getNavItemStyle('Price Forecast')}>
          📈 Price Forecast (ML)
        </li>
        <li onClick={() => setCurrentView('Orders')} style={getNavItemStyle('Orders')}>
          📦 Orders
        </li>
        <li onClick={() => setCurrentView('Products')} style={getNavItemStyle('Products')}>
          📱 Products (Inventory)
        </li>
        <li onClick={() => setCurrentView('Users')} style={getNavItemStyle('Users')}>
          👥 Users
        </li>
        <li onClick={() => setCurrentView('Settings')} style={getNavItemStyle('Settings')}>
          ⚙️ Settings
        </li>
      </ul>
      <button onClick={onLogout} style={styles.logoutBtn}>
        Logout
      </button>
      <div
        style={{
          ...styles.sidebarHeader,
          fontSize: '14px',
          marginTop: 'auto',
          marginBottom: '10px',
        }}
      >
        Logged in as: {userName || 'Guest'}
      </div>
    </div>
  );
};

export default AdminSidebar;
