import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

const BarChart = ({ alerts = [] }) => {
  const [buckets, setBuckets] = useState([]);
  const [scaleMax, setScaleMax] = useState(10);
  const [timeLabels, setTimeLabels] = useState([]);

  useEffect(() => {
    // 1. Phân chia giỏ thời gian (Time Bucketing): 60 phút chia 20 cột (3 phút/cột)
    const BUCKET_COUNT = 20;
    const BUCKET_DURATION_MS = 3 * 60 * 1000; 
    const now = new Date();
    const startTime = new Date(now.getTime() - BUCKET_COUNT * BUCKET_DURATION_MS);

    let newBuckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      index: i,
      startTime: new Date(startTime.getTime() + i * BUCKET_DURATION_MS),
      endTime: new Date(startTime.getTime() + (i + 1) * BUCKET_DURATION_MS),
      critical: 0,
      warning: 0,
      total: 0
    }));

    // 2. Nhồi dữ liệu Alerts
    alerts.forEach(alert => {
      // Ép chuẩn UTC gốc để không bị lệch timezone
      const alertTime = new Date(alert.time.replace(' ', 'T') + 'Z'); 
      
      if (alertTime >= startTime && alertTime <= now) {
        const bucketIndex = Math.floor((alertTime.getTime() - startTime.getTime()) / BUCKET_DURATION_MS);
        if (bucketIndex >= 0 && bucketIndex < BUCKET_COUNT) {
          newBuckets[bucketIndex].total++;
          if (alert.level?.toLowerCase() === 'critical' || alert.level?.toLowerCase() === 'red alert') {
            newBuckets[bucketIndex].critical++;
          } else {
            newBuckets[bucketIndex].warning++;
          }
        }
      }
    });

    // 3. Tự động Scale Trục Y (Trần +10%)
    const maxAlerts = Math.max(...newBuckets.map(b => b.total));
    const calculatedMax = maxAlerts > 0 ? Math.ceil(maxAlerts * 1.1) : 10; 
    
    setScaleMax(calculatedMax);
    setBuckets(newBuckets);

    // 4. Mốc thời gian trục X
    setTimeLabels([
      formatTimeLine(new Date(now.getTime() - 60 * 60 * 1000)), // -60m
      formatTimeLine(new Date(now.getTime() - 45 * 60 * 1000)), // -45m
      formatTimeLine(new Date(now.getTime() - 30 * 60 * 1000)), // -30m
      formatTimeLine(new Date(now.getTime() - 15 * 60 * 1000)), // -15m
      "Now"
    ]);

  }, [alerts]);

  const formatTimeLine = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatTooltipTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const yAxisLabels = [
    scaleMax,
    Math.round(scaleMax * 0.75),
    Math.round(scaleMax * 0.5),
    Math.round(scaleMax * 0.25),
    0
  ];

  return (
    <div className="xl:col-span-2 bg-[#2a2a2a] p-6 rounded-xl border border-[#3e3e3e] shadow-lg flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg">
            <Activity className="text-[#f87171]" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Threat Volume Timeline</h2>
            <p className="text-[10px] text-[#a0a0a0] font-mono">Last 60 Minutes (3min / block)</p>
          </div>
        </div>
        
        <div className="flex gap-4 text-[10px] font-mono font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> Critical</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-sm"></span> Warning</div>
        </div>
      </div>

      <div className="flex-1 relative flex items-end gap-1 px-2 pb-6">
        {/* Y-Axis */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] font-mono text-[#a0a0a0] pr-2 border-r border-[#3e3e3e] w-8 items-end">
          {yAxisLabels.map((val, idx) => (
            <span key={idx}>{val}</span>
          ))}
        </div>

        {/* Chart Canvas */}
        <div className="flex-1 h-full ml-10 flex items-end gap-1.5 md:gap-2">
          {buckets.map((bucket, i) => {
            const criticalHeight = (bucket.critical / scaleMax) * 100;
            const warningHeight = (bucket.warning / scaleMax) * 100;
            const totalHeight = criticalHeight + warningHeight;

            return (
              <div key={i} className="relative flex-1 group h-full flex flex-col justify-end">
                <div 
                  className="w-full flex flex-col justify-end transition-all duration-300 hover:brightness-125 hover:scale-105 origin-bottom" 
                  style={{ height: `${totalHeight}%` }}
                >
                  {criticalHeight > 0 && (
                     <div style={{ height: `${(criticalHeight / totalHeight) * 100}%` }} className={`bg-red-500 w-full ${warningHeight === 0 ? 'rounded-t-sm rounded-b-sm' : 'rounded-t-sm'}`} />
                  )}
                  {warningHeight > 0 && (
                     <div style={{ height: `${(warningHeight / totalHeight) * 100}%` }} className={`bg-yellow-500 w-full ${criticalHeight === 0 ? 'rounded-t-sm rounded-b-sm' : 'rounded-b-sm'}`} />
                  )}
                  {bucket.total === 0 && (
                     <div className="h-1 bg-[#3e3e3e]/50 w-full rounded-sm" />
                  )}
                </div>

                {/* Hover Tooltip */}
                <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 hidden group-hover:block z-50 bg-[#1c1c1c] border border-[#3e3e3e] p-3 rounded-lg shadow-xl text-xs min-w-[140px] pointer-events-none transition-opacity">
                  <p className="text-[#a0a0a0] font-mono text-[10px] mb-2 text-center pb-2 border-b border-[#3e3e3e]">
                    {formatTooltipTime(bucket.startTime)} - {formatTooltipTime(bucket.endTime)}
                  </p>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[#a0a0a0]"><span className="text-red-500 mr-1">■</span> Critical:</span>
                      <span className="text-white font-bold">{bucket.critical}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a0a0a0]"><span className="text-yellow-500 mr-1">■</span> Warning:</span>
                      <span className="text-white font-bold">{bucket.warning}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-[#3e3e3e]/50 mt-1">
                      <span className="text-[#ededed] font-bold">Total:</span>
                      <span className="text-[#3ecf8e] font-bold">{bucket.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* X-Axis */}
        <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[9px] font-mono text-[#a0a0a0] pt-2 border-t border-[#3e3e3e]">
          {timeLabels.map((time, idx) => (
             <span key={idx}>{time}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarChart;