import React, { useState } from 'react';
import { X, Settings, User, Bell, Shield, Monitor } from 'lucide-react';
import { Button, Avatar } from './items';

const SettingsModal = ({ isOpen, onClose }) => {
  // 1. Tạo state để quản lý Tab đang mở
  const [activeTab, setActiveTab] = useState('account');

  if (!isOpen) return null;

  // 2. Hàm render nội dung tùy theo Tab
  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-white mb-6">Account Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Avatar name="Admin" color="bg-[#3ecf8e]" />
                <Avatar className="hover:bg-[#374151]/20" name="+" color="bg-[none]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#a0a0a0] uppercase">Admin Username</label>
                <div className="flex flex-row">
                  <input readOnly type="text" defaultValue="Solo Dev" className="basis-3/4 bg-[#2a2a2a] border border-[#3e3e3e] rounded-lg px-4 py-2 text-white focus:border-[#3ecf8e] outline-none" />
                  <Button variant="outline" className="basis-1/4 ml-2">Update</Button>
                </div>
                
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#a0a0a0] uppercase">Email Address</label>
                <div className="flex flex-row">
                  <input readOnly type="email" defaultValue="admin@flux.io" className="basis-3/4 bg-[#2a2a2a] border border-[#3e3e3e] rounded-lg px-4 py-2 text-white focus:border-[#3ecf8e] outline-none" />
                  <Button variant="outline" className="basis-1/4 ml-2">Update</Button>
                </div>
                
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#a0a0a0] uppercase">Password</label>
                <div className="flex flex-row">
                  <input readOnly type="password" defaultValue="••••••••" className="basis-3/4 bg-[#2a2a2a] border border-[#3e3e3e] rounded-lg px-4 py-2 text-white focus:border-[#3ecf8e] outline-none" />
                  <Button variant="outline" className="basis-1/4 ml-2">Update</Button>
                </div>
              </div>
              <hr className="border-[#f87171] my-6 border-t border-[#3e3e3e]" />
              <div className="flex justify-center gap-2">
                <p className="text-[#f87171] font-bold">Danger Zone</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#a0a0a0] uppercase">Delete account</label>
                  <Button variant="danger" className="basis-1/4 ml-2">Delete</Button>
              </div>       
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-white mb-6">Notifications</h3>
            <p className="text-[#a0a0a0]">Configure how you receive security alerts.</p>
            {/* Thêm các nút gạt (Switch) ở đây */}
          </div>
        );
      case 'security':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-white mb-6">Security & Encryption</h3>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              Critical: High-level encryption (AES-256) is currently active.
            </div>
          </div>
        );
      default:
        return <div className="text-[#a0a0a0]">Select a tab from the sidebar.</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#1c1c1c] border border-[#3e3e3e] w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3e3e3e] flex items-center justify-between bg-[#252525]">
          <div className="flex items-center gap-2 text-white">
            <Settings size={18} className="text-[#3ecf8e]" />
            <span className="font-bold">System Configuration</span>
          </div>
          <button onClick={onClose} className="text-[#a0a0a0] hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-[#3e3e3e] p-4 flex flex-col gap-1 bg-[#1c1c1c]">
            <NavBtn 
              icon={<User size={18}/>} 
              label="Account" 
              active={activeTab === 'account'} 
              onClick={() => setActiveTab('account')} 
            />
            <NavBtn 
              icon={<Bell size={18}/>} 
              label="Notifications" 
              active={activeTab === 'notifications'} 
              onClick={() => setActiveTab('notifications')} 
            />
            <NavBtn 
              icon={<Shield size={18}/>} 
              label="Security" 
              active={activeTab === 'security'} 
              onClick={() => setActiveTab('security')} 
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-[#161616]">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#3e3e3e] flex justify-end gap-3 bg-[#252525]">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary">Apply Settings</Button>
        </div>
      </div>
    </div>
  );
};

// Component con cho Nav (Nhớ thêm prop onClick)
const NavBtn = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
      ${active ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]' : 'text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a]'}
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default SettingsModal;