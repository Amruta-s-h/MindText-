"""
MindText - Machine Learning Training Pipeline
Dataset: TweetEval (Sentiment subset) from Hugging Face
Model: TF-IDF Vectorization + Logistic Regression Classifier
"""

import os
import sys
import json
import time
from datetime import datetime, timezone
import numpy as np
import joblib
from datasets import load_dataset
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

# Add parent directory to path to import text_cleaner
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.text_cleaner import clean_text

# Label Mapping for TweetEval Sentiment
LABEL_MAPPING = {
    0: "Negative",
    1: "Neutral",
    2: "Positive"
}
CLASS_NAMES = [LABEL_MAPPING[i] for i in sorted(LABEL_MAPPING.keys())]

# Directories
DATASET_DIR = os.path.join(BACKEND_DIR, "dataset")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Random Seed for Reproducibility
RANDOM_SEED = 42

def load_tweeteval_dataset():
    """
    Downloads and caches the official TweetEval sentiment dataset splits.
    Tries primary identifier 'tweet_eval' then fallback 'cardiffnlp/tweet_eval'.
    """
    print("[1/6] Loading TweetEval Sentiment dataset from Hugging Face...")
    try:
        dataset = load_dataset("tweet_eval", "sentiment")
    except Exception as e:
        print(f"  * Primary identifier failed ({e}), trying 'cardiffnlp/tweet_eval'...")
        dataset = load_dataset("cardiffnlp/tweet_eval", "sentiment")

    print(f"  * Splits found: {list(dataset.keys())}")
    print(f"  * Train samples: {len(dataset['train'])}")
    print(f"  * Validation samples: {len(dataset['validation'])}")
    print(f"  * Test samples: {len(dataset['test'])}")
    
    return dataset

def preprocess_splits(dataset):
    """
    Cleans text across train, validation, and test splits without data leakage.
    """
    print("[2/6] Preprocessing text data across splits...")
    start_time = time.time()

    def process_split(split_name):
        raw_texts = dataset[split_name]["text"]
        labels = dataset[split_name]["label"]
        cleaned_texts = [clean_text(t) for t in raw_texts]
        return cleaned_texts, np.array(labels)

    X_train, y_train = process_split("train")
    X_val, y_val = process_split("validation")
    X_test, y_test = process_split("test")

    print(f"  * Preprocessing finished in {time.time() - start_time:.2f}s")
    print(f"  * Class distribution in training set:")
    for label_idx, label_name in LABEL_MAPPING.items():
        count = np.sum(y_train == label_idx)
        pct = (count / len(y_train)) * 100
        print(f"    - [{label_idx}] {label_name:8s}: {count:5d} ({pct:.1f}%)")

    return X_train, y_train, X_val, y_val, X_test, y_test

def tune_and_train_model(X_train, y_train, X_val, y_val):
    """
    Uses the validation split for hyperparameter selection (tuning regularization C),
    then trains the optimal Logistic Regression model on the training set.
    """
    print("[3/6] Setting up TF-IDF Vectorizer and tuning Logistic Regression...")

    # Configure TF-IDF with unigrams + bigrams and sublinear term frequency
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=15000,
        sublinear_tf=True,
        min_df=2,
        strip_accents="unicode"
    )

    print("  * Fitting TF-IDF Vectorizer on training split only (preventing data leakage)...")
    X_train_vec = vectorizer.fit_transform(X_train)
    X_val_vec = vectorizer.transform(X_val)

    # Candidate C values for tuning
    candidate_c_values = [0.2, 0.5, 1.0, 2.0, 5.0]
    best_c = 1.0
    best_val_macro_f1 = -1.0
    tuning_results = []

    print("  * Evaluating candidate hyperparameters on validation split:")
    for c_val in candidate_c_values:
        clf = LogisticRegression(
            C=c_val,
            max_iter=1000,
            solver="lbfgs",
            random_state=RANDOM_SEED
        )
        clf.fit(X_train_vec, y_train)
        val_preds = clf.predict(X_val_vec)
        val_acc = accuracy_score(y_val, val_preds)
        val_macro_f1 = f1_score(y_val, val_preds, average="macro")

        print(f"    - C={c_val:4.1f} | Val Accuracy: {val_acc:.4f} | Val Macro F1: {val_macro_f1:.4f}")
        tuning_results.append({"C": c_val, "val_accuracy": val_acc, "val_macro_f1": val_macro_f1})

        if val_macro_f1 > best_val_macro_f1:
            best_val_macro_f1 = val_macro_f1
            best_c = c_val

    print(f"  * Best hyperparameter selected: C={best_c} (Validation Macro F1: {best_val_macro_f1:.4f})")

    # Retrain final classifier with selected best C
    print(f"[4/6] Training final Logistic Regression classifier with C={best_c}...")
    final_classifier = LogisticRegression(
        C=best_c,
        max_iter=1000,
        solver="lbfgs",
        random_state=RANDOM_SEED
    )
    final_classifier.fit(X_train_vec, y_train)

    # Construct the full scikit-learn Pipeline
    pipeline = Pipeline([
        ("tfidf", vectorizer),
        ("classifier", final_classifier)
    ])

    return pipeline, vectorizer, final_classifier, best_c, tuning_results

def evaluate_on_test_set(pipeline, X_test, y_test):
    """
    Evaluates the final pipeline on the unseen TweetEval test split.
    """
    print("[5/6] Evaluating final pipeline on unseen TweetEval Test split...")
    test_preds = pipeline.predict(X_test)

    # Calculate overall metrics
    test_accuracy = accuracy_score(y_test, test_preds)
    test_macro_prec = precision_score(y_test, test_preds, average="macro")
    test_macro_rec = recall_score(y_test, test_preds, average="macro")
    test_macro_f1 = f1_score(y_test, test_preds, average="macro")
    test_weighted_f1 = f1_score(y_test, test_preds, average="weighted")

    # Confusion matrix
    conf_matrix = confusion_matrix(y_test, test_preds)

    # Detailed classification report
    report_dict = classification_report(
        y_test,
        test_preds,
        target_names=CLASS_NAMES,
        output_dict=True
    )
    report_text = classification_report(
        y_test,
        test_preds,
        target_names=CLASS_NAMES,
        digits=4
    )

    print("\n" + "=" * 65)
    print("           TWEETEVAL SENTIMENT - TEST SPLIT EVALUATION           ")
    print("=" * 65)
    print(report_text)
    print("-" * 65)
    print(f" Overall Test Accuracy: {test_accuracy * 100:.2f}%")
    print(f" Macro Precision:       {test_macro_prec:.4f}")
    print(f" Macro Recall:          {test_macro_rec:.4f}")
    print(f" Macro F1-Score:        {test_macro_f1:.4f}")
    print(f" Weighted F1-Score:     {test_weighted_f1:.4f}")
    print("-" * 65)
    print(" Confusion Matrix (Rows = Actual, Columns = Predicted):")
    print("            Pred Neg  Pred Neu  Pred Pos")
    for idx, row in enumerate(conf_matrix):
        print(f" Actual {CLASS_NAMES[idx]:4s}:  {row[0]:7d}   {row[1]:7d}   {row[2]:7d}")
    print("=" * 65 + "\n")

    metrics = {
        "accuracy": float(test_accuracy),
        "macro_precision": float(test_macro_prec),
        "macro_recall": float(test_macro_rec),
        "macro_f1": float(test_macro_f1),
        "weighted_f1": float(test_weighted_f1),
        "confusion_matrix": conf_matrix.tolist(),
        "per_class": {
            name: {
                "precision": float(report_dict[name]["precision"]),
                "recall": float(report_dict[name]["recall"]),
                "f1_score": float(report_dict[name]["f1-score"]),
                "support": int(report_dict[name]["support"])
            }
            for name in CLASS_NAMES
        }
    }

    return metrics

def save_artifacts(pipeline, vectorizer, classifier, best_c, tuning_results, metrics):
    """
    Saves trained pipeline, individual components, and metadata to backend/models/.
    """
    print("[6/6] Saving trained model artifacts to backend/models/...")

    pipeline_path = os.path.join(MODELS_DIR, "sentiment_pipeline.joblib")
    vectorizer_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
    model_path = os.path.join(MODELS_DIR, "sentiment_model.joblib")
    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")

    joblib.dump(pipeline, pipeline_path)
    joblib.dump(vectorizer, vectorizer_path)
    joblib.dump(classifier, model_path)

    metadata = {
        "model_name": "TF-IDF + Logistic Regression Sentiment Classifier",
        "dataset": "TweetEval Sentiment (Hugging Face)",
        "label_mapping": LABEL_MAPPING,
        "class_names": CLASS_NAMES,
        "random_seed": RANDOM_SEED,
        "hyperparameters": {
            "best_c": best_c,
            "max_features": 15000,
            "ngram_range": [1, 2],
            "solver": "lbfgs",
            "max_iter": 1000
        },
        "tuning_history": tuning_results,
        "test_metrics": metrics,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "artifacts": {
            "pipeline": "sentiment_pipeline.joblib",
            "vectorizer": "tfidf_vectorizer.joblib",
            "classifier": "sentiment_model.joblib"
        }
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"  ✓ Full Pipeline saved to: {pipeline_path}")
    print(f"  ✓ TF-IDF Vectorizer saved to: {vectorizer_path}")
    print(f"  ✓ Classifier saved to: {model_path}")
    print(f"  ✓ Metadata & Evaluation saved to: {metadata_path}")

    # Test an inference sanity check with the saved pipeline
    print("\n[Sanity Check] Verifying loaded pipeline with sample sentences:")
    loaded_pipe = joblib.load(pipeline_path)
    sample_tests = [
        "I absolutely love this new update! Everything works smoothly and looks gorgeous.",
        "The flight was delayed by 4 hours and the customer support was completely unhelpful.",
        "The package arrived today as scheduled according to the tracking number."
    ]
    for sample in sample_tests:
        cleaned = clean_text(sample)
        pred_idx = loaded_pipe.predict([cleaned])[0]
        probs = loaded_pipe.predict_proba([cleaned])[0]
        sentiment_label = LABEL_MAPPING[pred_idx]
        confidence = probs[pred_idx] * 100
        print(f"  Text: \"{sample}\"")
        print(f"  -> Predicted: {sentiment_label} (Confidence: {confidence:.1f}%) [Neg: {probs[0]*100:.1f}%, Neu: {probs[1]*100:.1f}%, Pos: {probs[2]*100:.1f}%]\n")

    print("Pipeline training, evaluation, and serialization completed successfully!")

def main():
    dataset = load_tweeteval_dataset()
    X_train, y_train, X_val, y_val, X_test, y_test = preprocess_splits(dataset)
    pipeline, vectorizer, classifier, best_c, tuning_results = tune_and_train_model(
        X_train, y_train, X_val, y_val
    )
    metrics = evaluate_on_test_set(pipeline, X_test, y_test)
    save_artifacts(pipeline, vectorizer, classifier, best_c, tuning_results, metrics)

if __name__ == "__main__":
    main()
