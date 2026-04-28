# Flux SOC - Deployment & Installation Guide

This guide covers the complete installation of the Flux SOC architecture. It assumes you are deploying on an Ubuntu 22.04/24.04 environment.

## On kafka server:
1. Install the kafka_install.sh:
```bash
curl -L https://raw.githubusercontent.com/sonhoang10/soc_saas_server_Security-Operations-Center/main/.kafka_server/kafka_install.sh -o kafka_install.sh
```
or 
```bash
wget https://raw.githubusercontent.com/sonhoang10/soc_saas_server_Security-Operations-Center/main/.kafka_server/kafka_install.sh -O kafka_install.sh
```
2. Execute the automated installation script: You can utilize the provided [kafka_install.sh](.kafka_server/kafka_install.sh)
```bash
# Grant execution permissions and run the script
chmod +x kafka_install.sh
sudo ./kafka_install.sh
```
3. Verification: Ensure that the Kafka service is actively running:
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
sudo apt update
apt install python3-pip
apt install python3.12-venv
python3 -m venv soc_env
source soc_env/bin/activate
pip install -r requirements.txt
```

### Step 2.2: Environment Variables
Create a .env file in the root directory based on [example.env](example.env)

### Step 2.3: Database Migration
First, install and configure PostgreSQL:
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create Database and User (Replace 'your_password' with a secure password)
sudo -u postgres psql -c "CREATE DATABASE soc_main_db;"
sudo -u postgres psql -c "CREATE USER soc_admin WITH ENCRYPTED PASSWORD 'your_password';"
sudo -u postgres psql -c "ALTER DATABASE soc_main_db OWNER TO soc_admin;"
sudo -u postgres psql -d soc_main_db -c "GRANT ALL ON SCHEMA public TO soc_admin;"
```
Apply the latest database schemas using Alembic:
```bash
# alembic revision --autogenerate -m "brief_description_of_your_changes" #if you change anything in models.py
alembic upgrade head 
```

## Step 2.4: Clickhouse installation
```bash
sudo apt-get install -y apt-transport-https ca-certificates dirmngr
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 8919F6BD2B48D754
echo "deb https://packages.clickhouse.com/deb stable main" | sudo tee /etc/apt/sources.list.d/clickhouse.list
sudo apt-get update
sudo apt-get install -y clickhouse-server clickhouse-client
```
Start ClickHouse:
```bash
sudo systemctl start clickhouse-server
sudo systemctl enable clickhouse-server
clickhouse-client
```

### 2.5. Frontend Dashboard Setup
Navigate to the React application directory and build the project:
```bash
cd Flux/
npm install
npm run build
cd ..
```

### Step 2.6: Start Backend Services via PM2
```bash
# 1. Web Backend (Dashboard API & WebSockets)
pm2 start "./soc_env/bin/uvicorn api.web_backend:app --host 0.0.0.0 --port 8000" --name "soc-backend"

# 2. Logic Engine (Threat Analysis & Defender API)
pm2 start "./soc_env/bin/uvicorn core.logic_engine:app --host 0.0.0.0 --port 8001" --name "soc-logic"

# 3. Kafka Consumer (Data Pipeline)
pm2 start "./soc_env/bin/python core/kafka_consumer.py" --name "soc-consumer"

# 4. Web Frontend (UI Server)
pm2 start "./soc_env/bin/uvicorn api.web_frontend:app --host 0.0.0.0 --port 8080" --name "soc-frontend"

pm2 save
```
### Step 2.7: Configure UFW Firewall
If you have UFW enabled, you must open the required ports for the dashboard and API communication:
```bash
sudo ufw allow 8000/tcp # Web Backend API
sudo ufw allow 8001/tcp # Logic Engine API
sudo ufw allow 8080/tcp # Frontend Dashboard
sudo ufw reload
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

## 5. Client Server (optional)
#### 1. Prepare environment & Install dependencies
```bash
sudo apt update
sudo apt install nodejs npm -y
sudo npm install pm2 -g

mkdir -p ~/web-test-soc
cd ~/web-test-soc
npm init -y
npm install express body-parser
```

#### 2. Install server.js:
```bash
curl -L https://raw.githubusercontent.com/sonhoang10/soc_saas_server_Security-Operations-Center/main/.client_server/server.js -o server.js
```
or 
```bash
wget https://raw.githubusercontent.com/sonhoang10/soc_saas_server_Security-Operations-Center/main/.client_server/server.js -O server.js
```

#### 3. Start server.js
```bash
sudo pm2 start server.js --name "web-login"
sudo pm2 save
sudo pm2 startup
```

## Troubleshooting commands
```Bash
# Check service logs
pm2 logs soc-backend
pm2 logs soc-logic
pm2 logs soc-consumer

# Emergency Unban (Run on Client Server)
iptables -F INPUT
```
