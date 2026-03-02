# SENTRY Enterprise Deployment Guide

## Full-Stack Deployment to GCP (Frontend + Backend)

### Prerequisites
1. GCP Project: `sentry-b873a` (already configured)
2. Firebase CLI installed (already done)
3. Google Cloud SDK installed

---

## OPTION A: Firebase Hosting (Frontend Only)

### Step 1: Authenticate
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main
firebase login
```

### Step 2: Deploy
```bash
firebase deploy --only hosting
```

### Result:
- URL: https://sentry-b873a.web.app
- **Note:** Backend API won't work until deployed to Cloud Run

---

## OPTION B: Full Deployment (Frontend + Backend)

### Step 1: Deploy Backend to Cloud Run

#### 1.1 Create Dockerfile for FastAPI backend
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

#### 1.2 Deploy to Cloud Run
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main\backend

# Build and deploy
gcloud run deploy sentry-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --project sentry-b873a
```

### Step 2: Update Firebase Config
Update `firebase.json` with your Cloud Run service URL (done automatically)

### Step 3: Deploy Frontend
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main
npm run build
firebase deploy --only hosting
```

### Result:
- Frontend: https://sentry-b873a.web.app
- Backend: https://sentry-api-[hash].run.app
- **Fully functional** with database!

---

## OPTION C: Share via Network (Temporary)

### Current Network URLs:
- Local Network: http://192.168.1.155:3002/
- Walmart Network: http://172.19.235.16:3002/

### How to Share:
1. Keep SENTRY running on your machine
2. Share URL with colleagues on same network
3. They can access immediately!

### Limitations:
- Only works while your computer is on
- Only on Walmart network (VPN/Eagle)
- Database is local to your machine

---

## OPTION D: SharePoint Static Hosting

### Step 1: Build SENTRY
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main
npm run build
```

### Step 2: Upload to SharePoint
1. Copy contents of `dist/` folder
2. Upload to SharePoint site library
3. Share the SharePoint page link

### Limitations:
- Backend API won't work
- Read-only demo mode

---

## OPTION E: Internal Web Server (IIS/Apache)

If you have access to an internal Windows/Linux server:

### Step 1: Build
```bash
npm run build
```

### Step 2: Copy to Server
Copy `dist/` folder to web server root

### Step 3: Configure Backend
Set up FastAPI backend on server:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Recommended Approach for Walmart

### For Jerrad (Quick Demo):
✅ **Use Network URLs** (Option C)
- Share: http://172.19.235.16:3002/
- Works immediately!
- No deployment needed

### For Team Access (Permanent):
✅ **Deploy to Firebase + Cloud Run** (Option B)
- Frontend: Firebase Hosting
- Backend: Cloud Run
- Fully functional 24/7
- Professional deployment

### For Executive Review (Static):
✅ **SharePoint Static** (Option D)
- Upload SENTRY_Build.zip contents
- Share SharePoint link
- No server needed
- Read-only demo

---

## Quick Commands Summary

### Network Share (Immediate):
```bash
# SENTRY is already running!
# Share: http://172.19.235.16:3002/
```

### Firebase Deploy (Frontend Only):
```bash
cd C:\Users\j0w16ja\SENTRY_v2-main
firebase login
npm run build
firebase deploy --only hosting
# URL: https://sentry-b873a.web.app
```

### Full GCP Deploy (Frontend + Backend):
```bash
# Deploy backend
cd backend
gcloud run deploy sentry-api --source . --region us-central1 --allow-unauthenticated

# Deploy frontend
cd ..
npm run build
firebase deploy --only hosting
```

---

## Troubleshooting

### Firebase Login Issues:
```bash
# If corporate proxy blocks authentication:
firebase login --no-localhost
# Follow the URL in a browser
```

### Cloud Run Authentication:
```bash
# Login to GCP
gcloud auth login

# Set project
gcloud config set project sentry-b873a
```

### CORS Issues:
Add to `backend/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://sentry-b873a.web.app", "https://sentry-b873a.firebaseapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Support

- **Created by:** Atlas (Code Puppy) 🐶
- **Owner:** Jason Wilbur (j0w16ja@walmart.com)
- **Team:** Enterprise Security - Emerging Technology

**Next Update:** Contact Jason for deployment assistance or questions!
