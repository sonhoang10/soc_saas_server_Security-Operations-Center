# Flux SOC - Enterprise Cloud-based Security Operations Center

![Version](https://img.shields.io/badge/version-2.0.0--Enterprise-blue.svg)
![Python](https://img.shields.io/badge/python-3.12-blue.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg)
![Kafka](https://img.shields.io/badge/kafka-3.7.0-red.svg)
![ClickHouse](https://img.shields.io/badge/ClickHouse-Fast-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Flux SOC** is a next-generation, cloud-native Security Operations Center designed specifically for SMEs. 

Flux simplifies cybersecurity by providing centralized log ingestion, high-performance real-time threat analysis, and an **Active Defense** mechanism that automatically isolates threats (Brute-force, SQL Injection, L7 DDoS) via `iptables` without requiring 24/7 human intervention.

---

## Enterprise Features

* **📡 Zero-Trust Data Ingestion:** Secure, read-only log streaming (Nginx, SSH, Web App) via Filebeat with view-once deployment tokens.
* **⚡ Ultra-Low Latency Pipeline:** Utilizes **Apache Kafka** as a message broker and **ClickHouse** as a columnar data warehouse for lightning-fast log storage and retrieval.
* **🧠 Advanced Logic Engine:** * **Deep IP Inspection:** Parses through proxy layers and IPv4-mapped IPv6 (`::ffff:`) to extract the true attacker IP.
  * **Sliding Window Aggregation:** Intelligently groups combo attacks (e.g., [Wave 2], [Wave 3]) and resets thresholds in real-time.
  * **Anti-Spam Cooldown:** Built-in alert muting (Debounce) to prevent dashboard alert fatigue during massive DDoS floods.
* **🛡️ Active Defense (Feature Gating):** An independent IPS agent deployed on client servers. The Web UI intelligently locks or unlocks Manual/Auto-ban features based on the agent's real-time heartbeat.
* **📊 Interactive React Dashboard:** A highly responsive Threat Map and real-time attack stream powered by WebSockets.

---

## 🏗️ System Architecture (Data Flow)

The Flux architecture is built on a microservices model:

1. **Client Servers (Targets):**
   * **Flux Monitor (Phase 1):** Passive Filebeat agent scanning logs at `0.5s` frequency.
   * **Flux Defender (Phase 2):** Active FastAPI agent listening on Port 8001 for execution commands.
2. **Message Broker:** Apache Kafka cluster receiving high-throughput streams into the `soc-raw-logs` topic.
3. **Flux Central SOC:**
   * **Kafka Consumer (`core/kafka_consumer.py`):** Ingests Kafka streams, stores raw data in ClickHouse, and routes clean payloads.
   * **Logic Engine (`core/logic_engine.py`):** The brain. Evaluates rules, detects DDoS/SQLi, executes iptables commands via HTTP, and triggers WebSockets.
   * **Web Backend (`api/web_backend.py`):** FastAPI handling RBAC, Organization management, Agent Token rotation, and WebSocket broadcasting.
   * **Frontend (`Flux/`):** React + Vite SPA delivering a premium Enterprise UI.

---

## 📂 Repository Structure

```text
Flux-SOC/
├── alembic/                # PostgreSQL Database migration scripts
├── api/                    # Main Backend API modules
│   ├── models.py           # SQLAlchemy Database schemas (Users, Teams, Servers)
│   ├── web_backend.py      # Core API & WebSocket Server (Port 8000)
│   └── ...                 # Auth & Crypto utilities
├── core/                   # Threat Intelligence Core
│   ├── kafka_consumer.py   # Consumer & Data Warehouse Ingestion
│   └── logic_engine.py     # Rule evaluation & Active Defense trigger (Port 8001)
├── Flux/                   # ReactJS Frontend Application
│   ├── src/                # UI Components, Screens, and Tools
│   └── package.json        
├── scripts/                # Utility scripts (e.g., clean_db.py)
├── .env                    # Environment variables (Ignored in Git)
├── requirements.txt        # Python dependencies
└── README.md               # You are here
```


---

## Deployment Instruction
For installation: [Descriptive installation](installation.md)


---

## 👥 Đội Ngũ Phát Triển (FLUX NK)
* Đặng Xuân Thủy: Engine Developer (Thiết kế logic & rule cảnh báo)
* Nguyễn Minh Thái: Security Analyst (Phân tích bảo mật & Threat Intelligence)
* Nguyễn Tuấn Kiệt: Frontend Developer (Thiết kế giao diện UI/UX)
* Thái Hoàng Sơn: Backend Developer (Xây dựng kiến trúc hệ thống & API)
* Nguyễn Phú Trọng: Presenter & QA (Kiểm soát chất lượng, Quản lý tiến độ)

---
## 📜 License
Distributed under the MIT License. Developed for educational and research purposes.