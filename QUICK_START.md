# 🚀 SENTRY Phase 2.5 - Quick Start Guide

## ✅ What Was Done

### 📈 Data Imported
- ✅ **422 vendors** updated with 202601/202602 tracker data
- ✅ **50 vendors** enriched with AI-generated pros/cons/concerns
- ✅ **7 new database fields** added to vendors table

### 🎨 UI Enhancements
- ✅ **New "Insights" tab** in vendor detail modal
- ✅ **Category Distribution panel** showing % breakdown in stats
- ✅ **Enhanced KPIs** with 4-column layout

### 🛠️ Backend Updates
- ✅ API serving all new vendor fields
- ✅ TypeScript types updated
- ✅ Build successful (4.02s)

---

## 🚀 How to Run SENTRY

### Start Backend (Terminal 1)
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main\backend
python -m uvicorn main:app --port 8082 --reload
```

### Start Frontend (Terminal 2)
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main
npm run dev
```

### Access SENTRY
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8082/docs

---

## 🔍 How to View New Features

### 1. Vendor Insights Tab
1. Open SENTRY in browser
2. Click any vendor card
3. Click **"Insights"** tab (2nd tab)
4. See:
   - 🌟 Key Highlight banner
   - 📋 Use Cases (left column)
   - ✅ Strengths (Pros)
   - ⚠️ Challenges (Cons)
   - 🔒 Security Concerns

### 2. Category Distribution KPI
1. Look at the **Directory Intelligence** panel at top
2. Find the **4th column** (new!)
3. See % breakdown of top 8 tech categories

---

## 🤖 How to Enrich More Vendors

### Run AI Insights Generator
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main\backend

# With Element LLM Gateway (recommended)
set ELEMENT_API_KEY=your_key_here
python generate_vendor_insights.py

# Without API key (uses templates)
python generate_vendor_insights.py
```

**What it does:**
- Finds vendors with use_cases but no pros/cons/concerns
- Generates structured insights via AI
- Updates 50 vendors at a time (configurable)

### Import New Tracker Data
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main\backend
python import_202601_202602_data.py
```

**To add new months:**
1. Drop new CSVs into:
   ```
   C:\Users\j0w16ja\OneDrive - Walmart Inc\Emerging Technology Security - Utilities\SpreadSheets\ET Trackers\Simplified Trackers\
   ```
2. Update `FILES` list in `import_202601_202602_data.py`
3. Run script

---

## 📊 New Database Fields

| Field | Example Value | Displayed Where |
|-------|---------------|------------------|
| `vendor_highlight` | "Primary use case: Facial auth..." | Insights tab - top banner |
| `use_cases` | "Access control \| Safe Skies testing" | Insights tab - left column |
| `value_to_walmart` | "Enhanced security \| Reduced checks" | Insights tab - left column |
| `maturity_level` | "Growth Stage" | Insights tab - left column |
| `pros` | "Established vendor \| Proven track" | Insights tab - right column (green) |
| `cons` | "Limited info \| Pricing unknown" | Insights tab - right column (orange) |
| `concerns` | "Security compliance pending" | Insights tab - right column (red) |

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8082 is in use
netstat -ano | findstr :8082

# Kill process if needed
taskkill /PID <process_id> /F

# Restart backend
cd C:\Users\j0w16ja\SENTRY_v2-main\backend
python -m uvicorn main:app --port 8082 --reload
```

### Frontend won't start
```bash
# Reinstall dependencies
cd C:\Users\j0w16ja\SENTRY_v2-main
npm install

# Restart dev server
npm run dev
```

### Insights tab is empty
- Check if vendor has data:
  ```bash
  cd backend
  python verify_insights.py
  ```
- If no data, run:
  ```bash
  python generate_vendor_insights.py
  ```

### New vendors from CSV not showing up
- **Reason:** Fuzzy matching threshold too strict
- **Fix:** Manually review unmatched companies:
  - Check `import_202601_202602_data.py` output for "No match" list
  - Add vendors manually via Admin panel (future feature)
  - Or adjust fuzzy match threshold in script (line 26)

---

## 📝 Scripts Reference

| Script | Purpose | Run Frequency |
|--------|---------|---------------|
| `add_vendor_details_columns.py` | Add new DB columns | **Once** (already done) |
| `import_202601_202602_data.py` | Import tracker CSVs | **Monthly** (when new data available) |
| `generate_vendor_insights.py` | Generate AI insights | **As needed** (or weekly for new vendors) |
| `verify_insights.py` | Check data quality | **After imports** (debugging) |

---

## 🎓 Element LLM Gateway Setup

### Get API Key
1. Join **#element-genai-support** on Slack
2. Request API key for SENTRY
3. Follow their onboarding docs

### Set Environment Variable
```bash
# Windows
set ELEMENT_API_KEY=your_key_here

# Or add to system environment variables for persistence
```

### Test Connection
```bash
python generate_vendor_insights.py
# Should say "Generating insights via Element LLM Gateway"
# Not "Using fallback templates"
```

---

## 🔗 Useful Links

- **SENTRY Codebase:** `C:\Users\j0w16ja\SENTRY_v2-main`
- **Tracker Data:** `C:\Users\j0w16ja\OneDrive - Walmart Inc\Emerging Technology Security - Utilities\SpreadSheets\ET Trackers\Simplified Trackers`
- **Element Support:** [#element-genai-support](https://walmart.enterprise.slack.com/archives/C094Y1D24JY)
- **Code Puppy Help:** [https://puppy.walmart.com/doghouse](https://puppy.walmart.com/doghouse)

---

## ✨ What's Next?

### Recommended Immediate Actions
1. ✅ **Set Element API Key** to get real AI insights
2. ✅ **Run insights generator on all vendors** (will take ~30 min for 1,931 vendors)
3. ✅ **Test Insights tab** in browser on a few vendors
4. ✅ **Share with team** for feedback

### Future Enhancements (Optional)
- Add Admin UI for manual editing of insights
- Auto-extract pros/cons from VAR documents
- Track which insights lead to RFI submissions
- Add sentiment analysis to concerns

---

**Questions?** Ping Jason Wilbur (j0w16ja) or ask Atlas in Code Puppy! 🐶

*Last updated: 2026-02-28*
