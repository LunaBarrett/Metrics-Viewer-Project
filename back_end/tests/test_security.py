import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    """Fixture to provide a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_protected_endpoint_requires_jwt(client):
    """Test that protected endpoints require a valid JWT token."""
    response = client.get('/api/front_end/machines/list')
    assert response.status_code == 401  # Unauthorized

def test_access_with_invalid_token(client):
    """Test accessing a protected endpoint with an invalid JWT token."""
    headers = {'Authorization': 'Bearer invalidtoken'}
    response = client.get('/api/front_end/machines/list', headers=headers)
    assert response.status_code == 422 or response.status_code == 401