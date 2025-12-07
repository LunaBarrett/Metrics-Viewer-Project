from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from back_end.database.models import db
from back_end.API.Logging_API import setup_logging, logging_api
from core.config import Config
from back_end.API.Front_End_API import front_end_api
from back_end.API.Metrics_Gathering_API import metrics_api

def create_app():
    # Set up logging before anything else
    setup_logging()

    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for all domains (development)
    CORS(app)

    # For production, restrict CORS to your frontend domain:
    # CORS(app, resources={r"/api/*": {"origins": "https://your-frontend-domain.com"}})

    # Initialise extensions
    db.init_app(app)
    JWTManager(app)

    # Register blueprints
    app.register_blueprint(front_end_api)
    app.register_blueprint(metrics_api)
    app.register_blueprint(logging_api)

    # Create tables if they don't exist
    @app.before_first_request
    def create_tables():
        db.create_all()

    return app