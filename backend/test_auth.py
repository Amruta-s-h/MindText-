"""
MindText Authentication & Authorization Verification Test Suite
Tests registration, password hashing, JWT login, route protection, and user-scoped data isolation.
"""

import sys
import os
import json

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from database import db
from models.user import User
from models.prediction import PredictionHistory

def run_auth_tests():
    print("=" * 70)
    print("        MINDTEXT AUTHENTICATION & USER ISOLATION TEST SUITE       ")
    print("=" * 70)

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

    # Unique test emails
    user1_email = "alex.researcher@example.com"
    user2_email = "sarah.student@example.com"

    # Cleanup any prior test users
    with app.app_context():
        User.query.filter(User.email.in_([user1_email, user2_email])).delete()
        db.session.commit()

    # 1. Test Registration
    print("\n--- 1. Testing Registration Validation ---")
    # Password mismatch
    res = client.post("/api/auth/register", json={
        "full_name": "Alex Smith",
        "email": user1_email,
        "password": "Password123",
        "confirm_password": "WrongPassword"
    })
    assert_test("Mismatched passwords rejected (400)", res.status_code == 400)

    # Short password
    res = client.post("/api/auth/register", json={
        "full_name": "Alex Smith",
        "email": user1_email,
        "password": "123",
        "confirm_password": "123"
    })
    assert_test("Short password rejected (400)", res.status_code == 400)

    # Valid Registration User 1
    res = client.post("/api/auth/register", json={
        "full_name": "Alex Smith",
        "email": user1_email,
        "password": "Password123",
        "confirm_password": "Password123"
    })
    assert_test("User 1 registered successfully (201)", res.status_code == 201)
    data1 = res.get_json()
    token1 = data1.get("token")
    user1_id = data1.get("user", {}).get("id")
    assert_test("JWT token returned on registration", bool(token1))
    assert_test("Password not exposed in response", "password" not in data1.get("user", {}))

    # Duplicate Registration
    res = client.post("/api/auth/register", json={
        "full_name": "Alex Duplicate",
        "email": user1_email,
        "password": "Password123",
        "confirm_password": "Password123"
    })
    assert_test("Duplicate email rejected (409 Conflict)", res.status_code == 409)

    # Register User 2
    res = client.post("/api/auth/register", json={
        "full_name": "Sarah Connor",
        "email": user2_email,
        "password": "Password456",
        "confirm_password": "Password456"
    })
    assert_test("User 2 registered successfully (201)", res.status_code == 201)
    token2 = res.get_json().get("token")
    user2_id = res.get_json().get("user", {}).get("id")

    # 2. Test Login
    print("\n--- 2. Testing Login & Authentication ---")
    # Wrong password
    res = client.post("/api/auth/login", json={"email": user1_email, "password": "BadPassword"})
    assert_test("Invalid password rejected (401)", res.status_code == 401)

    # Correct password
    res = client.post("/api/auth/login", json={"email": user1_email, "password": "Password123"})
    assert_test("Login successful with valid credentials (200)", res.status_code == 200)
    login_token = res.get_json().get("token")
    assert_test("Login returned valid JWT", bool(login_token))

    # 3. Test Protected Profile Route
    print("\n--- 3. Testing Protected Route (/api/auth/me) ---")
    # Without token
    res = client.get("/api/auth/me")
    assert_test("Access without token rejected (401)", res.status_code == 401)

    # With User 1 token
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token1}"})
    assert_test("Access with token approved (200)", res.status_code == 200)
    me_data = res.get_json().get("user", {})
    assert_test("Profile email matches User 1", me_data.get("email") == user1_email)

    # 4. Test User Data Isolation & Ownership
    print("\n--- 4. Testing User Data Isolation & Ownership ---")
    # User 1 makes a prediction
    res = client.post(
        "/api/predict",
        json={"text": "User 1 personal positive text!"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert_test("User 1 prediction created (201)", res.status_code == 201)
    u1_pred_id = res.get_json().get("data", {}).get("id")
    assert_test("Prediction assigned User 1 ID", res.get_json().get("data", {}).get("user_id") == user1_id)

    # User 2 fetches history -> Should NOT see User 1's prediction
    res = client.get("/api/history", headers={"Authorization": f"Bearer {token2}"})
    u2_history = res.get_json().get("data", [])
    assert_test("User 2 history isolates and does NOT contain User 1's prediction", all(r["id"] != u1_pred_id for r in u2_history))

    # User 2 attempts to delete User 1's prediction -> Must return 403 Forbidden!
    res = client.delete(f"/api/history/{u1_pred_id}", headers={"Authorization": f"Bearer {token2}"})
    assert_test("Unauthorized deletion blocked (403 Forbidden)", res.status_code == 403)

    # User 1 deletes their own prediction -> Must succeed (200)
    res = client.delete(f"/api/history/{u1_pred_id}", headers={"Authorization": f"Bearer {token1}"})
    assert_test("Owner deletion approved (200 OK)", res.status_code == 200)

    # 5. Test Model Info One-vs-Rest TP, TN, FP, FN
    print("\n--- 5. Testing One-vs-Rest Model Performance Math ---")
    res = client.get("/api/model-info")
    m_data = res.get_json().get("data", {})
    ovr = m_data.get("one_vs_rest", {})
    assert_test("One-vs-Rest calculated for Negative", "Negative" in ovr)
    assert_test("One-vs-Rest calculated for Neutral", "Neutral" in ovr)
    assert_test("One-vs-Rest calculated for Positive", "Positive" in ovr)

    # Check sum of TP + TN + FP + FN equals test set size (12,284)
    neg_ovr = ovr.get("Negative", {})
    neg_sum = neg_ovr.get("tp", 0) + neg_ovr.get("tn", 0) + neg_ovr.get("fp", 0) + neg_ovr.get("fn", 0)
    assert_test("Negative TP+TN+FP+FN == 12,284", neg_sum == 12284, f"Got {neg_sum}")

    neu_ovr = ovr.get("Neutral", {})
    neu_sum = neu_ovr.get("tp", 0) + neu_ovr.get("tn", 0) + neu_ovr.get("fp", 0) + neu_ovr.get("fn", 0)
    assert_test("Neutral TP+TN+FP+FN == 12,284", neu_sum == 12284, f"Got {neu_sum}")

    pos_ovr = ovr.get("Positive", {})
    pos_sum = pos_ovr.get("tp", 0) + pos_ovr.get("tn", 0) + pos_ovr.get("fp", 0) + pos_ovr.get("fn", 0)
    assert_test("Positive TP+TN+FP+FN == 12,284", pos_sum == 12284, f"Got {pos_sum}")

    # Summary
    print("\n" + "=" * 70)
    print(f" Test Results: {passed}/{total} Passed ({passed/total*100:.1f}%)")
    print("=" * 70)

    if passed == total:
        print("ALL AUTHENTICATION & DATA ISOLATION TESTS PASSED SUCCESSFULLY!\n")
        return 0
    return 1

if __name__ == "__main__":
    sys.exit(run_auth_tests())
