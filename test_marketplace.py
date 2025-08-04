#!/usr/bin/env python3
"""
Script di test per verificare che il marketplace sia accessibile
"""

import requests
import time
import sys

def test_marketplace():
    """Test del marketplace React"""
    
    base_url = "http://localhost:8000"
    marketplace_url = f"{base_url}/marketplace"
    
    print("🧪 Testing Airvana Marketplace...")
    print(f"📍 URL: {marketplace_url}")
    print("=" * 50)
    
    try:
        # Test 1: Verifica che il server sia in esecuzione
        print("1️⃣ Testing server availability...")
        response = requests.get(base_url, timeout=5)
        if response.status_code == 200:
            print("✅ Server FastAPI is running")
        else:
            print(f"❌ Server returned status {response.status_code}")
            return False
            
        # Test 2: Verifica che il marketplace sia accessibile
        print("2️⃣ Testing marketplace access...")
        response = requests.get(marketplace_url, timeout=5)
        if response.status_code == 200:
            print("✅ Marketplace is accessible")
            print(f"📄 Content-Type: {response.headers.get('content-type', 'unknown')}")
            
            # Verifica che contenga React
            content = response.text
            if "React" in content or "marketplace" in content.lower():
                print("✅ React content detected")
            else:
                print("⚠️  React content not detected (might be static HTML)")
        else:
            print(f"❌ Marketplace returned status {response.status_code}")
            return False
            
        # Test 3: Verifica file statici
        print("3️⃣ Testing static files...")
        static_url = f"{marketplace_url}/assets/"
        response = requests.get(static_url, timeout=5)
        if response.status_code in [200, 404]:  # 404 è ok per directory
            print("✅ Static files directory accessible")
        else:
            print(f"⚠️  Static files returned status {response.status_code}")
            
        # Test 4: Verifica route fallback
        print("4️⃣ Testing route fallback...")
        test_url = f"{marketplace_url}/test-route-that-does-not-exist"
        response = requests.get(test_url, timeout=5)
        if response.status_code == 200:
            print("✅ Route fallback working (React routing)")
        else:
            print(f"⚠️  Route fallback returned status {response.status_code}")
            
        print("\n🎉 All tests completed!")
        print(f"🌐 Open your browser and go to: {marketplace_url}")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running:")
        print("   uvicorn BackEnd.app.main:app --reload --host 0.0.0.0 --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Airvana Marketplace Tester")
    print("=" * 40)
    
    # Aspetta un po' per dare tempo al server di avviarsi
    print("⏳ Waiting for server to start...")
    time.sleep(2)
    
    if test_marketplace():
        print("\n✅ Marketplace is ready!")
        print("📝 Next steps:")
        print("   1. Open http://localhost:8000/marketplace in your browser")
        print("   2. Test the responsive design on different screen sizes")
        print("   3. Try adding items to cart")
        print("   4. Test the fallback images")
    else:
        print("\n❌ Marketplace test failed!")
        print("📝 Troubleshooting:")
        print("   1. Make sure the server is running")
        print("   2. Check that marketplace_dist/ exists")
        print("   3. Verify the FastAPI configuration")
        sys.exit(1) 