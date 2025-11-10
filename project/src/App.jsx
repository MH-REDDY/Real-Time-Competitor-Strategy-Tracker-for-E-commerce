import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import BrowseEventsPage from './pages/BrowseEventsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import AdminDashboard from './admin/AdminDashboard';

// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - Rendering with:', {
    path: location.pathname,
    isAuthenticated,
    loading,
    user: user ? { username: user.username, role: user.role } : 'No user',
    adminOnly
  });

  if (loading) {
    console.log('ProtectedRoute - Loading auth state...');
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if admin access is required and user is admin
  if (adminOnly) {
    console.log('ProtectedRoute - Admin access required');
    if (!user || user.role !== 'admin') {
      console.log('ProtectedRoute - Access denied: User is not an admin');
      return <Navigate to="/" replace />;
    }
    console.log('ProtectedRoute - Admin access granted');
  }

  console.log('ProtectedRoute - Access granted');
  return children;
};

// Admin Layout
const AdminLayout = () => {
  const { logout } = useAuth();
  const { user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="app min-h-screen flex flex-col bg-gray-50">
      <Routes>
        <Route
          path="dashboard"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard onLogout={handleLogout} userName={user?.username || 'Admin'} />
            </ProtectedRoute>
          }
        />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </div>
  );
};

// Simple layout wrapper for non-admin pages
const AppLayout = () => {
  return (
    <div className="app min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
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
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
