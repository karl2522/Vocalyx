from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpeechServiceViewSet

router = DefaultRouter()
router.register(r'speech', SpeechServiceViewSet, basename='speech')

urlpatterns = [
    path('', include(router.urls)),
]