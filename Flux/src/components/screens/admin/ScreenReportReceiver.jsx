import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Inbox, CheckCircle, XCircle, AlertCircle, 
  Search, Filter, MoreVertical, Building2, Globe, FileJson, Cloud, ChevronDown, Clock
} from 'lucide-react';

const backendURL = `http://${window.location.hostname}:8000`; 

const ScreenReportReceiver = () => {
  // ==========================================
  // 1. GLOBAL STATE
  // ==========================================
  const [viewMode, setViewMode] = useState('approvals'); // 'approvals' hoặc 'incidents'
  
  // State cho Approvals (Pending Workspace)
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [loadingReqs, setLoadingReqs] = useState(false);

  // State cho Incidents (Mock data để demo form của bạn)
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

  // Reset selected item khi đổi tab
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
      setRequests(response.data.pending_requests || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách pending:", error);
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
      ? 'Bạn có chắc chắn muốn PHÊ DUYỆT hệ thống này không?' 
      : 'Bạn có chắc chắn muốn TỪ CHỐI yêu cầu này không?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
      await axios.post(`${backendURL}/api/admin/teams/${teamId}/review`, 
        { action: action },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert(`Đã ${action} thành công!`);
      setSelectedReq(null);
      fetchPendingRequests();
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.detail || "Không thể thực hiện hành động."));
    }
  };

  // ==========================================
  // 3. RENDER FUNCTIONS (Tách logic giao diện)
  // ==========================================

  // --- 3A. RENDER CỘT TRÁI (LIST) ---
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
            <span className="bg-yellow-500/10 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">New Workspace</span>
            <span className="bg-[#2a2a2a] text-[#a0a0a0] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{req.cloud_provider || 'Unknown Cloud'}</span>
          </div>
        </div>
      ));
    }

    // Luồng Incidents
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

  // --- 3B. RENDER CỘT PHẢI (DETAILS) ---
  const renderDetails = () => {
    // TRƯỜNG HỢP 1: CHƯA CHỌN GÌ
    if ((viewMode === 'approvals' && !selectedReq) || (viewMode === 'incidents' && !selectedIncident)) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-[#555]">
          <Inbox size={60} className="mb-4 opacity-20" />
          <p className="font-mono text-sm">Select an item from the left panel to review details.</p>
        </div>
      );
    }

    // TRƯỜNG HỢP 2: ĐANG XEM APPROVALS
    if (viewMode === 'approvals' && selectedReq) {
      return (
        <>
          <div className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-6 bg-[#0d0d0d]/50 shrink-0">
            <div className="flex gap-4">
              <button onClick={() => handleReview(selectedReq.id, 'approve')} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-xs font-bold text-[#3ecf8e] hover:bg-[#3ecf8e] hover:text-black transition-all">
                <CheckCircle size={14} /> Approve Workspace
              </button>
              <button onClick={() => handleReview(selectedReq.id, 'reject')} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all">
                <XCircle size={14} /> Reject Request
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 flux-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#3ecf8e] text-xs font-bold uppercase tracking-widest mb-2">
                  <Building2 size={16} /> New Organization Setup
                </div>
                <h1 className="text-3xl font-extrabold text-white leading-tight">{selectedReq.name}</h1>
                <p className="text-sm text-[#a0a0a0] font-mono">Unique ID: {selectedReq.unique_name}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#111] p-6 rounded-xl border border-[#1e1e1e]">
                <div><p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1">Contact Email</p><p className="text-sm font-medium">{selectedReq.company_email}</p></div>
                <div><p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1">Contact Phone</p><p className="text-sm font-medium">{selectedReq.company_phone}</p></div>
                <div><p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1">Cloud</p><p className="text-sm font-medium flex items-center gap-2"><Cloud size={14} className="text-[#3ecf8e]"/> {selectedReq.cloud_provider || 'Not specified'}</p></div>
                <div><p className="text-[10px] text-[#555] uppercase font-bold tracking-wider mb-1">Compliance Goal</p><p className="text-sm font-medium">{selectedReq.compliance_goal || 'General Security'}</p></div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-[#1e1e1e] pb-2"><Globe size={18} className="text-[#3ecf8e]" /> Monitored Assets</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedReq.assets?.length > 0 ? selectedReq.assets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm">
                        <span className="text-[#a0a0a0] text-[10px] uppercase bg-black px-1.5 py-0.5 rounded font-bold">{asset.asset_type}</span>
                        <span className="font-mono text-[#ededed]">{asset.asset_value}</span>
                    </div>
                  )) : <p className="text-sm text-[#555] italic">Chưa khai báo tài sản.</p>}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-[#1e1e1e] pb-2"><FileJson size={18} className="text-[#3ecf8e]" /> Requested Log Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedReq.log_sources?.length > 0 ? selectedReq.log_sources.map(log => (
                    <div key={log.id} className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] rounded-lg px-3 py-1.5 text-sm">{log.source_name}</div>
                  )) : <p className="text-sm text-[#555] italic">Chưa yêu cầu Log Source.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // TRƯỜNG HỢP 3: ĐANG XEM INCIDENTS
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
      
      {/* --- CỘT TRÁI --- */}
      <aside className="w-[400px] border-r border-[#1e1e1e] flex flex-col shrink-0 bg-[#0d0d0d]">
        <div className="p-4 border-b border-[#1e1e1e] space-y-4">
          
          {/* Dropdown Chuyển đổi View */}
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

          {/* Search & Filter */}
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

      {/* --- CỘT PHẢI --- */}
      <main className="flex-1 flex flex-col bg-[#0a0a0a]">
        {renderDetails()}
      </main>

    </div>
  );
};

export default ScreenReportReceiver;