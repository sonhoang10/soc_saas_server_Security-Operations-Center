# File: core/geoip_engine.py
import os
import logging
import requests
import IP2Location

logger = logging.getLogger(__name__)

class GeoIPEngine:
    """
    Enterprise-grade IP Geolocation Engine with High Availability.
    Implements a primary local BIN database lookup (sub-millisecond latency) 
    and a secondary external API fallback (ipwho.is) to guarantee resolution.
    """
    _instance = None
    _db = None
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GeoIPEngine, cls).__new__(cls)
        return cls._instance

    def initialize(self, db_path: str):
        """
        Initializes the primary local IP2Location database connection.
        """
        if self._is_initialized:
            return

        if not os.path.exists(db_path):
            logger.warning(f"[GeoIPEngine] Local BIN database not found at {db_path}. Engine will rely ENTIRELY on the external API fallback.")
            return

        try:
            self._db = IP2Location.IP2Location(db_path)
            self._is_initialized = True
            logger.info("[GeoIPEngine] Primary IP2Location database loaded into memory.")
        except Exception as e:
            logger.error(f"[GeoIPEngine] Primary initialization failed: {e}. Engine will rely on fallback.")

    def resolve(self, ip_address: str) -> dict:
        """
        Resolves an IP address using a Two-Tier Strategy:
        Tier 1: Local IP2Location BIN Database (Fast, Zero Network I/O).
        Tier 2: External ipwho.is API (Fallback for missing/uninitialized local data).
        """
        # TIER 1: Primary Local Lookup
        if self._is_initialized and self._db:
            try:
                record = self._db.get_all(ip_address)
                # Rationale: Ensure the record is valid and not a zero-coordinate default return
                if record and hasattr(record, 'latitude') and record.latitude != 0.0:
                    return {
                        "success": True,
                        "latitude": float(record.latitude),
                        "longitude": float(record.longitude),
                        "country": record.country_short,
                        "city": record.city,
                        "source": "local_db"
                    }
            except Exception as e:
                logger.warning(f"[GeoIPEngine] Local lookup failed for {ip_address}: {e}. Triggering fallback.")

        # TIER 2: External API Fallback
        return self._fallback_resolve(ip_address)

    def _fallback_resolve(self, ip_address: str) -> dict:
        """
        Executes an HTTP request to ipwho.is with strict timeouts.
        Rationale: External HTTP calls block the executing thread. A strict timeout (3s) 
        prevents a degraded third-party service from causing a cascade failure or memory leak 
        in the SOC backend's event loop.
        """
        try:
            logger.info(f"[GeoIPEngine] Initiating external API fallback for IP: {ip_address}")
            response = requests.get(f"https://ipwho.is/{ip_address}", timeout=3.0)
            
            # Rationale: Fail fast on HTTP protocol errors (e.g., 500, 403) before parsing JSON
            response.raise_for_status()
            data = response.json()

            if data.get("success") is True:
                return {
                    "success": True,
                    "latitude": float(data.get("latitude")),
                    "longitude": float(data.get("longitude")),
                    "country": data.get("country_code"),
                    "city": data.get("city"),
                    "source": "ipwhois_api"
                }
            else:
                error_msg = data.get("message", "Unknown API error")
                logger.warning(f"[GeoIPEngine] External API returned failure logic for {ip_address}: {error_msg}")
                return {"success": False, "message": f"Fallback failed: {error_msg}"}

        except requests.exceptions.Timeout:
            logger.error(f"[GeoIPEngine] External API fallback TIMEOUT for IP: {ip_address}")
            return {"success": False, "message": "Fallback API timeout."}
        except Exception as e:
            logger.error(f"[GeoIPEngine] External API fallback ERROR for IP {ip_address}: {e}")
            return {"success": False, "message": "Fallback API connection error."}

    def shutdown(self):
        """
        Safely releases file handles and memory buffers.
        """
        if self._db:
            self._db.close()
            self._is_initialized = False
            logger.info("[GeoIPEngine] Database connection closed.")

# Instantiate the singleton instance for application-wide use
geoip_engine = GeoIPEngine()