from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExcelViewSet

router = DefaultRouter()
router.register(r'', ExcelViewSet, basename='excel')

urlpatterns = [
    path('', include(router.urls)),
]