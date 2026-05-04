import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==========================================
// SYSTEM CONFIGURATION
// ==========================================
const MARKER_DISPLAY_DURATION_MS = 10000; // Config show time of alert on maps (10000ms = 10s)

const backendURL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8000`;
const wsURL = backendURL.replace(/^http/, 'ws');

const MapSecurity = () => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const ipCache = useRef({}); 

  // ==========================================
  // 1. MAP INITIALIZATION
  // ==========================================
  useEffect(() => {
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        noWrap: true,
      }).addTo(mapInstanceRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ==========================================
  // 2. MARKER RENDERER ENGINE
  // ==========================================
  const addAttackMarker = (lat, lng, info) => {
    if (!mapInstanceRef.current) return;

    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: "#ff4d4d",
      color: "#fff",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(mapInstanceRef.current);

    marker.bindPopup(
      `<div style="font-family: monospace; color: #333;">
        <b style="color: #ff4d4d;">THREAT DETECTED</b><br/>
        ${info}
      </div>`
    ).openPopup();
    
    // Tự động gỡ bỏ marker sau khoảng thời gian được cấu hình
    setTimeout(() => {
      if (mapInstanceRef.current && mapInstanceRef.current.hasLayer(marker)) {
        marker.remove();
      }
    }, MARKER_DISPLAY_DURATION_MS);
  };

  // ==========================================
  // 3. REAL-TIME WEBSOCKET & INTERNAL GEO-LOCATION PIPELINE
  // ==========================================
  useEffect(() => {
    const token = localStorage.getItem('soc_token') || localStorage.getItem('access_token');
    const ws = new WebSocket(`${wsURL}/ws/alerts${token ? `?token=${token}` : ''}`);

    ws.onopen = () => {
      console.log("[WorldMap] WebSocket connection established.");
    };

    ws.onmessage = async (event) => {
      try {
        const alertData = JSON.parse(event.data);
        const attackerIp = alertData.ip;
        const attackType = alertData.type;
        const targetIp = alertData.target_server || alertData.target_ip;

        if (!attackerIp || attackerIp === '127.0.0.1' || attackerIp.toLowerCase() === 'unknown') {
          return;
        }

        let lat, lng;

        // Enterprise Standard: Fetching GeoIP data from internal Backend to prevent 3rd-party dependency & rate limits
        if (ipCache.current[attackerIp]) {
          lat = ipCache.current[attackerIp].lat;
          lng = ipCache.current[attackerIp].lng;
        } else {
          try {
            const response = await fetch(`${backendURL}/api/geoip/${attackerIp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const geoData = await response.json();

            if (geoData.success) {
              lat = geoData.latitude;
              lng = geoData.longitude;
              ipCache.current[attackerIp] = { lat, lng };
            } else {
              console.warn(`[WorldMap] Internal GeoIP lookup failed for IP: ${attackerIp} - Reason: ${geoData.message}`);
              return;
            }
          } catch (fetchErr) {
             console.error("[WorldMap] Internal API Fetch Error:", fetchErr);
             return;
          }
        }

        if (lat && lng) {
          const infoText = `
            <b>Source IP:</b> ${attackerIp}<br/>
            <b>Attack Type:</b> ${attackType}<br/>
            <b>Target IP:</b> ${targetIp}
          `;
          addAttackMarker(lat, lng, infoText);
        }

      } catch (error) {
        console.error("[WorldMap] Error processing alert payload:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[WorldMap] WebSocket error observed:", error);
    };

    return () => {
      if (ws.readyState === 1) { 
        ws.close();
      }
    };
  }, []);

  // ==========================================
  // 4. MAIN RETURN
  // ==========================================
  return (
    <div className="relative z-0 w-full h-full min-h-[500px]">
      <div ref={mapContainerRef} className="w-full h-full rounded-xl border border-[#3e3e3e]" />
    </div>
  );
};

export default MapSecurity;