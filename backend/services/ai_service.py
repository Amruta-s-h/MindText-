"""
MindText AI Explanation Service
Integrates with OpenAI API (gpt-4o-mini / gpt-3.5-turbo) to explain sentiment predictions.
Includes an intelligent fallback mechanism so the app works seamlessly even without an API key.
"""

import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.client = None

        if self._is_valid_key(self.api_key):
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
                logger.info(f"OpenAI client initialized with model '{self.model}'.")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}")
                self.client = None

    def _is_valid_key(self, key: str) -> bool:
        """Validates that key is present and not a template placeholder."""
        if not key:
            return False
        if key in ("your_openai_api_key_here", "sk-placeholder", "none"):
            return False
        if not key.startswith("sk-"):
            return False
        return True

    def generate_explanation(self, text: str, prediction: Dict[str, Any]) -> str:
        """
        Generates a human-friendly explanation for a sentiment prediction.
        Attempts OpenAI first; falls back gracefully to a structured explanation if unavailable.
        """
        # If OpenAI client is configured, attempt LLM explanation
        if self.client is not None:
            try:
                sentiment = prediction.get("sentiment", "Neutral")
                confidence = prediction.get("confidence", 0.0) * 100
                probs = prediction.get("probabilities", {})
                neg_p = probs.get("negative", 0.0) * 100
                neu_p = probs.get("neutral", 0.0) * 100
                pos_p = probs.get("positive", 0.0) * 100

                prompt = (
                    f"Text: \"{text}\"\n"
                    f"Predicted Sentiment: {sentiment} ({confidence:.1f}% confidence)\n"
                    f"Probability Breakdown: Negative: {neg_p:.1f}%, Neutral: {neu_p:.1f}%, Positive: {pos_p:.1f}%\n\n"
                    f"In 2 to 3 concise, clear sentences:\n"
                    f"1. Explain what emotional tone, keywords, or phrasing in the text influenced this {sentiment} classification.\n"
                    f"2. Explain why the classifier favored this over other sentiments."
                )

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are MindText AI, an analytical NLP assistant that explains "
                                "machine learning sentiment predictions clearly and concisely for college research."
                            )
                        },
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=150,
                    temperature=0.5,
                    timeout=8.0
                )
                
                content = response.choices[0].message.content
                if content and content.strip():
                    return content.strip()

            except Exception as e:
                logger.warning(f"OpenAI API call failed or timed out ({e}). Using intelligent fallback.")

        # Graceful fallback explanation
        return self._generate_fallback_explanation(text, prediction)

    def _generate_fallback_explanation(self, text: str, prediction: Dict[str, Any]) -> str:
        """
        Rule-based analytical fallback when OpenAI API is not configured or reachable.
        """
        sentiment = prediction.get("sentiment", "Neutral")
        confidence = prediction.get("confidence", 0.0) * 100
        probs = prediction.get("probabilities", {})

        if sentiment == "Positive":
            reason = (
                f"The text was classified as Positive with {confidence:.1f}% confidence. "
                f"The phrasing exhibits favorable emotional polarity and appreciative tone, "
                f"with positive features outweighing negative markers ({probs.get('negative', 0.0)*100:.1f}%)."
            )
        elif sentiment == "Negative":
            reason = (
                f"The text was classified as Negative with {confidence:.1f}% confidence. "
                f"It reflects critical or displeased tone, with negative vocabulary signals "
                f"dominating the statistical feature distribution over positive cues ({probs.get('positive', 0.0)*100:.1f}%)."
            )
        else:
            reason = (
                f"The text was classified as Neutral with {confidence:.1f}% confidence. "
                f"The language is primarily factual, conversational, or objective, without strong "
                f"unbalanced emotional sentiment indicators."
            )

        if not self._is_valid_key(self.api_key):
            reason += " (Rule-based insight: Set OPENAI_API_KEY in .env to enable generative LLM explanations.)"

        return reason
