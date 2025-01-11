#!/bin/bash

# Install necessary dependencies and tools
echo "Installing necessary dependencies and tools..."
npm install -g @nestjs/cli
npm install

# Set up environment variables and configuration files
echo "Setting up environment variables and configuration files..."
cp .env.example .env

# Launch the project using Docker Compose
echo "Launching the project using Docker Compose..."
docker-compose -f docker-compose.dev.yaml up --build
