import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    """Fixture to provide a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_register_machine(client):
    """Test registering a machine (VM or HV) via the API."""
    response = client.post('/api/gathering/register_machine', json={
        'hostname': 'test-vm',
        'platform': 'Linux',
        'is_hypervisor': False,
        'max_cores': 4,
        'max_memory': 8 * 1024**3,
        'max_disk': 100 * 1024**3,
        'vm_list': []
    })
    assert response.status_code == 201
