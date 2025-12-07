import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    """Fixture to provide a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_404_error(client):
    """Test that a non-existent endpoint returns 404."""
    response = client.get('/api/nonexistent-endpoint')
    assert response.status_code == 404

def test_bad_request(client):
    """Test that login with missing data returns 400 or 401."""
    response = client.post('/api/front_end/user/login', json={})
    assert response.status_code in (400, 401)