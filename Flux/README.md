# FLUX SOC SAAS / CYBERSECURITY PROJECT

//////////////////////////////////////////////////////////////////////////////

update 1 (31/03/2026): dashboard, screens, basic ui.

update 2(01/04/2026): Settings, dropdown, basic ui

Installation:
# 1. Download and import the Nodesource GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# 2. Create the NodeSource repository for Node 22
NODE_MAJOR=22
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# 3. Update apt and install nodejs
sudo apt-get update
sudo apt-get install nodejs -y

npm install

