# the purpose of this file is to act as an API for everything going to and coming from the front end of the application

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from functools import wraps
from back_end.database.models import db, UserProfile, MachineDetail, SavedDashboard, MachineMetric
from collections import defaultdict
import bcrypt
import time

# Create a Blueprint for the API
front_end_api = Blueprint('front_end_api', __name__)

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
    password_hash = data.get('password_hash')
    # Optionally: email = data.get('email')

    if not username or not password_hash:
        return jsonify({"status": "error", "message": "Username and password required."}), 400

    if UserProfile.query.filter_by(Username=username).first():
        return jsonify({"status": "error", "message": "Username already exists."}), 400

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
        identity=user.User_ID,
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
    user_id = get_jwt_identity()
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
    user_id = get_jwt_identity()
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
    return jsonify({
        "Timestamp": metric.Timestamp,
        "Current_CPU_Usage": metric.Current_CPU_Usage,
        "Current_Memory_Usage": json.loads(metric.Current_Memory_Usage),
        "Current_Disk_Usage": json.loads(metric.Current_Disk_Usage)
    })


# Dashboard related endpoints

# --- Dashboard View Endpoint ---
@front_end_api.route('/api/front_end/dashboard', methods=['GET', 'POST', 'PUT'])
@jwt_required()
def dashboard_view_endpoint():
    user_id = get_jwt_identity()
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