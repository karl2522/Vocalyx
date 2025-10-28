# Google/Firebase Authentication Setup for Performance Tests

Since you're using Google login (Firebase authentication), you need to use a **pre-obtained JWT token** instead of email/password credentials.

## How to Get Your JWT Token

### Option 1: Browser Console (Easiest)

1. Log in to your Vocalyx application in your browser
2. Open the browser's Developer Tools (F12)
3. Go to the **Console** tab
4. Type and press Enter:
   ```javascript
   localStorage.getItem('authToken')
   ```
5. **IMPORTANT**: Copy the token - it's a JWT token that starts with `eyJ...`
   - ✅ **Correct**: `eyJhbGciOiJIUzI1NiIs...` (JWT token from Django)
   - ❌ **Wrong**: `ya29.A0ATi6K2u6...` (Google OAuth token - don't use this!)
6. Add it to your `backend/.env` file:
   ```env
   TEST_USER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-token-here...
   ```

**⚠️ Common Mistake**: Don't use `localStorage.getItem('googleAccessToken')` - that's a different token!

### Option 2: Browser DevTools Application Tab

1. Log in to your Vocalyx application
2. Open Developer Tools (F12)
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Expand **Local Storage** in the left sidebar
5. Click on your site's URL
6. Find the `authToken` key
7. Copy its value
8. Add it to your `backend/.env` file

### Option 3: Network Tab

1. Log in to your Vocalyx application
2. Open Developer Tools (F12)
3. Go to the **Network** tab
4. Filter by "XHR" or "Fetch"
5. Look for a request to `/api/firebase-auth/` or similar
6. Check the **Response** tab - the token will be in the `token` field

## Setting Up Your .env File

Once you have your token, add it to `backend/.env`:

```env
# Performance testing configuration
PERFORMANCE_TEST_READ_ONLY=true

# Authentication - Use pre-obtained JWT token
TEST_USER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-token...

# API URL
PERFORMANCE_TEST_API_URL=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

## Important Notes

- **Token Expiration**: JWT tokens expire after a certain time (usually 1 hour based on your settings). If tests start failing with 401 errors, get a new token by logging in again.
- **Security**: Never commit your token to Git! The `.env` file should be in `.gitignore`.
- **One Token Only**: You only need `TEST_USER_TOKEN` - you don't need `TEST_USER_EMAIL` or `TEST_USER_PASSWORD` if using Google auth.

## Running Tests

After setting up the token, run Locust as usual:

```bash
cd backend
locust -f performance_tests/locustfile.py --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

The tests will now use your token for all authenticated requests!

