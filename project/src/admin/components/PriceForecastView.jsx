import React from 'react';
import { styles } from '../styles/adminStyles';

const PriceForecastView = () => {
  const chartImage =
    'https://placehold.co/600x300/2c3e50/fff?text=Product+Price+Forecast+Chart';

  return (
    <div style={styles.contentArea}>
      <h1 style={styles.pageTitle}>Price Forecast (ML)</h1>
      <p style={styles.pageSubtitle}>
        Visualization of predicted price changes based on Machine Learning models.
      </p>

      <div
        style={{
          ...styles.alertBox,
          backgroundColor: '#f0fff0',
          borderLeft: '4px solid #52c41a',
          color: '#237804',
          marginTop: '20px',
          marginBottom: '20px',
        }}
      >
        <span style={styles.alertIcon}>📈</span>
        <p style={styles.alertText}>
          Prediction: The price of high-end Smartphones is projected to remain stable over the
          next quarter.
        </p>
      </div>

      <div
        style={{
          padding: '20px',
          border: '1px solid #ced4da',
          borderRadius: '5px',
          backgroundColor: 'white',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#442db3ff' }}>
          6-Month Average Price Trend
        </h3>
        <img
          src={chartImage}
          alt="Price Forecast Chart"
          style={{
            width: '100%',
            maxWidth: '800px',
            height: 'auto',
            borderRadius: '4px',
            display: 'block',
            margin: '0 auto',
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              'https://placehold.co/600x300/808080/ffffff?text=Error+Loading+Chart';
          }}
        />
        <p style={{ ...styles.pageSubtitle, textAlign: 'center', marginTop: '15px' }}>
          *Chart simulation: This visual represents the predicted trend line from the ML model.
        </p>
      </div>
    </div>
  );
};

export default PriceForecastView;
