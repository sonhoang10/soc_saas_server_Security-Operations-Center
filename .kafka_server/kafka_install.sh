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

echo -e "\n[1/5] Installing Java..."
# Rationale: Kafka is a JVM-based application and explicitly requires the Java Runtime Environment (JRE) to execute. 
# Using the headless version reduces overhead on server environments.
apt-get update -qq > /dev/null 2>&1
apt-get install openjdk-17-jre-headless -y -qq > /dev/null 2>&1

echo "[2/5] Downloading Apache Kafka (v3.7.0)..."
wget -4 --show-progress https://archive.apache.org/dist/kafka/3.7.0/kafka_2.13-3.7.0.tgz
tar -xzf kafka_2.13-3.7.0.tgz
mv kafka_2.13-3.7.0 /opt/kafka
rm kafka_2.13-3.7.0.tgz

echo "[3/5] Configuring network settings..."
# Rationale: Bind the internal listener to all network interfaces (0.0.0.0) to accept external connections.
# Update the advertised listener with the public IP so remote clients receive the correct connection metadata upon initial handshake.
sed -i "s/listeners=PLAINTEXT:\/\/localhost:9092,CONTROLLER:\/\/localhost:9093/listeners=PLAINTEXT:\/\/0.0.0.0:9092,CONTROLLER:\/\/localhost:9093/" /opt/kafka/config/kraft/server.properties
sed -i "s/#advertised.listeners=PLAINTEXT:\/\/localhost:9092/advertised.listeners=PLAINTEXT:\/\/$PUBLIC_IP:9092/" /opt/kafka/config/kraft/server.properties

echo "[4/5] Initializing storage cluster (KRaft mode)..."
# Rationale: KRaft mode eliminates the ZooKeeper dependency for metadata management. 
# The log storage directory must be explicitly formatted with a unique cluster ID before the broker can boot.
KAFKA_CLUSTER_ID=$(/opt/kafka/bin/kafka-storage.sh random-uuid)
/opt/kafka/bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c /opt/kafka/config/kraft/server.properties > /dev/null

echo "[5/5] Setting up Kafka as a Systemd Service..."
# Rationale: Encapsulating Kafka within a systemd unit ensures it starts automatically on system boot and recovers gracefully from unexpected process terminations.
cat << 'SVC' > /etc/systemd/system/kafka.service
[Unit]
Description=Apache Kafka Server
Documentation=http://kafka.apache.org/documentation.html
Requires=network.target remote-fs.target
After=network.target remote-fs.target

[Service]
Type=simple
User=root
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-abnormal

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable kafka > /dev/null 2>&1
systemctl start kafka

# Rationale: Provide a brief buffer period to guarantee the Kafka broker process is fully initialized and ready to accept administrative requests.
sleep 5

echo "Creating topic 'soc-raw-logs'..."
# Rationale: Pre-provision the initial topic for log ingestion so downstream clients do not encounter 'Unknown Topic or Partition' exceptions upon their first connection attempt.
/opt/kafka/bin/kafka-topics.sh --create --topic soc-raw-logs --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1 > /dev/null 2>&1

echo -e "\n=========================================================="
echo " KAFKA INSTALLATION COMPLETED AND RUNNING "
echo " Communication Port: 9092"
echo " Created Topic: soc-raw-logs"
echo " Note: Ensure the Firewall rules have explicitly opened port 9092 for inbound traffic."
echo "=========================================================="