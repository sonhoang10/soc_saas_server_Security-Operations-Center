import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import StatsCard from '/src/components/tools/StatsCard';
import BandwidthUsage from '/src/components/tools/bandwith.jsx';
import {
   ShieldAlert, LogIn, UserX, Building2, LineChart, ArrowRight, CodeXml, CircleCheck, CircleAlert, Activity, Server
} from 'lucide-react';

// Sử dụng window.location.hostname để đồng bộ hoàn toàn với file Attacks đã chạy thành công
const backendURL = `http://${window.location.hostname}:8000`;
const wsURL = `ws://${window.location.hostname}:8000`;

const MainScreen = () => {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [serverInfo, setServerInfo] = useState({ 
    id: '', ip: '', name: 'Resolving Context...', 
    status: 'offline', monitor_status: 'pending' 
  });
  const [loading, setLoading] = useState(true);
  const [IsDown, setIsDown] = useState(false);
  
  const [stats, setStats] = useState({
    totalEvents: 0,
    criticalAlerts: 0,
    autoBlocks: 0
  });

  // Chart Data: Mảng 10 phần tử đại diện cho cửa sổ thời gian (Sliding Window)
  const [chartData, setChartData] = useState(Array(10).fill(0));
  const currentTickAlerts = useRef(0);

  const [log, setLog] = useState(() => {
    const savedLog = sessionStorage.getItem('flux_client_logs');
    return savedLog ? JSON.parse(savedLog) : [];
  });

  // ==========================================
  // 2. FETCH SERVER CONTEXT & HISTORICAL DATA
  // ==========================================
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetServerId = urlParams.get('server_id');
    const teamId = urlParams.get('team_id') || localStorage.getItem('current_team_id');
    const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');

    if (!targetServerId || !teamId) {
      setServerInfo(prev => ({ ...prev, name: 'Context Error: Missing Auth ID', status: 'error' }));
      setLoading(false);
      return;
    }

    const fetchServerDetailsAndLogs = async () => {
      try {
        // 2.1 Fetch Server Context
        const response = await axios.get(`${backendURL}/api/servers/my-servers?team_id=${teamId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const servers = response.data.servers || [];
        const currentServer = servers.find(s => s.id === targetServerId);
        
        if (currentServer) {
          const cleanIp = currentServer.ip_address.replace(/^https?:\/\//, '').replace(/\/$/, '');
          setServerInfo({ 
              id: currentServer.id, 
              ip: cleanIp, 
              name: currentServer.name, 
              status: currentServer.status,
              monitor_status: currentServer.monitor_status
          });

          // 2.2 Fetch Historical Logs from ClickHouse (Giải quyết triệt để lỗi Cold Start)
          try {
            const logsRes = await axios.get(`${backendURL}/api/logs?team_id=${teamId}&limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (logsRes.data && logsRes.data.logs) {
                const serverLogs = logsRes.data.logs.filter(l => l.target_ip === cleanIp);
                
                // Format data từ Database để hiển thị lên Terminal UI
                const formattedLogs = serverLogs.map(l => {
                    const actionContext = l.action !== "Unknown" ? l.action : "System Event";
                    const userContext = l.username !== "-" ? `(${l.username})` : "";
                    return `[${l.timestamp}] INFO: ${l.log_type.toUpperCase()} - ${actionContext} ${userContext}`;
                }).reverse(); // Đảo ngược mảng để log cũ ở trên, mới ở dưới
                
                if (formattedLogs.length > 0) {
                    setLog(formattedLogs.slice(-50)); // Giữ 50 dòng mới nhất tránh tràn RAM
                }

                setStats(prev => ({
                    ...prev,
                    totalEvents: serverLogs.length
                }));
            }
          } catch (logErr) {
             console.error("Historical logs fetch error:", logErr);
          }

        } else {
          setServerInfo(prev => ({ ...prev, name: 'Server Not Found', status: 'error' }));
        }
      } catch (error) {
        console.error("Context Error: Failed to fetch server context.", error);
        setServerInfo(prev => ({ ...prev, name: 'API Error', status: 'error' }));
      } finally {
        setLoading(false);
      }
    };

    fetchServerDetailsAndLogs();
  }, []);

  // ==========================================
  // 3. WEBSOCKET & REAL-TIME CHART PIPELINE
  // ==========================================
  useEffect(() => {
    if (!serverInfo.ip || serverInfo.ip === 'Unknown' || serverInfo.status === 'error') return;

    const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
    const ws = new WebSocket(`${wsURL}/ws/alerts?token=${token}`);

    ws.onopen = () => console.log(`[Dashboard WS] Secure Pipeline Connected for IP: ${serverInfo.ip}`);

    ws.onmessage = (event) => {
      try {
        const alertData = JSON.parse(event.data);
        
        // CHỐT CHẶN BẢO MẬT: Bắt cả 'target_server' và 'target_ip'
        const alertTargetIp = alertData.target_server || alertData.target_ip;

        if (alertTargetIp === serverInfo.ip) {
          const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
          
          // 3.1 Update Terminal Logs 
          setLog(prev => {
            const newLogs = [...prev, `[${timestamp}] ${alertData.level || 'WARN'}: ${alertData.type} from ${alertData.ip}`];
            if (newLogs.length > 50) newLogs.shift(); 
            sessionStorage.setItem('flux_client_logs', JSON.stringify(newLogs));
            return newLogs;
          });

          // 3.2 Update Chart Tick Accumulator
          currentTickAlerts.current += 1;

          // 3.3 Update Stats Cards
          setStats(prev => {
            const updates = { ...prev };
            updates.totalEvents += 1;
            if (alertData.level === 'CRITICAL' || alertData.level === 'Red Alert') updates.criticalAlerts += 1;
            if (alertData.analysis && alertData.analysis.includes('Ban')) updates.autoBlocks += 1;
            return updates;
          });

          // 3.4 Trigger Visual Warning
          if (alertData.level === 'CRITICAL') {
            setIsDown(true);
            setTimeout(() => setIsDown(false), 5000); 
          }
        }
      } catch (err) {
        console.error("WebSocket format error:", err);
      }
    };

    // Tự động vẽ biểu đồ Realtime bằng Sliding Window (Mỗi 3 giây chạy 1 nhịp)
    const chartInterval = setInterval(() => {
      setChartData(prevData => {
        const newData = [...prevData.slice(1), currentTickAlerts.current];
        currentTickAlerts.current = 0; 
        return newData;
      });
    }, 3000);

    return () => {
      if (ws.readyState === 1) ws.close();
      clearInterval(chartInterval);
    };
  }, [serverInfo.ip]);

  const maxChartValue = Math.max(...chartData, 10); 
  const isMonitorActive = serverInfo.monitor_status === 'active';

  // ==========================================
  // 4. MAIN RENDER
  // ==========================================
  if (loading) {
      return (
          <div className="flex-1 p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-[#3ecf8e]">
                  <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-mono text-sm uppercase tracking-widest text-[#a0a0a0]">Initializing Dashboard...</span>
              </div>
          </div>
      );
  }

  return (
      <div className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flux-scrollbar overflow-x-hidden">  
        
        {/* HEADER CONTEXT */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#3e3e3e]">
            <div className="p-3 bg-[#3ecf8e]/10 rounded-lg border border-[#3ecf8e]/20 text-[#3ecf8e]">
              <Server size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{serverInfo.name}</h1>
                  {isMonitorActive ? (
                      <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] uppercase font-bold tracking-wider rounded flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                      </span>
                  ) : (
                      <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] uppercase font-bold tracking-wider rounded flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> Pending
                      </span>
                  )}
              </div>
              <p className="text-xs md:text-sm text-[#a0a0a0] font-mono flex items-center gap-2 mt-1">
                  <Activity size={14} className="text-[#3ecf8e]" />
                  Bound IP: {serverInfo.ip}
              </p>
            </div>
        </div>

        {/* STATUS CARDS */}
        <div className="flex flex-row gap-4 min-h-0">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border flex flex-col justify-center items-center transition-all duration-500 ${
              IsDown 
              ? "bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
              : "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            }`}>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Health Status</span>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-black ${IsDown ? "text-red-500" : "text-emerald-500"}`}>
                  {IsDown ? <div className="flex items-center gap-2"><CircleAlert size={20}/>UNDER ATTACK</div> : <div className="flex items-center gap-2"><CircleCheck size={20}/>SECURE</div>}
                </h2>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#3e3e3e] bg-[#141414] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Agent Version</span>
                <span className="text-[10px] text-zinc-400 font-mono">v2.4.0-stable</span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-400">Connection Uptime</span>
                  <span className="text-emerald-400 font-mono">99.9%</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[99.9%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS SECTION */}
        <section className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 transition-opacity duration-300 ${!isMonitorActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <StatsCard title="Total Threats Detected" value={stats.totalEvents.toLocaleString()} trend="Session tracked" icon={<LogIn size={20}/>} color="sbTeal" />
          <StatsCard title="Critical Alerts" value={stats.criticalAlerts.toLocaleString()} trend="Requires review" icon={<ShieldAlert size={20}/>} color="sbRed" isAlert={stats.criticalAlerts > 0} />
          <StatsCard title="Auto Block (SOAR)" value={stats.autoBlocks.toLocaleString()} trend="IPs mitigated" icon={<UserX size={20}/>} color="sbYellow" />
        </section>

        {/* CHARTS & LOGS SECTION */}
        <section className={`grid grid-cols-1 xl:grid-cols-3 gap-6 transition-opacity duration-300 ${!isMonitorActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          
          {/* REAL-TIME LINE GRAPH */}
          <div className="xl:col-span-2 bg-[#2a2a2a] p-6 rounded-xl border border-[#3e3e3e] shadow-lg flex flex-col h-[400px]">
            <div className="flex items-center gap-3 mb-6">
              <LineChart className="text-[#3ecf8e]" size={24} />
              <h2 className="text-lg font-semibold">Real-Time Threat Frequency (Tick/3s)</h2>
              <button className="ml-auto text-xs text-[#3ecf8e] hover:underline flex items-center gap-1">
                Live Data <ArrowRight size={12} />
              </button>
            </div>
            
            <div className="flex-1 w-full flex items-end gap-2 relative border-b border-l border-[#3e3e3e]/50 pb-1 pl-1">
              {chartData.map((val, i) => {
                const heightPercentage = Math.min((val / maxChartValue) * 100, 100);
                return (
                  <div 
                    key={i} 
                    style={{ height: `${heightPercentage}%`, minHeight: '2px' }} 
                    className={`flex-1 rounded-t transition-all duration-300 relative group ${val > (maxChartValue * 0.7) ? 'bg-[#f87171] shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'bg-[#3ecf8e]/40 hover:bg-[#3ecf8e]/80'}`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                      {val} hits
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* TERMINAL LOGS */}
          <div className="bg-[#2a2a2a] p-6 rounded-xl border border-[#3e3e3e] shadow-lg flex flex-col h-[400px]">
            <div className="flex items-center gap-3 mb-6">
              <CodeXml className="text-[#3ecf8e]" size={24} />
              <h2 className="text-lg font-semibold">Live Event Stream</h2>
            </div>
            <div className="flex-1 flex flex-col justify-between bg-black rounded-lg p-4 mb-4 min-h-0">  
              <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 font-mono text-[11px] pr-2 flux-scrollbar flex flex-col-reverse">
                {[...log].reverse().map((entry, index) => {
                  let colorClass = "text-[#3ecf8e]";
                  if (entry.includes("CRITICAL")) colorClass = "text-[#f87171]";
                  if (entry.includes("WARN")) colorClass = "text-[#fbbf24]";
                  return (
                    <p key={index} className={colorClass}>
                      {entry}
                    </p>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 group pt-2 border-t border-[#3e3e3e]/50">
                <span className="text-[#3ecf8e] font-bold select-none italic">~ $</span>
                <input 
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-[#ededed] placeholder:text-[#3e3e3e] caret-[#3ecf8e]"
                  placeholder="Type 'clear' to empty logs..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim() !== "") {
                      if (e.target.value.trim().toLowerCase() === 'clear') {
                        setLog([]);
                        sessionStorage.removeItem('flux_client_logs');
                      } else {
                        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        setLog(prev => [...prev, `[${timestamp}] COMMAND: ${e.target.value}`]);
                      }
                      e.target.value = ""; 
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </section>
        
        <BandwidthUsage />
      </div>
  );
};

export default MainScreen;