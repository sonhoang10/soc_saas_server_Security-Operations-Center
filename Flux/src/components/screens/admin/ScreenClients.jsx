import React from 'react';
import { Plus, Building2, MoreVertical, ShieldCheck, Globe } from 'lucide-react';

const ClientManagement = () => {
  const clients = [
    { name: 'Acme Corporation', domain: 'acme-corp.com', status: 'Active', tenants: 12, protection: 'Elite' },
    { name: 'Vingroup', domain: 'vingroup.vn', status: 'Active', tenants: 45, protection: 'Enterprise' },
    { name: 'CyberDyne Systems', domain: 'sky-net.com', status: 'Suspended', tenants: 2, protection: 'Standard' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Client Management</h1>
          <p className="text-sm text-sbSubText">Quản lý danh sách khách hàng và gói dịch vụ</p>
        </div>
        <button className="border border-sbBorder text-[#3ecf8e] hover:opacity-50 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200">
          <Plus size={18} /> Add New Client
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {clients.map((client, index) => (
          <div key={index} className="bg-sbCard hover:opacity-50 border border-sbBorder rounded-xl p-5 flex items-center justify-between hover:border-sbTeal transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sbBg rounded-lg flex items-center justify-center border border-sbBorder">
                <Building2 className="text-sbSubText" />
              </div>
              <div>
                <h3 className="font-bold text-sbText">{client.name}</h3>
                <div className="flex items-center gap-3 text-xs text-sbSubText">
                  <span className="flex items-center gap-1"><Globe size={12} /> {client.domain}</span>
                  <span className="flex items-center gap-1"><ShieldCheck size={12} /> Plan: {client.protection}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 text-right">
              <div>
                <p className="text-[10px] text-sbSubText uppercase font-bold">Tenants</p>
                <p className="font-mono text-sbTeal">{client.tenants}</p>
              </div>
              <div>
                <p className="text-[10px] text-sbSubText uppercase font-bold">Status</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${client.status === 'Active' ? 'bg-sbTeal/10 text-sbTeal' : 'bg-sbRed/10 text-sbRed'}`}>
                  {client.status}
                </span>
              </div>
              <button className="p-2 hover:bg-sbBg rounded-full text-sbSubText">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientManagement;