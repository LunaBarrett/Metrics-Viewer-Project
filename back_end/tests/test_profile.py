import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    """Fixture to provide a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_profile_requires_auth(client):
    """Test that profile endpoint requires authentication."""
    response = client.get('/api/front_end/user/profile')
    assert response.status_code == 401