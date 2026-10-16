#!/usr/bin/env bash
# Applies the prisma migrations when the container boots.
#
#   - a database that already tracks migrations: the pending ones are applied
#   - a brand new database: the baseline migration (0_init) is applied
#   - a database created by the old `prisma db push` flow, which has the schema
#     but no _prisma_migrations table: `migrate deploy` refuses with P3005, so the
#     baseline is marked as applied first and the migrations run after that
#
# Anything else exits non zero on purpose: a container that starts with a half
# applied schema, or with a schema that silently dropped a column, is worse than
# a container that refuses to start and lets the operator look at it.
set -euo pipefail

SCHEMA="./libraries/nestjs-libraries/src/database/prisma/schema.prisma"
BASELINE="0_init"

if output="$(pnpm exec prisma migrate deploy --schema "$SCHEMA" 2>&1)"; then
  echo "$output"
  exit 0
fi

echo "$output"

# P3005: the database schema is not empty, but there is no migration history in it
if ! echo "$output" | grep -q "P3005"; then
  echo "prisma migrate deploy failed, not touching the database" >&2
  exit 1
fi

echo "this database predates the migrations, marking $BASELINE as applied"
pnpm exec prisma migrate resolve --applied "$BASELINE" --schema "$SCHEMA"
pnpm exec prisma migrate deploy --schema "$SCHEMA"
