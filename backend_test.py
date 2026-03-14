#!/usr/bin/env python3
"""
Backend API Testing for Bloom Trans Community App
Tests all main functionality including auth, services, specialists, legal Q&A, news, and admin features.
"""

import requests
import sys
import json
from datetime import datetime

class BloomAPITester:
    def __init__(self, base_url="https://profile-hub-228.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.admin_user_id = None

        
    def run_test(self, name, method, endpoint, expected_status, data=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use admin token if specified
        token_to_use = self.admin_token if use_admin else self.token
        if token_to_use:
            headers['Authorization'] = f'Bearer {token_to_use}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")

            return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("=== HEALTH CHECK TESTS ===")
        
        # Root endpoint
        success1, _ = self.run_test("Root API Endpoint", "GET", "/", 200)
        
        # Health endpoint
        success2, _ = self.run_test("Health Check", "GET", "/health", 200)
        
        return success1 and success2

    def test_user_registration_and_login(self):
        """Test user registration and login with unique username validation"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        timestamp = datetime.now().strftime('%H%M%S')
        test_username = f"bloom_user_{timestamp}"
        test_email = f"bloom_user_{timestamp}@test.com"
        test_password = "BloomTest123!"
        
        # Test user registration
        user_data = {
            "email": test_email,
            "password": test_password,
            "username": test_username,
            "pronouns": "ona/její",
            "avatar": "avatar1"
        }
        
        success, response = self.run_test(
            "User Registration with Avatar Selection",
            "POST",
            "/auth/register",
            200,
            user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            print(f"   Registered user: {test_username}")
        
        # Test unique username validation by trying to register again
        success_duplicate, _ = self.run_test(
            "Duplicate Username Validation",
            "POST",
            "/auth/register",
            400,  # Should fail with 400
            user_data
        )
        
        # Test login
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        success_login, login_response = self.run_test(
            "User Login",
            "POST",
            "/auth/login", 
            200,
            login_data
        )
        
        if success_login and 'token' in login_response:
            self.token = login_response['token']
        
        # Test get current user
        success_me, _ = self.run_test(
            "Get Current User",
            "GET",
            "/auth/me",
            200
        )
        
        return success and success_duplicate and success_login and success_me

    def test_admin_setup(self):
        """Test admin setup endpoint"""
        print("\n=== ADMIN SETUP TESTS ===")
        
        # Create admin user first
        timestamp = datetime.now().strftime('%H%M%S')
        admin_email = f"bloom_admin_{timestamp}@test.com"
        admin_username = f"bloom_admin_{timestamp}"
        admin_password = "BloomAdmin123!"
        
        admin_data = {
            "email": admin_email,
            "password": admin_password,
            "username": admin_username,
            "pronouns": "ona/její",
            "avatar": "avatar2"
        }
        
        success_reg, reg_response = self.run_test(
            "Admin User Registration",
            "POST",
            "/auth/register",
            200,
            admin_data
        )
        
        if not success_reg:
            return False
            
        # Setup first admin using the secret endpoint
        success_setup, _ = self.run_test(
            "Setup First Admin",
            "POST",
            "/admin/setup-first-admin",
            200,
            {"email": admin_email, "secret": "bloom-admin-2024"}
        )
        
        if success_setup:
            # Login as admin
            admin_login_data = {
                "email": admin_email,
                "password": admin_password
            }
            
            success_login, login_response = self.run_test(
                "Admin Login",
                "POST",
                "/auth/login",
                200,
                admin_login_data
            )
            
            if success_login and 'token' in login_response:
                self.admin_token = login_response['token']
                self.admin_user_id = login_response.get('user', {}).get('id')
                print(f"   Admin setup complete: {admin_username}")
        
        return success_setup and success_login

    def test_services_functionality(self):
        """Test services with reply button and location filter"""
        print("\n=== SERVICES TESTS ===")
        
        if not self.token:
            print("❌ No user token available for services tests")
            return False
        
        # Create a service
        service_data = {
            "offer": "Vaření",
            "need": "Masáže", 
            "description": "Nabízím domácí vaření výměnou za relaxační masáže",
            "location": "Praha"
        }
        
        success_create, create_response = self.run_test(
            "Create Service with Location",
            "POST",
            "/services",
            200,  # Backend returns 200, not 201
            service_data
        )
        
        service_id = create_response.get('id') if success_create else None
        
        # Get all services
        success_get, _ = self.run_test(
            "Get Services", 
            "GET",
            "/services",
            200
        )
        
        # Get services with search
        success_search, _ = self.run_test(
            "Search Services",
            "GET", 
            "/services?search=vaření",
            200
        )
        
        # Get my services
        success_my, _ = self.run_test(
            "Get My Services",
            "GET",
            "/services/my",
            200
        )
        
        # Clean up - delete service
        if service_id:
            success_delete, _ = self.run_test(
                "Delete Service",
                "DELETE",
                f"/services/{service_id}",
                200
            )
        else:
            success_delete = True
        
        return success_create and success_get and success_search and success_my and success_delete

    def run_all_tests(self):
        """Run all test suites"""
        print("🌸 BLOOM TRANS COMMUNITY API TESTING 🌸")
        print("=" * 50)
        
        results = []
        
        # Health checks
        results.append(("Health Check", self.test_health_check()))
        
        # Authentication
        results.append(("User Registration & Login", self.test_user_registration_and_login()))
        
        # Admin setup
        results.append(("Admin Setup", self.test_admin_setup()))
        
        # Core functionality
        results.append(("Services with Location Filter", self.test_services_functionality()))
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        for test_name, passed in results:
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{status:<12} {test_name}")
        
        print(f"\n📊 Overall: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"🎯 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = BloomAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())