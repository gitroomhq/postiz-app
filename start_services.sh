#!/bin/bash

# Define volume names
REDIS_VOLUME="clickvote-redis-data"
MONGODB_VOLUME="clickvote-mongodb-data"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker before running this script."
    exit 1
fi

# Create Docker volumes if they don't exist
if ! docker volume ls | grep -q "$REDIS_VOLUME"; then
    docker volume create "$REDIS_VOLUME"
fi

if ! docker volume ls | grep -q "$MONGODB_VOLUME"; then
    docker volume create "$MONGODB_VOLUME"
fi

# Run Redis container with a persistent volume
echo "Starting Redis container with data persistence..."
docker run -d --name clickvote-redis -p 6379:6379 -v "$REDIS_VOLUME":/data redis

# Run MongoDB container with a persistent volume
echo "Starting MongoDB container with data persistence..."
docker run -d --name clickvote-mongodb \
  -p 27017:27017 \
  -v "$MONGODB_VOLUME":/data/db \
  -e MONGO_INITDB_DATABASE=clickvote \
  mongo


# Check running containers
echo "Running containers:"
docker ps
