"""
MindText Backend API Automated Verification Script
Tests all REST endpoints, ML inference, AI fallback, SQLite persistence, and error handling.
"""

import sys
import os
import json

# Add backend directory to sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from database import db
from models.prediction import PredictionHistory

def run_tests():
    print("=" * 65)
    print("        MINDTEXT BACKEND API & DATABASE VERIFICATION TEST        ")
    print("=" * 65)

    app = create_app()
    client = app.test_client()

    passed = 0
    total = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f" [PASS] {name}")
        else:
            print(f" [FAIL] {name} - {details}")

    # 1. Test GET /api/health
    print("\n--- 1. Testing GET /api/health ---")
    res = client.get("/api/health")
    data = res.get_json()
    assert_test("Health endpoint returns HTTP 200", res.status_code == 200, f"Got {res.status_code}")
    assert_test("Status is 'ok'", data.get("status") == "ok")
    assert_test("Model is loaded", data.get("model_status") == "loaded", f"Got {data.get('model_status')}")
    assert_test("Database is connected", data.get("database_status") == "connected")
    print(f"  Response: {json.dumps(data, indent=2)}")

    # 2. Test POST /api/predict (Positive Text)
    print("\n--- 2. Testing POST /api/predict (Positive Sentiment) ---")
    pos_payload = {"text": "I absolutely love this new update! Everything works smoothly and looks gorgeous."}
    res = client.post("/api/predict", json=pos_payload)
    data = res.get_json()
    assert_test("Returns HTTP 201 Created", res.status_code == 201, f"Got {res.status_code}")
    assert_test("Returns success: True", data.get("success") is True)
    pred_data = data.get("data", {})
    pos_id = pred_data.get("id")
    assert_test("Classification is 'Positive'", pred_data.get("sentiment") == "Positive", f"Got {pred_data.get('sentiment')}")
    assert_test("Confidence > 0.5", pred_data.get("confidence", 0) > 0.5, f"Got {pred_data.get('confidence')}")
    assert_test("Probabilities for all 3 classes present", set(pred_data.get("probabilities", {}).keys()) == {"negative", "neutral", "positive"})
    assert_test("AI explanation is present", bool(pred_data.get("ai_explanation")))
    assert_test("Record ID assigned by SQLite", isinstance(pos_id, int))
    print(f"  Sentiment: {pred_data.get('sentiment')} ({pred_data.get('confidence')*100:.1f}%)")
    print(f"  AI Explanation: {pred_data.get('ai_explanation')}")

    # 3. Test POST /api/predict (Negative Text)
    print("\n--- 3. Testing POST /api/predict (Negative Sentiment) ---")
    neg_payload = {"text": "The flight was delayed by 4 hours and the customer support was completely unhelpful."}
    res = client.post("/api/predict", json=neg_payload)
    data = res.get_json()
    assert_test("Returns HTTP 201 Created", res.status_code == 201, f"Got {res.status_code}")
    pred_data = data.get("data", {})
    neg_id = pred_data.get("id")
    assert_test("Classification is 'Negative'", pred_data.get("sentiment") == "Negative", f"Got {pred_data.get('sentiment')}")
    print(f"  Sentiment: {pred_data.get('sentiment')} ({pred_data.get('confidence')*100:.1f}%)")

    # 4. Test Input Validation & Error Handling
    print("\n--- 4. Testing Input Validation ---")
    # Empty string
    res_empty = client.post("/api/predict", json={"text": "   "})
    assert_test("Empty text returns HTTP 400", res_empty.status_code == 400)
    # Missing field
    res_missing = client.post("/api/predict", json={})
    assert_test("Missing 'text' returns HTTP 400", res_missing.status_code == 400)
    # Non-JSON content type
    res_bad_type = client.post("/api/predict", data="hello", content_type="text/plain")
    assert_test("Non-JSON body returns HTTP 400", res_bad_type.status_code == 400)

    # 5. Test GET /api/history
    print("\n--- 5. Testing GET /api/history ---")
    res_hist = client.get("/api/history")
    hist_data = res_hist.get_json()
    assert_test("Returns HTTP 200", res_hist.status_code == 200)
    assert_test("History has at least 2 records", hist_data.get("total", 0) >= 2)
    assert_test("Data array returned", isinstance(hist_data.get("data"), list))

    # Test filtering by sentiment
    res_filt = client.get("/api/history?sentiment=Positive")
    filt_data = res_filt.get_json()
    assert_test("Filter query returns filtered records", all(r["sentiment"] == "Positive" for r in filt_data.get("data", [])))

    # 6. Test DELETE /api/history/<id>
    print("\n--- 6. Testing DELETE /api/history/<id> ---")
    res_del = client.delete(f"/api/history/{pos_id}")
    del_data = res_del.get_json()
    assert_test("Delete returns HTTP 200", res_del.status_code == 200)
    assert_test("Deleted ID matches", del_data.get("deleted_id") == pos_id)

    # Re-deleting should 404
    res_del_again = client.delete(f"/api/history/{pos_id}")
    assert_test("Re-delete returns HTTP 404 Not Found", res_del_again.status_code == 404)

    # 7. Test GET /api/model-info
    print("\n--- 7. Testing GET /api/model-info ---")
    res_model = client.get("/api/model-info")
    model_data = res_model.get_json()
    assert_test("Model info returns HTTP 200", res_model.status_code == 200)
    assert_test("Model info success is True", model_data.get("success") is True)
    m_info = model_data.get("data", {})
    assert_test("Confusion matrix 3x3 present", len(m_info.get("test_metrics", {}).get("confusion_matrix", [])) == 3)
    assert_test("Class metrics present", "Positive" in m_info.get("test_metrics", {}).get("per_class", {}))

    # 8. Test GET /api/analytics
    print("\n--- 8. Testing GET /api/analytics ---")
    res_analytics = client.get("/api/analytics")
    an_data = res_analytics.get_json()
    assert_test("Analytics returns HTTP 200", res_analytics.status_code == 200)
    assert_test("Analytics success is True", an_data.get("success") is True)
    an_info = an_data.get("data", {})
    assert_test("Total count is integer", isinstance(an_info.get("total"), int))
    assert_test("Sentiment distribution present", set(an_info.get("sentiment_distribution", {}).keys()) == {"Negative", "Neutral", "Positive"})
    assert_test("Confidence buckets present", len(an_info.get("confidence_buckets", [])) == 5)

    # Summary
    print("\n" + "=" * 65)
    print(f" Test Results: {passed}/{total} Passed ({passed/total*100:.1f}%)")
    print("=" * 65)

    if passed == total:
        print("ALL TESTS PASSED! Backend API is verified and fully functional.\n")
        return 0
    else:
        print("SOME TESTS FAILED! Please check the logs above.\n")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
