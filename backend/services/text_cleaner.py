"""
MindText Text Preprocessing Utility
Used for cleaning raw text both during model training and real-time API inference.
"""

import html
import re

def clean_text(text: str) -> str:
    """
    Cleans raw text while preserving sentiment-bearing features like emojis and contractions.
    
    1. Decodes HTML entities (&amp; -> &, &lt; -> <, etc.)
    2. Removes URLs (http://, https://, www.)
    3. Removes Twitter username handles (@user, @name)
    4. Strips hashtag symbol while keeping the hashtag text (#amazing -> amazing)
    5. Normalizes repeated characters (e.g., 'soooo' -> 'soo') to retain emphasis without inflating vocab
    6. Normalizes whitespace
    """
    if not isinstance(text, str):
        return ""

    # Decode HTML entities
    text = html.unescape(text)

    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)

    # Remove user mentions (@username or the TweetEval '@user' token)
    text = re.sub(r'@\w+', ' ', text)

    # Convert hashtag #word into word
    text = re.sub(r'#(\w+)', r'\1', text)

    # Normalize repeated characters (more than 2 of same character -> max 2)
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)

    # Normalize multiple whitespace characters
    text = re.sub(r'\s+', ' ', text).strip()

    return text
