import os
import logging
import uuid
import re
import secrets
import hashlib
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query, Header
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, constr, IPvAnyAddress
import clickhouse_connect
from dotenv import load_dotenv
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from api.database import get_db, test_db_connection
from api.models import User, Team, TeamMember, Server
from api.auth_utils import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user, 
    verify_team_access,
    SECRET_KEY,
    ALGORITHM
)
from api.crypto_utils import generate_enterprise_key

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [WEB_BACKEND] - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ================= INTERNAL SECURITY =================
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "flux-soc-internal-secret-2026")
api_key_header = APIKeyHeader(name="X-Internal-Token", auto_error=True)

def verify_internal_service(api_key: str = Depends(api_key_header)):
    """
    Rationale: Validates machine-to-machine communication integrity.
    Prevents unauthorized endpoints from injecting arbitrary alerts into the WebSocket broadcast stream.
    """
    if api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access Denied: Invalid Internal Token."
        )

# ================= AGENT AUTHENTICATION MIDDLEWARE =================
security = HTTPBearer()

def verify_agent_auth(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    Rationale: Authenticates external client agents (Filebeat/Defender) using SHA-256 hashed tokens.
    Token hashes are stored in the database to mitigate exposure risks if the primary database is compromised.
    """
    plain_text_token = credentials.credentials
    incoming_hash = hashlib.sha256(plain_text_token.encode('utf-8')).hexdigest()
    
    server = db.query(Server).filter(Server.agent_token == incoming_hash).first()
    if not server:
        raise HTTPException(status_code=401, detail="Invalid or Revoked Agent Token")
    return server

ch_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ch_client
    try:
        logger.info("Connecting to ClickHouse...")
        ch_client = clickhouse_connect.get_client(
            host=os.getenv("CH_HOST", "localhost"),
            port=int(os.getenv("CH_PORT", 8123)),
            username=os.getenv("CH_USER", "default"),
            password=os.getenv("CH_PASS", "")
        )
        logger.info("ClickHouse connection established.")
    except Exception as e:
        logger.error(f"ClickHouse initialization failed: {e}")

    logger.info("Connecting to PostgreSQL...")
    is_pg_ok, pg_msg = test_db_connection()
    if is_pg_ok:
        logger.info(pg_msg)
    else:
        logger.error(pg_msg)
        
    yield
    logger.info("Closing ClickHouse connection...")
    ch_client = None

app = FastAPI(title="SOC Web Backend", lifespan=lifespan)

origins_str = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = origins_str.split(",") if origins_str != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[dict] = []

    async def connect(self, websocket: WebSocket, allowed_ips: List[str]):
        await websocket.accept()
        self.active_connections.append({"ws": websocket, "ips": allowed_ips})

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [conn for conn in self.active_connections if conn["ws"] != websocket]

    async def broadcast(self, message: dict):
        target_ip = message.get("target_server", "Unknown")
        for connection in self.active_connections:
            ws = connection["ws"]
            allowed_ips = connection["ips"]
            if "*" in allowed_ips or target_ip in allowed_ips:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"WS broadcast error: {e}")

manager = ConnectionManager()

# ================= VALIDATION SCHEMAS =================
class AlertPayload(BaseModel):
    time: str
    level: str
    type: str
    ip: str
    analysis: str
    target_ip: Optional[str] = "Unknown"
    target_server: Optional[str] = "Unknown"
    server: Optional[str] = "Unknown"

@app.post("/api/alerts", dependencies=[Depends(verify_internal_service)])
async def receive_alert(alert: AlertPayload):
    logger.warning(f"Red Alert: {alert.type} from IP {alert.ip} targeting {alert.target_server}")
    await manager.broadcast(alert.model_dump())
    return {"status": "Broadcasted"}

@app.websocket("/ws/alerts")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: Optional[str] = Query(None), 
    db: Session = Depends(get_db)
):
    """
    Rationale: Establishes a secure WebSocket connection for real-time alert streaming.
    Utilizes JWT decoding to enforce Data Isolation: Users only receive WebSocket frames relevant to their assigned server IPs.
    """
    allowed_ips = []
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            user = db.query(User).filter(User.email == email).first()
            if user:
                if getattr(user, "is_superadmin", False):
                    allowed_ips = ["*"] 
                else:
                    memberships = db.query(TeamMember).filter(TeamMember.user_id == user.id).all()
                    team_ids = [m.team_id for m in memberships]
                    servers = db.query(Server).filter(Server.team_id.in_(team_ids)).all()
                    allowed_ips = [re.sub(r"^https?://", "", s.ip_address).rstrip("/") for s in servers]
        except JWTError:
            pass 

    await manager.connect(websocket, allowed_ips)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/logs")
def get_all_logs(
    team_id: str,
    limit: int = 50, 
    membership: TeamMember = Depends(verify_team_access),
    db: Session = Depends(get_db)
):
    if not ch_client:
        return {"error": "ClickHouse database unavailable"}
    
    safe_limit = min(max(1, limit), 1000) 
    try:
        servers = db.query(Server).filter(Server.team_id == team_id).all()
        if not servers:
            return {"logs": []}
            
        allowed_ips = [re.sub(r"^https?://", "", s.ip_address).rstrip("/") for s in servers]
        ips_tuple = tuple(allowed_ips)
        
        if len(allowed_ips) == 1:
            query = f"SELECT timestamp, target_ip, log_type, action, username FROM soc_db.raw_logs WHERE target_ip = '{allowed_ips[0]}' ORDER BY timestamp DESC LIMIT {safe_limit}"
        else:
            query = f"SELECT timestamp, target_ip, log_type, action, username FROM soc_db.raw_logs WHERE target_ip IN {ips_tuple} ORDER BY timestamp DESC LIMIT {safe_limit}"
            
        result = ch_client.query(query)
        logs = []
        for row in result.result_rows:
            logs.append({
                "timestamp": str(row[0]) if row[0] else "",
                "target_ip": str(row[1]) if row[1] else "-",
                "log_type": str(row[2]) if row[2] else "N/A",
                "action": str(row[3]) if row[3] else "Unknown",
                "username": str(row[4]) if row[4] else "-"
            })
        return {"logs": logs} 
    except Exception as e:
        logger.error(f"ClickHouse query error: {e}")
        return {"error": "Internal server error"}

# ================= AUTHENTICATION & ORGANIZATION MANAGEMENT =================
class UserCreate(BaseModel):
    email: str = Field(..., max_length=255, pattern=r"^\S+@\S+\.\S+$")
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)

class TeamRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    unique_name: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-z0-9-]+$")
    company_email: str = Field(..., max_length=255)
    company_phone: str = Field(..., max_length=50)
    industry: str = Field(..., max_length=100)
    company_size: str = Field(..., max_length=50)
    timezone_region: str = Field(..., max_length=100)
    use_case: str = Field(..., max_length=100)
    tax_id: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)

class TeamActionRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")

@app.post("/api/auth/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user_exists = db.query(User).filter(User.email == user_data.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        phone=user_data.phone
    )
    db.add(new_user)
    db.commit()
    return {"message": "Account created successfully. Please login to proceed."}

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "user_id": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me")
def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": getattr(current_user, "username", ""),
        "phone": getattr(current_user, "phone", None),
        "is_superadmin": getattr(current_user, "is_superadmin", False)
    }

@app.post("/api/teams/request")
def request_team(request_data: TeamRegisterRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Rationale: Processes a tenant (organization) creation request.
    Defaults to 'pending' status requiring superadmin approval to prevent abuse and manage resource allocation.
    """
    existing_team = db.query(Team).filter(Team.unique_name == request_data.unique_name).first()
    if existing_team:
        raise HTTPException(status_code=400, detail="Organization unique name already exists.")

    new_team = Team(
        name=request_data.name,
        unique_name=request_data.unique_name,
        company_email=request_data.company_email,
        company_phone=request_data.company_phone,
        industry=request_data.industry,
        company_size=request_data.company_size,
        timezone_region=request_data.timezone_region,
        use_case=request_data.use_case,
        tax_id=request_data.tax_id,
        description=request_data.description,
        status="pending"
    )
    db.add(new_team)
    db.flush()

    owner_member = TeamMember(
        user_id=current_user.id,
        team_id=new_team.id,
        role="owner"
    )
    db.add(owner_member)
    db.commit()
    return {"message": "Organization request submitted successfully. Pending admin approval."}

@app.get("/api/admin/teams/pending")
def get_pending_teams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Rationale: Retrieves all metadata for pending tenants to allow informed administrative decisions.
    Enforces strict Superadmin RBAC.
    """
    if not getattr(current_user, "is_superadmin", False):
        raise HTTPException(status_code=403, detail="Superadmin privileges required.")

    teams = db.query(Team).filter(Team.status == "pending").all()
    result = []
    for team in teams:
        owner_email = "Unknown"
        owner = db.query(TeamMember).filter(TeamMember.team_id == team.id, TeamMember.role == "owner").first()
        if owner:
            user = db.query(User).filter(User.id == owner.user_id).first()
            if user:
                owner_email = user.email

        result.append({
            "id": str(team.id),
            "name": team.name,
            "unique_name": team.unique_name,
            "company_email": team.company_email,
            "company_phone": team.company_phone, 
            "industry": team.industry,
            "company_size": team.company_size, 
            "timezone_region": team.timezone_region, 
            "tax_id": team.tax_id, 
            "use_case": team.use_case, 
            "description": team.description,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "owner_email": owner_email
        })
    return {"teams": result}

@app.post("/api/admin/teams/{team_id}/action")
def process_team_request(team_id: str, payload: TeamActionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Rationale: Handles state transitions for tenant onboarding (approval or rejection).
    """
    if not getattr(current_user, "is_superadmin", False):
        raise HTTPException(status_code=403, detail="Superadmin privileges required.")

    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Organization not found.")

    team.status = "active" if payload.action == "approve" else "rejected"
    db.commit()
    return {"message": f"Organization successfully {team.status}."}

@app.get("/api/teams/my-teams")
def get_my_teams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(TeamMember).filter(TeamMember.user_id == current_user.id).all()
    teams = []
    for m in memberships:
        team = db.query(Team).filter(Team.id == m.team_id).first()
        if team:
            teams.append({
                "id": str(team.id),
                "name": team.name,
                "role": m.role,
                "status": team.status 
            })
    return {"teams": teams}

class ServerCreateRequest(BaseModel):
    team_id: str
    name: str = Field(..., min_length=2, max_length=150)
    ip_address: str = Field(..., min_length=3, max_length=255, pattern=r"^[a-zA-Z0-9.-]+$")

@app.post("/api/servers/create")
def create_server(
    request: ServerCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id,
        TeamMember.team_id == request.team_id
    ).first()
    
    if not membership or membership.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to create servers.")

    team = db.query(Team).filter(Team.id == request.team_id).first()
    current_server_count = db.query(Server).filter(Server.team_id == team.id).count()
    if current_server_count >= team.max_servers:
        raise HTTPException(status_code=403, detail=f"Resource limit reached. Upgrade your plan.")

    new_server = Server(
        team_id=team.id,
        name=request.name,
        ip_address=request.ip_address,
        agent_token=str(uuid.uuid4().hex)
    )
    db.add(new_server)
    db.commit()
    
    return {"message": "Server provisioned successfully", "server_id": str(new_server.id)}

@app.get("/api/servers/my-servers")
def get_organization_servers(
    team_id: str, 
    membership: TeamMember = Depends(verify_team_access), 
    db: Session = Depends(get_db)
):
    servers = db.query(Server).filter(Server.team_id == team_id).all()
    result = []
    for srv in servers:
        result.append({
            "id": str(srv.id),
            "name": srv.name,
            "ip_address": srv.ip_address,
            "status": srv.status,
            "monitor_status": getattr(srv, "monitor_status", "pending"),
            "defender_status": getattr(srv, "defender_status", "pending")
        })
    return {"servers": result, "your_role": membership.role}

# ================= AGENT DEPLOYMENT, KEY ROTATION & HEARTBEAT =================

class HeartbeatPayload(BaseModel):
    module: str

@app.post("/api/agent/heartbeat")
def agent_heartbeat(payload: HeartbeatPayload, server: Server = Depends(verify_agent_auth), db: Session = Depends(get_db)):
    if payload.module == "monitor":
        server.monitor_status = "active"
        server.status = "active" 
        logger.info(f"[HEARTBEAT] Monitor Module on {server.ip_address} is ACTIVE.")
    elif payload.module == "defender":
        server.defender_status = "active"
        logger.info(f"[HEARTBEAT] Defender Module on {server.ip_address} is ACTIVE.")
        
    db.commit()
    return {"status": "success", "message": f"{payload.module} is running and connected."}

@app.post("/api/servers/{server_id}/generate-token")
def generate_server_token(
    server_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server entity not found.")

    membership = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id,
        TeamMember.team_id == server.team_id
    ).first()

    if not membership or membership.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient RBAC permissions.")

    plain_text_key, hashed_key = generate_enterprise_key()
    
    server.agent_token = hashed_key
    server.status = "pending"
    server.monitor_status = "pending"
    server.defender_status = "pending"
    db.commit()

    return {
        "message": "Deployment token generated successfully.", 
        "agent_token": plain_text_key
    }

@app.get("/api/agent/install/{module_name}", response_class=PlainTextResponse)
def get_install_script(module_name: str):
    backend_host = os.getenv("MAIN_SERVER", "157.245.158.165") 
    kafka_host = os.getenv("KAFKA_SERVER", "143.198.82.147")
    kafka_port = os.getenv("KAFKA_PORT", "9092")
    kafka_topic = os.getenv("KAFKA_TOPIC", "soc-raw-logs")
    api_base_url = f"http://{backend_host}:8000"

    if module_name not in ["monitor", "defender"]:
        raise HTTPException(status_code=400, detail="Invalid module requested.")

    if module_name == "monitor":
        script = f"""#!/bin/bash
echo "=========================================================="
echo " INITIALIZING FLUX SOC MONITOR (REAL-TIME MODE) "
echo "=========================================================="
TOKEN=$1

if [ -z "$TOKEN" ]; then
    echo "ERROR: Deployment Token is missing."
    exit 1
fi

echo "[1/5] Preparing environment..."
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elastic-keyring.gpg --yes > /dev/null 2>&1
echo "deb [signed-by=/usr/share/keyrings/elastic-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list > /dev/null

echo "[2/5] Installing Filebeat..."
sudo apt-get update -qq > /dev/null 2>&1
sudo apt-get install filebeat -y -qq > /dev/null 2>&1

echo "[3/5] Configuring Data Pipeline (Instant Mode)..."
sudo mv /etc/filebeat/filebeat.yml /etc/filebeat/filebeat.yml.bak 2>/dev/null

cat << CONFIG | sudo tee /etc/filebeat/filebeat.yml > /dev/null
filebeat.inputs:
- type: filestream
  id: os-auth-logs
  enabled: true
  paths:
    - /var/log/auth.log
  scan_frequency: 1s
  close_inactive: 1m
  backoff.init: 100ms
  backoff.max: 500ms
  fields:
    log_type: "os_ssh_auth"
    flux_agent_token: "$TOKEN"  
  fields_under_root: true

- type: filestream
  id: web-nginx-logs
  enabled: true
  paths:
    - /var/log/nginx/access.log
  scan_frequency: 1s
  close_inactive: 1m
  backoff.init: 100ms
  backoff.max: 500ms
  fields:
    log_type: "nginx_access"
    flux_agent_token: "$TOKEN" 
  fields_under_root: true
  
- type: filestream
  id: web-pm2-logs
  enabled: true
  paths:
    - /root/.pm2/logs/web-login-out.log
  scan_frequency: 1s
  close_inactive: 1m
  backoff.init: 100ms
  backoff.max: 500ms
  fields:
    log_type: "web_app_login"
    flux_agent_token: "$TOKEN" 
  parsers:
    - ndjson:
        target: "app_data"
        add_error_key: true

processors:
  - add_host_metadata:
      netinfo.enabled: true

output.kafka:
  enabled: true
  hosts: ["{kafka_host}:{kafka_port}"]
  topic: "{kafka_topic}"
  partition.round_robin:
    reachable_only: false
  required_acks: 1
  compression: gzip
  max_message_bytes: 1000000

queue.mem:
  events: 4096
  flush.min_events: 1    
  flush.timeout: 0.1s    
CONFIG

echo "[4/5] Starting Flux Monitor Service..."
sudo systemctl daemon-reload
sudo systemctl enable filebeat > /dev/null 2>&1
sudo systemctl restart filebeat

echo "[5/5] Transmitting Heartbeat to SOC Engine..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{{"module": "monitor"}}' {api_base_url}/api/agent/heartbeat > /dev/null

echo -e "\\n=========================================================="
echo " REAL-TIME MONITORING ACTIVATED."
echo "=========================================================="
"""
    elif module_name == "defender":
        script = f"""#!/bin/bash
echo "=========================================================="
echo " INITIALIZING FLUX ACTIVE DEFENDER (IPS MODE) "
echo "=========================================================="
TOKEN=$1
if [ -z "$TOKEN" ]; then echo "ERROR: Missing Token"; exit 1; fi

sudo apt update -qq > /dev/null 2>&1
sudo apt install python3-pip python3.12-venv -y -qq > /dev/null 2>&1

mkdir -p /opt/flux_defender
cd /opt/flux_defender
python3 -m venv flux_env
source flux_env/bin/activate
pip install fastapi uvicorn pydantic httpx -q

cat << 'EOF' > defender_agent.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
app = FastAPI()
class IPPayload(BaseModel):
    ip: str
@app.post("/agent/ban")
def ban_ip(payload: IPPayload):
    ip = payload.ip
    try:
        cmd = f"iptables -I INPUT -s {{ip}} -j DROP"
        subprocess.run(cmd, shell=True, check=True)
        return {{"status": "success"}}
    except: raise HTTPException(status_code=500)
@app.post("/agent/unban")
def unban_ip(payload: IPPayload):
    ip = payload.ip
    try:
        cmd = f"iptables -D INPUT -s {{ip}} -j DROP"
        subprocess.run(cmd, shell=True, check=True)
        return {{"status": "success"}}
    except: return {{"status": "success"}}
EOF

cat << 'EOF' | sudo tee /etc/systemd/system/flux-defender.service > /dev/null
[Unit]
Description=Flux Active Defender
After=network.target
[Service]
User=root
WorkingDirectory=/opt/flux_defender
ExecStart=/opt/flux_defender/flux_env/bin/uvicorn defender_agent:app --host 0.0.0.0 --port 8001
Restart=always
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable flux-defender.service > /dev/null 2>&1
sudo systemctl restart flux-defender.service
sudo ufw allow from {backend_host} to any port 8001 > /dev/null 2>&1 || true

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{{"module": "defender"}}' {api_base_url}/api/agent/heartbeat > /dev/null

echo "ACTIVE DEFENDER DEPLOYED."
"""
    return script
