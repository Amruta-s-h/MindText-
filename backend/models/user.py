"""
MindText User Database Model
Manages user accounts, authentication credentials, and relationships to prediction records.
"""

from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from database import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # One-to-many relationship with PredictionHistory
    predictions = db.relationship(
        "PredictionHistory",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def set_password(self, password: str):
        """Hashes the password securely using pbkdf2:sha256."""
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verifies a plaintext password against the stored secure hash."""
        if not self.password_hash or not password:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Serializes user info for client responses without exposing password hash."""
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<User id={self.id} email='{self.email}'>"
