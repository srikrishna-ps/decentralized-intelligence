#!/bin/bash

# Generate certificates using cryptogen
echo "Generating certificates..."

# Generate Orderer Org certs
cryptogen generate --config=../organizations/cryptogen/crypto-config-orderer.yaml --output="../organizations"

# Generate Hospital Org certs
cryptogen generate --config=../organizations/cryptogen/crypto-config-hospital.yaml --output="../organizations"

# Generate Insurance Org certs
cryptogen generate --config=../organizations/cryptogen/crypto-config-insurance.yaml --output="../organizations"

# Generate Regulatory Org certs
cryptogen generate --config=../organizations/cryptogen/crypto-config-regulatory.yaml --output="../organizations"

echo "Certificate generation completed!"
