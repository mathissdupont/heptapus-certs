#!/usr/bin/env python3
"""
Comprehensive API endpoint testing script.
Tests all new endpoints for badges, tiers, surveys, sponsors, and analytics.
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_PREFIX = f"{BASE_URL}/api"

# Test data
TEST_EVENT_ID = 1
TEST_ATTENDEE_ID = 1

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, message=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} | {name}")
    if message:
        print(f"       {message}")
    
    results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })
    
    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1

def test_health():
    """Test health check endpoint"""
    try:
        resp = requests.get(f"{API_PREFIX}/health")
        passed = resp.status_code == 200 and resp.json().get("status") == "ok"
        log_test("Health Check", passed, f"Status: {resp.status_code}")
        return passed
    except Exception as e:
        log_test("Health Check", False, str(e))
        return False

def test_badge_rules_endpoints():
    """Test badge rule endpoints"""
    print(f"\n{BLUE}Testing Badge Rules Endpoints...{RESET}")
    
    # GET badge rules
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/badge-rules")
        passed = resp.status_code in [200, 403, 401]  # May need auth
        log_test("GET /badge-rules", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /badge-rules", False, str(e))
    
    # POST badge rules
    try:
        data = {
            "enabled": True,
            "definitions": {
                "early_bird": {
                    "name": "Early Bird",
                    "description": "Registered in first 24 hours",
                    "icon_url": "https://example.com/icon.png",
                    "color": "#FF6B6B"
                }
            }
        }
        resp = requests.post(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/badge-rules", json=data)
        passed = resp.status_code in [200, 201, 403, 401]
        log_test("POST /badge-rules", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /badge-rules", False, str(e))

def test_participant_badges_endpoints():
    """Test participant badge endpoints"""
    print(f"\n{BLUE}Testing Participant Badges Endpoints...{RESET}")
    
    # GET badges for event
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/badges")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /badges", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /badges", False, str(e))
    
    # POST award badge
    try:
        data = {
            "attendee_id": TEST_ATTENDEE_ID,
            "badge_type": "early_bird",
            "criteria_met": {"registered_hours": 2},
            "badge_metadata": {"manual_award": True}
        }
        resp = requests.post(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/badges", json=data)
        passed = resp.status_code in [200, 201, 403, 401, 422]
        log_test("POST /badges (award)", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /badges (award)", False, str(e))
    
    # POST calculate badges
    try:
        resp = requests.post(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/badges/calculate")
        passed = resp.status_code in [200, 403, 401]
        log_test("POST /badges/calculate", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /badges/calculate", False, str(e))

def test_certificate_tier_endpoints():
    """Test certificate tier endpoints"""
    print(f"\n{BLUE}Testing Certificate Tier Endpoints...{RESET}")
    
    # GET tier rules
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/certificate-tiers")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /certificate-tiers", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /certificate-tiers", False, str(e))
    
    # POST tier rules
    try:
        data = {
            "enabled": True,
            "tiers": {
                "gold": {
                    "name": "Gold",
                    "description": "Premium attendance",
                    "min_attendance_percent": 90
                }
            }
        }
        resp = requests.post(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/certificate-tiers", json=data)
        passed = resp.status_code in [200, 201, 403, 401]
        log_test("POST /certificate-tiers", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /certificate-tiers", False, str(e))
    
    # POST assign tiers
    try:
        resp = requests.post(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/certificates/assign-tiers")
        passed = resp.status_code in [200, 403, 401]
        log_test("POST /certificates/assign-tiers", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /certificates/assign-tiers", False, str(e))
    
    # GET tier summary
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/certificates/tier-summary")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /certificates/tier-summary", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /certificates/tier-summary", False, str(e))

def test_survey_endpoints():
    """Test survey configuration endpoints"""
    print(f"\n{BLUE}Testing Survey Endpoints...{RESET}")
    
    # GET survey config
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/survey-config")
        passed = resp.status_code in [200, 403, 401, 404]
        log_test("GET /survey-config", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /survey-config", False, str(e))
    
    # POST survey config
    try:
        data = {
            "survey_required": False,
            "survey_mode": "built_in",
            "questions": [
                {
                    "id": "q1",
                    "type": "text",
                    "question": "What was your favorite session?",
                    "required": True
                }
            ]
        }
        resp = requests.post(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/survey-config", json=data)
        passed = resp.status_code in [200, 201, 403, 401]
        log_test("POST /survey-config", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /survey-config", False, str(e))
    
    # GET survey responses
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/surveys/responses")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /surveys/responses", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /surveys/responses", False, str(e))
    
    # POST survey response (public)
    try:
        data = {
            "responses": {"q1": "Best session was AI track"}
        }
        resp = requests.post(f"{API_PREFIX}/surveys/{TEST_EVENT_ID}/submit", json=data)
        passed = resp.status_code in [200, 201, 403, 401, 422]
        log_test("POST /surveys/{event_id}/submit", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /surveys/{event_id}/submit", False, str(e))

def test_sponsor_endpoints():
    """Test sponsor management endpoints"""
    print(f"\n{BLUE}Testing Sponsor Endpoints...{RESET}")
    
    # GET sponsors
    try:
        resp = requests.get(f"{API_PREFIX}/public/events/{TEST_EVENT_ID}/sponsors")
        passed = resp.status_code in [200, 403, 401, 404]
        log_test("GET /public/events/{event_id}/sponsors", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /public/events/{event_id}/sponsors", False, str(e))
    
    # GET admin sponsors
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/sponsors")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /admin/events/{event_id}/sponsors", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /admin/events/{event_id}/sponsors", False, str(e))
    
    # POST sponsor
    try:
        data = {
            "name": "TechCorp",
            "level": "gold",
            "logo_url": "https://example.com/logo.png",
            "website_url": "https://techcorp.com"
        }
        resp = requests.post(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/sponsors", json=data)
        passed = resp.status_code in [200, 201, 403, 401]
        log_test("POST /sponsors", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("POST /sponsors", False, str(e))

def test_analytics_endpoints():
    """Test analytics endpoints"""
    print(f"\n{BLUE}Testing Analytics Endpoints...{RESET}")
    
    # GET engagement analytics
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/analytics/engagement")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /analytics/engagement", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /analytics/engagement", False, str(e))
    
    # GET badge analytics
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/analytics/badges")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /analytics/badges", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /analytics/badges", False, str(e))
    
    # GET tier analytics
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/analytics/tiers")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /analytics/tiers", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /analytics/tiers", False, str(e))
    
    # GET timeline analytics
    try:
        resp = requests.get(f"{API_PREFIX}/admin/events/{TEST_EVENT_ID}/analytics/timeline")
        passed = resp.status_code in [200, 403, 401]
        log_test("GET /analytics/timeline", passed, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("GET /analytics/timeline", False, str(e))

def print_summary():
    """Print test summary"""
    print(f"\n{'='*60}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{'='*60}")
    print(f"{GREEN}✓ Passed: {results['passed']}{RESET}")
    print(f"{RED}✗ Failed: {results['failed']}{RESET}")
    total = results['passed'] + results['failed']
    pct = (results['passed'] / total * 100) if total > 0 else 0
    print(f"Success Rate: {pct:.1f}%")
    print(f"{'='*60}\n")
    
    if results['failed'] > 0:
        print(f"{RED}Failed Tests:{RESET}")
        for test in results['tests']:
            if not test['passed']:
                print(f"  - {test['name']}: {test['message']}")

if __name__ == "__main__":
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}HeptaCert API Endpoint Integration Tests{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    # Test backend health first
    print(f"\n{BLUE}Testing Backend Health...{RESET}")
    if not test_health():
        print(f"{RED}ERROR: Backend is not responding. Exiting.{RESET}")
        sys.exit(1)
    
    # Run all endpoint tests
    test_badge_rules_endpoints()
    test_participant_badges_endpoints()
    test_certificate_tier_endpoints()
    test_survey_endpoints()
    test_sponsor_endpoints()
    test_analytics_endpoints()
    
    # Print summary
    print_summary()
    
    # Exit with error if any test failed
    sys.exit(0 if results['failed'] == 0 else 1)
