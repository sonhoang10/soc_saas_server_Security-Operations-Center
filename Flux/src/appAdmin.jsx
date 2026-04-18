import React from 'react';
import Sidebar from '/src/components/tools/Sidebar.jsx';
import Header from '/src/components/tools/Header.jsx';
// screens
import MainScreen from './components/screens/admin/ScreenDashboard.jsx';
import SecurityLogs from './components/screens/admin/ScreenLogs.jsx';
import CurrentAttacks from './components/screens/admin/ScreenAttacks.jsx';
import ClientManagement from './components/screens/admin/ScreenClients.jsx';
import ScreenReportReciever from './components/screens/admin/ScreenReportReceiver.jsx';
import { TabProvider, useTabs } from './components/TabContext.jsx'; // Import thêm useTabs

// Tách phần nội dung ra một component con để có thể dùng Hook useTabs
const AppContent = () => {
  const { activeTab } = useTabs(); // Lấy tab hiện tại từ kho chung

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <MainScreen />;
      case 'Security Logs': return <SecurityLogs />;
      case 'Current Attacks': return <CurrentAttacks />;
      case 'Client Management': return <ClientManagement />;
      case 'Report Receiver': return <ScreenReportReciever />;
      default: return <MainScreen />;
    }
  };

  return (
    <div className="bg-[#1c1c1c] text-[#ededed] flex h-screen overflow-hidden font-sans">
      {/* Sidebar giờ không cần truyền props nữa, nó tự lấy từ Context */}
      <Sidebar type="admin" /> 
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <Header />
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <TabProvider>
      <AppContent />
    </TabProvider>
  );
};

export default App;