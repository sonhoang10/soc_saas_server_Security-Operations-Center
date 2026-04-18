import os
import re
import json
import time
import logging
import datetime
import asyncio
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# ================= CẤU HÌNH LOGGING =================
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - [%(levelname)s] - %(message)s'
)
logger = logging.getLogger(__name__)

# ================= ĐỌC BIẾN MÔI TRƯỜNG =================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

WEB_BACKEND_URL = os.getenv("WEB_BACKEND_URL", "http://localhost:8000/api/alerts")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "flux-soc-internal-secret-2026") 
AGENT_PORT = os.getenv("AGENT_PORT", "8001")
WHITELIST_IPS = os.getenv("WHITELIST_IPS", "127.0.0.1,143.198.82.147").split(",")
BAN_HISTORY_FILE = os.path.join(BASE_DIR, os.getenv("BAN_HISTORY_FILE", "banned_ips_history.txt"))

TIME_WINDOW_SECONDS = int(os.getenv("TIME_WINDOW_SECONDS", 60))
MAX_FAILURES = int(os.getenv("MAX_FAILURES", 5))
DDOS_WINDOW_SECONDS = int(os.getenv("DDOS_WINDOW_SECONDS", 10))
DDOS_MAX_REQUESTS = int(os.getenv("DDOS_MAX_REQUESTS", 100))

# ================= KHO TRẠNG THÁI & KHÓA AN TOÀN =================
violation_history = {} 
traffic_monitor = {}   
blocked_ips = set()    
auto_ban_enabled = False 

# Bộ đếm Combo
ddos_multiplier = {}  
bf_multiplier = {}
alert_cooldowns = {} 
ALERT_MUTE_SECONDS = 30 

# Khóa an toàn chống Race Condition khi đọc/ghi file Ban History
file_lock = asyncio.Lock()

SQLI_PATTERN = re.compile(
    r"(?i)" 
    r"(\b(OR|AND|WHERE|HAVING)\b|\|\||&&)\s*(.?\w+.?\s*(=|>|<|>=|<=|LIKE)\s*.?\w+.?|\d+\s*(=|>|<|>=|<=)\s*\d+)|"
    r"(\b(UNION\s+SELECT|SELECT\s+.*|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+(TABLE|DATABASE)|ALTER\s+TABLE)\b)|"
    r"(\b(information_schema|mysql\.user|sys\.tables|pg_shadow)\b)|"
    r"(\b(WAITFOR\s+DELAY|SLEEP\(|BENCHMARK\()\b)|"
    r"(--|–|—|#|/\*.*\*/)"
)

async def memory_cleanup_task():
    """Trình dọn rác (Garbage Collector) dọn dẹp RAM mỗi 60s"""
    while True:
        await asyncio.sleep(60)
        current_time = time.time()
        
        # Dọn dẹp Hàng đợi (Cộng thêm buffer 60s để không xóa log trễ)
        keys_to_del_bf = [ip for ip, ts in violation_history.items() if current_time - ts[-1] > TIME_WINDOW_SECONDS + 60]
        for k in keys_to_del_bf: violation_history.pop(k, None)
            
        keys_to_del_ddos = [ip for ip, ts in traffic_monitor.items() if current_time - ts[-1] > DDOS_WINDOW_SECONDS + 60]
        for k in keys_to_del_ddos: traffic_monitor.pop(k, None)
        
        # Dọn dẹp Multiplier (Reset Combo về 0)
        keys_to_del_ddos_mult = [ip for ip, data in ddos_multiplier.items() if current_time - data["last_trigger"] > DDOS_WINDOW_SECONDS * 2]
        for k in keys_to_del_ddos_mult: ddos_multiplier.pop(k, None)
            
        keys_to_del_bf_mult = [ip for ip, data in bf_multiplier.items() if current_time - data["last_trigger"] > TIME_WINDOW_SECONDS * 2]
        for k in keys_to_del_bf_mult: bf_multiplier.pop(k, None)
        
        # Dọn dẹp Mute Cooldown
        keys_to_del_mute = [ip for ip, last_alert in alert_cooldowns.items() if current_time - last_alert > ALERT_MUTE_SECONDS]
        for k in keys_to_del_mute: alert_cooldowns.pop(k, None)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Đọc danh sách Ban cũ khi khởi động (Không cần Lock vì ứng dụng mới boot)
    if os.path.exists(BAN_HISTORY_FILE):
        with open(BAN_HISTORY_FILE, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.split("|")
                if len(parts) >= 3: 
                    blocked_ips.add((parts[1].strip(), parts[2].strip()))
    
    headers = {"X-Internal-Token": INTERNAL_API_KEY}
    app.state.http_client = httpx.AsyncClient(headers=headers, timeout=5.0)
    cleanup_task = asyncio.create_task(memory_cleanup_task())
    
    yield
    
    cleanup_task.cancel()
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"],
)

# ================= KỸ THUẬT TRÍCH XUẤT & KIỂM TRA =================
def extract_attacker_ip(log_data: dict, victim_server_ip: str) -> str:
    raw_str = json.dumps(log_data)
    ips = re.findall(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b", raw_str)
    for ip in ips:
        if ip == victim_server_ip or ip in ["127.0.0.1", "0.0.0.0"]: 
            continue
        if ip.startswith(("10.", "192.168.")) or re.match(r"^172\.(1[6-9]|2[0-9]|3[0-1])\.", ip): 
            continue
        return ip
    return "Unknown"

def check_ddos_flood(ip: str, event_time: float):
    if ip == "Unknown" or not ip: 
        return False, 0
    if ip not in traffic_monitor: 
        traffic_monitor[ip] = []
    
    traffic_monitor[ip].append(event_time)
    traffic_monitor[ip] = [t for t in traffic_monitor[ip] if event_time - t <= DDOS_WINDOW_SECONDS]
    
    if len(traffic_monitor[ip]) >= DDOS_MAX_REQUESTS:
        # Reset Hàng Đợi (Dọn kho chuẩn bị đếm đợt tiếp theo)
        traffic_monitor[ip].clear() 
        
        if ip not in ddos_multiplier:
            ddos_multiplier[ip] = {"count": 1, "last_trigger": event_time}
        else:
            # Nếu tấn công tiếp trong vòng gấp đôi thời gian cửa sổ -> Tăng Combo
            if event_time - ddos_multiplier[ip]["last_trigger"] <= DDOS_WINDOW_SECONDS * 2:
                ddos_multiplier[ip]["count"] += 1
            else:
                ddos_multiplier[ip]["count"] = 1
            ddos_multiplier[ip]["last_trigger"] = event_time
            
        return True, ddos_multiplier[ip]["count"]
        
    return False, 0

def check_brute_force_threshold(ip: str, event_time: float):
    if ip == "Unknown" or not ip: 
        return False, 0
    if ip not in violation_history: 
        violation_history[ip] = []
    
    violation_history[ip].append(event_time)
    violation_history[ip] = [t for t in violation_history[ip] if event_time - t <= TIME_WINDOW_SECONDS]
    
    if len(violation_history[ip]) >= MAX_FAILURES:
        violation_history[ip].clear()
        
        if ip not in bf_multiplier:
            bf_multiplier[ip] = {"count": 1, "last_trigger": event_time}
        else:
            if event_time - bf_multiplier[ip]["last_trigger"] <= TIME_WINDOW_SECONDS * 2:
                bf_multiplier[ip]["count"] += 1
            else:
                bf_multiplier[ip]["count"] = 1
            bf_multiplier[ip]["last_trigger"] = event_time
            
        return True, bf_multiplier[ip]["count"]
        
    return False, 0

# ================= HÀNH ĐỘNG PHÒNG THỦ =================
async def block_ip_action(attacker_ip: str, reason: str, target_server_ip: str):
    if attacker_ip == target_server_ip or (attacker_ip, target_server_ip) in blocked_ips or attacker_ip in WHITELIST_IPS: 
        return True
    
    logger.info(f"GỌI AGENT: Chặn {attacker_ip} trên {target_server_ip}")
    try:
        agent_url = f"http://{target_server_ip}:{AGENT_PORT}/agent/ban"
        async with httpx.AsyncClient() as client:
            response = await client.post(agent_url, json={"ip": attacker_ip}, timeout=5.0)
            
        if response.status_code == 200:
            blocked_ips.add((attacker_ip, target_server_ip))
            now = (datetime.datetime.now() + datetime.timedelta(hours=7)).strftime("%Y-%m-%d %H:%M:%S")
            
            # Khóa an toàn khi ghi file
            async with file_lock:
                with open(BAN_HISTORY_FILE, "a", encoding="utf-8") as f:
                    f.write(f"{now} | {attacker_ip} | {target_server_ip} | {reason}\n")
            return True
        else: 
            raise Exception(f"Agent từ chối lệnh Ban: {response.text}")
    except Exception as e: 
        raise Exception(f"Không kết nối được Agent: {e}")

async def unblock_ip_action(attacker_ip: str, target_server_ip: str):
    if (attacker_ip, target_server_ip) not in blocked_ips: 
        return True
        
    logger.info(f"GỌI AGENT: Mở khóa {attacker_ip} trên {target_server_ip}")
    try:
        agent_url = f"http://{target_server_ip}:{AGENT_PORT}/agent/unban"
        async with httpx.AsyncClient() as client:
            response = await client.post(agent_url, json={"ip": attacker_ip}, timeout=5.0)
            
        if response.status_code == 200:
            blocked_ips.discard((attacker_ip, target_server_ip))
            
            # Khóa an toàn khi đọc/ghi file
            async with file_lock:
                if os.path.exists(BAN_HISTORY_FILE):
                    with open(BAN_HISTORY_FILE, "r", encoding="utf-8") as f: 
                        lines = f.readlines()
                    with open(BAN_HISTORY_FILE, "w", encoding="utf-8") as f:
                        for line in lines:
                            if f"| {attacker_ip} | {target_server_ip} |" not in line: 
                                f.write(line)
            return True
        else: 
            raise Exception(f"Agent từ chối lệnh Unban: {response.text}")
    except Exception as e: 
        raise Exception("Lỗi kết nối Agent")

# ================= API ENDPOINTS =================
class CleanLogPayload(BaseModel):
    timestamp: str
    target_ip: str 
    log_type: str
    action: str
    username: str
    raw_data: str 

class IPPayload(BaseModel): 
    ip: str
    target_server_ip: str
    reason: str = "Manual Ban from Dashboard"

class AutoBanPayload(BaseModel): 
    enabled: bool

@app.get("/api/autoban/status")
def get_autoban_status(): 
    return {"enabled": auto_ban_enabled}

@app.post("/api/autoban/toggle")
def toggle_autoban(payload: AutoBanPayload):
    global auto_ban_enabled
    auto_ban_enabled = payload.enabled
    return {"message": "Success", "enabled": auto_ban_enabled}

@app.post("/api/analyze")
async def analyze_log(payload: CleanLogPayload, bg_tasks: BackgroundTasks):
    try:
        victim_server_ip = payload.target_ip 
        log_data = json.loads(payload.raw_data)
        attacker_ip = extract_attacker_ip(log_data, victim_server_ip)

        if not attacker_ip or attacker_ip == "Unknown" or attacker_ip == victim_server_ip: 
            return {"status": "Ignored"}
        if (attacker_ip, victim_server_ip) in blocked_ips: 
            return {"status": "Ignored"}

        # ĐỒNG BỘ MÚI GIỜ CHUẨN XÁC (Tránh lỗi Event Time bị lệch 7 tiếng)
        try:
            event_dt = datetime.datetime.strptime(payload.timestamp, "%Y-%m-%d %H:%M:%S")
            event_time = event_dt.replace(tzinfo=datetime.timezone.utc).timestamp()
        except Exception:
            event_time = time.time()

        now_str = (datetime.datetime.now() + datetime.timedelta(hours=7)).strftime("%Y-%m-%d %H:%M:%S")

        async def trigger_alert(reason, alert_type, msg, bypass_cooldown=False):
            if not bypass_cooldown:
                current_time = time.time()
                last_alert_time = alert_cooldowns.get(attacker_ip, 0)
                if current_time - last_alert_time < ALERT_MUTE_SECONDS: return
                alert_cooldowns[attacker_ip] = current_time

            if auto_ban_enabled:
                try: 
                    await block_ip_action(attacker_ip, reason, victim_server_ip)
                except Exception as e: 
                    logger.warning(f"Auto-ban failed: {e}")
                
            alert_data = {
                "time": now_str, "level": "Critical", "type": alert_type, 
                "ip": attacker_ip, "target_server": victim_server_ip, "server": victim_server_ip,        
                "analysis": msg
            }
            await app.state.http_client.post(WEB_BACKEND_URL, json=alert_data)

        raw_str_lower = str(log_data).lower()

        # 1. BẮT L7 DDOS 
        is_ddos, ddos_count = check_ddos_flood(attacker_ip, event_time)
        if payload.log_type in ["nginx_access", "web_app_login"] and is_ddos:
            action_text = "(Đã tự động Ban)" if auto_ban_enabled else "(Chờ Admin)"
            count_str = f" [Lần {ddos_count}]" if ddos_count > 1 else ""
            msg = f"DDOS > {DDOS_MAX_REQUESTS} req/10s.{count_str} {action_text}"
            bg_tasks.add_task(trigger_alert, "L7 DDoS Flood", "L7 DDoS / Flood Attack", msg, bypass_cooldown=True)
            return {"status": "Alert triggered"}

        # 2. BẮT WEB APP ATTACKS 
        if payload.log_type == "web_app_login":
            app_data = log_data.get("app_data", {})
            password = str(app_data.get("password_tried", "")) 
            username = str(app_data.get("username", payload.username))
            is_failed_login = payload.action == "login_failed" or "fail" in raw_str_lower or "error" in raw_str_lower or "invalid" in raw_str_lower

            if SQLI_PATTERN.search(username) or SQLI_PATTERN.search(password):
                action_text = "(Đã tự động Ban)" if auto_ban_enabled else "(Chờ Admin)"
                bg_tasks.add_task(trigger_alert, "SQL Injection Web", "SQL Injection Web", f"SQLi: IP {attacker_ip} tấn công. {action_text}", bypass_cooldown=False)
                return {"status": "Alert triggered"}
            
            is_bf, bf_count = check_brute_force_threshold(attacker_ip, event_time)
            if is_failed_login and is_bf:
                action_text = "(Đã tự động Ban)" if auto_ban_enabled else "(Chờ Admin)"
                count_str = f" [Lần {bf_count}]" if bf_count > 1 else ""
                bg_tasks.add_task(trigger_alert, "Brute-force Web App", "Brute-force Web App", f"Web: {attacker_ip} sai {MAX_FAILURES} lần.{count_str} {action_text}", bypass_cooldown=True)
                return {"status": "Alert triggered"}

        # 3. BẮT SSH BRUTE-FORCE
        if payload.log_type == "os_ssh_auth":
            is_ssh_failed = payload.action in ["ssh_failed_login", "ssh_invalid_user"] or "fail" in raw_str_lower or "invalid" in raw_str_lower or "disconnect" in raw_str_lower
            is_ssh_bf, ssh_count = check_brute_force_threshold(attacker_ip, event_time)
            if is_ssh_failed and is_ssh_bf:
                action_text = "(Đã tự động Ban)" if auto_ban_enabled else "(Chờ Admin)"
                count_str = f" [Lần {ssh_count}]" if ssh_count > 1 else ""
                bg_tasks.add_task(trigger_alert, "Brute-force SSH", "Brute-force SSH", f"SSH: {attacker_ip} sai {MAX_FAILURES} lần.{count_str} {action_text}", bypass_cooldown=True)
                return {"status": "Alert triggered"}

        return {"status": "Normal"}
    except Exception as e: 
        logger.error(f"Lỗi Analyze: {e}")
        return {"status": "Error", "details": str(e)}

@app.get("/api/banned_ips")
def get_banned_ips():
    ips = []
    if os.path.exists(BAN_HISTORY_FILE):
        with open(BAN_HISTORY_FILE, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.split("|")
                if len(parts) >= 4:
                    ips.append({"time": parts[0].strip(), "ip": parts[1].strip(), "target_server": parts[2].strip(), "reason": parts[3].strip()})
    return {"banned": ips[::-1]} 

@app.post("/api/ban")
async def manual_ban(payload: IPPayload):
    try:
        await block_ip_action(payload.ip, payload.reason, payload.target_server_ip)
        return {"message": "Lệnh Ban thành công."}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/unban")
async def manual_unban(payload: IPPayload):
    try:
        await unblock_ip_action(payload.ip, payload.target_server_ip)
        return {"message": "Lệnh Unban thành công."}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))