// Admin Panel Shared Styles
export const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    fontFamily: 'Inter, Arial, sans-serif',
    backgroundColor: '#f8f9fa',
  },
  // Top Header (replaces sidebar)
  adminHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    height: '80px',
  },
  adminHeaderInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    gap: '12px'
  },
  adminHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  adminLogoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  adminLogoBox: {
    padding: '8px',
    borderRadius: '12px',
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(233, 69, 96, 0.4)'
  },
  adminLogoText: {
    fontSize: '20px',
    fontWeight: 700,
    marginLeft: '8px',
    background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '1px'
  },
  adminHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  adminUserBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ffffff',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
  },
  adminNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  adminNavItem: {
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    background: 'transparent',
    color: '#ffffff',
    padding: '8px 0',
    borderRadius: '0',
    fontSize: '1rem',
    fontWeight: 500,
  },
  adminNavItemActive: {
    color: '#ff6b6b',
    borderBottom: '2px solid #ff6b6b',
    paddingBottom: '6px'
  },
  adminNavItemHover: {
    color: '#ff6b6b',
    opacity: 0.9
  },
  sidebar: {
    width: '250px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: 'white',
    padding: '20px 0',
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  sidebarHeader: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '30px',
    padding: '0 20px',
    width: '100%',
    textAlign: 'center',
  },
  navList: {
    listStyleType: 'none',
    padding: 0,
    width: '100%',
  },
  navItem: {
    padding: '12px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
    borderLeft: '4px solid transparent',
  },
  navItemActive: {
    background: 'rgba(255, 255, 255, 0.08)',
    fontWeight: 'bold',
    borderLeft: '4px solid #ff6b6b',
  },
  contentArea: {
    flexGrow: 1,
    padding: '30px',
    backgroundColor: '#ffffff',
    margin: 0,
    borderRadius: 0,
    boxShadow: 'none',
    overflowY: 'auto',
    color: '#333',
  },
  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#2c3e50',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#6c757d',
    marginTop: '5px',
  },
  topActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  actionButton: {
    padding: '8px 15px',
    borderRadius: '5px',
    border: '1px solid #ced4da',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 12px rgba(233, 69, 96, 0.3)',
  },
  alertContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px',
  },
  alertBox: {
    flex: 1,
    padding: '15px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '200px',
  },
  lowStockAlert: {
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ffc107',
    color: '#856404',
  },
  outOfStockAlert: {
    backgroundColor: '#f8d7da',
    borderLeft: '4px solid #e94560',
    color: '#842029',
  },
  alertIcon: {
    fontSize: '20px',
  },
  alertText: {
    margin: 0,
    fontSize: '14px',
  },
  searchInputContainer: {
    marginBottom: '25px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '10px 15px 10px 40px',
    borderRadius: '5px',
    border: '1px solid #ced4da',
    fontSize: '14px',
  },
  searchIcon: {
    position: 'absolute',
    left: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6c757d',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  tableHeader: {
    backgroundColor: '#e9ecef',
    color: '#495057',
  },
  tableHeaderCell: {
    padding: '12px 15px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  tableRow: {
    backgroundColor: 'white',
    borderBottom: '1px solid #dee2e6',
  },
  tableCell: {
    padding: '12px 15px',
    fontSize: '14px',
    color: '#343a40',
  },
  tableImage: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    marginRight: '10px',
  },
  actionButtons: {
    display: 'flex',
    gap: '5px',
  },
  actionBtn: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
  },
  editBtn: {
    backgroundColor: '#ffc107',
    color: 'white',
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  logoutBtn: {
    background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    alignSelf: 'center',
    boxShadow: '0 4px 12px rgba(233,69,96,0.35)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
  },
  logoutBtnHover: {
    transform: 'scale(1.05)',
    boxShadow: '0 6px 20px rgba(233, 69, 96, 0.5)'
  },
  greeting: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e94560',
    marginRight: '20px',
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 60,
  },
  modalContent: {
    width: '100%',
    maxWidth: '720px',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    border: '1px solid #e9ecef'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #f1f3f5',
    background: '#fafbfc'
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#1f2937'
  },
  modalClose: {
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    background: 'transparent',
    color: '#374151',
    width: '32px',
    height: '32px',
    borderRadius: '6px'
  },
  modalBody: {
    padding: '16px'
  },
  // Floating Action Button
  fab: {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
    color: 'white',
    boxShadow: '0 10px 24px rgba(233,69,96,0.35)',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
  },
  fabHover: {
    boxShadow: '0 14px 28px rgba(233,69,96,0.45)',
    transform: 'translateY(-2px)'
  },
  fabActive: {
    transform: 'scale(0.96)',
    boxShadow: '0 8px 18px rgba(233,69,96,0.35)'
  },
};
