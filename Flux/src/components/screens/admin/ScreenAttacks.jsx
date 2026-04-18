import React from 'react';
import { ShieldAlert, Crosshair, Zap, Search, ChevronDown, MapPinX} from 'lucide-react';
import MapSecurity  from '../../tools/WorldMap.jsx';

const CurrentAttacks = () => (
  <div className="p-8 space-y-8 flux-scrollbar">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-[#2a2a2a] p-6 rounded-xl border-l-4 border-l-[#f87171] border border-[#3e3e3e]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f87171]/10 rounded-lg text-[#f87171]"><Zap size={24} /></div>
          <div>
            <p className="text-xs text-[#a0a0a0] uppercase font-bold tracking-wider">Active Incursions</p>
            <p className="text-2xl font-bold">03</p>
          </div>
        </div>
      </div>
      <div className="bg-[#2a2a2a] p-6 rounded-xl border-l-4 border-l-[#fbbf24] border border-[#3e3e3e]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#fbbf24]/10 rounded-lg text-[#fbbf24]"><MapPinX size={24} /></div>
          <div>
            <p className="text-xs text-[#a0a0a0] uppercase font-bold tracking-wider">Blocked IP</p>
            <p className="text-2xl font-bold">03</p>
          </div>
        </div>
      </div>
      {/* Thêm các thẻ khác... */}
    </div>

    <div className="bg-[#2a2a2a] rounded-xl border border-[#3e3e3e] p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Crosshair className="text-[#f87171]" /> Live Threat Map (Mockup)
      </h2>
      <div className="aspect-video bg-[#1c1c1c] rounded-lg flex items-center justify-center border border-[#3e3e3e] text-[#3e3e3e]">
        <MapSecurity />
      </div>
    </div>

    <div className="bg-[#2a2a2a] rounded-xl border border-[#3e3e3e] p-6 shadow-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2 whitespace-nowrap">
          <ShieldAlert className="text-[#f87171] animate-pulse" /> 
          Current Attacks
        </h2>

        {/* Toolbar: Search & Filter */}
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 justify-end">
          
          {/* Search Bar */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={16} />
            <input 
              type="text"
              placeholder="Search attack name, IP..."
              className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#3ecf8e] transition-all"
            />
          </div>

          {/* Dropdown Filter */}
          <div className="relative w-full sm:w-48">
            <select 
              className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3ecf8e] appearance-none cursor-pointer text-[#ededed]"
              defaultValue="Live"
            >
              <option value="Live">Live Attacks</option>
              <optgroup label="Severity">
                <option value="severe">Severe</option>
                <option value="moderate">Moderate</option>
                <option value="light">Light</option>
              </optgroup>
              <optgroup label="Type">
                <option value="bruteforce">Bruteforce</option>
                <option value="ddos">DDoS Attack</option>
                <option value="sql">SQL Injection</option>
                <option value="xss">XSS Attack</option>
                <option value="geography">Unsusal Geography</option>
              </optgroup>
            </select>
            {/* Custom Arrow cho Select */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#a0a0a0]">
              <ChevronDown size={14} />
            </div>
          </div>

        </div>
      </div>

      {/* Placeholder cho danh sách cuộc tấn công (Mày sẽ map data ở đây) */}
      <div className="border border-[#3e3e3e] border-dashed rounded-lg h-64 flex items-center justify-center text-[#3e3e3e] font-mono text-sm italic">
        Waiting for incoming threat data...
      </div>
    </div>
  </div>
);

export default CurrentAttacks;