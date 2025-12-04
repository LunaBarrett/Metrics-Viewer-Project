import logging
import os
from logging.handlers import RotatingFileHandler
from flask import Blueprint, request

# --- Logging Setup Function ---
def setup_logging(
    log_dir='logs',
    log_file='app.log',
    level=logging.INFO,
    max_bytes=5*1024*1024,  # 5MB per file
    backup_count=5,
    console=True
):
    # Ensure log directory exists
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    log_path = os.path.join(log_dir, log_file)

    # Create formatter
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s : %(message)s')

    # File handler with rotation
    file_handler = RotatingFileHandler(log_path, maxBytes=max_bytes, backupCount=backup_count)
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)

    # Get the root logger and set level
    logger = logging.getLogger()
    logger.setLevel(level)
    logger.addHandler(file_handler)

    # Optional: also log to console
    if console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    # Optional: suppress overly verbose loggers (e.g., Werkzeug in production)
    logging.getLogger('werkzeug').setLevel(logging.WARNING)

    logger.info("Logging is set up. Log file: %s", log_path)

# --- Blueprint for Frontend/Agent Logging ---
logging_api = Blueprint('logging_api', __name__)

@logging_api.route('/api/frontend-log', methods=['POST'])
def frontend_log():
    """
    Receives log messages from agents or the frontend and writes them to the backend log.
    Expects JSON with 'level', 'message', and optionally 'user'.
    """
    data = request.get_json()
    level = data.get('level', 'INFO').upper()
    message = data.get('message', '')
    user = data.get('user', 'anonymous')
    logger = logging.getLogger('frontend')

    log_msg = f"[Frontend][{user}] {message}"

    if level == 'ERROR':
        logger.error(log_msg)
    elif level == 'WARNING':
        logger.warning(log_msg)
    else:
        logger.info(log_msg)
    return '', 204