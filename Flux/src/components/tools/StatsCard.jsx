import React from 'react';

const StatsCard = ({ title, value, trend, icon, color, isAlert }) => {
  const colorMap = {
    sbTeal: 'text-[#3ecf8e]',
    sbRed: 'text-[#f87171]',
    sbYellow: 'text-[#fbbf24]',
  };

  return (
    <div className={`bg-[#2a2a2a] p-6 rounded-xl border ${isAlert ? 'border-l-4 border-l-[#f87171]' : 'border-[#3e3e3e]'} shadow-lg`}>
      <div className="flex items-center justify-between text-[#a0a0a0] mb-2">
        <span className="text-sm font-medium">{title}</span>
        <div className={colorMap[color]}>{icon}</div>
      </div>
      <p className={`text-4xl font-bold ${isAlert ? 'text-[#f87171]' : 'text-[#ededed]'}`}>{value}</p>
      <p className="text-xs text-[#a0a0a0] mt-1">{trend}</p>
    </div>
  );
};

export default StatsCard;