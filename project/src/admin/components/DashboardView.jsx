import React from 'react';
import { styles } from '../styles/adminStyles';
import { alertsData } from '../data/mockData';

const DashboardView = ({ userName }) => {
  const getAlertStyle = (alertType) => {
    const baseStyle = styles.alertBox;
    switch (alertType) {
      case 'lowStock':
        return { ...baseStyle, ...styles.lowStockAlert };
      case 'priceMatch':
        return {
          ...baseStyle,
          backgroundColor: '#fffbe6',
          borderLeft: '4px solid #faad14',
          color: '#ad8b00',
        };
      case 'salesSpike':
        return {
          ...baseStyle,
          backgroundColor: '#f0fff0',
          borderLeft: '4px solid #52c41a',
          color: '#237804',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={styles.contentArea}>
      <h1 style={styles.pageTitle}>Dashboard (Alerts Overview)</h1>
      <p style={styles.pageSubtitle}>
        Welcome back, *{userName}*! Here is a quick overview of critical alerts.
      </p>

      <div
        style={{
          ...styles.alertContainer,
          marginTop: '20px',
          display: 'flex',
          flexWrap: 'wrap',
        }}
      >
        {alertsData.map((alert, index) => (
          <div
            key={index}
            style={{
              ...getAlertStyle(alert.alertStyle),
              flex: 1,
              minWidth: '280px',
              margin: '5px',
            }}
          >
            <span style={styles.alertIcon}>{alert.icon}</span>
            <div>
              <p style={{ ...styles.alertText, fontWeight: 'bold' }}>{alert.title}</p>
              <p style={styles.alertText}>{alert.count}</p>
            </div>
          </div>
        ))}
      </div>

      <h2
        style={{
          ...styles.pageTitle,
          fontSize: '20px',
          marginTop: '30px',
          borderBottom: '1px solid #dee2e6',
          paddingBottom: '10px',
        }}
      >
        Recent Activity
      </h2>
      <div
        style={{
          padding: '15px',
          border: '1px solid #dee2e6',
          borderRadius: '5px',
          backgroundColor: 'white',
        }}
      >
        <ul style={{ listStyleType: 'none', padding: '0' }}>
          <li
            style={{
              marginBottom: '10px',
              padding: '5px',
              borderBottom: '1px dotted #e9ecef',
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#007bff' }}>System:</span> Product
            'iPhone 15 Pro Max' updated by Admin.
          </li>
          <li
            style={{
              marginBottom: '10px',
              padding: '5px',
              borderBottom: '1px dotted #e9ecef',
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#007bff' }}>Order:</span> New Order
            #1005 placed. Total: ₹22,000.
          </li>
          <li style={{ marginBottom: '5px', padding: '5px' }}>
            <span style={{ fontWeight: 'bold', color: '#007bff' }}>Inventory:</span> 'Fashion
            Bag' stock replenished by 10 units.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardView;
