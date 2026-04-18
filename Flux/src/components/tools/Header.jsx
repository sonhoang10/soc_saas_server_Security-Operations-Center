import { useState, useEffect } from 'react';
import { Bell, OctagonAlert, Search, Globe } from 'lucide-react';
import { DropdownWrapper, ClickOutsideWrapper } from './items';

const Header = () => {
  const [showNoti, setShowNoti] = useState(false);
  return (
    <header className="h-16 border-b border-[#3e3e3e] flex items-center px-8 bg-[#1c1c1c]/80 backdrop-blur-md z-10 sticky top-0">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0] group-focus-within:text-[#3ecf8e] transition" />
          <input 
            type="text" 
            placeholder="Search logs, IPs, users..." 
            className="w-full bg-[#2a2a2a] border border-[#3e3e3e] rounded-md py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#3ecf8e] transition text-[#ededed]"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-[#a0a0a0] text-xs font-medium">
          <Globe size={14} className="text-[#3ecf8e]" />
          <span>Hanoi, VN</span>
        </div>

        <div className="h-4 w-[1px] bg-[#3e3e3e]"></div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20 px-4 py-1.5 rounded-md hover:bg-[#f87171]/20 transition text-xs font-bold uppercase tracking-wider">
            <OctagonAlert size={14} /> Terminate Global Session
          </button>
          <div className="relative">
            <ClickOutsideWrapper onClickOutside={() => setShowNoti(false)}>
              <button onClick={() => setShowNoti(!showNoti)} className="relative text-[#a0a0a0] hover:text-white p-2 rounded-full hover:bg-[#2a2a2a] transition">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#f87171] rounded-full border-2 border-[#1c1c1c]"></span>
              </button>
              <DropdownWrapper isOpen={showNoti} className=" w-80">
                {/* Nhét nội dung gì vào cũng được */}
                <div className="p-4">Dữ liệu thông báo...</div>
              </DropdownWrapper>
            </ClickOutsideWrapper>
          </div>
          
        </div>
      </div>
    </header>
  );
};

export default Header;