#!/bin/bash

# Define container names and volume names
REDIS_CONTAINER="clickvote-redis"
MONGODB_CONTAINER="clickvote-mongodb"
REDIS_VOLUME="clickvote-redis-data"
MONGODB_VOLUME="clickvote-mongodb-data"

# Stop and remove containers
echo "Stopping and removing Redis container..."
docker stop "$REDIS_CONTAINER"
docker rm "$REDIS_CONTAINER"

echo "Stopping and removing MongoDB container..."
docker stop "$MONGODB_CONTAINER"
docker rm "$MONGODB_CONTAINER"

# Check running containers
echo "Running containers:"
docker ps

# Remove Docker volumes
echo "Removing Redis volume..."
docker volume rm "$REDIS_VOLUME"

echo "Removing MongoDB volume..."
docker volume rm "$MONGODB_VOLUME"

# Verify that volumes are removed
echo "Docker volumes:"
docker volume ls
