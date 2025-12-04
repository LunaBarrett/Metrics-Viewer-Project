from flask import Flask
from flask_jwt_extended import JWTManager
from back_end.database.models import db
from back_end.API.Logging_API import setup_logging, logging_api
from core.config import Config
# Import your other blueprints as needed
from back_end.API.Front_End_API import api_blueprint
from back_end.API.Metrics_Gathering_API import metrics_api

def create_app():
    # Set up logging before creating app (so all logs are captured)
    setup_logging()

    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialise extensions
    db.init_app(app)
    JWTManager(app)

    # Register blueprints
    app.register_blueprint(api_blueprint)
    app.register_blueprint(metrics_api)
    app.register_blueprint(logging_api)

    # Create tables if they don't exist
    @app.before_first_request
    def create_tables():
        db.create_all()

    return app