from django.urls import path
from .views import (
    RegisterView, LoginView, VerifyEmailView,
    google_auth, LogoutView, microsoft_auth, firebase_auth_view,
    update_profile
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/google/', google_auth, name='google_auth'),
    path('auth/microsoft/', microsoft_auth, name='microsoft_auth'),
    path('firebase-auth/', firebase_auth_view, name='firebase_auth'),
    path('update-profile/', update_profile, name='update_profile'),  # Now using the imported function
]