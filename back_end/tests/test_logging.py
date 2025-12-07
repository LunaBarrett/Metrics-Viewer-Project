import pytest
from back_end.app.app import create_app

@pytest.fixture
def client():
    """Fixture to provide a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_logging_endpoint_accepts_log(client):
    """Test that the logging endpoint accepts a valid log message."""
    response = client.post('/api/logging/frontend_log', json={
        'level': 'INFO',
        'message': 'Test log message',
        'user': 'test'
    })
    assert response.status_code == 204

def test_logging_endpoint_missing_message(client):
    """Test logging endpoint with missing message field."""
    response = client.post('/api/logging/frontend_log', json={
        'level': 'INFO'
    })
    assert response.status_code in (204, 400)