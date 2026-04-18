import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Server, 
  Terminal, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  ShieldAlert,
  KeyRound,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const backendURL = `http://${window.location.hostname}:8000`;

/**
 * Screen Component: Agent Deployment Hub
 * Orchestrates the distribution of installation scripts and deployment tokens.
 * Separates Passive Monitoring from Active Defense based on Least Privilege principles.
 */
const AgentDeployment = () => {
  const [serverInfo, setServerInfo] = useState(null);
  const [agentToken, setAgentToken] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [copiedMonitor, setCopiedMonitor] = useState(false);
  const [copiedDefender, setCopiedDefender] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetServerId = urlParams.get('server_id');
    const teamId = urlParams.get('team_id') || localStorage.getItem('current_team_id');
    const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');

    if (!targetServerId || !teamId) {
      setLoading(false);
      return;
    }

    const fetchServerDetails = async () => {
      try {
        const response = await axios.get(`${backendURL}/api/servers/my-servers?team_id=${teamId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const currentServer = response.data.servers.find(s => s.id === targetServerId);
        
        if (currentServer) {
          setServerInfo({
            id: currentServer.id,
            name: currentServer.name,
            ip: currentServer.ip_address,
            status: currentServer.status,
            monitor_status: currentServer.monitor_status,
            defender_status: currentServer.defender_status
          });
        }
      } catch (error) {
        console.error("Context Error: Failed to fetch deployment context.", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServerDetails();
  }, []);

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
                // Background polling error ignored to prevent UI disruption
            }
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [serverInfo]);

  const generateDeploymentKey = async () => {
    if (!window.confirm("WARNING: Generating a new key will permanently revoke the existing key. Current agents will lose connection. Proceed?")) return;
    
    setIsGenerating(true);
    try {
        const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
        const response = await axios.post(`${backendURL}/api/servers/${serverInfo.id}/generate-token`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        setAgentToken(response.data.agent_token);
        setServerInfo(prev => ({
            ...prev, 
            status: 'pending',
            monitor_status: 'pending',
            defender_status: 'pending'
        }));
    } catch (error) {
        console.error("Token Generation Error: Failed to allocate new security key.", error);
        alert("An error occurred while generating the security key.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = async (text, type) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (error) {
            console.error('Fallback Clipboard Error: document.execCommand failed.', error);
        } finally {
            textArea.remove();
        }
      }

      if (type === 'monitor') {
        setCopiedMonitor(true);
        setTimeout(() => setCopiedMonitor(false), 2000);
      } else if (type === 'defender') {
        setCopiedDefender(true);
        setTimeout(() => setCopiedDefender(false), 2000);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
    } catch (err) {
      alert("Clipboard access denied. Please select and copy the text manually.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[#a0a0a0] flex-col gap-3 p-8">
        <div className="w-8 h-8 border-4 border-[#3ecf8e] border-t-transparent rounded-full animate-spin"></div>
        <span className="font-mono text-sm uppercase tracking-widest">Resolving Deployment Context...</span>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="p-8 text-white font-mono flex flex-col items-center justify-center h-full">
        <Server size={48} className="text-[#5a5a5a] mb-4" />
        <p>Deployment context lost. Please select a server from the Organization Dashboard.</p>
      </div>
    );
  }

  const monitorCommand = `curl -sSL ${backendURL}/api/agent/install/monitor | sudo bash -s -- ${agentToken}`;
  const defenderCommand = `curl -sSL ${backendURL}/api/agent/install/defender | sudo bash -s -- ${agentToken}`;

  return (
    <div className="p-4 md:p-8 space-y-8 flux-scrollbar max-w-6xl mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3e3e3e]">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-[#3ecf8e]/10 rounded-xl border border-[#3ecf8e]/20 text-[#3ecf8e]">
              <Terminal size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Agent Integration Hub</h1>
              <p className="text-sm text-[#a0a0a0] font-mono mt-1">Deploy security modules to: <span className="text-[#3ecf8e]">{serverInfo.name} ({serverInfo.ip})</span></p>
            </div>
        </div>
      </div>

      <div className="bg-[#1c1c1c] border border-[#3e3e3e] rounded-xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
            <KeyRound className="text-[#3ecf8e] shrink-0 mt-1" size={24} />
            <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-2">Secret Deployment Key</h3>
                <p className="text-sm text-[#a0a0a0] leading-relaxed mb-4">
                    For your security, we never store your secret deployment keys in plain text. 
                    <strong> This key will only be displayed ONCE.</strong> If you lose it, you must generate a new one, which will automatically revoke the old key.
                </p>

                {!agentToken ? (
                    <button 
                        onClick={generateDeploymentKey}
                        disabled={isGenerating}
                        className="bg-[#3ecf8e] hover:bg-[#34b27a] text-black font-bold py-2.5 px-6 rounded-lg text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <KeyRound size={18} />}
                        {isGenerating ? 'Generating Key...' : 'Generate New Secret Key'}
                    </button>
                ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg flex flex-col gap-3 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
                            <AlertTriangle size={16} /> 
                            Please copy the scripts below immediately. This key will not be shown again once you navigate away!
                        </div>
                        <div className="relative group">
                            <input 
                                type="text" 
                                readOnly 
                                value={agentToken}
                                className="w-full bg-[#111111] border border-[#3e3e3e] text-yellow-500 font-mono text-sm rounded-md py-2 px-3 pr-10 focus:outline-none"
                            />
                            <button 
                                onClick={() => handleCopy(agentToken, 'token')}
                                className="absolute top-1/2 -translate-y-1/2 right-2 text-[#a0a0a0] hover:text-white transition-colors"
                            >
                                {copiedToken ? <CheckCircle2 size={16} className="text-yellow-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-500 ${!agentToken ? 'opacity-30 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
        
        <div className="bg-[#1c1c1c] border border-[#3e3e3e] rounded-xl overflow-hidden shadow-lg flex flex-col">
          <div className="p-6 border-b border-[#3e3e3e] bg-[#2a2a2a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="text-[#3ecf8e]" size={24} />
              <div>
                <h2 className="font-bold text-white">1. Flux Monitor (Required)</h2>
                <p className="text-xs text-[#a0a0a0]">Read-only log ingestion pipeline.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              Phase 1
            </span>
          </div>
          
          <div className="p-6 flex-1 space-y-4">
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              This module strictly requires <strong>READ-ONLY</strong> access to your system logs (<code className="text-[#ededed]">auth.log</code>, <code className="text-[#ededed]">nginx.log</code>) to securely stream data to the SOC Engine. It cannot modify your server state.
            </p>
            
            <div>
              <p className="text-xs font-bold text-[#5a5a5a] uppercase mb-2">Run this command via SSH (Root required):</p>
              <div className="relative group">
                <pre className="bg-[#111111] p-4 rounded-lg border border-[#3e3e3e] text-xs font-mono text-[#3ecf8e] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {monitorCommand}
                </pre>
                <button 
                  onClick={() => handleCopy(monitorCommand, 'monitor')}
                  className="absolute top-2 right-2 p-2 bg-[#2a2a2a] border border-[#3e3e3e] rounded-md text-[#a0a0a0] hover:text-white transition-colors"
                >
                  {copiedMonitor ? <CheckCircle2 size={16} className="text-[#3ecf8e]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1c1c1c] border border-[#3e3e3e] rounded-xl overflow-hidden shadow-lg flex flex-col">
          <div className="p-6 border-b border-[#3e3e3e] bg-[#2a2a2a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-[#f87171]" size={24} />
              <div>
                <h2 className="font-bold text-white">2. Active Defender (Optional)</h2>
                <p className="text-xs text-[#a0a0a0]">Intrusion Prevention System (IPS).</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
              Phase 2
            </span>
          </div>
          
          <div className="p-6 flex-1 space-y-4">
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              Authorizes Flux to execute IP blocking commands via <code className="text-[#ededed]">iptables</code>. 
              <strong> Install this module to unlock the active Auto-Ban and Manual Ban response capabilities.</strong>
            </p>
            
            <div>
              <p className="text-xs font-bold text-[#5a5a5a] uppercase mb-2">Run this AFTER installing the Monitor:</p>
              <div className="relative group">
                <pre className="bg-[#111111] p-4 rounded-lg border border-[#3e3e3e] text-xs font-mono text-[#f87171] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {defenderCommand}
                </pre>
                <button 
                  onClick={() => handleCopy(defenderCommand, 'defender')}
                  className="absolute top-2 right-2 p-2 bg-[#2a2a2a] border border-[#3e3e3e] rounded-md text-[#a0a0a0] hover:text-white transition-colors"
                >
                  {copiedDefender ? <CheckCircle2 size={16} className="text-[#3ecf8e]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-[#2a2a2a] border border-[#3e3e3e] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className={serverInfo.monitor_status === 'active' ? "text-[#3ecf8e]" : "text-[#a0a0a0]"} size={24} />
          <div>
            <h3 className="font-bold text-sm text-white">Module Integration Status</h3>
            <p className="text-xs text-[#a0a0a0]">
                Real-time tracking of deployed security modules.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${serverInfo.monitor_status === 'active' ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30' : 'bg-[#1c1c1c] text-[#a0a0a0] border-[#3e3e3e]'}`}>
                <span className={`w-2 h-2 rounded-full ${serverInfo.monitor_status === 'active' ? 'bg-[#3ecf8e]' : 'bg-yellow-500 animate-pulse'}`}></span>
                Monitor: {serverInfo.monitor_status === 'active' ? 'Active' : 'Pending'}
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${serverInfo.defender_status === 'active' ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30' : 'bg-[#1c1c1c] text-[#a0a0a0] border-[#3e3e3e]'}`}>
                <span className={`w-2 h-2 rounded-full ${serverInfo.defender_status === 'active' ? 'bg-[#3ecf8e]' : 'bg-yellow-500 animate-pulse'}`}></span>
                Defender: {serverInfo.defender_status === 'active' ? 'Active' : 'Pending'}
            </div>
        </div>
      </div>

    </div>
  );
};

export default AgentDeployment;