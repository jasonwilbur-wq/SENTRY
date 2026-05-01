# Competitor Logos - Automatic Fetching Guide

## 🎨 How It Works

### **Automatic Logo Fetching** ✅

I've implemented **automatic logo fetching** using the **Clearbit Logo API**:
- ✅ **Free** - No API key required
- ✅ **High quality** - Company logos in real-time
- ✅ **Automatic fallback** - If logo fails, shows letter avatar
- ✅ **No manual work** - Just maps company name → domain

---

## 🔧 Technical Implementation

### **Logo API Used:**
```typescript
// Clearbit Logo API
const logoUrl = `https://logo.clearbit.com/${domain}`;

// Example:
// https://logo.clearbit.com/amazon.com
// https://logo.clearbit.com/costco.com
// https://logo.clearbit.com/target.com
```

### **Fallback Strategy:**
1. **Try to load logo** from Clearbit API
2. **If logo fails** (404, timeout, CORS), show letter avatar
3. **Letter avatar** uses the same colorful gradients as before

### **Domain Mapping:**

I've pre-mapped the top 40+ competitors to their domains:

```typescript
const COMPETITOR_DOMAINS = {
  'Amazon': 'amazon.com',
  'Costco': 'costco.com',
  'Kroger': 'kroger.com',
  'Target': 'target.com',
  'Whole Foods': 'wholefoodsmarket.com',
  'Home Depot': 'homedepot.com',
  'ALDI': 'aldi.us',
  'Wegmans': 'wegmans.com',
  'Zebra Technologies': 'zebra.com',
  'Lowe\'s': 'lowes.com',
  // ... and 30+ more
};
```

---

## 🎯 What You'll See

### **With Logos (Most Major Competitors):**
- **Amazon** → Shows Amazon logo
- **Costco** → Shows Costco logo
- **Kroger** → Shows Kroger logo
- **Target** → Shows Target's bullseye logo
- **Home Depot** → Shows Home Depot logo
- **ALDI** → Shows ALDI logo

### **With Letter Avatars (Fallback):**
- **Competitors not in mapping** → Letter avatar (e.g., "GR" for General Retail)
- **Logo fetch fails** → Automatic fallback to letter avatar
- **No internet/CORS issues** → Letter avatar

---

## ➕ Adding More Logos

### **If a competitor shows a letter avatar but you want a logo:**

1. **Open**: `components/CompetitorIntelligence.tsx`
2. **Find**: `COMPETITOR_DOMAINS` object (around line 28)
3. **Add entry**:
   ```typescript
   'Competitor Name': 'theirdomain.com',
   ```

### **Example - Adding Walgreens:**
```typescript
const COMPETITOR_DOMAINS = {
  // ... existing entries ...
  'Walgreens': 'walgreens.com',  // ← Add this line
};
```

4. **Save file** → Vite auto-reloads → Logo appears!

---

## 🔄 Alternative Logo Sources

### **Option 1: Clearbit (Current)** ✅
```typescript
`https://logo.clearbit.com/${domain}`
```
**Pros**: High quality, free, reliable  
**Cons**: Requires exact domain match

### **Option 2: Google Favicons**
```typescript
`https://www.google.com/s2/favicons?domain=${domain}&sz=128`
```
**Pros**: Always works, never fails  
**Cons**: Lower quality, just favicons

### **Option 3: DuckDuckGo Icons**
```typescript
`https://icons.duckduckgo.com/ip3/${domain}.ico`
```
**Pros**: Privacy-focused, reliable  
**Cons**: ICO format, not always high-res

### **Option 4: Manual Upload**
Create a folder `public/logos/` and place logo files:
```
public/logos/amazon.png
public/logos/costco.png
public/logos/target.png
```

Then update the logo URL logic:
```typescript
function getLogoUrl(name: string): string {
  return `/logos/${name.toLowerCase().replace(/\s+/g, '-')}.png`;
}
```

---

## 🎨 Logo Display

### **Small Cards (Grid View):**
- **Size**: 48px × 48px (w-12 h-12)
- **Background**: White with 2px gray border
- **Padding**: 8px (p-2)
- **Shadow**: Large shadow for depth

### **Large Header (Expanded View):**
- **Size**: 80px × 80px (w-20 h-20)
- **Background**: White with 2px gray border
- **Padding**: 8px
- **Shadow**: Extra large shadow

---

## 🛠️ Troubleshooting

### **Issue: Logo not showing**
**Causes**:
1. Competitor not in `COMPETITOR_DOMAINS` mapping
2. Incorrect domain (e.g., `aldi.com` instead of `aldi.us`)
3. Clearbit doesn't have logo for that domain
4. CORS or network issues

**Solution**:
- Check browser console for errors
- Verify domain is correct
- Test URL directly: `https://logo.clearbit.com/yourdomain.com`
- If fails, letter avatar will show automatically

### **Issue: Logo is blurry**
**Cause**: Domain returns low-res logo

**Solution**:
- Try alternative domain (e.g., `.com` vs `.us`)
- Or use manual upload with high-res PNG

### **Issue: Letter avatar shows instead of logo**
**Expected behavior**! This is the fallback.

**To fix**:
- Add domain to `COMPETITOR_DOMAINS` mapping
- Or provide manual logo file

---

## 📊 Current Coverage

### **✅ Logos Configured (40+ competitors):**
- Amazon
- Costco
- Kroger
- Target
- Whole Foods
- Home Depot
- ALDI
- Wegmans
- Zebra Technologies
- Lowe's
- Albertsons
- CarMax
- Coupang
- Instagram (Meta)
- Lidl
- Tesco
- 7-Eleven
- Alibaba
- CVS/Walgreens
- Dollar General
- Hot Topic
- Sam's Club
- Save Mart
- Shein
- TikTok
- Under Armour
- Walgreens
- Temu
- Francesca's
- Gather AI
- Alpha Modus
- Simbe
- Zipline
- Gatekeeper
- Schwarz Group
- Ahold Delhaize

### **🔤 Letter Avatars (Fallback):**
Any competitor not in the list above will show a colorful letter avatar.

---

## 🚀 Testing

### **To test logo loading:**

1. **Refresh SENTRY** at `http://localhost:3000`
2. Navigate to **"Competitor Intel"**
3. Look for competitor cards:
   - **Amazon** → Should show Amazon smile logo
   - **Target** → Should show red bullseye
   - **Costco** → Should show Costco logo
4. **Click to expand** → Larger logo appears in header

### **To test fallback:**

1. Open DevTools → Network tab
2. Block `logo.clearbit.com` domain
3. Refresh page
4. All cards should show letter avatars (fallback working!)

---

## 📝 Future Enhancements

### **Phase 1: Current** ✅
- Automatic logo fetching via Clearbit
- Fallback to letter avatars
- 40+ competitors pre-mapped

### **Phase 2: Next Steps**
- **Logo caching** - Store fetched logos in localStorage
- **Manual override** - Allow custom logo uploads
- **Multiple sources** - Try Clearbit → Google → DuckDuckGo in sequence

### **Phase 3: Advanced**
- **Logo database** - Build internal logo repository
- **Admin panel** - Upload logos via UI
- **Auto-detect** - Extract domain from competitor events

---

## ✅ Summary

### **What Works Now:**
✅ **Automatic logo fetching** for 40+ competitors  
✅ **Graceful fallback** to letter avatars  
✅ **No API key required** - Free Clearbit API  
✅ **High quality logos** - Official company branding  
✅ **Error handling** - Never breaks, always shows something  

### **No Manual Work Required:**
- No need to provide logo files
- No need to upload images
- Just refresh SENTRY and logos appear!

### **If You Want to Add More:**
- Edit `COMPETITOR_DOMAINS` in `CompetitorIntelligence.tsx`
- Map competitor name → domain
- Save file → Auto-reload → Done!

---

**🎉 Refresh SENTRY now to see real company logos on competitor cards!** 🚀✨
