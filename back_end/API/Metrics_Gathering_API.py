from flask import Blueprint, request, jsonify
from datetime import datetime
import json
from back_end.database.models import db, MachineDetail, MachineMetric

metrics_api = Blueprint('metrics_api', __name__)

@metrics_api.route('/api/gathering/register_machine', methods=['POST'])
def register_machine():
    data = request.get_json()
    hostname = data.get('hostname')
    platform = data.get('platform')
    is_hypervisor = data.get('is_hypervisor', False)
    max_cores = data.get('max_cores')
    max_memory = data.get('max_memory')
    max_disk = data.get('max_disk')
    vm_list = data.get('vm_list', [])

    # Find or create machine
    machine = MachineDetail.query.filter_by(Hostname=hostname).first()
    if not machine:
        machine = MachineDetail(
            Hostname=hostname,
            Platform=platform,
            Is_Hypervisor=is_hypervisor,
            Max_Cores=max_cores,
            Max_Memory=max_memory,
            Max_Disk=max_disk
        )
        db.session.add(machine)
    else:
        machine.Platform = platform
        machine.Is_Hypervisor = is_hypervisor
        machine.Max_Cores = max_cores
        machine.Max_Memory = max_memory
        machine.Max_Disk = max_disk

    db.session.commit()

    # Optionally: Update VM-HV relationships here using vm_list

    return jsonify({"status": "success", "message": "Machine registered/updated"}), 201

@metrics_api.route('/api/gathering/metrics', methods=['POST'])
def receive_metrics():
    data = request.get_json()
    hostname = data.get('hostname')
    timestamp_str = data.get('timestamp')
    current_cpu_usage = data.get('current_cpu_usage')
    current_memory_usage = data.get('current_memory_usage')
    current_disk_usage = data.get('current_disk_usage')

    # Convert timestamp string to a Python datetime object
    if timestamp_str:
        try:
            # Handle both with and without 'Z'
            if timestamp_str.endswith('Z'):
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            else:
                timestamp = datetime.fromisoformat(timestamp_str)
        except Exception:
            timestamp = datetime.utcnow()
    else:
        timestamp = datetime.utcnow()

    machine = MachineDetail.query.filter_by(Hostname=hostname).first()
    if not machine:
        return jsonify({"status": "error", "message": "Machine not registered"}), 400

    metric = MachineMetric(
        Machine_ID=machine.Machine_ID,
        Timestamp=timestamp,
        Current_CPU_Usage=current_cpu_usage,
        Current_Memory_Usage=json.dumps(current_memory_usage),
        Current_Disk_Usage=json.dumps(current_disk_usage)
    )
    db.session.add(metric)
    db.session.commit()
    return jsonify({"status": "success", "message": "Metrics received"}), 201