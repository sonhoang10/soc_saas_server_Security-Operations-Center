import React from 'react';
import {useState} from 'react';
import { UploadCloud, AlertTriangle, X} from 'lucide-react';
import {Button, Select, InputField,  } from '/src/components/tools/items.jsx';

const Report = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#0a0a0a]">
       <Form
        isFormOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)} /> 
      {/* 1. Sub-Sidebar: Phân loại Report (Inbox, Sent, Archive) */}
      <aside className="w-56 border-r border-[#1e1e1e] bg-[#0d0d0d] flex flex-col p-4 shrink-0">
        <button onClick={() => setIsFormOpen(true)} className="w-full bg-[#3ecf8e] text-black font-bold py-2.5 rounded-lg mb-6 hover:brightness-110 transition-all text-sm shadow-[0_0_15px_rgba(62,207,142,0.2)]">
          + New Report
        </button>
        
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-2 px-2">Categories</div>
          <button className="w-full flex items-center justify-between px-3 py-2 bg-[#3ecf8e]/10 text-[#3ecf8e] rounded-lg text-xs font-bold">
            <span>All Reports</span>
            <span className="bg-[#3ecf8e]/20 px-1.5 py-0.5 rounded text-[9px]">12</span>
          </button>
          <button className="w-full flex items-center px-3 py-2 text-[#a0a0a0] hover:bg-[#1c1c1c] rounded-lg text-xs transition-colors">
            Resolved
          </button>
        </nav>
      </aside>

      {/* 2. List View: Danh sách các Ticket (Giống danh sách Email) */}
      <section className="w-[400px] border-r border-[#1e1e1e] flex flex-col shrink-0 bg-[#0a0a0a]">
        <div className="h-12 border-b border-[#1e1e1e] flex items-center px-4 bg-[#0d0d0d]/50">
          <input type="text" placeholder="Filter tickets..." className="bg-transparent text-xs text-[#ededed] focus:outline-none w-full" />
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Một item mẫu */}
          {[1].map((i) => (
            <div key={i} className="p-4 border-b border-[#161616] hover:bg-[#111111] cursor-pointer transition-all border-l-2 border-l-transparent hover:border-l-[#3ecf8e]">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-mono text-[#3ecf8e]">#REP-202{i}</span>
                <span className="text-[10px] text-[#555555]">2h ago</span>
              </div>
              <h4 className="text-sm font-bold text-[#ededed] mb-1 truncate">Suspicious SSH Login Attempt</h4>
              <p className="text-xs text-[#a0a0a0] line-clamp-2 leading-relaxed">
                We detected multiple failed login attempts from IP 192.168.1.45...
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Detail View: Nội dung chi tiết báo cáo */}
      <main className="flex-1 flex flex-col bg-[#0d0d0d]/30 overflow-y-auto p-8">
      
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Suspicious SSH Login Attempt</h2>
              <div className="flex gap-2">
                <span className="bg-[#f87171]/10 text-[#f87171] text-[9px] px-2 py-0.5 rounded border border-[#f87171]/20 font-bold uppercase">Critical</span>
                <span className="bg-[#3e3e3e] text-[#a0a0a0] text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Asset: DB-SERVER-01</span>
              </div>
            </div>
            <button className="text-xs border border-[#3e3e3e] px-4 py-2 rounded-lg hover:bg-[#2a2a2a] text-[#ededed] transition-all">
              Mark as Resolved
            </button>
          </div>

          <div className="bg-[#111111] border border-[#3e3e3e] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold uppercase">JD</div>
              <div>
                <p className="text-xs font-bold text-white">John Doe (Client Admin)</p>
                <p className="text-[10px] text-[#555555]">Reported on April 5, 2026</p>
              </div>
            </div>
            <p className="text-sm text-[#a0a0a0] leading-relaxed mb-4">
              "Tao thấy có rất nhiều log báo lỗi SSH từ server chính. Hệ thống AI có báo là brute-force nhưng tao chưa thấy nó tự động block IP này. Admin xem giúp tao với, đây là IP của văn phòng chi nhánh hay là hacker thực sự?"
            </p>
            <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#1e1e1e] font-mono text-[11px] text-[#3ecf8e]">
              Attached Log Snippet: [AUTH_FAILURE] 192.168.1.45 port 22
            </div>
          </div>

          {/* Reply Section */}
          <div className="space-y-4">
            <label className="block text-[10px] font-bold text-[#555555] uppercase tracking-widest">Add a comment</label>
            <textarea 
              placeholder="Write your response to the SOC team..."
              className="w-full bg-[#111111] border border-[#3e3e3e] rounded-xl p-4 text-sm focus:outline-none focus:border-[#3ecf8e] min-h-[120px]"
            ></textarea>
            <div className="flex justify-end">
              <button className="bg-[#3ecf8e] text-black font-bold px-6 py-2 rounded-lg text-xs hover:brightness-110">
                Send Reply
              </button>
            </div>
          </div>
        </div>
      </main>
       
    </div>
    
  )
  
};
const Form = ({ isFormOpen, onClose }) => {
  if (!isFormOpen) return null;

  const severityOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
      />

      <div className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-[#1c1c1c] border border-[#3e3e3e] p-8 shadow-3xl shadow-black/80 transition-all">

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#3e3e3e]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f87171]/10 rounded-lg text-[#f87171]">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Report Security Incident</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#3e3e3e] text-[#a0a0a0] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung Form */}
        <div className="text-[#ededed] space-y-6">
          
          {/* Section 1: Thông tin cơ bản */}
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2">
              <InputField 
                label="Incident Title" 
                placeholder="E.g. 'Suspicious SSH Brute-force'" 
              />
            </div>
            <div className="flex flex-col-reverse">
              <Select 
                label="Severity"
                defaultValue="critical" 
                options={severityOptions}
                className="w-full"
              />
            </div>
          </div>

          {/* Section 2: Mô tả chi tiết (Tự code lại Textarea) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider">Detailed Description</label>
            <textarea
              placeholder="Describe the incident in detail, including affected assets (e.g., DB-Server-01), timestamps, and potential impact..."
              className="w-full bg-[#111111] border border-[#3e3e3e] rounded-xl p-4 text-sm focus:outline-none focus:border-[#3ecf8e] min-h-[160px] leading-relaxed resize-none"
            ></textarea>
          </div>

          {/* Section 3: Đính kèm bằng chứng (Tính năng mới!) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider">Evidence Upload (Optional)</label>
            <div className="w-full h-24 bg-[#111111] border-2 border-dashed border-[#3e3e3e] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#3ecf8e] group transition-colors">
              <UploadCloud size={24} className="text-[#a0a0a0] group-hover:text-[#3ecf8e] mb-2" />
              <p className="text-xs text-[#a0a0a0]">Kéo thả file log (.txt, .csv) hoặc ảnh chụp màn hình</p>
              <p className="text-[10px] text-[#555555]">Max 10MB per file</p>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-10 pt-6 border-t border-[#3e3e3e]/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-[#ededed] hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button className="px-5 py-2.5 bg-[#3ecf8e] text-black text-sm font-bold rounded-lg hover:brightness-110 shadow-[0_0_20px_rgba(62,207,142,0.3)] transition-all transform active:scale-[0.98]">
            Submit Report Request
          </button>
        </div>
      </div>
    </div> 
  );
};

export default Report;