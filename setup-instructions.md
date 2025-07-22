# Google Sheets Integration Setup

This implementation provides secure, scalable real-time editing of Google Sheets-based class records using the `drive.file` scope.

## ✅ What's Implemented

### Backend
- **Google Sheets Service**: Copy templates, manage permissions, list user sheets
- **API Endpoints**: `/api/sheets/copy-template/`, `/api/sheets/list/`, etc.
- **Authentication**: User access token validation for all requests

### Frontend
- **GoogleSheetsManager**: Complete UI for sheet management
- **GoogleSheetsService**: API client for all sheet operations
- **Embedded Viewer**: Real-time sheet editing within the app

## 🔧 Required APIs

Enable these in Google Cloud Console for project `vocalyx-d897e`:

1. **Google Drive API** ✅ (already enabled)
2. **Google Sheets API** ⚠️ (need to enable)

```bash
# Enable Google Sheets API
https://console.cloud.google.com/apis/library/sheets.googleapis.com
```

## 📋 Setup Steps

### 1. Template Sheet Configuration
✅ **Template Sheet ID**: `1iMKqLouXzb2XDvYwcysPVxXx0R-Cb6Yo`
- This has been configured in the code already
- Make sure this sheet is accessible to anyone with the link (view only)
- Verify the sheet exists and has your class record template structure

### 2. OAuth Consent Screen
Ensure these scopes are configured:
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/drive.file`

### 3. Environment Variables
Add to backend `.env` (optional, default is already set):
```env
GOOGLE_SHEETS_TEMPLATE_ID=1iMKqLouXzb2XDvYwcysPVxXx0R-Cb6Yo
```

## 🎯 How It Works

### Authentication Flow
```
1. User logs in with Google OAuth
2. Frontend receives access token with drive.file scope
3. Token stored in localStorage
4. All API requests include token in X-Google-Access-Token header
```

### Template Copying
```
1. User clicks "Create New Sheet"
2. Backend calls Google Drive API to copy template
3. New sheet created in user's Drive
4. User can immediately edit in embedded iframe
```

### Security Features
- **Limited Scope**: Only `drive.file` - app can only access files it creates
- **User Isolation**: Each user only sees their own sheets
- **No App Verification**: Works without Google verification because of restricted scope

## 🚀 Usage Examples

### Copy Template Sheet
```javascript
import googleSheetsService from '../services/googleSheetsService';

const result = await googleSheetsService.copyTemplate(
  'template_sheet_id',
  'Math 101 - Fall 2024'
);
```

### List User Sheets
```javascript
const result = await googleSheetsService.listUserSheets();
// Returns all Google Sheets created by the app
```

### Embed Sheet
```jsx
<iframe
  src={`https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing&rm=embedded`}
  width="100%"
  height="600"
  frameBorder="0"
/>
```

## 📱 Available Features

### For Users
- ✅ Create new class record sheets from template
- ✅ List all their sheets
- ✅ View/edit sheets in embedded iframe
- ✅ Open sheets in new tab for full Google Sheets experience
- ✅ Real-time collaborative editing
- ✅ Automatic save (Google Sheets native feature)

### For Developers
- ✅ Secure token-based authentication
- ✅ Error handling and user feedback
- ✅ Responsive design
- ✅ Modal-based sheet creation
- ✅ No external dependencies beyond Google APIs

## 🔒 Security Notes

- **No App Verification Required**: Using only `drive.file` scope
- **User Data Privacy**: App can only access sheets it creates
- **Token Security**: Access tokens stored in localStorage (consider more secure storage for production)
- **CORS Protection**: Backend validates all requests

## 🧪 Testing

1. ✅ **Template sheet configured**: `1iMKqLouXzb2XDvYwcysPVxXx0R-Cb6Yo`
2. **Enable Google Sheets API** in Google Cloud Console
3. **Test the flow**:
   - Login with Google
   - Create new sheet
   - Verify it appears in your Google Drive
   - Edit the sheet in the embedded iframe
   - Check real-time updates

## ⚡ Production Considerations

1. **Template Management**: Store template IDs in database for multiple templates
2. **Token Refresh**: Implement automatic token refresh for long sessions
3. **Error Recovery**: Add retry logic for API failures
4. **Permissions**: Consider making sheets public readable if needed for sharing
5. **Monitoring**: Add logging for sheet operations

## 🎯 Current Status

✅ **Complete Implementation**
- Backend Google Sheets service
- Frontend sheet manager component
- API endpoints for all operations
- Embedded sheet viewer
- Template copying functionality
- User authentication and authorization

⚠️ **Needs Configuration**
- Enable Google Sheets API in Google Cloud Console

✅ **Already Configured**
- Template sheet ID: `1iMKqLouXzb2XDvYwcysPVxXx0R-Cb6Yo`

The system is ready for use once the Google Sheets API is enabled and a template sheet is configured! 