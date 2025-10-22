#!/bin/bash

# Medical Network Bootstrap Script
# This script sets up the entire blockchain network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Set working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$NETWORK_DIR")"

cd "$NETWORK_DIR"

print_status "Starting Medical Network Bootstrap Process..."

# Step 1: Clean previous setup
print_status "Cleaning previous network setup..."
./scripts/cleanup.sh

# Step 2: Generate crypto material
print_status "Generating crypto material for all organizations..."
cryptogen generate --config=./crypto-config.yaml --output="organizations"

# Step 3: Create genesis block
print_status "Creating genesis block..."
configtxgen -profile MedicalOrdererGenesis -outputBlock ./system-genesis-block/genesis.block -channelID system-channel

# Step 4: Start the network
print_status "Starting blockchain network containers..."
docker-compose -f docker/docker-compose.yaml up -d

# Wait for containers to start
print_status "Waiting for network to initialize..."
sleep 30

# Step 5: Create channels
print_status "Creating medical channels..."
./scripts/create-channels.sh

# Step 6: Deploy smart contracts
print_status "Deploying smart contracts..."
./scripts/deploy-contracts.sh

print_status "Medical Network Bootstrap Complete!"
print_status "Network is ready for medical data management operations."