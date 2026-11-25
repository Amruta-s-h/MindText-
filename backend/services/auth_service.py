"""
MindText Authentication & Security Service
Manages JSON Web Token (JWT) generation, validation, and route protection decorators.
"""

import os
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from database import db
from models.user import User

JWT_ALGORITHM = "HS256"
TOKEN_EXPIRATION_HOURS = 24 * 7  # 7 days

def get_secret_key() -> str:
    """Retrieves secret key from Flask app config or environment (min 32 bytes)."""
    key = current_app.config.get("SECRET_KEY", "mindtext-dev-secret-key-2026-super-secure-session-salt")
    if len(key) < 32:
        key = key.ljust(32, "-")
    return key

def generate_auth_token(user_id: int, email: str) -> str:
    """Generates a signed JWT token valid for 7 days."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, get_secret_key(), algorithm=JWT_ALGORITHM)

def decode_auth_token(token: str) -> dict:
    """Decodes and validates a JWT token. Raises exceptions on invalid/expired token."""
    return jwt.decode(token, get_secret_key(), algorithms=[JWT_ALGORITHM])

def extract_bearer_token() -> str | None:
    """Extracts the Bearer token string from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None

def get_current_authenticated_user() -> User | None:
    """
    Attempts to identify the currently logged-in user from the Authorization header.
    Returns User instance if authenticated, or None if guest/invalid.
    """
    token = extract_bearer_token()
    if not token:
        return None
    try:
        payload = decode_auth_token(token)
        sub = payload.get("sub")
        if not sub:
            return None
        user_id = int(sub)
        return db.session.get(User, user_id)
    except Exception:
        return None

def login_required(f):
    """Decorator that enforces valid user authentication for a route."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_bearer_token()
        if not token:
            return jsonify({
                "success": False,
                "error": "Authentication required. Missing Authorization Bearer token."
            }), 401

        try:
            payload = decode_auth_token(token)
            sub = payload.get("sub")
            if not sub:
                raise ValueError("Missing subject in token.")
            user_id = int(sub)
            user = db.session.get(User, user_id)
            if not user:
                return jsonify({
                    "success": False,
                    "error": "User account no longer exists."
                }), 401
        except jwt.ExpiredSignatureError:
            return jsonify({
                "success": False,
                "error": "Session has expired. Please log in again."
            }), 401
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Invalid authentication token: {str(e)}"
            }), 401

        return f(current_user=user, *args, **kwargs)

    return decorated_function
