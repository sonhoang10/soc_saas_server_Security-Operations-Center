import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Crosshair, 
  Zap, 
  Search, 
  ChevronDown, 
  MapPinX, 
  Clock, 
  ShieldX, 
  Server,
  Activity,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Bot,
  Info
} from 'lucide-react';
import axios from 'axios';
import MapSecurity from '../../tools/WorldMap.jsx';

const backendURL = `http://${window.location.hostname}:8000`;
const logicEngineURL = `http://${window.location.hostname}:8001`;

const CurrentAttacks = () => {
  const [attacks, setAttacks] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [serverInfo, setServerInfo] = useState({ 
      id: '', ip: '', name: 'Resolving Context...', 
      status: 'offline', monitor_status: 'pending', defender_status: 'pending' 
  });
  const [loading, setLoading] = useState(true);
  const [autoBanEnabled, setAutoBanEnabled] = useState(false);
  
  const [attackSearchTerm, setAttackSearchTerm] = useState('');
  const [blacklistSearchTerm, setBlacklistSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('Live');
  
  const [manualBanIp, setManualBanIp] = useState('');
  const [manualBanReason, setManualBanReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);

  // ================= LOGIC FETCH DATA =================
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetServerId = urlParams.get('server_id');
    const teamId = urlParams.get('team_id') || localStorage.getItem('current_team_id');
    const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');

    if (!targetServerId || !teamId) {
      console.warn("Context Error: Missing Auth ID.");
      setServerInfo(prev => ({ ...prev, name: 'Context Error: Missing Auth ID', status: 'error' }));
      setLoading(false);
      return;
    }

    const fetchServerDetails = async () => {
      try {
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
              monitor_status: currentServer.monitor_status,
              defender_status: currentServer.defender_status
          });
          fetchBannedIps(cleanIp);
          fetchAutoBanStatus(); 
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

    fetchServerDetails();
  }, []);

  // Polling to auto-dismiss pending warnings
  useEffect(() => {
    let interval;
    if (serverInfo && (serverInfo.monitor_status === 'pending' || serverInfo.defender_status === 'pending')) {
        const teamId = localStorage.getItem('current_team_id');
        interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
                const response = await axios.get(`${backendURL}/api/servers/my-servers?team_id=${teamId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const current = response.data.servers.find(s => s.id === serverInfo.id);
                if (current) {
                    setServerInfo(prev => ({
                        ...prev, 
                        status: current.status,
                        monitor_status: current.monitor_status,
                        defender_status: current.defender_status
                    }));
                }
            } catch (err) {
                // Ignore silent polling errors
            }
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [serverInfo]);

  const fetchBannedIps = useCallback(async (targetIp) => {
    try {
      const response = await axios.get(`${logicEngineURL}/api/banned_ips`);
      const allBanned = response.data.banned || [];
      const serverBannedIps = allBanned.filter(b => b.target_server === targetIp);
      setBlockedIps(serverBannedIps);
    } catch (error) {
      console.error("Failed to fetch banned IPs:", error);
    }
  }, []);

  const fetchAutoBanStatus = async () => {
    try {
      const res = await axios.get(`${logicEngineURL}/api/autoban/status`);
      setAutoBanEnabled(res.data.enabled);
    } catch (error) {
      console.error("Failed to fetch Auto-ban status", error);
    }
  };

  const toggleAutoBan = async () => {
    try {
      const newState = !autoBanEnabled;
      setAutoBanEnabled(newState);
      await axios.post(`${logicEngineURL}/api/autoban/toggle`, { enabled: newState });
    } catch (error) {
      setAutoBanEnabled(!autoBanEnabled);
      alert("Failed to connect to Logic Engine to toggle Auto-ban.");
    }
  };

  // ================= TÍCH HỢP WEBSOCKET MỚI TẠI ĐÂY =================
  useEffect(() => {
    if (!serverInfo.ip || serverInfo.ip === 'Unknown') return;

    const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/alerts?token=${token}`);

    ws.onopen = () => console.log(`[WebSocket] Secure Pipeline Connected for IP: ${serverInfo.ip}`);

    ws.onmessage = (event) => {
      const alertData = JSON.parse(event.data);
      
      if (alertData.target_server === serverInfo.ip) {
        
        // CHỈNH SỬA DUY NHẤT 1: Lọc và Xóa Alert cũ, đưa Alert mới lên đầu
        setAttacks(prev => {
            const filtered = prev.filter(a => !(a.ip === alertData.ip && a.type === alertData.type));
            return [alertData, ...filtered].slice(0, 50);
        });
        
        if (alertData.analysis && alertData.analysis.includes("Ban")) {
          setBlockedIps(prev => {
            if(prev.some(b => b.ip === alertData.ip)) return prev;
            return [{ ip: alertData.ip, time: alertData.time, reason: "Auto-Ban Triggered" }, ...prev];
          });
        }
      }
    };

    ws.onerror = (error) => console.error("WebSocket Error:", error);
    return () => { if (ws.readyState === 1) ws.close(); };
  }, [serverInfo.ip]);

  const executeBan = async (ipToBan, reasonToBan) => {
    if (!ipToBan.trim()) return;
    if (blockedIps.some(b => b.ip === ipToBan)) return;

    setIsBanning(true);
    const newBan = { 
        ip: ipToBan, time: new Date().toISOString(), target_server: serverInfo.ip, reason: reasonToBan || "Manual Intervention"
    };

    setBlockedIps(prev => [newBan, ...prev]);

    try {
      await axios.post(`${logicEngineURL}/api/ban`, {
          ip: ipToBan, target_server_ip: serverInfo.ip, reason: reasonToBan || "Manual Intervention"
      });
      if (ipToBan === manualBanIp) {
        setManualBanIp('');
        setManualBanReason('');
      }
    } catch (error) {
      console.error("Ban action failed:", error);
      setBlockedIps(prev => prev.filter(item => item.ip !== ipToBan));
      alert(`Failed to apply ban rule for IP: ${ipToBan}`);
    } finally {
      setIsBanning(false);
    }
  };

  const handleManualUnban = async (ipToUnban) => {
    const previousState = [...blockedIps];
    setBlockedIps(prev => prev.filter(item => item.ip !== ipToUnban));

    try {
      await axios.post(`${logicEngineURL}/api/unban`, {
        ip: ipToUnban, target_server_ip: serverInfo.ip
      });
    } catch (error) {
      console.error("Unban action failed:", error);
      setBlockedIps(previousState);
      alert("Failed to remove ban rule from target server.");
    }
  };

  const filteredAttacks = attacks.filter(attack => {
    const matchesSearch = attack.ip.includes(attackSearchTerm) || attack.type.toLowerCase().includes(attackSearchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'Live' || attack.level.toLowerCase() === filterSeverity.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  const filteredBlacklist = blockedIps.filter(item => {
    return item.ip.includes(blacklistSearchTerm) || (item.reason && item.reason.toLowerCase().includes(blacklistSearchTerm.toLowerCase()));
  });

  const isMonitorActive = serverInfo.monitor_status === 'active';
  const isDefenderActive = serverInfo.defender_status === 'active';

  // ================= UI RENDER (Nguyên bản 100%) =================
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 flux-scrollbar overflow-x-hidden">
      
      {/* 1. Context Header & Auto-Ban Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#3e3e3e]">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-[#3ecf8e]/10 rounded-lg border border-[#3ecf8e]/20 text-[#3ecf8e]">
              <Server size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{serverInfo.name}</h1>
                  
                  {/* CONNECTION STATUS BADGE */}
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

        <div className="flex items-center justify-between lg:justify-start gap-4 bg-[#1c1c1c] border border-[#3e3e3e] px-4 md:px-5 py-3 rounded-xl shadow-lg w-full lg:w-auto">
            <div className="flex items-center gap-2">
                <Bot size={20} className={autoBanEnabled ? "text-red-500 animate-pulse" : "text-[#5a5a5a]"} />
                <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Active IPS</p>
                    <p className="text-[10px] text-[#a0a0a0] font-mono">Auto-ban threats</p>
                </div>
            </div>
            <button 
                onClick={toggleAutoBan}
                disabled={!isDefenderActive}
                title={!isDefenderActive ? "Requires Active Defender Module" : "Toggle Auto-ban"}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${autoBanEnabled ? 'bg-red-500' : 'bg-[#3e3e3e]'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${autoBanEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            {!isDefenderActive && <Lock size={14} className="text-[#f87171] ml-2" title="Locked: Defender Required" />}
        </div>
      </div>

      {/* PENDING STATE ALERT */}
      {!isMonitorActive && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 md:p-6 flex gap-4 items-start shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
          <Info className="text-yellow-500 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-yellow-500 font-bold text-sm md:text-base mb-1">Awaiting Data Connection</h3>
            <p className="text-xs md:text-sm text-[#a0a0a0] leading-relaxed">
              We have not received any heartbeat signals from the IP address <code className="text-white bg-black/50 px-1 rounded">{serverInfo.ip}</code>. 
              Please navigate to the <strong>Agent Deployment</strong> tab on the left menu, generate a Secret Key, and execute the installation script on your server to begin monitoring.
            </p>
          </div>
        </div>
      )}

      {/* 2. Metrics Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 transition-opacity duration-300 ${!isMonitorActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-[#2a2a2a] p-4 md:p-6 rounded-xl border-l-4 border-l-[#f87171] border border-[#3e3e3e] shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#f87171]/10 rounded-lg text-[#f87171]"><Zap size={24} /></div>
            <div>
              <p className="text-xs text-[#a0a0a0] uppercase font-bold tracking-wider">Active Incursions</p>
              <p className="text-xl md:text-2xl font-bold">{attacks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#2a2a2a] p-4 md:p-6 rounded-xl border-l-4 border-l-[#fbbf24] border border-[#3e3e3e] shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#fbbf24]/10 rounded-lg text-[#fbbf24]"><MapPinX size={24} /></div>
            <div>
              <p className="text-xs text-[#a0a0a0] uppercase font-bold tracking-wider">Blocked IPs</p>
              <p className="text-xl md:text-2xl font-bold">{blockedIps.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Layout 2 cột: Bảng Log (Trái) & Blacklist (Phải) */}
      <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 transition-opacity duration-300 ${!isMonitorActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Left: Real-time Threat Stream */}
        <div className="xl:col-span-2 bg-[#2a2a2a] rounded-xl border border-[#3e3e3e] shadow-xl flex flex-col h-[500px] md:h-[600px] overflow-hidden">
            <div className="p-4 md:p-6 border-b border-[#3e3e3e] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c1c]/50 shrink-0">
                <h2 className="text-base md:text-lg font-bold flex items-center gap-2 whitespace-nowrap">
                    <ShieldAlert className="text-[#f87171] animate-pulse" /> 
                    Real-time Threat Stream
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={16} />
                      <input 
                          type="text"
                          placeholder="Search attack IP..."
                          value={attackSearchTerm}
                          onChange={(e) => setAttackSearchTerm(e.target.value)}
                          className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#3ecf8e] text-white"
                      />
                    </div>
                    <div className="relative w-full sm:w-36">
                      <select 
                          className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3ecf8e] appearance-none text-[#ededed]"
                          value={filterSeverity}
                          onChange={(e) => setFilterSeverity(e.target.value)}
                      >
                          <option value="Live">All</option>
                          <option value="Critical">Critical</option>
                          <option value="Warning">Warning</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#a0a0a0]">
                          <ChevronDown size={14} />
                      </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto bg-[#1c1c1c]">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-[#a0a0a0] flex-col gap-3 p-4">
                        <div className="w-8 h-8 border-4 border-[#3ecf8e] border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-mono text-sm uppercase tracking-widest text-center">Resolving Context...</span>
                    </div>
                ) : filteredAttacks.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[#5a5a5a] flex-col gap-2 font-mono text-sm italic p-4 text-center">
                        <ShieldCheck size={32} className="text-[#3ecf8e]/30 mb-2" />
                        Monitoring active. No threats detected.
                    </div>
                ) : (
                    <table className="w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
                      <thead className="bg-[#2a2a2a] text-[#a0a0a0] text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-[#3e3e3e]">
                          <tr>
                              <th className="px-4 py-4 font-medium">Time</th>
                              <th className="px-4 py-4 font-medium">Attacker IP</th>
                              <th className="px-4 py-4 font-medium">Vector</th>
                              <th className="px-4 py-4 font-medium w-full">Analysis</th>
                              <th className="px-4 py-4 font-medium text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3e3e3e]">
                          {filteredAttacks.map((attack, index) => {
                              const isBanned = blockedIps.some(b => b.ip === attack.ip);
                              
                              // CHỈNH SỬA DUY NHẤT 2: Làm nổi bật UI nếu có chữ "[Đợt"
                              const isCombo = attack.analysis && attack.analysis.includes("[Đợt");
                              
                              return (
                                  <tr key={index} className={`hover:bg-[#2a2a2a]/50 transition-colors ${isCombo ? 'bg-red-500/10' : ''}`}>
                                      <td className="px-4 py-3 text-[11px] text-[#a0a0a0] font-mono">
                                          <div className="flex items-center gap-1.5">
                                              <Clock size={10} className="opacity-50" />
                                              {attack.time.split(' ')[1]}
                                          </div>
                                      </td>
                                      <td className="px-4 py-3 text-xs md:text-sm font-mono text-white">
                                          {attack.ip}
                                      </td>
                                      <td className="px-4 py-3">
                                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                                              attack.level === 'Critical' 
                                              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                          }`}>
                                              {attack.level === 'Critical' && <ShieldX size={10} />}
                                              {attack.type}
                                          </span>
                                      </td>
                                      <td className="px-4 py-3 text-xs text-[#a0a0a0] truncate max-w-[200px] md:max-w-xs">
                                          {isCombo ? <strong className="text-[#f87171]">{attack.analysis}</strong> : attack.analysis}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                          {!isDefenderActive ? (
                                              <span className="inline-flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#a0a0a0] bg-[#1c1c1c] border border-[#3e3e3e] px-2 py-1.5 rounded cursor-not-allowed" title="Active Defender module required">
                                                  <Lock size={10} className="text-[#5a5a5a]" /> Locked
                                              </span>
                                          ) : isBanned ? (
                                              <span className="inline-flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#a0a0a0] bg-[#1c1c1c] border border-[#3e3e3e] px-2 py-1.5 rounded cursor-not-allowed">
                                                  <Lock size={10} className="text-red-500" /> Banned
                                              </span>
                                          ) : (
                                              <button
                                                  onClick={() => executeBan(attack.ip, `Blocked inline: ${attack.type}`)}
                                                  className="inline-flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider text-white bg-red-600 hover:bg-red-500 px-2 py-1.5 rounded transition-all shadow-md shadow-red-600/20 active:scale-95"
                                              >
                                                  <ShieldAlert size={10} /> Ban IP
                                              </button>
                                          )}
                                      </td>
                                  </tr>
                              )
                          })}
                      </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* Right: Blacklist Management */}
        <div className="xl:col-span-1 bg-[#2a2a2a] rounded-xl border border-[#3e3e3e] shadow-xl flex flex-col h-[500px] md:h-[600px] overflow-hidden relative">
            
            {!isDefenderActive && (
                <div className="absolute inset-0 bg-[#1c1c1c]/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center border border-[#3e3e3e] rounded-xl">
                    <div className="w-12 h-12 bg-[#f87171]/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="text-[#f87171]" size={24} />
                    </div>
                    <h3 className="text-white font-bold mb-2">Feature Locked</h3>
                    <p className="text-xs text-[#a0a0a0] mb-4">The <strong>Active Defender</strong> IPS module is required to execute network block rules.</p>
                </div>
            )}

            <div className="p-4 md:p-6 border-b border-[#3e3e3e] bg-[#1c1c1c]/50 shrink-0">
                <h2 className="text-base md:text-lg font-bold flex items-center gap-2 mb-4 text-[#f87171]">
                    <Lock size={16} /> 
                    Blacklist Control
                </h2>
                
                <form onSubmit={(e) => { e.preventDefault(); executeBan(manualBanIp, manualBanReason); }} className="flex flex-col gap-3 mb-4 md:mb-6 bg-[#1c1c1c] p-3 md:p-4 rounded-lg border border-[#3e3e3e]/50">
                    <h3 className="text-[10px] md:text-xs font-bold text-[#a0a0a0] uppercase tracking-wider">Manual IP Ban</h3>
                    <input 
                        type="text" 
                        required
                        value={manualBanIp}
                        onChange={(e) => setManualBanIp(e.target.value)}
                        placeholder="Attacker IPv4..." 
                        className="w-full bg-[#111111] border border-[#3e3e3e] rounded-md px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-[#f87171] text-white font-mono placeholder:text-[#5a5a5a]"
                    />
                    <input 
                        type="text" 
                        value={manualBanReason}
                        onChange={(e) => setManualBanReason(e.target.value)}
                        placeholder="Reason (Optional)" 
                        className="w-full bg-[#111111] border border-[#3e3e3e] rounded-md px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-[#f87171] text-white placeholder:text-[#5a5a5a]"
                    />
                    <button 
                        type="submit" 
                        disabled={isBanning || !manualBanIp}
                        className="w-full bg-[#f87171]/10 hover:bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30 font-bold py-2 rounded-md text-xs md:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    >
                        {isBanning ? 'Processing...' : 'Apply Block Rule'}
                    </button>
                </form>

                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={14} />
                    <input 
                        type="text"
                        placeholder="Search banned IPs..."
                        value={blacklistSearchTerm}
                        onChange={(e) => setBlacklistSearchTerm(e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg pl-9 pr-4 py-2 text-xs md:text-sm focus:outline-none focus:border-[#f87171] transition-all text-white placeholder:text-[#5a5a5a]"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#1c1c1c] p-2 space-y-2">
                {filteredBlacklist.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[#5a5a5a] font-mono text-xs md:text-sm italic flex-col gap-2 p-4 text-center">
                        <AlertTriangle size={24} className="opacity-30" />
                        No active ban rules.
                    </div>
                ) : (
                    filteredBlacklist.map((item, idx) => (
                        <div key={idx} className="bg-[#2a2a2a] border border-[#3e3e3e] p-2 md:p-3 rounded-lg flex items-center justify-between group hover:border-[#f87171]/50 transition-colors">
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-mono text-xs md:text-sm font-bold text-[#f87171] truncate">{item.ip}</span>
                                <span className="text-[10px] md:text-xs text-[#a0a0a0] truncate mt-0.5">{item.reason || 'No reason provided'}</span>
                            </div>
                            <button 
                                onClick={() => handleManualUnban(item.ip)}
                                className="p-1.5 md:p-2 bg-[#1c1c1c] rounded-md border border-[#3e3e3e] text-[#a0a0a0] hover:text-[#3ecf8e] hover:border-[#3ecf8e]/50 hover:bg-[#3ecf8e]/10 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 shrink-0"
                                title="Remove Ban Rule"
                            >
                                <Unlock size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* 4. Live Threat Map  */}
      <div className={`w-full bg-[#2a2a2a] rounded-xl border border-[#3e3e3e] p-4 md:p-6 shadow-xl transition-opacity duration-300 ${!isMonitorActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <h2 className="text-base md:text-lg font-bold mb-4 flex items-center gap-2">
          <Crosshair className="text-[#f87171]" /> Live Threat Map
        </h2>
        <div className="aspect-video bg-[#1c1c1c] rounded-lg flex items-center justify-center border border-[#3e3e3e] text-[#3e3e3e] w-full overflow-hidden">
          <MapSecurity />
        </div>
      </div>

    </div>
  );
};

export default CurrentAttacks;
