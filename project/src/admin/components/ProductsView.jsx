import React from 'react';
import { styles } from '../styles/adminStyles';
import { productsData } from '../data/mockData';

const ProductsView = () => {
  return (
    <div style={styles.contentArea}>
      <div style={styles.contentHeader}>
        <div>
          <h1 style={styles.pageTitle}>Products (Inventory)</h1>
          <p style={styles.pageSubtitle}>Manage your product inventory</p>
        </div>
        <div style={styles.topActions}>
          <button style={styles.actionButton}>Import</button>
          <button style={{ ...styles.actionButton, ...styles.primaryButton }}>
            Add New Product
          </button>
        </div>
      </div>

      {/* Alerts - Responsive adjustments */}
      <div style={{ ...styles.alertContainer, flexWrap: 'wrap' }}>
        <div
          style={{
            ...styles.alertBox,
            ...styles.lowStockAlert,
            minWidth: '200px',
            margin: '5px',
          }}
        >
          <span style={styles.alertIcon}>⚠️</span>
          <div>
            <p style={{ ...styles.alertText, fontWeight: 'bold' }}>Low Stock Alert</p>
            <p style={styles.alertText}>2 product(s) running low</p>
          </div>
        </div>
        <div
          style={{
            ...styles.alertBox,
            ...styles.outOfStockAlert,
            minWidth: '200px',
            margin: '5px',
          }}
        >
          <span style={styles.alertIcon}>❌</span>
          <div>
            <p style={{ ...styles.alertText, fontWeight: 'bold' }}>Out of Stock</p>
            <p style={styles.alertText}>1 product(s) out of stock</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div style={styles.searchInputContainer}>
        <span style={styles.searchIcon}>🔍</span>
        <input type="text" placeholder="Search products..." style={styles.searchInput} />
      </div>

      {/* Products Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>Product</th>
              <th style={styles.tableHeaderCell}>Item ID</th>
              <th style={styles.tableHeaderCell}>Category</th>
              <th style={styles.tableHeaderCell}>Price</th>
              <th style={styles.tableHeaderCell}>Stock</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {productsData.map((product) => (
              <tr key={product.id} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  <img
                    src={product.image}
                    alt={product.name}
                    style={styles.tableImage}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/40x40/ccc/000?text=NA';
                    }}
                  />
                  {product.name}
                </td>
                <td style={styles.tableCell}>{product.itemId}</td>
                <td style={styles.tableCell}>{product.category}</td>
                <td style={styles.tableCell}>{product.price}</td>
                <td style={styles.tableCell}>
                  <span
                    style={{
                      color:
                        product.stock <= 10 && product.stock > 0
                          ? 'orange'
                          : product.stock === 0
                          ? 'red'
                          : 'green',
                    }}
                  >
                    {product.stock === 0 ? 'Out of Stock' : product.stock}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.actionButtons}>
                    <button style={{ ...styles.actionBtn, ...styles.editBtn }}>Edit</button>
                    <button style={{ ...styles.actionBtn, ...styles.deleteBtn }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsView;
