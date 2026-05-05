import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { Select, InputField } from '/src/components/tools/items.jsx';

const backendURL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8000`;

const Report = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const targetServerId = urlParams.get('server_id');
  const teamId = urlParams.get('team_id') || localStorage.getItem('current_team_id');
  const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');

  // GỌI API LẤY DANH SÁCH BÁO CÁO CỦA CLIENT TỪ DATABASE
  useEffect(() => {
      const fetchReports = async () => {
          try {
              const response = await axios.get(`${backendURL}/api/reports?team_id=${teamId}`, {
                  headers: { Authorization: `Bearer ${token}` }
              });
              setReports(response.data.reports || []);
          } catch (error) {
              console.error("Failed to fetch reports:", error);
          }
      };
      
      if (teamId && token) {
          fetchReports();
      }
  }, [teamId, token]);
  
  const handleFormSubmitSuccess = (newReportData) => {
      setReports([newReportData, ...reports]);
      setIsFormOpen(false);
      // Reload page to get exact data from DB including ID
      window.location.reload(); 
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0a0a]">
       <Form
        isFormOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)} 
        onSuccess={handleFormSubmitSuccess}
        serverId={targetServerId}
        teamId={teamId}
        token={token}
      /> 
      
      <aside className="w-56 border-r border-[#1e1e1e] bg-[#0d0d0d] flex flex-col p-4 shrink-0">
        <button onClick={() => setIsFormOpen(true)} className="w-full bg-[#3ecf8e] text-black font-bold py-2.5 rounded-lg mb-6 hover:brightness-110 transition-all text-sm shadow-[0_0_15px_rgba(62,207,142,0.2)]">
          + New Report
        </button>
        
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-2 px-2">Categories</div>
          <button className="w-full flex items-center justify-between px-3 py-2 bg-[#3ecf8e]/10 text-[#3ecf8e] rounded-lg text-xs font-bold">
            <span>All Reports</span>
            <span className="bg-[#3ecf8e]/20 px-1.5 py-0.5 rounded text-[9px]">{reports.length}</span>
          </button>
        </nav>
      </aside>

      <section className="w-[400px] border-r border-[#1e1e1e] flex flex-col shrink-0 bg-[#0a0a0a]">
        <div className="h-12 border-b border-[#1e1e1e] flex items-center px-4 bg-[#0d0d0d]/50">
          <input type="text" placeholder="Filter tickets..." className="bg-transparent text-xs text-[#ededed] focus:outline-none w-full" />
        </div>
        
        <div className="flex-1 overflow-y-auto flux-scrollbar">
          {reports.length === 0 ? (
              <div className="p-8 text-center text-[#555] text-xs font-mono">No reports filed yet.</div>
          ) : (
             reports.map((report, i) => (
                <div key={i} onClick={() => setSelectedReport(report)} className={`p-4 border-b border-[#161616] cursor-pointer transition-all ${selectedReport?.id === report.id ? 'bg-[#111111] border-l-2 border-l-[#3ecf8e]' : 'hover:bg-[#111111] border-l-2 border-l-transparent'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-mono text-[#3ecf8e]">
                        #{report.id ? report.id.substring(0,8).toUpperCase() : 'REQ-NEW'}
                    </span>
                    <span className="text-[10px] text-[#555555] uppercase font-bold">{report.severity}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#ededed] mb-1 truncate">{report.title}</h4>
                  <p className="text-xs text-[#a0a0a0] line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              ))
          )}
        </div>
      </section>

      <main className="flex-1 flex flex-col bg-[#0d0d0d]/30 overflow-y-auto p-8">
        {!selectedReport ? (
             <div className="flex flex-col items-center justify-center h-full opacity-30 text-[#a0a0a0]">
                 <AlertTriangle size={64} className="mb-4" />
                 <p>Select a report to view details</p>
             </div>
        ) : (
            <div className="max-w-3xl mx-auto w-full">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{selectedReport.title}</h2>
                        <div className="flex gap-2">
                            <span className={`bg-[#f87171]/10 text-[#f87171] text-[9px] px-2 py-0.5 rounded border border-[#f87171]/20 font-bold uppercase`}>
                                {selectedReport.severity}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${selectedReport.status === 'resolved' ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]' : 'bg-[#3e3e3e] text-[#a0a0a0]'}`}>
                                Status: {selectedReport.status || 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111111] border border-[#3e3e3e] rounded-xl p-6 mb-6">
                    <p className="text-sm text-[#a0a0a0] leading-relaxed whitespace-pre-wrap">
                    {selectedReport.description}
                    </p>
                </div>

                {/* KHU VỰC HIỂN THỊ PHẢN HỒI TỪ ADMIN (REPLY) */}
                {selectedReport.admin_notes && (
                    <div className="mt-6 bg-[#1a1a1a] border border-[#3ecf8e]/30 rounded-xl p-6 relative shadow-lg">
                        <div className="absolute -top-3 left-6 bg-[#0a0a0a] px-2 text-[10px] font-bold text-[#3ecf8e] uppercase tracking-widest flex items-center gap-1 border border-[#3ecf8e]/30 rounded">
                            <ShieldCheck size={12} /> Response from SOC Team
                        </div>
                        <p className="text-sm text-[#ededed] leading-relaxed whitespace-pre-wrap">
                            {selectedReport.admin_notes}
                        </p>
                    </div>
                )}

            </div>
        )}
      </main>
    </div>
  )
};

const Form = ({ isFormOpen, onClose, onSuccess, serverId, teamId, token }) => {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFormOpen) return null;

  const handleSubmit = async () => {
      if (!title || !description || title.length < 5 || description.length < 10) {
          alert("Title must be at least 5 chars and Description at least 10 chars.");
          return;
      }
      if (!serverId || !teamId) {
          alert("Context Error: Server ID or Team ID is missing.");
          return;
      }

      setIsSubmitting(true);
      try {
          const payload = {
              team_id: teamId,
              server_id: serverId,
              title: title,
              severity: severity,
              description: description
          };

          await axios.post(`${backendURL}/api/reports`, payload, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          alert("Report submitted successfully to SOC team.");
          onSuccess(payload); 
          
          setTitle('');
          setDescription('');
          setSeverity('medium');
      } catch (error) {
          console.error("Submit Error:", error);
          alert("Failed to submit report. Please check the network.");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-[#1c1c1c] border border-[#3e3e3e] p-8 shadow-3xl shadow-black/80 transition-all">
        
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#3e3e3e]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f87171]/10 rounded-lg text-[#f87171]">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Report Security Incident</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#3e3e3e] text-[#a0a0a0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="text-[#ededed] space-y-6">
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2">
              <label className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider block mb-1.5">Incident Title</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g. 'Suspicious SSH Brute-force'" 
                className="w-full bg-[#111] border border-[#3e3e3e] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#3ecf8e] text-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider block mb-1.5">Severity</label>
              <select 
                 value={severity}
                 onChange={(e) => setSeverity(e.target.value)}
                 className="w-full bg-[#111] border border-[#3e3e3e] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#3ecf8e] text-white appearance-none cursor-pointer"
              >
                 <option value="critical">Critical</option>
                 <option value="high">High</option>
                 <option value="medium">Medium</option>
                 <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider">Detailed Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the incident in detail, including timestamps, and potential impact..."
              className="w-full bg-[#111111] border border-[#3e3e3e] rounded-xl p-4 text-sm focus:outline-none focus:border-[#3ecf8e] min-h-[160px] leading-relaxed resize-none"
            ></textarea>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#3e3e3e]/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-[#ededed] hover:bg-[#2a2a2a] rounded-lg transition-colors">
            Cancel
          </button>
          <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="px-5 py-2.5 bg-[#3ecf8e] text-black text-sm font-bold rounded-lg hover:brightness-110 shadow-[0_0_20px_rgba(62,207,142,0.3)] transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report Request'}
          </button>
        </div>

      </div>
    </div> 
  );
};

export default Report;