import React from 'react';
import Sidebar from '/src/components/tools/Sidebar.jsx';
import Header from '/src/components/tools/Header.jsx';
// screens
import MainScreen from '/src/components/screens/client/ClientScreenDashboard.jsx';
import CurrentAttacks from '/src/components/screens/client/ClientScreenAttacks.jsx';
import Report from '/src/components/screens/client/ClientScreenReport.jsx';
import AgentDeployment from '/src/components/screens/client/ClientScreenAgent.jsx';
import HistoryLogs from '/src/components/screens/client/ClientScreenHistory.jsx'; 

import { TabProvider, useTabs } from './components/TabContext.jsx'; 

const AppContent = () => {
  const { activeTab } = useTabs(); 

  const renderContent = () => {
    switch (activeTab) {
      case 'Client Dashboard': return <MainScreen />;
      case 'Client Current Attacks': return <CurrentAttacks />;
      case 'Client History Logs': return <HistoryLogs />; 
      case 'Client Report': return <Report />;
      case 'Client Agent Deployment': return <AgentDeployment />;
      default: return <MainScreen />;
    }
  };

  return (
    <div className="bg-[#1c1c1c] text-[#ededed] flex h-screen overflow-hidden font-sans">
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