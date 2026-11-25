# MindText – AI-Powered Sentiment Analysis

MindText is a full-stack AI/ML platform that classifies the sentiment of input text into **Positive**, **Negative**, or **Neutral** using a calibrated Machine Learning pipeline (TF-IDF + Logistic Regression trained on TweetEval) combined with an OpenAI-powered explanation layer, complete with secure user authentication and a comprehensive Model Performance evaluation dashboard.

## Architecture Overview
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Python Flask REST API, PyJWT Authentication
- **Machine Learning**: TF-IDF vectorization & Logistic Regression (TweetEval Sentiment Dataset: 45,615 train / 2,000 val / 12,284 test samples)
- **Database**: SQLite with SQLAlchemy ORM (User accounts, hashed passwords, user-isolated prediction history)
- **Security**: PBKDF2:SHA256 password hashing, RFC 7519 signed JWT session tokens, 403 Forbidden cross-user resource protection
- **AI Explanation**: OpenAI API integration with graceful rule-based fallback

## Project Structure
```text
MindText/
├── backend/
│   ├── dataset/             # Hugging Face TweetEval dataset cache
│   ├── instance/            # SQLite database storage (mindtext.db)
│   ├── ml/                  # Training script (train.py) with 5-fold CV & evaluation
│   ├── models/              # Serialized pipeline (sentiment_pipeline.joblib, model_metadata.json)
│   │   ├── user.py          # SQLAlchemy User model (password hashing & validation)
│   │   └── prediction.py    # SQLAlchemy PredictionHistory model (user_id foreign key)
│   ├── services/
│   │   ├── auth_service.py  # JWT encoding/decoding, user extraction & @login_required decorator
│   │   ├── ml_service.py    # Scikit-learn inference pipeline wrapper
│   │   └── ai_service.py    # OpenAI LLM explanation service with graceful fallback
│   ├── app.py               # Flask REST API endpoints (auth, predict, history, analytics, model-info)
│   ├── test_api.py          # 32 backend REST API unit tests
│   ├── test_auth.py         # 24 authentication & data isolation unit tests
│   ├── test_integration.py  # 9 end-to-end integration workflow tests
│   └── requirements.txt     # Python dependencies (Flask, PyJWT, scikit-learn, etc.)
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, SentimentResult, AIExplanation, StatCard, etc.
│   │   ├── context/         # AuthContext (JWT session state) & ThemeContext (Dark/Light mode)
│   │   ├── pages/           # Landing, Workspace, Analytics, History, ModelPerformance, Login, Register, Profile
│   │   ├── services/        # api.ts (Centralized API client with automatic Bearer token injection)
│   │   └── types/           # TypeScript interfaces (User, Prediction, ModelMetadata, OneVsRest)
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## REST API Endpoints

### Authentication & Users
- `POST /api/auth/register`: Create user account (Full Name, Email, Password, Confirm Password). Returns JWT token.
- `POST /api/auth/login`: Authenticate existing user. Returns JWT token and user profile.
- `GET /api/auth/me`: Fetch current authenticated user profile (`@login_required`).
- `PUT /api/auth/profile`: Update display name or change password (`@login_required`).

### Inference & Analytics
- `POST /api/predict`: Classify sentiment, compute confidence & class probabilities, generate AI explanation, and persist to history (associating current user if logged in).
- `GET /api/history`: Fetch paginated prediction history (user-isolated when authenticated, with optional sentiment filter).
- `DELETE /api/history/<id>`: Delete specific prediction record (enforces ownership with `403 Forbidden` if unauthorized).
- `DELETE /api/history`: Clear all predictions belonging to current authenticated user.
- `GET /api/analytics`: Aggregate KPI metrics, sentiment distribution, and confidence buckets for current user.
- `GET /api/model-info`: Retrieve TweetEval held-out test split (12,284 tweets) benchmark metrics, 3x3 confusion matrix, and One-vs-Rest TP/TN/FP/FN values.
- `GET /api/health`: System health status (model loaded, DB connected, OpenAI mode).

## Quick Start Guide

### 1. Run the Backend Server
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```
*Backend runs at `http://127.0.0.1:5000`.*

### 2. Run the Frontend Development Server
```powershell
cd frontend
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

### 3. Run Backend Verification Tests
```powershell
cd backend
python test_api.py          # 32/32 tests passing
python test_auth.py         # 24/24 tests passing
python test_integration.py  # 9/9 tests passing
```
