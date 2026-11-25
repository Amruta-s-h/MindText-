"""
MindText Prediction History Model
Stores past text sentiment predictions, confidence scores, and AI explanations in SQLite.
Links to User accounts via foreign key user_id while allowing null for guest/legacy records.
"""

from datetime import datetime, timezone
from database import db

class PredictionHistory(db.Model):
    __tablename__ = "prediction_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    text = db.Column(db.Text, nullable=False)
    cleaned_text = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(20), nullable=False)  # "Negative", "Neutral", "Positive"
    sentiment_code = db.Column(db.Integer, nullable=False)  # 0, 1, 2
    confidence = db.Column(db.Float, nullable=False)  # 0.0 - 1.0
    probabilities = db.Column(db.JSON, nullable=False)  # {"negative": ..., "neutral": ..., "positive": ...}
    ai_explanation = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        """Serializes the record to a dictionary format for API JSON responses."""
        probs = self.probabilities or {}
        return {
            "id": self.id,
            "user_id": self.user_id,
            "text": self.text,
            "cleaned_text": self.cleaned_text,
            "sentiment": self.sentiment,
            "sentiment_code": self.sentiment_code,
            "confidence": round(float(self.confidence), 4),
            "probabilities": {
                "negative": round(float(probs.get("negative", 0.0)), 4),
                "neutral": round(float(probs.get("neutral", 0.0)), 4),
                "positive": round(float(probs.get("positive", 0.0)), 4),
            },
            "ai_explanation": self.ai_explanation,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<PredictionHistory id={self.id} user_id={self.user_id} sentiment='{self.sentiment}' confidence={self.confidence:.2f}>"
