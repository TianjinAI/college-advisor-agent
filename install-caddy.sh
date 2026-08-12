#!/bin/bash
set -euo pipefail

# Caddy systemd service for direct VPS reverse-proxy.
# Installs config and robots.txt into /etc/caddy, starts caddy.

CADDY_DIR=/etc/caddy
LOG_DIR=/var/log/caddy
WWW_DIR=/var/www/caddy/robots

sudo mkdir -p "$CADDY_DIR" "$LOG_DIR" "$WWW_DIR"
sudo cp /home/admin/college-advisor-agent/Caddyfile.json "$CADDY_DIR/Caddyfile.json"
sudo cp /home/admin/college-advisor-agent/robots.txt "$WWW_DIR/robots.txt"

# Use an unprivileged user if available, else root (Alibaba Linux 3 container host)
sudo useradd -r -s /usr/sbin/nologin caddy 2>/dev/null || true

sudo tee /etc/systemd/system/caddy.service >/dev/null <<'EOF'
[Unit]
Description=Caddy web server
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/local/bin/caddy run --config /etc/caddy/Caddyfile.json
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile.json --force
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/caddy /home/caddy/.local/share/caddy
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now caddy

sleep 1
sudo systemctl status caddy --no-pager
