# Gunicorn configuration for Flask app
# Bind to localhost only (Nginx will proxy to this)

import multiprocessing

# Server socket
bind = "127.0.0.1:5002"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "/var/log/gunicorn/metrics-viewer-access.log"
errorlog = "/var/log/gunicorn/metrics-viewer-error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "metrics-viewer-api"

# Server mechanics
daemon = False
pidfile = "/var/run/gunicorn/metrics-viewer.pid"
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (not needed here - Nginx handles SSL)
# keyfile = None
# certfile = None

