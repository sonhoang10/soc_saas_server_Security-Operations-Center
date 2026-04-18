import React from 'react';
import { useEffect, useState } from 'react';
import { Terminal, Search } from 'lucide-react';

const SecurityLogs = () => {
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

  
  return(
    <div className="p-8 h-full flex flex-col space-y-6">  
      <div className="flex-1 bg-black/40 border border-[#3e3e3e] rounded-xl font-mono text-[11px] p-6 overflow-y-auto flex flex-col shadow-inner flux-scrollbar">
        {/* DANH SÁCH LOG CŨ */}
        <div className="space-y-1.5 mb-4">
          {log.map((entry, index) => (
            <p key={index} className={`text-[${entry.includes("WARN") ? "#f87171" : entry.includes("INFO") ? "#3ecf8e" : "#a0a0a0"}] ${entry.includes("WARN") ? "animate-pulse" : ""}`}>
              {entry}
            </p>
          ))}
        </div>

        {/* PHẦN TERMINAL PROMPT ($ ~) */}
        <div className="flex items-center gap-2 group pt-2">
          <span className="text-[#3ecf8e] font-bold select-none italic">~ $</span>
          <input 
            type="text"
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-[#ededed] placeholder:text-[#3e3e3e] caret-[#3ecf8e]"
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
  );
  
};

export default SecurityLogs;