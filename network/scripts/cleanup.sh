#!/bin/bash

# Cleanup script for medical network

set -e

print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_status "Cleaning up previous network setup..."

# Stop and remove containers
docker-compose -f docker/docker-compose.yaml down --volumes --remove-orphans 2>/dev/null || true

# Remove generated crypto material
rm -rf organizations/ordererOrganizations
rm -rf organizations/peerOrganizations
rm -rf organizations/hospital
rm -rf organizations/insurance
rm -rf organizations/regulatory

# Remove channel artifacts
rm -rf channel-artifacts/*
rm -rf system-genesis-block/*

# Remove docker volumes
docker volume prune -f

print_status "Cleanup completed successfully!"

