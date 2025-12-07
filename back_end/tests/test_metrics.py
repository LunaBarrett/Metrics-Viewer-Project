import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    """Fixture to provide a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_send_metrics(client):
    """Test sending metrics for a registered machine."""
    # Register machine first
    client.post('/api/gathering/register_machine', json={
        'hostname': 'test-vm',
        'platform': 'Linux',
        'is_hypervisor': False,
        'max_cores': 4,
        'max_memory': 8 * 1024**3,
        'max_disk': 100 * 1024**3,
        'vm_list': []
    })
    # Send metrics
    response = client.post('/api/gathering/metrics', json={
        'hostname': 'test-vm',
        'timestamp': '2023-01-01T00:00:00Z',
        'current_cpu_usage': 50.0,
        'current_memory_usage': {'total': 8 * 1024*3, 'used': 4 * 1024*3, 'percent': 50.0},
        'current_disk_usage': [{'mountpoint': '/', 'total': 100 * 1024*3, 'used': 50 * 1024*3, 'percent': 50.0}]
    })
    assert response.status_code == 201