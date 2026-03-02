"""Comprehensive Vendor Card Population Using Multi-Source Intelligence.

Data Sources:
  1. VAR Reports (23 with scores)
  2. Vendor Highlights (1,943 assessments)
  3. Tracker Data (613 records)
  4. Category Intelligence (logical inference)
  5. Risk-Based Analysis

Logical Reasoning Rules:
  - High scores (>4.0) → Mature, strong pros
  - Medium scores (3.0-4.0) → Growth stage, balanced
  - Low scores (<3.0) → Early stage, remediation needed
  - Category determines use cases
  - Risk level determines concerns
  - Assessment language determines pros/cons
"""
import sqlite3
import re
from pathlib import Path
from collections import defaultdict

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

# Enhanced category to use cases mapping
CATEGORY_USE_CASES = {
    "Counter-UAS (C-UAS)": "Drone detection and interdiction | Airspace security monitoring | Perimeter protection against aerial threats | Safe Skies program integration",
    "Video Management & Recording (VMS/NVR)": "Video surveillance management | Incident recording and playback | Evidence management | Camera integration | Multi-site monitoring",
    "Access Control": "Physical access management | Badge and credential systems | Entry point security | Visitor management | Time-based access control",
    "Intrusion Detection": "Perimeter security monitoring | Alarm management systems | Motion detection | Threat detection and alerts | Integration with response teams",
    "Biometrics": "Identity verification | Facial recognition | Fingerprint authentication | Access authentication | Safe Skies biometric screening",
    "Analytics & AI": "Video analytics | Behavior detection | Predictive security | Crowd analytics | Anomaly detection | Pattern recognition",
    "Robotics & Autonomous Systems": "Autonomous security patrols | Robotic surveillance | Automated threat response | Perimeter monitoring robots",
    "Cloud Security": "Data protection | Secure cloud storage | Encrypted communications | Cloud-based security management",
    "Edge AI/IoT": "Smart sensors | Edge computing | Real-time analytics | IoT device management | Distributed intelligence",
    "Cybersecurity": "Network security | Threat intelligence | Incident response | Vulnerability management | Security operations center (SOC) tools",
    "Physical Security": "Guard services | Security operations | Emergency response | Physical asset protection",
    "Gunshot Detection": "Acoustic gunshot detection | Active shooter response | Emergency alerts | Law enforcement integration",
    "License Plate Recognition (LPR/ALPR)": "Vehicle tracking | Parking management | Suspect vehicle alerts | Cargo area security | Traffic flow analysis",
}

# Category to value propositions
CATEGORY_VALUE = {
    "Counter-UAS (C-UAS)": "Enhanced airspace security | Reduced drone-related incidents | Compliance with FAA regulations | Protection of critical assets",
    "Video Management & Recording (VMS/NVR)": "Centralized video management | Reduced investigation time | Improved incident resolution | Scalable surveillance infrastructure",
    "Access Control": "Reduced unauthorized access | Improved compliance tracking | Enhanced employee safety | Streamlined visitor management",
    "Biometrics": "Stronger authentication | Reduced credential fraud | Improved access security | Touchless verification",
    "Analytics & AI": "Proactive threat detection | Reduced false alarms | Automated incident detection | Enhanced situational awareness",
    "Gunshot Detection": "Faster emergency response | Improved employee safety | Reduced active shooter risk | Enhanced security posture",
}

def extract_intelligent_description(company_name: str, category: str, assessments: list) -> str:
    """Generate intelligent description from assessments and category."""
    
    # Start with category context
    if "Counter-UAS" in category:
        context = "provides advanced counter-drone security solutions"
    elif "VMS" in category or "NVR" in category:
        context = "offers enterprise video management and recording systems"
    elif "Biometrics" in category:
        context = "specializes in biometric identity verification technology"
    elif "AI" in category or "Analytics" in category:
        context = "delivers AI-powered security analytics and intelligence"
    elif "Access Control" in category:
        context = "provides comprehensive physical access control solutions"
    elif "Robotics" in category:
        context = "develops autonomous security robotics and patrol systems"
    elif "Gunshot Detection" in category:
        context = "offers acoustic gunshot detection and active shooter response"
    elif "LPR" in category or "ALPR" in category:
        context = "specializes in license plate recognition and vehicle tracking"
    elif "Cybersecurity" in category:
        context = "delivers cybersecurity and threat protection solutions"
    else:
        context = f"operates in the {category} sector"
    
    # Add assessment insights if available
    if assessments:
        # Get most recent assessment
        recent = assessments[0]
        initial = recent.get("initial_assessment", "")
        decision = recent.get("pre_assessment_decision", "")
        
        if "pass" in decision.lower():
            status = "and has successfully passed Walmart's security evaluation"
        elif "advance" in decision.lower():
            status = "and is recommended for Walmart deployment"
        elif "reject" in decision.lower():
            status = "and is currently not approved for Walmart deployment"
        elif initial and len(initial) > 50:
            status = f"offering {initial[:100].lower()}"
        else:
            status = "and is under active Walmart security assessment"
    else:
        status = "and is being evaluated for Walmart deployment"
    
    return f"{company_name} {context} {status}. The vendor provides security technology solutions designed to enhance physical and operational security across retail environments."

def extract_smart_pros(company_name: str, category: str, risk_level: str, 
                       score: float | None, decision: str, assessments: list) -> str:
    """Extract pros using multi-source intelligence."""
    pros = set()
    
    # Score-based pros (highest priority)
    if score:
        if score >= 4.5:
            pros.add("Outstanding security assessment score")
            pros.add("Exceeds Walmart security standards")
        elif score >= 4.0:
            pros.add("Excellent overall security posture")
            pros.add("Strong compliance framework")
        elif score >= 3.5:
            pros.add("Good security assessment results")
            pros.add("Solid foundation for deployment")
        elif score >= 3.0:
            pros.add("Acceptable security baseline")
    
    # Decision-based pros
    if "advance" in decision.lower() or "pass" in decision.lower():
        pros.add("Approved for Walmart deployment")
    elif "research" in decision.lower():
        pros.add("Under consideration for future deployment")
    
    # Assessment-based pros
    for assessment in assessments[:3]:  # Check top 3 assessments
        initial = (assessment.get("initial_assessment") or "").lower()
        technical = (assessment.get("technical_assessment") or "").lower()
        
        if "mature" in initial or "established" in initial:
            pros.add("Mature and proven technology platform")
        if "enterprise" in initial or "scalable" in initial:
            pros.add("Enterprise-grade scalability")
        if "certified" in initial or "compliant" in initial:
            pros.add("Security certifications and compliance")
        if "integration" in technical or "api" in technical:
            pros.add("Strong integration capabilities")
        if "support" in technical:
            pros.add("Comprehensive vendor support")
    
    # Category-based pros
    if "Counter-UAS" in category:
        pros.add("Specialized counter-drone expertise")
    elif "Biometrics" in category:
        pros.add("Advanced biometric technology")
    elif "AI" in category or "Analytics" in category:
        pros.add("AI-powered analytics capabilities")
    
    # Risk-based pros (Low risk is a positive)
    if risk_level == "Low":
        pros.add("Low risk classification")
    
    # Convert to list and limit to top 3
    pros_list = list(pros)[:3]
    
    if not pros_list:
        return "Evaluated by Walmart security team | Under active assessment | Technology under review"
    
    return " | ".join(pros_list)

def extract_smart_cons(company_name: str, risk_level: str, score: float | None, 
                       decision: str, assessments: list) -> str:
    """Extract cons using logical reasoning."""
    cons = set()
    
    # Score-based cons
    if score:
        if score < 2.0:
            cons.add("Below minimum security threshold")
            cons.add("Significant security gaps identified")
        elif score < 2.5:
            cons.add("Requires substantial remediation")
            cons.add("Multiple security concerns noted")
        elif score < 3.0:
            cons.add("Security improvements required")
        elif score < 3.5:
            cons.add("Minor enhancements recommended")
    
    # Decision-based cons
    if "reject" in decision.lower():
        cons.add("Not approved for deployment")
    elif "defer" in decision.lower():
        cons.add("Requires additional evaluation")
    elif "research" in decision.lower():
        cons.add("Further research needed")
    
    # Assessment-based cons
    for assessment in assessments[:3]:
        notes = (assessment.get("notes") or "").lower()
        initial = (assessment.get("initial_assessment") or "").lower()
        
        if "cost" in notes or "expensive" in notes or "pricing" in initial:
            cons.add("Pricing model needs evaluation")
        if "limited" in initial:
            cons.add("Limited documentation or track record")
        if "complex" in notes:
            cons.add("Complex integration requirements")
        if "new" in initial or "emerging" in initial:
            cons.add("Emerging vendor with limited history")
    
    # Risk-based cons
    if risk_level in ("Critical", "High"):
        cons.add(f"{risk_level} risk requires enhanced oversight")
    
    # Convert to list and limit to top 3
    cons_list = list(cons)[:3]
    
    if not cons_list:
        return "Full security validation in progress | Cost-benefit analysis pending | Technical review underway"
    
    return " | ".join(cons_list)

def extract_smart_concerns(risk_level: str, score: float | None, 
                            decision: str, category: str) -> str:
    """Extract security concerns using risk-based logic."""
    concerns = []
    
    # Risk-level concerns (highest priority)
    if risk_level == "Critical":
        concerns.append("Critical risk classification requires enhanced security scrutiny")
    elif risk_level == "High":
        concerns.append("High risk classification requires thorough vetting")
    
    # Score-based concerns
    if score:
        if score < 2.0:
            concerns.append("Multiple security deficiencies must be remediated")
        elif score < 2.5:
            concerns.append("Security gaps require remediation before deployment")
        elif score < 3.0:
            concerns.append("Security controls need strengthening")
    
    # Decision-based concerns
    if "reject" in decision.lower():
        concerns.append("Security posture does not meet Walmart standards")
    
    # Category-specific concerns
    if "Cloud" in category:
        concerns.append("Data privacy and cloud security validation required")
    elif "Biometrics" in category:
        concerns.append("Biometric data privacy compliance verification needed")
    elif "AI" in category:
        concerns.append("AI ethics and algorithmic transparency review required")
    
    # Default concern if no specific ones
    if not concerns:
        concerns.append("Standard vendor security validation and compliance review in progress")
    
    return " | ".join(concerns[:2])

def score_to_maturity(score: float | None, assessments: list) -> str:
    """Determine maturity level from score and assessments."""
    # Check assessments first
    for assessment in assessments:
        maturity = assessment.get("maturity_level")
        if maturity:
            return maturity
    
    # Fall back to score-based inference
    if score:
        if score >= 4.0:
            return "Mature"
        elif score >= 3.5:
            return "Market-Ready"
        elif score >= 3.0:
            return "Growth Stage"
        else:
            return "Early Stage"
    
    return "Under Evaluation"

def main():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("🧠 COMPREHENSIVE VENDOR CARD POPULATION - MULTI-SOURCE INTELLIGENCE")
    print("="*80)
    print("\n📁 Data Sources:")
    print("  1️⃣  VAR Reports with Scores")
    print("  2️⃣  Vendor Assessments (Initial + Technical)")
    print("  3️⃣  Tracker Data (Use Cases + Value)")
    print("  4️⃣  Category Intelligence (Logical Inference)")
    print("  5️⃣  Risk-Based Analysis\n")
    
    # Get all vendors
    all_vendors = cursor.execute(
        "SELECT id, company_name, category, risk_level FROM vendors "
        "ORDER BY company_name"
    ).fetchall()
    
    print(f"📊 Processing {len(all_vendors)} vendors...\n")
    
    stats = defaultdict(int)
    
    for idx, vendor in enumerate(all_vendors, 1):
        if idx % 250 == 0:
            print(f"  Progress: {idx}/{len(all_vendors)} vendors processed...")
        
        vendor_id = vendor["id"]
        company_name = vendor["company_name"]
        category = vendor["category"] or "General Security"
        risk_level = vendor["risk_level"] or "Medium"
        
        # Get VAR data if available
        var_data = cursor.execute(
            "SELECT overall_score, decision_band FROM var_reports "
            "WHERE vendor_id = ? AND overall_score IS NOT NULL "
            "ORDER BY report_date DESC LIMIT 1",
            (vendor_id,)
        ).fetchone()
        
        score = var_data["overall_score"] if var_data else None
        decision = var_data["decision_band"] if var_data else ""
        
        # Get assessment data
        assessments = cursor.execute(
            "SELECT initial_assessment, technical_assessment, pre_assessment_decision, "
            "notes, maturity_level FROM vendor_highlights "
            "WHERE vendor_id = ? ORDER BY assessment_date DESC LIMIT 5",
            (vendor_id,)
        ).fetchall()
        
        assessments_list = [dict(a) for a in assessments]
        
        # Get current vendor data
        current = cursor.execute(
            "SELECT description, vendor_highlight, pros, cons, concerns, "
            "maturity_level, use_cases, value_to_walmart "
            "FROM vendors WHERE id = ?",
            (vendor_id,)
        ).fetchone()
        
        updates = {}
        
        # DESCRIPTION: Use intelligent extraction
        if not current["description"] or len(current["description"]) < 100:
            desc = extract_intelligent_description(company_name, category, assessments_list)
            updates["description"] = desc
            stats["descriptions"] += 1
        
        # HIGHLIGHT: Create from score/decision or assessment
        if not current["vendor_highlight"] or "Primary use case" in current["vendor_highlight"]:
            if score:
                highlight = f"Walmart VAR assessed with score {score:.2f} - {decision or 'Under Review'}"
            elif assessments_list and assessments_list[0].get("pre_assessment_decision"):
                decision_text = assessments_list[0]["pre_assessment_decision"]
                highlight = f"Security assessment: {decision_text}"
            else:
                highlight = f"{category} vendor under active Walmart security evaluation"
            updates["vendor_highlight"] = highlight
            stats["highlights"] += 1
        
        # PROS: Multi-source intelligent extraction
        if not current["pros"] or "Evaluated by Walmart" in current["pros"] or len(current["pros"]) < 30:
            pros = extract_smart_pros(company_name, category, risk_level, score, decision, assessments_list)
            updates["pros"] = pros
            stats["pros"] += 1
        
        # CONS: Logical reasoning
        if not current["cons"] or "Full technical" in current["cons"] or len(current["cons"]) < 30:
            cons = extract_smart_cons(company_name, risk_level, score, decision, assessments_list)
            updates["cons"] = cons
            stats["cons"] += 1
        
        # CONCERNS: Risk-based
        if not current["concerns"] or "Standard vendor" in current["concerns"]:
            concerns = extract_smart_concerns(risk_level, score, decision, category)
            updates["concerns"] = concerns
            stats["concerns"] += 1
        
        # MATURITY: From score or assessments
        if not current["maturity_level"]:
            maturity = score_to_maturity(score, assessments_list)
            updates["maturity_level"] = maturity
            stats["maturity"] += 1
        
        # USE CASES: From category if missing
        if not current["use_cases"] and category in CATEGORY_USE_CASES:
            use_cases = CATEGORY_USE_CASES[category]
            updates["use_cases"] = use_cases
            stats["use_cases"] += 1
        
        # VALUE: From category if missing
        if not current["value_to_walmart"] and category in CATEGORY_VALUE:
            value = CATEGORY_VALUE[category]
            updates["value_to_walmart"] = value
            stats["value"] += 1
        
        # Apply updates
        if updates:
            set_clauses = [f"{k} = ?" for k in updates.keys()]
            values = list(updates.values()) + [vendor_id]
            cursor.execute(
                f"UPDATE vendors SET {', '.join(set_clauses)} WHERE id = ?",
                values
            )
    
    conn.commit()
    conn.close()
    
    print("\n" + "="*80)
    print("🎉 COMPREHENSIVE POPULATION COMPLETE!")
    print("="*80)
    print("\n📈 Enhancement Statistics:\n")
    print(f"  📝 Descriptions:      {stats['descriptions']:,}")
    print(f"  ⭐ Highlights:        {stats['highlights']:,}")
    print(f"  💪 Pros:              {stats['pros']:,}")
    print(f"  ⚠️  Cons:             {stats['cons']:,}")
    print(f"  🔒 Concerns:          {stats['concerns']:,}")
    print(f"  📊 Maturity Levels:   {stats['maturity']:,}")
    print(f"  📋 Use Cases:         {stats['use_cases']:,}")
    print(f"  💰 Value Propositions: {stats['value']:,}")
    print(f"\n🎯 Total vendors processed: {len(all_vendors):,}\n")

if __name__ == "__main__":
    main()
