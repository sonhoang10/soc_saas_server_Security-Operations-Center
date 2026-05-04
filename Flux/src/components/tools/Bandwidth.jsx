import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

const MAX_DATA_POINTS = 60; 

const BandwidthUsage = ({ networkSpike = 0 }) => {
  const [data, setData] = useState(
    Array.from({ length: MAX_DATA_POINTS }, () => ({ rx: 0, tx: 0 }))
  );
  
  const [yMax, setYMax] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData];
        newData.shift();

        // Base Network Traffic
        let currentRx = 5 + Math.random() * 10; 
        let currentTx = 2 + Math.random() * 5;

        // Mô phỏng Spike Băng Thông khi bị tấn công
        if (networkSpike > 0) {
            currentRx += networkSpike * (10 + Math.random() * 20);
            currentTx += networkSpike * (5 + Math.random() * 10);
        }

        newData.push({ 
            rx: parseFloat(currentRx.toFixed(2)), 
            tx: parseFloat(currentTx.toFixed(2)) 
        });

        const currentMax = Math.max(...newData.map(d => Math.max(d.rx, d.tx)));
        setYMax(currentMax > 100 ? Math.ceil(currentMax * 1.2) : 100);

        return newData;
      });
    }, 1000); 

    return () => clearInterval(interval);
  }, [networkSpike]);

  const renderLine = (key, colorClass, fillClass) => {
    const points = data.map((d, index) => {
      const x = (index / (MAX_DATA_POINTS - 1)) * 100;
      const y = 100 - (d[key] / yMax) * 100;
      return `${x},${y}`;
    }).join(' ');

    const polygonPoints = `0,100 ${points} 100,100`;

    return (
      <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillClass} stopOpacity="0.4" />
            <stop offset="100%" stopColor={fillClass} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={polygonPoints} fill={`url(#grad-${key})`} />
        <polyline points={points} fill="none" stroke={colorClass} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  };

  const currentRx = data[data.length - 1].rx;
  const currentTx = data[data.length - 1].tx;

  return (
    <div className="xl:col-span-3 bg-[#2a2a2a] p-6 rounded-xl border border-[#3e3e3e] shadow-lg flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-6 border-b border-[#3e3e3e] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Activity className="text-blue-500" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Live Network I/O</h2>
            <p className="text-[10px] text-[#a0a0a0] font-mono">Real-time interface bandwidth (Mbps)</p>
          </div>
        </div>
        
        <div className="flex gap-6 text-[11px] font-mono font-bold uppercase tracking-wider">
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 text-[#a0a0a0] mb-1">
                 <span className="w-3 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span> RX (Inbound)
             </div>
             <span className="text-blue-400 text-lg">{currentRx.toFixed(1)} <span className="text-[10px] text-[#5a5a5a]">Mbps</span></span>
          </div>
          <div className="flex flex-col items-end border-l border-[#3e3e3e] pl-6">
             <div className="flex items-center gap-2 text-[#a0a0a0] mb-1">
                 <span className="w-3 h-1 bg-[#3ecf8e] rounded-full shadow-[0_0_8px_rgba(62,207,142,0.8)]"></span> TX (Outbound)
             </div>
             <span className="text-[#3ecf8e] text-lg">{currentTx.toFixed(1)} <span className="text-[10px] text-[#5a5a5a]">Mbps</span></span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex items-end gap-1 px-2 pb-6">
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] font-mono text-[#a0a0a0] pr-2 border-r border-[#3e3e3e] w-12 items-end z-10">
          <span>{yMax}M</span>
          <span>{Math.round(yMax * 0.75)}M</span>
          <span>{Math.round(yMax * 0.5)}M</span>
          <span>{Math.round(yMax * 0.25)}M</span>
          <span>0M</span>
        </div>

        <div className="flex-1 h-full ml-14 relative border-b border-[#3e3e3e] bg-[linear-gradient(to_right,#3e3e3e_1px,transparent_1px),linear-gradient(to_bottom,#3e3e3e_1px,transparent_1px)] bg-[size:5%_25%]">
          {renderLine('rx', '#3b82f6', '#3b82f6')} 
          {renderLine('tx', '#3ecf8e', '#3ecf8e')} 
        </div>
        
        <div className="absolute bottom-0 left-14 right-0 flex justify-between text-[9px] font-mono text-[#a0a0a0] pt-2">
          <span>-60s</span>
          <span>-45s</span>
          <span>-30s</span>
          <span>-15s</span>
          <span className="text-[#3ecf8e] animate-pulse">Live</span>
        </div>
      </div>
    </div>
  );
};

export default BandwidthUsage;