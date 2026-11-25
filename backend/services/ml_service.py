"""
MindText Machine Learning Service
Loads the trained Joblib sentiment pipeline and executes real-time predictions.
Reuses the exact text cleaner and preprocessing pipeline from training.
"""

import os
import json
import logging
import joblib
from services.text_cleaner import clean_text

logger = logging.getLogger(__name__)

class MLService:
    _instance = None
    _pipeline = None
    _metadata = None

    LABEL_MAPPING = {
        0: "Negative",
        1: "Neutral",
        2: "Positive"
    }

    def __init__(self, model_dir=None):
        if model_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_dir = os.path.join(backend_dir, "models")
        self.model_dir = model_dir
        self.pipeline_path = os.path.join(self.model_dir, "sentiment_pipeline.joblib")
        self.metadata_path = os.path.join(self.model_dir, "model_metadata.json")
        self._load_pipeline()

    def _load_pipeline(self):
        """Loads the serialized scikit-learn pipeline and metadata from disk."""
        if not os.path.exists(self.pipeline_path):
            raise FileNotFoundError(
                f"Trained model pipeline not found at {self.pipeline_path}. "
                "Please run backend/ml/train.py first."
            )

        logger.info(f"Loading sentiment pipeline from: {self.pipeline_path}")
        self._pipeline = joblib.load(self.pipeline_path)

        # Load metadata if present
        if os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
                    # Sync label mapping if defined in metadata
                    if "label_mapping" in self._metadata:
                        self.LABEL_MAPPING = {
                            int(k): v for k, v in self._metadata["label_mapping"].items()
                        }
            except Exception as e:
                logger.warning(f"Could not load metadata: {e}")

    @classmethod
    def get_instance(cls):
        """Singleton accessor to ensure model pipeline is loaded only once in memory."""
        if cls._instance is None:
            cls._instance = MLService()
        return cls._instance

    def predict(self, text: str) -> dict:
        """
        Executes sentiment prediction on raw input text.
        
        Args:
            text (str): The raw user-provided text.
            
        Returns:
            dict: {
                "text": str,
                "cleaned_text": str,
                "sentiment": str,
                "sentiment_code": int,
                "confidence": float,
                "probabilities": {
                    "negative": float,
                    "neutral": float,
                    "positive": float
                }
            }
        """
        if not text or not isinstance(text, str) or not text.strip():
            raise ValueError("Input text cannot be empty.")

        # Preprocess text using the exact cleaner from training
        cleaned = clean_text(text)
        
        # If text became completely empty after stripping handles/urls, fallback to raw stripped
        eval_text = cleaned if cleaned else text.strip()

        # Run pipeline inference
        pred_code = int(self._pipeline.predict([eval_text])[0])
        probabilities = self._pipeline.predict_proba([eval_text])[0]

        sentiment_label = self.LABEL_MAPPING.get(pred_code, "Neutral")
        confidence = float(probabilities[pred_code])

        return {
            "text": text,
            "cleaned_text": eval_text,
            "sentiment": sentiment_label,
            "sentiment_code": pred_code,
            "confidence": round(confidence, 4),
            "probabilities": {
                "negative": round(float(probabilities[0]), 4),
                "neutral": round(float(probabilities[1]), 4),
                "positive": round(float(probabilities[2]), 4)
            }
        }
