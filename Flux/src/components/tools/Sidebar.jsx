import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClickOutsideWrapper, DropdownWrapper } from './items';
import {
  Zap, LayoutGrid, Activity, Users,
  FileKey2, Mail, LogOut, ShieldAlert, BriefcaseBusiness, LogIn, Settings, UserPen, BarChart3,
  History // <--- Thêm Icon History từ Lucide-react
} from 'lucide-react';
import { useTabs } from '../TabContext.jsx';
import SettingsModal from './settings.jsx';
import { DownloadCloud } from 'lucide-react';

// Rationale: Centralized menu configuration for RBAC-based dynamic rendering.
const MENU_CONFIG = {
  admin: [
    { icon: <LayoutGrid size={20}/>, label: 'Dashboard', tab: 'Dashboard' },
    { icon: <Activity size={20}/>, label: 'Security Logs', tab: 'Security Logs' },
    { icon: <ShieldAlert size={20}/>, label: 'Current Attacks', tab: 'Current Attacks' },
    { icon: <BriefcaseBusiness size={20}/>, label: 'Client Management', tab: 'Client Management' },
    { icon: <Mail size={20}/>, label: 'Reports', tab: 'Report Receiver' },
  ],
  client: [
    { icon: <LayoutGrid size={20}/>, label: 'Dashboard', tab: 'Client Dashboard' },
    { icon: <DownloadCloud size={20}/>, label: 'Agent Deployment', tab: 'Client Agent Deployment' },
    { icon: <ShieldAlert size={20}/>, label: 'Current Attacks', tab: 'Client Current Attacks' },
    { icon: <History size={20}/>, label: 'Audit History', tab: 'Client History Logs' }, // <--- Thêm nút bấm cho Tab mới
    { icon: <BarChart3 size={20}/>, label: 'Report', tab: 'Client Report' },
  ],
  admin_extra: [
    { icon: <Users size={20}/>, label: 'Tenants', tab: null },
    { icon: <FileKey2 size={20}/>, label: 'Security Policies', tab: null },
  ],
};

const Sidebar = ({ type = 'admin' }) => {
  const { activeTab, setActiveTab } = useTabs();
  const [ShowTab, setShowTab] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // State to hold dynamic user information fetched from the backend
  const [userInfo, setUserInfo] = useState({
    username: 'Loading...',
    initials: '..',
    role: type === 'admin' ? 'System Administrator' : 'Organization Member'
  });

  const showExtra = type === 'admin';
  const menuItems = MENU_CONFIG[type] || MENU_CONFIG.client;

  /**
   * Fetches the current authenticated user's profile on component mount.
   * Utilizes JWT token from LocalStorage to authorize the request.
   */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
        if (!token) return;

        const backendURL = `http://${window.location.hostname}:8000`;
        const response = await axios.get(`${backendURL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const userData = response.data;
        // Fallback to the local part of the email if username is empty
        const displayName = userData.username || userData.email.split('@')[0];
        
        // Extract up to 2 initial characters for the Avatar
        const generatedInitials = displayName.substring(0, 2).toUpperCase();
        
        // Resolve RBAC role display
        let displayRole = type === 'admin' ? 'Enterprise Admin' : 'Tenant Context';
        if (userData.is_superadmin) displayRole = 'Super Administrator';

        setUserInfo({
          username: displayName,
          initials: generatedInitials,
          role: displayRole
        });
      } catch (error) {
        console.error("Authentication Context Error: Failed to retrieve user profile.", error);
        setUserInfo({
          username: 'Guest',
          initials: '?',
          role: 'Unauthorized'
        });
      }
    };

    fetchUserProfile();
  }, [type]);

  /**
   * Safely terminates the user session by clearing client-side storage
   * and redirecting to the authentication gateway.
   */
  const handleLogout = (e) => {
    if (e) e.stopPropagation();
    localStorage.removeItem('soc_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_team_id');
    window.location.href = '/SignIn.html';
  };

  return (
    <aside className="w-64 bg-[#1c1c1c] border-r border-[#3e3e3e] flex flex-col h-full shrink-0">
      {/* Logo Section */}
      <div onClick={() => setActiveTab('Dashboard')} className="hover:cursor-pointer h-16 flex items-center gap-2 px-6 border-b border-[#3e3e3e] shrink-0">
        <Zap className="w-7 h-7 text-[#3ecf8e]" />
        <span className="text-xl font-bold text-white uppercase tracking-tight">
          Flux <span className="text-[#3ecf8e] text-xs font-mono ml-1">nk</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto flux-scrollbar">
        <div className="pt-2 pb-2">
          <p className="px-4 text-[10px] font-bold text-[#a0a0a0] uppercase tracking-[0.2em]">
            {type === 'admin' ? 'Control' : 'Dashboard'}
          </p>
        </div>

        {menuItems.map((item) => (
          <NavItem 
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.tab}
            onClick={() => item.tab && setActiveTab(item.tab)}
          />
        ))}
      </nav>

      {/* User Profile Section */}
      <div className='relative mt-auto shrink-0'>
        <ClickOutsideWrapper onClickOutside={() => setShowTab(false)}>
          <div onClick={() => setShowTab(!ShowTab)} className="p-4 border-t border-[#3e3e3e] hover:bg-[#2a2a2a]/50 flex items-center gap-3 bg-[#1c1c1c] cursor-pointer transition-colors">
              <div className="w-10 h-10 rounded-full border border-[#3e3e3e] bg-[#2a2a2a] flex items-center justify-center text-[#3ecf8e] font-bold shrink-0 shadow-inner">
                {userInfo.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-white">{userInfo.username}</p>
                <p className="text-xs text-[#a0a0a0] truncate">{userInfo.role}</p>
              </div>
              <button onClick={handleLogout} className="text-[#a0a0a0] hover:text-[#f87171] transition p-1 shrink-0">
                <LogOut size={18} />
              </button>
              
          </div>
          <DropdownWrapper isOpen={ShowTab} align="top" className="w-56 right-4 mb-2"> 
            <div className="p-2 space-y-1">
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#3e3e3e] rounded-md transition text-[#ededed] flex items-center gap-3">
                <UserPen size={18} /> 
                <span>View Profile</span>
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="w-full text-left px-3 py-2 text-sm hover:bg-[#3e3e3e] rounded-md transition text-[#ededed] flex items-center gap-3">
                <Settings size={18} /> 
                <span>Settings</span>
              </button>
              <div className="h-[1px] bg-[#3e3e3e] my-1"></div>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm hover:bg-[#f87171]/20 transition text-[#f87171] rounded-md flex items-center gap-3" >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </div>
          </DropdownWrapper>
        </ClickOutsideWrapper>
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
      
    </aside>
  );
};

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 w-full
      ${active 
        ? 'bg-[#2a2a2a] text-[#3ecf8e] font-medium shadow-sm border border-[#3e3e3e]' 
        : 'text-[#a0a0a0] border border-transparent hover:text-white hover:bg-[#2a2a2a]/50'}
    `}
  >
    <div className={`${active ? 'scale-110' : ''} transition-transform duration-200`}>
      {icon}
    </div>
    <span className="text-sm">{label}</span>
  </button>
);

export default Sidebar;