#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Check disk usage
check_disk_usage() {
    local container=$1
    local threshold=80  # Alert if disk usage > 80%
    
    usage=$(docker exec $container df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    if [ "$usage" -gt "$threshold" ]; then
        log "WARN" "High disk usage in $container: $usage%"
    else
        log "INFO" "Disk usage for $container: $usage%"
    fi
}

# Check container logs for errors
check_logs() {
    local container=$1
    local timeframe="5m"  # Check last 5 minutes
    
    error_count=$(docker logs --since $timeframe $container 2>&1 | grep -ic "error\|failed\|fatal")
    if [ "$error_count" -gt 0 ]; then
        log "WARN" "Found $error_count errors in $container logs"
    else
        log "INFO" "No recent errors in $container logs"
    fi
}

# Check network connectivity
check_network() {
    local container=$1
    local target=$2
    
    if docker exec $container ping -c 1 $target >/dev/null 2>&1; then
        log "INFO" "Network connectivity OK: $container -> $target"
    else
        log "ERROR" "Network connectivity failed: $container -> $target"
    fi
}

# Main monitoring loop
while true; do
    log "INFO" "Starting health check..."
    
    # Monitor orderers
    for orderer in orderer0 orderer1 orderer2; do
        container="${orderer}.orderer.medical.com"
        check_disk_usage $container
        check_logs $container
    done
    
    # Monitor peers
    for peer in peer0.admin peer0.hospital peer0.insurance; do
        container="${peer}.medical.com"
        check_disk_usage $container
        check_logs $container
        check_network $container "orderer0.orderer.medical.com"
    done
    
    log "INFO" "Health check complete. Waiting 5 minutes..."
    sleep 300  # Wait 5 minutes before next check
done
