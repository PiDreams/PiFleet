#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="pifleet-agent"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=PiFleet agent
After=network.target

[Service]
Type=simple
WorkingDirectory=$REPO_ROOT
ExecStart=/usr/bin/env bash -lc 'cd "$REPO_ROOT" && /usr/bin/env node agent/agent.js'
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin
EOF

# Optionally append environment variables if provided when running install.sh
if [ -n "${SERVER_URL:-}" ]; then
  echo "Environment=SERVER_URL=${SERVER_URL}" >> "$SERVICE_FILE"
fi

if [ -n "${DEVICE_REGISTRATION_TOKEN:-}" ]; then
  echo "Environment=DEVICE_REGISTRATION_TOKEN=${DEVICE_REGISTRATION_TOKEN}" >> "$SERVICE_FILE"
fi

if [ -n "${DEVICE_ID:-}" ]; then
  echo "Environment=DEVICE_ID=${DEVICE_ID}" >> "$SERVICE_FILE"
fi

cat >> "$SERVICE_FILE" <<EOF

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "PiFleet agent installed as systemd service"
