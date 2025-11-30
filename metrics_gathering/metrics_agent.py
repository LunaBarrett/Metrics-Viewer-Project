import psutil
import socket
import time
import json
import requests
import subprocess
import platform
import os
from datetime import datetime

# Set your endpoints (adjust as needed)
REGISTER_ENDPOINT = os.getenv("REGISTER_MACHINE_ENDPOINT", "http://localhost:5000/api/register_machine")
METRICS_ENDPOINT = os.getenv("METRICS_ENDPOINT", "http://localhost:5000/api/metrics")

# gathering the name

def get_hostname():
    return socket.gethostname()

# gathering the allocated resources

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

# gathering the current usage of resources

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

# hypervisor specific metrics

def is_hypervisor():
    # Check for KVM by looking for product_name or virsh
    if os.path.exists('/sys/class/dmi/id/product_name'):
        with open('/sys/class/dmi/id/product_name') as f:
            prod = f.read().lower()
            if 'kvm' in prod or 'qemu' in prod:
                return True
    # Try virsh command
    try:
        subprocess.run(['virsh', 'list'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception:
        return False
    
def get_vm_list():
    # Only works if running on HV with virsh installed
    try:
        result = subprocess.run(['virsh', 'list', '--all'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        lines = result.stdout.strip().split('\n')[2:]  # Skip header lines
        vms = []
        for line in lines:
            parts = line.split()
            if len(parts) >= 2:
                vms.append(parts[1])
        return vms
    except Exception:
        return None
    
# sending the metrics

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
    headers = {'Content-Type': 'application/json'}
    try:
        response = requests.post(REGISTER_ENDPOINT, headers=headers, data=json.dumps(payload))
        print(f"Register machine: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Failed to register machine: {e}")


def send_metrics():
    payload = {
        "hostname": get_hostname(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "current_cpu_usage": get_current_cpu_usage(),
        "current_memory_usage": get_current_memory_usage(),
        "current_disk_usage": get_current_disk_usage()
    }
    headers = {'Content-Type': 'application/json'}
    try:
        response = requests.post(METRICS_ENDPOINT, headers=headers, data=json.dumps(payload))
        print(f"Sent metrics: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Failed to send metrics: {e}")

def main():
    running_on_hv = is_hypervisor()
    data = {
        "hostname": get_hostname(),
        "vm_list": get_vm_list() if running_on_hv else None,
        "max_cores": get_max_cores(),
        "max_memory": get_max_memory(),
        "max_disk": get_max_disk(),
        "current_cpu_usage": get_current_cpu_usage(),
        "current_memory_usage": get_current_memory_usage(),
        "current_disk_usage": get_current_disk_usage(),
        "platform": platform.platform(),
        "is_hypervisor": running_on_hv
    }
    print(json.dumps(data, indent=2))  # Optional: for local debugging
    send_metrics(data)

# only runs if called directly

if __name__ == "__main__":
    register_machine()  # Register once at startup
    while True:
        send_metrics()
        time.sleep(1)  # Send metrics every 1 second (adjust as needed)