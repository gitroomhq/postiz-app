#!/usr/bin/env bash

docker kill postiz || true 
docker rm postiz || true 
docker create --name postiz -p 3000:3000 -p 5000:5000 localhost/postiz
