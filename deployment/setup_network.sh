#!/bin/bash

# Exit on any error
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    case $level in
        "INFO") echo -e "${GREEN}[INFO]${NC} $*" ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $*" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $*" ;;
    esac
}

# Health check function
check_container_health() {
    local container=$1
    local max_attempts=${2:-30}  # default 30 attempts
    local attempt=1

    log "INFO" "Checking health of $container..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps | grep -q $container; then
            local status=$(docker inspect --format '{{.State.Status}}' $container)
            if [ "$status" = "running" ]; then
                log "INFO" "$container is healthy!"
                return 0
            fi
        fi
        log "WARN" "Waiting for $container (Attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log "ERROR" "$container failed to start properly"
    return 1
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up previous network state..."
    cd ../network/docker
    docker-compose down --volumes --remove-orphans
    if [ $? -ne 0 ]; then
        log "ERROR" "Cleanup failed"
        exit 1
    fi
}

# Start network function
start_network() {
    log "INFO" "Starting network components..."
    docker-compose up -d
    if [ $? -ne 0 ]; then
        log "ERROR" "Failed to start network"
        exit 1
    fi
}

# Main execution
log "INFO" "Starting network setup..."

# Execute cleanup
cleanup

# Start the network
start_network

# Check critical services
log "INFO" "Verifying network components..."

# Check orderers
for orderer in orderer0 orderer1 orderer2; do
    check_container_health "${orderer}.orderer.medical.com" || exit 1
done

# Check admin peer
check_container_health "peer0.admin.medical.com" || exit 1

# Check other peers
check_container_health "peer0.hospital.medical.com" || exit 1
check_container_health "peer0.insurance.medical.com" || exit 1

log "INFO" "Network setup completed successfully!"
