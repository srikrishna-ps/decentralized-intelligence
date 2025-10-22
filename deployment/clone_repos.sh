#!/bin/bash

# Exit on any error
set -e

echo "Cloning required repositories..."

# Create a tmp directory if it doesn't exist
mkdir -p ../tmp

# Clone Hyperledger Fabric Samples
if [ ! -d "../fabric-samples" ]; then
    echo "Cloning fabric-samples repository..."
    curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.2.0 1.4.9
    mv fabric-samples ../
else
    echo "fabric-samples already exists"
fi

echo "Repository cloning completed!"

# Make the script executable
chmod +x clone_repos.sh
