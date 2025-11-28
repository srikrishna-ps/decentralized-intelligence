#!/bin/bash

# Channel creation script for medical network

set -e

# Colors and functions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Helper to convert POSIX path to Windows path when running .exe binaries
convert_path() {
    local input_path="$1"
    if command -v cygpath >/dev/null 2>&1; then
        cygpath -m "$input_path"
    elif command -v wslpath >/dev/null 2>&1; then
        local converted
        if converted=$(wslpath -m "$input_path" 2>/dev/null); then
            echo "$converted"
        else
            echo "$input_path"
        fi
    else
        echo "$input_path"
    fi
}

### Path resolution and binary setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$NETWORK_DIR")"
FABRIC_BIN_DIR="${PROJECT_ROOT}/fabric-binaries/bin"
CONFIGTXGEN_BIN="${FABRIC_BIN_DIR}/configtxgen"
CONFIGTX_CFG_DIR="$NETWORK_DIR/configtx"
CLI_ROOT="/opt/gopath/src/github.com/hyperledger/fabric/peer"
CLI_ORG_DIR="${CLI_ROOT}/organizations"
CLI_CHANNEL_ARTIFACTS_DIR="${CLI_ROOT}/channel-artifacts"
HOST_CHANNEL_ARTIFACTS_DIR="${NETWORK_DIR}/channel-artifacts"
HOST_CHANNEL_ARTIFACTS_DIR_FOR_BIN="$HOST_CHANNEL_ARTIFACTS_DIR"

export PATH="${FABRIC_BIN_DIR}:${PATH}"
mkdir -p "$HOST_CHANNEL_ARTIFACTS_DIR"
rm -f "${HOST_CHANNEL_ARTIFACTS_DIR}/"*.{tx,block} 2>/dev/null || true

if [ ! -f "$CONFIGTXGEN_BIN" ] && [ -f "${CONFIGTXGEN_BIN}.exe" ]; then
    CONFIGTXGEN_BIN="${CONFIGTXGEN_BIN}.exe"
fi

FABRIC_CFG_PATH_VALUE="$NETWORK_DIR/config"
if [[ "$CONFIGTXGEN_BIN" == *.exe ]]; then
    FABRIC_CFG_PATH_VALUE="$(convert_path "$NETWORK_DIR/config")"
    CONFIGTX_CFG_DIR="$(convert_path "$NETWORK_DIR/configtx")"
    HOST_CHANNEL_ARTIFACTS_DIR_FOR_BIN="$(convert_path "$HOST_CHANNEL_ARTIFACTS_DIR")"
fi
export FABRIC_CFG_PATH="$FABRIC_CFG_PATH_VALUE"

### Helper functions
peer_cli() {
    docker exec \
        -e CORE_PEER_TLS_ENABLED="$CORE_PEER_TLS_ENABLED" \
        -e CORE_PEER_LOCALMSPID="$CORE_PEER_LOCALMSPID" \
        -e CORE_PEER_TLS_ROOTCERT_FILE="$CORE_PEER_TLS_ROOTCERT_FILE" \
        -e CORE_PEER_MSPCONFIGPATH="$CORE_PEER_MSPCONFIGPATH" \
        -e CORE_PEER_ADDRESS="$CORE_PEER_ADDRESS" \
        cli peer "$@"
}

set_peer_env() {
    local org="$1"
    case "$org" in
        "HospitalMSP")
            CORE_PEER_LOCALMSPID="HospitalMSP"
            CORE_PEER_TLS_ROOTCERT_FILE="${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/peers/peer0.hospital.medical.com/tls/ca.crt"
            CORE_PEER_MSPCONFIGPATH="${CLI_ORG_DIR}/peerOrganizations/hospital.medical.com/users/Admin@hospital.medical.com/msp"
            CORE_PEER_ADDRESS="peer0.hospital.medical.com:7051"
            ;;
        "InsuranceMSP")
            CORE_PEER_LOCALMSPID="InsuranceMSP"
            CORE_PEER_TLS_ROOTCERT_FILE="${CLI_ORG_DIR}/peerOrganizations/insurance.medical.com/peers/peer0.insurance.medical.com/tls/ca.crt"
            CORE_PEER_MSPCONFIGPATH="${CLI_ORG_DIR}/peerOrganizations/insurance.medical.com/users/Admin@insurance.medical.com/msp"
            CORE_PEER_ADDRESS="peer0.insurance.medical.com:8051"
            ;;
        "RegulatoryMSP")
            CORE_PEER_LOCALMSPID="RegulatoryMSP"
            CORE_PEER_TLS_ROOTCERT_FILE="${CLI_ORG_DIR}/peerOrganizations/regulatory.medical.com/peers/peer0.regulatory.medical.com/tls/ca.crt"
            CORE_PEER_MSPCONFIGPATH="${CLI_ORG_DIR}/peerOrganizations/regulatory.medical.com/users/Admin@regulatory.medical.com/msp"
            CORE_PEER_ADDRESS="peer0.regulatory.medical.com:9051"
            ;;
        *)
            print_warning "Unknown organization $org"
            return 1
            ;;
    esac
    export CORE_PEER_LOCALMSPID CORE_PEER_TLS_ROOTCERT_FILE CORE_PEER_MSPCONFIGPATH CORE_PEER_ADDRESS
}

generate_channel_block() {
    local channel_id="$1"
    local profile="$2"
    print_status "Generating block for ${channel_id}..."
    
    # Generate block inside CLI container (configtx and config are mounted as volumes)
    # Update configtx.yaml paths to use absolute container paths
    docker exec cli bash -c "sed -i 's|MSPDir: ../organizations|MSPDir: /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations|g' /opt/gopath/src/github.com/hyperledger/fabric/peer/configtx/configtx.yaml && \
        sed -i 's|ClientTLSCert: ../organizations|ClientTLSCert: /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations|g' /opt/gopath/src/github.com/hyperledger/fabric/peer/configtx/configtx.yaml && \
        sed -i 's|ServerTLSCert: ../organizations|ServerTLSCert: /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations|g' /opt/gopath/src/github.com/hyperledger/fabric/peer/configtx/configtx.yaml" || {
        print_error "Failed to update configtx.yaml paths"
        return 1
    }
    
    # Generate block inside CLI container (Linux native)
    if ! docker exec cli bash -c "export FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/config && \
        configtxgen -configPath /opt/gopath/src/github.com/hyperledger/fabric/peer/configtx \
        -profile $profile \
        -outputBlock ${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}.block \
        -channelID $channel_id" 2>&1; then
        print_error "Failed to generate block for ${channel_id}"
        return 1
    fi
    
    # Copy block back to host
    docker cp "cli:${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}.block" "${HOST_CHANNEL_ARTIFACTS_DIR}/" || {
        print_error "Failed to copy block to host"
        return 1
    }
}

generate_anchor_update() {
    local channel_id="$1"
    local profile="$2"
    local org_msp="$3"
    local anchor_tx="${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}-${org_msp}-anchor.tx"
    # Generate anchor update inside CLI container (configtx.yaml already has absolute paths)
    if ! docker exec cli bash -c "export FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/config && \
        configtxgen -configPath /opt/gopath/src/github.com/hyperledger/fabric/peer/configtx \
        -profile $profile \
        -outputAnchorPeersUpdate $anchor_tx \
        -channelID $channel_id \
        -asOrg $org_msp" 2>&1; then
        print_error "Failed to generate anchor update for ${channel_id}-${org_msp}"
        return 1
    fi
    # Copy anchor tx to host
    docker cp "cli:${anchor_tx}" "${HOST_CHANNEL_ARTIFACTS_DIR}/" || {
        print_error "Failed to copy anchor tx to host"
        return 1
    }
}

wait_for_orderer() {
    local orderer_host="$1"
    local admin_port="$2"
    local max_attempts=30
    local attempt=0
    
    print_status "  Waiting for ${orderer_host} to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if docker exec cli osnadmin channel list \
            -o "${orderer_host}:${admin_port}" \
            --ca-file "${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/orderers/${orderer_host}/tls/ca.crt" \
            --client-cert "${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/users/Admin@orderer.medical.com/tls/client.crt" \
            --client-key "${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/users/Admin@orderer.medical.com/tls/client.key" >/dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    return 1
}

join_orderer_channel() {
    local channel_id="$1"
    local orderer_host="$2"
    local admin_port="$3"
    local block_path="${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}.block"
    local orderer_ca="${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/orderers/${orderer_host}/tls/ca.crt"
    
    # Wait for orderer to be ready
    if ! wait_for_orderer "$orderer_host" "$admin_port"; then
        print_warning "    Orderer ${orderer_host} not ready, skipping..."
        return 1
    fi
    
    local output
    output=$(docker exec cli osnadmin channel join \
        --channelID "$channel_id" \
        --config-block "$block_path" \
        -o "${orderer_host}:${admin_port}" \
        --ca-file "$orderer_ca" \
        --client-cert "${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/users/Admin@orderer.medical.com/tls/client.crt" \
        --client-key "${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/users/Admin@orderer.medical.com/tls/client.key" 2>&1)
    
    local status=$?
    if [ $status -eq 0 ]; then
        echo "$output" | grep -q "Status: 200" && return 0
    fi
    
    # Check if channel already exists (that's okay)
    if echo "$output" | grep -q "already exists\|channel.*exists"; then
        print_status "    ✓ ${orderer_host} already in channel"
        return 0
    fi
    
    # Print error for debugging
    echo "$output" | grep -E "error|Error|ERROR" >&2 || true
    return 1
}

ORDERERS=(
  "orderer0.orderer.medical.com:7053"
  "orderer1.orderer.medical.com:7054"
  "orderer2.orderer.medical.com:7055"
)

declare -A CHANNEL_PROFILES=(
  ["medical-channel"]="MedicalChannel"
  ["private-data-channel"]="PrivateDataChannel"
  ["insurance-channel"]="InsuranceChannel"
)

declare -A CHANNEL_ORGS=(
  ["medical-channel"]="HospitalMSP InsuranceMSP RegulatoryMSP"
  ["private-data-channel"]="HospitalMSP RegulatoryMSP"
  ["insurance-channel"]="HospitalMSP InsuranceMSP"
)

export CORE_PEER_TLS_ENABLED=true

print_status "Generating channel blocks..."
for channel_id in "${!CHANNEL_PROFILES[@]}"; do
    generate_channel_block "$channel_id" "${CHANNEL_PROFILES[$channel_id]}"
done

# Blocks are already in CLI container from generation step (no need to copy)

print_status "Joining orderers to channels via participation API..."
for channel_id in "${!CHANNEL_PROFILES[@]}"; do
    print_status "Joining orderers to ${channel_id}..."
    for entry in "${ORDERERS[@]}"; do
        IFS=':' read -r orderer_host admin_port <<<"$entry"
        print_status "  Joining ${orderer_host} to ${channel_id}..."
        output=$(join_orderer_channel "$channel_id" "$orderer_host" "$admin_port" 2>&1)
        if echo "$output" | grep -q "Status: 200\|Status: 201"; then
            print_status "    ✓ ${orderer_host} joined successfully"
        else
            if echo "$output" | grep -q "already exists"; then
                print_status "    ✓ ${orderer_host} already in channel"
            else
                print_warning "    ✗ Failed to join ${orderer_host}: $(echo "$output" | grep -o '"error":"[^"]*' | cut -d'"' -f4 || echo "unknown error")"
            fi
        fi
    done
done

print_status "Joining peers to channels..."
for channel_id in "${!CHANNEL_ORGS[@]}"; do
    for org in ${CHANNEL_ORGS[$channel_id]}; do
        set_peer_env "$org"
        peer_cli channel join -b "${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}.block"
    done
done

ORDERER_ENDPOINT="orderer0.orderer.medical.com:7050"
ORDERER_CA="${CLI_ORG_DIR}/ordererOrganizations/orderer.medical.com/orderers/orderer0.orderer.medical.com/tls/ca.crt"

print_status "Updating anchor peers..."
for channel_id in "${!CHANNEL_ORGS[@]}"; do
    profile="${CHANNEL_PROFILES[$channel_id]}"
    for org in ${CHANNEL_ORGS[$channel_id]}; do
        generate_anchor_update "$channel_id" "$profile" "$org"
        # Anchor tx is already in CLI container from generation
        set_peer_env "$org"
        peer_cli channel update \
            -o "$ORDERER_ENDPOINT" \
            --ordererTLSHostnameOverride orderer0.orderer.medical.com \
            -c "$channel_id" \
            -f "${CLI_CHANNEL_ARTIFACTS_DIR}/${channel_id}-${org}-anchor.tx" \
            --tls --cafile "$ORDERER_CA"
    done
done

print_status "Channel creation and setup completed successfully!"