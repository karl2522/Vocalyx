from django.urls import path
from .views import RegisterView, LoginView, VerifyEmailView
from rest_framework_simplejwt.views import TokenRefreshView
from token_management.views import LogoutView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    # Change the order of these paths
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email-post'),
    path('verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify-email-get'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]