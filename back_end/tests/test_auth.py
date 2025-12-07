import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    """Fixture to provide a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_register_and_login(client):
    """Test user registration and login endpoints."""
    # Register a new user
    response = client.post('/api/front_end/user/register', json={
        'username': 'testuser',
        'password_hash': 'testpass'
    })
    assert response.status_code == 201

    # Login with the new user
    response = client.post('/api/front_end/user/login', json={
        'username': 'testuser',
        'password_hash': 'testpass'
    })
    assert response.status_code == 200
    assert 'access_token' in response.get_json()