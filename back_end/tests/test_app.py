import pytest
from back_end.app.app import create_app

def test_app_creation():
    """Test that the Flask app is created successfully."""
    app = create_app()
    assert app is not None
    assert app.config['TESTING'] is False  # Or True if you set it

def test_app_has_blueprints():
    """Test that the app has registered blueprints."""
    app = create_app()
    assert 'api' in app.blueprints  # Adjust if your blueprint name differs