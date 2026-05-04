import React, { useState, useEffect, useRef } from 'react';
import StatsCard from '/src/components/tools/StatsCard';
import SecurityTable from '/src/components/tools/SecurityTable';
import {Select} from '/src/components/tools/items.jsx';
import BandwidthUsage from '../../tools/Bandwidth.jsx';

import {
   ShieldAlert,  LogIn, UserX , Building2, LineChart, ArrowRight, CodeXml, CircleCheck, CircleAlert
} from 'lucide-react';

const MainScreen = () => {
  const [IsDown, setIsDown] = useState(true);
  
  const Clients = [
    { value: 'client-a', label: 'Client A' },
    { value: 'client-b', label: 'Client B' },
    { value: 'client-c', label: 'Client C' },
    { value: 'client-d', label: 'Client D' },
  ];
  const [selectedClient, setSelectedClient] = useState(Clients[0].value);
  const [log, setLog] = useState(() => {
      const savedLog = sessionStorage.getItem('flux_logs');
      return savedLog ? JSON.parse(savedLog) : [
        "[2026-03-31 08:30:12] INFO: System integrity check passed.",
        "[2026-03-31 08:31:05] WARN: Multiple failed logins from IP 103.x.x.x",
        "[2026-03-31 08:32:44] TRACE: Tenant 'AcmeCorp' updated Security Policy #4."
      ];
    });
  
    useEffect(() => {
    sessionStorage.setItem('flux_logs', JSON.stringify(log));
    }, [log]);
  
  const scrollRef = useRef(null); // Tạo tham chiếu đến điểm cuối

  // Hàm tự động cuộn
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Theo dõi mảng log, cứ hễ log thay đổi là cuộn
  useEffect(() => {
    scrollToBottom();
  }, [log]);

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto flux-scrollbar">  
      <div className="flex flex-row gap-4 min-h-0">
        {/* Cột trái: Sidebar/Select (Giữ nguyên basis-1/4 của mày) */}
        <div className="basis-1/4">
          <div className="p-4 w-full bg-[#1a1a1a] border border-[#3e3e3e] rounded-xl">
            <Select 
              label="Clients"
              options={Clients}
            />
          </div>
        </div>

        {/* Cột phải: System Status Panel (Sửa lại từ basis-2/3 thành flex-1 để tự dãn) */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          
          {/* 1. Overall Status Card */}
          <div className={`p-4 rounded-xl border flex flex-col justify-center items-center transition-all ${
            IsDown 
            ? "bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
            : "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          }`}>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Overall System</span>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl font-black ${IsDown ? "text-red-500" : "text-emerald-500"}`}>
                {IsDown ? <div className="flex items-center gap-2"><CircleAlert size={20}/>CRITICAL</div> : <div className="flex items-center gap-2"><CircleCheck size={20}/>OPERATIONAL</div>}
              </h2>
            </div>
          </div>

          {/* 2. Server-Endpoint Status Card */}
          <div className="p-4 rounded-xl border border-[#3e3e3e] bg-[#141414] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Endpoints</span>
              <span className="text-[10px] text-zinc-400 font-mono">v2.4.0-stable</span>
            </div>
            
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Main API Gateway</span>
                <span className="text-emerald-400 font-mono">99.2%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[99.2%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS SECTION */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard title="Total Logins (24h)" value="45,102" trend="+5.2% vs yesterday" icon={<LogIn size={20}/>} color="sbTeal" />
        <StatsCard title="Critical Alerts" value="18" trend="Needs immediate action" icon={<ShieldAlert size={20}/>} color="sbRed" isAlert />
        <StatsCard title="Auto Block (SOAR)" value="112" trend="IP & accounts blocked" icon={<UserX size={20}/>} color="sbYellow" />
        <StatsCard title="Enterprise Customers" value="8 / 10" trend="SOC SaaS ecosystem" icon={<Building2 size={20}/>} color="sbTeal" />
      </section>

      {/* CHARTS & COMPLIANCE SECTION */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#2a2a2a] p-6 rounded-xl border border-[#3e3e3e] shadow-lg flex flex-col h-[400px]">
          <div className="flex items-center gap-3 mb-6">
            <LineChart className="text-[#3ecf8e]" size={24} />
            <h2 className="text-lg font-semibold">Failed Login Frequency (Attacks detect)</h2>
            <button className="ml-auto text-xs text-[#3ecf8e] hover:underline flex items-center gap-1">
              View details <ArrowRight size={12} />
            </button>
          </div>
          {/* Mockup Chart Area */}
          <div className="flex-1 w-full flex items-end gap-1 relative border-b border-l border-[#3e3e3e]/50 pb-1 pl-1">
            {[20, 35, 45, 60, 40, 95, 70, 55, 45, 20].map((height, i) => (
              <div 
                key={i} 
                style={{ height: `${height}%` }} 
                className={`flex-1 rounded-t hover:opacity-80 transition-all ${height > 80 ? 'bg-[#f87171] animate-pulse' : 'bg-[#3ecf8e]/20'}`}
              ></div>
            ))}
          </div>
        </div>

        <div className="bg-[#2a2a2a] p-6 rounded-xl border border-[#3e3e3e] shadow-lg flex flex-col h-[400px]">
          <div className="flex items-center gap-3 mb-6">
            <CodeXml className="text-[#3ecf8e]" size={24} />
            <h2 className="text-lg font-semibold">Logs</h2>
          </div>
          <div className="flex-1 flex flex-col bg-black rounded-lg p-4 mb-4 min-h-0 border border-[#3e3e3e]"> 
            {/* 1. Vùng Logs: flex-1 để chiếm chỗ, overflow-y-auto để hiện thanh cuộn */}
            <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 font-mono text-[11px] pr-2 flux-scrollbar">
              {log.map((entry, index) => (
                <p key={index} className={`text-[${entry.includes("WARN") ? "#f87171" : entry.includes("INFO") ? "#3ecf8e" : "#a0a0a0"}] ${entry.includes("WARN") ? "animate-pulse" : ""}`}>
                  {entry}
                </p>
              ))}
            </div>
            <div className=" flex items-center gap-2 group pt-2 overflow-x-auto">
              <span className="text-[#3ecf8e] font-bold select-none italic">~ $</span>
              <input 
                type="text"
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-[#ededed] placeholder:text-[#3e3e3e] caret-[#3ecf8e] overflow-x-auto"
                placeholder="Type command (e.g. 'ban ip', 'clear', 'scan')..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim() !== "") {
                    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    const newLogEntry = `[${timestamp}] COMMAND: ${e.target.value}`;

                    // Chỉ cần cập nhật State, React sẽ tự lo phần hiển thị (render)
                    setLog(prev => [...prev, newLogEntry]);

                    // Xóa input sau khi enter
                    e.target.value = ""; 
                  }
                }}
              />
              
            </div>

          </div>
        </div>
      </section>
      <BandwidthUsage/>
      {/* SECURITY TABLE */}
      <SecurityTable />
    </div>
  );
};

export default MainScreen;