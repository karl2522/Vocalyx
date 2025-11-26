# API Coverage Analysis - GET Endpoints

## All Existing GET APIs in Backend

### Authentication & User Management (`/api/`)
1. ✅ `GET /api/profile/` - Get user profile
2. ✅ `GET /api/validate-token/` - Validate JWT token
3. ✅ `GET /api/verify-email/<token>/` - Email verification (not tested - requires token)
4. ❌ `GET /api/token/refresh/` - Refresh JWT token (POST in DRF, but available as GET)

### Class Records (`/api/class-records/`)
5. ✅ `GET /api/class-records/` - List all class records
6. ✅ `GET /api/class-records/live-counts/` - Get class records with live counts (custom action)
7. ❌ `GET /api/class-records/{id}/` - Get specific class record (ViewSet detail)
8. ❌ `GET /api/class-records/{id}/category_percentages/` - Get category percentages (custom action)
9. ❌ `GET /api/class-records/{id}/spreadsheet/` - Get spreadsheet data (custom action)
10. ❌ `GET /api/class-records/{id}/get_imported_excel/` - Get imported Excel data (custom action)
11. ❌ `GET /api/class-records/{id}/columns/` - Get custom column structure (custom action, template mode)
12. ❌ `GET /api/class-records/test_headers/` - Test headers endpoint (debug, custom action)

### Students (`/api/students/`)
13. ✅ `GET /api/students/` - List all students
14. ❌ `GET /api/students/{id}/` - Get specific student (ViewSet detail)

### Grades (`/api/grades/`)
15. ✅ `GET /api/grades/` - List all grades
16. ❌ `GET /api/grades/{id}/` - Get specific grade (ViewSet detail)

### Grade Categories (`/api/grade-categories/`)
17. ❌ `GET /api/grade-categories/` - List grade categories
18. ❌ `GET /api/grade-categories/{id}/` - Get specific grade category

### Category Percentages (`/api/category-percentages/`)
19. ❌ `GET /api/category-percentages/` - List category percentages
20. ❌ `GET /api/category-percentages/{id}/` - Get specific category percentage

### Notifications (`/api/notifications/`)
21. ✅ `GET /api/notifications/` - List notifications
22. ❌ `GET /api/notifications/{id}/` - Get specific notification
23. ❌ `GET /api/notifications/unread/` - Get unread notifications (custom action)
24. ❌ `GET /api/notifications/count/` - Get unread count (custom action)
25. ❌ `POST /api/notifications/mark-all-read/` - Mark all as read (POST, not GET)

### Google Sheets (`/api/sheets/`)
25. ✅ `GET /api/sheets/service-account/{sheet_id}/data/` - Get sheet data
26. ✅ `GET /api/sheets/service-account/{sheet_id}/all-sheets-data/` - Get all sheets data
27. ❌ `GET /api/sheets/service-account/{sheet_id}/sheets-list/` - List all sheets in spreadsheet
28. ❌ `GET /api/sheets/service-account/{sheet_id}/sheet/{sheet_name}/data/` - Get specific sheet data
29. ✅ `GET /api/sheets/{sheet_id}/get-categories/` - Get sheet categories
30. ❌ `GET /api/sheets/info/{sheet_id}/` - Get sheet info
31. ❌ `GET /api/sheets/list/` - List user sheets
32. ❌ `GET /api/sheets/data/{sheet_id}/` - Get sheet data (non-service-account)
33. ❌ `GET /api/sheets/{sheet_id}/import-history/` - Get import history
34. ❌ `GET /api/sheets/{sheet_id}/final-grade-preview/` - Final grade preview (might be POST)

### Google Drive (`/api/drive/`)
35. ❌ `GET /api/drive/test/` - Test drive connection
36. ❌ `GET /api/drive/files/` - List drive files
37. ❌ `GET /api/drive/download/{file_id}/` - Download file from drive

### Google Drive Connection (`/api/google-drive/`)
38. ❌ `GET /api/google-drive/check/` - Check Google Drive connection
39. ❌ `GET /api/google-drive/token/` - Get Google Drive token

### Activities (`/api/activities/`)
40. ❌ `GET /api/activities/` - List user activities
41. ❌ `GET /api/activities/stats/` - Get activity statistics

### Speech Services (`/api/speech/`)
42. ❌ `GET /api/speech/` - List speech services (if exists)

### Schema & Docs
43. ❌ `GET /api/schema/` - API schema
44. ❌ `GET /api/schema/swagger-ui/` - Swagger UI
45. ❌ `GET /api/schema/redoc/` - ReDoc documentation

## Currently Tested GET APIs

### Authentication
1. ✅ `GET /api/profile/`
2. ✅ `GET /api/validate-token/`

### Class Records
3. ✅ `GET /api/class-records/`
4. ✅ `GET /api/class-records/live-counts/`

### Students
5. ✅ `GET /api/students/`

### Grades
6. ✅ `GET /api/grades/`

### Notifications
7. ✅ `GET /api/notifications/`

### Google Sheets
8. ✅ `GET /api/sheets/service-account/{sheet_id}/data/`
9. ✅ `GET /api/sheets/service-account/{sheet_id}/all-sheets-data/`
10. ✅ `GET /api/sheets/{sheet_id}/get-categories/`

## Summary

**Total GET APIs in Backend:** ~48 endpoints
**Currently Tested:** 10 endpoints
**Coverage:** ~21%

### Missing High-Priority GET APIs to Test:

1. **Class Record Details:**
   - `GET /api/class-records/{id}/` - Get specific class record
   - `GET /api/class-records/{id}/students/` - Get students for class record
   - `GET /api/class-records/{id}/grade_categories/` - Get grade categories

2. **Individual Resources:**
   - `GET /api/students/{id}/` - Get specific student
   - `GET /api/grades/{id}/` - Get specific grade
   - `GET /api/notifications/{id}/` - Get specific notification

3. **Google Sheets (Service Account):**
   - `GET /api/sheets/service-account/{sheet_id}/sheets-list/` - List sheets
   - `GET /api/sheets/service-account/{sheet_id}/sheet/{sheet_name}/data/` - Specific sheet

4. **Notifications:**
   - `GET /api/notifications/unread/` - Unread notifications
   - `GET /api/notifications/count/` - Unread count
   - `GET /api/notifications/{id}/` - Get specific notification

### Low-Priority/Misc:
- Schema/documentation endpoints
- Google Drive endpoints (if needed)
- Activities endpoints (analytics)
- Debug/test endpoints

