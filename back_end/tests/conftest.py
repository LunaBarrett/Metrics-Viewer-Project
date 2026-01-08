"""
Shared pytest fixtures for all tests.
"""
import pytest
import os
from back_end.app.app import create_app
from back_end.database.models import db, UserProfile, MachineDetail, MachineMetric
import bcrypt
from flask_jwt_extended import create_access_token
from datetime import datetime
import json
from types import SimpleNamespace


@pytest.fixture(scope='function')
def app():
    """Create application for testing with in-memory database."""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def test_user(app):
    """Create a test user in the database."""
    with app.app_context():
        password_hash = bcrypt.hashpw('testpass123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = UserProfile(Username='testuser', Password_Hash=password_hash, Admin_Status=False)
        db.session.add(user)
        db.session.commit()
        # Snapshot fields so tests don't touch an expired ORM instance outside the session
        return SimpleNamespace(User_ID=user.User_ID, Username=user.Username, Admin_Status=user.Admin_Status)


@pytest.fixture
def admin_user(app):
    """Create an admin test user in the database."""
    with app.app_context():
        password_hash = bcrypt.hashpw('adminpass123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = UserProfile(Username='admin', Password_Hash=password_hash, Admin_Status=True)
        db.session.add(user)
        db.session.commit()
        return SimpleNamespace(User_ID=user.User_ID, Username=user.Username, Admin_Status=user.Admin_Status)


@pytest.fixture
def auth_token(app, test_user):
    """Get JWT token for test user."""
    with app.app_context():
        user_id = test_user.User_ID
        admin_status = test_user.Admin_Status
        token = create_access_token(
            identity=str(user_id),
            additional_claims={"admin": admin_status}
        )
        return token


@pytest.fixture
def admin_token(app, admin_user):
    """Get JWT token for admin user."""
    with app.app_context():
        user_id = admin_user.User_ID
        admin_status = admin_user.Admin_Status
        token = create_access_token(
            identity=str(user_id),
            additional_claims={"admin": admin_status}
        )
        return token


@pytest.fixture
def test_machine(app, test_user):
    """Create a test machine owned by test_user."""
    with app.app_context():
        user_id = test_user.User_ID
        machine = MachineDetail(
            Hostname='test-vm-1',
            Platform='Linux',
            Is_Hypervisor=False,
            Max_Cores=4,
            Max_Memory=8 * 1024**3,
            Max_Disk=100 * 1024**3,
            Owner_ID=user_id
        )
        db.session.add(machine)
        db.session.commit()
        return SimpleNamespace(
            Machine_ID=machine.Machine_ID,
            Hostname=machine.Hostname,
            Platform=machine.Platform,
            Is_Hypervisor=machine.Is_Hypervisor,
            Max_Cores=machine.Max_Cores,
            Max_Memory=machine.Max_Memory,
            Max_Disk=machine.Max_Disk,
            Owner_ID=machine.Owner_ID,
            Hosted_On_ID=machine.Hosted_On_ID,
        )


@pytest.fixture
def test_metrics(app, test_machine):
    """Create test metrics for a machine."""
    with app.app_context():
        metric = MachineMetric(
            Machine_ID=test_machine.Machine_ID,
            Timestamp=datetime.utcnow(),
            Current_CPU_Usage=50.0,
            Current_Memory_Usage=json.dumps({'total': 8 * 1024**3, 'used': 4 * 1024**3, 'percent': 50.0}),
            Current_Disk_Usage=json.dumps([{'mountpoint': '/', 'total': 100 * 1024**3, 'used': 50 * 1024**3, 'percent': 50.0}])
        )
        db.session.add(metric)
        db.session.commit()
        return SimpleNamespace(
            Metrics_ID=metric.Metrics_ID,
            Machine_ID=metric.Machine_ID,
            Timestamp=metric.Timestamp,
            Current_CPU_Usage=metric.Current_CPU_Usage,
            Current_Memory_Usage=metric.Current_Memory_Usage,
            Current_Disk_Usage=metric.Current_Disk_Usage,
        )

