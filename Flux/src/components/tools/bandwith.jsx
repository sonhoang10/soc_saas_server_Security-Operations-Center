import React from 'react';
import { useEffect, useState } from 'react';
import { Terminal, Search, Activity } from 'lucide-react';

const BandwidthUsage = () => {
    return(
        <div className="xl:col-span-2 bg-[#111111] p-6 rounded-2xl border border-[#3e3e3e] shadow-2xl flex flex-col h-[400px]">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-[#3ecf8e]/10 rounded-lg">
                <Activity className="text-[#3ecf8e]" size={20} />
            </div>
            <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-tight">Bandwidth Traffic Analysis</h2>
            </div>
            </div>
            
            <div className="flex gap-2">
            <button className="px-3 py-1 bg-[#1c1c1c] border border-[#3e3e3e] rounded text-[10px] text-[#a0a0a0] hover:text-white transition-colors">1H</button>
            <button className="px-3 py-1 bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 rounded text-[10px] text-[#3ecf8e]">Live</button>
            </div>
        </div>

        {/* Chart Area Placeholder - Mày nên dùng Recharts ở đây */}
        <div className="flex-1 relative flex items-end gap-1 px-2 pb-6">
            {/* Trục Y giả */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] font-mono text-[#333] pr-2 border-r border-[#1e1e1e]">
            <span>100M</span><span>75M</span><span>50M</span><span>25M</span><span>0</span>
            </div>

            {/* Giả lập các cột sóng (Waveform) */}
            <div className="flex-1 h-full ml-8 flex items-end gap-[2px]">
            {/* Loop mảng data giả ở đây */}
            {[...Array(40)].map((_, i) => {
                const height = Math.floor(Math.random() * 60) + 20;
                return (
                <div 
                    key={i} 
                    style={{ height: `${height}%` }} 
                    className="flex-1 bg-gradient-to-t from-[#3ecf8e]/20 to-[#3ecf8e]/50 rounded-t-sm hover:from-[#3ecf8e]/40 transition-all cursor-crosshair"
                />
                );
            })}
            </div>
            
            {/* Trục X giả */}
            <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[9px] font-mono text-[#333] pt-2 border-t border-[#1e1e1e]">
            <span>10:00 AM</span><span>10:15 AM</span><span>10:30 AM</span><span>10:45 AM</span>
            </div>
        </div>
    </div>
    );
    
};

export default BandwidthUsage;
