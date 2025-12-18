import pytest
from back_end.app.app import create_app

def test_app_creation():
    """Test that the Flask app is created successfully."""
    app = create_app()
    assert app is not None
    assert app.config['TESTING'] is False  # Or True if it is set

def test_app_has_blueprints():
    app = create_app()
    assert 'front_end_api' in app.blueprints
    assert 'metrics_api' in app.blueprints
    assert 'logging_api' in app.blueprints
    