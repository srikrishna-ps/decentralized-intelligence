#!/bin/bash

# Cleanup script for medical network

set -e

print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_status "Cleaning up previous network setup..."

# Stop and remove containers
docker-compose -f docker/docker-compose.yaml down --volumes --remove-orphans

# Remove generated crypto material
rm -rf organizations/hospital/ca
rm -rf organizations/hospital/msp
rm -rf organizations/hospital/peers
rm -rf organizations/hospital/users
rm -rf organizations/insurance/ca
rm -rf organizations/insurance/msp
rm -rf organizations/insurance/peers
rm -rf organizations/insurance/users
rm -rf organizations/regulatory/ca
rm -rf organizations/regulatory/msp
rm -rf organizations/regulatory/peers
rm -rf organizations/regulatory/users
rm -rf organizations/orderer

# Remove channel artifacts
rm -rf channel-artifacts/*
rm -rf system-genesis-block/*

# Remove docker volumes
docker volume prune -f

print_status "Cleanup completed successfully!"