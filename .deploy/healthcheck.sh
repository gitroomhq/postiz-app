#!/bin/bash
set -e

curl --fail http://localhost:$POST/health || exit 1

npm run db:health || exit 1

npm run redis:health || exit 1