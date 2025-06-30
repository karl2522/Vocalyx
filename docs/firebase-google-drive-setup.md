# Firebase Authentication with Google Drive Integration Setup

This guide will help you configure Firebase Authentication with Google OAuth and Google Drive access for your Vocalyx application.

## Prerequisites

1. Google Cloud Console project
2. Firebase project
3. Your web app domain (for authorized origins)

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select existing project
3. Follow the setup wizard

### 1.2 Enable Authentication
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Google** provider
3. Toggle **Enable**
4. Add your project's **authorized domains**:
   - `localhost` (for development)
   - Your production domain (e.g., `vocalyx-frontend.vercel.app`)
5. Note down the **Web SDK configuration** (you'll need this later)

## Step 2: Google Cloud Console Setup

### 2.1 Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** > **Library**
4. Enable the following APIs:
   - **Google Drive API**
   - **Google+ API** (if not already enabled)

### 2.2 Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - App name: "Vocalyx"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `../auth/drive.file`
5. Add test users (for development)

### 2.3 OAuth 2.0 Client Configuration
1. Go to **APIs & Services** > **Credentials**
2. Find your Firebase-generated OAuth client (should already exist)
3. Click to edit it
4. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for development)
   - `https://your-production-domain.com`
5. Add **Authorized redirect URIs**:
   - `http://localhost:5173/__/auth/handler` (for development)
   - `https://your-production-domain.com/__/auth/handler`

## Step 3: Frontend Configuration

### 3.1 Environment Variables
Create `.env` file in your frontend directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Backend URLs
VITE_BACKEND_URL_DEV=http://127.0.0.1:8000
VITE_BACKEND_URL_PROD=https://your-backend-domain.com
```

### 3.2 Firebase SDK Configuration
The Firebase configuration is already set up in `frontend_web/src/config/firebase.js`. The configuration automatically:
- Adds Google Drive scope (`https://www.googleapis.com/auth/drive.file`)
- Sets up Google Auth Provider
- Configures popup-based authentication

## Step 4: Backend Configuration

### 4.1 Firebase Admin SDK
1. In Firebase Console, go to **Project settings** > **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to this file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/firebase-service-account.json"
```

### 4.2 Environment Variables
Add to your backend `.env` file:

```env
# Firebase
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json

# Google OAuth (from Google Cloud Console)
GOOGLE_OAUTH2_CLIENT_ID=your_oauth_client_id
```

## Step 5: Usage Examples

### 5.1 Frontend Login
```javascript
import { useAuth } from '../auth/AuthContext';

function LoginComponent() {
  const { googleLogin } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      // User is now authenticated with Google Drive access
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  );
}
```

### 5.2 Google Drive Operations
```javascript
import googleDriveService from '../services/googleDriveService';

// Test connection
const result = await googleDriveService.testConnection();

// List files
const files = await googleDriveService.listFiles({
  query: 'name contains "test"',
  pageSize: 20
});

// Upload file
const uploadResult = await googleDriveService.uploadFile(file);

// Create folder
const folder = await googleDriveService.createFolder('My Folder');
```

### 5.3 Backend Drive API Usage
```python
from users.google_drive_service import GoogleDriveService

# In your view
access_token = request.headers.get('X-Google-Access-Token')
drive_service = GoogleDriveService(access_token)

# Test connection
result = drive_service.test_connection()

# List files
files = drive_service.list_files(query="name contains 'excel'", page_size=50)

# Upload file
upload_result = drive_service.upload_file(
    file_content=file_data,
    filename="my_file.xlsx",
    mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)
```

## Step 6: Security Considerations

### 6.1 Token Management
- Access tokens are stored in localStorage on the frontend
- Tokens are passed to backend via headers for API calls
- Implement token refresh logic for long-running sessions

### 6.2 Scope Limitation
- Only `https://www.googleapis.com/auth/drive.file` scope is requested
- This limits access to files created by your app only
- Users can't access all their Drive files, only app-created ones

### 6.3 Error Handling
- Implement proper error handling for expired tokens
- Provide clear user feedback for authentication failures
- Handle offline scenarios gracefully

## Step 7: Testing

### 7.1 Test Authentication Flow
1. Start your development server
2. Navigate to login page
3. Click "Continue with Google"
4. Complete OAuth flow
5. Verify user is logged in and token is stored

### 7.2 Test Drive Integration
1. After successful login, test Drive connection:
```javascript
// In browser console
const hasAccess = googleDriveService.hasGoogleAccess();
console.log('Has Google Drive access:', hasAccess);

const testResult = await googleDriveService.testConnection();
console.log('Connection test:', testResult);
```

## Troubleshooting

### Common Issues

1. **"Popup blocked" error**
   - Ensure popups are allowed for your domain
   - Consider implementing redirect-based auth as fallback

2. **"Unauthorized" errors**
   - Check if your domain is in authorized origins
   - Verify Firebase configuration is correct

3. **"Insufficient permissions" for Drive API**
   - Ensure Google Drive API is enabled
   - Check OAuth consent screen configuration
   - Verify scopes are properly configured

4. **Backend Firebase token verification fails**
   - Ensure Firebase Admin SDK is properly configured
   - Check service account key is accessible
   - Verify project ID matches

### Debug Mode
Enable debug logging by setting:
```javascript
// In your app
console.log('Firebase config:', firebaseConfig);
console.log('Auth state:', auth.currentUser);
console.log('Access token:', localStorage.getItem('googleAccessToken'));
```

## Production Deployment

### Frontend
1. Update environment variables for production
2. Ensure authorized domains include your production domain
3. Test authentication flow in production environment

### Backend
1. Securely store Firebase service account key
2. Update CORS settings for production domain
3. Configure proper logging for authentication events

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server) 