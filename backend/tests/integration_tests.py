import urllib.request
import urllib.parse
import json
import sys
import uuid
import time

BASE_URL = "http://127.0.0.1:8001/api"
EMAIL = "vjlamsenlamsen28@gmail.com"
PASSWORD = "JVD@Admin2026!"

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

def print_result(name, passed, details="", response=None):
    status = "[PASS]" if passed else "[FAIL]"
    print(f"{status} - {name}")
    if not passed:
        if details:
            print(f"       Details: {details}")
        if response:
            print(f"       Response: {json.dumps(response, indent=2)}")

def run_integration_tests():
    global auth_token
    print("Starting In-Depth Integration & Process Flow Tests...\n")
    
    # 1. Login
    print("--- 1. Authentication ---")
    status, response = make_request("POST", "/auth/login", data={"email": EMAIL, "password": PASSWORD}, use_auth=False)
    passed = status == 200 and response and 'data' in response and 'token' in response['data']
    print_result("Login with valid credentials", passed)
    if not passed:
        sys.exit(1)
    auth_token = response['data']['token']

    # 2. Supplier & Accreditation Flow
    print("\n--- 2. Supplier & Accreditation Interconnection ---")
    
    # Create Supplier
    unique_suffix = str(uuid.uuid4())[:8]
    supplier_data = {
        "company_name": f"Integration Supplier {unique_suffix}",
        "contact_person": "Jane Doe",
        "email": f"jane_{unique_suffix}@example.com",
        "phone": "09123456789"
    }
    status, response = make_request("POST", "/suppliers", data=supplier_data)
    supplier_passed = status == 201
    print_result("Create Supplier", supplier_passed, f"Status: {status}")
    if not supplier_passed:
        print("Cannot continue without supplier.")
        sys.exit(1)
        
    supplier_id = response['data']['id']
    
    # Verify/Accredit Supplier (Cross & Counter check)
    status, response = make_request("POST", f"/suppliers/{supplier_id}/verify", data={})
    acc_passed = status == 200
    print_result("Counter Check & Accredit Supplier", acc_passed, f"Status: {status}")
    
    # 3. Inventory flow
    print("\n--- 3. Inventory Data Consistency ---")
    # Add an inventory item for this supplier
    item_data = {
        "item_name": f"Integration Engine Oil {unique_suffix}",
        "category": "consumable",
        "unit": "Liters",
        "quantity": 100,
        "reorder_level": 20,
        "unit_cost": 250.00
    }
    status, response = make_request("POST", "/inventory", data=item_data)
    item_passed = status == 201
    print_result("Create Inventory Item", item_passed, f"Status: {status}")
    
    if not item_passed:
        print("Cannot continue without inventory item.")
        sys.exit(1)
        
    item_id = response['data']['id']
    
    # Verify Inventory retrieval
    status, response = make_request("GET", f"/inventory/{item_id}")
    verify_item_passed = status == 200 and response['data']['item_name'] == item_data['item_name']
    print_result("Verify Inventory Data Consistency", verify_item_passed, response=response)
    
    # 4. Purchase Order Flow
    print("\n--- 4. Purchase Order Lifecycle ---")
    po_data = {
        "supplier_id": supplier_id,
        "items": [
            {
                "item_name": item_data["item_name"],
                "description": "Engine Oil for trucks",
                "quantity": 20,
                "unit_price": 250.00
            }
        ]
    }
    status, response = make_request("POST", "/purchase-orders", data=po_data)
    po_passed = status == 201
    print_result("Create Purchase Order with Items", po_passed, f"Status: {status}, Resp: {response}")
    
    if not po_passed:
        sys.exit(1)
        
    po_id = response['data']['id']
    
    # Update PO Status to pending_accounting_review via submit
    status, response = make_request("POST", f"/purchase-orders/{po_id}/submit", data={})
    po_status_passed = status == 200 and response.get('data', {}).get('status') == "pending_accounting_review"
    print_result("Update PO Status to 'pending_accounting_review' (submit)", po_status_passed, f"Status: {status}", response=response)

    # Update PO Status to pending_ceo_approval via verify
    status, response = make_request("POST", f"/purchase-orders/{po_id}/verify", data={"approved": True})
    po_verify_passed = status == 200 and response.get('data', {}).get('status') == "pending_ceo_approval"
    print_result("Update PO Status to 'pending_ceo_approval' (verify)", po_verify_passed, f"Status: {status}", response=response)

    # Final Approve PO
    status, response = make_request("POST", f"/purchase-orders/{po_id}/approve", data={"approved": True})
    po_approve_passed = status == 200 and response.get('data', {}).get('status') == "approved"
    print_result("Update PO Status to 'approved' (approve)", po_approve_passed, f"Status: {status}", response=response)

    # 5. Check Dashboard/Overview aggregations
    print("\n--- 5. Aggregation & Dashboard Consistency ---")
    status, response = make_request("GET", "/procurement/overview")
    agg_passed = status == 200 and 'stats' in response['data']
    print_result("Fetch Procurement Dashboard Aggregations", agg_passed)
    
    print("\nIntegration Tests Completed Successfully.")

if __name__ == "__main__":
    run_integration_tests()
