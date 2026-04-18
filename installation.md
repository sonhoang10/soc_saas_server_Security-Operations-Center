# Flux SOC - Deployment & Installation Guide

This guide covers the complete installation of the Flux SOC architecture. It assumes you are deploying on an Ubuntu 22.04/24.04 environment.

## On kafka server:
1. Execute the automated installation script: You can utilize the provided [kafka_install.sh](.kafka_server/kafka_install.sh)
```bash
# Grant execution permissions and run the script
chmod +x kafka_install.sh
sudo kafka_install.sh
```
2. Verification: Ensure that the Kafka service is actively running:
```bash
sudo systemctl status kafka
```

## 1. Prerequisites & Infrastructure Setup

Before starting the Flux services, ensure the following core infrastructure components are running:

1. **PostgreSQL**: For relational metadata (Users, Teams, Server Status).
2. **ClickHouse**: For lightning-fast columnar log storage. Port `8123` (HTTP).
3. **Apache Kafka & Zookeeper (or KRaft)**: Port `9092`.
4. **Node.js (v18+) & PM2**: For building the frontend and managing background processes.
5. **Python 3.12+**: For the backend engines.

Ensure your Cloud Firewall allows inbound traffic on:
* Kafka Server: 9092
* Client Server: 80 (Web), 8001 (Agent)
* Main Server: 8000 (Backend), 8001 (Logic), 8080 (Frontend)

---

## 2. Main SOC Server Installation

### Step 2.1: Python Environment
Clone the repository and set up the virtual environment:
```bash
cd ~/Flux-SOC
python3 -m venv soc_env
source soc_env/bin/activate
pip install -r requirements.txt
```

### Step 2.2: Environment Variables
Create a .env file in the root directory based on [example.env](example.env)

### Step 2.3: Database Migration
Alembic Initialization:
```bash
alembic init alembic
```
Apply the latest database schemas using Alembic:
```bash
alembic revision --autogenerate -m "brief_description_of_your_changes"
alembic revision --autogenerate -m "brief_description_of_your_changes"
```

### Step 2.4: Start Backend Services via PM2
```bash
# 1. Web Backend (Dashboard API & WebSockets)
pm2 start "./soc_env/bin/uvicorn api.web_backend:app --host 0.0.0.0 --port 8000" --name "soc-backend"

# 2. Logic Engine (Threat Analysis & Defender API)
pm2 start "./soc_env/bin/uvicorn core.logic_engine:app --host 0.0.0.0 --port 8001" --name "soc-logic"

# 3. Kafka Consumer (Data Pipeline)
pm2 start "./soc_env/bin/python core/kafka_consumer.py" --name "soc-consumer"

pm2 save
```

## 3. Frontend Dashboard Setup
Navigate to the React application directory and build the project:
```bash
cd Flux/
npm install
npm run build
```

## 4. Client Agent Deployment (Target Servers)
#### To monitor a client server, you do NOT need to configure it manually.
1. Log in to the Flux Dashboard.
2. Navigate to Agent Deployment.
3. Generate a View-Once Secret Key.
4. Copy the auto-generated Bash script and run it on the target VPS (Root required).

#### Deployment Phases:
* Phase 1 (Flux Monitor): Installs Filebeat to stream auth.log and nginx.log passively.
* Phase 2 (Active Defender): Installs a lightweight FastAPI agent to accept iptables Ban/Unban commands from the SOC Logic Engine.

## Troubleshooting commands
```Bash
# Check service logs
pm2 logs soc-backend
pm2 logs soc-logic
pm2 logs soc-consumer

# Emergency Unban (Run on Client Server)
iptables -F INPUT
```