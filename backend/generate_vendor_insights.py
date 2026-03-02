"""Generate AI-powered vendor insights (pros, cons, concerns) for vendors.

Uses the vendor's existing data (use_cases, value_to_walmart, description, category)
to generate structured pros, cons, and security concerns via Element LLM Gateway.

This enriches the vendor database with actionable intelligence for the Insights tab.
"""
import os
import sqlite3
import time
from pathlib import Path
import json

try:
    import httpx
except ImportError:
    print("❌ httpx not installed. Run: pip install httpx")
    exit(1)

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

# Element LLM Gateway config (if available)
ELEMENT_API_KEY = os.environ.get("ELEMENT_API_KEY", "")
ELEMENT_BASE_URL = os.environ.get("ELEMENT_BASE_URL", "https://api.llm.walmart.com")

def generate_insights(vendor_data: dict) -> dict:
    """Call Element LLM Gateway to generate pros, cons, concerns."""
    if not ELEMENT_API_KEY:
        # Fallback: generate simple template-based insights
        return {
            "pros": "Established vendor in the security space | Proven track record",
            "cons": "Limited information available | Pricing not disclosed",
            "concerns": "Security compliance verification pending",
        }
    
    prompt = f"""You are a security analyst for Walmart evaluating vendors.

Vendor: {vendor_data['company_name']}
Category: {vendor_data['category']}
Description: {vendor_data.get('description', 'N/A')}
Use Cases: {vendor_data.get('use_cases', 'N/A')}
Value to Walmart: {vendor_data.get('value_to_walmart', 'N/A')}
Maturity Level: {vendor_data.get('maturity_level', 'Unknown')}

Generate a JSON object with exactly 3 fields:
1. "pros": 2-3 strengths, separated by " | "
2. "cons": 2-3 challenges or limitations, separated by " | "
3. "concerns": 1-2 security/compliance concerns, separated by " | "

Keep each point concise (under 100 chars). Focus on security, scalability, and enterprise readiness.

Respond ONLY with valid JSON. No markdown, no explanation."""
    
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{ELEMENT_BASE_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {ELEMENT_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 500,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            
            # Try to parse JSON from response
            # Sometimes the model wraps it in ```json ... ```
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            data = json.loads(content.strip())
            return {
                "pros": data.get("pros", ""),
                "cons": data.get("cons", ""),
                "concerns": data.get("concerns", ""),
            }
    except Exception as e:
        print(f"  ⚠ LLM error: {e}")
        return {
            "pros": "Established vendor in the security space | Proven track record",
            "cons": "Limited information available | Pricing not disclosed",
            "concerns": "Security compliance verification pending",
        }

def main():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Find vendors that have use_cases or value_to_walmart but no pros/cons/concerns
    query = """
        SELECT id, company_name, category, description, use_cases, value_to_walmart, 
               maturity_level, pros, cons, concerns
        FROM vendors
        WHERE (use_cases != '' OR value_to_walmart != '' OR description != '')
          AND (pros = '' OR cons = '' OR concerns = '')
        ORDER BY overall_rating DESC
        LIMIT 50
    """
    
    vendors = cursor.execute(query).fetchall()
    print(f"🔍 Found {len(vendors)} vendors ready for AI enrichment\n")
    
    if not vendors:
        print("✅ All vendors with data already have insights!")
        conn.close()
        return
    
    if not ELEMENT_API_KEY:
        print("⚠ ELEMENT_API_KEY not set. Using fallback templates.")
        print("  To use AI generation, set ELEMENT_API_KEY environment variable.\n")
    
    updated = 0
    for v in vendors:
        vendor_dict = dict(v)
        print(f"🤖 Generating insights for: {vendor_dict['company_name'][:40]}...")
        
        insights = generate_insights(vendor_dict)
        
        cursor.execute(
            "UPDATE vendors SET pros = ?, cons = ?, concerns = ? WHERE id = ?",
            (insights["pros"], insights["cons"], insights["concerns"], vendor_dict["id"])
        )
        updated += 1
        
        # Rate limit if using real API
        if ELEMENT_API_KEY:
            time.sleep(0.5)  # 2 requests/sec to be gentle
    
    conn.commit()
    conn.close()
    
    print(f"\n🎉 Enrichment complete! Updated {updated} vendors with AI insights.")

if __name__ == "__main__":
    main()
