#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment process..."

# 1. Set up Python environment
echo "Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Deploy smart contracts
echo "Deploying smart contracts..."
cd ../contracts
npm install
npx hardhat compile
npx hardhat deploy --network mainnet

# 3. Initialize data processing
echo "Setting up data processing components..."
cd ../Data\ cleaning\ and\ structuring
python setup.py install

cd ../feature\ extraction
python setup.py install

# 4. Set up the network
echo "Setting up blockchain network..."
cd ../deployment
./setup_network.sh

# 5. Deploy chaincode
echo "Deploying chaincode..."
./deploy_chaincode.sh

# 6. Start services
echo "Starting services..."
docker-compose -f ../docker-compose.yml up -d

echo "Deployment completed successfully!"
