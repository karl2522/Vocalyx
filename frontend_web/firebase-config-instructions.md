# Firebase Web Configuration Setup

Your Firebase service account is set up! Now you need to get the web configuration for your frontend.

## Steps to Get Firebase Web Config:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `vocalyx-d897e`
3. **Project Settings**: Click the gear icon → Project settings
4. **Web App Configuration**: 
   - Scroll down to "Your apps" section
   - If you don't have a web app, click "Add app" → Web (</>) icon
   - Give it a name like "Vocalyx Web App"
   - **Don't** enable Firebase Hosting for now
   - Click "Register app"

5. **Copy the Configuration**: You'll get something like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "vocalyx-d897e.firebaseapp.com",
  projectId: "vocalyx-d897e",
  storageBucket: "vocalyx-d897e.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789abc"
};
```

6. **Create your .env file** in `frontend_web/` directory:
```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=vocalyx-d897e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vocalyx-d897e
VITE_FIREBASE_STORAGE_BUCKET=vocalyx-d897e.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789abc
```

## Next: Enable Authentication

1. **In Firebase Console**, go to **Authentication** → **Sign-in method**
2. **Enable Google Provider**:
   - Click on "Google"
   - Toggle "Enable"
   - Set support email (your email)
   - Add authorized domains: `localhost`, your production domain
3. **Save**

## Next: Enable Google Drive API

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select project**: `vocalyx-d897e`
3. **APIs & Services** → **Library**
4. **Search and enable**:
   - Google Drive API
   - Google+ API (if needed)

## OAuth Consent Screen (Important!)

1. **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. **Choose External** (unless you have Google Workspace)
3. **Fill in**:
   - App name: "Vocalyx"
   - User support email: your email
   - Developer email: your email
4. **Add Scopes**:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile` 
   - `../auth/drive.file`
5. **Add test users** (for development)

## Test the Setup

After creating the .env file, test with:
```bash
cd frontend_web
npm run dev
```

Then try logging in with Google!

## Current Status ✅

- ✅ Firebase Service Account configured
- ✅ Backend Firebase Admin SDK setup
- ✅ Backend API endpoints ready
- ✅ Frontend Firebase SDK configured
- ✅ Google Drive service created
- ⏳ Need Frontend Firebase web config (.env file)
- ⏳ Need Google Authentication enabled in Firebase Console
- ⏳ Need Google Drive API enabled in Google Cloud Console 