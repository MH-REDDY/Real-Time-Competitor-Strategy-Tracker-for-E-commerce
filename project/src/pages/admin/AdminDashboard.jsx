
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  console.log('AdminDashboard - Rendering with:', {
    isAuthenticated,
    user: user ? { username: user.username, role: user.role } : 'No user',
    initialCheckDone
  });

  // Redirect if not admin
  useEffect(() => {
    console.log('AdminDashboard - Checking admin access...');
    
    if (!isAuthenticated) {
      console.log('AdminDashboard - Not authenticated, redirecting to login');
      navigate('/login', { state: { from: '/admin/dashboard' } });
      return;
    }
    
    if (user && user.role !== 'admin') {
      console.log('AdminDashboard - User is not an admin, redirecting to home');
      navigate('/', { replace: true });
      return;
    }
    
    console.log('AdminDashboard - Admin access verified');
    setInitialCheckDone(true);
    
  }, [user, isAuthenticated, navigate]);

  if (!initialCheckDone || !isAuthenticated || !user || user.role !== 'admin') {
    console.log('AdminDashboard - Rendering loading/access denied state');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading admin dashboard...</h1>
          <p>Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user.username}!</h2>
        <p className="mb-4">You have successfully logged in as an administrator.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* Admin Cards */}
          <div className="bg-blue-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Users</h3>
            <p className="text-gray-600">Manage system users and permissions</p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Products</h3>
            <p className="text-gray-600">Manage products and inventory</p>
          </div>
          
          <div className="bg-yellow-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Orders</h3>
            <p className="text-gray-600">View and manage customer orders</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
