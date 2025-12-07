import requests
import psutil
import socket
import time
import platform
import subprocess
import os
import logging
import json
from datetime import datetime

SEND_METRICS_INTERVAL = 1 # in seconds

# --- Logging Setup (local file) ---
if not os.path.exists("logs"):
    os.makedirs("logs")
logging.basicConfig(
    filename="logs/metrics_agent.log",
    level=logging.INFO,
    format='%(asctime)s %(levelname)s : %(message)s'
)
logger = logging.getLogger(__name__)

API_ENDPOINT = os.getenv("METRICS_API_ENDPOINT", "http://localhost:5000/api/metrics")
REGISTER_ENDPOINT = os.getenv("REGISTER_MACHINE_ENDPOINT", "http://localhost:5000/api/register_machine")
LOGGING_API_ENDPOINT = os.getenv("LOGGING_API_ENDPOINT", "http://localhost:5000/api/frontend-log")  # Backend logging API

def get_hostname():
    return socket.gethostname()

def get_max_cores():
    return psutil.cpu_count(logical=False)

def get_max_memory():
    return psutil.virtual_memory().total

def get_max_disk():
    total = 0
    for part in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(part.mountpoint)
            total += usage.total
        except PermissionError:
            continue
    return total

def get_current_cpu_usage():
    return psutil.cpu_percent(interval=1)

def get_current_memory_usage():
    vm = psutil.virtual_memory()
    return {
        "total": vm.total,
        "used": vm.used,
        "percent": vm.percent
    }

def get_current_disk_usage():
    usage_list = []
    for part in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(part.mountpoint)
            usage_list.append({
                "mountpoint": part.mountpoint,
                "total": usage.total,
                "used": usage.used,
                "percent": usage.percent
            })
        except PermissionError:
            continue
    return usage_list

def is_hypervisor():
    if os.path.exists('/sys/class/dmi/id/product_name'):
        with open('/sys/class/dmi/id/product_name') as f:
            prod = f.read().lower()
            if 'kvm' in prod or 'qemu' in prod:
                return True
    try:
        subprocess.run(['virsh', 'list'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception:
        return False

def get_vm_list():
    try:
        result = subprocess.run(['virsh', 'list', '--all'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        lines = result.stdout.strip().split('\n')[2:]
        vms = []
        for line in lines:
            parts = line.split()
            if len(parts) >= 2:
                vms.append(parts[1])
        return vms
    except Exception:
        return []

def register_machine():
    running_on_hv = is_hypervisor()
    payload = {
        "hostname": get_hostname(),
        "platform": platform.platform(),
        "is_hypervisor": running_on_hv,
        "max_cores": get_max_cores(),
        "max_memory": get_max_memory(),
        "max_disk": get_max_disk(),
        "vm_list": get_vm_list() if running_on_hv else []
    }
    try:
        response = requests.post(REGISTER_ENDPOINT, json=payload, timeout=3)
        logger.info(f"Registered machine: {payload['hostname']} (is_hypervisor={running_on_hv}) - Status: {response.status_code}")
        send_remote_log(f"Registered machine: {payload['hostname']} (is_hypervisor={running_on_hv}) - Status: {response.status_code}", level="INFO")
    except Exception as e:
        logger.error(f"Failed to register {payload['hostname']}: {e}")
        send_remote_log(f"Failed to register {payload['hostname']}: {e}", level="ERROR")

def send_metrics():
    running_on_hv = is_hypervisor()
    payload = {
        "hostname": get_hostname(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "current_cpu_usage": get_current_cpu_usage(),
        "current_memory_usage": get_current_memory_usage(),
        "current_disk_usage": get_current_disk_usage()
    }
    try:
        response = requests.post(API_ENDPOINT, json=payload, timeout=3)
        logger.info(f"Sent metrics for {payload['hostname']} - Status: {response.status_code}")
        logger.debug(f"Metrics payload: {json.dumps(payload)}")
        send_remote_log(f"Sent metrics for {payload['hostname']} - Status: {response.status_code}", level="INFO")
    except Exception as e:
        logger.error(f"Failed to send metrics for {payload['hostname']}: {e}")
        send_remote_log(f"Failed to send metrics for {payload['hostname']}: {e}", level="ERROR")

def send_remote_log(message, level="INFO"):
    log_payload = {
        "level": level,
        "message": message,
        "user": get_hostname()
    }
    try:
        requests.post(LOGGING_API_ENDPOINT, json=log_payload, timeout=3)
    except Exception as e:
        logger.error(f"Failed to send remote log: {e}")

if __name__ == "__main__":
    register_machine()
    while True:
        send_metrics()
        time.sleep(SEND_METRICS_INTERVAL)