#!/bin/bash

# Exit on any error
set -e

echo "Creating and joining channel..."

# Create channel using genesis block
docker exec -e CORE_PEER_TLS_ENABLED=false \
    cli peer channel create \
    -o orderer0.orderer.medical.com:7050 \
    -c medical-channel

# Join channel for hospital peer
docker exec cli peer channel join \
    -b medical-channel.block

echo "Channel created and joined successfully!"
