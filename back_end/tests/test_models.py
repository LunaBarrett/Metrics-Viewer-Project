import pytest
from back_end.app.app import create_app
from back_end.database.models import db, UserProfile

@pytest.fixture
def app():
    """Fixture to provide a Flask app with an in-memory database."""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        yield app

def test_userprofile_model(app):
    """Test creating and querying a UserProfile model."""
    with app.app_context():
        user = UserProfile(Username='modeltest', Password_Hash='hash')
        db.session.add(user)
        db.session.commit()
        assert UserProfile.query.filter_by(Username='modeltest').first() is not None