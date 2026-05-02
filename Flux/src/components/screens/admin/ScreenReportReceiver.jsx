import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Inbox, CheckCircle, XCircle, AlertCircle, 
  Search, Filter, MoreVertical, Building2, Globe, FileJson, 
  Cloud, ChevronDown, Clock, Mail, Phone, User, Briefcase, 
  Users, MapPin, Target, Hash, AlignLeft
} from 'lucide-react';

// Rationale: Utilizing relative path fallback for security (Nginx proxy setup)
const backendURL = import.meta.env.VITE_BACKEND_URL || ''; 

const ScreenReportReceiver = () => {
  // ==========================================
  // 1. GLOBAL STATE
  // ==========================================
  const [viewMode, setViewMode] = useState('approvals');
  
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [loadingReqs, setLoadingReqs] = useState(false);

  const [incidents, setIncidents] = useState([
    {
      id: 'INC-001',
      title: 'Brute Force Attack on Port 22 Detected',
      sender: 'GlobalTech Corp',
      senderRole: 'IT Manager',
      email: 'flux-soc@support.com',
      date: '2026-04-10',
      unread: true,
      content: `Hệ thống bên tao vừa ghi nhận hơn 500 yêu cầu đăng nhập thất bại chỉ trong vòng 2 phút nhắm vào SSH của Database Server. Mày kiểm tra giúp xem có cần phải thực hiện IP Hard-Block cho dải IP này không?`,
      logs: `[AUTH_FAILURE] user=admin ip=103.21.14.92 timestamp=2026-04-10T09:44:01\n[AUTH_FAILURE] user=root ip=103.21.14.92 timestamp=2026-04-10T09:44:05`
    },
    {
      id: 'INC-002',
      title: 'Suspicious outbound traffic to RU',
      sender: 'Acme Corp',
      senderRole: 'DevOps',
      email: 'alerts@acme.com',
      date: '2026-04-09',
      unread: false,
      content: 'We noticed a sudden spike in outbound traffic to an unknown IP address in Russia. Please investigate.',
      logs: null
    }
  ]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    setSelectedReq(null);
    setSelectedIncident(null);
  }, [viewMode]);

  // ==========================================
  // 2. API CALLS & LOGIC
  // ==========================================
  const fetchPendingRequests = async () => {
    setLoadingReqs(true);
    try {
      const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
      const response = await axios.get(`${backendURL}/api/admin/teams/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data.teams || []); 
    } catch (error) {
      console.error("Fetch pending requests failed:", error);
    } finally {
      setLoadingReqs(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'approvals') {
      fetchPendingRequests();
    }
  }, [viewMode]);

  const handleReview = async (teamId, action) => {
    const confirmMsg = action === 'approve' 
      ? 'Duyệt cấp phát tài nguyên cho tổ chức này?' 
      : 'Từ chối yêu cầu của tổ chức này?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
      await axios.post(`${backendURL}/api/admin/teams/${teamId}/action`, 
        { action: action },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSelectedReq(null);
      fetchPendingRequests();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || "Action failed."));
    }
  };

  // ==========================================
  // 3. RENDER FUNCTIONS
  // ==========================================

  // --- 3A. RENDER LEFT COLUMN (LIST) ---
  const renderList = () => {
    if (viewMode === 'approvals') {
      if (loadingReqs) return <div className="p-6 text-center text-[#555] text-sm font-mono">Loading requests...</div>;
      if (requests.length === 0) return (
        <div className="p-6 text-center flex flex-col items-center justify-center h-full opacity-50">
          <CheckCircle size={40} className="text-[#3ecf8e] mb-4" />
          <p className="text-sm">No pending workspace approvals.</p>
        </div>
      );
      return requests.map((req) => (
        <div 
          key={req.id} onClick={() => setSelectedReq(req)}
          className={`p-4 border-b border-[#1e1e1e] cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-[#1a1a1a] border-l-4 border-l-[#3ecf8e]' : 'hover:bg-[#111] border-l-4 border-l-transparent'}`}
        >
          <div className="flex justify-between items-start mb-1">
            <h3 className={`font-bold ${selectedReq?.id === req.id ? 'text-[#3ecf8e]' : 'text-white'}`}>{req.name}</h3>
            <span className="text-[10px] text-[#555] font-mono">{new Date(req.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-xs text-[#a0a0a0] mb-2">{req.company_email}</p>
          <div className="flex gap-2">
            <span className="bg-yellow-500/10 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Pending</span>
            <span className="bg-[#2a2a2a] text-[#a0a0a0] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{req.industry || 'Unknown'}</span>
          </div>
        </div>
      ));
    }

    // Incidents Flow
    return incidents.map((inc) => (
      <div 
        key={inc.id} onClick={() => setSelectedIncident(inc)}
        className={`p-4 border-b border-[#1e1e1e] cursor-pointer transition-colors ${selectedIncident?.id === inc.id ? 'bg-[#1a1a1a] border-l-4 border-l-[#f87171]' : 'hover:bg-[#111] border-l-4 border-l-transparent'}`}
      >
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-bold truncate pr-2 ${selectedIncident?.id === inc.id ? 'text-[#f87171]' : (inc.unread ? 'text-white' : 'text-[#a0a0a0]')}`}>
            {inc.title}
          </h3>
          <span className="text-[10px] text-[#555] font-mono shrink-0">{inc.date}</span>
        </div>
        <p className="text-xs text-[#a0a0a0] mb-2">{inc.sender}</p>
        <div className="flex gap-2">
          {inc.unread && <span className="bg-[#f87171]/10 text-[#f87171] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Unread</span>}
          <span className="bg-red-900/30 text-red-400 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">High Severity</span>
        </div>
      </div>
    ));
  };

  // --- 3B. RENDER RIGHT COLUMN (DETAILS) ---
  const renderDetails = () => {
    if ((viewMode === 'approvals' && !selectedReq) || (viewMode === 'incidents' && !selectedIncident)) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-[#555]">
          <Inbox size={60} className="mb-4 opacity-20" />
          <p className="font-mono text-sm">Select an item from the left panel to review details.</p>
        </div>
      );
    }

    if (viewMode === 'approvals' && selectedReq) {
      return (
        <>
          {/* Action Header */}
          <div className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-6 bg-[#0d0d0d]/50 shrink-0">
            <div className="flex gap-4">
              <button onClick={() => handleReview(selectedReq.id, 'approve')} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-xs font-bold text-[#3ecf8e] hover:bg-[#3ecf8e] hover:text-black transition-all">
                <CheckCircle size={14} /> Approve Workspace
              </button>
              <button onClick={() => handleReview(selectedReq.id, 'reject')} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all">
                <XCircle size={14} /> Reject Request
              </button>
            </div>
            <span className="text-xs font-mono text-[#555]">Req ID: {selectedReq.id?.substring(0,8)}...</span>
          </div>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12 flux-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Header Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                  <Clock size={16} /> Pending Review
                </div>
                <h1 className="text-4xl font-extrabold text-white leading-tight">{selectedReq.name}</h1>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-[#1a1a1a] border border-[#3e3e3e] rounded font-mono text-xs text-[#a0a0a0]">
                    ID: {selectedReq.unique_name}
                  </span>
                  <span className="text-xs text-[#555]">
                    Submitted {new Date(selectedReq.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Rationale: Grouping related information minimizes cognitive load for SOC Admins */}
              
              {/* Card 1: Contact Information */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1e1e1e] bg-[#161616]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <User size={16} className="text-[#3ecf8e]" /> Contact Information
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Mail size={12}/> Company Email</p>
                    <p className="text-sm font-medium text-[#ededed]">{selectedReq.company_email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Phone size={12}/> Company Phone</p>
                    <p className="text-sm font-medium text-[#ededed]">{selectedReq.company_phone || 'Not Provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><User size={12}/> Account Owner (Requester)</p>
                    <p className="text-sm font-medium text-yellow-500">{selectedReq.owner_email}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Business Profile */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1e1e1e] bg-[#161616]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 size={16} className="text-[#3ecf8e]" /> Business Profile
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12}/> Industry</p>
                    <p className="text-sm font-medium text-[#ededed]">{selectedReq.industry}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Users size={12}/> Company Size</p>
                    <p className="text-sm font-medium text-[#ededed]">{selectedReq.company_size || 'Not Provided'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Hash size={12}/> Tax ID / Registration</p>
                    <p className="text-sm font-medium font-mono text-[#a0a0a0]">{selectedReq.tax_id || 'N/A'}</p>
                  </div>
                  <div className="lg:col-span-3">
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> Timezone & Region</p>
                    <p className="text-sm font-medium text-[#ededed]">{selectedReq.timezone_region || 'UTC'}</p>
                  </div>
                </div>
              </div>

              {/* Card 3: Project Scope & Use Case */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1e1e1e] bg-[#161616]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Target size={16} className="text-[#3ecf8e]" /> Infrastructure & Scope
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Target size={12}/> Primary Use Case</p>
                    <p className="text-sm font-medium text-[#ededed]">{selectedReq.use_case || 'General Security Monitoring'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><AlignLeft size={12}/> Additional Description</p>
                    <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 mt-2">
                      <p className="text-sm text-[#a0a0a0] whitespace-pre-wrap leading-relaxed">
                        {selectedReq.description || 'No additional notes provided by the client.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      );
    }

    if (viewMode === 'incidents' && selectedIncident) {
      return (
        <>
          <div className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-6 bg-[#0d0d0d]/50 shrink-0">
            <div className="flex gap-4">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#3e3e3e] text-xs font-medium hover:bg-[#2a2a2a] transition-all"><CheckCircle size={14} className="text-[#3ecf8e]" /> Resolve</button>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#3e3e3e] text-xs font-medium hover:bg-[#2a2a2a] transition-all text-[#f87171]"><AlertCircle size={14} /> Escalated</button>
            </div>
            <button className="p-2 hover:bg-[#2a2a2a] rounded-lg text-[#555]"><MoreVertical size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 flux-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              
              <div className="space-y-4">
                <h1 className="text-3xl font-extrabold text-white leading-tight">{selectedIncident.title}</h1>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f87171] text-black font-bold flex items-center justify-center text-xs">
                    {selectedIncident.sender.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedIncident.sender} ({selectedIncident.senderRole})</p>
                    <p className="text-[11px] text-[#555]">To: Flux Security Team • {selectedIncident.email}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-[#a0a0a0] leading-relaxed">
                <p>{selectedIncident.content}</p>
                {selectedIncident.logs && (
                  <div className="my-6 p-4 bg-[#111] rounded-xl border border-[#1e1e1e] font-mono text-[12px] text-[#f87171] whitespace-pre-wrap">
                    {selectedIncident.logs}
                  </div>
                )}
              </div>

              <div className="mt-12 p-1 bg-[#161616] border border-[#2a2a2a] rounded-2xl focus-within:border-[#3ecf8e] transition-all">
                <textarea 
                  className="w-full bg-transparent border-none p-4 text-sm min-h-[150px] resize-none focus-within:outline-none text-[#ededed] placeholder:text-[#555] caret-[#3ecf8e]"
                  placeholder="Click here to Reply to client..."
                ></textarea>
                <div className="flex justify-end p-2">
                  <button className="px-6 py-2 bg-[#3ecf8e] text-black font-bold rounded-xl text-xs hover:brightness-110">Send Response</button>
                </div>
              </div>

            </div>
          </div>
        </>
      );
    }
  };

  // ==========================================
  // 4. MAIN RETURN
  // ==========================================
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a] text-[#ededed] border border-[#3e3e3e] rounded-xl">
      
      {/* --- LEFT COLUMN --- */}
      <aside className="w-[400px] border-r border-[#1e1e1e] flex flex-col shrink-0 bg-[#0d0d0d]">
        <div className="p-4 border-b border-[#1e1e1e] space-y-4">
          <div className="relative">
            <select 
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-4 py-3 text-lg font-bold text-white appearance-none cursor-pointer focus:outline-none focus:border-[#3ecf8e]"
            >
              <option value="approvals">Workspace Approvals</option>
              <option value="incidents">Client Incidents</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={20} pointerEvents="none" />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={14} />
              <input type="text" placeholder="Search..." className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#3ecf8e]" />
            </div>
            <button className="p-2 border border-[#2a2a2a] bg-[#161616] hover:bg-[#2a2a2a] rounded-lg text-[#a0a0a0]"><Filter size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flux-scrollbar">
          {renderList()}
        </div>
      </aside>

      {/* --- RIGHT COLUMN --- */}
      <main className="flex-1 flex flex-col bg-[#0a0a0a]">
        {renderDetails()}
      </main>

    </div>
  );
};

export default ScreenReportReceiver;
