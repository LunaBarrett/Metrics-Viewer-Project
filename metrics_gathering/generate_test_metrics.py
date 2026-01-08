import requests
import random
import time
from datetime import datetime
import logging
import os
import json

# --- CONFIGURABLE VARIABLES (override via environment variables) ---
#
# IMPORTANT for Option B deployments:
# - Nginx listens on HTTPS :5000, which can complicate local test generation (certs).
# - Use BASE_URL=http://127.0.0.1:5002 to talk directly to Gunicorn.
#
BASE_URL = os.environ.get("METRICS_BASE_URL", "http://127.0.0.1:5002").rstrip("/")

SEND_INTERVAL_SECONDS = int(os.environ.get("METRICS_SEND_INTERVAL_SECONDS", "5"))
FOREVER = os.environ.get("METRICS_FOREVER", "true").lower() in ("1", "true", "yes", "y")
DURATION_SECONDS = int(os.environ.get("METRICS_DURATION_SECONDS", "60"))

NUM_HVS = int(os.environ.get("METRICS_NUM_HVS", "10"))
VMS_PER_HV = int(os.environ.get("METRICS_VMS_PER_HV", "5"))

REGISTER_ENDPOINT = os.environ.get("METRICS_REGISTER_ENDPOINT", f"{BASE_URL}/api/gathering/register_machine")
METRICS_ENDPOINT = os.environ.get("METRICS_METRICS_ENDPOINT", f"{BASE_URL}/api/gathering/metrics")
LOGGING_API_ENDPOINT = os.environ.get(
    "METRICS_LOGGING_API_ENDPOINT", f"{BASE_URL}/api/logging/frontend_log"
)  # Backend logging API endpoint

# --- Logging Setup ---
# Ensure logs directory exists
if not os.path.exists("logs"):
    os.makedirs("logs")

# Configure logging to file
logging.basicConfig(
    filename="logs/generate_test_metrics.log",
    level=logging.INFO,
    format='%(asctime)s %(levelname)s : %(message)s'
)
logger = logging.getLogger(__name__)

def send_remote_log(message, level="INFO", user="test_data_generator"):
    """
    Send a log message to the backend logging API endpoint.
    """
    log_payload = {
        "level": level,
        "message": message,
        "user": user
    }
    try:
        requests.post(LOGGING_API_ENDPOINT, json=log_payload, timeout=3)
    except Exception as e:
        logger.error(f"Failed to send remote log: {e}")

def register_machine(hostname, is_hypervisor=False, vm_list=None):
    """
    Register a machine (HV or VM) with the backend.
    """
    payload = {
        "hostname": hostname,
        "platform": "Linux-5.15.0",
        "is_hypervisor": is_hypervisor,
        "max_cores": random.randint(8, 32) if is_hypervisor else random.randint(2, 8),
        # Store sizes in BYTES (GiB) so the frontend's bytes->GB conversion works correctly.
        "max_memory": random.randint(32, 128) * 1024**3 if is_hypervisor else random.randint(4, 32) * 1024**3,
        "max_disk": random.randint(500, 2000) * 1024**3 if is_hypervisor else random.randint(50, 500) * 1024**3,
        "vm_list": vm_list if vm_list else []
    }
    try:
        response = requests.post(REGISTER_ENDPOINT, json=payload, timeout=3)
        msg = f"Registered test machine: {hostname} (is_hypervisor={is_hypervisor}) - Status: {response.status_code}"
        logger.info(msg)
        send_remote_log(msg, level="INFO")
    except Exception as e:
        msg = f"Failed to register test machine {hostname}: {e}"
        logger.error(msg)
        send_remote_log(msg, level="ERROR")

def send_metrics(hostname, is_hypervisor=False):
    """
    Send fake metrics for a given machine to the backend.
    """
    payload = {
        "hostname": hostname,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "current_cpu_usage": random.uniform(0, 100),
        "current_memory_usage": {
            # Values in BYTES (GiB) so UI displays non-zero GB.
            "total": random.randint(32, 128) * 1024**3 if is_hypervisor else random.randint(4, 32) * 1024**3,
            "used": random.randint(1, 127) * 1024**3 if is_hypervisor else random.randint(1, 31) * 1024**3,
            "percent": random.uniform(0, 100)
        },
        "current_disk_usage": [
            {
                "mountpoint": "/",
                "total": random.randint(500, 2000) * 1024**3 if is_hypervisor else random.randint(50, 500) * 1024**3,
                "used": random.randint(10, 1500) * 1024**3 if is_hypervisor else random.randint(10, 400) * 1024**3,
                "percent": random.uniform(0, 100)
            }
        ]
    }
    try:
        response = requests.post(METRICS_ENDPOINT, json=payload, timeout=3)
        msg = f"Sent test metrics for {hostname} - Status: {response.status_code}"
        logger.info(msg)
        logger.debug(f"Test metrics payload: {json.dumps(payload)}")
        send_remote_log(msg, level="INFO")
    except Exception as e:
        msg = f"Failed to send test metrics for {hostname}: {e}"
        logger.error(msg)
        send_remote_log(msg, level="ERROR")

if __name__ == "__main__":
    # Generate HV and VM names
    hv_names = [f"hv-{i+1}" for i in range(NUM_HVS)]
    vm_names = {hv: [f"{hv}-vm-{j+1}" for j in range(VMS_PER_HV)] for hv in hv_names}

    # Register all HVs and their VMs
    for hv in hv_names:
        register_machine(hv, is_hypervisor=True, vm_list=vm_names[hv])
        for vm in vm_names[hv]:
            register_machine(vm, is_hypervisor=False)

    logger.info("Test registration complete. Starting metrics loop...")
    send_remote_log("Test registration complete. Starting metrics loop...", level="INFO")

    # Main loop: send metrics at the configured interval
    start_time = time.time()
    while True:
        for hv in hv_names:
            send_metrics(hv, is_hypervisor=True)
            for vm in vm_names[hv]:
                send_metrics(vm, is_hypervisor=False)
        if not FOREVER and (time.time() - start_time) >= DURATION_SECONDS:
            msg = f"Finished sending test metrics for {DURATION_SECONDS} seconds."
            logger.info(msg)
            send_remote_log(msg, level="INFO")
            break
        time.sleep(SEND_INTERVAL_SECONDS)