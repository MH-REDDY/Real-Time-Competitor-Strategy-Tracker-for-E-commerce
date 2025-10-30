import React, { useState } from 'react';

// =================================================================
// 1. LOGIN PAGE COMPONENT
// =================================================================

const LoginPage = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState(''); 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Styles for the Login Page, ensuring centering and pure white background
    const loginStyles = {
        container: {
            display: 'flex',
            justifyContent: 'center', // Centers horizontally
            alignItems: 'center',    // Centers vertically
            minHeight: '100vh',
            width: '240%',
            // --- GLOBAL PURE WHITE BACKGROUND ---
            backgroundColor: '#fcf9f9ff', 
            fontFamily: 'Inter, Arial, sans-serif',
            padding: '10px', 
            boxSizing: 'border-box', // Ensure padding doesn't cause overflow
        },
        card: {
            backgroundColor: 'white',
            padding: '50px', 
            borderRadius: '20px', 
            boxShadow: '0 10px 40px rgba(136, 55, 206, 0.85)', // Prominent shadow
            width: '40%', 
            maxWidth: '550px', // Large central box size
            textAlign: 'center',
            border: '1px solid #e0e0e0',
        },
        title: {
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '10px',
            color: '#332c50ff',
        },
        subtitle: {
            fontSize: '18px',
            color: '#6c757d',
            marginBottom: '40px',
        },
        inputGroup: {
            marginBottom: '25px',
            textAlign: 'left',
        },
        inputLabel: {
            display: 'block',
            marginBottom: '9px',
            fontWeight: '600',
            fontSize: '16px', 
            color: '#34495e',
        },
        input: {
            width: '100%',
            padding: '9px', // Large input box size
            borderRadius: '10px',
            border: '2px solid #ced4da', 
            boxSizing: 'border-box',
            fontSize: '18px', 
            transition: 'border-color 0.3s ease',
        },
        button: {
            width: '100%',
            padding: '16px', 
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#007bff',
            color: 'white',
            fontSize: '20px', 
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease, transform 0.1s ease',
            marginTop: '20px',
            boxShadow: '0 4px 10px rgba(0, 123, 255, 0.3)',
        },
        error: {
            color: '#dc3545',
            marginTop: '15px',
            fontSize: '16px',
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        if (email.trim() !== '' && username.trim() !== '' && password.trim() !== '') {
            onLoginSuccess(email); 
        } else {
            // Display message using custom UI element instead of alert()
            setError('Please enter all details: Email, Username, and Password.'); 
        }
    };

    return (
        <div style={loginStyles.container}>
            <div style={loginStyles.card}>
                <h1 style={loginStyles.title}>Admin Login</h1>
                <p style={loginStyles.subtitle}>Enter your credentials to access the administration panel.</p>
                <form onSubmit={handleLogin}>
                    
                    {/* Email Input Field */}
                    <div style={loginStyles.inputGroup}>
                        <label htmlFor="email" style={loginStyles.inputLabel}>Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={loginStyles.input}
                            required
                        />
                    </div>
                    
                    {/* Username Input Field */}
                    <div style={loginStyles.inputGroup}>
                        <label htmlFor="username" style={loginStyles.inputLabel}>Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={loginStyles.input}
                            required
                        />
                    </div>
                    
                    {/* Password Input Field */}
                    <div style={loginStyles.inputGroup}>
                        <label htmlFor="password" style={loginStyles.inputLabel}>Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={loginStyles.input}
                            required
                        />
                    </div>
                    
                    {error && <p style={loginStyles.error}>{error}</p>}
                    
                    <button type="submit" style={loginStyles.button}>
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

// =================================================================
// 2. ADMIN PANEL COMPONENTS (Styles and Mock Data)
// =================================================================

// Define base styles for the Admin Panel
const styles = {
    container: {
        display: 'flex',
        minHeight: '100vh',
        width: '100%', 
        fontFamily: 'Inter, Arial, sans-serif',
        // --- GLOBAL PURE WHITE BACKGROUND FOR THE ENTIRE ADMIN LAYOUT ---
        backgroundColor: '#ffffff', 
    },
    sidebar: {
        width: '250px',
        backgroundColor: '#2c3e50', // Dark sidebar color for contrast
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
        transition: 'background-color 0.2s ease',
        ':hover': {
            backgroundColor: '#34495e',
        }
    },
    navItemActive: { 
        backgroundColor: '#007bff', 
        fontWeight: 'bold',
        borderLeft: '4px solid #fff',
    },
    contentArea: {
        flexGrow: 1,
        padding: '30px',
        // --- ADMIN PANEL CONTENT AREA PURE WHITE BACKGROUND (This replaces the dark area) ---
        backgroundColor: '#ffffff', 
        margin: 0, 
        borderRadius: 0, 
        boxShadow: 'none',
        overflowY: 'auto', 
        color: '#333', // Ensure text is visible on white background
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
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
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
        borderLeft: '4px solid #dc3545', 
        color: '#721c24', 
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
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        marginTop: '20px',
        alignSelf: 'center',
    },
    greeting: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#007bff',
        marginRight: '20px',
    }
};

const productsData = [
    {
        id: 1,
        image: 'https://placehold.co/40x40/007bff/ffffff?text=P1', 
        name: 'iPhone 15 Pro Max',
        itemId: '#20095',
        category: 'Smartphones',
        price: '₹95,000',
        stock: 45,
    },
    {
        id: 2,
        image: 'https://placehold.co/40x40/2ecc71/ffffff?text=P2',
        name: 'Fashion Bag',
        itemId: '#20096',
        category: 'Accessories',
        price: '₹2,500',
        stock: 8,
    },
    {
    // Fix: Ensure all products have a valid placeholder URL
        id: 3,
        image: 'https://placehold.co/40x40/e74c3c/ffffff?text=P3',
        name: 'AirPods Pro 2',
        itemId: '#20097',
        category: 'Audio',
        price: '₹22,000',
        stock: 0, 
    },
    {
        id: 4,
        image: 'https://placehold.co/40x40/f39c12/ffffff?text=P4',
        name: 'MacBook Pro 16',
        itemId: '#20098',
        category: 'Laptops',
        price: '₹1,80,000',
        stock: 12,
    },
];

// --- Sub-View Components (Dashboard, Q&A, Forecast, Products) ---

const AlertsDashboardView = ({ style, userName }) => {
    const alerts = [
        { title: "Stock Low: Pro X", count: "18 units left", alertStyle: styles.lowStockAlert, icon: '⚠️' },
        { title: "Competitor Price Match", count: "3 matches found", alertStyle: { ...styles.alertBox, backgroundColor: '#fffbe6', borderLeft: '4px solid #faad14', color: '#ad8b00' }, icon: '💲' },
        { title: "Sales Spike: Bass Blaster", count: "+40% WoW", alertStyle: { ...styles.alertBox, backgroundColor: '#f0fff0', borderLeft: '4px solid #52c41a', color: '#237804' }, icon: '🚀' },
    ];

    return (
        <div style={style}>
            <h1 style={styles.pageTitle}>Dashboard (Alerts Overview)</h1>
            <p style={styles.pageSubtitle}>Welcome back, *{userName}*! Here is a quick overview of critical alerts.</p>

            <div style={{ ...styles.alertContainer, marginTop: '20px', display: 'flex', flexWrap: 'wrap' }}>
                {alerts.map((alert, index) => (
                    <div key={index} style={{ ...alert.alertStyle, flex: 1, minWidth: '280px', margin: '5px' }}>
                        <span style={styles.alertIcon}>{alert.icon}</span>
                        <div>
                            <p style={{ ...styles.alertText, fontWeight: 'bold' }}>{alert.title}</p>
                            <p style={styles.alertText}>{alert.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            <h2 style={{ ...styles.pageTitle, fontSize: '20px', marginTop: '30px', borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>Recent Activity</h2>
            <div style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '5px', backgroundColor: 'white' }}>
                <ul style={{ listStyleType: 'none', padding: '0' }}>
                    <li style={{ marginBottom: '10px', padding: '5px', borderBottom: '1px dotted #e9ecef' }}>
                        <span style={{ fontWeight: 'bold', color: '#007bff' }}>System:</span> Product 'iPhone 15 Pro Max' updated by Admin.
                    </li>
                    <li style={{ marginBottom: '10px', padding: '5px', borderBottom: '1px dotted #e9ecef' }}>
                        <span style={{ fontWeight: 'bold', color: '#007bff' }}>Order:</span> New Order #1005 placed. Total: ₹22,000.
                    </li>
                    <li style={{ marginBottom: '5px', padding: '5px' }}>
                        <span style={{ fontWeight: 'bold', color: '#007bff' }}>Inventory:</span> 'Fashion Bag' stock replenished by 10 units.
                    </li>
                </ul>
            </div>
        </div>
    );
};

const QaAssistantView = ({ style }) => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('Ask a question about your products, inventory, or market competitors.');
    const [loading, setLoading] = useState(false);

    const handleAsk = () => {
        if (!query.trim()) return;
        setLoading(true);
        setResponse('Thinking...');
        
        // Simulate LLM response time
        setTimeout(() => {
            setResponse(`LLM Answer for: "${query}" (Simulated).
            
Based on current simulated data, the highest-selling product category is 'Smartphones', accounting for 70% of total revenue last quarter. We recommend increasing ad spend in this category by 15% and diversifying suppliers for the 'Fashion Bag' to mitigate stock issues.`);
            setLoading(false);
            setQuery('');
        }, 1800);
    };

    return (
        <div style={style}>
            <h1 style={styles.pageTitle}>Q&A Assistant (LLM)</h1>
            <p style={styles.pageSubtitle}>Get instant answers and market intelligence using the Gemini Model simulation.</p>

            <div style={{ ...styles.alertBox, backgroundColor: '#e6f7ff', borderLeft: '4px solid #1890ff', color: '#0050b3', marginTop: '20px', marginBottom: '20px' }}>
                <span style={styles.alertIcon}>🧠</span>
                <p style={styles.alertText}>This feature simulates a live Q&A using the LLM for grounded answers and analysis.</p>
            </div>

            <div style={styles.searchInputContainer}>
                <input
                    type="text"
                    placeholder="Ask about competitors, sales trends, or product specs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                    style={{ ...styles.searchInput, paddingRight: '150px' }} 
                />
                <button
                    onClick={handleAsk}
                    disabled={loading || !query.trim()}
                    style={{
                        ...styles.primaryButton,
                        padding: '10px 15px',
                        marginLeft: '10px',
                        cursor: loading || !query.trim() ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Asking...' : 'Ask Assistant'}
                </button>
            </div>

            <div style={{ padding: '400px', border: '1px solid #ced4da', borderRadius: '5px', backgroundColor: '#f9f9f9', minHeight: '150px', whiteSpace: 'pre-wrap' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#007bff' }}>Assistant Response:</p>
                {response}
            </div>
        </div>
    );
};

const PriceForecastView = ({ style }) => {
    // Placeholder image for the chart
    const chartImage = "https://placehold.co/600x300/2c3e50/fff?text=Product+Price+Forecast+Chart"; 
    
    return (
        <div style={style}>
            <h1 style={styles.pageTitle}>Price Forecast (ML)</h1>
            <p style={styles.pageSubtitle}>Visualization of predicted price changes based on Machine Learning models.</p>

            <div style={{ ...styles.alertBox, backgroundColor: '#f0fff0', borderLeft: '4px solid #52c41a', color: '#237804', marginTop: '20px', marginBottom: '20px' }}>
                <span style={styles.alertIcon}>📈</span>
                <p style={styles.alertText}>Prediction: The price of high-end Smartphones is projected to remain stable over the next quarter.</p>
            </div>

            <div style={{ padding: '200px', border: '1px solid #ced4da', borderRadius: '5px', backgroundColor: 'white' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '1px', color: '#442db3ff' }}>6-Month Average Price Trend</h3>
                <img 
                    src={chartImage} 
                    alt="Price Forecast Chart" 
                    style={{ width: '100%', maxWidth: '800px', height: 'auto', borderRadius: '4px', display: 'block', margin: '0 auto' }} 
                    onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/600x300/808080/ffffff?text=Error+Loading+Chart" }}
                />
                <p style={{ ...styles.pageSubtitle, textAlign: 'center', marginTop: '15px' }}>*Chart simulation: This visual represents the predicted trend line from the ML model.</p>
            </div>
        </div>
    );
};

const ProductsView = ({ style }) => {
    return (
        <div style={style}>
            <div style={styles.contentHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Products (Inventory)</h1>
                    <p style={styles.pageSubtitle}>Manage your product inventory</p>
                </div>
                <div style={styles.topActions}>
                    <button style={styles.actionButton}>Import</button>
                    <button style={{ ...styles.actionButton, ...styles.primaryButton }}>Add New Product</button>
                </div>
            </div>

            {/* Alerts - Responsive adjustments */}
            <div style={{...styles.alertContainer, flexWrap: 'wrap' }}>
                <div style={{ ...styles.alertBox, ...styles.lowStockAlert, minWidth: '200px', margin: '5px' }}>
                    <span style={styles.alertIcon}>⚠️</span>
                    <div>
                        <p style={{ ...styles.alertText, fontWeight: 'bold' }}>Low Stock Alert</p>
                        <p style={styles.alertText}>2 product(s) running low</p>
                    </div>
                </div>
                <div style={{ ...styles.alertBox, ...styles.outOfStockAlert, minWidth: '10px', margin: '5px' }}>
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
                                        onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/40x40/ccc/000?text=NA" }}
                                    />
                                    {product.name}
                                </td>
                                <td style={styles.tableCell}>{product.itemId}</td>
                                <td style={styles.tableCell}>{product.category}</td>
                                <td style={styles.tableCell}>{product.price}</td>
                                <td style={styles.tableCell}>
                                    <span style={{ color: product.stock <= 10 && product.stock > 0 ? 'orange' : product.stock === 0 ? 'red' : 'green' }}>
                                        {product.stock === 0 ? 'Out of Stock' : product.stock}
                                    </span>
                                </td>
                                <td style={styles.tableCell}>
                                    <div style={styles.actionButtons}>
                                        <button style={{ ...styles.actionBtn, ...styles.editBtn }}>Edit</button>
                                        <button style={{ ...styles.actionBtn, ...styles.deleteBtn }}>Delete</button>
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

// --- Main Admin Panel Component ---

const AdminPanel = ({ onLogout, userName }) => { 
    const [currentView, setCurrentView] = useState('Dashboard'); 
    
    // Function to render the correct content based on the selected view
    const renderContent = () => {
        const contentStyle = styles.contentArea;
        
        switch (currentView) {
            case 'Dashboard':
                return <AlertsDashboardView style={contentStyle} userName={userName} />;
            case 'Q&A Assistant':
                return <QaAssistantView style={contentStyle} />;
            case 'Price Forecast':
                return <PriceForecastView style={contentStyle} />;
            case 'Products':
                return <ProductsView style={contentStyle} />;
            case 'Orders':
                return <div style={contentStyle}><h1 style={styles.pageTitle}>Orders</h1><p style={styles.pageSubtitle}>Orders management placeholder.</p></div>;
            case 'Users':
                return <div style={contentStyle}><h1 style={styles.pageTitle}>Users</h1><p style={styles.pageSubtitle}>User management placeholder.</p></div>;
            case 'Settings':
                return <div style={contentStyle}><h1 style={styles.pageTitle}>Settings</h1><p style={styles.pageSubtitle}>System settings placeholder.</p></div>;
            default:
                return <div style={contentStyle}><h1 style={styles.pageTitle}>Welcome</h1><p style={styles.pageSubtitle}>Select an option from the sidebar.</p></div>;
        }
    };

    // Helper to apply active style to the current navigation item
    const getNavItemStyle = (viewName) => ({
        ...styles.navItem, 
        ...(currentView === viewName ? styles.navItemActive : {}),
        // Simple hover effect using media query/pseudo class simulation for a better UX
        // NOTE: In production React, you'd use a CSS file or a dedicated styling library for :hover
        ...((currentView !== viewName) && {
            // This is a common pattern to simulate basic hover in inline styles if needed, but often requires external libraries or classes.
            // For now, we rely on the visual distinction of the active state.
        })
    });

    return (
        <div style={styles.container}>
            {/* Sidebar (Navigation) */}
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
                <div style={{ ...styles.sidebarHeader, fontSize: '14px', marginTop: 'auto', marginBottom: '10px' }}>
                    Logged in as: {userName || 'Guest'}
                </div>
            </div>

            {/* Main Content Area - This is the right side with the pure white background */}
            {renderContent()}
        </div>
    );
};

// =================================================================
// 3. MAIN APP COMPONENT
// =================================================================

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loggedInUserName, setLoggedInUserName] = useState('');
    
    // Global style to ensure the root element of the app is also white and takes full screen height
    const appContainerStyle = {
        minHeight: '100vh', 
        width: '100%', 
        backgroundColor: '#ffffff', // Ensures the root of the React app is white
    };


    const handleLoginSuccess = (email) => {
        setIsLoggedIn(true);
        // Use the part before '@' as the display name
        const displayName = email.split('@')[0];
        setLoggedInUserName(displayName);
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setLoggedInUserName('');
    };

    return (
        <div style={appContainerStyle}>
            {isLoggedIn ? (
                // Show Admin Panel if logged in
                <AdminPanel onLogout={handleLogout} userName={loggedInUserName} />
            ) : (
                // Show Login Page if logged out
                <LoginPage onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
};

export default App;