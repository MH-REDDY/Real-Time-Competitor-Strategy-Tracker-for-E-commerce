import { useState } from 'react';
import { styles } from './styles/adminStyles';
import AdminHeader from './components/AdminHeader';
import DashboardView from './components/DashboardView';
import QAAssistantView from './components/QAAssistantView';
import PriceForecastView from './components/PriceForecastView';
import ProductsView from './components/ProductsView';
import UsersView from './components/UsersView';
import CompareView from './components/CompareView';
import PlaceholderView from './components/PlaceholderView';
import FloatingBotButton from './components/FloatingBotButton';
import Modal from './components/Modal';

const AdminDashboard = ({ onLogout, userName }) => {
  const [currentView, setCurrentView] = useState('Dashboard');
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);

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
        return <PlaceholderView title="Orders" subtitle="Orders management placeholder." />;
      case 'Users':
        return <UsersView />;
      case 'Settings':
        return <PlaceholderView title="Settings" subtitle="System settings placeholder." />;
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
        userName={userName}
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
