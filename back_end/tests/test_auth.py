import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_register_and_login(client):
    """Test user registration and login endpoints."""
    from back_end.database.models import db, UserProfile
    # Clean up any existing user with this username
    with client.application.app_context():
        user = UserProfile.query.filter_by(Username='testuser').first()
        if user:
            db.session.delete(user)
            db.session.commit()

    # Register a new user
    response = client.post('/api/front_end/user/register', json={
        'username': 'testuser',
        'password': 'testpass'
    })
    assert response.status_code == 201

    # Login with the new user
    response = client.post('/api/front_end/user/login', json={
        'username': 'testuser',
        'password': 'testpass'
    })
    assert response.status_code == 200
    assert 'access_token' in response.get_json()
    