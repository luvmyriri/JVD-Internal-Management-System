import urllib.request
import urllib.parse
import json
import sys
import uuid

BASE_URL = "http://127.0.0.1:8000/api"
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

def run_pos_features_test():
    global auth_token
    print("Starting POS resource allocation & joiner specifications integration test...\n")
    
    # 1. Login
    print("--- Step 1: Login ---")
    status, response = make_request("POST", "/auth/login", data={"email": EMAIL, "password": PASSWORD}, use_auth=False)
    if status != 200:
        print(f"[FAIL] Login failed with status {status}: {response}")
        sys.exit(1)
    auth_token = response['data']['token']
    print("[PASS] Login successful\n")

    # 2. Get Service
    print("--- Step 2: Fetch Services ---")
    status, response = make_request("GET", "/billing/services")
    if status != 200 or not response.get('data'):
        print(f"[FAIL] Fetch services failed: {response}")
        sys.exit(1)
    service = response['data'][0]
    print(f"[PASS] Retrieved service: {service['name']} (ID: {service['id']})\n")

    # 3. Fetch Bus
    print("--- Step 3: Fetch Available Buses ---")
    status, response = make_request("GET", "/buses")
    if status != 200 or not response.get('data'):
        print(f"[FAIL] Fetch buses failed: {response}")
        sys.exit(1)
    bus = response['data'][0]
    print(f"[PASS] Retrieved bus: {bus['plate_number']} - {bus['model']} (ID: {bus['id']})\n")

    # 4. Fetch Driver
    print("--- Step 4: Fetch Active Drivers ---")
    status, response = make_request("GET", "/chat/users")
    if status != 200 or not response.get('data'):
        print(f"[FAIL] Fetch users failed: {response}")
        sys.exit(1)
    drivers = [u for u in response['data'] if u.get('role') == 'driver']
    if not drivers:
        print("[WARNING] No drivers found in DB, using driver_id = null")
        driver_id = None
        driver_name = "N/A"
    else:
        driver = drivers[0]
        driver_id = driver['id']
        driver_name = f"{driver['first_name']} {driver['last_name']}"
    print(f"[PASS] Selected Driver: {driver_name} (ID: {driver_id})\n")

    # 5. Create POS Invoice with resource allocations & joiners details
    print("--- Step 5: Complete POS Transaction ---")
    checkout_payload = {
        "customer_name": "Integration Test Customer",
        "customer_email": "vjlamsenlamsen28@gmail.com",
        "customer_contact": "09171234567",
        "payment_method": "Cash",
        "payment_type": "full",
        "amount_received": 15000,
        "change": 0,
        "travel_date": "2026-06-20",
        "pickup_location": "MoA Globe, Pasay City",
        "tour_code": "JVD-TEST-2026",
        "pax_count": 45,
        "items": [
            {
                "service_id": service['id'],
                "quantity": 1,
                "unit_price": 10000.00
            }
        ],
        "bus_id": bus['id'],
        "driver_id": driver_id,
        "seat_map": ["A1", "A2", "A3", "A4"]
    }

    status, response = make_request("POST", "/billing", data=checkout_payload)
    if status != 201:
        print(f"[FAIL] POS Checkout failed with status {status}: {response}")
        sys.exit(1)
    
    invoice = response['data']
    print("[PASS] POS Transaction successful!")
    print(f"       Invoice Number: {invoice.get('invoice_number')}")
    print(f"       Grand Total:    PHP {invoice.get('total_amount')}")
    print(f"       Status:         {invoice.get('status')}")
    print(f"       Travel Date:    {invoice.get('travel_date')}")
    print(f"       Pickup Loc:     {invoice.get('pickup_location')}")
    print(f"       Tour Code:      {invoice.get('tour_code')}")
    print(f"       Pax Count:      {invoice.get('pax_count')}")
    print(f"       Bus ID:         {invoice.get('bus_id')}")
    print(f"       Driver ID:      {invoice.get('driver_id')}")
    print(f"       Seat Map:       {invoice.get('seat_map')}")
    
    # 6. Verify assertions
    assert invoice.get('travel_date') == "2026-06-20", "Travel date mismatch!"
    assert invoice.get('pickup_location') == "MoA Globe, Pasay City", "Pickup location mismatch!"
    assert invoice.get('tour_code') == "JVD-TEST-2026", "Tour code mismatch!"
    assert invoice.get('pax_count') == 45, "Pax count mismatch!"
    assert invoice.get('bus_id') == bus['id'], "Bus ID mismatch!"
    assert invoice.get('driver_id') == driver_id, "Driver ID mismatch!"
    assert invoice.get('seat_map') == ["A1", "A2", "A3", "A4"], "Seat map mismatch!"
    
    print("\nAll Assertions Passed successfully. Testing completed.")

if __name__ == "__main__":
    run_pos_features_test()
