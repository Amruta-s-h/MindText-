"""
MindText - AI-Powered Sentiment Analysis Backend
Flask REST API with JWT Authentication, SQLite Database, Joblib ML Service, and OpenAI Explanation Service.
"""

import os
import sys
import json
import re
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load environment variables
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from database import db
from models.user import User
from models.prediction import PredictionHistory
from services.ml_service import MLService
from services.ai_service import AIService
from services.auth_service import (
    generate_auth_token,
    get_current_authenticated_user,
    login_required
)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def create_app(test_config=None):
    """Application factory for MindText Flask REST API."""
    app = Flask(__name__)

    # Database configuration
    instance_dir = os.path.join(BACKEND_DIR, "instance")
    os.makedirs(instance_dir, exist_ok=True)
    abs_db_path = os.path.join(instance_dir, "mindtext.db").replace("\\", "/")

    app.config["SECRET_KEY"] = os.getenv(
        "SECRET_KEY", "mindtext-dev-secret-key-2026-super-secure-session-salt"
    )
    
    env_db = os.getenv("DATABASE_URL", "")
    if not env_db or "instance/mindtext.db" in env_db:
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{abs_db_path}"
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = env_db

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    if test_config:
        app.config.update(test_config)

    # Initialize extensions
    db.init_app(app)

    # Enable CORS for frontend clients (development & production Vercel origins)
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://mind-text.vercel.app",
        "https://mindtext.vercel.app",
        re.compile(r"^https://[a-zA-Z0-9-]+\.vercel\.app$"),
    ]
    extra_frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if extra_frontend_url and extra_frontend_url not in allowed_origins:
        allowed_origins.append(extra_frontend_url)

    CORS(
        app,
        resources={
            r"/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "expose_headers": ["Content-Type", "Authorization"],
                "max_age": 3600
            }
        }
    )

    # Services
    ml_service = MLService.get_instance()
    ai_service = AIService()

    # Create tables automatically on startup
    with app.app_context():
        db.create_all()
        # Ensure backward compatibility for existing SQLite database
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            if "prediction_history" in inspector.get_table_names():
                columns = [c["name"] for c in inspector.get_columns("prediction_history")]
                if "user_id" not in columns:
                    with db.engine.connect() as conn:
                        conn.execute(text("ALTER TABLE prediction_history ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                        conn.commit()
        except Exception:
            pass

    # -------------------------------------------------------------
    # ROOT & HEALTH CHECK ROUTES
    # -------------------------------------------------------------

    @app.route("/", methods=["GET"])
    def root():
        """Root API welcome & health pointer."""
        return jsonify({
            "project": "MindText – AI-Powered Sentiment Analysis",
            "version": "1.1.0",
            "status": "healthy",
            "endpoints": {
                "health": "GET /api/health",
                "auth_register": "POST /api/auth/register",
                "auth_login": "POST /api/auth/login",
                "auth_me": "GET /api/auth/me",
                "model_info": "GET /api/model-info",
                "analytics": "GET /api/analytics",
                "predict": "POST /api/predict",
                "history": "GET /api/history",
                "delete_history_item": "DELETE /api/history/<id>",
                "clear_history": "DELETE /api/history"
            }
        }), 200

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify backend, ML pipeline, and DB connection."""
        is_model_loaded = ml_service._pipeline is not None
        is_ai_active = ai_service.client is not None

        return jsonify({
            "status": "ok",
            "service": "MindText Backend API",
            "version": "1.1.0",
            "environment": os.getenv("FLASK_ENV", "development"),
            "model_status": "loaded" if is_model_loaded else "unavailable",
            "database_status": "connected",
            "ai_service_mode": "openai_llm" if is_ai_active else "rule_based_fallback",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    # -------------------------------------------------------------
    # AUTHENTICATION ROUTES
    # -------------------------------------------------------------

    @app.route("/api/auth/register", methods=["POST"])
    def register():
        """Registers a new user account with secure password hashing."""
        if not request.is_json:
            return jsonify({"success": False, "error": "Request body must be valid JSON."}), 400

        data = request.get_json()
        full_name = (data.get("full_name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        confirm_password = data.get("confirm_password") or ""

        # Validation
        if not full_name:
            return jsonify({"success": False, "error": "Full name is required."}), 400
        if not email or not EMAIL_REGEX.match(email):
            return jsonify({"success": False, "error": "A valid email address is required."}), 400
        if len(password) < 6:
            return jsonify({"success": False, "error": "Password must be at least 6 characters long."}), 400
        if password != confirm_password:
            return jsonify({"success": False, "error": "Passwords do not match."}), 400

        # Check existing user
        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "error": "An account with this email already exists."}), 409

        try:
            user = User(full_name=full_name, email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()

            token = generate_auth_token(user.id, user.email)
            return jsonify({
                "success": True,
                "message": "Account created successfully.",
                "token": token,
                "user": user.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": f"Registration failed: {str(e)}"}), 500

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        """Authenticates user credentials and returns a secure JWT."""
        if not request.is_json:
            return jsonify({"success": False, "error": "Request body must be valid JSON."}), 400

        data = request.get_json()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required."}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"success": False, "error": "Invalid email or password."}), 401

        token = generate_auth_token(user.id, user.email)
        return jsonify({
            "success": True,
            "message": "Login successful.",
            "token": token,
            "user": user.to_dict()
        }), 200

    @app.route("/api/auth/me", methods=["GET"])
    @login_required
    def get_me(current_user: User):
        """Returns the profile information of the currently authenticated user."""
        prediction_count = PredictionHistory.query.filter_by(user_id=current_user.id).count()
        user_info = current_user.to_dict()
        user_info["total_predictions"] = prediction_count
        return jsonify({"success": True, "user": user_info}), 200

    @app.route("/api/auth/profile", methods=["PUT"])
    @login_required
    def update_profile(current_user: User):
        """Updates profile details (full name or password) for the current user."""
        data = request.get_json() or {}
        full_name = (data.get("full_name") or "").strip()
        new_password = data.get("new_password") or ""
        current_password = data.get("current_password") or ""

        if full_name:
            current_user.full_name = full_name

        if new_password:
            if not current_password or not current_user.check_password(current_password):
                return jsonify({"success": False, "error": "Current password is required to change password."}), 400
            if len(new_password) < 6:
                return jsonify({"success": False, "error": "New password must be at least 6 characters long."}), 400
            current_user.set_password(new_password)

        try:
            db.session.commit()
            return jsonify({
                "success": True,
                "message": "Profile updated successfully.",
                "user": current_user.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": f"Failed to update profile: {str(e)}"}), 500

    # -------------------------------------------------------------
    # MODEL PERFORMANCE & EVALUATION METRICS
    # -------------------------------------------------------------

    @app.route("/api/model-info", methods=["GET"])
    def get_model_info():
        """
        Returns real TweetEval held-out test split evaluation metrics:
        - 3x3 Confusion Matrix
        - One-vs-Rest TP, TN, FP, FN calculations per class
        - Accuracy, Precision, Recall, Macro F1, Weighted F1
        - Class-wise comparisons and Actual vs Predicted distributions
        """
        models_dir = os.path.join(BACKEND_DIR, "models")
        meta_path = os.path.join(models_dir, "model_metadata.json")
        if not os.path.exists(meta_path):
            return jsonify({"success": False, "error": "Model metadata not found."}), 404

        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            cm = data.get("test_metrics", {}).get("confusion_matrix", [])
            class_names = data.get("class_names", ["Negative", "Neutral", "Positive"])

            # Calculate One-vs-Rest TP, TN, FP, FN for each class from actual 3x3 confusion matrix
            one_vs_rest = {}
            total_samples = sum(sum(row) for row in cm) if cm else 0

            # Order: 0: Negative, 1: Neutral, 2: Positive
            for k, cls_name in enumerate(class_names):
                tp = cm[k][k] if k < len(cm) and k < len(cm[k]) else 0
                fp = sum(cm[i][k] for i in range(len(cm)) if i != k)
                fn = sum(cm[k][j] for j in range(len(cm[k])) if j != k)
                tn = total_samples - (tp + fp + fn)

                prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
                rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
                f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
                actual_support = tp + fn
                pred_support = tp + fp

                one_vs_rest[cls_name] = {
                    "class": cls_name,
                    "class_index": k,
                    "tp": int(tp),
                    "tn": int(tn),
                    "fp": int(fp),
                    "fn": int(fn),
                    "precision": round(float(prec), 4),
                    "recall": round(float(rec), 4),
                    "f1_score": round(float(f1), 4),
                    "actual_support": int(actual_support),
                    "predicted_support": int(pred_support),
                    "descriptions": {
                        "tp": f"Actual {cls_name} correctly classified as {cls_name}",
                        "tn": f"Non-{cls_name} text correctly classified as Not {cls_name}",
                        "fp": f"Non-{cls_name} text mistakenly classified as {cls_name}",
                        "fn": f"Actual {cls_name} text mistakenly classified as other sentiments"
                    }
                }

            # Actual vs Predicted distribution comparison
            actual_vs_predicted = [
                {
                    "sentiment": cls_name,
                    "actual": one_vs_rest[cls_name]["actual_support"],
                    "predicted": one_vs_rest[cls_name]["predicted_support"],
                    "actual_pct": round((one_vs_rest[cls_name]["actual_support"] / total_samples) * 100, 1),
                    "predicted_pct": round((one_vs_rest[cls_name]["predicted_support"] / total_samples) * 100, 1)
                }
                for cls_name in class_names
            ]

            # Attach calculated data to response
            data["one_vs_rest"] = one_vs_rest
            data["actual_vs_predicted"] = actual_vs_predicted
            data["dataset_split_info"] = {
                "dataset": "TweetEval (subset: sentiment)",
                "source": "Hugging Face (cardiffnlp/tweet_eval)",
                "train_samples": 45615,
                "validation_samples": 2000,
                "test_samples": total_samples,
                "classes": class_names
            }

            return jsonify({"success": True, "data": data}), 200
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to compute model info: {str(e)}"}), 500

    # -------------------------------------------------------------
    # ANALYTICS DASHBOARD ROUTE (User-Isolated)
    # -------------------------------------------------------------

    @app.route("/api/analytics", methods=["GET"])
    def get_analytics():
        """
        Returns aggregated analytics for the dashboard computed from actual database records.
        Strictly scopes statistics to the authenticated user if logged in.
        """
        user = get_current_authenticated_user()
        query = PredictionHistory.query

        if user:
            query = query.filter_by(user_id=user.id)
        else:
            # Guest mode: filter records with user_id is None
            query = query.filter_by(user_id=None)

        total = query.count()
        if total == 0:
            return jsonify({
                "success": True,
                "data": {
                    "total": 0,
                    "user_id": user.id if user else None,
                    "sentiment_distribution": {"Positive": 0, "Neutral": 0, "Negative": 0},
                    "sentiment_percentages": {"Positive": 0.0, "Neutral": 0.0, "Negative": 0.0},
                    "average_confidence": 0.0,
                    "confidence_buckets": [
                        {"range": "50-60%", "count": 0},
                        {"range": "60-70%", "count": 0},
                        {"range": "70-80%", "count": 0},
                        {"range": "80-90%", "count": 0},
                        {"range": "90-100%", "count": 0}
                    ],
                    "timeline": [],
                    "recent_predictions": []
                }
            }), 200

        pos_count = query.filter_by(sentiment="Positive").count()
        neu_count = query.filter_by(sentiment="Neutral").count()
        neg_count = query.filter_by(sentiment="Negative").count()

        from sqlalchemy import func
        avg_conf = db.session.query(func.avg(PredictionHistory.confidence)).filter(
            PredictionHistory.user_id == (user.id if user else None)
        ).scalar() or 0.0

        all_records = query.with_entities(
            PredictionHistory.confidence, PredictionHistory.sentiment, PredictionHistory.created_at
        ).all()

        buckets = {
            "50-60%": 0,
            "60-70%": 0,
            "70-80%": 0,
            "80-90%": 0,
            "90-100%": 0
        }
        for rec in all_records:
            c = rec.confidence * 100
            if c < 60:
                buckets["50-60%"] += 1
            elif c < 70:
                buckets["60-70%"] += 1
            elif c < 80:
                buckets["70-80%"] += 1
            elif c < 90:
                buckets["80-90%"] += 1
            else:
                buckets["90-100%"] += 1

        confidence_buckets = [{"range": k, "count": v} for k, v in buckets.items()]

        timeline_dict = {}
        for rec in all_records:
            if rec.created_at:
                date_str = rec.created_at.strftime("%Y-%m-%d")
                if date_str not in timeline_dict:
                    timeline_dict[date_str] = {"date": date_str, "total": 0, "Positive": 0, "Neutral": 0, "Negative": 0}
                timeline_dict[date_str]["total"] += 1
                if rec.sentiment in timeline_dict[date_str]:
                    timeline_dict[date_str][rec.sentiment] += 1

        sorted_timeline = sorted(timeline_dict.values(), key=lambda x: x["date"])[-14:]

        recent = (
            query.order_by(PredictionHistory.created_at.desc())
            .limit(5)
            .all()
        )

        return jsonify({
            "success": True,
            "data": {
                "total": total,
                "user_id": user.id if user else None,
                "sentiment_distribution": {
                    "Positive": pos_count,
                    "Neutral": neu_count,
                    "Negative": neg_count
                },
                "sentiment_percentages": {
                    "Positive": round((pos_count / total) * 100, 1),
                    "Neutral": round((neu_count / total) * 100, 1),
                    "Negative": round((neg_count / total) * 100, 1)
                },
                "average_confidence": round(float(avg_conf), 4),
                "confidence_buckets": confidence_buckets,
                "timeline": sorted_timeline,
                "recent_predictions": [r.to_dict() for r in recent]
            }
        }), 200

    # -------------------------------------------------------------
    # PREDICTION ROUTE (User-Isolated)
    # -------------------------------------------------------------

    @app.route("/api/predict", methods=["POST"])
    def predict_sentiment():
        """
        Classifies input text sentiment, gets AI explanation, and persists to SQLite.
        Associates the record with current_user if authenticated.
        """
        if not request.is_json:
            return jsonify({
                "success": False,
                "error": "Request body must be valid JSON with 'Content-Type: application/json'."
            }), 400

        data = request.get_json()
        raw_text = data.get("text")

        if not raw_text or not isinstance(raw_text, str) or not raw_text.strip():
            return jsonify({
                "success": False,
                "error": "Field 'text' is required, must be a string, and cannot be empty."
            }), 400

        clean_input = raw_text.strip()
        if len(clean_input) > 2000:
            return jsonify({
                "success": False,
                "error": "Input text exceeds maximum allowed length of 2000 characters."
            }), 400

        user = get_current_authenticated_user()

        try:
            prediction = ml_service.predict(clean_input)
            explanation = ai_service.generate_explanation(clean_input, prediction)

            history_record = PredictionHistory(
                user_id=user.id if user else None,
                text=clean_input,
                cleaned_text=prediction["cleaned_text"],
                sentiment=prediction["sentiment"],
                sentiment_code=prediction["sentiment_code"],
                confidence=prediction["confidence"],
                probabilities=prediction["probabilities"],
                ai_explanation=explanation
            )
            db.session.add(history_record)
            db.session.commit()

            return jsonify({
                "success": True,
                "data": history_record.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({
                "success": False,
                "error": f"Prediction failed: {str(e)}"
            }), 500

    # -------------------------------------------------------------
    # HISTORY ROUTES (User-Isolated)
    # -------------------------------------------------------------

    @app.route("/api/history", methods=["GET"])
    def get_history():
        """
        Retrieves prediction history records from SQLite database with pagination and filtering.
        Scoped strictly to the authenticated user.
        """
        try:
            limit = min(int(request.args.get("limit", 50)), 100)
            offset = max(int(request.args.get("offset", 0)), 0)
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Query parameters 'limit' and 'offset' must be valid integers."
            }), 400

        sentiment_filter = request.args.get("sentiment")
        user = get_current_authenticated_user()

        query = PredictionHistory.query
        if user:
            query = query.filter_by(user_id=user.id)
        else:
            query = query.filter_by(user_id=None)

        if sentiment_filter and sentiment_filter in ("Negative", "Neutral", "Positive"):
            query = query.filter_by(sentiment=sentiment_filter)

        total_count = query.count()
        records = (
            query.order_by(PredictionHistory.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return jsonify({
            "success": True,
            "total": total_count,
            "count": len(records),
            "offset": offset,
            "limit": limit,
            "user_id": user.id if user else None,
            "data": [r.to_dict() for r in records]
        }), 200

    @app.route("/api/history/<int:record_id>", methods=["DELETE"])
    def delete_history_item(record_id):
        """
        Deletes a single prediction record by ID.
        Ensures authenticated users can only delete their own records.
        """
        record = db.session.get(PredictionHistory, record_id)
        if not record:
            return jsonify({
                "success": False,
                "error": f"Prediction record with ID {record_id} does not exist."
            }), 404

        user = get_current_authenticated_user()

        # Authorization Check: Prevent user from deleting another user's record
        if user and record.user_id is not None and record.user_id != user.id:
            return jsonify({
                "success": False,
                "error": "Unauthorized. You cannot delete prediction records owned by another user."
            }), 403

        try:
            db.session.delete(record)
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Prediction record {record_id} deleted successfully.",
                "deleted_id": record_id
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "success": False,
                "error": f"Failed to delete record: {str(e)}"
            }), 500

    @app.route("/api/history", methods=["DELETE"])
    def clear_all_history():
        """
        Clears prediction records from history for the current user.
        """
        user = get_current_authenticated_user()
        query = PredictionHistory.query
        if user:
            query = query.filter_by(user_id=user.id)
        else:
            query = query.filter_by(user_id=None)

        try:
            num_deleted = query.delete(synchronize_session="fetch")
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Cleared {num_deleted} prediction records.",
                "deleted_count": num_deleted
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "success": False,
                "error": f"Failed to clear history: {str(e)}"
            }), 500

    # -------------------------------------------------------------
    # ERROR HANDLERS
    # -------------------------------------------------------------

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Endpoint not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"success": False, "error": "HTTP method not allowed for this endpoint."}), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f" * MindText Backend API starting on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
