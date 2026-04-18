import React from 'react';
import Sidebar from '/src/components/tools/Sidebar.jsx';
import Header from '/src/components/tools/Header.jsx';
// screens
import MainScreen from '/src/components/screens/client/ClientScreenDashboard.jsx';
import CurrentAttacks from '/src/components/screens/client/ClientScreenAttacks.jsx';
import Report from '/src/components/screens/client/ClientScreenReport.jsx';
import AgentDeployment from '/src/components/screens/client/ClientScreenAgent.jsx';
//import CurrentAttacks from './components/screens/client/ClientScreenAttacks.jsx';
import { TabProvider, useTabs } from './components/TabContext.jsx'; // Import thêm useTabs

// Tách phần nội dung ra một component con để có thể dùng Hook useTabs
const AppContent = () => {
  const { activeTab } = useTabs(); // Lấy tab hiện tại từ kho chung

  const renderContent = () => {
    switch (activeTab) {
      case 'Client Dashboard': return <MainScreen />;
      case 'Client Current Attacks': return <CurrentAttacks />;
      case 'Client Report': return <Report />;
      case 'Client Agent Deployment': return <AgentDeployment />;
      default: return <MainScreen />;
    }
  };

  return (
    <div className="bg-[#1c1c1c] text-[#ededed] flex h-screen overflow-hidden font-sans">
      {/* Sidebar giờ không cần truyền props nữa, nó tự lấy từ Context */}
      <Sidebar type="client" /> 
      
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