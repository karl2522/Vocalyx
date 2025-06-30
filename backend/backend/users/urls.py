from django.urls import path
from .views import (
    RegisterView, LoginView, VerifyEmailView,
    google_auth, LogoutView, microsoft_auth, firebase_auth_view,
    update_profile, get_profile, validate_token,
    drive_test_connection, drive_list_files, drive_upload_file,
    drive_create_folder, drive_download_file,
    sheets_copy_template, sheets_get_info, sheets_list_user_sheets,
    sheets_update_permissions
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('validate-token/', validate_token, name='validate_token'),
    path('auth/google/', google_auth, name='google_auth'),
    path('auth/microsoft/', microsoft_auth, name='microsoft_auth'),
    path('firebase-auth/', firebase_auth_view, name='firebase_auth'),
    path('update-profile/', update_profile, name='update_profile'),
    path('profile/', get_profile, name='get_profile'),
    
    # Google Drive API endpoints
    path('drive/test/', drive_test_connection, name='drive_test_connection'),
    path('drive/files/', drive_list_files, name='drive_list_files'),
    path('drive/upload/', drive_upload_file, name='drive_upload_file'),
    path('drive/folder/', drive_create_folder, name='drive_create_folder'),
    path('drive/download/<str:file_id>/', drive_download_file, name='drive_download_file'),
    
    # Google Sheets API endpoints
    path('sheets/copy-template/', sheets_copy_template, name='sheets_copy_template'),
    path('sheets/info/<str:sheet_id>/', sheets_get_info, name='sheets_get_info'),
    path('sheets/list/', sheets_list_user_sheets, name='sheets_list_user_sheets'),
    path('sheets/permissions/<str:sheet_id>/', sheets_update_permissions, name='sheets_update_permissions'),
]