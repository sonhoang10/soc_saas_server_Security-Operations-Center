import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  X, 
  Globe, 
  ShieldCheck, 
  Activity, 
  TerminalSquare, 
  Cloud 
} from 'lucide-react';
import axios from 'axios';

/**
 * ScreenOrganization Component
 * Enterprise Architecture: 
 * - Network inputs are segregated into specific semantic fields (Domain, Public IP, Internal IP) 
 * to ensure accurate asset tracking and correlation within the Logic Engine.
 * - Dynamic list is preserved for secondary/failover IPs.
 */
const ScreenOrganization = () => {
  const [servers, setServers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [serverName, setServerName] = useState('');
  const [cloudProvider, setCloudProvider] = useState('AWS');
  
  // Refactored Network States
  const [domain, setDomain] = useState('');
  const [mainPublicIp, setMainPublicIp] = useState('');
  const [mainInternalIp, setMainInternalIp] = useState('');
  const [additionalIpInput, setAdditionalIpInput] = useState('');
  const [additionalIps, setAdditionalIps] = useState([]);

  const [logSources, setLogSources] = useState({
    web_app_login: true,
    os_ssh_auth: true,
    nginx_access: false,
    syslog: false,
    windows_event: false
  });

  const backendURL = `http://${window.location.hostname}:8000`;

  useEffect(() => {
    const fetchServers = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTeamId = urlParams.get('team_id');
      if (urlTeamId) {
        localStorage.setItem('current_team_id', urlTeamId);
      }
      
      const teamId = urlTeamId || localStorage.getItem('current_team_id');
      if (!teamId) {
        alert("Authorization Error: Organization ID missing. Please authenticate again.");
        setPageLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
        const response = await axios.get(`${backendURL}/api/servers/my-servers?team_id=${teamId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const dbServers = response.data.servers.map(s => ({
          id: s.id,
          name: s.name,
          provider: 'Registered Agent',
          networks: [s.ip_address], 
          logs: ['web_app_login', 'os_ssh_auth'],
          status: s.status === 'offline' ? 'provisioning' : 'active'
        }));
        
        setServers(dbServers);
      } catch (error) {
        console.error("Infrastructure synchronization failed:", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchServers();
  }, []);

  const handleAddAdditionalIp = (e) => {
    e.preventDefault();
    const trimmedIp = additionalIpInput.trim();
    if (trimmedIp && !additionalIps.includes(trimmedIp)) {
      setAdditionalIps([...additionalIps, trimmedIp]);
      setAdditionalIpInput('');
    }
  };

  const handleRemoveAdditionalIp = (targetIndex) => {
    setAdditionalIps(additionalIps.filter((_, index) => index !== targetIndex));
  };

  const handleToggleLogSource = (sourceKey) => {
    setLogSources(prev => ({
      ...prev,
      [sourceKey]: !prev[sourceKey]
    }));
  };

  const handleSubmitServer = async (e) => {
    e.preventDefault();
    setLoading(true);

    const teamId = localStorage.getItem('current_team_id');
    const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
    
    // Select the primary identifier for backend correlation
    // Prioritize Main Public IP, fallback to Domain, then Internal IP
    const primaryIpAddress = mainPublicIp || domain || mainInternalIp;

    if (!primaryIpAddress) {
      alert("Validation Error: At least one primary identifier (Public IP or Domain) is required.");
      setLoading(false);
      return;
    }

    const payload = {
      team_id: teamId,
      name: serverName,
      ip_address: primaryIpAddress 
    };

    try {
      await axios.post(`${backendURL}/api/servers/create`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Server provisioned successfully.");
      window.location.reload(); 
    } catch (error) {
      alert("System Error: " + (error.response?.data?.detail || "Failed to allocate server resources."));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setServerName('');
    setCloudProvider('AWS');
    setDomain('');
    setMainPublicIp('');
    setMainInternalIp('');
    setAdditionalIpInput('');
    setAdditionalIps([]);
    setLogSources({
      web_app_login: true,
      os_ssh_auth: true,
      nginx_access: false,
      syslog: false,
      windows_event: false
    });
  };

  const handleNavigateToDashboard = (serverId) => {
    const teamId = localStorage.getItem('current_team_id');
    window.location.href = `/dashboard.html?team_id=${teamId}&server_id=${serverId}`;
  };

  if (pageLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-[#a0a0a0] font-mono text-sm gap-3">
        <div className="w-6 h-6 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin"></div>
        Resolving Organization Infrastructure...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#3e3e3e]">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Globe className="text-[#3ecf8e] w-8 h-8" />
            Organization Infrastructure
          </h1>
          <p className="text-[#a0a0a0] mt-2">Manage your monitored servers and log ingestion pipelines.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-[#3ecf8e] hover:bg-[#34b27a] text-black font-bold py-2.5 px-6 rounded-lg text-sm transition-all shadow-[0_0_15px_rgba(62,207,142,0.2)] flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Deploy New Server
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.length === 0 && (
            <div className="col-span-full text-center py-10 border border-[#3e3e3e] border-dashed rounded-xl bg-[#1c1c1c]/50 text-[#a0a0a0]">
                No monitored assets found. Click "Deploy New Server" to initialize.
            </div>
        )}
        {servers.map((server) => (
          <div 
            key={server.id} 
            onClick={() => handleNavigateToDashboard(server.id)}
            className="bg-[#111111] border border-[#3e3e3e] hover:border-[#3ecf8e] rounded-xl p-6 cursor-pointer group transition-all relative overflow-hidden shadow-lg"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#3ecf8e]/5 rounded-bl-full -z-0 transition-transform group-hover:scale-150"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-[#1c1c1c] rounded-lg border border-[#3e3e3e]">
                <Server className="text-[#3ecf8e] w-6 h-6" />
              </div>
              <span className={`text-[10px] px-2 py-1 rounded border uppercase font-bold tracking-wider ${
                server.status === 'active' 
                  ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/20' 
                  : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
              }`}>
                {server.status}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1 truncate">{server.name}</h3>
            <p className="text-xs text-[#a0a0a0] flex items-center gap-1 mb-4 font-mono">
              <Cloud className="w-3 h-3" /> {server.provider}
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#a0a0a0]">
                <Activity className="w-4 h-4 text-[#3ecf8e]" />
                <span className="font-mono text-white">{server.networks.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#a0a0a0]">
                <TerminalSquare className="w-4 h-4 text-[#3ecf8e]" />
                <span>{server.logs.length} Log Sources</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#3e3e3e] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#111111]/95 backdrop-blur border-b border-[#3e3e3e] p-6 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Server className="text-[#3ecf8e] w-5 h-5" />
                  Register Server Entity
                </h2>
                <p className="text-xs text-[#a0a0a0] mt-1">Configure asset details for Logic Engine ingestion.</p>
              </div>
              <button 
                onClick={() => { setIsCreating(false); resetForm(); }}
                className="text-[#a0a0a0] hover:text-white transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitServer} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-[#a0a0a0] mb-2 uppercase tracking-wider font-bold">Server Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="e.g. Auth-Server-01" 
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-4 py-2.5 text-sm focus:border-[#3ecf8e] outline-none text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#a0a0a0] mb-2 uppercase tracking-wider font-bold">Cloud Provider</label>
                  <select 
                    value={cloudProvider}
                    onChange={(e) => setCloudProvider(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-4 py-2.5 text-sm focus:border-[#3ecf8e] outline-none text-white transition-colors appearance-none cursor-pointer"
                  >
                    <option value="AWS">Amazon Web Services (AWS)</option>
                    <option value="GCP">Google Cloud Platform (GCP)</option>
                    <option value="Azure">Microsoft Azure</option>
                    <option value="DigitalOcean">DigitalOcean</option>
                    <option value="On-Premise">On-Premise / Datacenter</option>
                  </select>
                </div>
              </div>

              {/* Refactored Network Endpoints Section */}
              <div className="pt-4 border-t border-[#3e3e3e]/50">
                <label className="block text-xs text-[#a0a0a0] mb-4 uppercase tracking-wider font-bold">
                  Network Endpoints Identifiers
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  <div>
                    <label className="block text-xs text-[#5a5a5a] mb-1 font-mono">Main Public IP <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={mainPublicIp}
                      onChange={(e) => setMainPublicIp(e.target.value)}
                      placeholder="e.g. 139.59.242.70" 
                      className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] outline-none text-white transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5a5a5a] mb-1 font-mono">Domain (FQDN)</label>
                    <input 
                      type="text" 
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="e.g. api.acme.com" 
                      className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] outline-none text-white transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5a5a5a] mb-1 font-mono">Main Internal IP</label>
                    <input 
                      type="text" 
                      value={mainInternalIp}
                      onChange={(e) => setMainInternalIp(e.target.value)}
                      placeholder="e.g. 10.104.0.2" 
                      className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] outline-none text-white transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Additional IPs Dynamic List */}
                <div className="bg-[#1c1c1c]/50 p-4 rounded-lg border border-[#3e3e3e]/50">
                  <label className="block text-xs text-[#5a5a5a] mb-2 font-mono">Additional Public/Internal IPs</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      value={additionalIpInput}
                      onChange={(e) => setAdditionalIpInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAdditionalIp(e)}
                      placeholder="Add secondary IPs..." 
                      className="flex-1 bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] outline-none text-white transition-colors font-mono"
                    />
                    <button 
                      type="button"
                      onClick={handleAddAdditionalIp}
                      className="bg-[#1c1c1c] border border-[#3e3e3e] hover:border-[#3ecf8e] text-[#3ecf8e] px-4 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {additionalIps.map((net, index) => (
                      <div key={index} className="flex items-center gap-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] px-3 py-1 rounded-md text-xs font-mono">
                        <span>{net}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAdditionalIp(index)}
                          className="hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {additionalIps.length === 0 && (
                      <span className="text-xs text-[#5a5a5a] italic">No additional IPs configured.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#3e3e3e]/50">
                <label className="block text-xs text-[#a0a0a0] mb-4 uppercase tracking-wider font-bold">
                  Target Log Sources
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'web_app_login', label: 'Web App Auth Logs', desc: 'Login attempts, SQLi detection' },
                    { key: 'os_ssh_auth', label: 'OS SSH Auth', desc: 'Brute-force, Unauthorized access' },
                    { key: 'nginx_access', label: 'Nginx Access Logs', desc: 'Traffic analysis, Web attacks' },
                    { key: 'syslog', label: 'System Logs', desc: 'Kernel events, Service failures' },
                    { key: 'windows_event', label: 'Windows Event Logs', desc: 'Active Directory, RDP tracking' }
                  ].map((source) => (
                    <label 
                      key={source.key} 
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                        logSources[source.key] 
                          ? 'bg-[#3ecf8e]/5 border-[#3ecf8e] text-white' 
                          : 'bg-[#1c1c1c] border-[#3e3e3e] text-[#a0a0a0] hover:border-[#5a5a5a]'
                      }`}
                    >
                      <div className="mt-0.5">
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={logSources[source.key]}
                          onChange={() => handleToggleLogSource(source.key)}
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          logSources[source.key] ? 'bg-[#3ecf8e] border-[#3ecf8e]' : 'border-[#5a5a5a]'
                        }`}>
                          {logSources[source.key] && <ShieldCheck className="w-3 h-3 text-black" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{source.label}</p>
                        <p className="text-xs opacity-70 mt-1 leading-relaxed">{source.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[#3e3e3e]/50">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#3ecf8e] hover:bg-[#34b27a] disabled:bg-[#1c1c1c] disabled:text-[#5a5a5a] disabled:border-[#3e3e3e] disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Server className="w-5 h-5" />
                      Provision Server & Setup Pipeline
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenOrganization;