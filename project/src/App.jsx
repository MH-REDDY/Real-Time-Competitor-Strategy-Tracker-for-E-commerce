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
import AdminDashboard from './admin/AdminDashboard';

// Temporary: disable auth gating – always allow access
const ProtectedRoute = ({ children }) => {
  return children;
};

const AdminRoute = ({ children }) => {
  // Directly render admin dashboard without auth checks
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    // Still allow manual logout to clear any local state
    logout();
    navigate('/');
  };
  return <AdminDashboard onLogout={handleLogout} userName={user?.username || user?.name || 'Admin'} />;
};

const AppRoutes = () => {
  const { isAuthenticated, userType } = useAuth();

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          isAuthenticated 
            ? (userType === 'admin' ? <Navigate to="/admin" /> : <HomePage />) 
            : <GuestHomePage />
        } 
      />
  {/* Login route kept for future, but app no longer enforces it */}
  <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={<AdminRoute />}
      />
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
