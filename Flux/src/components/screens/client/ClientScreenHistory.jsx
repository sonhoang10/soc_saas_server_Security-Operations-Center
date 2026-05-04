import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History, Search, Filter, Download, Server, Activity, 
  Calendar, FileText, RefreshCw, ShieldAlert, TerminalSquare, 
  AlertOctagon, CheckCircle2, ShieldX, Clock
} from 'lucide-react';

const backendURL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8000`;

const ClientScreenHistory = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [serverInfo, setServerInfo] = useState({ id: '', ip: '', name: 'Resolving Context...' });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data States
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  // UI States
  const [viewMode, setViewMode] = useState('alerts'); // 'alerts' or 'logs'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [dataLimit, setDataLimit] = useState(200); 

  // ==========================================
  // DATA FETCHING PIPELINE (DUAL FETCH)
  // ==========================================
  const fetchHistoryData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetServerId = urlParams.get('server_id');
      const teamId = urlParams.get('team_id') || localStorage.getItem('current_team_id');
      const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');

      if (!targetServerId || !teamId) {
        setServerInfo(prev => ({ ...prev, name: 'Context Error: Missing Auth ID' }));
        return;
      }

      // 1. Resolve Server Context
      const serverRes = await axios.get(`${backendURL}/api/servers/my-servers?team_id=${teamId}`, {
          headers: { Authorization: `Bearer ${token}` }
      });
      
      const currentServer = serverRes.data.servers?.find(s => s.id === targetServerId);
      let cleanIp = '';
      
      if (currentServer) {
        cleanIp = currentServer.ip_address.replace(/^https?:\/\//, '').replace(/\/$/, '');
        setServerInfo({ id: currentServer.id, ip: cleanIp, name: currentServer.name });
      } else {
        setServerInfo(prev => ({ ...prev, name: 'Server Not Found' }));
        throw new Error("Server context resolution failed.");
      }

      // 2. Kéo dữ liệu song song (Parallel Fetching) để tối ưu tốc độ
      const [logsResponse, alertsResponse] = await Promise.allSettled([
        axios.get(`${backendURL}/api/logs?team_id=${teamId}&limit=${dataLimit}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendURL}/api/alerts/history?server_id=${currentServer.id}&limit=${dataLimit}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // 2.1 Process Raw Logs (ClickHouse)
      if (logsResponse.status === 'fulfilled' && logsResponse.value.data?.logs) {
        const serverSpecificLogs = logsResponse.value.data.logs.filter(log => log.target_ip === cleanIp);
        setLogs(serverSpecificLogs);
      }

      // 2.2 Process Security Alerts (PostgreSQL)
      if (alertsResponse.status === 'fulfilled' && alertsResponse.value.data) {
        setAlerts(alertsResponse.value.data);
      }

    } catch (error) {
      console.error("Forensic Data Fetch Error:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [dataLimit]); 

  // ==========================================
  // UTILITIES & DATA PROCESSING
  // ==========================================
  const exportToCSV = () => {
    const isAlertView = viewMode === 'alerts';
    const dataToExport = isAlertView ? filteredAlerts : filteredLogs;
    
    if (dataToExport.length === 0) return;

    let headers = [];
    let csvContent = "";

    if (isAlertView) {
      headers = ["Time", "Attacker IP", "Attack Vector", "Severity", "Status"];
      csvContent = [
        headers.join(","),
        ...dataToExport.map(a => `"${a.time}","${a.ip}","${a.type}","${a.level}","${a.status}"`)
      ].join("\n");
    } else {
      headers = ["Timestamp", "Target IP", "Log Protocol", "Event Action", "Context/User"];
      csvContent = [
        headers.join(","),
        ...dataToExport.map(l => `"${l.timestamp}","${l.target_ip}","${l.log_type}","${l.action}","${l.username}"`)
      ].join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `flux_${isAlertView ? 'alerts' : 'raw_logs'}_${serverInfo.ip}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized Filtering Engine cho cả 2 luồng dữ liệu
  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
        log.action.toLowerCase().includes(searchLower) || 
        log.username.toLowerCase().includes(searchLower) ||
        log.log_type.toLowerCase().includes(searchLower);
    const matchesType = filterType === 'All' || log.log_type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredAlerts = alerts.filter(alert => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
        alert.ip.toLowerCase().includes(searchLower) || 
        alert.type.toLowerCase().includes(searchLower) ||
        alert.level.toLowerCase().includes(searchLower);
    const matchesType = filterType === 'All' || alert.level === filterType;
    return matchesSearch && matchesType;
  });

  // Dynamic dropdown tùy thuộc vào View Mode
  const uniqueFilterOptions = viewMode === 'logs' 
      ? ['All', ...new Set(logs.map(l => l.log_type).filter(t => t !== 'N/A'))]
      : ['All', ...new Set(alerts.map(a => a.level))];

  // ==========================================
  // RENDER UI
  // ==========================================
  if (loading) {
      return (
          <div className="flex-1 p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-[#3ecf8e]">
                  <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-mono text-sm uppercase tracking-widest text-[#a0a0a0]">Fetching Unified Audit Data...</span>
              </div>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 flux-scrollbar overflow-x-hidden flex flex-col h-full">
      
      {/* 1. Header Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#3e3e3e] shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-[#3ecf8e]/10 rounded-lg border border-[#3ecf8e]/20 text-[#3ecf8e]">
              <Server size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{serverInfo.name} - Unified Audit Interface</h1>
              <p className="text-xs md:text-sm text-[#a0a0a0] font-mono flex items-center gap-2 mt-1">
                  <Activity size={14} className="text-[#3ecf8e]" />
                  Bound IP: {serverInfo.ip}
              </p>
            </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
              onClick={() => fetchHistoryData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-[#1c1c1c] border border-[#3e3e3e] hover:border-[#3ecf8e]/50 text-[#a0a0a0] hover:text-[#3ecf8e] px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 shadow-sm"
          >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? 'Syncing...' : 'Sync Data'}
          </button>
          <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] hover:bg-[#3ecf8e]/20 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#3ecf8e]/5"
          >
              <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. Controls & View Toggle */}
      <div className="flex flex-col gap-4 bg-[#2a2a2a] p-4 rounded-xl border border-[#3e3e3e] shrink-0 shadow-lg">
        
        {/* Toggle Switch */}
        <div className="flex bg-[#1c1c1c] p-1 rounded-lg border border-[#3e3e3e] w-fit">
          <button
            onClick={() => setViewMode('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              viewMode === 'alerts' 
                ? 'bg-[#3e3e3e] text-[#f87171] shadow-md' 
                : 'text-[#a0a0a0] hover:text-white'
            }`}
          >
            <ShieldAlert size={16} /> Security Alerts
          </button>
          <button
            onClick={() => setViewMode('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              viewMode === 'logs' 
                ? 'bg-[#3e3e3e] text-[#3ecf8e] shadow-md' 
                : 'text-[#a0a0a0] hover:text-white'
            }`}
          >
            <TerminalSquare size={16} /> Raw System Logs
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={18} />
              <input 
                  type="text"
                  placeholder={viewMode === 'alerts' ? "Search IP, Attack type, or Severity..." : "Search actions, contexts, or event types..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#3ecf8e] text-white transition-colors"
              />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 w-full md:w-48">
                  <Filter size={16} className="text-[#a0a0a0]" />
                  <select 
                      className="bg-transparent border-none text-sm text-[#ededed] focus:outline-none w-full cursor-pointer appearance-none"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                  >
                      {uniqueFilterOptions.map(type => (
                          <option key={type} value={type} className="bg-[#1c1c1c]">{type}</option>
                      ))}
                  </select>
              </div>

              <div className="flex items-center gap-2 bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 w-full md:w-48">
                  <History size={16} className="text-[#a0a0a0]" />
                  <select 
                      className="bg-transparent border-none text-sm text-[#ededed] focus:outline-none w-full cursor-pointer appearance-none"
                      value={dataLimit}
                      onChange={(e) => setDataLimit(Number(e.target.value))}
                  >
                      <option value={100} className="bg-[#1c1c1c]">Last 100 entries</option>
                      <option value={500} className="bg-[#1c1c1c]">Last 500 entries</option>
                      <option value={1000} className="bg-[#1c1c1c]">Last 1000 entries</option>
                  </select>
              </div>
          </div>
        </div>
      </div>

      {/* 3. Data Table Rendering Engine */}
      <div className="flex-1 bg-[#2a2a2a] rounded-xl border border-[#3e3e3e] shadow-xl overflow-hidden flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flux-scrollbar flex-1 bg-[#1c1c1c]">
              
              {/* ================= CONDITIONAL RENDER: ALERTS ================= */}
              {viewMode === 'alerts' && (
                filteredAlerts.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[#5a5a5a] flex-col gap-3 font-mono text-sm italic p-8 text-center">
                        <CheckCircle2 size={40} className="text-[#3e3e3e] mb-2" />
                        No historical security alerts found.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-[#2a2a2a] text-[#a0a0a0] text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-[#3e3e3e]">
                          <tr>
                              <th className="px-6 py-4 font-medium"><div className="flex items-center gap-2"><Calendar size={14}/> Time</div></th>
                              <th className="px-6 py-4 font-medium">Attacker IP</th>
                              <th className="px-6 py-4 font-medium">Attack Vector</th>
                              <th className="px-6 py-4 font-medium">Resolution Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3e3e3e]">
                          {filteredAlerts.map((alert, index) => (
                              <tr key={index} className="hover:bg-[#2a2a2a]/50 transition-colors">
                                  <td className="px-6 py-3.5 text-xs text-[#a0a0a0] font-mono flex items-center gap-2">
                                      <Clock size={12} className="opacity-50"/> {alert.time}
                                  </td>
                                  <td className="px-6 py-3.5 text-sm font-mono text-[#f87171] font-bold">
                                      {alert.ip}
                                  </td>
                                  <td className="px-6 py-3.5 text-xs text-white">
                                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                                          alert.level?.toLowerCase() === 'critical' 
                                          ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                      }`}>
                                          {alert.level?.toLowerCase() === 'critical' ? <ShieldX size={12} /> : <AlertOctagon size={12} />}
                                          {alert.type}
                                      </span>
                                  </td>
                                  <td className="px-6 py-3.5">
                                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#3e3e3e]/30 text-[#a0a0a0] border border-[#3e3e3e]/50">
                                          {alert.status}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                    </table>
                )
              )}

              {/* ================= CONDITIONAL RENDER: RAW LOGS ================= */}
              {viewMode === 'logs' && (
                filteredLogs.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[#5a5a5a] flex-col gap-3 font-mono text-sm italic p-8 text-center">
                        <FileText size={40} className="text-[#3e3e3e] mb-2" />
                        No historical raw logs found for this query.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-[#2a2a2a] text-[#a0a0a0] text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-[#3e3e3e]">
                          <tr>
                              <th className="px-6 py-4 font-medium"><div className="flex items-center gap-2"><Calendar size={14}/> Timestamp</div></th>
                              <th className="px-6 py-4 font-medium">Log Protocol</th>
                              <th className="px-6 py-4 font-medium w-full">Event Action</th>
                              <th className="px-6 py-4 font-medium">Context / User</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3e3e3e]">
                          {filteredLogs.map((log, index) => {
                              let badgeStyle = "bg-[#3e3e3e]/30 text-[#a0a0a0] border-[#3e3e3e]/50";
                              if (log.log_type.includes("auth")) badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                              if (log.log_type.includes("nginx")) badgeStyle = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                              if (log.log_type.includes("app")) badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                              return (
                                  <tr key={index} className="hover:bg-[#2a2a2a]/50 transition-colors">
                                      <td className="px-6 py-3.5 text-xs text-[#ededed] font-mono">
                                          {log.timestamp}
                                      </td>
                                      <td className="px-6 py-3.5">
                                          <span className={`inline-flex items-center px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                              {log.log_type}
                                          </span>
                                      </td>
                                      <td className="px-6 py-3.5 text-xs text-[#a0a0a0]">
                                          {log.action !== "Unknown" ? log.action : <span className="italic opacity-50">System background event</span>}
                                      </td>
                                      <td className="px-6 py-3.5 text-xs font-mono text-white">
                                          {log.username !== "-" ? log.username : <span className="text-[#5a5a5a]">-</span>}
                                      </td>
                                  </tr>
                              )
                          })}
                      </tbody>
                    </table>
                )
              )}
          </div>
          
          {/* Footer Metadata - Hybrid Architecture Indicator */}
          <div className="bg-[#2a2a2a] border-t border-[#3e3e3e] p-3 px-6 flex justify-between items-center text-xs text-[#a0a0a0] shrink-0">
              <span>Showing {viewMode === 'alerts' ? filteredAlerts.length : filteredLogs.length} matching events</span>
              <span className="font-mono flex items-center gap-2">
                Storage Engine: 
                <span className={viewMode === 'alerts' ? "text-[#3b82f6] font-bold" : "text-[#3ecf8e] font-bold"}>
                  {viewMode === 'alerts' ? 'PostgreSQL (OLTP)' : 'ClickHouse (OLAP)'}
                </span>
              </span>
          </div>
      </div>

    </div>
  );
};

export default ClientScreenHistory;