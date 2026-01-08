#!/usr/bin/env bash
set -euo pipefail

# Rocky 9 Option B1 deploy script:
# - Nginx :5000 (HTTPS) + :5001 (redirect)
# - Next.js :3000 (localhost)
# - Gunicorn :5002 (localhost)
# - Dedicated system user: metrics
# - App installed to: /opt/metrics-viewer
#
# Usage:
#   bash deployment/deploy_rocky9_b1.sh /absolute/path/to/Cursor-Metrics-Viewer-Project
#
# Optional env:
#   SERVER_NAME="_"                 # nginx server_name (default "_")
#   GENERATE_TEST_METRICS="true"    # install+start test generator service (default true)

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /absolute/path/to/Cursor-Metrics-Viewer-Project"
  exit 1
fi

SRC_DIR="$1"
SERVER_NAME="${SERVER_NAME:-_}"
TARGET_DIR="/opt/metrics-viewer"
METRICS_USER="metrics"
PNPM_BIN="/usr/local/bin/pnpm"
GENERATE_TEST_METRICS="${GENERATE_TEST_METRICS:-true}"

if [[ $EUID -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "ERROR: Source dir not found: $SRC_DIR"
  exit 1
fi
if [[ ! -f "$SRC_DIR/deployment/nginx.conf" ]] || [[ ! -f "$SRC_DIR/core/requirements.txt" ]]; then
  echo "ERROR: $SRC_DIR does not look like the repo root (missing deployment/nginx.conf or core/requirements.txt)"
  exit 1
fi

echo "[1/11] Stop old services (if any)"
systemctl disable --now gunicorn.service nextjs.service >/dev/null 2>&1 || true
systemctl disable --now metrics-generator.service >/dev/null 2>&1 || true

echo "[2/11] Install packages"
dnf install -y \
  nginx firewalld rsync openssl \
  python3 python3-pip \
  policycoreutils-python-utils

systemctl enable --now firewalld
systemctl enable --now nginx

echo "[3/11] Create dedicated service user: ${METRICS_USER}"
if ! id "$METRICS_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/metrics --shell /sbin/nologin "$METRICS_USER"
fi

echo "[4/11] Sync code to ${TARGET_DIR}"
mkdir -p "$TARGET_DIR"
rsync -a --delete "$SRC_DIR"/ "$TARGET_DIR"/
chown -R "$METRICS_USER:$METRICS_USER" "$TARGET_DIR"

echo "[5/11] SELinux + firewall"
# Allow nginx (httpd_t) to connect to upstream localhost ports
setsebool -P httpd_can_network_connect 1

# Allow nginx to bind to ports 5000/5001
semanage port -a -t http_port_t -p tcp 5000 2>/dev/null || semanage port -m -t http_port_t -p tcp 5000
semanage port -a -t http_port_t -p tcp 5001 2>/dev/null || semanage port -m -t http_port_t -p tcp 5001

firewall-cmd --permanent --add-port=5000/tcp
firewall-cmd --permanent --add-port=5001/tcp
firewall-cmd --reload

echo "[6/11] Gunicorn log/run dirs"
mkdir -p /var/log/gunicorn /var/run/gunicorn
chown -R "$METRICS_USER:$METRICS_USER" /var/log/gunicorn /var/run/gunicorn

echo "[7/11] Generate self-signed cert for nginx"
mkdir -p /etc/nginx/ssl
chmod +x "$TARGET_DIR/deployment/generate-self-signed-cert.sh"
bash "$TARGET_DIR/deployment/generate-self-signed-cert.sh"

echo "[8/11] Install nginx config (Rocky layout)"
install -m 0644 "$TARGET_DIR/deployment/nginx.conf" /etc/nginx/conf.d/metrics-viewer.conf
sed -i \
  -e "s/^\s*server_name\s\+.*;/    server_name ${SERVER_NAME};/g" \
  -e 's@return 301 https://.*:5000\$request_uri;@    return 301 https://$host:5000$request_uri;@g' \
  /etc/nginx/conf.d/metrics-viewer.conf
nginx -t
systemctl reload nginx

echo "[9/11] Backend venv + deps"
sudo -u "$METRICS_USER" python3 -m venv "$TARGET_DIR/venv"
sudo -u "$METRICS_USER" "$TARGET_DIR/venv/bin/python" -m pip install --upgrade pip
sudo -u "$METRICS_USER" "$TARGET_DIR/venv/bin/python" -m pip install -r "$TARGET_DIR/core/requirements.txt"
# Needed for metrics_gathering/generate_test_metrics.py
sudo -u "$METRICS_USER" "$TARGET_DIR/venv/bin/python" -m pip install requests

echo "[10/11] Frontend: Node.js + pnpm + build"
dnf module reset -y nodejs >/dev/null 2>&1 || true
dnf module enable -y nodejs:20
dnf install -y nodejs

if [[ ! -x "$PNPM_BIN" ]]; then
  npm install -g pnpm
fi

sudo -u "$METRICS_USER" bash -lc "cd '$TARGET_DIR/front_end' && '$PNPM_BIN' install && '$PNPM_BIN' build"

echo "[11/11] Install systemd units + start services"
cat >/etc/systemd/system/gunicorn.service <<'EOF'
[Unit]
Description=Gunicorn instance to serve Metrics Viewer Flask API
After=network.target

[Service]
User=metrics
Group=metrics
WorkingDirectory=/opt/metrics-viewer
Environment="PATH=/opt/metrics-viewer/venv/bin:/usr/bin:/bin"
ExecStart=/opt/metrics-viewer/venv/bin/python -m gunicorn --config /opt/metrics-viewer/deployment/gunicorn_config.py 'back_end.app.app:create_app()'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/nextjs.service <<'EOF'
[Unit]
Description=Next.js server for Metrics Viewer frontend
After=network.target

[Service]
User=metrics
Group=metrics
WorkingDirectory=/opt/metrics-viewer/front_end
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="HOSTNAME=127.0.0.1"
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/local/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now gunicorn.service nextjs.service

echo ""
echo "Services:"
systemctl --no-pager --full status gunicorn.service nextjs.service nginx.service || true

if [[ "$GENERATE_TEST_METRICS" == "true" ]]; then
  echo ""
  echo "Installing+starting metrics generator systemd service (runs indefinitely) ..."
  cat >/etc/systemd/system/metrics-generator.service <<'EOF'
[Unit]
Description=Metrics Viewer - test metrics generator (indefinite)
After=network.target gunicorn.service

[Service]
User=metrics
Group=metrics
WorkingDirectory=/opt/metrics-viewer
Environment="PATH=/opt/metrics-viewer/venv/bin:/usr/bin:/bin"
Environment="METRICS_BASE_URL=http://127.0.0.1:5002"
Environment="METRICS_FOREVER=true"
ExecStart=/opt/metrics-viewer/venv/bin/python -u /opt/metrics-viewer/metrics_gathering/generate_test_metrics.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now metrics-generator.service
fi

echo ""
echo "Deployment complete."
echo "Access from your machine: https://<VM-IP>:5000"


