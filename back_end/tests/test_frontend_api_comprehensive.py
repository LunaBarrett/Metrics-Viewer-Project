"""
Comprehensive tests for Front_End_API endpoints.
"""
import pytest
import json
from datetime import datetime
from back_end.database.models import db, UserProfile, MachineDetail, MachineMetric, SavedDashboard


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    def test_register_success(self, client):
        """Test successful user registration."""
        response = client.post('/api/front_end/user/register', json={
            'username': 'newuser',
            'password': 'password123'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify user was created
        with client.application.app_context():
            user = UserProfile.query.filter_by(Username='newuser').first()
            assert user is not None
    
    def test_register_duplicate_username(self, client, test_user):
        """Test registration with duplicate username."""
        response = client.post('/api/front_end/user/register', json={
            'username': 'testuser',
            'password': 'password123'
        })
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'already exists' in data['message'].lower()
    
    def test_register_missing_fields(self, client):
        """Test registration with missing fields."""
        response = client.post('/api/front_end/user/register', json={
            'username': 'newuser'
        })
        assert response.status_code == 400
        
        response = client.post('/api/front_end/user/register', json={
            'password': 'password123'
        })
        assert response.status_code == 400
    
    def test_login_success(self, client, test_user):
        """Test successful login."""
        response = client.post('/api/front_end/user/login', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'access_token' in data
    
    def test_login_invalid_credentials(self, client, test_user):
        """Test login with invalid credentials."""
        response = client.post('/api/front_end/user/login', json={
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401
        data = response.get_json()
        assert data['status'] == 'error'
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = client.post('/api/front_end/user/login', json={
            'username': 'nonexistent',
            'password': 'password123'
        })
        assert response.status_code == 401


class TestProfileEndpoints:
    """Test user profile endpoints."""
    
    def test_get_profile_success(self, client, auth_token):
        """Test getting user profile."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/front_end/user/profile', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'data' in data
        assert 'Username' in data['data']
        assert 'User_ID' in data['data']
    
    def test_get_profile_requires_auth(self, client):
        """Test that profile endpoint requires authentication."""
        response = client.get('/api/front_end/user/profile')
        assert response.status_code == 401
    
    def test_update_username_success(self, client, auth_token, test_user):
        """Test updating username."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post('/api/front_end/user/profile', 
                              json={'username': 'newname'},
                              headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify username was updated
        with client.application.app_context():
            user = UserProfile.query.get(test_user.User_ID)
            assert user.Username == 'newname'
    
    def test_update_username_duplicate(self, client, auth_token, test_user, admin_user):
        """Test updating username to existing username."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post('/api/front_end/user/profile',
                              json={'username': 'admin'},
                              headers=headers)
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
    
    def test_update_password_success(self, client, auth_token, test_user):
        """Test updating password."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.put('/api/front_end/user/profile',
                             json={'password': 'newpassword123'},
                             headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify password was updated by trying to login
        response = client.post('/api/front_end/user/login', json={
            'username': test_user.Username,
            'password': 'newpassword123'
        })
        assert response.status_code == 200
    
    def test_delete_profile_success(self, client, auth_token, test_user):
        """Test deleting user profile."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.delete('/api/front_end/user/profile', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify user was deleted
        with client.application.app_context():
            user = UserProfile.query.get(test_user.User_ID)
            assert user is None


class TestAdminEndpoints:
    """Test admin-only endpoints."""
    
    def test_list_users_as_admin(self, client, admin_token):
        """Test listing users as admin."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/api/front_end/admin/users', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'users' in data
        assert isinstance(data['users'], list)
    
    def test_list_users_requires_admin(self, client, auth_token):
        """Test that listing users requires admin access."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/front_end/admin/users', headers=headers)
        assert response.status_code == 403
    
    def test_delete_user_as_admin(self, client, admin_token, test_user):
        """Test deleting a user as admin."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.delete(f'/api/front_end/admin/users/{test_user.User_ID}', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify user was deleted
        with client.application.app_context():
            user = UserProfile.query.get(test_user.User_ID)
            assert user is None
    
    def test_delete_user_requires_admin(self, client, auth_token, test_user):
        """Test that deleting users requires admin access."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.delete(f'/api/front_end/admin/users/{test_user.User_ID}', headers=headers)
        assert response.status_code == 403
    
    def test_delete_nonexistent_user(self, client, admin_token):
        """Test deleting a non-existent user."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.delete('/api/front_end/admin/users/99999', headers=headers)
        assert response.status_code == 404


class TestMachineEndpoints:
    """Test machine-related endpoints."""
    
    def test_list_machines_as_admin(self, client, admin_token, test_machine):
        """Test listing machines as admin (should see all)."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/api/front_end/machines/list', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_list_machines_as_user(self, client, auth_token, test_machine, test_user):
        """Test listing machines as regular user (should see only owned)."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/front_end/machines/list', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        # Should see at least the owned machine
        assert len(data) >= 1
        # All machines should be owned by the user
        for machine in data:
            assert machine['Owner_ID'] == test_user.User_ID
    
    def test_list_machines_requires_auth(self, client):
        """Test that listing machines requires authentication."""
        response = client.get('/api/front_end/machines/list')
        assert response.status_code == 401
    
    def test_get_machine_info_success(self, client, auth_token, test_machine):
        """Test getting machine info."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/api/front_end/machine/info/{test_machine.Hostname}', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['Hostname'] == test_machine.Hostname
        assert data['Machine_ID'] == test_machine.Machine_ID
    
    def test_get_machine_info_not_found(self, client, auth_token):
        """Test getting info for non-existent machine."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/front_end/machine/info/nonexistent', headers=headers)
        assert response.status_code == 404
    
    def test_get_machine_metrics_success(self, client, auth_token, test_machine, test_metrics):
        """Test getting machine metrics."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/api/front_end/machine/info/{test_machine.Hostname}/metrics', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'Timestamp' in data
        assert 'Current_CPU_Usage' in data
        assert 'Current_Memory_Usage' in data
        assert 'Current_Disk_Usage' in data
    
    def test_get_machine_metrics_not_found(self, client, auth_token, test_machine):
        """Test getting metrics for machine with no metrics."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/api/front_end/machine/info/{test_machine.Hostname}/metrics', headers=headers)
        assert response.status_code == 404


class TestDashboardEndpoints:
    """Test dashboard endpoints."""
    
    def test_get_dashboards_success(self, client, auth_token, test_user):
        """Test getting user dashboards."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/front_end/dashboard', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'dashboards' in data
        assert isinstance(data['dashboards'], list)
    
    def test_create_dashboard_success(self, client, auth_token, test_user, test_machine):
        """Test creating a dashboard."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post('/api/front_end/dashboard',
                              json={
                                  'machine_id': test_machine.Machine_ID,
                                  'admin_only': False,
                                  'show_cpu_usage': True,
                                  'show_memory_usage': True,
                                  'show_disk_usage': True
                              },
                              headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'dashboard_id' in data
    
    def test_update_dashboard_success(self, client, auth_token, test_user, test_machine):
        """Test updating a dashboard."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        # First create a dashboard
        create_response = client.post('/api/front_end/dashboard',
                                     json={
                                         'machine_id': test_machine.Machine_ID,
                                         'admin_only': False,
                                         'show_cpu_usage': True,
                                         'show_memory_usage': True,
                                         'show_disk_usage': True
                                     },
                                     headers=headers)
        dashboard_id = create_response.get_json()['dashboard_id']
        
        # Update it
        response = client.put('/api/front_end/dashboard',
                             json={
                                 'dashboard_id': dashboard_id,
                                 'show_cpu_usage': False,
                                 'show_memory_usage': False,
                                 'show_disk_usage': False
                             },
                             headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
    
    def test_dashboard_requires_auth(self, client):
        """Test that dashboard endpoints require authentication."""
        response = client.get('/api/front_end/dashboard')
        assert response.status_code == 401

