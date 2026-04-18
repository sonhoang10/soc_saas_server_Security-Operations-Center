import React, { useEffect, useState } from 'react';
import { Zap, MapPinOff, CheckCircle, KeyRound } from 'lucide-react';
import { useTabs } from '../TabContext.jsx';
import axiosClient from '/src/api/axiosClient';



const SecurityTable = () => {
  const { navigateTo } = useTabs();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await axiosClient.get('/api/logs?limit=50');
        setEvents(data.logs || []);
      } catch (error) {
        console.error('Failed to load logs', error);
      }
    };

    fetchLogs();
  }, []);
  return (
    <section className="bg-[#2a2a2a] rounded-xl border border-[#3e3e3e] shadow-lg overflow-hidden">
      <div className="p-6 border-b border-[#3e3e3e] flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="text-[#f87171]" size={20} /> Hot Events Requiring Action</h2>
        <div className="flex gap-2 text-xs">
          <button onClick={() => navigateTo('Current Attacks')} className="bg-[#3e3e3e] px-3 py-1 rounded hover:bg-[#3e3e3e]/50">All</button>
          <button className="text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/30 px-3 py-1 rounded font-medium">Critical</button>
        </div>
      </div>
      <table className="w-full text-left">
        <thead className="bg-[#1c1c1c] text-[#a0a0a0] text-xs uppercase tracking-wider">
          <tr>
            <th className="px-6 py-3">Alert Type</th>
            <th className="px-6 py-3">User / Company</th>
            <th className="px-6 py-3">Location / Device</th>
            <th className="px-6 py-3">Time</th>
            <th className="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3e3e3e]">
          {events.map((event, index) => (
            <tr key={index} className="hover:bg-[#1c1c1c]/50 transition">
              <td className="px-6 py-4 flex items-center gap-2.5 font-medium">
                <MapPinOff className="text-[#fbbf24]" size={18} />
                {event.log_type}
              </td>
              <td className="px-6 py-4 text-sm">
                {event.username || '-'}<br />
                <span className="text-xs text-[#a0a0a0]">IP: {event.target_ip}</span>
              </td>
              <td className="px-6 py-4 text-sm">{event.action}</td>
              <td className="px-6 py-4 text-sm text-[#a0a0a0]">{event.timestamp}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[#f87171] bg-[#f87171]/10 px-3 py-1 rounded text-xs hover:bg-[#f87171]/30">
                  Mitigate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default SecurityTable;