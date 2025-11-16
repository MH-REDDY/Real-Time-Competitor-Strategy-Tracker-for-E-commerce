import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import GuestHomePage from './pages/GuestHomePage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import BrowseEventsPage from './pages/BrowseEventsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './payments/CheckoutPage';
import AdminDashboard from './admin/AdminDashboard';

// Protected route - redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin route - redirects to login if not authenticated or not admin
const AdminRoute = ({ children }) => {
  const { isAuthenticated, userType, user, logout } = useAuth();
  const navigate = useNavigate();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (userType !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return <AdminDashboard onLogout={handleLogout} userName={user?.username || user?.name || 'Admin'} />;
};

const AppRoutes = () => {
  const { isAuthenticated, userType } = useAuth();

  return (
    <Routes>
      {/* Root shows guest homepage if not authenticated */}
      <Route 
        path="/" 
        element={
          isAuthenticated 
            ? (userType === 'admin' ? <Navigate to="/admin" replace /> : <HomePage />) 
            : <GuestHomePage />
        } 
      />
      
      {/* Login page - redirects to dashboard if already logged in */}
      <Route 
        path="/login" 
        element={
          isAuthenticated 
            ? (userType === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />) 
            : <LoginPage />
        } 
      />
      
      {/* Admin dashboard - protected */}
      <Route
        path="/admin"
        element={<AdminRoute />}
      />
      
      {/* User pages - protected */}
      <Route
        path="/browse-events"
        element={
          <ProtectedRoute>
            <BrowseEventsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/product/:id"
        element={
          <ProtectedRoute>
            <ProductDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const AppLayout = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  return (
    <div className="app">
      {!isAdmin && <Header />}
      <main>
        <AppRoutes />
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
