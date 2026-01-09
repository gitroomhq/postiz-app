#!/bin/sh

sleep 5

tctl namespace create --namespace "default" --description 'Default namespace' --rd 1

tini -s -- sleep infinity