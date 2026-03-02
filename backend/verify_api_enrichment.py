"""Verify API is serving enriched vendor data."""
import httpx

print("\n🔍 Testing SENTRY API with enriched vendor data...\n")

try:
    # Test a vendor we know has enriched data
    response = httpx.get("http://localhost:8082/api/vendors?search=Verkada&page_size=1")
    data = response.json()
    
    if data["vendors"]:
        vendor = data["vendors"][0]
        
        print("="*80)
        print(f"🏭 API Response for: {vendor['company_name']}")
        print("="*80)
        
        fields_check = [
            ("vendor_highlight", "⭐ Highlight"),
            ("pros", "💪 Pros"),
            ("cons", "⚠️  Cons"),
            ("concerns", "🔒 Concerns"),
            ("maturity_level", "📊 Maturity"),
            ("use_cases", "📋 Use Cases"),
            ("value_to_walmart", "💰 Value"),
        ]
        
        all_present = True
        for field, label in fields_check:
            value = vendor.get(field, "")
            status = "✅" if value else "❌"
            print(f"\n{status} {label}: {'Present' if value else 'Missing'}")
            if value and field in ["vendor_highlight", "pros"]:
                print(f"   Sample: {value[:100]}...")
            if not value and field in ["vendor_highlight", "pros", "cons", "concerns"]:
                all_present = False
        
        print("\n" + "="*80)
        
        if all_present:
            print("✅ SUCCESS! API is serving fully enriched vendor data!")
        else:
            print("⚠️  WARNING: Some fields are missing. Backend may need restart.")
    else:
        print("❌ No vendors found")
        
except Exception as e:
    print(f"❌ Error: {e}")
    print("\n🔧 Make sure backend is running on port 8082")

print()
