#!/bin/bash
echo "=========================================================="
echo " INITIATING LOG MESSAGE BROKER DEPLOYMENT (KAFKA KRAFT) "
echo "=========================================================="

# Rationale: Dynamically retrieve the external IP address to configure the advertised listener.
# This ensures external producers and consumers can properly route traffic to this broker across network boundaries.
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Detected Public IP of the Kafka Server: $PUBLIC_IP"
read -p "Press Enter to continue (or input a different IP to override): " USER_IP
if [ ! -z "$USER_IP" ]; then PUBLIC_IP=$USER_IP; fi

echo -e "\n[1/6] Installing Java and essential tools..."
# Rationale: Prevent silent installation failures on freshly provisioned Ubuntu servers.
# The script polls the dpkg lock to ensure background processes (like unattended-upgrades) have completed.
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 ; do
    echo "Waiting for background apt processes to release the package manager lock..."
    sleep 5
done

# Rationale: Kafka requires the Java Runtime Environment (JRE).
# Headless version minimizes resource footprint on server environments.
apt-get update -qq > /dev/null 2>&1
apt-get install openjdk-17-jre-headless curl wget netcat-openbsd -y -qq > /dev/null 2>&1

echo "[2/6] Setting up dedicated Kafka user..."
# Rationale: Security (Principle of Least Privilege). Network-facing services must not run as root.
id -u kafka &>/dev/null || useradd -r -s /bin/false kafka

echo "[3/6] Downloading Apache Kafka (v3.7.0)..."
wget -4 --show-progress https://archive.apache.org/dist/kafka/3.7.0/kafka_2.13-3.7.0.tgz
tar -xzf kafka_2.13-3.7.0.tgz
mv kafka_2.13-3.7.0 /opt/kafka
rm kafka_2.13-3.7.0.tgz

echo "[4/6] Generating Kafka KRaft Configuration..."
# Rationale: Utilizing HereDoc to explicitly generate the complete configuration file.
# This prevents race conditions or regex matching failures inherent to 'sed' commands,
# ensuring deterministic deployment behavior.
cat << EOF > /opt/kafka/config/kraft/server.properties
# ==========================================
# FLUX SOC - KAFKA KRAFT CONFIGURATION
# ==========================================
# Role and Node definition
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093

# Network Settings
listeners=PLAINTEXT://0.0.0.0:9092,CONTROLLER://localhost:9093
inter.broker.listener.name=PLAINTEXT
advertised.listeners=PLAINTEXT://$PUBLIC_IP:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SSL:SSL,SASL_PLAINTEXT:SASL_PLAINTEXT,SASL_SSL:SASL_SSL

# Threading and Socket performance
num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Storage Settings
log.dirs=/tmp/kraft-combined-logs
num.partitions=1
num.recovery.threads.per.data.dir=1

# Replication & Retention Policy (Optimized for SOC Logging)
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000
EOF

# Rationale: Apply ownership to the dedicated unprivileged user to prevent permission denied errors.
mkdir -p /tmp/kraft-combined-logs
chown -R kafka:kafka /opt/kafka
chown -R kafka:kafka /tmp/kraft-combined-logs

echo "[5/6] Initializing storage cluster (KRaft mode)..."
# Rationale: KRaft requires explicit storage formatting with a cluster UUID prior to boot.
KAFKA_CLUSTER_ID=$(su -s /bin/bash kafka -c "/opt/kafka/bin/kafka-storage.sh random-uuid")
su -s /bin/bash kafka -c "/opt/kafka/bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c /opt/kafka/config/kraft/server.properties" > /dev/null

echo "[6/6] Setting up Kafka as a Systemd Service..."
# Rationale: Systemd daemonization ensures auto-start and crash recovery.
# KAFKA_HEAP_OPTS is explicitly bound to prevent Out-Of-Memory (OOM) kills on constrained VPS nodes.
cat << 'SVC' > /etc/systemd/system/kafka.service
[Unit]
Description=Apache Kafka Server
Documentation=http://kafka.apache.org/documentation.html
Requires=network.target remote-fs.target
After=network.target remote-fs.target

[Service]
Type=simple
User=kafka
Group=kafka
Environment="KAFKA_HEAP_OPTS=-Xmx512M -Xms256M"
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-abnormal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable kafka > /dev/null 2>&1
systemctl start kafka

# Rationale: Deterministic Health Check.
# Replaces 'sleep' with a polling loop to verify the broker port is actively accepting connections before topic creation.
echo "Waiting for Kafka broker to initialize..."
MAX_RETRIES=20
RETRY_COUNT=0
while ! nc -z localhost 9092; do
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Kafka broker failed to bind to port 9092 within expected timeframe."
    exit 1
  fi
done

echo "Creating topic 'soc-raw-logs'..."
su -s /bin/bash kafka -c "/opt/kafka/bin/kafka-topics.sh --create --topic soc-raw-logs --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1"

echo -e "\n=========================================================="
echo " KAFKA INSTALLATION COMPLETED AND RUNNING "
echo " Communication Port: 9092"
echo " Advertised IP: $PUBLIC_IP"
echo " Created Topic: soc-raw-logs"
echo "=========================================================="
