"""
Comprehensive tests for Metrics_Gathering_API endpoints.
"""
import pytest
import json
from datetime import datetime
from back_end.database.models import db, MachineDetail, MachineMetric


class TestMachineRegistration:
    """Test machine registration endpoint."""
    
    def test_register_new_machine(self, client):
        """Test registering a new machine."""
        response = client.post('/api/gathering/register_machine', json={
            'hostname': 'new-machine',
            'platform': 'Linux',
            'is_hypervisor': False,
            'max_cores': 8,
            'max_memory': 16 * 1024**3,
            'max_disk': 200 * 1024**3,
            'vm_list': []
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify machine was created
        with client.application.app_context():
            machine = MachineDetail.query.filter_by(Hostname='new-machine').first()
            assert machine is not None
            assert machine.Platform == 'Linux'
            assert machine.Max_Cores == 8
    
    def test_register_existing_machine_updates(self, client, test_machine):
        """Test registering an existing machine updates it."""
        response = client.post('/api/gathering/register_machine', json={
            'hostname': test_machine.Hostname,
            'platform': 'Windows',
            'is_hypervisor': True,
            'max_cores': 16,
            'max_memory': 32 * 1024**3,
            'max_disk': 500 * 1024**3,
            'vm_list': []
        })
        assert response.status_code == 201
        
        # Verify machine was updated
        with client.application.app_context():
            machine = MachineDetail.query.filter_by(Hostname=test_machine.Hostname).first()
            assert machine.Platform == 'Windows'
            assert machine.Is_Hypervisor == True
            assert machine.Max_Cores == 16
    
    def test_register_machine_missing_fields(self, client):
        """Test registering machine with missing required fields."""
        response = client.post('/api/gathering/register_machine', json={
            'hostname': 'incomplete-machine'
        })
        # Should still succeed but with None values
        assert response.status_code == 201

    def test_register_hv_assigns_vm_hosted_on_id(self, client):
        """Registering a hypervisor with vm_list should set Hosted_On_ID on those VMs."""
        # Register HV with vm_list
        resp = client.post('/api/gathering/register_machine', json={
            'hostname': 'hv-1',
            'platform': 'Linux',
            'is_hypervisor': True,
            'max_cores': 16,
            'max_memory': 32 * 1024**3,
            'max_disk': 500 * 1024**3,
            'vm_list': ['hv-1-vm-1', 'hv-1-vm-2']
        })
        assert resp.status_code == 201

        with client.application.app_context():
            hv = MachineDetail.query.filter_by(Hostname='hv-1').first()
            assert hv is not None
            assert hv.Is_Hypervisor is True

            vm1 = MachineDetail.query.filter_by(Hostname='hv-1-vm-1').first()
            vm2 = MachineDetail.query.filter_by(Hostname='hv-1-vm-2').first()
            assert vm1 is not None
            assert vm2 is not None
            assert vm1.Hosted_On_ID == hv.Machine_ID
            assert vm2.Hosted_On_ID == hv.Machine_ID
            assert vm1.Is_Hypervisor is False
            assert vm2.Is_Hypervisor is False


class TestMetricsReceiving:
    """Test metrics receiving endpoint."""
    
    def test_receive_metrics_success(self, client, test_machine):
        """Test receiving metrics for a registered machine."""
        response = client.post('/api/gathering/metrics', json={
            'hostname': test_machine.Hostname,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'current_cpu_usage': 75.5,
            'current_memory_usage': {
                'total': 8 * 1024**3,
                'used': 6 * 1024**3,
                'percent': 75.0
            },
            'current_disk_usage': [
                {
                    'mountpoint': '/',
                    'total': 100 * 1024**3,
                    'used': 60 * 1024**3,
                    'percent': 60.0
                }
            ]
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify metric was saved
        with client.application.app_context():
            metric = MachineMetric.query.filter_by(Machine_ID=test_machine.Machine_ID).first()
            assert metric is not None
            assert metric.Current_CPU_Usage == 75.5
    
    def test_receive_metrics_unregistered_machine(self, client):
        """Test receiving metrics for unregistered machine."""
        response = client.post('/api/gathering/metrics', json={
            'hostname': 'unregistered-machine',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'current_cpu_usage': 50.0,
            'current_memory_usage': {},
            'current_disk_usage': []
        })
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'not registered' in data['message'].lower()
    
    def test_receive_metrics_without_timestamp(self, client, test_machine):
        """Test receiving metrics without timestamp (should use current time)."""
        response = client.post('/api/gathering/metrics', json={
            'hostname': test_machine.Hostname,
            'current_cpu_usage': 50.0,
            'current_memory_usage': {},
            'current_disk_usage': []
        })
        assert response.status_code == 201
        
        # Verify metric was saved with current timestamp
        with client.application.app_context():
            metric = MachineMetric.query.filter_by(Machine_ID=test_machine.Machine_ID).first()
            assert metric is not None
            assert metric.Timestamp is not None
    
    def test_receive_metrics_timestamp_formats(self, client, test_machine):
        """Test receiving metrics with different timestamp formats."""
        # Test with Z suffix
        response = client.post('/api/gathering/metrics', json={
            'hostname': test_machine.Hostname,
            'timestamp': '2023-01-01T00:00:00Z',
            'current_cpu_usage': 50.0,
            'current_memory_usage': {},
            'current_disk_usage': []
        })
        assert response.status_code == 201
        
        # Test without Z suffix
        response = client.post('/api/gathering/metrics', json={
            'hostname': test_machine.Hostname,
            'timestamp': '2023-01-01T00:00:00',
            'current_cpu_usage': 50.0,
            'current_memory_usage': {},
            'current_disk_usage': []
        })
        assert response.status_code == 201

