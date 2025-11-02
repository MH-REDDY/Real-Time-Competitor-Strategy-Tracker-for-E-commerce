import React from 'react';
import { styles } from '../styles/adminStyles';

const PlaceholderView = ({ title, subtitle }) => {
  return (
    <div style={styles.contentArea}>
      <h1 style={styles.pageTitle}>{title}</h1>
      <p style={styles.pageSubtitle}>{subtitle}</p>
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginTop: '20px',
        }}
      >
        <p style={{ fontSize: '18px', color: '#6c757d' }}>
          This section is under development.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderView;
