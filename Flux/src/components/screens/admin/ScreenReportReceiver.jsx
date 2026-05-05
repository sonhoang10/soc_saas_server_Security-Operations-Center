import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Inbox, CheckCircle, XCircle, AlertCircle, 
  Search, Filter, MoreVertical, Building2, Globe, FileJson, 
  Cloud, ChevronDown, Clock, Mail, Phone, User, Briefcase, 
  Users, MapPin, Target, Hash, AlignLeft
} from 'lucide-react';

const backendURL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8000`; 

const ScreenReportReceiver = () => {
  const [viewMode, setViewMode] = useState('approvals');
  
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [loadingReqs, setLoadingReqs] = useState(false);

  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  
  // Trạng thái lưu trữ text nhập vào của ô Reply
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    setSelectedReq(null);
    setSelectedIncident(null);
  }, [viewMode]);

  // Cập nhật lại Reply box mỗi khi chuyển sang Incident khác
  useEffect(() => {
      setReplyText(selectedIncident?.admin_notes || '');
  }, [selectedIncident]);

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

  const fetchIncidents = async () => {
      setLoadingIncidents(true);
      try {
          const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
          const response = await axios.get(`${backendURL}/api/reports`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setIncidents(response.data.reports || []);
      } catch (error) {
          console.error("Fetch incident reports failed:", error);
      } finally {
          setLoadingIncidents(false);
      }
  };

  useEffect(() => {
    if (viewMode === 'approvals') fetchPendingRequests();
    if (viewMode === 'incidents') fetchIncidents();
  }, [viewMode]);

  const handleReview = async (teamId, action) => {
    const confirmMsg = action === 'approve' ? 'Duyệt cấp phát tài nguyên?' : 'Từ chối yêu cầu?';
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

  // Hàm Gửi Reply & Giải quyết Ticket
  const handleSendReply = async () => {
      if (!replyText.trim()) {
          alert("Please enter a response message.");
          return;
      }
      
      if (!window.confirm("Gửi phản hồi và đánh dấu báo cáo này là Đã Xử Lý (Resolved)?")) return;
      
      try {
          const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
          await axios.patch(`${backendURL}/api/reports/${selectedIncident.id}`, 
              { status: 'resolved', admin_notes: replyText },
              { headers: { Authorization: `Bearer ${token}` }}
          );
          
          setSelectedIncident(prev => ({...prev, status: 'resolved', admin_notes: replyText}));
          fetchIncidents(); // Cập nhật lại list bên trái
      } catch (error) {
          alert("Error sending reply to database.");
      }
  };

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
        <div key={req.id} onClick={() => setSelectedReq(req)} className={`p-4 border-b border-[#1e1e1e] cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-[#1a1a1a] border-l-4 border-l-[#3ecf8e]' : 'hover:bg-[#111] border-l-4 border-l-transparent'}`}>
          <div className="flex justify-between items-start mb-1">
            <h3 className={`font-bold ${selectedReq?.id === req.id ? 'text-[#3ecf8e]' : 'text-white'}`}>{req.name}</h3>
            <span className="text-[10px] text-[#555] font-mono">{new Date(req.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-xs text-[#a0a0a0] mb-2">{req.company_email}</p>
          <div className="flex gap-2">
            <span className="bg-yellow-500/10 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Pending</span>
          </div>
        </div>
      ));
    }

    if (loadingIncidents) return <div className="p-6 text-center text-[#555] text-sm font-mono">Loading reports...</div>;
    if (incidents.length === 0) return (
        <div className="p-6 text-center flex flex-col items-center justify-center h-full opacity-50">
          <CheckCircle size={40} className="text-[#3ecf8e] mb-4" />
          <p className="text-sm">No incident reports filed.</p>
        </div>
    );
    
    return incidents.map((inc) => (
      <div key={inc.id} onClick={() => setSelectedIncident(inc)} className={`p-4 border-b border-[#1e1e1e] cursor-pointer transition-colors ${selectedIncident?.id === inc.id ? 'bg-[#1a1a1a] border-l-4 border-l-[#f87171]' : 'hover:bg-[#111] border-l-4 border-l-transparent'}`}>
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-bold truncate pr-2 ${selectedIncident?.id === inc.id ? 'text-[#f87171]' : 'text-white'}`}>
            {inc.title}
          </h3>
        </div>
        <p className="text-xs text-[#a0a0a0] mb-2">{inc.team_name}</p>
        <div className="flex gap-2">
          {inc.status === 'pending' && <span className="bg-[#f87171]/10 text-[#f87171] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Pending</span>}
          {inc.status === 'resolved' && <span className="bg-[#3ecf8e]/10 text-[#3ecf8e] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Resolved</span>}
          <span className="bg-gray-800 text-gray-300 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{inc.severity}</span>
        </div>
      </div>
    ));
  };

  const renderDetails = () => {
    if ((viewMode === 'approvals' && !selectedReq) || (viewMode === 'incidents' && !selectedIncident)) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-[#555]">
          <Inbox size={60} className="mb-4 opacity-20" />
          <p className="font-mono text-sm">Select an item to review details.</p>
        </div>
      );
    }

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
            <span className="text-xs font-mono text-[#555]">Req ID: {selectedReq.id?.substring(0,8)}...</span>
          </div>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12 flux-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
                  <Clock size={16} /> Pending Review
                </div>
                <h1 className="text-4xl font-extrabold text-white leading-tight">{selectedReq.name}</h1>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-[#1a1a1a] border border-[#3e3e3e] rounded font-mono text-xs text-[#a0a0a0]">
                    ID: {selectedReq.unique_name}
                  </span>
                </div>
              </div>

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
                {/* Nút Resolve ở trên Header bị ẩn đi vì ta đã chuyển chức năng này xuống Nút "Send Reply & Resolve" ở Textarea */}
            </div>
            <span className="text-xs font-mono text-[#555]">Report ID: {selectedIncident.id?.substring(0,8)}...</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 flux-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              
              <div className="space-y-4 border-b border-[#1e1e1e] pb-6">
                <div className="flex gap-2 mb-2">
                    <span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">{selectedIncident.severity} SEVERITY</span>
                    <span className="bg-[#1a1a1a] border border-[#3e3e3e] text-[#a0a0a0] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                        Asset: {selectedIncident.server_ip}
                    </span>
                </div>
                <h1 className="text-3xl font-extrabold text-white leading-tight">{selectedIncident.title}</h1>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-[#f87171] text-black font-bold flex items-center justify-center text-xs">
                    {selectedIncident.sender_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedIncident.sender_name} <span className="text-[#555] font-normal">({selectedIncident.team_name})</span></p>
                    <p className="text-[11px] text-[#555]">{selectedIncident.sender_email} • Reported on {new Date(selectedIncident.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-[#a0a0a0] leading-relaxed whitespace-pre-wrap text-sm">
                {selectedIncident.description}
              </div>

              {/* KHUNG NHẬP RESPONSE DÀNH CHO ADMIN */}
              <div className="mt-12 p-1 bg-[#161616] border border-[#2a2a2a] rounded-2xl focus-within:border-[#3ecf8e] transition-all relative overflow-hidden">
                <textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={selectedIncident.status === 'resolved'}
                  className="w-full bg-transparent border-none p-4 text-sm min-h-[150px] resize-none focus-within:outline-none text-[#ededed] placeholder:text-[#555] caret-[#3ecf8e] disabled:opacity-50"
                  placeholder="Write your response to the client..."
                ></textarea>
                
                {selectedIncident.status !== 'resolved' && (
                    <div className="flex justify-end p-2 border-t border-[#2a2a2a]">
                      <button 
                          onClick={handleSendReply} 
                          className="px-6 py-2 bg-[#3ecf8e] text-black font-bold rounded-xl text-xs hover:brightness-110 flex items-center gap-2"
                      >
                          <CheckCircle size={14} /> Send Reply & Resolve
                      </button>
                    </div>
                )}
                
                {/* Lớp phủ mờ nếu ticket đã resolved, không cho gõ nữa */}
                {selectedIncident.status === 'resolved' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                       <div className="bg-[#1c1c1c] border border-[#3e3e3e] px-4 py-2 rounded-lg text-xs font-bold text-[#3ecf8e] flex items-center gap-2 shadow-2xl">
                           <CheckCircle size={16}/> Ticket Closed & Replied
                       </div>
                    </div>
                )}
              </div>

            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a] text-[#ededed] border border-[#3e3e3e] rounded-xl">
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

      <main className="flex-1 flex flex-col bg-[#0a0a0a]">
        {renderDetails()}
      </main>
    </div>
  );
};

export default ScreenReportReceiver;