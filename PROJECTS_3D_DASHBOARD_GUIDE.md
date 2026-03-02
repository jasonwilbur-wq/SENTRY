# 🚀 SENTRY PROJECT PORTFOLIO 3D - EPIC UPGRADE

**Created:** 2026-02-28  
**Version:** 1.0  
**Owner:** Jason Wilbur (j0w16ja@walmart.com)  
**Team:** Walmart Global Security · Emerging Technology

---

## 🌟 **WHAT'S NEW**

We've added an **EPIC 3D interactive project dashboard** to SENTRY! This isn't your standard boring project list — it's a fully immersive, real-time visualization of your entire project portfolio with:

✅ **3D Orbital Visualization** — Projects as floating spheres in space  
✅ **Health-Based Color Coding** — Walmart Green/Yellow/Red status colors  
✅ **Glass Morphism Cards** — Beautiful translucent cards with animated gradients  
✅ **Progress Rings** — Animated SVG progress indicators  
✅ **Interactive Stats Bar** — Real-time portfolio metrics  
✅ **Dual View Modes** — Grid view and 3D Orbital view  
✅ **Smart Filtering** — Filter by health status (green/yellow/red)  
✅ **Search** — Find projects instantly  
✅ **Project Detail Modal** — Click any project for full details  

---

## 📍 **FILE LOCATIONS**

### **Component:**
```
C:\Users\j0w16ja\SENTRY_v2-main\components\ProjectDashboard3D.tsx
```

### **Data Source:**
```
C:\Users\j0w16ja\SENTRY_v2-main\data\projects.csv
```

### **Original CSV:**
```
C:\Users\j0w16ja\Downloads\Sentry Projects\Projects_Overview_Updated.csv
```

---

## 🎨 **DESIGN FEATURES**

### **1. Health Status Colors (Walmart Palette)**

| Status | Color | Hex Code | Usage |
|--------|-------|----------|-------|
| 🟢 **Green** | Walmart Green | `#22c55e` | Projects on track |
| 🟡 **Yellow** | Walmart Yellow | `#ffc220` | Projects at risk |
| 🔴 **Red** | Red | `#ef4444` | Blocked/critical projects |
| ⚪ **Gray** | Gray | `#64748b` | Unknown/default state |

### **2. 3D Visual Elements**

#### **Project Orbs**
- Floating spheres with **MeshDistortMaterial** (animated distortion)
- Color-coded based on health status
- **Emissive glow** effect (intensity increases on hover)
- Auto-rotating on their own axis
- Scale animation on hover (grows to 120%)

#### **Central Core**
- Large blue sphere at center (Walmart Blue `#0053E2`)
- Represents the SENTRY core/hub
- Distortion effect for visual interest
- Semi-transparent (opacity: 0.3)

#### **Connection Lines**
- Lines connecting each project to the core
- Semi-transparent gray (`#64748b`)
- Creates a "solar system" orbital effect

#### **Lighting**
- **Ambient Light:** Base illumination
- **Point Lights:** Walmart Blue and Yellow accent lights
- **Spot Light:** Top-down spotlight for depth

#### **Camera Controls**
- Orbital rotation (auto-rotate enabled)
- Zoom in/out
- Pan and rotate manually
- Auto-rotate speed: 0.5

### **3. Glass Morphism Cards**

Each project card features:
- **Translucent background** with blur effect
- **Gradient borders** matching health color
- **Animated background gradient** (4-second loop)
- **Box shadow glow** in health color
- **Hover effects:** Card lifts up (-8px) and scales (1.02x)

### **4. Progress Rings**

- **SVG-based** circular progress indicators
- **Animated on load** (strokeDashoffset animation)
- **Color-coded** to match health status
- **Glow effect** (drop-shadow filter)
- Displays percentage in center

### **5. Stats Bar**

6 metric cards showing:
1. **Total Projects** — Walmart Blue theme
2. **Green Projects** — Clickable filter
3. **Yellow Projects** — Clickable filter
4. **Red Projects** — Clickable filter
5. **Average Progress** — Purple theme
6. **Total Blockers** — Red theme (if >0)

---

## 🕹️ **HOW TO USE**

### **1. Access the Dashboard**

1. Start SENTRY: `npm run dev`
2. Click **"Project Portfolio"** in the sidebar
3. You'll see the dashboard load with all projects

### **2. View Modes**

#### **Grid View (Default)**
- Projects displayed as 3D glass cards
- 3-column grid layout (responsive)
- Click any card for detailed view
- Hover for visual feedback

#### **3D Orbital View**
- Click **"🌐 3D Orbital"** button
- Projects displayed as floating spheres in 3D space
- Drag to rotate the view
- Scroll to zoom in/out
- Click any sphere for detailed view

### **3. Filtering**

#### **By Health Status:**
- Click any stat card (Green/Yellow/Red)
- Dashboard filters to show only that status
- Click **"Clear Filter"** to reset

#### **By Search:**
- Type in the search box
- Searches: project name, summary, project ID
- Real-time filtering as you type

### **4. Project Details**

- Click any card or orb
- Modal opens with full project details:
  - Summary
  - Phase & Lifecycle State
  - Managing Unit
  - Sensitivity Level
  - Next Milestone
  - All tags
  - Last updated timestamp

---

## 📄 **DATA STRUCTURE**

### **CSV Format (projects.csv)**

```csv
project_id,project_name,summary,managing_unit,lifecycle_state,health,current_phase,risk_score,sensitivity,tags,progress_pct,next_milestone,next_due_date,blockers_count,last_update_at,last_update_by,est_cost
```

### **Required Fields:**
- `project_id` — Unique identifier (e.g., `PRJ-SECROBOT-2025`)
- `project_name` — Full project name
- `health` — Must be: `green`, `yellow`, or `red`
- `progress_pct` — Number 0-100

### **Optional Fields:**
- `summary` — Short description
- `tags` — Semicolon-separated (e.g., `robotics;security;autonomous`)
- `next_milestone` — Next major milestone
- `next_due_date` — ISO8601 date format
- `blockers_count` — Number of active blockers

---

## 🔧 **TECHNICAL DETAILS**

### **Technologies Used**

| Technology | Purpose |
|------------|----------|
| **React** | Component framework |
| **TypeScript** | Type safety |
| **Three.js** | 3D graphics |
| **@react-three/fiber** | React renderer for Three.js |
| **@react-three/drei** | Three.js helpers |
| **Framer Motion** | Animations |
| **Tailwind CSS** | Utility styling |
| **CSS Custom Properties** | SENTRY design tokens |

### **Component Architecture**

```
ProjectDashboard3D/
├── ProjectOrb (3D sphere component)
├── OrbitalScene (3D canvas scene)
├── ProjectCard3D (glass morphism card)
└── Main Dashboard (layout & logic)
```

### **Key Components**

#### **1. ProjectOrb**
- Three.js mesh with sphere geometry
- MeshDistortMaterial with color/emissive properties
- Float wrapper for floating animation
- useFrame hook for rotation animation
- Hover state with scale lerp (smooth scaling)

#### **2. OrbitalScene**
- Arranges projects in circular orbital pattern
- Calculates 3D positions based on project count
- Renders central core sphere
- Draws connection lines
- Manages lighting setup
- OrbitControls with auto-rotate

#### **3. ProjectCard3D**
- Glass morphism styling
- SVG progress ring
- Animated gradient background
- Metadata grid (phase, risk, state, blockers)
- Tag display
- Glow effect on hover

### **State Management**

```typescript
const [projects, setProjects] = useState<Project[]>([]);
const [selectedProject, setSelectedProject] = useState<Project | null>(null);
const [viewMode, setViewMode] = useState<'grid' | 'orbital'>('grid');
const [filterHealth, setFilterHealth] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
const [searchQuery, setSearchQuery] = useState('');
```

### **Performance Optimizations**

✅ **useMemo** for filtered projects (prevents unnecessary re-renders)  
✅ **useMemo** for stats calculations  
✅ **useMemo** for project positions (3D orbital layout)  
✅ **AnimatePresence** for smooth view transitions  
✅ **Lazy loading** of 3D scene (only loads in orbital mode)  

---

## 🔄 **UPDATING DATA**

### **Option 1: Replace CSV**

1. Export new data to CSV format (matching structure)
2. Replace file:
   ```bash
   copy new_data.csv C:\Users\j0w16ja\SENTRY_v2-main\data\projects.csv
   ```
3. Refresh SENTRY (data loads automatically)

### **Option 2: Modify Existing CSV**

1. Open `data/projects.csv` in Excel
2. Update fields (health, progress_pct, etc.)
3. Save as CSV (UTF-8)
4. Refresh SENTRY

### **Option 3: Add New Projects**

1. Open CSV in Excel
2. Add new row with all required fields
3. Ensure `project_id` is unique
4. Set `health` to `green`, `yellow`, or `red`
5. Save and refresh

---

## 🎯 **CURRENT PORTFOLIO METRICS**

*(as of 2026-02-28)*

| Metric | Value |
|--------|-------|
| **Total Projects** | 14 |
| **Green (On Track)** | 10 (71%) |
| **Yellow (At Risk)** | 2 (14%) |
| **Red (Blocked)** | 1 (7%) |
| **Unknown** | 1 (7%) |
| **Average Progress** | 47% |
| **Total Blockers** | 2 |
| **Estimated Portfolio Value** | Not tracked in CSV |

---

## ✨ **BEST PRACTICES**

### **Health Status Guidelines**

🟢 **Green:** Use when:
- Project is on schedule
- No major blockers
- All milestones met
- Team confidence is high

🟡 **Yellow:** Use when:
- Minor delays or risks
- Some blockers present
- Requires attention/monitoring
- May need escalation soon

🔴 **Red:** Use when:
- Major blockers preventing progress
- Significant delays
- Budget/resource issues
- Executive escalation required

### **Progress Tracking**

- Update `progress_pct` weekly
- Base on actual work completed, not time elapsed
- 0% = Not started
- 100% = Fully complete
- Increments of 5% recommended

### **Milestone Updates**

- Update `next_milestone` when current milestone completes
- Keep milestone names short (<50 chars)
- Update `next_due_date` when timeline changes
- Use ISO8601 date format: `YYYY-MM-DD`

---

## 🐞 **TROUBLESHOOTING**

### **Problem: Projects not loading**

**Solution:**
1. Check CSV file exists: `data/projects.csv`
2. Verify CSV format matches template
3. Check browser console for errors
4. Fallback data will load if CSV fails

### **Problem: 3D view is black/not rendering**

**Solution:**
1. Check browser supports WebGL (try Chrome/Edge)
2. Update graphics drivers
3. Try Grid view instead
4. Check console for Three.js errors

### **Problem: Colors are wrong**

**Solution:**
1. Check `health` field values
2. Must be lowercase: `green`, `yellow`, `red`
3. Check for extra spaces/special characters

### **Problem: Progress rings not animating**

**Solution:**
1. Ensure `progress_pct` is a number (not string)
2. Value must be 0-100
3. Try hard refresh (Ctrl+Shift+R)

---

## 🚀 **FUTURE ENHANCEMENTS**

### **Planned Features**

⬜ Timeline view (Gantt chart)  
⬜ Project dependencies graph  
⬜ Risk matrix visualization  
⬜ Budget tracking & forecasting  
⬜ Milestone Gantt chart  
⬜ Export to PDF/Excel  
⬜ Real-time collaboration (multi-user)  
⬜ Mobile responsive view  
⬜ Dark/Light theme toggle  
⬜ Custom views & dashboards  

### **Potential Integrations**

⬜ Jira/Azure DevOps sync  
⬜ Slack notifications  
⬜ Email alerts for status changes  
⬜ SharePoint data source  
⬜ Power BI embedding  

---

## 📚 **RESOURCES**

### **Documentation**
- [Three.js Docs](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [Framer Motion](https://www.framer.com/motion/)

### **Related SENTRY Files**
- `styles.css` — Design tokens & Walmart colors
- `types.ts` — TypeScript interfaces
- `App.tsx` — Main app routing
- `Sidebar.tsx` — Navigation

### **Original Data Sources**
- `Projects_Overview_Updated.csv`
- `Projects_Breakdown_Updated.csv`
- SENTRY Project Records (markdown files)

---

## 📧 **CONTACT & SUPPORT**

**Owner:** Jason Wilbur  
**Email:** j0w16ja@walmart.com / Jason.Wilbur@walmart.com  
**Title:** Sr. Security Manager - Emerging Security Technology  
**Organization:** Walmart Global Security  

**Team:**
- Cody Smith (Cody.Smith@walmart.com) — Technical Lead
- Chris Epling (Chris.Epling@walmart.com) — Business Partner
- Max Urfer (Max.Urfer@walmart.com) — Product Manager

**Slack:** #emerging-tech-security  
**Confluence:** https://confluence.walmart.com/display/GBSMLS

---

## ✅ **QUICK START CHECKLIST**

- [ ] SENTRY is running (`npm run dev`)
- [ ] Navigate to "Project Portfolio" in sidebar
- [ ] Verify all 14 projects are visible
- [ ] Test Grid view (click cards)
- [ ] Test 3D Orbital view (rotate, zoom)
- [ ] Test filters (click Green/Yellow/Red stats)
- [ ] Test search (type project name)
- [ ] Click a project to open detail modal
- [ ] Verify health colors match (green/yellow/red)
- [ ] Check stats bar shows correct metrics

---

## 🎉 **FINAL NOTES**

This 3D Project Dashboard is designed to make project portfolio management **engaging, intuitive, and visually stunning**. It uses:

- ✅ Walmart brand colors throughout
- ✅ Modern glass morphism design
- ✅ Smooth animations and transitions
- ✅ 3D visualization for spatial understanding
- ✅ Real-time filtering and search
- ✅ Responsive and accessible

**Enjoy your new EPIC project dashboard!** 🚀✨

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-28  
**Created by:** Atlas (Code Puppy) 🐶  
**Status:** ✅ Production Ready

**END OF GUIDE**
