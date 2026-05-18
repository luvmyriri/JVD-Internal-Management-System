import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"
EMAIL = "vjlamsenlamsen28@gmail.com"
PASSWORD = "JVD@Admin2026!"

# Global store for the auth token
auth_token = None

def make_request(method, endpoint, data=None, use_auth=True):
    url = f"{BASE_URL}{endpoint}"
    
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    if use_auth and auth_token:
        headers['Authorization'] = f"Bearer {auth_token}"
        
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            response_body = response.read().decode('utf-8')
            return status_code, json.loads(response_body) if response_body else None
    except urllib.error.HTTPError as e:
        response_body = e.read().decode('utf-8')
        try:
            parsed_error = json.loads(response_body)
        except json.JSONDecodeError:
            parsed_error = response_body
        return e.code, parsed_error
    except Exception as e:
        return 0, str(e)

def print_result(name, passed, details=""):
    status = "[PASS]" if passed else "[FAIL]"
    print(f"{status} - {name}")
    if not passed and details:
        print(f"       Details: {details}")

def run_tests():
    global auth_token
    print("Starting Backend API Tests...\n")
    
    # Test 1: Authentication (Login)
    print("--- Authentication ---")
    status, response = make_request("POST", "/auth/login", data={"email": EMAIL, "password": PASSWORD}, use_auth=False)
    
    passed = status == 200 and response and 'data' in response and 'token' in response['data']
    print_result("Login with valid credentials", passed, f"Status: {status}, Response: {response}")
    
    if not passed:
        print("\nCannot proceed with remaining tests without authentication.")
        sys.exit(1)
        
    auth_token = response['data']['token']
    print(f"       Token acquired successfully.\n")
    
    # Test 2: Procurement Overview
    print("--- Procurement Module ---")
    status, response = make_request("GET", "/procurement/overview")
    passed = status == 200 and 'data' in response and 'stats' in response['data']
    print_result("Get Procurement Overview", passed, f"Status: {status}, Response summary: {response.get('message', 'No message')}")
    
    # Test 3: Suppliers List
    status, response = make_request("GET", "/suppliers")
    passed = status == 200 and ('data' in response or isinstance(response, list) or isinstance(response.get('data'), list))
    print_result("Get Suppliers List", passed, f"Status: {status}")
    
    # Test 4: Purchase Orders List
    status, response = make_request("GET", "/purchase-orders")
    passed = status == 200 and ('data' in response or isinstance(response, list) or isinstance(response.get('data'), list))
    print_result("Get Purchase Orders List", passed, f"Status: {status}")
    
    # Test 5: Inventory/Fleet Module
    print("\n--- Inventory/Fleet Module ---")
    status, response = make_request("GET", "/buses")
    passed = status == 200 and ('data' in response or isinstance(response, list) or isinstance(response.get('data'), list))
    print_result("Get Fleet (Buses) List", passed, f"Status: {status}")
    
    status, response = make_request("GET", "/inventory")
    passed = status == 200 and ('data' in response or isinstance(response, list) or isinstance(response.get('data'), list))
    print_result("Get Inventory List", passed, f"Status: {status}")
    
    # Test 6: Accreditations Module
    print("\n--- Accreditations Module ---")
    status, response = make_request("GET", "/accreditations")
    passed = status == 200 and ('data' in response or isinstance(response, list) or isinstance(response.get('data'), list))
    print_result("Get Accreditations List", passed, f"Status: {status}")

    # Test 7: Upload Document to an Accreditation
    # First get an accreditation id, or create one
    acc_list = response.get('data', [])
    if isinstance(acc_list, dict) and 'data' in acc_list:
        acc_list = acc_list['data']
        
    if passed and isinstance(acc_list, list) and len(acc_list) > 0:
        first_acc_id = acc_list[0]['id']
    else:
        # Create one if none exists
        status, response = make_request("POST", "/accreditations", data={
            "entity_type": "supplier",
            "entity_name": "Test Upload Supplier",
            "accreditation_type": "Testing",
            "contact_person": "Test User",
            "contact_email": "test@jvd.com"
        })
        first_acc_id = response.get('data', {}).get('id') if status == 201 else None

    if first_acc_id:
        import uuid
        boundary = uuid.uuid4().hex
        
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="test.pdf"\r\n'
            f"Content-Type: application/pdf\r\n\r\n"
            f"%PDF-1.4 fake pdf content\r\n"
            f"--{boundary}--\r\n"
        ).encode('utf-8')
        
        url = f"{BASE_URL}/accreditations/{first_acc_id}/documents/kyc"
        headers = {
            'Accept': 'application/json',
            'Authorization': f"Bearer {auth_token}",
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'Content-Length': str(len(body))
        }
        
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as upload_res:
                status_code = upload_res.getcode()
                response_body = upload_res.read().decode('utf-8')
                upload_json = json.loads(response_body) if response_body else None
                passed = status_code == 200 and upload_json and 'url' in upload_json
                print_result("Upload Document (KYC)", passed, f"Status: {status_code}, Response: {upload_json}")
        except Exception as e:
            print_result("Upload Document (KYC)", False, f"Exception: {e}")
    else:
        print_result("Upload Document (KYC)", False, "Could not find or create an accreditation to test upload.")

    # Test 8: Auth Profile
    print("\n--- User Profile ---")
    status, response = make_request("GET", "/auth/me")
    passed = status == 200 and 'data' in response and response['data'].get('email') == EMAIL
    print_result("Get Authenticated User Profile", passed, f"Status: {status}")
    
    print("\nTests completed.")

if __name__ == "__main__":
    run_tests()
