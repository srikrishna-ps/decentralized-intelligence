#!/bin/bash

# Complete Network Setup Script
# This script joins all orderers and peers to channels and deploys chaincode

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Set environment for peer commands
set_peer_env() {
    local org=$1
    local peer=${2:-0}
    
    case $org in
        "HospitalMSP")
            export CORE_PEER_LOCALMSPID="HospitalMSP"
            export CORE_PEER_ADDRESS="peer${peer}.hospital.medical.com:$((7051 + peer * 2))"
            export CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/peers/peer${peer}.hospital.medical.com/tls/ca.crt"
            export CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp"
            ;;
        "InsuranceMSP")
            export CORE_PEER_LOCALMSPID="InsuranceMSP"
            export CORE_PEER_ADDRESS="peer${peer}.insurance.medical.com:$((8051 + peer * 2))"
            export CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurance.medical.com/peers/peer${peer}.insurance.medical.com/tls/ca.crt"
            export CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/insurance.medical.com/users/Admin@insurance.medical.com/msp"
            ;;
        "RegulatoryMSP")
            export CORE_PEER_LOCALMSPID="RegulatoryMSP"
            export CORE_PEER_ADDRESS="peer${peer}.regulatory.medical.com:$((9051 + peer * 2))"
            export CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulatory.medical.com/peers/peer${peer}.regulatory.medical.com/tls/ca.crt"
            export CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulatory.medical.com/users/Admin@regulatory.medical.com/msp"
            ;;
    esac
    export CORE_PEER_TLS_ENABLED=true
}

# Join orderers to a channel
join_orderers_to_channel() {
    local channel=$1
    print_status "Joining orderers to $channel..."
    
    for i in 0 1 2; do
        local port=$((7053 + i))
        print_status "Joining orderer${i} to $channel..."
        
        docker exec cli osnadmin channel join \
            --channelID "$channel" \
            --config-block "/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${channel}.block" \
            -o "orderer${i}.orderer.medical.com:${port}" \
            --ca-file "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer${i}.orderer.medical.com/tls/ca.crt" \
            --client-cert "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer${i}.orderer.medical.com/tls/server.crt" \
            --client-key "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/orderer.medical.com/orderers/orderer${i}.orderer.medical.com/tls/server.key" 2>&1 | grep -E "Status: 201|already exists" || print_warning "Orderer${i} join failed or already joined"
    done
}

# Join peers to a channel
join_peers_to_channel() {
    local channel=$1
    print_status "Joining peers to $channel..."
    
    for org in "HospitalMSP" "InsuranceMSP" "RegulatoryMSP"; do
        for peer in 0 1; do
            print_status "Joining ${org} peer${peer} to $channel..."
            set_peer_env "$org" "$peer"
            
            docker exec cli bash -c "
                export CORE_PEER_LOCALMSPID='$CORE_PEER_LOCALMSPID'
                export CORE_PEER_ADDRESS='$CORE_PEER_ADDRESS'
                export CORE_PEER_TLS_ROOTCERT_FILE='$CORE_PEER_TLS_ROOTCERT_FILE'
                export CORE_PEER_MSPCONFIGPATH='$CORE_PEER_MSPCONFIGPATH'
                export CORE_PEER_TLS_ENABLED='$CORE_PEER_TLS_ENABLED'
                peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${channel}.block
            " 2>&1 | grep -E "Successfully|already" || print_warning "${org} peer${peer} join failed or already joined"
        done
    done
}

# Verify channel membership
verify_channel() {
    local channel=$1
    print_status "Verifying $channel membership..."
    
    # Check one peer from each org
    for org in "HospitalMSP" "InsuranceMSP" "RegulatoryMSP"; do
        set_peer_env "$org" 0
        print_status "Checking ${org}..."
        
        docker exec cli bash -c "
            export CORE_PEER_LOCALMSPID='$CORE_PEER_LOCALMSPID'
            export CORE_PEER_ADDRESS='$CORE_PEER_ADDRESS'
            export CORE_PEER_TLS_ROOTCERT_FILE='$CORE_PEER_TLS_ROOTCERT_FILE'
            export CORE_PEER_MSPCONFIGPATH='$CORE_PEER_MSPCONFIGPATH'
            export CORE_PEER_TLS_ENABLED='$CORE_PEER_TLS_ENABLED'
            peer channel list
        " 2>&1 | grep "$channel" && print_status "${org} is on $channel" || print_warning "${org} not on $channel"
    done
}

# Main execution
print_status "========================================="
print_status "Starting Complete Network Setup"
print_status "========================================="

# Step 1: Join orderers and peers to medical-channel
print_status "\n=== Step 1: Setting up medical-channel ==="
join_orderers_to_channel "medical-channel"
join_peers_to_channel "medical-channel"
verify_channel "medical-channel"

# Step 2: Join orderers and peers to insurance-channel
print_status "\n=== Step 2: Setting up insurance-channel ==="
join_orderers_to_channel "insurance-channel"
join_peers_to_channel "insurance-channel"
verify_channel "insurance-channel"

# Step 3: Join orderers and peers to private-data-channel
print_status "\n=== Step 3: Setting up private-data-channel ==="
join_orderers_to_channel "private-data-channel"
join_peers_to_channel "private-data-channel"
verify_channel "private-data-channel"

print_status "\n========================================="
print_status "Channel setup complete!"
print_status "========================================="
print_status "Next: Run deploy-contracts.sh to deploy chaincode"
