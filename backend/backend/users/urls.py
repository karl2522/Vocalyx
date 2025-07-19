from django.urls import path

from .activity_views import UserActivityListView, create_activity, get_activity_stats
from .views import (
    RegisterView, LoginView, VerifyEmailView,
    google_auth, LogoutView, microsoft_auth, firebase_auth_view,
    update_profile, get_profile, validate_token,
    drive_test_connection, drive_list_files, drive_upload_file,
    drive_create_folder, drive_download_file,
    sheets_copy_template, sheets_get_info, sheets_list_user_sheets,
    sheets_update_permissions, sheets_get_data, sheets_get_data_service_account, sheets_update_cell_service_account,
    sheets_add_student_service_account, sheets_add_student_with_auto_number_service_account,
    sheets_auto_number_students_service_account, get_class_records_with_live_counts_cached,
    sheets_get_all_sheets_data_service_account, sheets_list_all_sheets_service_account,
    sheets_get_specific_sheet_data_service_account, sheets_update_cell_specific_sheet_service_account,
    sheets_import_students_preview, sheets_import_students_execute, sheets_preview_column_import,
    sheets_analyze_columns_mapping, sheets_execute_column_import, sheets_rename_column_header,
    sheets_analyze_columns_mapping_enhanced, sheets_execute_column_import_enhanced, get_import_history,
    sheets_update_max_score_service_account, sheets_update_batch_max_scores_service_account,
    sheets_update_range_service_account, delete_student_from_sheet, update_multiple_cells_service_account
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
    path('sheets/data/<str:sheet_id>/', sheets_get_data, name='sheets_get_data'),
    path('sheets/service-account/data/<str:sheet_id>/', sheets_get_data_service_account,
         name='sheets_get_data_service_account'),

    path('sheets/service-account/<str:sheet_id>/update-cell/', sheets_update_cell_service_account, name='sheets_update_cell_service_account'),
    path('sheets/service-account/<str:sheet_id>/add-student/', sheets_add_student_service_account, name='sheets_add_student_service_account'),

    path('sheets/<str:sheet_id>/add-student-auto-number/', sheets_add_student_with_auto_number_service_account, name='sheets_add_student_auto_number'),
    path('sheets/<str:sheet_id>/auto-number-students/', sheets_auto_number_students_service_account, name='sheets_auto_number_students'),

    path('class-records/live-counts/', get_class_records_with_live_counts_cached, name='class_records_live_counts'),

    path('sheets/service-account/<str:sheet_id>/all-sheets-data/',
         sheets_get_all_sheets_data_service_account,
         name='sheets_get_all_sheets_data_service_account'),

    path('sheets/service-account/<str:sheet_id>/sheets-list/',
         sheets_list_all_sheets_service_account,
         name='sheets_list_all_sheets_service_account'),

    path('sheets/service-account/<str:sheet_id>/sheet/<str:sheet_name>/data/',
         sheets_get_specific_sheet_data_service_account,
         name='sheets_get_specific_sheet_data_service_account'),

    path('sheets/service-account/<str:sheet_id>/update-cell-specific/',
         sheets_update_cell_specific_sheet_service_account,
         name='sheets_update_cell_specific_sheet_service_account'),

    path('activities/', UserActivityListView.as_view(), name='user-activities'),
    path('activities/create/', create_activity, name='create-activity'),
    path('activities/stats/', get_activity_stats, name='activity-stats'),

    path('sheets/<str:sheet_id>/import-students-preview/', sheets_import_students_preview, name='sheets_import_students_preview'),
    path('sheets/<str:sheet_id>/import-students-execute/', sheets_import_students_execute, name='sheets_import_students_execute'),

    path('sheets/<str:sheet_id>/preview-column-import/', sheets_preview_column_import, name='sheets_preview_column_import'),
    path('sheets/<str:sheet_id>/analyze-columns-mapping/', sheets_analyze_columns_mapping, name='sheets_analyze_columns_mapping'),
    path('sheets/<str:sheet_id>/execute-column-import/', sheets_execute_column_import, name='sheets_execute_column_import'),
    path('sheets/<str:sheet_id>/rename-column-header/', sheets_rename_column_header, name='sheets_rename_column_header'),

    path('sheets/<str:sheet_id>/analyze-columns-mapping-enhanced/', sheets_analyze_columns_mapping_enhanced, name='sheets_analyze_columns_mapping_enhanced'),
    path('sheets/<str:sheet_id>/execute-column-import-enhanced/', sheets_execute_column_import_enhanced, name='sheets_execute_column_import_enhanced'),
    path('sheets/<str:sheet_id>/import-history/', get_import_history, name='get_import_history'),

    path('sheets/<str:sheet_id>/update-max-score/', sheets_update_max_score_service_account, name='sheets_update_max_score'),
    path('sheets/<str:sheet_id>/update-batch-max-scores/', sheets_update_batch_max_scores_service_account, name='sheets_update_batch_max_scores'),

    path('sheets/service-account/<str:sheet_id>/update-range/',
         sheets_update_range_service_account,
         name='sheets_update_range_service_account'),

    path('sheets/<str:sheet_id>/delete-student/', delete_student_from_sheet, name='delete_student_from_sheet'),

    path('sheets/<str:sheet_id>/update-multiple-cells/', update_multiple_cells_service_account, name='update_multiple_cells'),
]