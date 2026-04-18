import os
import sys
import json
import logging
import hashlib
import time
from datetime import datetime, timezone
from kafka import KafkaConsumer
import clickhouse_connect
import httpx
from dotenv import load_dotenv

# ================= PATH RESOLUTION =================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))

from sqlalchemy.orm import Session
from api.database import SessionLocal
from api.models import Server

# ================= LOGGING CONFIGURATION =================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [KAFKA_CONSUMER] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================= ENVIRONMENT VARIABLES =================
KAFKA_SERVER = os.getenv("KAFKA_SERVER", "143.198.82.147")
KAFKA_PORT = os.getenv("KAFKA_PORT", "9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "soc-raw-logs")

CH_HOST = os.getenv("CH_HOST", "localhost")
CH_PORT = int(os.getenv("CH_PORT", 8123))
CH_USER = os.getenv("CH_USER", "default")
CH_PASS = os.getenv("CH_PASS", "")

LOGIC_ENGINE_URL = os.getenv("LOGIC_ENGINE_URL", "http://localhost:8001/api/analyze")

VALIDATED_AGENTS_CACHE = {}

def get_clickhouse_client():
    try:
        client = clickhouse_connect.get_client(
            host=CH_HOST,
            port=CH_PORT,
            username=CH_USER,
            password=CH_PASS
        )
        client.command("""
            CREATE TABLE IF NOT EXISTS soc_db.raw_logs (
                id UUID DEFAULT generateUUIDv4(),
                timestamp DateTime,
                server_id String,
                team_id String,
                target_ip String,
                log_type String,
                action String,
                username String,
                raw_data String
            ) ENGINE = MergeTree()
            ORDER BY (timestamp, server_id, target_ip)
        """)
        return client
    except Exception as e:
        logger.error(f"ClickHouse Connection Failed: {e}")
        return None

def verify_and_enrich_log(db: Session, plain_text_token: str):
    if not plain_text_token:
        return None

    hashed_token = hashlib.sha256(plain_text_token.encode('utf-8')).hexdigest()

    if hashed_token in VALIDATED_AGENTS_CACHE:
        return VALIDATED_AGENTS_CACHE[hashed_token]

    server = db.query(Server).filter(Server.agent_token == hashed_token).first()
    if not server:
        return None

    if server.monitor_status != "active":
        server.monitor_status = "active"
        server.status = "active"
        db.commit()
        logger.info(f"[KAFKA HEARTBEAT] Monitor on {server.ip_address} is ACTIVE.")

    agent_info = {
        "server_id": str(server.id),
        "team_id": str(server.team_id),
        "ip_address": server.ip_address
    }
    VALIDATED_AGENTS_CACHE[hashed_token] = agent_info
    
    return agent_info

def start_consumer():
    ch_client = get_clickhouse_client()
    if not ch_client:
        return

    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=[f"{KAFKA_SERVER}:{KAFKA_PORT}"],
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='soc-log-processors',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        logger.info(f"🎧 Kafka Consumer listening on {KAFKA_SERVER}:{KAFKA_PORT}")
    except Exception as e:
        logger.critical(f"Kafka Connection Failed: {e}")
        return

    http_client = httpx.Client()
    db = SessionLocal()

    try:
        for message in consumer:
            raw_log = message.value
            
            # Fix JSON Parsing Mismatch
            agent_token = raw_log.get("flux_agent_token") or raw_log.get("fields", {}).get("flux_agent_token")
            log_type = raw_log.get("log_type") or raw_log.get("fields", {}).get("log_type", "unknown")

            agent_info = verify_and_enrich_log(db, agent_token)
            if not agent_info:
                continue

            action = "unknown"
            username = "unknown"
            
            if log_type == "os_ssh_auth":
                msg = raw_log.get("message", "")
                if "Failed password" in msg:
                    action = "ssh_failed_login"
                    parts = msg.split("for ")
                    if len(parts) > 1:
                        username = parts[1].split(" ")[0]
            elif log_type == "nginx_access":
                action = "http_request"
            
            # SỬA LỖI TẠI ĐÂY: Sử dụng đối tượng datetime thay vì string
            current_time_dt = datetime.now(timezone.utc).replace(tzinfo=None)

            clean_payload = {
                "timestamp": current_time_dt, # Chuyền object datetime vào ClickHouse
                "server_id": agent_info["server_id"],
                "team_id": agent_info["team_id"],
                "target_ip": agent_info["ip_address"],
                "log_type": log_type,
                "action": action,
                "username": username,
                "raw_data": json.dumps(raw_log)
            }

            try:
                ch_client.insert(
                    'soc_db.raw_logs',
                    [[
                        clean_payload["timestamp"],
                        clean_payload["server_id"],
                        clean_payload["team_id"],
                        clean_payload["target_ip"],
                        clean_payload["log_type"],
                        clean_payload["action"],
                        clean_payload["username"],
                        clean_payload["raw_data"]
                    ]],
                    column_names=['timestamp', 'server_id', 'team_id', 'target_ip', 'log_type', 'action', 'username', 'raw_data']
                )
            except Exception as ch_err:
                logger.error(f"ClickHouse Insert Error: {ch_err}")

            try:
                # Chuyển đổi timestamp sang string khi gửi API cho Logic Engine
                api_payload = clean_payload.copy()
                api_payload["timestamp"] = api_payload["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
                
                headers = {"X-Internal-Token": os.getenv("INTERNAL_API_KEY", "flux-soc-internal-secret-2026")}
                http_client.post(LOGIC_ENGINE_URL, json=api_payload, headers=headers, timeout=2.0)
            except Exception as http_err:
                logger.error(f"Logic Engine Routing Error: {http_err}")

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        http_client.close()
        db.close()
        if ch_client:
            ch_client.close()

if __name__ == "__main__":
    start_consumer()