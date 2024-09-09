#!/bin/bash

docker rmi localhost/postiz || true
docker build --target dist -t localhost/postiz -f Dockerfile .
docker build --target devcontainer -t localhost/postiz-devcontainer -f Dockerfile .
