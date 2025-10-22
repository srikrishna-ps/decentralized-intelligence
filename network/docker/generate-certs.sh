#!/bin/bash

# Exit on first error
set -e

# Generate crypto material using cryptogen
../bin/cryptogen generate --config=../crypto-config.yaml --output="../organizations"

echo "Generated certificates successfully"
