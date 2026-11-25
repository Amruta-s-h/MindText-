"""
MindText Full-Stack End-to-End Integration Verification
Simulates the exact frontend workflow against the backend API and ML model.
"""

import sys
import os
import json

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app

def run_integration_test():
    print("=" * 70)
    print("       MINDTEXT COMPLETE END-TO-END WORKFLOW INTEGRATION TEST       ")
    print("=" * 70)

    app = create_app()
    client = app.test_client()

    step_results = []

    def record_step(step_name, success, info=""):
        step_results.append((step_name, success, info))
        status = "PASSED" if success else "FAILED"
        print(f"[{status}] {step_name}")
        if info:
            print(f"        Details: {info}")

    # Step 1: Health check
    print("\n--- Step 1: Frontend pings /api/health ---")
    res = client.get("/api/health")
    data = res.get_json()
    record_step(
        "API Health Check",
        res.status_code == 200 and data.get("model_status") == "loaded",
        f"Service: {data.get('service')} | Model: {data.get('model_status')} | DB: {data.get('database_status')}"
    )

    # Step 2: Positive prediction
    print("\n--- Step 2: User enters Positive text and clicks 'Analyze' ---")
    pos_text = "I absolutely love this new update! Everything works smoothly and looks gorgeous."
    res = client.post("/api/predict", json={"text": pos_text})
    pos_data = res.get_json().get("data", {})
    pos_id = pos_data.get("id")
    record_step(
        "Positive Prediction & Persistence",
        res.status_code == 201 and pos_data.get("sentiment") == "Positive",
        f"Sentiment: {pos_data.get('sentiment')} ({pos_data.get('confidence')*100:.1f}%) | DB Record ID: {pos_id}"
    )

    # Step 3: Negative prediction
    print("\n--- Step 3: User enters Negative text and clicks 'Analyze' ---")
    neg_text = "The flight was delayed by 4 hours and the customer support was completely unhelpful."
    res = client.post("/api/predict", json={"text": neg_text})
    neg_data = res.get_json().get("data", {})
    neg_id = neg_data.get("id")
    record_step(
        "Negative Prediction & Persistence",
        res.status_code == 201 and neg_data.get("sentiment") == "Negative",
        f"Sentiment: {neg_data.get('sentiment')} ({neg_data.get('confidence')*100:.1f}%) | DB Record ID: {neg_id}"
    )

    # Step 4: Neutral prediction
    print("\n--- Step 4: User enters Neutral text and clicks 'Analyze' ---")
    neu_text = "The package arrived today as scheduled according to the tracking number."
    res = client.post("/api/predict", json={"text": neu_text})
    neu_data = res.get_json().get("data", {})
    neu_id = neu_data.get("id")
    record_step(
        "Neutral Prediction & Persistence",
        res.status_code == 201 and neu_data.get("sentiment") == "Neutral",
        f"Sentiment: {neu_data.get('sentiment')} ({neu_data.get('confidence')*100:.1f}%) | DB Record ID: {neu_id}"
    )

    # Step 5: History retrieval
    print("\n--- Step 5: Frontend fetches history via GET /api/history ---")
    res = client.get("/api/history")
    hist_data = res.get_json()
    records = hist_data.get("data", [])
    record_step(
        "Fetch Real SQLite History",
        res.status_code == 200 and len(records) >= 3,
        f"Retrieved {len(records)} records from SQLite database (Total in DB: {hist_data.get('total')})"
    )

    # Step 6: Filter history by Negative sentiment
    print("\n--- Step 6: Frontend filters history by 'Negative' tab ---")
    res = client.get("/api/history?sentiment=Negative")
    filt_records = res.get_json().get("data", [])
    record_step(
        "Filter History by Sentiment",
        res.status_code == 200 and all(r["sentiment"] == "Negative" for r in filt_records),
        f"Returned {len(filt_records)} records, all verified 'Negative'"
    )

    # Step 7: Delete single history record
    print(f"\n--- Step 7: User deletes record ID {neu_id} ---")
    res = client.delete(f"/api/history/{neu_id}")
    record_step(
        "Delete History Record",
        res.status_code == 200 and res.get_json().get("deleted_id") == neu_id,
        f"Record {neu_id} deleted from SQLite"
    )

    # Step 8: Verify deleted record is gone
    res = client.delete(f"/api/history/{neu_id}")
    record_step(
        "Verify Deleted Record Returns 404",
        res.status_code == 404,
        "Record confirmed deleted from database"
    )

    # Step 9: Validate empty input
    print("\n--- Step 9: User submits empty input ---")
    res = client.post("/api/predict", json={"text": "   "})
    record_step(
        "Input Validation (Empty Text)",
        res.status_code == 400,
        f"Server rejected invalid input with message: {res.get_json().get('error')}"
    )

    # Summary
    print("\n" + "=" * 70)
    passed_count = sum(1 for _, ok, _ in step_results if ok)
    total_count = len(step_results)
    print(f" Integration Results: {passed_count}/{total_count} Steps Passed ({passed_count/total_count*100:.1f}%)")
    print("=" * 70)

    if passed_count == total_count:
        print("ALL END-TO-END WORKFLOW INTEGRATION STEPS PASSED SUCCESSFULLY!\n")
        return 0
    return 1

if __name__ == "__main__":
    sys.exit(run_integration_test())
