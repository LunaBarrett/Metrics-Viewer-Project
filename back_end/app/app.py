from flask import Flask
from flask_jwt_extended import JWTManager
from core.config import Config
from back_end.database.models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialise extensions
    db.init_app(app)
    JWTManager(app)

    # Register blueprints
    from back_end.API.Front_End_API import api
    from back_end.API.Metrics_Gathering_API import metrics_api

    app.register_blueprint(api)
    app.register_blueprint(metrics_api)

    # Create tables if they don't exist
    @app.before_first_request
    def create_tables():
        db.create_all()

    return app