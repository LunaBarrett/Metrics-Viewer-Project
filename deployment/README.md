# Deployment Guide for Single-VM Setup

This directory contains configuration files for deploying the Metrics Viewer Project on a single VM with Nginx as a reverse proxy.

## Architecture

- **Nginx**: Listens on ports 5000 (HTTPS) and 5001 (HTTP redirect)
- **Next.js**: Runs on `127.0.0.1:3000`
- **Flask (Gunicorn)**: Runs on `127.0.0.1:5002`

## Setup Steps

> **Rocky 9 note**
> This guide was originally written with Debian/Ubuntu-style Nginx layouts (`sites-available/` + `sites-enabled/`).
> On **Rocky 9 (RHEL-family)**, the standard layout is **`/etc/nginx/conf.d/*.conf`**. This README reflects the Rocky 9 approach.

### 1. Generate Self-Signed Certificate

```bash
cd deployment
chmod +x generate-self-signed-cert.sh
sudo ./generate-self-signed-cert.sh
```

### 2. Install Nginx Configuration

```bash
# Install Nginx (Rocky 9)
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# Ensure cert directory exists (script writes to /etc/nginx/ssl)
sudo mkdir -p /etc/nginx/ssl

# Copy nginx config to conf.d (Rocky 9 layout)
sudo cp nginx.conf /etc/nginx/conf.d/metrics-viewer.conf

# IMPORTANT: edit server_name in /etc/nginx/conf.d/metrics-viewer.conf
# - set it to your VM IP/hostname, or use: server_name _;

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Rocky 9: SELinux (required if enforcing)
If SELinux is **Enforcing**, Nginx may be blocked from binding to non-standard ports (5000/5001).

```bash
sudo dnf install -y policycoreutils-python-utils
sudo semanage port -a -t http_port_t -p tcp 5000 || sudo semanage port -m -t http_port_t -p tcp 5000
sudo semanage port -a -t http_port_t -p tcp 5001 || sudo semanage port -m -t http_port_t -p tcp 5001
sudo systemctl restart nginx
```

### 3. Create Log Directories

```bash
sudo mkdir -p /var/log/gunicorn
sudo mkdir -p /var/run/gunicorn

# Rocky 9 typically uses 'nginx' as the service user (www-data often doesn't exist)
sudo chown nginx:nginx /var/log/gunicorn /var/run/gunicorn
```

### 4. Install Python Dependencies

```bash
cd /path/to/Metrics-Viewer-Project
python3 -m venv venv
source venv/bin/activate
pip install -r core/requirements.txt
```

### 5. Build and Install Frontend

```bash
cd front_end
# Install Node.js and pnpm (Rocky 9)
sudo dnf module enable -y nodejs:20
sudo dnf install -y nodejs

# pnpm install option A (preferred): corepack (may not be available in Rocky's nodejs package)
if command -v corepack >/dev/null 2>&1; then
  sudo corepack enable
  corepack prepare pnpm@latest --activate
else
  # pnpm install option B: npm global install
  sudo npm install -g pnpm
fi

pnpm install
pnpm build
```

#### Start the frontend (production)
After `pnpm build`, start Next.js on localhost port 3000:

```bash
cd front_end
PORT=3000 pnpm start
```

> Note: On some setups, `pnpm start -- -p 3000` can be mis-parsed by `next start` (it may treat `-p` as a directory due to an extra `--`).
> Using `PORT=3000 pnpm start` avoids argument parsing issues.

### 6. Configure Systemd Services

Edit the service files to set correct paths:
- `gunicorn.service`: Update `WorkingDirectory`, `PATH`, and `ExecStart` paths
- `nextjs.service`: Update `WorkingDirectory`, `PATH`, and `ExecStart` paths

Then install:

```bash
sudo cp deployment/gunicorn.service /etc/systemd/system/
sudo cp deployment/nextjs.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gunicorn.service
sudo systemctl enable nextjs.service
sudo systemctl start gunicorn.service
sudo systemctl start nextjs.service
```

### 7. Verify Services

```bash
# Check status
sudo systemctl status gunicorn
sudo systemctl status nextjs
sudo systemctl status nginx

# Check logs
sudo journalctl -u gunicorn -f
sudo journalctl -u nextjs -f
sudo tail -f /var/log/nginx/metrics-viewer-error.log
```

### 8. Trust Certificate on Client Machines

1. Copy `/etc/nginx/ssl/metrics-viewer.crt` to your local machine
2. Import into your browser/OS certificate store
3. Access `https://130.246.213.163:5000`

## Firewall Configuration

Ensure ports 5000 and 5001 are open:

```bash
# Rocky 9 uses firewalld by default
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --permanent --add-port=5001/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

- **502 Bad Gateway**: Check that Gunicorn and Next.js are running
- **SSL errors**: Verify certificate is in `/etc/nginx/ssl/` with correct permissions
- **Connection refused**: Verify services are bound to `127.0.0.1` not `0.0.0.0`

