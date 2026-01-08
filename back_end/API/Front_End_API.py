# the purpose of this file is to act as an API for everything going to and coming from the front end of the application

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from functools import wraps
from back_end.database.models import db, UserProfile, MachineDetail, SavedDashboard, MachineMetric
from collections import defaultdict
import bcrypt
import time
import json
from datetime import datetime, timezone

# Create a Blueprint for the API
front_end_api = Blueprint('front_end_api', __name__)

def _get_current_user_id():
    """
    flask_jwt_extended may return identity as a string depending on configuration/version.
    Also, some versions require JWT 'sub' to be a string (RFC compliance).
    We store user IDs as integers, so normalize here.
    """
    raw = get_jwt_identity()
    try:
        return int(raw)
    except Exception:
        return None

# Create an admin required decorator
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("admin"):
            return jsonify({"status": "error", "message": "Admin access required."}), 403
        return fn(*args, **kwargs)
    return wrapper

# User Related Endpoints

# --- Registration Endpoint ---

@front_end_api.route('/api/front_end/user/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')  # Expect plain password from frontend

    if not username or not password:
        return jsonify({"status": "error", "message": "Username and password required."}), 400

    if UserProfile.query.filter_by(Username=username).first():
        return jsonify({"status": "error", "message": "Username already exists."}), 400

    # Hash the password securely using bcrypt
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    user = UserProfile(Username=username, Password_Hash=password_hash)
    db.session.add(user)
    db.session.commit()
    return jsonify({"status": "success", "message": "User registered."}), 201

# --- Login Endpoint ---

FAILED_LOGIN_ATTEMPTS = defaultdict(int)
LOCKOUT_INFO = defaultdict(lambda: {"count": 0, "until": 0})
LOCKOUT_PERIODS = [60, 120, 300, 900]  # seconds: 1min, 2min, 5min, 15min

@front_end_api.route('/api/front_end/user/login', methods=['POST'])
def login():
    """
    Authenticates a user, issues a JWT, and enforces progressive lockout on repeated failures.
    Expects JSON: { "username": "...", "password": "..." }
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')  # Expect plain password from frontend
    now = time.time()

    lockout = LOCKOUT_INFO[username]
    # If currently locked out
    if now < lockout["until"]:
        remaining = int(lockout["until"] - now)
        return jsonify({
            "status": "error",
            "message": f"Account locked. Try again in {remaining} seconds."
        }), 403

    user = UserProfile.query.filter_by(Username=username).first()
    # Check user exists and password is correct
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.Password_Hash.encode('utf-8')):
        FAILED_LOGIN_ATTEMPTS[username] += 1
        if FAILED_LOGIN_ATTEMPTS[username] >= 3:
            # Progressive lockout: increase lockout period each time
            lockout["count"] += 1
            period = LOCKOUT_PERIODS[min(lockout["count"]-1, len(LOCKOUT_PERIODS)-1)]
            lockout["until"] = now + period
            FAILED_LOGIN_ATTEMPTS[username] = 0  # reset attempts after lockout
            return jsonify({
                "status": "error",
                "message": f"Too many failed attempts. Account locked for {period//60} minutes."
            }), 403
        else:
            remaining = 3 - FAILED_LOGIN_ATTEMPTS[username]
            return jsonify({
                "status": "error",
                "message": f"Invalid credentials. {remaining} login attempts remaining."
            }), 401

    # Successful login: reset counters
    FAILED_LOGIN_ATTEMPTS[username] = 0
    LOCKOUT_INFO[username] = {"count": 0, "until": 0}
    access_token = create_access_token(
        # Some environments require JWT subject ('sub') to be a string.
        identity=str(user.User_ID),
        additional_claims={"admin": user.Admin_Status}
    )
    return jsonify({"status": "success", "access_token": access_token}), 200



# --- Profile Endpoint ---
@front_end_api.route('/api/front_end/user/profile', methods=['GET', 'POST', 'PUT', 'DELETE'])
@jwt_required()
def profile_endpoint():
    """
    Handles user profile actions:
    - GET: Retrieve profile info
    - POST: Change username
    - PUT: Change password (securely hashed)
    - DELETE: Delete profile
    """
    user_id = _get_current_user_id()
    if user_id is None:
        return jsonify({"status": "error", "message": "Invalid token identity"}), 422
    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404

    if request.method == 'GET':
        # Return profile info
        return jsonify({
            "status": "success",
            "data": {
                "User_ID": user.User_ID,
                "Username": user.Username,
                "Admin_Status": user.Admin_Status
            }
        })

    elif request.method == 'POST':
        # Change username
        data = request.get_json()
        new_username = data.get('username')
        if new_username:
            if UserProfile.query.filter_by(Username=new_username).first():
                return jsonify({"status": "error", "message": "Username already exists"}), 400
            user.Username = new_username
            db.session.commit()
            return jsonify({"status": "success", "message": "Username updated"})
        return jsonify({"status": "error", "message": "No username provided"}), 400

    elif request.method == 'PUT':
        # Change password (hash securely)
        data = request.get_json()
        new_password = data.get('password')  # Expect plain password from frontend
        if new_password:
            import bcrypt  # Ensure bcrypt is imported at the top of your file
            new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            user.Password_Hash = new_password_hash
            db.session.commit()
            return jsonify({"status": "success", "message": "Password updated"})
        return jsonify({"status": "error", "message": "No password provided"}), 400

    elif request.method == 'DELETE':
        # Delete profile
        db.session.delete(user)
        db.session.commit()
        return jsonify({"status": "success", "message": "Profile deleted"})
    
# Admin Endpoints

# --- List All Users ---

@front_end_api.route('/api/front_end/admin/users', methods=['GET'])
@admin_required
def list_all_users():
    """
    Admin-only endpoint to list all users and their admin status.
    """
    users = UserProfile.query.all()
    user_list = [
        {
            "User_ID": user.User_ID,
            "Username": user.Username,
            "Admin_Status": user.Admin_Status
        }
        for user in users
    ]
    return jsonify({"status": "success", "users": user_list})

# --- Admin user deletion ---

@front_end_api.route('/api/front_end/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    """
    Admin-only endpoint to delete any user account by user_id.
    """
    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"status": "success", "message": f"User '{user.Username}' deleted."}), 200
# Machine related endpoints

# --- List All Machines ---
@front_end_api.route('/api/front_end/machines/list', methods=['GET'])
@jwt_required()
def list_machines():
    claims = get_jwt()
    user_id = _get_current_user_id()
    if user_id is None:
        return jsonify({"status": "error", "message": "Invalid token identity"}), 422
    if claims.get("admin"):
        # Admin: return all machines
        machines = MachineDetail.query.all()
    else:
        # Regular user: return only their machines
        machines = MachineDetail.query.filter_by(Owner_ID=user_id).all()
    return jsonify([
        {
            "Machine_ID": m.Machine_ID,
            "Hostname": m.Hostname,
            "Platform": m.Platform,
            "Is_Hypervisor": m.Is_Hypervisor,
            "Max_Cores": m.Max_Cores,
            "Max_Memory": m.Max_Memory,
            "Max_Disk": m.Max_Disk,
            "Owner_ID": m.Owner_ID,
            "Hosted_On_ID": m.Hosted_On_ID
        } for m in machines
    ])

# --- Get Machine Info ---
@front_end_api.route('/api/front_end/machine/info/<hostname>', methods=['GET'])
@jwt_required()
def get_machine_info(hostname):
    machine = MachineDetail.query.filter_by(Hostname=hostname).first()
    if not machine:
        return jsonify({"status": "error", "message": "Machine not found"}), 404
    return jsonify({
        "Machine_ID": machine.Machine_ID,
        "Hostname": machine.Hostname,
        "Platform": machine.Platform,
        "Is_Hypervisor": machine.Is_Hypervisor,
        "Max_Cores": machine.Max_Cores,
        "Max_Memory": machine.Max_Memory,
        "Max_Disk": machine.Max_Disk,
        "Owner_ID": machine.Owner_ID,
        "Hosted_On_ID": machine.Hosted_On_ID
    })

# --- Get Latest Metrics for a Machine ---
@front_end_api.route('/api/front_end/machine/info/<hostname>/metrics', methods=['GET'])
@jwt_required()
def get_latest_metrics(hostname):
    machine = MachineDetail.query.filter_by(Hostname=hostname).first()
    if not machine:
        return jsonify({"status": "error", "message": "Machine not found"}), 404
    metric = MachineMetric.query.filter_by(Machine_ID=machine.Machine_ID).order_by(MachineMetric.Timestamp.desc()).first()
    if not metric:
        return jsonify({"status": "error", "message": "No metrics found"}), 404
    # Serialize Timestamp to ISO8601 string for JSON compatibility
    timestamp_str = metric.Timestamp.isoformat() if hasattr(metric.Timestamp, 'isoformat') else str(metric.Timestamp)
    return jsonify({
        "Timestamp": timestamp_str,
        "Current_CPU_Usage": metric.Current_CPU_Usage,
        "Current_Memory_Usage": json.loads(metric.Current_Memory_Usage),
        "Current_Disk_Usage": json.loads(metric.Current_Disk_Usage)
    })


def _parse_iso8601(dt_str: str):
    """
    Parse ISO8601 timestamps from query params.
    Supports a trailing 'Z' (UTC).
    Returns a timezone-aware datetime when possible.
    """
    if not dt_str:
        return None
    try:
        if dt_str.endswith("Z"):
            # Convert Zulu to explicit offset for fromisoformat
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None


def _safe_json_loads(value):
    if value is None:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None


# --- Get Metrics History for a Machine ---
@front_end_api.route('/api/front_end/machine/info/<hostname>/metrics/history', methods=['GET'])
@jwt_required()
def get_metrics_history(hostname):
    """
    Returns a list of metrics rows for charting.

    Query params (all optional):
      - start: ISO8601 (inclusive)
      - end: ISO8601 (inclusive)
      - after: ISO8601 (alias for start; inclusive)
      - before: ISO8601 (alias for end; inclusive)
      - limit: max number of rows (default 120, max 2000)
      - order: 'asc' or 'desc' (default 'asc' -> oldest to newest)
    """
    machine = MachineDetail.query.filter_by(Hostname=hostname).first()
    if not machine:
        return jsonify({"status": "error", "message": "Machine not found"}), 404

    start_str = request.args.get("start") or request.args.get("after")
    end_str = request.args.get("end") or request.args.get("before")
    start_dt = _parse_iso8601(start_str) if start_str else None
    end_dt = _parse_iso8601(end_str) if end_str else None

    order = (request.args.get("order") or "asc").lower()
    if order not in ("asc", "desc"):
        return jsonify({"status": "error", "message": "Invalid 'order' (must be 'asc' or 'desc')"}), 400

    try:
        limit = int(request.args.get("limit") or 120)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid 'limit' (must be an integer)"}), 400
    limit = max(1, min(limit, 2000))

    q = MachineMetric.query.filter_by(Machine_ID=machine.Machine_ID)
    if start_dt:
        q = q.filter(MachineMetric.Timestamp >= start_dt)
    if end_dt:
        q = q.filter(MachineMetric.Timestamp <= end_dt)

    q = q.order_by(MachineMetric.Timestamp.asc() if order == "asc" else MachineMetric.Timestamp.desc())
    metrics = q.limit(limit).all()

    return jsonify({
        "status": "success",
        "Hostname": machine.Hostname,
        "Machine_ID": machine.Machine_ID,
        "count": len(metrics),
        "metrics": [
            {
                "Timestamp": m.Timestamp.isoformat() if hasattr(m.Timestamp, "isoformat") else str(m.Timestamp),
                "Current_CPU_Usage": m.Current_CPU_Usage,
                "Current_Memory_Usage": _safe_json_loads(m.Current_Memory_Usage),
                "Current_Disk_Usage": _safe_json_loads(m.Current_Disk_Usage),
            }
            for m in metrics
        ],
    }), 200


# Dashboard related endpoints

# --- Dashboard View Endpoint ---
@front_end_api.route('/api/front_end/dashboard', methods=['GET', 'POST', 'PUT'])
@jwt_required()
def dashboard_view_endpoint():
    user_id = _get_current_user_id()
    if user_id is None:
        return jsonify({"status": "error", "message": "Invalid token identity"}), 422
    user = UserProfile.query.get(user_id)

    if request.method == 'GET':
        dashboards = SavedDashboard.query.filter_by(User_ID=user_id).all()
        dashboard_list = [{
            "Dashboard_ID": d.Dashboard_ID,
            "Machine_ID": d.Machine_ID,
            "Admin_Only": d.Admin_Only,
            "Show_CPU_Usage": d.Show_CPU_Usage,
            "Show_Memory_Usage": d.Show_Memory_Usage,
            "Show_Disk_Usage": d.Show_Disk_Usage
        } for d in dashboards]
        return jsonify({"status": "success", "dashboards": dashboard_list})

    elif request.method == 'POST':
        data = request.get_json()
        dashboard = SavedDashboard(
            User_ID=user_id,
            Machine_ID=data.get('machine_id'),
            Admin_Only=data.get('admin_only', False),
            Show_CPU_Usage=data.get('show_cpu_usage', True),
            Show_Memory_Usage=data.get('show_memory_usage', True),
            Show_Disk_Usage=data.get('show_disk_usage', True)
        )
        db.session.add(dashboard)
        db.session.commit()
        return jsonify({"status": "success", "message": "Dashboard added", "dashboard_id": dashboard.Dashboard_ID})

    elif request.method == 'PUT':
        data = request.get_json()
        dashboard_id = data.get('dashboard_id')
        dashboard = SavedDashboard.query.filter_by(Dashboard_ID=dashboard_id, User_ID=user_id).first()
        if not dashboard:
            return jsonify({"status": "error", "message": "Dashboard not found"}), 404
        dashboard.Show_CPU_Usage = data.get('show_cpu_usage', dashboard.Show_CPU_Usage)
        dashboard.Show_Memory_Usage = data.get('show_memory_usage', dashboard.Show_Memory_Usage)
        dashboard.Show_Disk_Usage = data.get('show_disk_usage', dashboard.Show_Disk_Usage)
        db.session.commit()
        return jsonify({"status": "success", "message": "Dashboard updated"})