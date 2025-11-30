from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    User_ID = db.Column(db.Integer, primary_key=True)
    Username = db.Column(db.String, unique=True, nullable=False)
    Password_Hash = db.Column(db.String, nullable=False)
    Admin_Status = db.Column(db.Boolean, default=False)
    # Add email or other fields as needed
    machines = db.relationship('MachineDetail', back_populates='owner')

class MachineDetail(db.Model):
    __tablename__ = 'machine_details'
    Machine_ID = db.Column(db.Integer, primary_key=True)
    Hostname = db.Column(db.String, unique=True, nullable=False)
    Platform = db.Column(db.String)
    Is_Hypervisor = db.Column(db.Boolean, default=False)
    Max_Cores = db.Column(db.Integer)
    Max_Memory = db.Column(db.BigInteger)  # bytes
    Max_Disk = db.Column(db.BigInteger)    # bytes

    Owner_ID = db.Column(db.Integer, db.ForeignKey('user_profiles.User_ID'))
    owner = db.relationship('UserProfile', back_populates='machines')

    # For VMs, this points to the HV they're hosted on
    Hosted_On_ID = db.Column(db.Integer, db.ForeignKey('machine_details.Machine_ID'))
    hosted_on = db.relationship('MachineDetail', remote_side=[Machine_ID], backref='hosted_vms')

    metrics = db.relationship('MachineMetric', back_populates='machine', cascade="all, delete-orphan")

class MachineMetric(db.Model):
    __tablename__ = 'machine_metrics'
    Metrics_ID = db.Column(db.Integer, primary_key=True)
    Machine_ID = db.Column(db.Integer, db.ForeignKey('machine_details.Machine_ID'))
    Timestamp = db.Column(db.DateTime, nullable=False)
    Current_CPU_Usage = db.Column(db.Float)
    Current_Memory_Usage = db.Column(db.Text)  # Store as JSON string
    Current_Disk_Usage = db.Column(db.Text)    # Store as JSON string

    machine = db.relationship('MachineDetail', back_populates='metrics')


class SavedDashboard(db.Model):
    __tablename__ = 'saved_dashboards'
    Dashboard_ID = db.Column(db.Integer, primary_key=True)
    User_ID = db.Column(db.Integer, db.ForeignKey('user_profiles.User_ID'))
    Machine_ID = db.Column(db.Integer, db.ForeignKey('machine_details.Machine_ID'))
    Admin_Only = db.Column(db.Boolean, default=False)
    Show_CPU_Usage = db.Column(db.Boolean, nullable=False)
    Show_Memory_Usage = db.Column(db.Boolean, nullable=False)
    Show_Disk_Usage = db.Column(db.Boolean, nullable=False)