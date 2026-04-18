import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Quan trọng: Phải có CSS mới hiện hình

const MapSecurity = () => {
  const mapContainerRef = useRef(null); // Tham chiếu tới thẻ div chứa map
  const mapInstanceRef = useRef(null);  // Giữ thực thể map để điều khiển

  useEffect(() => {
    // 1. Kiểm tra nếu chưa có map thì mới khởi tạo (tránh đè nhau)
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2, // Chặn zoom nhỏ
      maxZoom: 8,  // Chặn zoom to quá mức
      maxBounds: [[-90, -180], [90, 180]], // Khóa vùng nhìn
      maxBoundsViscosity: 1.0, // Kéo ra biên là nó nảy lại ngay
    });

      // 2. Thêm "mặt" bản đồ (Tile Layer) 
      // Dùng bản tối (Dark Mode) cho đúng vibe của Flux
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        noWrap: true, // CỰC KỲ QUAN TRỌNG: Nó sẽ không vẽ thêm bản đồ ở hai bên khi zoom nhỏ
        }).addTo(mapInstanceRef.current);

      // 3. Thêm nút Zoom vào góc dưới bên phải cho gọn
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
    }

    // 4. Hàm dọn dẹp khi component bị gỡ bỏ (tránh rò rỉ bộ nhớ)
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Hàm này để mày gọi từ bên ngoài khi có tấn công mới
  const addAttackMarker = (lat, lng, info) => {
    if (mapInstanceRef.current) {
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: "#ff4d4d",
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`<b>Attack Detected!</b><br>${info}`).openPopup();
      
      // Tự động biến mất sau 5 giây cho nó "real-time"
      setTimeout(() => marker.remove(), 5000);
    }
  };

  return (
    <div className="relative z-0 w-full h-full min-h-[500px]">
      {/* Cái div này là nơi Leaflet sẽ "vẽ" lên */}
      <div ref={mapContainerRef} className="w-full h-full rounded-xl border border-[#3e3e3e]" />
      
      {/* Nút test để mày bấm xem hiệu ứng */}
      {/* <button 
        onClick={() => addAttackMarker(Math.random() * 180 - 90, Math.random() * 360 - 180, "IP: 142.250.190.46")}
        className="absolute top-4 right-4 z-[1000] bg-[#3ecf8e] text-black px-3 py-1 rounded-md font-bold text-xs"
      >
        TEST ATTACK
      </button> */}
    </div>
  );
};

export default MapSecurity;