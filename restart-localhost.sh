#!/bin/bash
# Rebuild and restart college-advisor container with localhost binding.
# Run from /home/admin/college-advisor-agent
set -euo pipefail
cd /home/admin/college-advisor-agent

# Backup current image tag so we can rollback quickly
docker tag college-advisor-agent:latest college-advisor-agent:pre-localhost-bind 2>/dev/null || true

# Rebuild from current source (picks up the 127.0.0.1 listen bind)
docker build -t college-advisor-agent:latest .

# Recreate container with the updated image and compose config
docker compose down
docker compose up -d

# Wait for healthcheck and verify localhost-only binding
for i in {1..12}; do
  sleep 2
  if curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; then
    echo "OK: healthcheck passes on 127.0.0.1:3001"
    ss -tlnp | grep -E ':3001\b'
    exit 0
  fi
done

echo "ERROR: healthcheck did not pass after 24s" >&2
exit 1
