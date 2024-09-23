#!/bin/bash

set -o xtrace

docker rmi localhost/postiz || true
docker build --target dist -t localhost/postiz -f Dockerfile.dev .
docker build --target devcontainer -t localhost/postiz-devcontainer -f Dockerfile.dev .
