import { useEffect, useState } from 'react';
import { styles } from './styles/adminStyles';
import AdminHeader from './components/AdminHeader';
import DashboardView from './components/DashboardView';
import QAAssistantView from './components/QAAssistantView';
import PriceForecastView from './components/PriceForecastView';
import ProductsView from './components/ProductsView';
import CompareView from './components/CompareView';
import PlaceholderView from './components/PlaceholderView';
import AlertSettings from './components/AlertSettings';
import AlertsList from './components/AlertsList';
import OrdersView from './components/OrdersView';
import UsersView from './components/UsersView';
import FloatingBotButton from './components/FloatingBotButton';
import Modal from './components/Modal';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = ({ onLogout, userName }) => {
  const [currentView, setCurrentView] = useState('Dashboard');
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(userName);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/auth/me', { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
        if (!res.ok) return;
        const data = await res.json();
        if (data && (data.full_name || data.email)) {
          setProfileName(data.full_name || data.email);
        }
      } catch (_) {
        // ignore
      }
    };
    loadProfile();
  }, [getAuthHeader]);

  const renderContent = () => {
    switch (currentView) {
      case 'Dashboard':
        return <DashboardView userName={userName} />;
      case 'Q&A Assistant':
        return <QAAssistantView />;
      case 'Price Forecast':
        return <PriceForecastView />;
      case 'Products':
        return <ProductsView />;
      case 'Compare':
        return <CompareView />;
      case 'Orders':
        return <OrdersView />;
      case 'Users':
        return <UsersView />;
      case 'Settings':
        return <AlertSettings />;
      case 'Alerts':
        return <AlertsList />;
      default:
        return (
          <PlaceholderView
            title="Welcome"
            subtitle="Select an option from the header."
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8f9fa' }}>
      <AdminHeader
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={onLogout}
        userName={profileName}
      />
      <div style={styles.contentArea}>{renderContent()}</div>

      {/* Floating Assistant Button */}
      <FloatingBotButton onClick={() => setIsQAModalOpen(true)} />

      {/* QA Assistant Modal */}
      <Modal title="Assistant" open={isQAModalOpen} onClose={() => setIsQAModalOpen(false)} width={840}>
        <QAAssistantView />
      </Modal>
    </div>
  );
};

export default AdminDashboard;
