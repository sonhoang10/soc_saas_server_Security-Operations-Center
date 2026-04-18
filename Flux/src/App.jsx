import React, { useState, useEffect } from 'react';
import Sidebar from '/src/components/tools/Sidebar.jsx';
import Header from '/src/components/tools/Header.jsx';
import MainScreen from './components/screens/admin/ScreenDashboard.jsx';
import SecurityLogs from './components/screens/admin/ScreenLogs.jsx';
import CurrentAttacks from './components/screens/admin/ScreenAttacks.jsx';
import ClientManagement from './components/screens/admin/ScreenClients.jsx';
import ScreenReportReciever from './components/screens/admin/ScreenReportReceiver.jsx';
import { TabProvider, useTabs } from './components/TabContext.jsx';

// --- BƯỚC 2: GIAO DIỆN TẠO CÔNG TY TRONG APP ---
const CreateCompanySetup = ({ onComplete }) => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-[480px] bg-[#111111]/80 border border-[#3e3e3e] rounded-2xl p-10">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Setup Organization</h1>
        <p className="text-sm text-[#a0a0a0] mb-6 text-center">Create your company workspace to proceed.</p>
        <form onSubmit={(e) => { e.preventDefault(); onComplete(); }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#a0a0a0] mb-2 uppercase">Company Name</label>
            <input type="text" required className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-4 py-2 text-white focus:border-[#3ecf8e] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#a0a0a0] mb-2 uppercase">Company Email</label>
            <input type="email" required className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-4 py-2 text-white focus:border-[#3ecf8e] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#a0a0a0] mb-2 uppercase">Company Phone</label>
            <input type="tel" required className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-4 py-2 text-white focus:border-[#3ecf8e] focus:outline-none" />
          </div>
          <button type="submit" className="w-full bg-[#3ecf8e] text-black font-bold py-2.5 rounded-lg mt-4">Submit for Approval</button>
        </form>
      </div>
    </div>
  );
};

// --- BƯỚC 3: PHÂN QUYỀN (RBAC) ---
const AppContent = () => {
  const { activeTab } = useTabs();
  
  // Trạng thái giả định từ API: 'none' (chưa tạo), 'pending' (chờ duyệt), 'approved' (đã vào được)
  const [companyStatus, setCompanyStatus] = useState('none'); 
  // Quyền: 'owner', 'admin', 'member'
  const [userRole, setUserRole] = useState('member'); 

  useEffect(() => {
    // Gọi API để check status của User ở đây. 
    // Tạm thời mock data:
    const status = localStorage.getItem('company_status') || 'none';
    const role = localStorage.getItem('user_role') || 'member';
    setCompanyStatus(status);
    setUserRole(role);
  }, []);

  const renderContent = () => {
    // Member: Chỉ xem Dashboard
    if (userRole === 'member') {
        return activeTab === 'Dashboard' ? <MainScreen /> : <div className="p-8 text-red-500">Access Denied. Members can only view Dashboard.</div>;
    }

    // Owner & Admin: Xem Log, Thêm Server (Giả định nằm trong CurrentAttacks/Logs), Dashboard
    if (userRole === 'admin' || userRole === 'owner') {
        switch (activeTab) {
            case 'Dashboard': return <MainScreen />;
            case 'Security Logs': return <SecurityLogs />;
            case 'Current Attacks': return <CurrentAttacks />;
            case 'Report Receiver': return <ScreenReportReciever />;
            
            // Chỉ Owner mới được Quản lý User
            case 'Client Management': 
                return userRole === 'owner' ? <ClientManagement /> : <div className="p-8 text-red-500">Access Denied. Only Owner can manage users.</div>;
            
            default: return <MainScreen />;
        }
    }
  };

  // NẾU CHƯA CÓ CÔNG TY -> HIỂN THỊ FORM
  if (companyStatus === 'none') {
    return <CreateCompanySetup onComplete={() => {
        localStorage.setItem('company_status', 'pending');
        setCompanyStatus('pending');
    }} />;
  }

  // NẾU ĐANG CHỜ DUYỆT
  if (companyStatus === 'pending') {
    return (
        <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-2 text-[#3ecf8e]">Registration Pending</h1>
                <p className="text-[#a0a0a0]">Your organization is waiting for system administrator approval.</p>
            </div>
        </div>
    );
  }

  // NẾU ĐÃ ĐƯỢC DUYỆT -> VÀO APP CHÍNH
  return (
    <div className="bg-[#1c1c1c] text-[#ededed] flex h-screen overflow-hidden font-sans">
      <Sidebar type="admin" role={userRole} />
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
